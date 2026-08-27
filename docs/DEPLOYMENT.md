# Déploiement — SSA Suivi des âmes

Objectif : mettre l'application en ligne de façon fiable, avec un budget
**mensuel confirmé** (~10 000 âmes suivies à terme) — voir le détail des coûts
plus bas. `render.yaml` est déjà réglé sur cette base ; repasser en gratuit
reste possible (un seul champ à changer) si le budget redevient ponctuel.

## Architecture

| Brique | Hébergeur | Plan | Remarque |
|---|---|---|---|
| Frontend (React/Vite) | Render — site statique | gratuit | toujours en ligne, inclus même sur compte payant |
| Backend (Express) | Render — Web Service **Starter** | 7 $/mois | jamais de mise en veille — le planificateur (rappels 3x/semaine) tourne de façon fiable |
| Base de données | Supabase **Pro** | 25 $/mois | 8 Go, sauvegardes quotidiennes, pas de pause auto — large marge pour ~10 000 personnes suivies |
| Photos des fiches (pièces jointes) | Supabase Storage (même projet Pro) | inclus | **à configurer** (bucket privé) — sinon les photos sont perdues à chaque redéploiement |
| Email (reset, invitations, rappels) | Resend | gratuit au départ | 3 000 mails/mois — largement suffisant tant que ce sont les dirigeants (pas les 10 000 âmes) qui reçoivent des emails ; passer à Resend Pro (20 $/mois) seulement si ce volume est dépassé |
| Notifications push (navigateur) | Web Push (VAPID) | gratuit | aucun compte tiers, aucun coût par message, ne dépend d'aucun des plans ci-dessus |
| Nom de domaine | Cloudflare / Namecheap / OVH | ~10–14 $/an | nécessaire pour la délivrabilité email et une adresse professionnelle |

**Coût de départ : ~32 $/mois (Render 7 $ + Supabase 25 $) + ~12 $/an de
domaine, soit ≈ 400 $/an** (~19 000–20 000 FCFA/mois). Les emails restent
gratuits tant que le volume de dirigeants ne dépasse pas 3 000 mails/mois — ce
qui est très large pour une seule église. Aucune migration de plateforme
n'est nécessaire si le volume grandit ensuite (voir tableau plus bas).

Tout est décrit par [`render.yaml`](../render.yaml) (Blueprint Render) : les deux
services sont créés d'un coup ; il ne reste qu'à renseigner quelques variables.

> **Paiement** : Render, Supabase et Resend prélèvent uniquement par carte
> internationale (Visa/Mastercard), chaque mois automatiquement. Vérifier
> qu'une carte de l'équipe fonctionne à l'international depuis le Cameroun
> avant de s'engager — sinon prévoir une carte virtuelle (ex. Wise) **avec un
> solde rechargé à l'avance** pour ne pas subir un rejet de prélèvement en
> plein mois (le service coupe si le paiement échoue).

---

## 1. Créer la base de données (Supabase)

1. Créer un compte sur https://supabase.com → **New project** (choisir la région
   la plus proche, définir un mot de passe DB).
2. **Passer le projet en Pro** : Project Settings → Billing → sélectionner
   **Pro** (25 $/mois) — supprime la pause automatique après 7 jours
   d'inactivité et passe à 8 Go / sauvegardes quotidiennes. Peut se faire tout
   de suite ou après les premiers tests en gratuit, sans rien casser.
3. Une fois le projet prêt : **Project Settings → Database → Connection string →
   URI**. Copier l'URL de la forme :
   ```
   postgresql://postgres:[MOT_DE_PASSE]@db.[REF].supabase.co:5432/postgres
   ```
   > Remplacer `[MOT_DE_PASSE]` par le mot de passe choisi. C'est la valeur de
   > `DATABASE_URL`. Le schéma (`server/src/db/schema.sql`) est **créé
   > automatiquement** au premier démarrage de l'API.

## 2. Créer le bucket de stockage (photos des fiches — Supabase Storage)

1. Dans le même projet Supabase : **Storage → New bucket**.
2. Nom : `rapport-attachments` (doit correspondre à `SUPABASE_STORAGE_BUCKET`).
3. **Public bucket : OFF** — ces photos peuvent montrer des informations sur
   des personnes suivies, l'accès doit rester signé/authentifié (déjà géré par
   l'API : `GET /api/rapports-hebdo/:id/attachments/:id`).
