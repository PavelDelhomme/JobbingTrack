# 👤 Profile Service

Service de gestion des profils et CVs pour JobbingTrack.

## Description

Le Profile Service gère tous les aspects du profil professionnel de l'utilisateur : CVs, expériences professionnelles, formations, compétences, langues et projets. Il permet de créer et gérer plusieurs CVs avec des informations personnalisées.

## Port

**3009**

## Fonctionnalités

- 📄 Gestion multiple de CVs
- 💼 Expériences professionnelles détaillées
- 🎓 Formations et diplômes
- 🛠️ Compétences techniques et soft skills
- 🌍 Langues parlées avec niveaux
- 🚀 Projets et réalisations

## Modèles de données

### CV
- Informations personnelles (nom, email, téléphone, adresse)
- Liens professionnels (LinkedIn, site web)
- Gestion de CVs multiples (défaut, actif)
- Relations avec expériences, formations, compétences, langues et projets

### Expérience
- Entreprise et poste
- Dates de début et fin (en cours possible)
- Description et localisation
- Compétences acquises et réalisations

### Formation
- Institution et diplôme
- Domaine d'études
- Dates et durée
- Notes/GPA (optionnel)

### Compétence
- Nom et catégorie (TECHNICAL, SOFT_SKILL, TOOL, FRAMEWORK, CERTIFICATION)
- Niveau (BEGINNER, INTERMEDIATE, ADVANCED, EXPERT)
- Années d'expérience

### Langue
- Nom de la langue
- Niveau (BEGINNER à NATIVE - 7 niveaux)
- Certifications (optionnel)

### Projet
- Nom et description
- Rôle et technologies
- Dates (en cours possible)
- Liens (URL, dépôt GitHub)

## Catégories de compétences

- `TECHNICAL` : Compétences techniques
- `SOFT_SKILL` : Compétences comportementales
- `LANGUAGE` : Langues de programmation
- `TOOL` : Outils
- `FRAMEWORK` : Frameworks
- `CERTIFICATION` : Certifications

## Niveaux de compétences

- `BEGINNER` : Débutant
- `INTERMEDIATE` : Intermédiaire
- `ADVANCED` : Avancé
- `EXPERT` : Expert

## Niveaux de langues

- `BEGINNER` : Débutant
- `ELEMENTARY` : Élémentaire
- `INTERMEDIATE` : Intermédiaire
- `UPPER_INTERMEDIATE` : Intermédiaire supérieur
- `ADVANCED` : Avancé
- `FLUENT` : Courant
- `NATIVE` : Natif

## Endpoints

### Health Check
```
GET /health
```

### Routes API (à implémenter)
```
# CVs
GET    /api/v1/profile/cvs           - Liste des CVs
POST   /api/v1/profile/cvs           - Créer un CV
GET    /api/v1/profile/cvs/:id       - Détails d'un CV
PUT    /api/v1/profile/cvs/:id       - Modifier un CV
DELETE /api/v1/profile/cvs/:id       - Supprimer un CV

# Expériences
GET    /api/v1/profile/experiences   - Liste des expériences
POST   /api/v1/profile/experiences   - Créer une expérience
PUT    /api/v1/profile/experiences/:id - Modifier une expérience
DELETE /api/v1/profile/experiences/:id - Supprimer une expérience

# Formations
GET    /api/v1/profile/educations    - Liste des formations
POST   /api/v1/profile/educations    - Créer une formation
PUT    /api/v1/profile/educations/:id - Modifier une formation
DELETE /api/v1/profile/educations/:id - Supprimer une formation

# Compétences
GET    /api/v1/profile/skills        - Liste des compétences
POST   /api/v1/profile/skills        - Créer une compétence
PUT    /api/v1/profile/skills/:id    - Modifier une compétence
DELETE /api/v1/profile/skills/:id    - Supprimer une compétence

# Langues
GET    /api/v1/profile/languages     - Liste des langues
POST   /api/v1/profile/languages     - Créer une langue
PUT    /api/v1/profile/languages/:id - Modifier une langue
DELETE /api/v1/profile/languages/:id - Supprimer une langue

# Projets
GET    /api/v1/profile/projects      - Liste des projets
POST   /api/v1/profile/projects      - Créer un projet
PUT    /api/v1/profile/projects/:id  - Modifier un projet
DELETE /api/v1/profile/projects/:id  - Supprimer un projet
```

## Démarrage

```bash
# Via Docker Compose
docker compose up profile-service

# En développement
cd profile-service
npm install
npm run dev
```

## Variables d'environnement

- `NODE_ENV` : Environnement (development/production)
- `PORT` : Port du service (3009)
- `DATABASE_URL` : URL de connexion PostgreSQL
- `JWT_SECRET` : Clé secrète JWT
- `AUTH_SERVICE_URL` : URL du service d'authentification

## Exemples d'utilisation

### Créer un CV
```json
{
  "userId": "user_123",
  "title": "CV Software Engineer",
  "firstName": "Pavel",
  "lastName": "Delhomme",
  "email": "pavel@example.com",
  "phone": "+33123456789",
  "linkedinUrl": "https://linkedin.com/in/pavel",
  "isDefault": true
}
```

### Ajouter une expérience
```json
{
  "userId": "user_123",
  "cvId": "cv_456",
  "company": "Google",
  "position": "Software Engineer",
  "startDate": "2020-01-15",
  "endDate": "2023-06-30",
  "skills": ["React", "Node.js", "TypeScript"],
  "achievements": ["Développé une app utilisée par 1M+ utilisateurs"]
}
```

### Ajouter une compétence
```json
{
  "userId": "user_123",
  "cvId": "cv_456",
  "name": "React",
  "category": "FRAMEWORK",
  "level": "ADVANCED",
  "yearsOfExperience": 5
}
```

