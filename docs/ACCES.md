# Accès et visibilité — qui voit quoi

Référence unique des droits de CSP-SSA. **Le serveur applique ces règles à
chaque requête** : taper une adresse à la main ne donne jamais plus d'accès.
Les menus de l'application (`client/src/components/layout/navItems.js`) les
reflètent. Toute évolution des droits se fait d'abord ici, puis dans le code
et les tests (`server/tests`, `e2e/tests/02-roles.spec.js`).

Rôles : **Pasteur**, **PR** (Première Responsable, appelée aussi « CP »),
**Secrétaire du pasteur**, **Leader**, **Encadreur**, **Leader de cellule**.
« Bureau » = Pasteur, PR, Secrétaire. « FD » = départements *Faiseurs de
Disciples* et *Suivi*.

## Ce que chacun voit

| Écran / donnée | Pasteur · PR | Secrétaire | Leader | Encadreur | Leader de cellule |
|---|---|---|---|---|---|
| **Accueil** | Tableau de bord de l'église (+ objectif : Pasteur) | Tableau de bord (lecture) | Son équipe : encadreurs, membres, fiches | Sa fiche de la semaine + ses membres | Sa cellule |
| **Leaders** (comptes de terrain) | Tous | Tous (lecture) | Son département | — | — |
| **Départements** | Tous, avec statistiques | Tous (lecture) | Le sien seulement | — | — |
| **Annuaire** | Toute l'église | Toute l'église | Son département | Ses membres · *FD : toute l'église* | — |
| **Nouveaux venus / 7 leçons** | Tous | Tous (lecture) | Si département FD : son département | Si département FD : les siens | — |
| **Fiches de présence** (menu Fiches) | Toutes | Toutes (lecture) | Son équipe | La sienne | — |
| **Fiches hebdo** (papier) | Toutes | Toutes (lecture) | Les siennes + celles de son département (lecture) | Les siennes | Les siennes |
| **Rapports** (synthèses) | Tous | Tous (lecture) | Son département | — | — |
| **Cellules** | Toutes | Toutes (lecture) | — | — | La sienne |
| **Connexions** (journal) | Oui | — | — | — | — |
| **Notifications** | Les siennes | Les siennes | Les siennes | Les siennes | Les siennes |

## Ce que chacun peut faire

| Action | Pasteur | PR | Secrétaire | Leader | Encadreur | Leader de cellule |
|---|---|---|---|---|---|---|
| Créer un compte de terrain (leader, encadreur, leader de cellule) | ✔ | ✔ | — | — | — | — |
| Créer un compte PR ou Secrétaire | ✔ | — | — | — | — | — |
| Désactiver / réactiver un compte, rattacher un encadreur à un leader | ✔ | ✔ | — | — | — | — |
| Créer / renommer un département | ✔ | ✔ | — | — | — | — |
| Fixer l'objectif d'évangélisation | ✔ | — | — | — | — | — |
| Ajouter / modifier ses membres | — | — | — | ✔ (et ceux de son département) | ✔ (les siens) | ✔ (sa cellule) |
| Rattacher une personne suivie ailleurs | ✔ | ✔ | — | ✔ (dans son département) | — (demander au leader) | — |
| Soumettre sa fiche de présence | — | — | — | ✔ | ✔ | Fiche de cellule |
| Valider / demander une correction | ✔ | ✔ | — | ✔ (son équipe, pas sa propre fiche) | — | — |
| Remplir une fiche hebdo | ✔ (tous modèles) | ✔ (tous modèles) | — | Modèles de son département + rapport mensuel | Modèles de son département | Rapport de cellule |
| Modifier / supprimer une fiche hebdo | ✔ | ✔ | — | Les siennes | Les siennes | Les siennes |
| Rédiger / transmettre un rapport (synthèse) | — | ✔ | — | ✔ | — | — |
| Créer une cellule, valider ses fiches | ✔ | ✔ | — | — | — | — |

## Modèles de fiches hebdo par département

| Modèle | Rempli par |
|---|---|
| Rapport d'assiduité (Huissier) | Protocole |
| Rapport du Faiseur de Disciples · Fiche des Encadreurs | Faiseurs de Disciples, Suivi |
| Fiche de suivi hebdomadaire des choristes | Chorale |
| Rapport d'assiduité des ouvriers | Audiovisuel, Sécurité Audiovisuelle |
| Rapport de la chaîne de prière | Intercession / Prière |
| Rapport de cellule de prière | Leaders de cellule |
| Rapport mensuel du leader | Leaders (remis au Pasteur) |

Les départements sans fiche papier (Évangélisation, Ecodim, Jeunes, Femmes,
Diaconesse, Nettoyage / Logistique) font leur suivi avec la fiche de
présence ; le menu *Fiches hebdo* ne leur est pas proposé.

## Où c'est appliqué dans le code

| Règle | Serveur | Interface |
|---|---|---|
| Rôles qui lisent tout | `READ_ALL_ROLES` (`server/src/db/index.js`) | `readsAllRole` (`client/src/lib/roles.js`) |
| Modèles de fiches par département | `server/src/utils/ficheTypes.js` | `TYPE_ACCESS` (`client/src/pages/RapportsHebdo/types.js`) |
| Annuaire | `annuaireController.scopeFor` | — |
| Leaders, détails, équipe | `dirigeantsController.scopeFor / canView` | `navItems.js` |
| Départements (statistiques) | `departmentsController.overview` | `navItems.js` |
| Fiches de présence | `rapportsController.scopeFor / canReview` | — |
| Fiches hebdo | `rapportsHebdoController.scopeFor / canRead / loadOwnEditable` | `RapportsHebdoPage` |
| Rapports (synthèses) | `reportsController.scopeFor / canRead` | — |
| Cellules | `cellulesController.scopeFor / canManage` | — |
| Nouveaux venus | `integrationController.scopeFor` | `navItems.js` |
