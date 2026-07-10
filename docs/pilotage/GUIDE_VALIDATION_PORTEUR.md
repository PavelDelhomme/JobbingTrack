# Guide validation porteur — JobbingTrack

Dernière mise à jour : 11 juillet 2026 (APK 1.0.28+28 OTA dev publié ; swipe listes + retour 2b)

## En une phrase

**Vous validez le produit** (mobile, mails, déploiement) → ce guide + **`TODOS_A_VALIDER.md`**.  
**L’agent code et teste** → `TODOS.md` (backlog technique) — **ne pas suivre ce fichier pour valider**.

---

## Où regarder pour la suite (étape 2 mobile)

| Fichier | Rôle | Vous devez… |
|---------|------|-------------|
| **[`GUIDE_VALIDATION_PORTEUR.md`](GUIDE_VALIDATION_PORTEUR.md)** § **Étape 2 / 5** | **Checklist à exécuter sur Samsung** | **Commencer ici** — parcours points 1–11 + impersonnalisation |
| **[`TODOS_A_VALIDER.md`](TODOS_A_VALIDER.md)** § **Étape 2 — Ligne 320** | Registre officiel : cocher OK / KO | Répondre `OK Mobile — navigation…` quand tout est bon |
| [`TODOS_A_VERIFIER.md`](TODOS_A_VERIFIER.md) | Preuves **agent** (smokes, CI) | Lecture seule — pas votre checklist |
| [`TODOS.md`](TODOS.md) | Backlog **technique agent** | **Ne pas suivre** pour valider le produit |

**Versions typiques (11/07)** :

| Source | Exemple | Signification |
|--------|---------|---------------|
| **pubspec.yaml** (code) | `1.0.28+28` | Version courante après correctifs retour 2b + swipe |
| **Canal dev OTA** | `1.0.28+28` | Publié agent 11/07 — MAJ OTA Samsung possible |
| **APK sur disque** (build USB) | `1.0.28+28` | Installé Samsung agent 11/07 |
| **Canal prod OTA** | aucune | **Normal en local** — promote seulement avant prod réelle |
| **Téléphone installé** | variable | Install USB ou MAJ OTA — voir version en bas de l’écran **Connexion** |

**Règle développement** : build + install USB suffit pour valider l’étape 2. **Publish dev OTA** seulement si vous voulez tester la MAJ OTA (étape 4 du wizard backoffice).

Doc détaillée : [`OTA_RELEASES_BACKOFFICE.md`](../mobile/OTA_RELEASES_BACKOFFICE.md)

---

## Quel fichier ouvrir ?

| Vous voulez… | Fichier | Rôle |
|--------------|---------|------|
| **Savoir quoi faire maintenant (mobile)** | **Ce guide** + § étape active ci-dessous | Checklist simple |
| **Cocher / répondre OK ou KO** | [`TODOS_A_VALIDER.md`](TODOS_A_VALIDER.md) | Registre officiel (ligne 320 pour l’étape 2) |
| **Comprendre l’ordre global des phases** | [`PILOTAGE.md`](PILOTAGE.md) | Feuille de route A→E |
| **Déployer le VPS (en parallèle)** | [`../production/PORTEUR_ACTIONS_DEPLOIEMENT.md`](../production/PORTEUR_ACTIONS_DEPLOIEMENT.md) | Portainer, NPM, APK |
| **Données mobile propres (7 candidatures)** | [`../mobile/RESET_DONNEES_PORTEUR_VALIDATION.md`](../mobile/RESET_DONNEES_PORTEUR_VALIDATION.md) | Reset compte admin |
| **Releases OTA (build → publish → Samsung)** | [`../mobile/OTA_RELEASES_BACKOFFICE.md`](../mobile/OTA_RELEASES_BACKOFFICE.md) | Backoffice `/backoffice/mobile/releases` + CLI |
| **Connexion admin mobile (APK debug)** | [`../mobile/RESET_DONNEES_PORTEUR_VALIDATION.md`](../mobile/RESET_DONNEES_PORTEUR_VALIDATION.md) § connexion | Sync + Connexion ADMIN |
| **Ce que l’agent a déjà testé** | [`TODOS_A_VERIFIER.md`](TODOS_A_VERIFIER.md) | Preuves techniques (lecture seule) |
| **Backlog dev / lots A–H détaillés** | [`TODOS.md`](TODOS.md) | **Agent uniquement** — pas votre checklist |

