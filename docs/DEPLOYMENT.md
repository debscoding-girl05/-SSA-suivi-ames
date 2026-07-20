# Déploiement — SSA Suivi des âmes (offre gratuite)

Objectif : mettre l'application en ligne **à 0 €** pour un usage réel, avec la
possibilité de passer en payant plus tard sans rien réécrire.

## Architecture

| Brique | Hébergeur | Plan | Remarque |
|---|---|---|---|
| Frontend (React/Vite) | Render — site statique | gratuit | toujours en ligne |
| Backend (Express) | Render — web service | gratuit | ⚠️ s'endort après ~15 min → 1er appel lent (~30–50 s) |
| Base de données | Supabase (PostgreSQL) | gratuit | 500 Mo, largement suffisant au début |
| Email (reset mot de passe) | Resend | gratuit | 3 000 mails/mois — optionnel |

Tout est décrit par [`render.yaml`](../render.yaml) (Blueprint Render) : les deux
services sont créés d'un coup ; il ne reste qu'à renseigner quelques variables.

---

## 1. Créer la base de données (Supabase)

1. Créer un compte sur https://supabase.com → **New project** (choisir la région
   la plus proche, définir un mot de passe DB).
2. Une fois le projet prêt : **Project Settings → Database → Connection string →
   URI**. Copier l'URL de la forme :
   ```
   postgresql://postgres:[MOT_DE_PASSE]@db.[REF].supabase.co:5432/postgres
   ```
   > Remplacer `[MOT_DE_PASSE]` par le mot de passe choisi. C'est la valeur de
   > `DATABASE_URL`. Le schéma (`server/src/db/schema.sql`) est **créé
   > automatiquement** au premier démarrage de l'API.

## 2. Déployer sur Render (Blueprint)

1. Compte sur https://render.com, connecter le dépôt GitHub.
2. **New + → Blueprint** → sélectionner ce dépôt. Render lit `render.yaml` et
   propose de créer **ssa-api** (backend) et **ssa-web** (frontend).
3. Avant de valider, renseigner les variables `sync: false` :

   **ssa-api**
   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` | l'URI Supabase de l'étape 1 |
   | `CORS_ORIGIN` | l'URL du frontend (voir étape 3) |
   | `APP_URL` | idem `CORS_ORIGIN` |
   | `RESEND_API_KEY` | (optionnel) clé Resend |

   > `JWT_SECRET` est **généré automatiquement** par Render, `DATABASE_SSL=true`
   > et `NODE_ENV=production` sont déjà fixés.

   **ssa-web**
   | Variable | Valeur |
   |---|---|
   | `VITE_API_URL` | l'URL du backend (voir étape 3) |

## 3. Régler les URLs croisées (une fois les services créés)

Render attribue des URLs du type `https://ssa-api.onrender.com` et
`https://ssa-web.onrender.com`. Il y a une dépendance croisée, donc :

1. Premier déploiement → noter les deux URLs réelles dans le dashboard.
2. **ssa-web** → variable `VITE_API_URL` = URL de **ssa-api** → *Manual Deploy*
   (le build Vite injecte l'URL au moment de la compilation).
3. **ssa-api** → `CORS_ORIGIN` et `APP_URL` = URL de **ssa-web** → redéploiement
   automatique.

## 4. Créer le premier compte Pasteur

En production, la base est **vide** (pas de données de démo). Pour créer le
compte administrateur initial, ouvrir un **Shell** sur le service `ssa-api`
(Render → ssa-api → Shell) et lancer :

```bash
npm run seed
```

> `npm run seed` insère les comptes de démonstration (dont `pasteur@ssa.app` /
> `pasteur1234`). **Se connecter puis changer immédiatement le mot de passe**
> depuis Profil → « Changer le mot de passe ».
>
> Alternative propre : adapter `server/src/db/seed.js` pour n'insérer qu'un
> unique compte Pasteur réel avant de lancer le seed.

## 5. Vérifier

- `https://ssa-api.onrender.com/health` → `{"status":"ok","database":{"backend":"postgres"}}`
- Ouvrir le frontend, se connecter, vérifier que les données se chargent.

---

## Coûts

- **Aujourd'hui : 0 €/mois.** Seul inconvénient : le backend gratuit s'endort →
  le tout premier appel après inactivité met ~30–50 s (les suivants sont
  rapides).
- **Pour supprimer les cold starts (~7 $/mois)** : passer `ssa-api` en plan
  **Starter** dans Render (`plan: starter` dans `render.yaml`). Rien d'autre à
  changer.
- **Nom de domaine** (optionnel) : ~10–15 $/an, à brancher sur `ssa-web` (puis
  mettre à jour `CORS_ORIGIN`/`APP_URL`).
- **Base payante** : inutile tant que < 500 Mo. Le jour venu, Supabase Pro
  (25 $/mois) sans migration de code.

## Notes

- Sécurité : `JWT_SECRET` fort (généré), bcrypt coût 12, verrouillage
  anti-brute-force, refus de démarrage si secret faible en prod — déjà en place.
- Sauvegardes : Supabase gère des backups quotidiens (limités en gratuit) ;
  penser à exporter régulièrement pour un usage réel.
