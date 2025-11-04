# 🔒 Guide Sécurité - JobbingTrack

Guide de sécurité et bonnes pratiques pour JobbingTrack v4.1.

[← Retour à la documentation](../README.md) | [← README principal](../../README.md) | [🧭 Navigation](../navigation.md)

## 🎯 Vue d'ensemble

Configuration sécurité, authentification et protection des systèmes JobbingTrack.

## 📚 Guides Disponibles

### 🔐 Sécurité des Services
- **[Système de Sécurité](SYSTEME_SECURITE_README.md)** - Architecture et implémentation du système de sécurité complet
- **[Démarrage Services Sécurité](DEMARRAGE_SERVICES_SECURITE.md)** - Guide de démarrage et configuration des services de sécurité

## 🛡️ Principes de Sécurité

### Authentification
- JWT avec refresh tokens
- Sessions sécurisées
- MFA (Multi-Factor Authentication)
- OAuth 2.0 / OpenID Connect

### Autorisation
- RBAC (Role-Based Access Control)
- Permissions granulaires
- Policies et règles
- Audit logging

### Protection des Données
- Chiffrement au repos
- Chiffrement en transit (TLS/SSL)
- Hashage des mots de passe (bcrypt)
- Sanitization des inputs

### Sécurité Infrastructure
- Firewall et règles réseau
- Rate limiting
- CORS configuration
- Security headers

---

**Version**: 4.1 - Guide sécurité
**Dernière mise à jour**: Novembre 2025
