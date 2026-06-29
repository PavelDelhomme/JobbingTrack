# Matrice tests live mobile — juin 2026

Document de référence pour les tests **en conditions réelles** (API gateway + appareil). Mis à jour après chaque campagne agent.

## Commandes

| Cible | Équivalent direct |
|--------|-------------------|
| Parcours API complet | `node scripts/mobile/smoke/api/smoke-full-journey-api.js` |
| **Matrice entités entremêlées** | `node scripts/mobile/setup/run-interleaved-live-matrix.js` (cible Make `mobile-interleaved-matrix`) |
| Seed réaliste seul | `node scripts/mobile/setup/run-interleaved-live-matrix.js --seed-only` (cible Make `mobile-interleaved-seed`) |
| Smoke entités seed | `node scripts/mobile/smoke/api/smoke-interleaved-entities-api.js` |
| **Manifeste scénarios** | `scripts/mobile/lib/interleaved-scenarios.js` (ajouter un scénario = 1 entrée, pas de code par entreprise) |
| Login user ADB | `node scripts/mobile/smoke-login-user-adb.js` |
| Install + reverse | script `scripts/mobile/setup-physical-device.sh` (cible Make documentée `run-mobile`) |

Prérequis : `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` dans `.env`, gateway `http://127.0.0.1:5002`, appareil USB `adb reverse tcp:5002 tcp:5002`.

---

## UI — changements récents

| Élément | Comportement |
|---------|----------------|
| **Entreprise (candidature)** | Un seul champ **autocomplétion** : tape → filtre existantes ou « Créer « nom » » (`CompanyAutocompleteField`) |
| **Appel sans contact** | Depuis détail candidature → picker → « Appel sans contact · {entreprise} » |

---

## Matrice fonctionnelle

| # | Scénario | API auto | Appareil | Statut |
|---|----------|----------|----------|--------|
| 1 | Candidature complète (nouvelle entreprise via nom) | smoke-full-journey | À valider porteur | Agent API ✅ |
| 2 | Contact depuis détail + lien candidature | smoke-full-journey | À valider | Agent API ✅ |
| 3 | Entretien depuis détail | smoke-full-journey | À valider | Agent API ✅ |
| 4 | Relance depuis détail | smoke-full-journey | À valider | Agent API ✅ |
| 5 | Appel **avec** contact | smoke-full-journey | À valider | Agent API ✅ |
| 6 | Appel **sans** contact (entreprise) | smoke-full-journey | À valider | Code ✅ / API ✅ |
| 7 | Calendrier `/events` | smoke-full-journey | À valider | Agent API ✅ |
| 8 | Notifications **in-app** (cloche, filtre métier, tap → détail) | `smoke-notifications-in-app-scope-api.js` | `smoke-mobile-notification-nav-adb.js` | Agent **19/06 ✅** |
| 8b | Inscription + télémétrie obligatoire | — | `smoke-register-adb.js` | Agent **19/06 ✅** |
| 8c | Vérif email deep link + login | — | `smoke-verify-email-adb.js` | Agent **19/06 ✅** |
| 9 | Télémétrie session/event/perf | smoke-full-journey | Paramètres | Agent API ✅ |
| 10 | Retours bug/suggestion/signalement | `/api/v1/crashes` | Paramètres → Aide | Agent API ✅ |
| 11 | Time-travel `ENABLE_TIME_TRAVEL=true` | smoke-full-journey | Backoffice / API | Si `.env` actif |
| 12 | Déconnexion / reconnexion / biométrie D6 | login smoke | À valider | Partiel |
| 13 | Analytics backoffice `/user-analytics` | — | Admin web | Hors mobile |

---

## Notifications — limites importantes

| Type | État | Note |
|------|------|------|
| **In-app** (liste cloche, `GET /notifications`) | Implémenté | Dépend création côté serveur (entretien, relance, etc.) |
| **Push Android (FCM)** | Non implémenté | — |
| **Rappels locaux** (`flutter_local_notifications`, relance J+3) | **Non implémenté** | Backlog : permissions `POST_NOTIFICATIONS` Android 13+, canal, planification |
| **Permission POST_NOTIFICATIONS** | N/A tant que pas de push/local | À traiter avec rappels locaux |