---

## Vous êtes ici

```
Étape 1  Inscription + email          ✅ OK (25/06)
Étape 2  Navigation + FAB mobile      ▶ EN COURS — retours partiels (pas OK global)
         └─ Parcours OTA (backoffice) ▶ EN COURS — dev **1.0.15+15** ; UI wizard améliorée 10/07
Étape 3  SMTP @jobbingtrack.com       ⏸ bloquée par étape 2
Étape 4  Agent email backoffice       ⏸ bloquée par étape 3
Étape 5  Consentements RGPD /agent    ⏸ bloquée par étape 4
```

### Deux files en parallèle (étape 2)

| File | Où | Statut typique | Pour clôturer |
|------|-----|----------------|---------------|
| **A — Mobile Samsung** | App Flutter | FAB 6–11 + points navigation **re-test** après rebuild | Ce guide § étape 2 → `OK Mobile — navigation…` ligne 320 |
| **B — Releases OTA** | `https://jobbingtrack.localhost:5443/backoffice/mobile/releases` | Wizard avec spinners ; vue versions ; historique scrollable | [`OTA_RELEASES_BACKOFFICE.md`](../mobile/OTA_RELEASES_BACKOFFICE.md) → ligne 416 |

**Warning Kotlin au build** : APK produit quand même — dette **BL-26-09**, **pas bloquant**.

