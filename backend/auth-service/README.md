# Auth Service

[← Backend](../README.md) | [← README principal](../../README.md) | [📚 Documentation](../../docs/README.md) | [🧭 Navigation](../../docs/navigation.md)

Service d'authentification et d'autorisation. Gère les connexions, inscriptions, tokens JWT et vérification des permissions.

## 📖 Documentation

- **[Documentation API](../../docs/api/api-reference/README.md#authentification)** - Endpoints d'authentification
- **[Sécurité](../../docs/deployment/security/README.md)** - Configuration sécurité
- **[Architecture](../../docs/core/architecture/README.md)** - Architecture microservices

## 📧 Mail / SMTP

Config SMTP et envoi d’emails (reset password, vérification compte) : voir **`STATUS.md`** (section Mail / Emails) et **`docs/emails/MAIL.md`**. Config détaillée et tests Python : **`PYTHON_EMAIL_SETUP.md`** (dans ce dossier).

## 🚀 Démarrage rapide

```bash
# Depuis la racine du projet
make up                # Démarrer tous les services
```

**Port** : 3001  
**URL** : http://localhost:3001

Pour plus d'informations, consultez la [documentation API](../../docs/api/api-reference/README.md).