Sans rappels locaux ou push, l’utilisateur ne reçoit **pas** de notification système pour « faire ta relance » — seulement la liste in-app si le backend en crée.

---

## Time-travel & moteur de statut

- Endpoint : `PUT /api/v1/applications/admin/test/time-travel` (auth requise).
- Actif si `ENABLE_TIME_TRAVEL=true` dans `.env` (voir `.env.example`).
- Sert à **backdater** candidature / entretien / relance pour tester transitions auto (ex. NO_RESPONSE 7j).
- **L’UI mobile ne déclenche pas** le moteur seule : après time-travel, lancer le job/cron statut ou vérifier via API/backoffice.

---

## Agent email / triage mails (hors scope mobile)

- Feature **réservée au compte développeur personnel** (admin porteur), pas pour tous les utilisateurs.
- Interface prévue sur `/` (utilisateur) et backoffice `/b4ck0ff1ce` — voir `docs/features/EMAIL_TRIAGE_AGENT.md`.
- **Ne pas tester** comme parcours mobile standard.

---

## Dernière exécution agent

**29/06/2026 (refactor)** — Manifeste unique `interleaved-scenarios.js` :

- **8 scénarios déclaratifs** : `expect` générique (statut, min/max contacts, entretiens, relances, appels, appel sans contact, sujet relance…)
- **Smoke entremêlé** : **30/30 OK** (endpoint appels corrigé : `/api/v1/calls/application/:id`)
- **Parcours API** : **19/19 OK** · **Pipeline crash** : OK
- **Email récap** : `paul.delhomme@proton.me`

**29/06/2026** — Première matrice :

- **Seed** : Capgemini, Orange, Thales, Atos (refus), Sopra (appel sans contact), Dassault, OVHcloud + contact autonome
- **Smoke entremêlé** : **22/22 OK** (candidatures, contacts, relances, entretiens, appels, calendrier 50 événements, entreprises)
- **Parcours API** : **19/19 OK**
- **Pipeline crash/retours** : OK
- **Email récap** : `paul.delhomme@proton.me` HTTP 202 — rapport `scripts/ops/reports/recap-interleaved-live-matrix-*.html`

**Validation porteur enchaînée** :

1. Mobile : **Paramètres → Aide & retours → Signaler un bug** → message test → Envoyer
2. Backoffice : **Administration → Mobile — erreurs & retours** → ligne ~20 s → détail diagnostic/capture
3. Répondre : `OK Mobile logs backoffice` puis suite étape 2 (ligne 320)

---

**17/06/2026** — `/usr/bin/node scripts/mobile/smoke-full-journey-api.js` sur gateway `127.0.0.1:5002` avec `TEST_USER_*` :

- **18/18 OK** : candidature (companyName), contact + lien, entretien, relance, appel avec/sans contact, calendrier (20 événements), notifications in-app (0 — normal si pas de notif serveur), analytics session/event/perf, retour crash, profil, re-login, GET candidature par id.
- **Time-travel** : ✅ actif (`ENABLE_TIME_TRAVEL=true` + passage variable dans `docker-compose.yml` → recreate `application-service`).

**Appareil Samsung R5CT7263YJL** (même session) :

- APK debug rebuild + `adb install -r` → **Success**
- `smoke-login-user-adb.js` → **OK** (déconnexion, login TEST_USER, « Bonjour »)
- `smoke-mobile-accounts-adb.js` → **interrompu** (bloqué sur login admin — vérifier manuellement menu ADMIN vs user)
- **Time-travel** : ✅ 8j backdate OK après fix `docker-compose.yml` (`ENABLE_TIME_TRAVEL` → application-service).
- **Rappels push/local** : non testés — non implémentés (`flutter_local_notifications` absent).
- **Appareil ADB** : Samsung `R5CT7263YJL` connecté ; UI autocomplete / appel sans contact à valider manuellement après rebuild APK.

---

## Prochaines étapes backlog

1. `flutter_local_notifications` + rappels relance/entretien
2. Smoke ADB parcours détail candidature (UI)
3. `mobile-biometric-smoke` appareil réel
4. Vérification analytics agrégés backoffice après events mobile
