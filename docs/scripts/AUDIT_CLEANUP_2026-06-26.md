# Audit nettoyage scripts / Make / tests — 26 juin 2026

Rapport agent pour le chantier hygiène dépôt (phase D clôturée en pilotage, suite sur `feat/bl26-backlog-porteur-26juin`).

## Synthèse exécutive

| Zone | État | Action immédiate |
|------|------|------------------|
| `scripts/` | 251 fichiers (.sh 125, .js 95, .cjs 28, .mjs 3) | Corriger Make, garder wrappers mobile documentés |
| `tests/results/` | ~184 Mo, ~3027 fichiers, **2579 versionnés git** | `.gitignore` + `prune-test-results.sh` |
| Makefile racine | 3 chemins benchmark **cassés** | **Corrigé** → `scripts/performance/` |
| `makefiles/tests` | `verify-user-journey.sh` chemin faux | **Corrigé** → `scripts/testing/` |
| Seed API mobile | Rafale ~150 DELETE en 2 s → logs gateway + risque WAF | **Corrigé** throttle 350 ms + flags CLI |
| `tools/` | 23 fichiers (adb-lib, emulator) | **Ajout** `tools/api/throttle.js` réutilisable |
| `makefiles/database/Makefile.new` | Orphelin, 4 scripts absents | **À supprimer** (non inclus par Make racine) |

---

## 1. Inventaire scripts

### 1.1 Répartition `scripts/`

```
mobile/       95   ← smokes ADB/API, setup device, lib/
ops/          24   ← logs, inventaire, bootstrap
security/     18   ← scans, CVE, JWT
legacy/       16   ← correctifs datés (ne pas réutiliser)
db/           16   ← db-push-all, seed, backup
testing/      15   ← Playwright wrappers, verify-journey
monitoring/   14   ← legacy + actifs Make
env/          11   ← env-get-key, load-root-env
utils/        10
performance/   9   ← benchmarks backoffice
reports/       8   ← + prune-test-results.sh (nouveau)
```

### 1.2 Wrappers mobile racine (7 paires — **intentionnels**)

Documentés dans `scripts/mobile/README.md`. Ne pas supprimer tant que docs/pilotage pointent vers :

- `scripts/mobile/clear-smoke-device-adb.js` → `setup/clear-smoke-device-adb.js`
- `scripts/mobile/ensure-test-accounts-ready.js` → `setup/ensure-test-accounts-ready.js`
- `scripts/mobile/prepare-smoke-device-adb.js` → `setup/prepare-smoke-device-adb.js`
- `scripts/mobile/sync-test-env.js` → `setup/sync-test-env.js`
- `scripts/mobile/smoke-preflight.js` → `smoke/run/smoke-preflight.js`
- `scripts/mobile/smoke-run-mobile-fast.js` → `smoke/run/smoke-run-mobile-fast.js`
- `scripts/mobile/smoke-run-mobile-validation.js` → `smoke/run/smoke-run-mobile-validation.js`

**Recommandation phase 2 :** migrer toutes les refs vers chemins canoniques, puis retirer les wrappers.

### 1.3 Doublons / confusion (pas fusion automatique)

| A | B | Note |
|---|---|------|
| `scripts/performance/test-performance.js` | `tests/performance/test-performance.js` | Rôles différents |
| `scripts/testing/run-complete-tests.sh` | `scripts/run-all-tests-with-reports.sh` | Ancien → legacy |
| `scripts/db/create-all-tables.sh` | `make db-push-all` | Legacy dangereux |
| `frontend/scripts/compare-all-performance.sh` | `scripts/performance/compare-all-backoffice.sh` | Domaines différents |

### 1.4 Scripts legacy encore dans dossiers actifs

À déplacer vers `scripts/legacy/` :

- `scripts/db/create-all-tables.sh`, `fix-all-tables.sh`, `init-all-tables.sh`
- `scripts/monitoring/start-metrics.sh`, `restart-metrics.sh`, `test-metrics.sh`, `clean-monitoring.sh`
- `scripts/testing/run-complete-tests.sh`, `start-tests.sh` (hardcodé `/home/pactivisme/...`)
- `scripts/utils/translate-french-to-english.sh` (sed massif dangereux)

---

## 2. Makefile — corrections appliquées

| Cible | Avant (cassé) | Après |
|-------|---------------|-------|
| `benchmark-backoffice-before/after` | `./scripts/benchmark-all-backoffice.sh` | `./scripts/performance/benchmark-all-backoffice.sh` |
| `benchmark-backoffice-compare` | `./scripts/compare-all-backoffice.sh` | `./scripts/performance/compare-all-backoffice.sh` |
| `tests` user-journey | `scripts/verify-user-journey.sh` | `scripts/testing/verify-user-journey.sh` |

### Cibles Make **à garder** (CI / prod / mobile)

- `scripts/ci/prepare-playwright-e2e-stack.sh`
- `scripts/db/db-push-all.sh`, `seed.sh`, `backup.sh`
- `scripts/mobile/smoke/adb/*`, `smoke/api/*`, `smoke/run/*`
- `scripts/mobile/setup/*` (APK, device, comptes test)
- `backend/scripts/database/clear-isTestData.js` (via `make datas-remove-tests-tags`)
- `tools/adb-lib/**`