**Détail officiel mobile** : [`TODOS_A_VALIDER.md` § Étape 2](TODOS_A_VALIDER.md#étape-2--ligne-320--navigation-retour-admin-relances-ajouts-candidature)

---

## Backoffice — `/backoffice/mobile/releases` (HTTPS)

URL locale typique : `https://jobbingtrack.localhost:5443/backoffice/mobile/releases`

### Wizard (panneau vert — étapes 1 à 5)

| Étape | Action | Ce que vous devez voir |
|-------|--------|------------------------|
| **1 Build APK** | « Lancer le build APK » ou « **Rebuild APK** » | Sans APK → Lancer. APK déjà compilé (même version que le téléphone) → **Rebuild APK** pour intégrer les correctifs récents |
| **2 Appareil ADB** | Brancher Samsung, autoriser USB debug, « Actualiser (détails) » | Spinner sur Actualiser ; bouton Install/Réinstaller avec libellé de phase (`adb install`, etc.) |
| **3 Publish dev** | Après install OK | « Publier sur canal dev » avec spinner — **optionnel** si vous validez seulement en USB |
| **4 OTA Samsung** | Ouvrir l’app | Dialog MAJ si version installée < canal dev |
| **5 Promote prod** | Après validation dev | **Ne pas utiliser** en dev quotidien — prod vide = normal |

**Pendant toute opération** : bandeau bleu en haut du wizard indique l’étape exacte en cours.

**Cas fréquent (téléphone déjà à jour)** : bannière verte → **Rebuild APK** (étape 1) puis **Réinstaller l’APK** (étape 2). Pendant build/install : autres boutons verrouillés ; **Arrêter** disponible ; progression ADB en 3 sous-étapes.

**Historique des builds** (sous le journal session) : sessions de compilation locales — peut différer de l’historique OTA si publish non fait.

### Vue d’ensemble des versions (tableau)

Quatre lignes distinctes :

1. **Code source (pubspec.yaml)** — version après prochain build  
2. **APK compilé (disque build)** — fichier prêt USB  
3. **Canal dev OTA** — ce que le téléphone reçoit en MAJ OTA  
4. **Canal production OTA** — « aucune » est **attendu** en local  

Un écart pubspec > dev OTA est **normal** si vous n’avez pas republié après le dernier build.

### Historique des versions OTA

Tableau avec **scroll horizontal** — toutes les colonnes (package complet, notes, auteur, GitHub). Les lignes **● dev OTA** / **● prod OTA** indiquent la release active par canal.

**Upload manuel** (section repliée) : secours uniquement ; préférez « Publier sur canal dev » du wizard.

---

## Étape 2 / 5 — Checklist mobile (Samsung)

**Objectif** : confirmer que l’app mobile est utilisable au quotidien (navigation, admin, relances, créations depuis une candidature).

**Durée indicative** : 20–40 min.

### Avant de commencer

| # | Vérification |
|---|--------------|
| 1 | Téléphone branché USB, stack Docker up (`jobbingtrack-api-gateway` healthy) |
| 2 | APK **debug** installé via backoffice étape 2 **ou** `build-apk-debug.sh` + `adb install -r …` |
| 3 | `adb reverse tcp:5002 tcp:5002` actif |
| 4 | Données lisibles : ~**7 candidatures** (sinon `node scripts/mobile/reset-porteur-validation-data.js --confirm`) |
| 5 | Sur login : **Connexion ADMIN** puis **Connexion USER** — version affichée **en bas** (`Version 1.0.x+x`) |

### Parcours à faire (cochez mentalement)

Numéros = colonnes du tableau dans `TODOS_A_VALIDER.md` § étape 2.

#### A — Navigation retour

| # | Où | Action | OK si… | Re-test 10/07 |
|---|-----|--------|--------|---------------|
| **1** | **Profil** → **Paramètres** | Retour (←) | Retour **Profil** | ✅ déjà OK |
| **2** | **Calendrier** (barre basse) → **Profil** (barre basse) | Retour système | Retour **Calendrier** (pas Accueil) | ⚠️ **re-test** — correctif 10/07 soir (un seul PopScope shell) |
| **2c** | **Accueil** → drawer **Entreprises** | Retour | Retour **Accueil** direct (pas liste Candidatures intermédiaire) | ⚠️ re-test |
| **2b** | **Candidatures** → sous-onglet **Entreprises** | Retour système ×2 | 1er → liste **Candidatures** ; 2e → **Accueil** | ⚠️ **re-test** — correctif 10/07 soir (double PopScope) |
| **2b2** | Liste **Candidatures** | Retour | **Accueil** | ✅ déjà OK |
| **2d** | Drawer **Entreprises** depuis **Calendrier** | — | **N/A** — le Calendrier n’a pas le drawer global (filtres uniquement) | — |

#### B — Comptes USER vs ADMIN

| # | Compte | Action | OK si… | Re-test |
|---|--------|--------|--------|---------|
| **3** | **TEST_USER** | Drawer | Pas « Administration » | ✅ |
| **4** | **TEST_ADMIN** | Impersonnaliser | Bannière compacte ; **Désimpersonnaliser** → hub admin | ✅ UI ; ⚠️ re-test sortie si doute |

#### C — Relances (liste)

| # | Où | Action | OK si… | Re-test |
|---|-----|--------|--------|---------|
| **5** | **Relances** | Parcourir | Pas de crash ; titre `date · canal` | ✅ |
| **6** | FAB **Relance** depuis candidature | Créer → **Voir** | Détail relance + **contact** si candidature en a un | ⚠️ **re-test** contact sur détail |

#### D — FAB depuis une candidature

| # | Type | OK si… | Statut porteur |
|---|------|--------|----------------|
| **6** | Relance | Snackbar + Voir → détail | Partiel — re-test contact |
| **7** | Appel | Créé + détail | **À tester** |
| **8** | Entretien | Créé + détail | **À tester** |
| **9** | Contact | Visible sur fiche | **À tester** |

#### E — Shell candidatures / contacts

| # | Où | Action | Statut |
|---|-----|--------|--------|
| **10** | Barre **Candidatures** | Re-tap → liste principale | **À tester** |
| **11** | Sous-onglet **Contacts** | FAB **+** | **À tester** |

#### F — Retour système Android

| # | Où | Action | Statut |
|---|-----|--------|--------|
| **12** | **Accueil** | Double retour < 2 s | **À tester** |

### Retours porteur — synthèse

| Sujet | Statut | Action |
|-------|--------|--------|
| Retour Profil / listes | **OK** | — |
| Retour Calendrier (point 2) | **KO** → correctif | **Re-test obligatoire** |
| Sous-onglets Candidatures (2b) | **KO** → correctif | **Re-test obligatoire** |
| Impersonnalisation | **OK** UI compacte | Re-test sortie si besoin |
| FAB 6–11 | **Non confirmés** | **Re-test après rebuild APK** |
| Install USB backoffice | Ne doit plus « Failed to fetch » | Vérifier spinner étape 2 |
| Version login | Nouveau 10/07 | Vérifier en bas écran Connexion |

### Quand tout est OK

```text
OK Mobile — navigation retour, admin, relances, ajouts candidature

Notes : Samsung …, points 1–12 OK, version login visible, backoffice wizard OK
```

En cas de blocage :

```text
KO Mobile — navigation retour, admin, relances, ajouts candidature

Point 2 : retour Calendrier → toujours Accueil
```

L’agent corrige → vous **re-testez la même étape** (pas l’étape 3).

---

## Les 5 étapes mobile (vue d’ensemble)

| Étape | Sujet | Quand | Guide détaillé |
|-------|--------|-------|----------------|
| **1** | Inscription + vérif email | ✅ Fait | `TODOS_A_VALIDER.md` § étape 1 |
| **2** | Navigation + FAB + admin | **Maintenant** | **Ce guide** |
| **3** | SMTP `@jobbingtrack.com` (OVH) | Après OK étape 2 | `TODOS_A_VALIDER.md` § étape 3 |
| **4** | Agent email `/agent` | Après OK étape 3 | `TODOS_A_VALIDER.md` § étape 4 |
| **5** | Consentements RGPD sync mobile↔web | Après OK étape 4 | `TODOS_A_VALIDER.md` § étape 5 |

---

## Plus tard — compatibilité Android (pas maintenant)

**Ne pas** lancer la matrice multi-API tant que l’**étape 2** n’est pas validée.

→ [`../mobile/STRATEGIE_COMPATIBILITE_ANDROID.md`](../mobile/STRATEGIE_COMPATIBILITE_ANDROID.md)

---

## File parallèle — Déploiement VPS (optionnel)

→ [`../production/PORTEUR_ACTIONS_DEPLOIEMENT.md`](../production/PORTEUR_ACTIONS_DEPLOIEMENT.md)

---

## Fichiers à ignorer pour l’instant (porteur)

| Fichier | Pourquoi |
|---------|----------|
| `TODOS.md` | Backlog technique agent |
| `TODOS_A_VALIDER.md` § P1A/P1B en haut | Validations backoffice reportées |
| `TODOS_A_VERIFIER.md` | Preuves agent |
| `docs/BACKLOG.md` | Idées futures |

---

## Aide rapide

| Problème | Action |
|----------|--------|
| Trop de candidatures | `node scripts/mobile/reset-porteur-validation-data.js --confirm` |
| Login admin mobile | `node scripts/mobile/setup/sync-admin-mobile-login.js` + rebuild APK |
| Erreur réseau mobile | `adb reverse tcp:5002 tcp:5002` + `diagnose-mobile-api-connection.js` |
| Install backoffice bloqué | Attendre fin spinner (jusqu’~10 min) ; vérifier contrôleur `curl http://127.0.0.1:5055/health` |
| Confusion versions | Backoffice → **Vue d’ensemble des versions** (4 lignes) |
| Perdu dans la doc | Revenir **ici** |
| Bloqué en impersonnalisation | Drawer → **Désimpersonnaliser** ou bannière en haut |
