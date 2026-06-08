# TODOs à vérifier par l’agent

Dernière mise à jour : 8 juin 2026

## Rôle

Ce fichier liste ce que l’agent doit vérifier techniquement avant de demander une validation porteur. Une ligne vérifiée par l’agent ne vaut pas validation produit.

## Vérifications ouvertes

| Priorité | Vérification agent | Preuve attendue | Statut |
|----------|--------------------|-----------------|--------|
| P0 | Cohérence du nouveau système de pilotage | Liens mis à jour vers `PILOTAGE.md`, `TODOS_A_VALIDER.md`, `TODOS_A_VERIFIER.md`; ancienne référence `A_VALIDER_VERIFIER.md` supprimée ou remplacée. | [x] |
| P0 | Règle Cursor de pilotage | `.cursor/rules/pilotage-validation.mdc` existe et impose la lecture du pilotage avant action. | [x] |
| P0 | Docs de suivi accessibles | `docs/README.md`, `docs/TODOS.md`, `docs/security/README.md`, `TRAITER_IMMEDIATEMENT.md` pointent vers les bons fichiers. | [x] |
| P0 | Correctif Firewall backoffice | Déblocage IP + garde-fous règles globales couverts par `env npm test -- --runTestsByPath tests/firewall-unblock-ip.test.js --verbose --runInBand` OK (6/6) ; `env npm run type-check` OK ; `env npm run lint` OK avec warnings historiques uniquement. | [x] |
| P0 | Rapport sécurité frais pour backoffice | `python3 scripts/security/cve-scan.py --output-dir tests/results/security --timeout-sec 60` OK ; API `/api/test-reports/all` liste `security-results-cve-20260521-201336` en premier ; `/api/test-reports/view` OK ; `/api/test-reports/download` OK (`cve-20260521-201336-summary.md`). | [x] |
| P0 | Comparaison rapports sécurité CVE | Route `/api/test-reports/compare` utilise `frontend/src/lib/test-reports/resolveReport.ts` (IDs `security-results-*`, `security-reports-*`, `summary.md` parsé en lignes par surface). UI dédiée : cartes Critical/High/Medium/Low/Info par rapport, tableau par surface, écarts, notes/payloads non renvoyés. Validation 21/05 : `./node_modules/.bin/tsc --noEmit --pretty false` OK ; ESLint ciblé sur `compare/route.ts`, `resolveReport.ts`, `test-reports/page.tsx` OK avec warnings historiques uniquement. `npm run type-check` / `npm run lint` sortent `1` sans sortie dans ce terminal, mais les commandes sous-jacentes passent. | [x] |
| P0 | Cadrage nouvelles demandes sécurité 08/06 | `TODOS_A_VALIDER.md` et `docs/TODOS.md` contiennent : alertes email critiques JobbingTrack vers adresses dev/admin porteur, CVE applicatives localisées (ex. `CVE-2026-49975`), tests offensifs contrôlés par conteneur (remote host/shell/URL/headers), réduction d’exposition/leurres VPS-Portainer, comparaison CVE exploitable malgré gros volumes, et accès notes/payloads bruts uniquement via réauth forte ; `A_VALIDER_AVANT_PRODUCTION.md` contient les gates préprod/prod associés. | [x] |
| P0 | Inventaire menaces lab/privées (lecture seule) | Script `scripts/security/security-threats-inventory-dry-run.cjs` : classe sans DELETE — `lab_test` (RFC 5737 `198.51.100.x`, `203.0.113.x`, `192.0.2.x`, `10.0.0.x`, metadata lab/test), `private_network` (`172.16–172.31.x`, `192.168.x`, autres `10.x`). Dry-run 21/05 (réf. `docs/TODOS.md`) : **228** lab_test (135 high/critical, 0 blocked), **11** private_network (2 high/critical, 1 blocked). **Aucune purge** tant que porteur n’a pas validé la ligne P0 dans `TODOS_A_VALIDER.md`. Rejouer localement : `node scripts/security/security-threats-inventory-dry-run.cjs --limit=25` (nécessite conteneur `jobbingtrack-postgres` up). | [x] |
| P1 | UX rendu rapports sécurité | Rendu CVE Markdown amélioré dans `/api/test-reports/view` : cartes synthèse, priorités à trier, tableau responsive, markdown brut repliable ; `env npm run type-check` OK ; `env npm run lint` OK avec warnings historiques ; smoke API view OK. | [x] |
| P1 | Validation frontend si fichier UI touché | `env npm run type-check` OK ; `env npm run lint` OK avec warnings historiques uniquement ; pas de Jest frontend ciblé existant pour `firewall/page.tsx`. | [x] |
| P0 | Tests sécurité backoffice — filesystem writable | `docker-compose.yml` : `TESTS_RESULTS_DIR=/tmp/tests/results` + volume `./tests/results:/tmp/tests/results` (car `./tests:/app/tests:ro`). `generate-test-report.sh` bascule vers `/tmp/tests/results` si mkdir échoue. Recreate conteneur `frontend` requis après merge. | [x] |
| P0 | Comparaison CVE — exploitabilité et filtres | `resolveReport.ts` : statut `skip` pour surfaces skipped (plus de faux « Échoué »). `compare/route.ts` : libellés écart sécurité, tri par score exploitabilité. UI : filtres type docker/node, critical/high only, masquer absents, badge « Ignoré ». `./node_modules/.bin/tsc --noEmit` OK. | [x] |
| P0 | Détails sensibles sous réauth | APIs `POST /api/test-reports/sensitive-step-up` (vérif mot de passe via auth login) + `GET /api/test-reports/sensitive-details` (jeton court usage unique, audit `tests/results/security-audit/step-up.jsonl`, `Cache-Control: no-store`). UI modal sur comparaison sécurité. `./node_modules/.bin/tsc --noEmit` OK. | [x] |
| P0 | Rapport tests sécurité backoffice — stats cohérentes | `generate-test-report.sh` : pattern 3 désactivé pour `security`, parsing `security-report.json` via **node** (pas jq requis), statut `warning` si medium/low seuls, labels Critical/High vs Medium/Low. `METRICS_AGGREGATOR_INTERNAL_URL` pour logs services. | [x] |
| P0 | Scan CVE + localisation depuis backoffice | `POST /api/test/run-cve-scan`, `GET /api/security/cve-locate?cve=…`, `scripts/security/cve-locate.mjs`, page tests-security : boutons séparés applicatifs / CVE + recherche CVE. `frontend/Dockerfile` : `python3` + `jq` (rebuild frontend requis). `./node_modules/.bin/tsc --noEmit` OK. | [x] |
| P1A | Alertes email sécurité — réauth + test | `POST /api/v1/auth/verify-password` (auth-service) ; `PUT/POST .../security/notification-settings` exigent `currentPassword` + rôle ADMIN/SUPER_ADMIN ; audit `security_alert_email_settings_updated` / `security_alert_email_test_sent` avec diff et acteur ; UI `SecurityAlertEmailSettings.tsx` : champ mot de passe + bouton test. `npm test -- --testPathPattern=notification-settings` OK (4/4) ; `npm run type-check` frontend OK ; ESLint ciblé `SecurityAlertEmailSettings.tsx` OK. | [x] |

## Vérifications récurrentes

- Lire `PILOTAGE.md` avant de choisir une prochaine tâche.
- Contrôler `TODOS_A_VALIDER.md` avant de commencer une feature.
- Ne travailler que sur la première ligne ouverte de `TODOS_A_VALIDER.md`; attendre validation porteur avant la suivante.
- Si une validation porteur échoue, créer une tâche dans `docs/TODOS.md` et traiter ce problème avant la suite.
- Après chaque livrable, mettre à jour `TODOS_A_VERIFIER.md`, `TODOS_A_VALIDER.md` ou `TODOS_DONE.md` selon le cas.
