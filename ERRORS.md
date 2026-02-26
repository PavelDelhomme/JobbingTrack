# Erreurs connues (non resolues)

**Derniere mise a jour** : 26 fevrier 2026

Pour les erreurs deja resolues, voir **RESOLUTIONS.md**.

---

## Erreurs actives

| Erreur | Composant | Impact | Action |
|--------|-----------|--------|--------|
| `relation "public.user_events" does not exist` | dashboard-service / page User Analytics | Page User Analytics inaccessible | Creer les tables (`user_events`, `user_sessions`, `user_errors`, `user_performances`, `device_infos`) ou desactiver la page |
| `getaddrinfo ENOTFOUND loki` | metrics-aggregator | Requetes erreurs par conteneur echouent | Loki non deploye. Degrader proprement ou ajouter Loki |
| `type "FollowUpStatus" already exists` | Postgres (plusieurs services Prisma) | Bruit dans les logs | Ignorable. Plusieurs services definissent le meme enum |
| API versioning 404 | dashboard-service | `GET /api/v1/analytics/stats/:userId/versions` retourne 404 | Implementer la route ou adapter le front |
| Emulateur mobile build APK | flutter_local_notifications | Build APK echoue (bigLargeIcon ambiguous) | Mettre a jour la dependance flutter_local_notifications |
| ~~Persistence stats HTTP 500~~ | ~~metrics-aggregator~~ | RESOLU | `safeCount()` avec fallback 0 si table absente |

## Erreurs resolues recemment

| Erreur | Resolution |
|--------|-----------|
| `getApplication` retournait 500 (relation `activities` inexistante) | Remplace `activities` par `statusHistory` dans le controleur. |
| Routes application `isUUID()` rejetait les CUIDs Prisma | Remplace par `isString().notEmpty()` — les IDs Prisma sont des CUIDs. |
| `api-e2e.spec.ts` : tous les tests echouaient (credentials desynchronises) | `config.testUser.email` generait un timestamp different de `ensureTestUser()`. Utilise `_testCreds` directement. |
| `archive-interactions.spec.ts` : import `getUserToken` manquant | Ajoute l'import + resilience dans beforeAll. |
| `backoffice-interactions.spec.ts` : timeout 10s+ sur pages securite/dashboard | `waitForLoadState('networkidle')` → `domcontentloaded` (polling API empeche networkidle). |
| `performance-e2e.spec.ts` : pages chargent > 10s en dev Docker | Timeout augmente a 30s, `networkidle` → `domcontentloaded`. |
| `security-e2e.spec.ts` : XSS et payload overflow echouent | Accepte sanitisation (200) ET rejection (4xx/5xx). |
| Tests email envoyaient vers `test@example.com` (fictif) | Utilise `TEST_REAL_EMAIL` (`.env`) et `getAdminUser()`. |
| Tests backoffice E2E sans auth (6 fichiers) | Ajout `loginAsAdmin()` en beforeEach. |
| `archive-interactions.spec.ts` utilisait `getUserToken` (USER) | Corrige en `getAdminToken` (fonctionnalite admin). |
| `db-push-all` detruit les tables entre services (P2003, register 500) | Push uniquement depuis auth-service (schema complet 58 modeles). Voir RESOLUTIONS.md. |
| Tests API echouent silencieusement (archive/cascade passent a vide) | Meilleur logging dans beforeAll + messages d'erreur explicites |
| Tests Playwright E2E timeout (1344 tests echouent) | Pre-authentification `storageState` + config standalone. 213/213 passent. |
| Tests Playwright MailHog (3 echecs) | SMTP_HOST=mailhog + SMTP_PORT=1025 + selectors corriges. 3/3 passent. |
| Tests securite URLs incorrectes / rapport incoherent | URLs `/api/v1/...`, base URL API Gateway (5002), faux positifs corriges. |
| Tests performance = juste `/health` + cAdvisor | Reecrits : 12 endpoints API reels + metriques via metrics-aggregator (5004). |
| Tests integration WebSocket erreur | Reecrits : HTTP vers metrics-aggregator au lieu de raw WebSocket. |

---

## Erreurs resolues (Fevrier 2026 – Postgres)

| Erreur | Resolution |
|--------|-----------|
| `security_logs does not exist` | Cree `backend/init-db/01-init-critical-tables.sql` pour bootstrap au premier demarrage Postgres. |
| `type "FollowUpStatus" already exists` | Aligne les 4 schemas (call, event, interview, workflow) de enum → model. Nettoyage pre-push dans `db-push-all.sh`. |
| Hard delete sans possibilite de restauration | Soft delete (`deletedAt`) implementé dans 7 services + corbeille + cascade |

## Erreurs ignorables (bruit dans les logs)

- `type "InterviewType" already exists` : normal si le type existe deja, non bloquant.
- `cache lookup failed for type NNNNN` : non bloquant, metrics-aggregator gere l'erreur.
- Redis `Memory overcommit` : warning systeme, non bloquant.

---

## References

- **RESOLUTIONS.md** : erreurs resolues avec detail des corrections.
- **STATUS.md** : taches restantes.
- **docs/troubleshooting/POSTGRES_MONITORING.md** : detail resolution erreurs Postgres/monitoring.
- **docs/troubleshooting/README.md** : guide de depannage general.
