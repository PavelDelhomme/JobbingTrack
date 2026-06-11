# Variables d'environnement - JobbingTrack

[← Retour Déploiement](../production/README.md) | [← Documentation](../../README.md) | [🧭 Navigation](../../navigation.md)

## 🎯 Vue d'ensemble

**JobbingTrack utilise exclusivement des variables d'environnement** pour la configuration. Aucune valeur sensible n'est hardcodée dans les fichiers de configuration.

**PostgreSQL / `DATABASE_URL`** : la ligne `DATABASE_URL` du `.env` sert surtout aux **outils sur l’hôte** (Prisma, scripts) ; les **conteneurs** reçoivent en général une URL `...@postgres:5432/...` via `docker-compose`. Détail et prod / NPM : **[`../VPS_PORTAINER_NPM_OVH.md`](../VPS_PORTAINER_NPM_OVH.md)** § 2.2.

## Production VPS — variables à contrôler avant déploiement

Avant préprod/prod, relire aussi `docs/operations/PRE_VPS_ENV_AUDIT_AND_UPDATES.md` et garder les valeurs réelles hors Git.

Variables critiques à vérifier explicitement :

- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SECURITY_INTERNAL_SECRET` : valeurs fortes, uniques, jamais les fallbacks de dev.
- `METRICS_API_KEY` : présent côté serveur uniquement, cohérent entre gateway/services/metrics-aggregator.
- `TRUST_PROXY_HOPS`, `ALLOWED_ORIGINS`, URLs publiques `FRONTEND_URL` / API : alignés avec Nginx Proxy Manager et les domaines HTTPS.
- `WAF_ENABLED`, `INTRUSION_DETECTION_ENABLED`, `INTRUSION_RELAX_HEURISTICS` : mode prod strict, pas de relax dev.
- `POSTGRES_PASSWORD`, `DATABASE_URL`, `REDIS_URL` : secrets forts, réseau privé, pas d’exposition Internet directe.
- `SMTP_*`, `SECURITY_ALERT_EMAIL(S)`, `CRASH_REPORT_EMAIL` : TLS SMTP validé, compte SMTP technique séparé des alias visibles. Les destinataires publics (`CRASH_REPORT_EMAIL`, `SECURITY_ALERT_EMAIL(S)`) doivent être des alias du domaine JobbingTrack redirigés chez le fournisseur mail vers les boîtes privées réelles, hors Git. En préprod/prod, `SMTP_HOST` ne doit jamais valoir `mailhog`, `localhost` ou `127.0.0.1`.

---

## 📋 Variables d'environnement principales

### 💾 Base de données PostgreSQL

```bash
POSTGRES_DB=jobbingtrack                    # Nom de la base de données
POSTGRES_USER=jobbingtrack                  # Utilisateur PostgreSQL
POSTGRES_PASSWORD=VOTRE_PASSWORD_SÉCURISÉ   # ⚠️ Mot de passe sécurisé
```

### 🖥️ Frontend

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000           # URL de l'API Gateway
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:3001  # URL du service d'authentification
NEXT_PUBLIC_METRICS_URL=http://localhost:3014       # URL du service de métriques
```

### 📊 Monitoring

```bash
# cAdvisor - Surveillance des conteneurs
CADVISOR_URL=http://localhost:8081

# Prometheus - Collecte de métriques
PROMETHEUS_URL=http://localhost:9090

# Grafana - Tableaux de bord
GRAFANA_URL=http://localhost:8083

# Node Exporter - Métriques système
NODE_EXPORTER_URL=http://localhost:8084

# Alertmanager - Gestion des alertes
ALERTMANAGER_URL=http://localhost:8085

# Blackbox Exporter - Surveillance des endpoints
BLACKBOX_EXPORTER_URL=http://localhost:8086
```

### 🔐 JWT (⚠️ Secrets uniques et sécurisés)

```bash
JWT_SECRET=VOTRE_SECRET_JWT_UNIQUE_64_CHARS   # ⚠️ Générez avec: openssl rand -base64 64
JWT_REFRESH_SECRET=VOTRE_REFRESH_SECRET       # ⚠️ Générez avec: openssl rand -base64 64
```

### 🔴 Redis

```bash
REDIS_URL=redis://localhost:6379  # URL Redis pour le cache
```

### 📧 Email (SMTP)

MailHog est réservé au local/dev/test. En préproduction et production, renseigner un fournisseur SMTP réel et prouver la réception dans une boîte réelle.

