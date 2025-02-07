# API JobbingTrack

Backend principal de l'application

## Stack
- Node.js 21
- Express 6
- Prisma ORM
- PostgreSQL
- JWT Authentication

## Endpoints clés
`GET /api/applications` - Liste des candidatures  
`POST /api/applications` - Créer une candidature

## Migration de base de données
`npx prisma migrate dev`

## Environnement

`DATABASE_URL="postgresql://user:pass@localhost:5432/jobbingtrack"`
`JWT_SECRET="votre_secret"`