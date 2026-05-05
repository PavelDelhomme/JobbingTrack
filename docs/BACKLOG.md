# Backlog technique – JobbingTrack

Ensemble des tâches techniques organisées par priorité. Le `STATUS.md` à la racine contient l'état courant ; ce fichier contient le backlog complet.

**Chantier structuré** (lot **A** : monitoring + logs ; lot **B** : sécurité ; intérim ; doc) : pour ne pas dupliquer la granularité, suivre **`PLAN.md`** (lots A–F) et **`TODOS.md`** à la racine du dépôt. Le présent fichier reste la réserve pour les sujets « plus tard », la dette large et les idées non planifiées sur le calendrier court.

**Méta (07/04/2026)** : refonte globale des **`.md` racine** + **`docs/**/*.md`**, revue **BDD** avant campagne de tests, et interprétation des **logs gateway sécurité** — voir la **dernière section** de **`TODOS.md`** (priorité porteur / historique) et **`STATUS.md`** § journalisation gateway.

---

## Terminé récemment

- [x] **Forensics `api-gateway` (06/2026)** : corrélation **ALS**, logs structurés + **centralLogger**, **`TRUST_PROXY_HOPS`**, Jest **22/22** — **`STATUS.md`**, **`TODOS.md`**, **`PLAN.md`** A3/B6.
- [x] **Backoffice + BDD (05/2026)** : colonne **`Company.isTestData`** alignée schéma maître auth + fix SQL `db-push-all` ; gateway **`/api/v1/services`** tolère metrics-aggregator indisponible (réponse fallback, pas 503) — voir **`STATUS.md`**, **`ERRORS.md`**, **`TODOS.md`**.
- [x] **Fix runtime Next bloqué** : `next.config.js` passe sur un `distDir` utilisateur (`.next-local`) pour contourner les permissions root sur `frontend/.next` et les bundles `layout.js` invalides (29/04).
- [x] **Fix `getApplication` 500** : relation `activities` (inexistante) → `statusHistory`. (26/02)
- [x] **Fix routes `isUUID` → `isString`** : IDs Prisma sont des CUIDs, pas UUIDs. (26/02)
- [x] **Fix `api-e2e.spec.ts`** : credentials desynchronises → `_testCreds` direct. (26/02)
- [x] **Fix 5 fichiers E2E** : imports, networkidle → domcontentloaded, resilience. (26/02)
- [x] **4 nouvelles suites de test** : email-workflows, admin-data-crud, admin-users-crud, admin-security-complete. (26/02)
- [x] **Email de test réel** : `test@delhomme.ovh` (via env var `TEST_REAL_EMAIL`).
- [x] **Tests backoffice E2E autonomes** : `loginAsAdmin()` dans 6 fichiers.
- [x] **Rapports avec type d'utilisateur** : badge ADMIN/USER/SYSTEM.
- [x] **Tests Playwright E2E** : pré-authentification `storageState`.
- [x] **Tests MailHog** : SMTP_HOST/PORT configurés, 3/3 passent.
- [x] **Corbeille (soft delete)** : 7 services, cascade logique.
- [x] **Cascade archivage + statuts** : auto-events, archiveRelatedElements.
- [x] **Architecture tests USER/ADMIN** : séparation complète.

## ~~Priorité haute – Phase 2 : Archivage complet~~ FAIT

- [x] Ajouter `isArchived` + `archivedAt` aux schémas : Interview, Call, FollowUp, Event, Company.
- [x] Endpoints archive/unarchive pour chaque service.
- [x] Cascade archivage/désarchivage complète.
- [x] Filtrage `isArchived: false` dans les requêtes normales.
- [x] Endpoint unifié archives fonctionnel.
- [ ] Suppression auto corbeille > 30 jours (cron/worker).
- [x] Tests E2E archivage.

## Priorité haute – Phase 3 : Interactions approfondies (en cours)

- [x] CRUD complet teste (tests E2E : admin-data-crud.spec.ts couvre 7 entites + archivage/restauration).
- [x] Système statuts avec cascade automatique (entretien créé → candidature INTERVIEW_PENDING).
- [x] Auto-création événements calendrier (entretien, relance, appel créés → événement auto).
- [ ] Notifications automatiques (sans réponse > 7j, entretien < 24h, relance en retard).
- [ ] Export/import données (CSV, JSON) avec interface backoffice.
- [x] Vérification email utilisateur : tests E2E workflow inscription + reset password via MailHog.
- [ ] Pagination et tri cohérents sur toutes les listes.
- [x] Tests E2E interactions approfondies (archivage, cascade, BDD relations, sécurité backoffice).
- [x] Architecture tests USER/ADMIN et rapports avec badge type utilisateur.
- [x] Email de test réel (`test@delhomme.ovh`) pour vérification réception.
- [x] Tests sécurité backoffice complets (firewall CRUD, WAF, menaces, IPs bloquées, logs).