### Cibles Make **candidats retrait** (documentation seulement)

- `tests-interface-web` → `scripts/testing/start-tests.sh` (chemins hardcodés, compose obsolète)
- `makefiles/database/Makefile.new` → jamais inclus ; références scripts inexistants

---

## 3. `tests/results/` — nettoyage disque

### Problème

~184 Mo de rapports JSON/HTML de campagnes `YYYYMMDD-HHMMSS`, largement **commités** alors que ce sont des artefacts générés.

### Actions livrées

1. **`.gitignore`** : `tests/results/20*/`, `*.log`, `security-report*.json` (garde `README.md`)
2. **Script** : `scripts/reports/prune-test-results.sh`
   - Dry-run par défaut
   - `--apply --keep-days 14` supprime les dossiers datés > 14 j
   - `--compress-keep N` archive en `.tar.zst` (zstd max)

### One-shot git (porteur / maintainer)

Les fichiers déjà trackés restent dans l’historique tant qu’on ne fait pas :

```bash
git rm -r --cached tests/results/20* 2>/dev/null || true
git rm --cached tests/results/*.log tests/results/security-report*.json 2>/dev/null || true
```

Puis commit « chore: stop tracking generated test results ».

---

## 4. `tools/` — réutilisation

| Module | Rôle |
|--------|------|
| `tools/adb-lib/` | Client ADB smokes mobile (**must-keep**) |
| `tools/emulator-controller/` | Contrôle émulateur (**must-keep**) |
| `tools/api/throttle.js` | **Nouveau** — limitation débit scripts API |

Usage throttle :

```javascript
const { createApiThrottle } = require('../../tools/api/throttle');
const throttle = createApiThrottle(350);
await throttle.waitTurn();
// puis fetch...
```

Variable d’environnement : `SEED_API_DELAY_MS` ou `API_THROTTLE_MS`.

---

## 5. Performances backoffice — HTTP 404 sur `/api/mon/*`

Symptome : pages `/backoffice/performances/*` affichent « Impossible de charger les conteneurs (HTTP 404) », CPU/memoire vides.

Cause : le client navigateur appelle `/api/mon/docker/services/all` (alias anti-adblock). Le rewrite `next.config.js` seul ne routait pas vers le handler App Router — **404 HTML** alors que `/api/metrics-aggregator/...` repond 200.

Correctif : route explicite `frontend/src/app/api/mon/[...path]/route.ts` + proxy partage `frontend/src/lib/api/metricsAggregatorProxy.ts` ; blocs nginx `production/nginx/dev-https/default.conf` pour `/api/mon/` et `/api/persist/` sur **:5443**.

