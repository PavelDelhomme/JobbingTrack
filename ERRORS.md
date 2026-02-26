# Erreurs connues (non resolues)

**Derniere mise a jour** : 26 fevrier 2026

Pour les erreurs deja resolues, voir **RESOLUTIONS.md**.

---

## Erreurs actives

| Erreur | Composant | Impact | Action |
|--------|-----------|--------|--------|
| `relation "public.user_events" does not exist` | dashboard-service / page User Analytics | Page User Analytics inaccessible | Creer les tables (`user_events`, `user_sessions`, `user_errors`, `user_performances`, `device_infos`) ou desactiver la page |
| `getaddrinfo ENOTFOUND loki` | metrics-aggregator | Requetes erreurs par conteneur echouent | Loki non deploye. Degrader proprement ou ajouter Loki |
| `Service X ne supporte pas les archives` (404/500) | api-gateway / company, user, event, interview, contact, application, call, followup | Pages Archives / Corbeille non fonctionnelles | Implementer les routes archives ou documenter les limites |
| `type "FollowUpStatus" already exists` | Postgres (plusieurs services Prisma) | Bruit dans les logs | Ignorable. Plusieurs services definissent le meme enum |
| API versioning 404 | dashboard-service | `GET /api/v1/analytics/stats/:userId/versions` retourne 404 | Implementer la route ou adapter le front |
| Emulateur mobile build APK | flutter_local_notifications | Build APK echoue (bigLargeIcon ambiguous) | Mettre a jour la dependance flutter_local_notifications |
| ~~Persistence stats HTTP 500~~ | ~~metrics-aggregator~~ | RESOLU | `safeCount()` avec fallback 0 si table absente |

## Erreurs resolues recemment

| Erreur | Resolution |
|--------|-----------|
| Tests Playwright E2E timeout (1344 tests echouent) | Pre-authentification `storageState` + config standalone. 213/213 passent. |
| Tests Playwright MailHog (3 echecs) | SMTP_HOST=mailhog + SMTP_PORT=1025 + selectors corriges. 3/3 passent. |
| Tests securite URLs incorrectes / rapport incoherent | URLs `/api/v1/...`, base URL API Gateway (5002), faux positifs corriges. |
| Tests performance = juste `/health` + cAdvisor | Reecrits : 12 endpoints API reels + metriques via metrics-aggregator (5004). |
| Tests integration WebSocket erreur | Reecrits : HTTP vers metrics-aggregator au lieu de raw WebSocket. |

---

## Erreurs ignorables (bruit dans les logs)

- `type "FollowUpStatus" already exists` / `type "InterviewType" already exists` : normal, plusieurs services Prisma definissent les memes enums.
- `cache lookup failed for type NNNNN` : non bloquant, metrics-aggregator gere l'erreur.
- Redis `Memory overcommit` : warning systeme, non bloquant.

---

## References

- **RESOLUTIONS.md** : erreurs resolues avec detail des corrections.
- **STATUS.md** : taches restantes.
- **docs/troubleshooting/POSTGRES_MONITORING.md** : detail resolution erreurs Postgres/monitoring.
- **docs/troubleshooting/README.md** : guide de depannage general.
