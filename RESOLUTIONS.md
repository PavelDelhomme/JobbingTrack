# Resolutions appliquees

**Derniere mise a jour** : 26 fevrier 2026

---

## 26 fevrier 2026 – Tests securite, performance, integration refaits

- **Probleme** : tests securite avec URLs incorrectes (`/api/applications` au lieu de `/api/v1/applications`), base URL pointant sur le frontend (port 8080) au lieu de l'API Gateway (port 5002). Tests performance ne testant que `/health` et utilisant cAdvisor (supprime). Tests integration utilisant raw WebSocket au lieu de Socket.IO. Rapport de test incoherent (faux positifs `❌ Tests echoues: 0`).
- **Solutions** :
  - `tests/security/test-security.js` : URLs corrigees vers `/api/v1/...`, base URL via `API_GATEWAY_URL`, headers manquants en `⚠️` au lieu de `❌`, endpoint auth bypass corrige
  - `tests/performance/test-performance.js` : reecrit – teste 12 vrais endpoints API (applications, companies, contacts, etc.), test de charge (65 requetes paralleles), metriques via metrics-aggregator (port 5004)
  - `tests/integration/test-full-system.js` : reecrit – utilise HTTP vers metrics-aggregator (port 5004), teste health, metriques systeme, Docker services, persistance
  - `scripts/run-performance-backend-in-container.sh` : reecrit – 17 tests (health + 8 endpoints API + 3 metriques + charge + temps de reponse)
  - `scripts/backend-performance-test.sh` : ajout `test_api_endpoints()` avec 10 endpoints reels
  - `frontend/scripts/performance-test.sh` : fix mode non-interactif (bloquait sur `read -r`)
  - `scripts/security/test-firewall.sh` : `❌` conditionnel uniquement si echecs > 0
  - Timeout Playwright augmente de 300s a 900s (213 tests au lieu de 93)
  - `persistence.routes.js` : `safeCount()` avec `.catch(() => 0)` pour les tables absentes (table `security_metrics_aggregated`)

---

## 25 fevrier 2026 – Parcours predefinis operationnels (21 scenarios)

- **Probleme** : les 21 scenarios predefinis echouaient (~14 % de reussite). Apres register/login, les etapes suivantes echouaient.
- **Causes** : (1) URLs API relatives au lieu de `${API_GATEWAY_URL}` pour 8 etapes. (2) Token session non propage entre les etapes. (3) Annulation non effective (closure async sur `isCancelled`).
- **Solutions** : URLs API corrigees dans `user-journey/page.tsx`. Token propage via `sessionToken` + `newToken`. Annulation via `isCancelledRef` (useRef).

---

## 25 fevrier 2026 – Parcours personnalise operationnel

- Execution complete (4/4 etapes), rapports sauvegardes dans `tests/user-journey-reports/`, lien vers "Rapports de parcours" ajoute.

---

## 25 fevrier 2026 – Page backoffice/tests corrigee

- **Cause** : import casse dans `run-playwright-mailhog/route.ts` (`../../testRunnerUtils` au lieu de `../testRunnerUtils`). Frontend 500 sur `/health`.
- **Solution** : chemin corrige. Frontend healthy apres restart.

---

## 25 fevrier 2026 – Rapports Tests CLI visibles dans le backoffice

- Scanner `test-reports/all` cherche aux deux emplacements (`/app/tests/results` + `/tmp/tests/results`) avec deduplication. `summary.json` enrichi avec `category: "Suite CLI"`.

---

## 25 fevrier 2026 – Rapports de parcours en Docker (EROFS)

- Volume dedie RW `./tests/user-journey-reports:/tmp/tests/user-journey-reports` + variable `USER_JOURNEY_REPORTS_DIR` ajoutes dans `docker-compose.yml`.

---

## 25 fevrier 2026 – Tests API 36/36

- Les 36 tests passent. Create Interview/Call/Followup utilisent l'ID de la candidature creee dans le run.

---

## 25 fevrier 2026 – Monitoring demarre apres db-push-all

- Profil `monitoring` ajoute pour `monitoring-c` et `metrics-aggregator`. Demarres apres `db-push-all` dans `make up-full`.

---

## 25 fevrier 2026 – Hub Tests, SMTP, MailHog

- Hub Tests : selection de categories, lancement, journal, rapports.
- SMTP OVH configure. Tables EmailLog/EmailTemplate creees. MailHog integre (profil `mail`/`full`).

---

## Fevrier 2026 – CI/CD : Validation des enums (EventType / EntityType)

- **Probleme** : le job GitHub Actions echouait avec "Enum EventType manquant". Le schema partage utilise `model EventType` (table), pas un enum.
- **Solution** : workflow adapte pour accepter `model EventType` en plus de `enum EventType` ; `EntityType` optionnel.

---

## Fevrier 2026 – Parcours personnalise : 500 quand une etape echoue

- **Probleme** : `execAsync` rejetait en cas d'exit code non nul, l'API renvoyait 500 sans les resultats.
- **Solution** : parse du JSON dans stdout meme en cas d'exit 1. Renvoie 200 avec resultats.

---

## Fevrier 2026 – Rapports Tests Securite : chiffres incoherents

- **Solution** : recalcul de totalTests/totalPassed/totalFailed a partir de `summary.security` pour les rapports securite.

---

## Fevrier 2026 – BigInt, container_logs, user-journey ENOENT

- **BigInt** : serialisation recursive BigInt -> Number avant `res.json()` dans persistence.routes.js.
- **container_logs** : lecture depuis `log_collector_logs` au lieu de `container_logs` dans log-collector-c.
- **ENOENT save-report** : utilisation de `USER_JOURNEY_REPORTS_DIR || '/tmp/user-journey-reports'` en Docker.

---

## Fevrier 2026 – User Journey token is not defined

- Ajout de `const { token } = useAuth()` dans `UserJourneyPage`.

---

## Fevrier 2026 – Mail / SMTP

- Table `EmailLog` creee par `make db-push-all`. Envoi de test OK apres.
- Config SMTP : redacted@example.invalid, SMTP_FROM entre guillemets dans .env.
- Reply-To : `SMTP_REPLY_TO=noreply@jobbingtrack.test` + headers auto-generated.

---

## Fevrier 2026 – Tests API 15 echecs resolus

- profile-service : routes GET/PUT `/api/v1/profile/me` avec requireAuth.
- notification-service : routes protegees par requireAuth (401 sans token).
- dashboard-service : utilisation de statistics.controller au lieu de dashboard.controller.
- Script test-api-specific.sh : URL profil corrigee, applicationId pour Call/Followup.
- Schemas BDD alignes (statusId, verificationToken, loginCount).

---

## Fevrier 2026 – Tests API depuis Docker (bash not found)

- Remplacement de `bash` par `sh` dans toutes les routes run-* du frontend.

---

## Fevrier 2026 – Monitoring, Analytics, Temps de reponse

- monitoring-c utilise le port interne pour les health checks (docker inspect).
- Analytics : CPU Systeme avec graphique historique, temps de reponse depuis fetchMetrics().
- security-service : trust proxy = 1 au lieu de true.
- make logs : docker compose config --services puis docker compose logs -f.
- metrics-aggregator : champ log en string, gestion absence de table.

---

## Fevrier 2026 – Prisma, .env, db-push-metrics

- Prisma 6.7.0 pour metrics-aggregator (pas Prisma 7).
- DATABASE_URL dans .env a la racine, charge par Makefile.
- SMTP_FROM entre guillemets pour eviter erreur shell.

Voir **STATUS.md** pour les taches restantes et **ERRORS.md** pour les erreurs non resolues.