Validation apres rebuild frontend :

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5003/api/mon/docker/services/all?light=1
curl -s -o /dev/null -w "%{http_code}" https://jobbingtrack.localhost:5443/api/mon/docker/services/all?light=1
```

Attendu : `200`.

### 5.1 Lenteur `docker/services/all` (~2,4 s)

- **Cause** : cold path Docker (`docker stats` + inspect) + cache serveur 60 s.
- **Correctifs** : query `?light=1` (stats JobbingTrack only, **sans docker inspect groupé** — sondes HTTP **conservées** pour temps de réponse) ; cache client partagé `containersListClientCache.ts` (60 s) ; prefetch dans `PerformancesSubNav.tsx` ; bypass cache `?refresh=1` sur soft refresh (~45 s).
- **Fichiers** : `docker.routes.js`, `docker.service.js`, `analytics.service.ts`, `usePerformancesContainersList.ts`.

### 5.2 Cartes « CPU / Mémoire live » incohérentes avec le graphe

- **Symptôme porteur** : cartes figées ~**2,0 % CPU** / **19,1 % RAM** (moyenne Docker 23 conteneurs) alors que le graphe système affichait ~**24 % / 55 %**.
- **Cause** : cartes calculées sur `computeLiveContainerSummary(containers)`, pas sur `system_metrics`.
- **Correctif** : `resolvePerformancesLiveCards()` dans `liveContainerStats.ts` — priorité dernier point historique système (même source que les graphiques), repli Docker explicite ; libellés **CPU système live** / **Mémoire système live** + horodatage.
- **Tests** : Jest `liveContainerStats` **5/5**.

Voir aussi : `docs/project/ALLINONE_AND_LOT_P.md` (contrat API partagé avec le futur socle AllInOne / Lot P).

---

## 6. Logs gateway DELETE — explication (pas une panne securite)

Les lignes `info: DELETE /api/v1/applications/...` vues le **26/06 ~10:57** proviennent du script **`seed-realistic-user-data-api.js`** en phase **nettoyage smoke**.

- Logs **info** du proxy gateway (acces HTTP normal), pas des erreurs applicatives.
- Le seul **warn 400** etait un statut candidature invalide — **corrige**.
- Rafale ~150 DELETE en ~2 s : risque saturation logs / rate-limit WAF.

**Correctif livre :** throttle + flags CLI (voir section 4).

---

## 7. Taxonomie cible `scripts/` (fin phase D)

```
scripts/
├── ci/ db/ env/ security/ setup/     # transverse
├── mobile/{lib,setup,smoke/{adb,api,run},email,test}
├── testing/ performance/ reports/ ops/ monitoring/
├── legacy/                          # tout one-shot daté
└── run-all-tests-with-reports.sh    # seul orchestrateur racine
```

Voir aussi : `docs/development/REPO_ORGANIZATION.md`, `scripts/README.md`, `docs/scripts/SCRIPTS_INVENTORY.md`.

---

## 8. Plan de migration (priorités)

| P | Action | Risque |
|---|--------|--------|
| P0 | Throttle seed + flags CLI | **Fait** |
| P0 | Fix chemins Make benchmark + verify-journey | **Fait** |
| P0 | `.gitignore` + prune-test-results | **Fait** |
| P1 | `git rm --cached tests/results/20*` | **Fait** (`94ffbbc1`) |
| P1 | Supprimer `makefiles/database/Makefile.new` | **Fait** |
| P2 | Déplacer legacy db/monitoring → `scripts/legacy/` | Faible |
| P2 | Retirer wrappers mobile racine après migration docs | Moyen |
| P3 | Fusionner `scripts/database/` (CI seed) dans `scripts/db/seed/` | Faible |

---

## 9. Fichiers modifiés dans ce lot (26/06)

### Hygiène scripts / Make

- `Makefile` — chemins benchmark
- `makefiles/tests/Makefile` — verify-user-journey
- `makefiles/database/Makefile` — `datas-remove-tests-tags` sans `source .env`
- `makefiles/database/Makefile.new` — **supprimé**
- `.gitignore` — tests/results
- `.env.example` — `SEED_API_DELAY_MS`, `API_THROTTLE_MS`
- `scripts/reports/prune-test-results.sh` — nouveau
- `tools/api/throttle.js` — nouveau
- `scripts/mobile/setup/seed-realistic-user-data-api.js` — throttle + CLI
- `docs/development/BRANCHES.md` — Conventional Branch

### Performances backoffice

- `frontend/src/app/api/mon/[...path]/route.ts` — proxy anti-adblock
- `frontend/src/lib/api/metricsAggregatorProxy.ts` — proxy partagé
- `frontend/src/app/api/metrics-aggregator/[...path]/route.ts` — refactor proxy
- `frontend/src/lib/api/analytics.service.ts` — `light=1`, `refresh=1`, fetch système
- `frontend/src/lib/metrics/liveContainerStats.ts` — cartes live système
- `frontend/src/lib/metrics/usePerformancesContainersList.ts` — refresh aligné auto-refresh
- `frontend/src/lib/metrics/containersListClientCache.ts` — cache client 60 s
- `frontend/src/app/(admin)/backoffice/performances/cpu-memory/page.tsx` — cartes + refresh
- `frontend/src/app/(admin)/backoffice/performances/PerformancesSubNav.tsx` — prefetch
- `backend/metrics-aggregator-service/src/routes/docker.routes.js` — `light`, `refresh`
- `backend/metrics-aggregator-service/src/services/docker.service.js` — stats JobbingTrack only
- `production/nginx/dev-https/default.conf` — routes `/api/mon`, `/api/persist`

### Mobile BL-26 (étape 2)

- FAB accueil candidature/contact, sheets entretien/contact, picker candidature
- Détail appel refondu, analytics consent ON par défaut, bannière debug masquée
- Voir commits et `docs/pilotage/TODOS_A_VERIFIER.md` § Phase A

### Mobile toolchain — dette post-étape 2 (**BL-26-09**)

| Sujet | Statut 30/06 | Action future |
|-------|----------------|---------------|
| Gradle wrapper **8.13 → 8.14** | Corrigé (warning Flutter supprimé) | Vérifier compat AGP à chaque upgrade Flutter |
| **Built-in Kotlin** (app + plugins KGP) | Warning build — non bloquant | Migrer app + suivre upgrades `device_info_plus`, `flutter_contacts`, etc. |
| **`flutter pub outdated`** (33 packages) | Info seulement | Revue contraintes `pubspec.yaml` + `STATS.md` §2.4 |

Make réinstall APK : `make reinstall-apk` (build+install), `make reinstall-app` (+ lance app), `make mobile-apk-install-only` (install seule, `SKIP_BUILD=1`). « Performing Streamed Install » = normal USB (~10–60 s) ; `--fastdeploy` si app déjà installée.

### Documentation

- `docs/scripts/AUDIT_CLEANUP_2026-06-26.md` — ce rapport
- `docs/project/ALLINONE_AND_LOT_P.md` — relation AllInOne / Lot P / contrat API
- `docs/pilotage/TODOS_A_VERIFIER.md` — preuves agent

---

*Branche : `feat/bl26-backlog-porteur-26juin`. Validation porteur requise sur cartes live CPU/RAM et ressenti navigation Performances.*
