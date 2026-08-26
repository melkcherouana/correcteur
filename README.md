# EvalPro — LMS Lycée Professionnel

[![Licence : MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](./LICENSE)

Plateforme de gestion des évaluations et compétences pour lycée professionnel.

## Stack technique

| Couche     | Technologie                              |
|------------|------------------------------------------|
| Backend    | Node.js 20 · Express 4 · ESM            |
| Base de données | PostgreSQL + Prisma ORM            |
| Auth       | JWT (jsonwebtoken + bcryptjs)            |
| IA         | Anthropic SDK (claude-sonnet-4-6)        |
| Frontend   | React 18 · Vite · Tailwind CSS 3        |
| État       | Zustand · TanStack Query                 |

## Rôles utilisateurs

- **ADMIN** — gestion globale de la plateforme
- **ENSEIGNANT** — création des évaluations, saisie des notes
- **ELEVE** — consultation des notes et compétences

## Modèle de données

```
Utilisateur ──< MatiereEnseignant >── Matiere ──< Competence ──< Critere
     |                                    |
     └── ClasseEleve >── Classe           └── Sequence ──< Evaluation ──< Note
                                                                              |
                                          CompetenceEleve <─────────────── Eleve
```

## Installation

### Prérequis

- Node.js 20+
- PostgreSQL 15+
- Une clé API Anthropic

### Backend

```bash
cd backend
npm install
cp .env.example .env   # puis renseigner les variables
npx prisma migrate dev --name init
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173`.  
L'API tourne sur `http://localhost:3001`.

## Structure du projet

```
evalpro/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Schéma Prisma complet
│   └── src/
│       ├── controllers/        # Logique des requêtes HTTP
│       ├── middlewares/        # Auth JWT, validation
│       ├── routes/             # Déclaration des endpoints
│       ├── services/           # Logique métier + IA
│       ├── utils/              # Prisma client, Anthropic client
│       └── index.js            # Point d'entrée Express
└── frontend/
    └── src/
        ├── components/         # Composants réutilisables
        ├── context/            # AuthContext (JWT)
        ├── hooks/              # Hooks personnalisés
        ├── pages/              # Pages de l'application
        ├── services/           # Client Axios
        ├── App.jsx
        └── main.jsx
```

## Déploiement

L'app se déploie sur [Render](https://render.com) via le Blueprint `render.yaml` à la racine : un service web Node (`evalpro-api`) et un site statique (`evalpro-app`).

1. Sur Render : **New → Blueprint**, connecter le dépôt GitHub. Render détecte `render.yaml` et crée les deux services.
2. Renseigner les variables marquées `sync: false` dans le dashboard (jamais commitées) :
   - `evalpro-api` : `DATABASE_URL`, `DIRECT_URL` (base Postgres — pooler transaction/session si Supabase), `JWT_SECRET` (secret aléatoire fort), `ANTHROPIC_API_KEY`, `FRONTEND_URL` (URL du site statique une fois déployé)
   - `evalpro-app` : `VITE_API_URL` (URL de `evalpro-api` + `/api`)
3. Au premier déploiement de `evalpro-api`, `npm start` exécute automatiquement `prisma migrate deploy` avant de lancer le serveur.
4. Peupler la base avec `npm run db:seed` (à exécuter une fois, en pointant `DATABASE_URL`/`DIRECT_URL` vers la base de prod) pour obtenir les comptes de démo.

## Licence

Distribué sous licence MIT — voir [LICENSE](./LICENSE).