```bash
SMTP_HOST=smtp.gmail.com                      # Serveur SMTP
SMTP_PORT=587                                 # Port SMTP
SMTP_USER=redacted@example.invalid               # Email expéditeur
SMTP_PASS=VOTRE_MOT_DE_PASSE_APP              # ⚠️ Mot de passe d'application
SMTP_FROM=JobbingTrack <redacted@example.invalid>  # Email expéditeur formaté (compte SMTP authentifié si le fournisseur l'exige)
SMTP_REPLY_TO=redacted@example.invalid            # Réponse par défaut
CRASH_REPORT_EMAIL=crash-report@jobbingtrack.test # Alias public, forwarding fournisseur hors Git
CRASH_REPORT_FROM=JobbingTrack Crash Reports <redacted@example.invalid>
CRASH_REPORT_REPLY_TO=crash-report@jobbingtrack.test
SECURITY_ALERT_EMAIL=security@jobbingtrack.test
SECURITY_ALERT_FROM=JobbingTrack Security <security@jobbingtrack.test>
SECURITY_ALERT_REPLY_TO=security@jobbingtrack.test
```

Pour les fournisseurs stricts (ex. SMTP OVH selon configuration), privilégier `*_FROM` sur le compte SMTP authentifié (`SMTP_USER`) et mettre l’alias métier (`crash-report@…`, `security@…`) dans `*_REPLY_TO` ou dans les redirections fournisseur. Cela améliore la délivrabilité tout en gardant une adresse de réponse lisible.

Contrôles préprod/prod :

- `SMTP_HOST` = host fournisseur réel (`ssl0.ovh.net`, `smtp-relay.brevo.com`, etc.), pas MailHog.
- `SMTP_USER` / `SMTP_PASS` présents hors Git.
- `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USE_SSL` alignés avec le fournisseur (`587` STARTTLS ou `465` SSL implicite).
- `NOTIFICATION_SMTP_HOST` / `NOTIFICATION_SMTP_PORT` non utilisés pour forcer MailHog en prod.
- Smoke reset/vérification + alerte sécurité + digest/notification critique : reçu réel + `EmailLog` `SENT`.

### 📬 Agent email / tâches recherche emploi (futur lot I)

Valeurs réelles uniquement dans `.env` gitignoré ou paramètres admin. Les placeholders Git ne doivent jamais être utilisés en runtime.

```bash
# Runtime agent (hors tests)
EMAIL_TRIAGE_DIGEST_DAILY_ENABLED=true  # Active le rapport quotidien
EMAIL_TRIAGE_DIGEST_DAILY_TIME=18:00    # Heure locale du rapport quotidien
EMAIL_TRIAGE_DIGEST_FROM=JobbingTrack <noreply@jobbingtrack.com> # Expéditeur visible du digest
EMAIL_TRIAGE_DIGEST_RECIPIENT=           # Destinataire digest quotidien/hebdo (profil utilisateur ou .env)
EMAIL_TRIAGE_DIGEST_REPLY_TO=            # Réponse optionnelle
EMAIL_TRIAGE_DIGEST_TIMEZONE=Europe/Paris
EMAIL_TRIAGE_DIGEST_WEEKLY_DAY=sunday
EMAIL_TRIAGE_DIGEST_WEEKLY_ENABLED=false
EMAIL_TRIAGE_DIGEST_WEEKLY_TIME=18:00
EMAIL_TRIAGE_READ_ACCOUNT=               # Compte/boîte lecture principale (hors Git)
EMAIL_TRIAGE_FORWARD_ADDRESS=            # Adresse de transfert configurable

# Tests agent email — intégration locale optionnelle
TEST_EMAIL_TRIAGE_ENABLED=false
TEST_EMAIL_TRIAGE_USER_EMAIL=redacted@example.invalid
TEST_EMAIL_TRIAGE_USER_PASSWORD=
TEST_EMAIL_TRIAGE_GMAIL_ACCOUNT=
TEST_EMAIL_TRIAGE_GMAIL_REFRESH_TOKEN=
TEST_EMAIL_TRIAGE_IMAP_EMAIL=redacted@example.invalid
TEST_EMAIL_TRIAGE_IMAP_HOST=imap.example.com
TEST_EMAIL_TRIAGE_IMAP_PORT=993
TEST_EMAIL_TRIAGE_IMAP_PASSWORD=
TEST_EMAIL_TRIAGE_DIGEST_FROM=JobbingTrack <noreply@jobbingtrack.com>
TEST_EMAIL_TRIAGE_DIGEST_RECIPIENT=redacted@example.invalid
TEST_EMAIL_TRIAGE_DIGEST_DAILY_TIME=18:00
TEST_EMAIL_TRIAGE_DIGEST_WEEKLY_DAY=sunday
TEST_EMAIL_TRIAGE_CALENDAR_MIN_HOUR=05:00
TEST_EMAIL_TRIAGE_CALENDAR_MAX_HOUR=23:00
```

