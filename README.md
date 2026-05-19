# SSA - Suivi des Ames

Application web pour le suivi des ames avec une architecture separee :

- un client React (Vite)
- un serveur Node.js/Express

## Objectif du projet

Ce depot sert de base pour construire une application de suivi pastoral:

- suivi des personnes
- organisation des informations de terrain
- evolution vers une PWA progressive

## Stack technique

- Frontend: React 19 + Vite
- Backend: Node.js + Express
- Outils: ESLint, Nodemon

## Structure du depot

```
.
|- client/    # application React (Vite)
|- server/    # API Node/Express
|- docs/      # documentation projet
|- .env.example
`- README.md
```

## Prerequis

- Node.js 20+
- npm 10+

## Installation

Depuis la racine du projet:

```bash
cd client && npm install
cd ../server && npm install
```

## Lancer le frontend

```bash
cd client
npm run dev
```

Scripts disponibles dans `client`:

- `npm run dev` : demarrer le serveur de developpement Vite
- `npm run build` : compiler la version de production
- `npm run preview` : previsualiser le build
- `npm run lint` : lancer ESLint

## Lancer le backend

```bash
cd server
npm run dev
```

Scripts disponibles dans `server`:

- `npm run dev` : demarrer avec Nodemon
- `npm test` : script placeholder a remplacer

Note: actuellement, le backend est encore en phase de setup (pas de fichier d'entree API present dans le depot). Creez par exemple `server/index.js` pour exposer vos routes Express.

## Variables d'environnement

Le fichier `.env.example` est present a la racine. Copiez-le vers `.env` et adaptez les valeurs selon votre environnement.

## Git: correction de l'erreur d'upstream

Si vous voyez l'erreur:

```
fatal: The current branch <branch-name> has no upstream branch.
```

Utilisez:

```bash
git push --set-upstream origin <branch-name>
```

Pour automatiser ce comportement pour les nouvelles branches:

```bash
git config --global push.autoSetupRemote true
```

## Contribuer

Avant d'ouvrir une pull request:

1. Créez votre branche de travail a partir de `main` ou de la branche cible.
2. Lancez les verifications locales du projet concerne: `npm run lint` dans `client`, puis `npm run dev` si vous devez tester le rendu.
3. Verifiez votre etat Git avec `git status` et assurez-vous que les fichiers modifies sont bien ceux attendus.
4. Poussez la branche avec upstream si besoin: `git push --set-upstream origin <branch-name>`.
5. Ouvrez la PR avec un resume clair du changement et, si possible, une capture ou un contexte de test.

Conventions recommandees:

- gardez des commits courts et descriptifs
- evitez les changements melanges entre frontend et backend sans raison fonctionnelle
- documentez toute nouvelle variable d'environnement dans `.env.example`
- ajoutez une note dans `docs/` si une fonctionnalite demande plus d'explication

## Commandes utiles

- `git status` : voir les modifications locales
- `git branch -vv` : verifier la branche courante et son upstream
- `git push --set-upstream origin <branch-name>` : lier une branche au remote lors du premier push
- `git config --global push.autoSetupRemote true` : automatiser l'upstream pour les futures branches

## Etat actuel

- Frontend initialise avec Vite et operationnel
- Backend initialise (dependances installees)
- README et scripts alignes pour un demarrage rapide