4. Récupérer les deux valeurs nécessaires côté **Project Settings → API** :
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_SERVICE_KEY` (**service_role**, pas `anon` — c'est le serveur
     qui uploade, jamais le navigateur directement)

## 3. Générer les clés Web Push (notifications navigateur)

Aucun compte externe requis — une seule commande, à lancer une fois en local :

```bash
npx web-push generate-vapid-keys
```

Copier les deux valeurs affichées dans `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`.
`VAPID_SUBJECT` = `mailto:` + une adresse de contact réelle (ex :
`mailto:pasteur@example.com`) — obligatoire par la spec Web Push, jamais
affiché aux utilisateurs.

## 4. Créer le compte Resend (email)

1. Compte gratuit sur https://resend.com (3 000 emails/mois, 100/jour).
2. **API Keys → Create API Key** → copier dans `RESEND_API_KEY`.
3. Envoi possible immédiatement depuis `onboarding@resend.dev` (déjà la valeur
   par défaut de `EMAIL_FROM`) — pratique pour démarrer, mais Resend peut
   filtrer/limiter cette adresse partagée. Si l'église possède un nom de
   domaine, le vérifier dans Resend (**Domains → Add Domain**, ajouter les
   enregistrements DNS indiqués) puis passer `EMAIL_FROM` sur `SSA <notifications@tondomaine.com>`
   pour une délivrabilité fiable.

## 5. Déployer sur Render (Blueprint)

1. Compte sur https://render.com, connecter le dépôt GitHub.
2. **New + → Blueprint** → sélectionner ce dépôt. Render lit `render.yaml` et
   propose de créer **ssa-api** (backend) et **ssa-web** (frontend).
3. Avant de valider, renseigner les variables `sync: false` :

   **ssa-api**
   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` | l'URI Supabase de l'étape 1 |
   | `CORS_ORIGIN` | l'URL du frontend (voir étape suivante) |
   | `APP_URL` | idem `CORS_ORIGIN` |
   | `RESEND_API_KEY` | clé créée à l'étape 4 |
   | `SUPABASE_URL` | URL du projet, étape 2 |
   | `SUPABASE_SERVICE_KEY` | clé service_role, étape 2 |
   | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | générées à l'étape 3 |

   > `JWT_SECRET` est **généré automatiquement** par Render, `DATABASE_SSL=true`
   > et `NODE_ENV=production` sont déjà fixés.

   **ssa-web**
   | Variable | Valeur |
   |---|---|
   | `VITE_API_URL` | l'URL du backend (voir étape suivante) |

## 6. Régler les URLs croisées (une fois les services créés)

Render attribue des URLs du type `https://ssa-api.onrender.com` et
`https://ssa-web.onrender.com`. Il y a une dépendance croisée, donc :

1. Premier déploiement → noter les deux URLs réelles dans le dashboard.
2. **ssa-web** → variable `VITE_API_URL` = URL de **ssa-api** → *Manual Deploy*
   (le build Vite injecte l'URL au moment de la compilation).
3. **ssa-api** → `CORS_ORIGIN` et `APP_URL` = URL de **ssa-web** → redéploiement
   automatique.

## 7. Créer le premier compte Pasteur

En production, la base est **vide** (pas de données de démo — `npm run seed`
ne tourne jamais quand `NODE_ENV=production`, voir `server/index.js`). Ouvrir
un **Shell** sur le service `ssa-api` (Render → ssa-api → Shell) et lancer :

```bash
npm run create-pasteur -- pasteur@tonadresse.com "UnMotDePasseSolide!23" "Nom du Pasteur"
```

> ⚠️ Ne PAS utiliser `npm run seed` en production : ce script insère aussi
> une dizaine de comptes et de personnes de démonstration avec des mots de
> passe **publics** (`pr1234`, `leader1234`, `dirigeant1234`…) directement
> dans la vraie base. `create-pasteur` ne crée que le compte Pasteur, avec le
> mot de passe fourni.

Une fois connecté, inviter le reste de l'équipe (PR, leaders, encadreurs)
depuis **Dirigeants → Inviter un dirigeant** — chacun reçoit un lien
d'invitation par email (et copiable/WhatsApp/SMS) pour créer son propre
compte.

## 8. Vérifier

- `https://ssa-api.onrender.com/health` → `{"status":"ok","database":{"backend":"postgres"}}`
- Ouvrir le frontend, se connecter, vérifier que les données se chargent.
- **Test des pièces jointes** : ouvrir une fiche hebdomadaire, ajouter une
  photo, recharger la page → la photo doit toujours s'afficher (preuve que
  Supabase Storage est bien branché, pas le disque local).
