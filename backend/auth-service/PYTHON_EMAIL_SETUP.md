# 🐍 Configuration Service Python Email - JobbingTrack

## ⚠️ IMPORTANT : Reconstruire le conteneur

Le service Python d'envoi d'emails nécessite Python 3 dans le conteneur Docker. **Vous devez reconstruire le conteneur** pour que Python soit disponible.

## 🔧 Étapes de configuration

### 1. Reconstruire le service auth-service

```bash
# Option 1 : Reconstruire uniquement auth-service (recommandé)
make rebuild-service SERVICE=auth-service

# Option 2 : Reconstruire tous les services
make rebuild
```

### 2. Vérifier que Python est installé

```bash
docker exec jobbingtrack-auth-service python3 --version
```

Vous devriez voir : `Python 3.x.x`

### 3. Tester la connexion SMTP

```bash
# Test simple de connexion
make test-email-python

# Ou directement
docker exec jobbingtrack-auth-service node test-email-python.js test_connection
```

### 4. Tester l'envoi d'emails

```bash
# Test email de réinitialisation
make test-email-python-reset TEST_EMAIL=redacted@example.invalid

# Test email de vérification
make test-email-python-verification TEST_EMAIL=redacted@example.invalid
```

## 📋 Commandes disponibles

| Commande | Description |
|----------|-------------|
| `make test-email-python` | Test de connexion SMTP |
| `make test-email-python-reset` | Test envoi email reset password |
| `make test-email-python-verification` | Test envoi email vérification |
| `make rebuild-service SERVICE=auth-service` | Reconstruire auth-service avec Python |

## 🔍 Dépannage

### Erreur : "python3: executable file not found"

**Cause** : Le conteneur n'a pas été reconstruit avec Python.

**Solution** :
```bash
make rebuild-service SERVICE=auth-service
```

### Erreur : "Cannot find module 'pythonEmailService'"

**Cause** : Le fichier n'est pas au bon endroit ou le conteneur n'a pas été redémarré.

**Solution** :
```bash
# Vérifier que le fichier existe
docker exec jobbingtrack-auth-service ls -la /app/src/services/email/pythonEmailService.js

# Redémarrer le service
make restart-service SERVICE=auth-service
```

### Erreur de connexion SMTP

**Cause** : Variables d'environnement SMTP non configurées.

**Solution** :
1. Vérifier les variables dans `docker-compose.yml`
2. Vérifier les variables dans le conteneur :
   ```bash
   docker exec jobbingtrack-auth-service env | grep SMTP
   ```
3. Redémarrer le service si nécessaire :
   ```bash
   make restart-service SERVICE=auth-service
   ```

## 📝 Configuration SMTP

Les variables d'environnement sont configurées dans `docker-compose.yml` :

```yaml
environment:
  - SMTP_HOST=${SMTP_HOST:-mailhog}
  - SMTP_PORT=${SMTP_PORT:-1025}
  - SMTP_SECURE=${SMTP_SECURE:-false}
  - SMTP_USE_SSL=${SMTP_USE_SSL:-false}
  - SMTP_USER=${SMTP_USER}
  - SMTP_PASS=${SMTP_PASS}
  - SMTP_FROM=${SMTP_FROM}
  - SMTP_REPLY_TO=${SMTP_REPLY_TO:-${SMTP_FROM}}
  - FRONTEND_URL=${FRONTEND_URL:-http://localhost:8080}
```

### Configuration OVH (Production)

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USE_SSL=false
SMTP_USER=redacted@example.invalid
SMTP_PASS=votre-mot-de-passe
SMTP_FROM=JobbingTrack <noreply@jobbingtrack.test>
```

### Configuration MailHog (Développement)

```env
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USE_SSL=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=JobbingTrack <redacted@example.invalid>
```

## ✅ Vérification finale

Après reconstruction, vérifiez que tout fonctionne :

```bash
# 1. Vérifier Python
docker exec jobbingtrack-auth-service python3 --version

# 2. Tester la connexion SMTP
make test-email-python

# 3. Vérifier les logs
docker logs jobbingtrack-auth-service | grep -i python
```

## 📚 Documentation

- **Service Python** : `src/services/email/README.md`
- **Script de test** : `test-email-python.js`
- **Wrapper Node.js** : `src/services/email/pythonEmailService.js`

