# 🔒 Guide Sécurité - JobbingTrack

Guide de sécurité et bonnes pratiques pour JobbingTrack v4.1.

[← Retour à la documentation](../README.md) | [← README principal](../../README.md) | [🧭 Navigation](../navigation.md)

## 🎯 Vue d'ensemble

Configuration sécurité, authentification et protection des systèmes JobbingTrack.

## 📚 Guides Disponibles

### 🔐 Sécurité des Services
- **[Architecture security-service](ARCHITECTURE_SECURITY_SERVICE.md)** – Périmètre, base dédiée, accès API.
- **[Monitoring CVE continu](CVE_CONTINUOUS_MONITORING.md)** – Scan CVE multi-technologies, alertes mail critiques, score sécurité et protection des logs.
- **[Matrice tests sécurité offensifs](SECURITY_TESTING_MATRIX.md)** – Énumération URL, injections, auth, API, Docker, secrets, DoS, mobile, outils Kali/équivalents et protections attendues.
- **[Système de Sécurité](SYSTEME_SECURITE_README.md)** – Architecture et implémentation du système de sécurité.
- **[Démarrage Services Sécurité](DEMARRAGE_SERVICES_SECURITE.md)** – Démarrage et configuration.

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
**Dernière mise à jour** : Mars 2026