- **Test de l'email** : Profil → « Changer le mot de passe » ou inviter un
  dirigeant → l'email doit arriver (pas juste apparaître dans les logs Render).
- **Test du push** : Profil → activer « Notifications sur cet appareil » →
  lancer `npm run digest:test` dans le Shell Render → une notification doit
  apparaître sur le téléphone/l'ordinateur, même onglet fermé.

---

## Choix du nom de domaine

| Registrar | Prix `.com` | Remarque |
|---|---|---|
| Cloudflare | ~10,44 $/an (stable) | Le plus transparent, aucun surcoût au renouvellement. Impose ses propres DNS. |
| Namecheap | ~9,58 $ puis ~13,98 $/an | Simple et populaire ; le prix monte au renouvellement. |
| OVH | ~14 $/an | Français, pratique pour une gestion en français. |

Une fois acheté : pointer le domaine vers `ssa-web` (Render → Settings →
Custom Domain), puis mettre à jour `CORS_ORIGIN` et `APP_URL` sur `ssa-api`
avec la nouvelle adresse (`https://tondomaine.com`).

## Pourquoi pas un VPS (serveur brut) ?

Un VPS (DigitalOcean, Hetzner… ~5–10 $/mois) coûte moins cher sur le papier,
mais impose de tout gérer soi-même : sécurité, mises à jour, redémarrages,
sauvegardes, certificats SSL. Pour une petite équipe qui veut avancer sur les
fonctionnalités plutôt que sur l'administration système, Render + Supabase
valent leur prix. À reconsidérer plus tard si le volume justifie
l'optimisation des coûts — pas une priorité à ce stade.

## Évolution dans le temps

Aucune de ces montées en gamme ne demande de changer de plateforme ni de
réécrire du code — juste changer un plan dans le dashboard (et, pour Render,
`plan:` dans `render.yaml`) :

- **Backend qui rame** → Render **Standard** (25 $/mois).
- **Base au-delà de 8 Go ou beaucoup d'utilisateurs** → Supabase reste sur Pro
  avec facturation à l'usage, puis **Team** (599 $/mois) seulement à très
  grande échelle — hors de portée d'un seul projet d'église.
- **Plus de 3 000 emails/mois** → Resend **Pro** (20 $/mois, 50 000 emails).

## Si le budget redevient ponctuel

Tout ce document tourne aussi à **0 FCFA/mois** sur les offres gratuites de
Render/Supabase (`plan: free` dans `render.yaml`, pas de mise à niveau
Supabase) — seule différence perçue : ~30–50 s de délai au premier appel après
15 min d'inactivité, et la base Supabase se met en pause après 7 jours sans
requête (réversible en un clic, pas de perte de données). Un ping externe
gratuit (https://cron-job.org, une requête vers `/health` toutes les 10–14
minutes) évite les deux sans dépenser un centime.

## Notes

- Sécurité : `JWT_SECRET` fort (généré), bcrypt coût 12, verrouillage
  anti-brute-force, refus de démarrage si secret faible en prod — déjà en place.
- Sauvegardes : Supabase Pro inclut des backups quotidiens (limités/absents en
  gratuit) ; penser à exporter régulièrement malgré tout pour un usage réel.
- Les photos de fiches (Supabase Storage) partagent le même projet Supabase.
  En gratuit : 500 Mo dédiés au Storage (séparés du quota base de données). En
  Pro : 100 Go inclus — largement suffisant même avec beaucoup de photos.
- **~10 000 personnes suivies** : seuls les dirigeants (Pasteur/PR/leaders/
  encadreurs, quelques dizaines à quelques centaines de comptes) ont un
  compte et reçoivent des emails/notifications — les "âmes" elles-mêmes n'en
  ont jamais (par conception du CDC), donc le volume Resend/push reste faible
  indépendamment du nombre de personnes suivies dans l'annuaire. Le seul
  quota vraiment concerné par les 10 000 lignes est la base de données
  (8 Go en Pro, très large marge) — l'annuaire (`GET /api/annuaire`) est
  paginé côté serveur pour rester utilisable sur téléphone à cette échelle.