## Priorité moyenne – API et fonctionnalités

- [ ] **Stabilisation post-run `make tests` 05/05/2026 (`tests/results/20260505-113157`)** : corriger `application-service` (Prisma `application.create/findFirst`), adapter tests gateway Jest (CORS/logs auth), mettre à jour `tab-components.test.tsx` (analytics hub), stabiliser Playwright `login.spec.ts` et `suivi-interim.spec.ts`.
- [ ] **Backoffice – Email Monitor** : vérifier que tous les emails envoyés (vérification, reset password, etc.) s'affichent correctement dans la page email-monitor ; tester complètement la partie email-monitor (filtres par type, liste, rafraîchissement).
- [ ] **API versioning** : corriger 404 sur `GET /api/v1/analytics/stats/:userId/versions`.
- [ ] **Documentation API** : Swagger/OpenAPI.
- [ ] **Rapports par catégorie** : organiser `tests/results/` en sous-dossiers.
- [ ] **Lancement tests depuis hub** : clic + vérification résultat.
- [ ] **Backoffice – règles d'envoi email par action** : configurer dynamiquement quels emails envoyer pour quelle action (inscription, entretien créé, relance, etc.) — voir `docs/emails/MAIL.md` § Récap.

## Priorité basse – Mobile et émulateur

- [ ] **App mobile Flutter** : auth, dashboard, CRUD, calendrier, notifications, sync offline.
- [ ] **Émulateur mobile – Build APK** : corriger `flutter_local_notifications`.
- [ ] **Logs Android (logcat)** : streamer dans l'UI.
- [ ] **Playwright mobile dans `make tests`** : séparer une cible smoke (rapide, stable) de la campagne longue (actuellement timeout 600s / exit 124 dans l’agrégat).

## Priorité moyenne – CI/CD et déploiement

- [ ] **CI/CD** : pipeline GitHub Actions pour microservices (build + test).
- [ ] **CI/CD** : exécution suite de tests complète dans pipeline.
- [ ] **CI/CD** : déploiement automatisé après tests passés.
- [ ] **Déploiement** : voir `docs/deployment/DEPLOIEMENT_FINAL.md`.

## Priorité basse – Infra hôte (Docker / noyau)

- [ ] **Redis — `vm.overcommit_memory`** : sur la machine hôte, activer **`vm.overcommit_memory=1`** (sysctl + persistance) pour supprimer l’avertissement *Memory overcommit must be enabled* et limiter les risques BGSAVE / réplication — **`TODOS.md`** **HX5**, fin **`PLAN.md`**.

## Priorité basse – Sécurité

- [x] **Tests sécurité E2E** : firewall CRUD, WAF config/toggle, menaces réseau, IPs bloquées, logs sécurité.
- [ ] **WAF** : remplacer la config mock par une vraie en production.
- [x] **Tests sécurité API** : XSS, SQLi, CSRF, payload overflow (tests/security, security-e2e.spec.ts).
- [ ] **Alertes email sur incidents critiques** (sécurité très grave, firewall, **down** service / sous-système) — cadrage **`TODOS.md` B11** + **`PREPROD_PRODUCTION_CHECKLIST.md`** § SMTP.
- [ ] **Analyse sécurité quasi temps réel** à faible coût CPU/RAM — **`TODOS.md` B12** (cadence, limites mémoire, pas de polling lourd).
- [ ] **Forensics logs (investigation)** : imposer un contrat minimal de journalisation sur les services (au moins `requestId`/`correlationId`, `clientIp`, endpoint, méthode, statut HTTP, port/proto quand pertinent) pour que la corrélation backoffice (perf ↔ sécurité ↔ logs) ne dépende pas d’heuristiques.
- [ ] **Forensics logs — déploiement progressif** : lot **05–06/2026** : microservices listés précédemment + **`api-gateway`** + **`workflow-service`** (**ALS** / contexte, Winston, **`centralLogger`**, **`TRUST_PROXY_HOPS`**) ; **reste** : QA porteur `/backoffice/performances/correlation`.
- [ ] **Corrélation fine incidents (A3/B8)** : combler les colonnes encore vides en pratique (`requestId`, endpoint, IP, proto/port, HTTP, CPU/Mémoire/TR proches, écart sec) avec contrat de logs homogène + règles d’alignement plus strictes.

## Références

- `STATUS.md` : état courant du projet.
- `PLAN.md` : plan d’exécution lots A–F (backoffice, API, doc).
- `TODOS.md` : cases à cocher alignées sur le plan.
- `FONCTIONNALITES.md` : fonctionnalités complètes et roadmap.
- `RESOLUTIONS.md` : erreurs résolues avec détail.
- `ERRORS.md` : erreurs connues.
