# Configuration service Python Email – JobbingTrack

Le service d’envoi d’emails (auth-service) peut s’appuyer sur un script Python. Ce document décrit la configuration et les tests. Voir aussi [SMTP_CONFIGURATION.md](SMTP_CONFIGURATION.md).

## Reconstruire le conteneur

Le service Python d’envoi d’emails nécessite Python 3 dans le conteneur Docker. Reconstruire le conteneur pour que Python soit disponible :

```bash
make rebuild-service SERVICE=auth-service
# ou
make rebuild
```

## Vérifier Python

```bash
docker exec jobbingtrack-auth-service python3 --version
```

## Tester SMTP et envoi

```bash
make test-email-python
make test-email-python-reset TEST_EMAIL=redacted@example.invalid
make test-email-python-verification TEST_EMAIL=redacted@example.invalid
```

## Dépannage

- **python3: executable file not found** → Reconstruire : `make rebuild-service SERVICE=auth-service`
- **Cannot find module 'pythonEmailService'** → Vérifier le chemin dans le conteneur et redémarrer le service
- **Erreur SMTP** → Vérifier les variables d’environnement (`docker exec ... env | grep SMTP`) et [SMTP_CONFIGURATION.md](SMTP_CONFIGURATION.md)

## Documentation technique

- Service email : `backend/auth-service/src/services/email/README.md`
- Script de test : `backend/auth-service/test-email-python.js`
