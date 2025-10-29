# Variables d'environnement sécurisées - JobbingTrack

[← Retour au README principal](../README.md) | [← Documentation](README.md) | [🧭 Navigation](navigation.md)

## Configuration sécurisée par variables d'environnement

**JobbingTrack utilise exclusivement des variables d'environnement** pour la configuration. Aucune valeur sensible n'est hardcodée ou affichée par défaut.

## Variables d'environnement principales

### Base de données PostgreSQL
```bash
POSTGRES_DB=jobbingtrack                    # Nom de la base de données
POSTGRES_USER=jobbingtrack                  # Utilisateur PostgreSQL
POSTGRES_PASSWORD=VOTRE_PASSWORD_SÉCURISÉ   # ⚠️ Mot de passe sécurisé
```

### Frontend
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000     # URL de l'API Gateway
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:3001  # URL du service d'authentification
NEXT_PUBLIC_METRICS_URL=http://localhost:3014 # URL du service de métriques
```

### JWT (⚠️ Secrets uniques et sécurisés)
```bash
JWT_SECRET=VOTRE_SECRET_JWT_UNIQUE_64_CHARS   # ⚠️ Générez avec: openssl rand -base64 64
JWT_REFRESH_SECRET=VOTRE_REFRESH_SECRET       # ⚠️ Générez avec: openssl rand -base64 64
```

### Redis
```bash
REDIS_URL=redis://localhost:6379  # URL Redis pour le cache
```

### Email (SMTP)
```bash
SMTP_HOST=smtp.gmail.com                    # Serveur SMTP
SMTP_PORT=587                              # Port SMTP
SMTP_USER=votre-email@gmail.com            # Email expéditeur
SMTP_PASS=VOTRE_MOT_DE_PASSE_APP           # ⚠️ Mot de passe d'application
SMTP_FROM=JobbingTrack <noreply@jobbingtrack.com>  # Email expéditeur formaté
```

### Utilisateur Administrateur
```bash
ADMIN_EMAIL=votre-email-admin@jobbingtrack.com  # ⚠️ Email administrateur
ADMIN_PASSWORD=VOTRE_PASSWORD_ADMIN_SÉCURISÉ    # ⚠️ Mot de passe administrateur
ADMIN_FIRST_NAME=VotrePrénom                    # Prénom administrateur
ADMIN_LAST_NAME=VotreNom                       # Nom administrateur
```

## Configuration de développement

Créez un fichier `.env` à la racine du projet :

```bash
# Copier le template et définir vos valeurs
cp .env.example .env

# Éditer le fichier .env avec vos vraies valeurs
nano .env
```

### Variables d'environnement pour le développement
```bash
# PostgreSQL
POSTGRES_DB=jobbingtrack
POSTGRES_USER=jobbingtrack
POSTGRES_PASSWORD=mon_mot_de_passe_securise_2025

# JWT (générez des secrets uniques)
JWT_SECRET=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab
JWT_REFRESH_SECRET=fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fe

# Utilisateur administrateur
ADMIN_EMAIL=user1@jobbingtrack.com
ADMIN_PASSWORD=password123
ADMIN_FIRST_NAME=Pavel
ADMIN_LAST_NAME=Delhomme

# Configuration
NODE_ENV=development
LOG_LEVEL=info
```

## Configuration de production

Créez un fichier `.env.production` :

```bash
# PostgreSQL de production
POSTGRES_DB=jobbingtrack_prod
POSTGRES_USER=jobbingtrack_prod_user
POSTGRES_PASSWORD=super_secret_production_password_2025!

# JWT de production (secrets différents)
JWT_SECRET=prod_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab
JWT_REFRESH_SECRET=prod_fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fe

# Utilisateur administrateur de production
ADMIN_EMAIL=admin@monentreprise.com
ADMIN_PASSWORD=production_admin_password_2025!

# Configuration production
NODE_ENV=production
LOG_LEVEL=warn
```

## Sécurité

### ⚠️ **CRITIQUE - En production :**
1. **Générez des secrets JWT uniques** avec au moins 64 caractères
   ```bash
   openssl rand -base64 64
   ```

2. **Utilisez des mots de passe forts** pour PostgreSQL et l'admin

3. **Ne commitez jamais** les fichiers .env dans Git

4. **Utilisez des variables d'environnement** dans tous les déploiements

5. **Chiffrez les secrets** en production si possible

### Génération de secrets sécurisés :
```bash
# Secret JWT (64 caractères)
openssl rand -base64 64

# Mot de passe PostgreSQL (32 caractères)
openssl rand -base64 32

# Mot de passe administrateur (au moins 12 caractères)
openssl rand -hex 16
```

## Utilisation

### Démarrage avec variables d'environnement
```bash
# Charger les variables d'environnement
export $(cat .env | xargs)

# Ou utiliser un fichier .env avec docker-compose
docker-compose --env-file .env up

# Ou avec make
make up-full  # Utilise automatiquement les variables d'environnement
```

### Tests avec variables d'environnement
```bash
# Tests de l'application mobile Flutter
./scripts/test-mobile-integrated.sh

# Tests API uniquement (sans interface mobile)
./scripts/test-api-only.sh

# Tests Playwright standards
make test-e2e

# Alternative npm :
npm run test:e2e
```

### Vérification des variables
```bash
# Vérifier que les variables sont chargées
env | grep POSTGRES
env | grep JWT
env | grep ADMIN
```

### Messages d'aide sécurisés
Les scripts d'aide n'affichent plus les vraies valeurs pour des raisons de sécurité :

```
🔑 Identifiants de connexion :
   Email:    [Défini dans le fichier .env]
   Password: [Défini dans le fichier .env]
```

## Migration des configurations existantes

### ❌ **Avant (non sécurisé)**
```yaml
environment:
  - DATABASE_URL=postgresql://admin:admin123@postgres:5432/jobbingtrack
  - JWT_SECRET=mon-secret-hardcode
```

### ✅ **Après (sécurisé)**
```yaml
environment:
  - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
  - JWT_SECRET=${JWT_SECRET}
```

Avec les variables d'environnement correspondantes dans `.env` :
```bash
POSTGRES_USER=jobbingtrack
POSTGRES_PASSWORD=mon_password_securise_2025
POSTGRES_DB=jobbingtrack
JWT_SECRET=mon_secret_jwt_unique_64_chars_abcdef1234567890...
```

## Gestion des erreurs

Si les variables d'environnement ne sont pas définies, les services afficheront :
```
❌ Variables d'environnement ADMIN_EMAIL et ADMIN_PASSWORD non définies
💡 Définissez ADMIN_EMAIL et ADMIN_PASSWORD dans votre fichier .env
```

## Déploiement

### Docker Compose
```yaml
services:
  api-gateway:
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - JWT_SECRET=${JWT_SECRET}
```

### Variables d'environnement du système
```bash
# Dans le fichier .env ou via export
POSTGRES_USER=jobbingtrack
POSTGRES_PASSWORD=secure_password_2025
JWT_SECRET=unique_jwt_secret_64_chars_abcdef1234567890...
```

## Support

Pour plus d'informations sur la configuration sécurisée :
- Consultez le guide de sécurité : `docs/security-guide.md`
- Voir les exemples de production : `production/env.production.example`
- Documentation complète : `docs/environment-variables.md`
