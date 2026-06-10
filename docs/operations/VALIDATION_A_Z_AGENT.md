# Validation A-Z agent — JobbingTrack

**Statut** : programme agent local, démarré le 11/06/2026.  
**But** : vérifier progressivement API, backend, frontend, mobile, emails, métriques, sécurité, rapports et interactions, sans attendre une validation porteur ligne par ligne. Les validations produit restent dans `TODOS_A_VALIDER.md`.

## Règles

- Lire `PILOTAGE.md`, `TODOS_A_VALIDER.md`, `TODOS_A_VERIFIER.md` avant chaque lot.
- Ne pas lancer de scan offensif agressif, de purge, de test prod ou de commande destructive sans validation explicite.
- Toujours vérifier les emails critiques après un lot : MailHog + `EmailLog` + destinataires configurés.
- Préférer les commandes directes aux wrappers `npm run` quand ceux-ci sortent code `1` sans sortie exploitable.
- Reporter tout KO dans `TODOS_A_VERIFIER.md`, `docs/STATUS.md` et, si durable, `docs/TODOS.md`.

## Ordre d’exécution

| Lot | Surface | Validation agent | Preuve |
|-----|---------|------------------|--------|
| A | Stack Docker | Conteneurs `jobbingtrack-*` healthy | `docker ps`, health HTTP |
| B | API Gateway / services | Health gateway + endpoints services critiques | `curl` local, metrics-aggregator |
| C | Backend métier | Jest ciblés services critiques | tests backend existants |
| D | Emails | SMTP notification + security alerts + MailHog + `EmailLog` | Jest + smoke email |
| E | Frontend | `tsc`, ESLint ciblé, Jest ciblé | commandes directes |
| F | Backoffice interactions | Boutons tests, rapports, Statistics, sécurité | API smoke + navigateur si disponible |
| G | Mobile | Flutter widget + ADB si appareil visible | `flutter test`, `adb devices` |
| H | Sécurité non destructive | CVE/localisation, tests sécurité applicatifs bornés | rapports `tests/results` |
| I | Documentation | `TODOS_A_VERIFIER.md`, `docs/STATUS.md`, backlog | diff + commit |

## Suites rapides actuelles

| Sujet | Commande / entrée |
|-------|-------------------|
| P1B latence | Backoffice `/b4ck0ff1ce/tests` → **Lancer suite P1B latence** |
| P1B latence direct | `frontend`: `./node_modules/.bin/jest --runTestsByPath src/lib/metrics/__tests__/serviceHealthOverview.test.ts src/components/monitoring/PriorityResponseServicesSummary.test.tsx --runInBand --silent` |
| Emails SMTP | `backend/notification-service`: Jest `tests/email-service-smtp-config.test.js` |
| Alertes sécurité | `backend/security-service`: Jest `tests/security-alert-email-payload.test.js` + `tests/service-availability-alerts.test.js` |
| Mobile smoke | `mobile`: `flutter test test/widget_test.dart` |

## Critères de fin de lot

- Les validations sûres du lot sont vertes ou les KO sont documentés.
- Un email de validation agent est envoyé si le lot touche sécurité, emails, rapports, métriques ou validation porteur.
- Le suivi est mis à jour.
- Commit + push si le porteur le demande ou si le lot modifie code/doc.
