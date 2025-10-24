# Configuration PostgreSQL - JobbingTrack

## Configuration actuelle

Le système JobbingTrack utilise les configurations PostgreSQL suivantes :

### Variables d'environnement PostgreSQL
```bash
POSTGRES_DB=jobbingtrack
POSTGRES_USER=jobbingtrack
POSTGRES_PASSWORD=jobbingtrack123
```

### URL de connexion standardisée
```bash
DATABASE_URL=postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public
```

### Configuration Docker Compose
```yaml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: ${POSTGRES_DB:-jobbingtrack}
    POSTGRES_USER: ${POSTGRES_USER:-jobbingtrack}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-jobbingtrack123}
```

## Services utilisant PostgreSQL

Tous les services backend utilisent la même configuration PostgreSQL :

- **API Gateway** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **Auth Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **Dashboard Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **Application Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **Company Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **Contact Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **Interview Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **Call Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **Notification Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **Profile Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **Event Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **Followup Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **Workflow Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **Security Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **Deployment Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`
- **System Metrics Service** : `postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public`

## Frontend

Le frontend n'utilise pas directement PostgreSQL mais se connecte via l'API Gateway.

## Migration et schéma

Les schémas Prisma utilisent la variable d'environnement `DATABASE_URL` qui est configurée pour pointer vers PostgreSQL.

## Configuration de développement

Pour le développement local, utilisez :

```bash
# Variables d'environnement
POSTGRES_DB=jobbingtrack
POSTGRES_USER=jobbingtrack
POSTGRES_PASSWORD=jobbingtrack123

# Ou via .env
DATABASE_URL=postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack?schema=public
```

## Configuration de production

Pour la production, modifiez les variables d'environnement :

```bash
POSTGRES_DB=votre_db_prod
POSTGRES_USER=votre_user_prod
POSTGRES_PASSWORD=votre_password_tres_securise
```

**⚠️ Important :** Changez toujours les mots de passe par défaut en production !
