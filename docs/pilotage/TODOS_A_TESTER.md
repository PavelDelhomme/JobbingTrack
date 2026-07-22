# TODOs à tester (résultats de tests)

> Ancien nom : `TODOS_A_VERIFIER.md` (stub de redirection).  
> **Rôle** : pour chaque item de [`TODOS.md`](TODOS.md) en cours, noter les **tests** faits, le résultat, et la suite.

## Process

1. Item ouvert dans `TODOS.md` → tests ici.  
2. **OK concluant** → archiver dans [`TODOS_DONE.md`](TODOS_DONE.md) + retirer de ce fichier + cocher/avancer dans `TODOS.md`.  
3. **KO** → remettre / créer l’action corrective dans `TODOS.md` (prochaines actions).

---

## En cours — Phase B / B2

### PILOTAGE-UI-03 — Fichiers pilotage dans le backoffice (22/07)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| Titre onglet `/backoffice/pilotage` | « Pilotage / Suivi des tâches » | **OK** `BACKOFFICE_DOCUMENT_TITLES` | |
| `GET /api/pilotage/files` | JWT ADMIN+ | **Livré** | |
| `GET/PUT …/files/:id` | Whitelist docs/pilotage · redact · write SUPER_ADMIN | **Livré** | |
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
