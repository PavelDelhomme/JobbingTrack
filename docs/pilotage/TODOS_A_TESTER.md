# TODOs à tester (résultats de tests)

> Ancien nom : `TODOS_A_VERIFIER.md` (stub de redirection).  
> **Rôle** : pour chaque item de [`TODOS.md`](TODOS.md) en cours, noter les **tests** faits, le résultat, et la suite.

## Process

1. Item ouvert dans `TODOS.md` → tests ici.  
2. **OK concluant** → archiver dans [`TODOS_DONE.md`](TODOS_DONE.md) + retirer de ce fichier + cocher/avancer dans `TODOS.md`.  
3. **KO** → remettre / créer l’action corrective dans `TODOS.md` (prochaines actions).

---

## En cours — Phase B / B2

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
| MOB-ENT-01 porteur | Liste entreprises OK ; contacts détail KO | **REWORK** | Suite : contacts liés company |
| AppSnack mobile | clear + durée forcée (relance créée/supprimée) | **Fix** APK 1.0.34 | Re-test D.6 |

### MOB-ENT-01 suite — contacts liés entreprise (22/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Cause | ContactCompany pointait vers anciennes Company (autre owner) après backfill apps | **Confirmé** SQL | |
| `backfill-contact-company-links.sql` | INSERT liens vers Company owned + via ContactApplication | **OK** Capgemini 2, Dassault 1, Orange 1 ; OVH 0 (pas de contact) | |
| `GET /contacts/company/:id` | OR ContactCompany + ContactApplication | **Fix** contact.controller | restart contact-service |
| Porteur | Détail Capgemini → Marie/Luc visibles | **À valider** | rafraîchir app |

### APK-BUILD-01 — anti Zip kernel_blob (27/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Cause | `compressDebugAssets` / `kernel_blob.bin.jar already contains entry` | **Confirmé** log porteur 27/07 | build-apk-debug **sans** clean avant |
| `clean-flutter-apk-build.sh` | flutter clean + purge compressed_assets / outputs | **Livré** | |
| `build-apk-debug.sh` | clean systématique + retry si Zip | **Livré** | Rebuild backoffice |
| Porteur | Rebuild vert → install 1.0.35 | **À valider** | |

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
