# TODOs à tester (résultats de tests)

> Ancien nom : `TODOS_A_VERIFIER.md` (stub de redirection).  
> **Rôle** : pour chaque item de [`TODOS.md`](TODOS.md) en cours, noter les **tests** faits, le résultat, et la suite.

## Process

1. Item ouvert dans `TODOS.md` → tests ici.  
2. **OK concluant** → archiver dans [`TODOS_DONE.md`](TODOS_DONE.md) + retirer de ce fichier + cocher/avancer dans `TODOS.md`.  
3. **KO** → remettre / créer l’action corrective dans `TODOS.md` (prochaines actions).

---

## En cours — Phase B / B2

### Session tests agent — 19/08/2026

| Zone | Commande / check | Résultat | Suite |
|------|------------------|----------|-------|
| Frontend | `npm run type-check` | **OK** | |
| Frontend | Jest `src/lib/pilotage` | **OK 21/21** | |
| Frontend | `BackofficeLink.test` | **OK 2/2** | |
| Stack | Gateway `/health` HTTPS :5443 | **OK 200** ~13 ms | |
| Stack | `/login` | **OK 200** (~12 s 1er hit dev) | |
| Stack | `/api/v1/crashes?summary=1` | **OK** ~3 Ko | PILOTAGE-PERF |
| Mobile | `flutter test` | **52 OK / 5 KO** | KO = OTA URL + widget_test (préexistants, hors gate HUB) |
| Mobile | `flutter analyze lib/screens/jobbing` | **92 infos/warn** | pas bloquant |
| Device | ADB Samsung | **Aucun appareil** | brancher USB pour validation porteur |
| Porteur | MOB-HUB checklist Kanban | **0/6 — reporté** | reprise après DEPLOY-C1 |

---

## En cours — Phase C — Déploiement (19–28/08)

### DEPLOY-GHA-01 — chaîne GH Actions + Portainer + jobbingtrack.com

| Livrable / check | Fichier / commande | Résultat |
|------------------|--------------------|----------|
| Guide principal | `DEPLOY.md` (état + checklist §19) | **Maj 28/08** |
| Checklist ops A→J | `docs/pilotage/TODOS.md` ▶ En cours | **Maj 28/08** |
| MailHog local | port UI **8125** | **OK** |
| DNS zone complète | `dig` → `95.111.227.204` | **OK 24/08** |
| Local HTTPS proxy | `dev-https-proxy` `:5443` | **OK agent 28/08** — login 200 |
| Local metrics-aggregator | était **Created** → `docker start` | **OK healthy 28/08** |
| `.env` Portainer générés | `deploy/production/.env.*.generated` | **Présents** — re-vérifier |
| Porteur D = stack préprod | Portainer `jobbingtrack-preprod` | **OK 28/08** — Id 32, NPM only |
| Porteur E = NPM | 2 hosts + LE | **OK 28/08** |
| Porteur F = smoke | HTTPS health + /login | **OK 28/08** |
| CI GHCR Buildx | `.github/workflows/build-push-images.yml` | **OK** (cache GHA) |
| CI channel=prod | `workflow_dispatch` → tags `:latest` | **OK 28/08** |
| STACK_REPO_PATH | `sync-vps-stack-files.sh` + mounts config | **OK 28/08** (Portainer CE) |
| Stack prod Portainer | `jobbingtrack-prod` Id 33 | **OK 28/08** — healthy, 0 ports |
| NPM prod | apex+www + api + LE | **OK 28/08** — hosts 21/22 |
| Smoke prod | `jobbingtrack.com` + `api.`/health | **OK 200** |
| Porteur login admin préprod/prod | navigateur | **OK agent 28/08** (tablette API fix) |
| Porteur J OTA | Nothing + Samsung | **APKs posés 29/08** — détection MAJ à tester porteur |

### Smoke agent — 28/08/2026 (17h) — login tablette + schéma BDD

| Check | Résultat | Notes |
|-------|----------|-------|
| Cause login tablette | **Corrigé** | `getApiUrl` prenait `port===443` → `api.jobbingtrack.localhost:5443` |
| Login navigateur préprod → `/backoffice` | **OK** | API = `api-preprod.jobbingtrack.com` ; dashboard menu visible |
| Panel `/backoffice/mobile/releases` | **OK** | page OTA accessible (SUPER_ADMIN) |
| Login API préprod/prod | **OK 200** | `admin@jobbingtrack.com` |
| Companies / contacts / interviews / events / followups | **OK 200** | |
| Applications préprod | **OK 200** | après SQL `isTestData` / `isArchived` |
| Prisma `companyType` + fix Application cols | **OK** | db push auth + scripts `fix-*.sql` sur préprod+prod |
| Security-service healthcheck | **OK healthy** | fichier `src/healthcheck.js` ajouté |
| Redis NOAUTH (5 min) | **OK 0** | |
| OTA latest Android | **OK 200** | v1.0.42 — **`downloadUrl: null`** (aucun APK publié dans le volume) |
| DNS `backoffice` / `backoffice-preprod` | **KO** | toujours absent OVH — utiliser `/login` sur vitrine |
| Image frontend `:dev` | **Redéployée** | préprod + prod (fix API URL) |

