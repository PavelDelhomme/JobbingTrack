# JobbingTrack - Suivi de Candidatures Professionnelles

Application complète pour le suivi des candidatures d'emploi avec :
- Application mobile cross-platform
- Interface d'administration
- API backend performante

## Stack Technique
- **Mobile** : React Native + TypeScript
- **Backend** : Node.js/Express + Prisma + PostgreSQL
- **Admin** : React + Vite + TypeScript
- **CI/CD** : GitHub Actions

## Installation

`git clone https://github.com/PavelDelhomme/JobbingTrack.git`
`cd JobbingTrack`
`docker compose up -d`

## Structure du projet

.<br />
|─ admin/ # Panel d'administration<br />
├── backend/ # API et logique métier<br />
├── frontend/ # Interface publique (future implémentation)<br />
├── mobile/ # Application mobile<br />
└── infrastructure/ # Configuration Docker et déploiement<br />

[Documentation détaillée par module](#)