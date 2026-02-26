# Backlog technique – JobbingTrack

Ensemble des tâches techniques organisées par priorité. Le STATUS.md à la racine ne contient que l'état courant ; ce fichier contient le détail du backlog complet.

---

## Priorité haute – Tests et stabilité

- [ ] **Tests Playwright E2E** : 1344 tests, majorité timeout 30s (login Playwright ne fonctionne pas). Investiguer la pré-authentification.
- [ ] **Tests Playwright MailHog** : 3 tests échouent. Configurer `SMTP_HOST=mailhog` et `SMTP_PORT=1025` dans `.env`, puis `docker compose restart auth-service`.
- [ ] **Couverture tests backend** : `test-api-specific.sh` couvre tous les services. Vérifier que les rapports sont bien générés.
- [ ] **Rapports performance** : aligner sur le flux Tests API (écriture dans `tests/results/<timestamp>/`).
- [ ] **Tests backoffice – couverture complète** : tester chaque page admin (voir `docs/tests/BACKOFFICE_TESTS_COVERAGE.md`).

## Priorité moyenne – API et fonctionnalités

- [ ] **API versioning** : corriger 404 sur `GET /api/v1/analytics/stats/:userId/versions`. Définir stratégie de versioning.
- [ ] **Documentation API** : Swagger/OpenAPI à synchroniser avec tous les microservices.
- [ ] **User Analytics – tables manquantes** : `user_events`, `user_sessions`, `user_errors`, `user_performances`, `device_infos`. Créer les tables ou documenter comme optionnel.
- [ ] **Archives / Corbeille** : plusieurs services renvoient 404/500. Implémenter ou documenter les limites.
- [ ] **Loki** : requêtes type erreurs par conteneur échouent (`ENOTFOUND loki`). Loki n'est pas déployé.

## Priorité basse – Mobile et émulateur

- [ ] **Émulateur mobile – Build APK** : erreur `flutter_local_notifications` (bigLargeIcon ambiguous). Mettre à jour la dépendance.
- [ ] **Émulateur mobile – Run** : installer et lancer l'APK sur l'appareil.
- [ ] **Logs Android (logcat)** : streamer dans l'UI du backoffice.
- [ ] **App mobile** : dashboard bottom nav + drawer, sync offline/online, suivi candidat. Voir `docs/mobile/APPLICATION_MOBILE_A_FAIRE.md`.

## Priorité basse – CI/CD et déploiement

- [ ] **CI/CD** : pipeline GitHub Actions à adapter au projet microservices.
- [ ] **Déploiement** : voir `docs/deployment/DEPLOIEMENT_FINAL.md`.

## Priorité basse – Sécurité

- [ ] **WAF** : remplacer la config mock par une vraie config WAF.
- [ ] **Tests sécurité** : enrichir (XSS, SQLi, CSRF, auth, rate limiting, headers).
- [ ] **Migration auth** : vers Go/Rust, chiffrement, JWT/refresh, rate limiting, HTTPS.

## Priorité basse – Données et UX

- [ ] **Données test** : implémenter filtre API isTestData.
- [ ] **Design pages test** : reprendre le design Tests Backend (progression, logs).
- [ ] **Gestion utilisateur enrichie** : emailVerified, derniers emails envoyés, analytics par utilisateur.

## Références

- `STATUS.md` : état courant du projet.
- `docs/tests/BACKOFFICE_TESTS_COVERAGE.md` : détail couverture E2E.
- `docs/tests/RAPPORTS_CONVENTIONS.md` : conventions de rapports.
- `docs/troubleshooting/POSTGRES_MONITORING.md` : résolution erreurs Postgres.
- `docs/emails/MAIL.md` : système mail complet.
- `docs/mobile/APPLICATION_MOBILE_A_FAIRE.md` : checklist mobile.
- `docs/database/SCHEMA_CHOIX.md` : choix de schéma BDD.