**Suite mobile (J)** : ✅ 3 apps installées + OTA `downloadUrl` publié (29/08) — porteur teste détection MAJ (sans obligation d’installer tout de suite).

---

### Smoke agent — 29/08/2026 — 3 apps + OTA (Nothing + Samsung)

| Check | Résultat | Notes |
|-------|----------|-------|
| Flavors Android `dev` / `preprod` / `prod` | **OK** | labels JT Dev / JT Préprod / JobbingTrack |
| Build APK `1.0.42+42` ×3 | **OK** | `install-three-channels-devices.sh` |
| Publish OTA local `channel=dev` | **OK** | `downloadUrl` relatif (résolu par l’app) |
| Publish OTA préprod `channel=dev` | **OK** | URL absolue api-preprod |
| Publish OTA prod `channel=production` | **OK** | URL absolue api.jobbingtrack.com |
| Canal local `preprod` (miroir) | **OK** | gateway local (src monté) |
| Install Nothing Phone | **OK** | 3 packages `.dev` / `.preprod` / base |
| Install Samsung SM-G990B2 | **OK** | idem |
| Install OTA in-app | **Non testé** (volontaire) | porteur : publier `>1.0.42` pour voir la popup |
| Script | `bash scripts/mobile/setup/install-three-channels-devices.sh` | |

**Mapping**

| App | Package | API | Canal OTA |
|-----|---------|-----|-----------|
| JT Dev | `…mobile.dev` | `http://192.168.1.134:5002` | `dev` |
| JT Préprod | `…mobile.preprod` | `https://api-preprod.jobbingtrack.com` | `dev` |
| JobbingTrack | `…mobile` | `https://api.jobbingtrack.com` | `production` |

### Retour porteur — 29/08 ~02h50 — prod Nothing (listes)

| Check | Résultat | Notes |
|-------|----------|-------|
| Crashes prod API | **4×** `Null check operator used on a null value` | Nothing A059, app `1.0.42+42`, user admin |
| Stack | `applications_screen.dart:189` `_loadAll` → `State.context` | après `await refreshSession` alors que l’écran n’était plus monté (nav vers `/statistics`) |
| API dans le buffer crash | **toutes 200** (applications, companies, followups, calls…) | **aucun 429** dans les `userActions` envoyés |
| 429 ressenti | possible rate-limit général (100 req/min) hors buffer | rafales multi-listes + refresh — à confirmer au prochain essai |
| Correctif | `if (!mounted) return` après le refresh dans `_loadAll` | rebuild prod + réinstall Nothing **sans lancer** l’app |

### Retour porteur — 29/08 ~03h20 — vue d’ensemble préprod 0/21

| Check | Résultat | Notes |
|-------|----------|-------|
| Préprod + prod API health | **OK 200** | stacks VPS **vivantes** (site/API OK) |
| Vue d’ensemble « 0/21 actifs » | **Bug monitoring** | `GET /api/v1/metrics` → `health.offline=19`, `containers={}` |
| Cause | DNS Docker | `getaddrinfo ENOTFOUND jobbingtrack-api-gateway` (etc.) — noms conteneurs Portainer ≠ noms attendus par metrics-aggregator |
| CPU/mémoire conteneurs JT | **0** | `system.jobbingtrack.containers.count=0` alors que CPU/RAM **hôte** VPS OK (~10–15 % / ~36 %) |
| `/api/v1/services` | **fallback** | `metricsUnavailable: true` — liste partielle, message monitoring Docker indisponible |
| Suite | **À reprendre demain** | aligner discovery Docker (noms réseau / socket) sur stacks Portainer préprod+prod — **pas un arrêt réel des services métier** |

### Session 31/08 — apex vs Nextcloud + monitoring STACK_SLUG + maintenance

| Check | Résultat | Notes |
|-------|----------|-------|
| `https://jobbingtrack.com/` (curl VPS) | **OK JobbingTrack** | title vitrine JT ; `x-served-by: jobbingtrack.com` — **pas** de redirect Nextcloud côté serveur |
| `https://preprod.jobbingtrack.com/` | **OK JobbingTrack** | même vitrine |
| Redirect ressenti → nextcloud | **Cache / ancien host NPM** probable | vider cache navigateur ; vérifier proxy host NPM apex → `jobbingtrack-prod-frontend:3000` |
| Page `/maintenance` | **Livré** | activable `NEXT_PUBLIC_SITE_MAINTENANCE=1` (stack prod Portainer) |
| Metrics STACK_SLUG | **Livré code** | sondes via nom Compose (`api-gateway`) ; clés `jobbingtrack-preprod-*` / `jobbingtrack-prod-*` |
| docker.sock metrics-aggregator | **Livré compose** | mount `:ro` + env `STACK_SLUG` — **redeploy Portainer** requis |

### Session 31/08 — entretien confirmé → agenda (lieu / bilan / invite)

