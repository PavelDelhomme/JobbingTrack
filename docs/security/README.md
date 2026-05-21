# 🔒 Guide Sécurité - JobbingTrack

Guide de sécurité et bonnes pratiques pour JobbingTrack v4.1.

[← Retour à la documentation](../README.md) | [← README principal](../../README.md) | [🧭 Navigation](../navigation.md)

## 🎯 Vue d'ensemble

Configuration sécurité, authentification et protection des systèmes JobbingTrack.

## 📚 Guides Disponibles

### 🔐 Sécurité des Services
- **[Audit sécurité projet](AUDIT_SEC_PROJECT.md)** — synthèse risques P0, rapports, suites attendues.
- **[Architecture security-service](ARCHITECTURE_SECURITY_SERVICE.md)** – Périmètre, base dédiée, accès API.
- **[Monitoring CVE continu](CVE_CONTINUOUS_MONITORING.md)** – Scan CVE multi-technologies, alertes mail critiques, score sécurité et protection des logs.
- **[Intégration Dependabot Alerts](DEPENDABOT_ALERTS_INTEGRATION.md)** – Mapping GitHub Dependabot vers la table `vulnerabilities` et alertes supply-chain.
- **[Matrice tests sécurité offensifs](SECURITY_TESTING_MATRIX.md)** – Énumération URL, injections, auth, API, Docker, secrets, DoS, mobile, outils Kali/équivalents et protections attendues.
- **[Roadmap API + backoffice sécurité](ROADMAP_SECURITE_API_ET_BACKOFFICE.md)** – Phases auth/IDOR/injections/DoS/CVE/UI, IA/PQC, faux positifs DoS dev (`172.19.0.1`).
- **[Rétention des logs sécurité](SECURITY_LOGS_RETENTION.md)** – Politique de compression/archive, classes de rétention, dry-run et restauration.
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
- Chiffrement au repos (voir ci-dessous : disque hôte / cloud, pas une option magique « par volume Docker »)
- Chiffrement en transit (TLS/SSL)
- Hashage des mots de passe (bcrypt)
- Sanitization des inputs

#### Volumes Docker et chiffrement au repos

Les **volumes nommés** (`postgres_data`, etc.) sont stockés par le moteur Docker sur le **système de fichiers de l’hôte** (souvent sous `/var/lib/docker/volumes/`). Docker Community ne propose pas un interrupteur du type « chiffrer ce volume seul » : la protection **au repos** des données sur disque relève du **chiffrement du disque ou du volume managé** (LUKS sur machine, disque chiffré chez le cloud provider, politique de la VM).

- **Développement local** : en pratique, un **disque portable chiffré** (ou équivalent) suffit souvent ; pas besoin d’un développement spécifique « chiffrement volume Docker » dans le dépôt.
- **Production** : activer le **chiffrement côté hébergeur** pour les volumes/disques qui portent PostgreSQL et Redis ; traiter à part les **sauvegardes** (dumps chiffrés, intégrité) — trajectoire **lot G** dans `docs/PLAN.md` et entrées associées dans `docs/TODOS.md`.

### Sécurité Infrastructure
- Firewall et règles réseau
- Rate limiting
- CORS configuration
- Security headers

---

**Version**: 4.1 - Guide sécurité
**Dernière mise à jour** : mai 2026