Le digest de triage doit utiliser une identité visible du domaine `jobbingtrack.com` (ex. `noreply@jobbingtrack.com`) ; l’adresse Gmail personnelle sert de compte lu ou de destinataire si l’utilisateur la configure, jamais d’expéditeur applicatif par défaut. Les tests d’intégration Gmail/IMAP/digest doivent **skip** explicitement si les secrets sont absents. Détail : `docs/features/EMAIL_TRIAGE_AGENT.md` et `tests/email-triage/README.md`.

### 👤 Utilisateur Administrateur

```bash
ADMIN_EMAIL=admin@jobbingtrack.test              # ⚠️ Email administrateur
ADMIN_PASSWORD=VOTRE_PASSWORD_ADMIN_SÉCURISÉ    # ⚠️ Mot de passe administrateur
ADMIN_FIRST_NAME=Admin                          # Prénom administrateur
ADMIN_LAST_NAME=JobbingTrack                    # Nom administrateur
```

---

## 🛠️ Configuration Docker Compose

### Variables d'environnement dans docker-compose.yml

```yaml
services:
  postgres:
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

  api-gateway:
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - REDIS_URL=redis://redis:6379
```

### Variables d'environnement dans backend services

```yaml
environment:
  - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
  - JWT_SECRET=${JWT_SECRET}
  - AUTH_SERVICE_URL=http://auth-service:3001
```

---

## 🔧 Configuration de développement

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
ADMIN_EMAIL=admin@jobbingtrack.test
ADMIN_PASSWORD=change-me-generate-a-strong-admin-password
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=JobbingTrack

# Configuration
NODE_ENV=development
LOG_LEVEL=info
```

---

## 🚀 Configuration de production

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
ADMIN_EMAIL=redacted@example.invalid
ADMIN_PASSWORD=production_admin_password_2025!
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=Production

# Configuration production
NODE_ENV=production
LOG_LEVEL=warn
```

---

## 🔒 Sécurité

### ⚠️ **CRITIQUE - En production :**

1. **Générez des secrets JWT uniques** avec au moins 64 caractères
   ```bash
   openssl rand -base64 64
   ```

2. **Utilisez des mots de passe forts** pour PostgreSQL et l'admin
   - Au moins 12 caractères
   - Majuscules, minuscules, chiffres et symboles

3. **Ne commitez jamais** les fichiers .env dans Git
   - Ajoutez `.env*` dans `.gitignore`
   - Utilisez des secrets managers en production

4. **Utilisez des variables d'environnement** dans tous les déploiements
   - Évitez les valeurs hardcodées
   - Centralisez la configuration

5. **Chiffrez les secrets** en production si possible
   - Vault, AWS Secrets Manager, etc.

### Génération de secrets sécurisés

```bash
# Secret JWT (64 caractères)
openssl rand -base64 64

# Mot de passe PostgreSQL (32 caractères)
openssl rand -base64 32

# Mot de passe administrateur (au moins 16 caractères)
openssl rand -hex 16
```

---

## 📦 Variables d'environnement spécifiques aux services

### Services backend

Tous les services backend utilisent les mêmes variables PostgreSQL mais avec des schémas différents :

- **auth-service** : `?schema=public`
- **metrics-aggregator-service** : `?schema=metrics`
- **deployment-service** : `?schema=deployment`
- **security-service** : `?schema=security`

### Services frontend

```bash
# Production
NEXT_PUBLIC_API_URL=https://api.votredomaine.com
NEXT_PUBLIC_AUTH_SERVICE_URL=https://auth.votredomaine.com
NEXT_PUBLIC_METRICS_URL=https://metrics.votredomaine.com
```

---

## 🚀 Utilisation

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

---

## 🔄 Migration des configurations existantes

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

---

## 🐛 Gestion des erreurs

Si les variables d'environnement ne sont pas définies, les services afficheront :

```
❌ Variables d'environnement ADMIN_EMAIL et ADMIN_PASSWORD non définies
💡 Définissez ADMIN_EMAIL et ADMIN_PASSWORD dans votre fichier .env
```

---

## 📚 Scripts de génération de données

Les scripts utilisent les variables d'environnement :

```javascript
// Exemple dans generate-test-data.js
const dbUrl = process.env.DATABASE_URL || 
  'postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack?schema=public'
```

---

## 📖 Ressources supplémentaires

- 🔒 [Guide de Sécurité](../../security/README.md)
- 🏭 [Déploiement Production](../production/README.md)
- 📝 [Exemple de production](../../../production/env.production.example)
- 🏗️ [Architecture](../../core/architecture/README.md)

---

**Version**: 4.1  
**Dernière mise à jour**: Novembre 2025