| Check | Résultat | Notes |
|-------|----------|-------|
| Jest `meetingPlacePolicy` | **6/6 OK** | présentiel / tél / visio / invite / bilan / hybride |
| Frontend `npm run type-check` | **OK** | Agent email + types Calendar enrichis |
| `dart analyze` fichiers touchés | **OK** (infos only) | create sheet + detail + helpers |
| Mobile : offre agenda après create / change date | **Livré** | dialog → Google Calendar TEMPLATE |
| Agent email : format + proposant + liens | **Livré** | bouton « Je confirme → agenda » |
| Extraction invite depuis **corps mail complet** | **Partiel** | triage n’a que `snippet` aujourd’hui |

### Reste à faire (ops / porteur) — 31/08

| # | Action | État |
|---|--------|------|
| 1 | **Redeploy Portainer** préprod + prod (metrics `STACK_SLUG` + `docker.sock` + frontend maintenance) | ⏳ bloquant monitoring 0/21 |
| 2 | Vérifier vue d’ensemble préprod/prod ≠ 0/21 après redeploy | ⏳ |
| 3 | OTA : publier APK `>1.0.42` + détection MAJ Nothing/Samsung (sans forcer install) | ⏳ porteur |
| 4 | Optionnel : `NEXT_PUBLIC_SITE_MAINTENANCE=1` sur prod si coupure voulue | ⬜ |
| 5 | DNS `backoffice*` toujours KO — utiliser `/login` sur vitrine | connu |
| 6 | Merge PR OTA (#25) + PR entretien/agenda → `dev` | ✅ **PR #26 mergée** 31/08 |

### Session ops 31/08 soir — redeploy + vue d’ensemble + OTA + maintenance

| Check | Résultat | Notes |
|-------|----------|-------|
| Sync VPS `STACK_REPO_PATH` | **OK** | `origin/dev` @ merge PR #26 + fix maintenance route |
| Compose Portainer + `docker.sock` | **OK** | stacks 32/33 mis à jour |
| Metrics préprod recreate | **OK** | `STACK_SLUG=jobbingtrack-preprod` + sock |
| Metrics prod recreate | **OK** | image `:dev` forcée (évite re-pull `:latest` stale) |
| Vue d’ensemble préprod | **17/21 healthy** | plus 0/21 ; 4 offline (rs / hors stack) |
| Vue d’ensemble prod | **17/21 healthy** | idem |
| Build frontend conflict `/maintenance` | **Corrigé** | admin → `/backoffice/maintenance` |
| Maintenance prod | **ACTIVE** | `SITE_MAINTENANCE_MODE=1` ; `/` → 307 `/maintenance` ; page « On prépare… » ; API **200** |
| OTA prod `1.0.43+43` | **OK** | `channel=production` + `downloadUrl` |
| OTA préprod `1.0.43+43` | **OK** | `channel=dev` + `downloadUrl` |
| OTA flavor JT Dev (LAN) | **Non publié** | stack locale arrêtée — à faire au besoin |
| Porteur détection MAJ apps | **KO porteur 02/09** | indicateur prod insuffisant (splash only) → chantier MOB-OTA-OFFLINE-01 |

### Session 02/09 — OTA in-app + hors-ligne / resync

| Check | Résultat | Notes |
|-------|----------|-------|
| Cause OTA « invisible » | **Identifiée** | check **splash only** ; erreur silencieuse ; Paramètres affichait version **1.0.0** figée ; pas de bandeau shell |
| API prod latest `production` | **OK** | `1.0.43+43` + downloadUrl 62 Mo (avant rebuild 1.0.44) |
| Correctifs livrés (branche) | **En cours** | `MobileUpdateController` + bandeau shell + Paramètres « Vérifier MAJ » + progress download |
| Offline | **Amélioré** | `archiveApplication` en file ; bandeau sync shell ; flush drop 4xx sans bloquer ; sync manuelle Paramètres |
| Resync auto | **Déjà + renforcé** | `NetworkRecoveryService` + resume lifecycle + OTA recheck si force |
| Version cible | **1.0.44+44** | publié prod + install USB 3 phones |

### Session 02/09 soir — offline events/notifs + OTA 1.0.45

| Check | Résultat | Notes |
|-------|----------|-------|
| Install USB **1.0.44** | **OK** | Blackview + Samsung + Nothing (prod) ; préprod Samsung/Nothing |
| Offline calendrier | **Livré** | `OfflineListLoader` + clé `events` ; `getCalendarEvents` ne avale plus les erreurs |
| Offline cloche | **Livré** | cache `notifications` ; mark-read / mark-all / delete en file |
| File sync | **Étendue** | préfixes `/api/v1/events` + `/api/v1/notifications` |
| OTA **1.0.45** prod | **OK** | canal `production` |
| OTA **1.0.45** préprod | **OK** | canal `dev` sur api-preprod |
| Install USB **1.0.45** | **OK** | 3 phones prod ; Samsung+Nothing préprod |

### Session 02/09 — MOB-PERF-UX-01d (thème sombre M3 — 1.0.50)

| Check | Résultat | Notes |
|-------|----------|-------|
| Thème sombre Material 3 | **Livré** | palette slate (#0B0F14), surfaces, primary #60A5FA |
| Drawer / bottom nav / inputs | **Adapté** | plus de gris clair sur fond sombre |
| Admin hub + pilotage | **Refonte cartes** | surfaces + accent (plus blocs blancs/orange) |
| Accueil + cartes candidatures | **Adapté** | `ColorScheme` partout |
| APK Nothing 3 apps | **1.0.50+50** | install adb + OTA prod/préprod |

**À tester** : Paramètres → Apparence → Sombre ; Admin + Accueil + Candidatures.

### Session 02/09 — MOB-PERF-UX-01c (1.0.49 OTA Nothing + perf)

| Check | Résultat | Notes |
|-------|----------|-------|
| Perf splash / login / home | **Livré** | session keep+secure parallèle ; login prefs parallèle ; délai bio 400 ms retiré ; splash prod non bloqué autoDetect ; dashboard barre fine (plus de spinner plein écran) ; FU SWR |
| OTA prod `production` | **OK** | latest 1.0.49+49 + downloadUrl ; réinstall Nothing depuis artefact OTA |
| OTA préprod `dev` + `preprod` | **OK** | JT Préprod écoute `dev` ; publish dual |
| OTA local / JT Dev | **Skip** | API LAN `192.168.1.134:5002` down — APK install adb only |
| Nothing 3 apps | **1.0.49** | Dev + Préprod + Prod lancés (pid OK) |
| APK | **1.0.49+49** | |

### Session 02/09 — MOB-PERF-UX-01b (unlock ultra + liens + notifs + dashboard)

| Check | Résultat | Notes |
|-------|----------|-------|
| Unlock lent (probe health / persist / delay 350 ms) | **Corrigé** | prod : **aucun** probe avant login ; persist/analytics/push `unawaited` ; delay bio retiré ; session mémoire → Accueil immédiat |
| FAB create contact / entretien → providers | **Livré** | `upsertContact` / `addInterview` + relance déjà sync |
| Notifs `STATUS_CHANGE` cascade FU/IV | **Code serveur** | followup + interview controllers ; **redeploy** services VPS requis pour effet prod |
| Dashboard Accueil | **Polish** | offline banner, empty « À venir », tap détail, refresh, actions sans emoji |
| APK | **1.0.48+48** | install 3 phones + OTA production |

**À tester porteur (Nothing)** : kill app → ouvrir → empreinte → Accueil (ressenti &lt; ~1 s après bio) ; FAB contact/entretien depuis candidature ; cloche après changement statut (après redeploy API).

### Session 02/09 — MOB-PERF-UX-01 (login / drawer / thème / crashes)

| Check | Résultat | Notes |
|-------|----------|-------|
| Crash Logs `Null check State.context` `_loadAll` | **Corrigé** | load seulement si onglet visible + `mounted` ; lazy IndexedStack |
| Drawer Accueil → Candidatures sélectionné | **Corrigé** | plus de `setCurrentTab(1)` si invisible |
| Login / cold start lent | **Amélioré** | lazy tabs ; OTA optionnelle non bloquante ; analytics `unawaited` |
| Liste Entretiens spinner plein écran | **Corrigé** | stale-while-revalidate + debounce 20s |
| Versions Paramètres vs drawer | **Aligné** | `displayVersionLine` des deux côtés |
| Thème clair/sombre/système | **Livré** | Paramètres → Apparence |
| Perf télémétrie | **Amélioré** | flush 2 min + snapshot à `paused` ; refresh shell 30s |
| Crashes API récents | **4× même stack 29/08** | `_ApplicationsScreenState._loadAll` — fix ci-dessus |
| APK | **1.0.47+47** | build + install 3 phones |

**Reste (file)** : validation FAB D.6 porteur ; sync CRUD/notifs serveur D7 ; dashboard polish ; maintenance prod off.

### Session 02/09 — reprise B2-D.6 FAB Relance

| Check | Résultat | Notes |
|-------|----------|-------|
| Focus pilotage | **D.6** | DEPLOY-GHA-01 → À valider ; Kanban focusTaskId = D.6 |
| Sync `FollowUpProvider` à la création FAB | **Livré** | `addFollowUp` immédiat |
| Snack | **Livré** | label **Voir détail** |
| Edit relance | **Livré** | date + time picker (comme create) |
| Tiles détail candidature | **Livré** | `followUpListTitle` (date · canal) |
| Smoke ADB | **Aligné** | plus « Nouvelle relance » |
| APK cible | **1.0.46+46** | build + install 3 phones |

**À tester porteur** : candidature → FAB → Relance → Créer → snack → Voir détail ; modifier ; corbeille.

**État hors-ligne (lecture + mutations en file)** : candidatures, entreprises, contacts, entretiens, relances, appels, **événements (lecture)**, **notifications in-app (lecture + lu/suppr)**.  
**Hors scope mobile (D7 serveur)** : planification / envoi des rappels automatiques (workflow + notification-service).  
**Reste après D.6** : FAB D.7–D.9 ; MOB-HUB ; désactiver maintenance prod ; merge PR #27.

**Désactiver maintenance prod** (quand prêt) :

```bash
# Sur VPS : SITE_MAINTENANCE_MODE=0 + NEXT_PUBLIC_SITE_MAINTENANCE=0 dans /data/compose/33/stack.env
# puis recreate frontend (docker compose … up -d --force-recreate frontend)
```

---

### Smoke agent — 28/08/2026 (soir)

| Check | Résultat | Notes |
|-------|----------|-------|
| Admin prod API `POST /api/v1/auth/login` | **OK 200** | `SUPER_ADMIN` — user créé via auth-service |
| Admin préprod API login | **OK 200** | `SUPER_ADMIN` — create (pas upsert, index email absent préprod) |
| Vitrine `jobbingtrack.com` | **OK 200** | bouton admin (ancien lien `backoffice.*` avant redeploy) |
| Vitrine `www.jobbingtrack.com` | **OK 200** | |
| `/login` prod | **OK 200** | page backoffice admin |
| Login navigateur → `/backoffice` | **OK** | API 200 ; token cookie → dashboard |
| OTA prod `channel=production` | **OK 200** | v1.0.42 build 42, `downloadUrl: null` |
| OTA prod/preprod `channel=dev` | **OK 200** | |
| DNS `backoffice.jobbingtrack.com` | **KO** | pas d’enregistrement A — liens sous-domaine cassés |
| DNS `backoffice-preprod.jobbingtrack.com` | **KO** | idem |
| Fix vitrine fallback `/login` | **Poussé** `eff74956` | image `:dev` rebuild + recreate frontend VPS |
| Script `create-admin-user.sh` | **Maj** | conteneurs prod/preprod + findFirst sans index email |
| Redis gateway NOAUTH logs | **WARN** | `REDIS_URL` OK dans conteneur ; warnings résiduels rate-limit |

---

### PILOTAGE-PERF — lenteur `/backoffice/pilotage` (10/08)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Cause | Chunk webpack ~3,7 Mo + inbox `GET /crashes` ~1 Mo (stackTrace) | **Confirmé** | board API ~17 ms OK |
| Gateway `?summary=1` | Pas de stackTrace / metadata brut | **Livré** 10/08 | restart api-gateway |
| Inbox Kanban | Fetch summary + idle après paint | **Livré** | |
| Page | `dynamic(PilotageBoardView)` + files on-demand + `loading.tsx` | **Livré** | |
| Porteur | Hard refresh HTTPS :5443 — Kanban utilisable vite | **À tester** | reste cache board / chunk |

### AUDIT-QA-01 — checklist exhaustive (10/08)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Doc | `docs/pilotage/AUDIT_QA_EXHAUSTIF.md` hiérarchique | **Livré** | visible onglet Fichiers |
| Carte Kanban | `AUDIT-QA-01` colonne Plus tard | **Livré** | après gate B |
| Campagnes | DEV/PREPROD/PROD × USER/ADMIN × web/mobile/API | **À faire** | ne pas démarrer maintenant |

### PILOTAGE-UI-05 — Validation riche backoffice (22/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| `validation-board.json` | Cycles correctifs / FAB / shell + checklists | **Livré** seed 15 tâches | |
| `GET /api/pilotage/board` | `cycles`, `tasksNow/Later/Decided` | **Livré** | |
| Actions `decide/checklist/reorder/move/note` | Sync JSON + A_VALIDER + A_TESTER | **Livré** | Re-test porteur |
| UI fiche détail | Desktop panneau + mobile bottom sheet | **Livré** | |
| Partiel / Plus tard / cycle FAB | Statuts + progression `n/m OK` | **Livré** unit | |
| Jest | `validationBoard.test` + suite pilotage | **OK** 12/12 | |
| Section **Terminées** | Chrono : Récemment terminé + A_VALIDER OK/KO + TODOS_DONE ; sync OK → prepend TODOS.md | **Livré** 22/07 | Re-test porteur UI |
| WEB-LOGIN-01 porteur | Bandeau FR, pas overlay Next | **OK 22/07** | `console.warn` 401 retiré ; ligne Network 401 reste normale |
| EMU-LIVE-01 porteur | Samsung + MJPEG live | **OK 22/07** | |
| MOB-ENT-01 porteur | Liste entreprises OK ; hub détail Capgemini | **OK 29/07** | Contacts + apps/relances/entretiens/appels |
| AppSnack mobile | clear + durée forcée (relance créée/supprimée) | **Fix** APK 1.0.34 | Re-test D.6 |

### MOB-ENT-01 suite — hub fiche entreprise (22/07 → 29/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Cause | ContactCompany pointait vers anciennes Company (autre owner) après backfill apps | **Confirmé** SQL | |
| `backfill-contact-company-links.sql` | INSERT liens vers Company owned + via ContactApplication | **OK** Capgemini 2 | |
| `GET /contacts/company/:id` | OR ContactCompany + ContactApplication | **OK 29/07** TEST_USER Marie+Luc | |
| UI Flutter | Erreur API visible (plus catch silencieux) | **Fix** 29/07 APK 1.0.37 | |
| Liste entreprises | Pas de CTA « Voir candidatures & contacts » | **Fix** 29/07 | APK 1.0.39 |
| Fiche détail | Candidatures + contacts + relances + entretiens + appels | **Livré** 29/07 | Re-test Capgemini |
| Kanban sous-critères | list-no-cta + detail-followups/interviews/calls | **Livré** | |
| Porteur | Capgemini hub complet cohérent | **OK 29/07** | Contacts liés + sections liées |

### MOB-LIST-01 — cartes listes onglets (29/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Candidatures | Carte : poste + entreprise + statut | **OK porteur** (partiel) | |
| Entreprises | Nom + métadonnées (secteur/lieu/site/compteurs) | **Fix** 29/07 APK 1.0.40 | **À valider** porteur |
| Contacts | Nom + entreprise + email/tél | **Fix** 29/07 APK 1.0.40 | **À valider** porteur |
| Relances | Date + statut + **poste · entreprise** | **Fix** 29/07 APK 1.0.40 | **À valider** porteur |
| Entretiens | Date + lieu + **poste · entreprise** | **Fix** 29/07 APK 1.0.40 | **À valider** porteur |
| Appels | Sujet + date + **contact / entreprise / offre** | **Fix** 29/07 APK 1.0.40 | **À valider** porteur |

### MOB-HUB-01 — hubs détail + liens croisés (04/08)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Contact | + entretiens liés ; FAB « Ajouter lié » → candidature | **Livré** 04/08 | Re-test |
| Entretien | + relances + appels (même candidature) | **Livré** 04/08 | Re-test |
| Relance | + appels ; candidature montre entreprise | **Livré** 04/08 | Re-test |
| Appel / Candidature / Entreprise | Déjà hub OK | **OK agent** | Smoke porteur |
| Ajout | FAB candidature + FAB contact « Ajouter lié » | **Livré** | hub-add |
| Backoffice nouvel onglet | Ctrl/molette n’actualise **pas** la page source | **Fix** 04/08 `BackofficeLink` + layout auth sans PageLoader flash | Re-test porteur |

### APK-BUILD-01 — anti Zip kernel_blob (27/07 → 04/08)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Cause | `compressDebugAssets` / `kernel_blob.bin.jar already contains entry` | **Confirmé** log porteur 27/07 + **04/08** `/workspace` | build Docker |
| Régression agent | purge trop agressive (supprimait SOURCE kernel_blob) → `NoSuchFileException` | **Confirmé** 04/08 | |
| `clean-flutter-apk-build.sh` | flutter clean + purge compressed_assets / kernel_blob + sudo root | **Renforcé** 04/08 | Docker `/workspace` |
| `app/build.gradle.kts` | purge **uniquement** `compressed_assets` + `dependsOn copyFlutterAssets*` | **Fix** 04/08 | ne pas toucher merge*Assets |
| `build-apk-debug.sh` | clean systématique + retry si Zip | **Livré** | |
| Warning KGP | app + plugins (`device_info_plus`…) | **WARN non bloquant** | `android.builtInKotlin=false` |
| Build agent | APK debug sans Zip | **OK 04/08** `1.0.42+42` | |
| Install ADB Samsung | versionName 1.0.42 / versionCode 42 | **OK 04/08** R5CT7263YJL | |
| Porteur | Rebuild backoffice OK + ouverture app | **À valider** | |

### PILOTAGE-KANBAN — contraste + promo inbox + docs (27/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Contraste colonnes | `headerClass` / `cardClass` textes lisibles (pas blanc sur pastel) | **Supersédé** | → moteur UI |
| Promo inbox | `promoteInbox` → carte board À faire / En cours ; dédoublonne sourceRef | **Livré** | |
| Fichiers UI | Groupes Pilotage + Docs (STATUS/PLAN/BACKLOG/ERRORS/RESOLUTIONS) | **Livré** | |
| `validation-board.json` | `sensitive` · pas de miroir `public/` · API ADMIN only | **Livré** | |
| Whitelist | `docsRoot` pilotage\|docs + sandbox `docs/` | **Livré** | |
| Dark mode Kanban | `jt-kanban-*` + `semantic-kanban.css` (hors filet globals `!important`) | **Livré** 27/07 | Re-test porteur clair+sombre |
| Surfaces page | `StatusAlert` + `uiSurfaces` / `uiText` sur `/backoffice/pilotage` | **Livré** | |
| Fiche droite + popup | Desktop sticky right ; mobile modal ; move colonne recherche | **Livré** 27/07 | Re-test UI |
| Seed élargi | BL-26-14/17/26/27/28/32, B5-RGPD (later / a_valider) | **Livré** | Rafraîchir board |

### DEPLOY-MAKE + Kanban enrichi (27/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| `scripts/deploy/stack-env.sh` | local/preprod/prod init\|check\|up\|status\|logs | **Livré** | |
| Make `up-preprod` / `upgrade-to-*` | Wrappers + garde-fou prod VPS | **Livré** | Re-test porteur `make env-help` |
| Seed board | DEPLOY-C1..C3, SMTP-B3, EMAIL-TRIAGE, BL-26-33, PILOTAGE-KANBAN | **Livré** | Rafraîchir Kanban |
| Focus | Toujours APK-BUILD-01 seul En cours | **OK** | |

### PILOTAGE-UI-04 — Tableau de suivi interactif (22/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| `GET /api/pilotage/board` | Parse TODOS / A_VALIDER → where + items | **OK live** (23 items A_VALIDER, 16 en cours) | |
| `POST /api/pilotage/board/action` | OK/KO SUPER_ADMIN écrit A_VALIDER + note A_TESTER | **OK** après montage RW `docs/pilotage` (avant : EROFS `/workspace:ro`) | Re-test porteur UI |
| Gate env | `JT_RUNTIME_ENV=production` → 403 écriture | **OK** unit `envGate.test.ts` | Ajouter `JT_RUNTIME_ENV` au `.env` local |
| Corrélation md ↔ board | Round-trip mémoire + live write/restore | **OK** Jest + smoke API (restauré) | |
| Compose frontend | Volume `./docs/pilotage` RW sous `/workspace` | **OK** `docker compose up -d frontend` | |
| UI onglet Tableau | Où j’en suis + liste À valider + boutons OK/KO | **Livré agent** | Dev/préprod uniquement |
| Unites | `mdTables` + `envGate` + `board.correlation` | **OK** Jest 8/8 | |
| HTTPS 5443 `/api/pilotage/{board,files}` | **200** via Next (pas gateway) ; `interactive`/`canWrite` true | **OK** smoke JWT SUPER_ADMIN 22/07 | Avant : 404 nginx→gateway |

### PILOTAGE-UI-03 — Fichiers pilotage dans le backoffice (22/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Titre onglet `/backoffice/pilotage` | « Pilotage / Suivi des tâches » | **OK** `BACKOFFICE_DOCUMENT_TITLES` | |
| `GET /api/pilotage/files` | JWT ADMIN+ | **Livré** | |
| `GET/PUT …/files/:id` | Whitelist docs/pilotage · redact · write SUPER_ADMIN + gate hors prod | **Livré** (+ gate UI-04) | |
| `/api/docs/pilotage/*` | **403** (plus public) | **Livré** | |
| UI onglet Fichiers | Lire/éditer TODOS*, PILOTAGE, suivi-actif | **Livré** | Re-test porteur SUPER_ADMIN |

### MOB-ARCH-01 — flutter-mobile-app UI kit (22/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Structure `lib/core/` | theme + widgets + shell IndexedStack | **Livré agent** | Proto séparé de `mobile/` prod |
| Écrans fins | Header / empty / cards / login réutilisent le kit | **Livré agent** | |
| Models | Barrel `datas/models/models.dart` (plus via `main.dart`) | **Livré agent** | |
| `flutter analyze lib` | 0 error | **OK** (Flutter 3.44 conteneur emulator-controller) | |
| Porteur | Parcourir login → shell → actions rapides | **À valider** | Note : app prod = `mobile/` |

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Diagnostic BDD | Candidatures avec nom d’entreprise affiché | **Cause** : `admin@…` avait 7 apps pointant vers Companies de `paul@…` (`by-name` global) → `GET /companies` = 0 | |
| `GET /companies/by-name` | Filtre `userId` du token | **Fix agent** `company.controller.js` | |
| Create/update candidature | `ensureOwnedCompanyId` (clone si hors scope) | **Fix agent** application-service | |
| Backfill SQL | 0 apps wrong owner | **OK** `INSERT 7` + `UPDATE 7` ; admin a 7 entreprises (OVHcloud, …) | Script `scripts/db/backfill-company-ownership-from-applications.sql` |
| Mobile onglet Entreprises | OVHcloud etc. visibles + détail candidatures/contacts | **À valider porteur** (rafraîchir / relancer app) | [`TODOS_A_VALIDER.md`](TODOS_A_VALIDER.md) |

### WEB-LOGIN-01 — Login backoffice erreurs (22/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Mauvais identifiants | Bandeau UI FR, **pas** overlay Next.js Console Error | **Fix agent** : `login()` retourne `{ok,error}` ; plus de `throw`/`console.error(Error)` | |
| E-mail vide / format / mdp vide | Messages précis côté client | **Fix agent** `login/page.tsx` | |
| Email vs password incorrect | Message **générique** volontaire (anti-énumération) ; distinction seulement en logs serveur | Documenté | |
| E-mail non vérifié | Message dédié `EMAIL_NOT_VERIFIED` | inchangé API | **À tester porteur** |

### EMU-LIVE-01 — Aperçu live ADB (22/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Device Samsung sélectionné | Flux MJPEG auto (case cochée par défaut) | **OK partiel** label « Aperçu live appareil ADB » + `liveViewOn` default true + contrôleur JPEG/MJPEG | Re-test porteur sur page émulateur |

### Session miroir Samsung + live web (22/07 — agent)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| App au 1er plan Samsung `R5CT7263YJL` | `MainActivity` focus | **OK** APK **1.0.32+32** | Continuer B2-D.6 |
| Miroir PC scrcpy | Fenêtre « JobbingTrack Samsung » fluide | **OK** 1024px / 60 fps / 8 Mbps / sans audio | Préférer scrcpy pour valider |
| Live web `/backoffice/mobile-emulator` | MJPEG + Aperçu continu | **OK** contrôleur rebuild : JPEG 720p q55, `/mjpeg`, capture ~50 ms ; screenshot ~0,5 s puis cache ~10 ms | Cocher **Aperçu continu**, device Samsung |
| Admin web | Connexion SUPER_ADMIN backoffice | **OK** agent | Tester admin mobile depuis web + téléphone |

### DEV-HTTPS-01 — Forcer HTTPS 5443 (22/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| `http://localhost:5003/…` | **308** → `https://jobbingtrack.localhost:5443/…` | **OK** middleware | |
| `https://localhost:5003` | ERR_SSL (port HTTP) — ne pas utiliser | Documenté | |
| Canonique Pilotage | `https://jobbingtrack.localhost:5443/backoffice/pilotage` | **OK** | |
| `APP_URL` | HTTPS 5443 | **OK** .env + example | |
| Nginx `/api/pilotage/*` | Proxy vers **frontend** (pas gateway) | **OK** 22/07 — sinon 404 « Route non trouvée » | reload `dev-https-proxy` |
| `JT_RUNTIME_ENV` frontend | `development` → écriture OK | **OK** compose | |

---

### B2-D.6 FAB Relance — correctifs agent (22/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Dialog création | Titre **Relance** (pas « Nouvelle relance ») | **Fix** `application_detail_screen` | Re-test porteur |
| Date défaut | +3 j à **09:00** + time picker | **Fix** | |
| Détail relance | FAB **Modifier** · corbeille AppBar (plus dans ⋮) | **Fix** `followup_detail_screen` | |
| Après corbeille | Liste candidature / onglet Relances se rafraîchit | **Fix** `pop(true)` + `_load` / provider | |
| APK | bump **1.0.33+33** | **Livré** pubspec | Installer Samsung |

### PILOTAGE-UI-05 suite — accordéons + catalogue md (22/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Sections rétractables | À valider / Cycles / Plus tard / A_VALIDER / En cours / Catalogue TODOS | **Livré** `PilotageBoardView` | |
| Catalogue TODOS.md | Tables + actions détaillées | **Livré** `itemsTodosAll` | |

### MOB-ARCH-02 — restruct `flutter-mobile-app` (22/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| `lib/` racine | Seulement `main.dart` | **OK** · app dans `core/app.dart` | |
| `AppFab` + thème FAB/card | Listes candidature / entreprise / contact | **Livré** (forms stub) | Pas de FAB entretiens (lié entité) |
| Calendrier / notifs / offline workflow | Reprise à zéro | **Backlog** | Après B2 |

### B2-D.6 FAB Relance (prochain test porteur)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| APK ≥ 1.0.31 | Version bas écran Connexion | **1.0.32** installé | |
| Candidature → FAB → Relance → Créer | Snackbar + Voir détail | | ◀ **à faire** |
| Pas de FlutterError setState | Pas de crash email / logs | | |

### Crash Flutter setState (historique 22/07, APK 1.0.29)

| Élément | Statut | Détail |
|---------|--------|--------|
| Cause `ShellTabRegistry.setCurrentTab` pendant build | **Corrigé code** | post-frame notify ; APK **1.0.31** |
| Re-test porteur après install 1.0.31 | **À faire** avec C.5 / D.6 | Confirmer absence nouveau crash dans `/backoffice/mobile/logs` |
| Popup détail crash (clic extérieur) | **Corrigé agent 22/07** | `AnalyticsRecordDetailDialog` : backdrop + Escape |

### Popup `/backoffice/mobile/logs`

| Test | Attendu | Résultat |
|------|---------|----------|
| Clic ligne crash → popup | Détail visible | |
| Clic **hors** popup | Ferme | **fix agent** — à re-vérifier |
| Escape | Ferme | **fix agent** — à re-vérifier |
| Bouton Fermer | Ferme | |

### Mémoire multi-onglets backoffice (diagnostic)

| Test | Attendu | Résultat |
|------|---------|----------|
| Baseline 1 onglet Synthèse | Noter RAM/CPU navigateur + conteneur `frontend` | **À diagnostiquer** |
| Ouvrir 4–6 pages backoffice | Mesurer delta RAM/CPU/réseau | |
| Onglet au 1er plan vs arrière-plan | Polling / fetch seulement si visible ? | |

---

## Récents OK (résumé — détail dans DONE)

- B2-A/B/C (navigation, admin, relances) — porteur 22/07  
- Shell setState fix — agent 22/07  
- Axes Y % Synthèse absurdes — agent 22/07  

Historique technique long : conserver les preuves dans Git / `TODOS_DONE.md` ; ne pas ré-empiler ici.

### UI Pilotage — MOB-ENT-01 (2026-07-22)

| Test | Résultat | Notes |
|------|----------|-------|
| Action porteur (UI) | **REWORK** | Backfill + fix ownership ; rafraîchir liste |

### UI Pilotage — EMU-LIVE-01 (2026-07-22)

| Test | Résultat | Notes |
|------|----------|-------|
| Action porteur (UI) | **PARTIEL** | scrcpy PC reste le plus fluide |

### PILOTAGE-KANBAN-01 — Kanban ADHD (27/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Onglet Kanban | Colonnes distinctes ; WIP En cours = 1 | **Livré** | |
| Focus banner | Une seule carte focus | **Livré** seed APK-BUILD-01 | |
| À faire ≠ En cours | Open sans focus → backlog | **Livré** | |
| Inbox retours/erreurs | Crashes feedback vs auto | **Livré** client fetch | |
| setColumn / focus | Sync validation-board + Point exact | **Livré** | Re-test porteur |
