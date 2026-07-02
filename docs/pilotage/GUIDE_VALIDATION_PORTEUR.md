# Guide validation porteur — JobbingTrack

Dernière mise à jour : 17 juin 2026

## En une phrase

**Vous validez le produit** (mobile, mails, déploiement) → ce guide + **`TODOS_A_VALIDER.md`**.  
**L’agent code et teste** → `TODOS.md` (backlog technique) — **ne pas suivre ce fichier pour valider**.

---

## Quel fichier ouvrir ?

| Vous voulez… | Fichier | Rôle |
|--------------|---------|------|
| **Savoir quoi faire maintenant (mobile)** | **Ce guide** + § étape active ci-dessous | Checklist simple |
| **Cocher / répondre OK ou KO** | [`TODOS_A_VALIDER.md`](TODOS_A_VALIDER.md) | Registre officiel (ligne 320 pour l’étape 2) |
| **Comprendre l’ordre global des phases** | [`PILOTAGE.md`](PILOTAGE.md) | Feuille de route A→E |
| **Déployer le VPS (en parallèle)** | [`../production/PORTEUR_ACTIONS_DEPLOIEMENT.md`](../production/PORTEUR_ACTIONS_DEPLOIEMENT.md) | Portainer, NPM, APK |
| **Données mobile propres (7 candidatures)** | [`../mobile/RESET_DONNEES_PORTEUR_VALIDATION.md`](../mobile/RESET_DONNEES_PORTEUR_VALIDATION.md) | Reset compte admin |
| **Compat Android multi-API (plus tard)** | [`../mobile/STRATEGIE_COMPATIBILITE_ANDROID.md`](../mobile/STRATEGIE_COMPATIBILITE_ANDROID.md) | Après étapes 1→5 — pas maintenant |
| **Connexion admin mobile (APK debug)** | [`../mobile/RESET_DONNEES_PORTEUR_VALIDATION.md`](../mobile/RESET_DONNEES_PORTEUR_VALIDATION.md) § connexion | Sync + Connexion ADMIN |
| **Ce que l’agent a déjà testé** | [`TODOS_A_VERIFIER.md`](TODOS_A_VERIFIER.md) | Preuves techniques (lecture seule) |
| **Backlog dev / lots A–H détaillés** | [`TODOS.md`](TODOS.md) | **Agent uniquement** — pas votre checklist |

---

## Vous êtes ici

```
Étape 1  Inscription + email          ✅ OK (25/06)
Étape 2  Navigation + FAB mobile      ▶ EN COURS — retours partiels (pas OK global)
Étape 3  SMTP @jobbingtrack.com       ⏸ bloquée par étape 2
Étape 4  Agent email backoffice       ⏸ bloquée par étape 3
Étape 5  Consentements RGPD /agent    ⏸ bloquée par étape 4
```

**Détail officiel** : [`TODOS_A_VALIDER.md` § Étape 2](TODOS_A_VALIDER.md#étape-2--ligne-320--navigation-retour-admin-relances-ajouts-candidature)

---

## Étape 2 / 5 — Checklist mobile (Samsung)

**Objectif** : confirmer que l’app mobile est utilisable au quotidien (navigation, admin, relances, créations depuis une candidature).

**Durée indicative** : 20–40 min.

### Avant de commencer

| # | Vérification |
|---|--------------|
| 1 | Téléphone branché USB, stack Docker up (`jobbingtrack-api-gateway` healthy) |
| 2 | APK **debug** installé (`build-apk-debug.sh` + `adb install -r …`) |
| 3 | `adb reverse tcp:5002 tcp:5002` actif |
| 4 | Données lisibles : ~**7 candidatures** (sinon `node scripts/mobile/reset-porteur-validation-data.js --confirm`) |
| 5 | Sur login : **Connexion ADMIN** puis plus tard **Connexion USER** (boutons debug) — ne pas retaper le mot de passe 64 caractères |

### Parcours à faire (cochez mentalement)

Numéros = colonnes du tableau dans `TODOS_A_VALIDER.md` § étape 2.

#### A — Navigation retour

| # | Où | Action | OK si… |
|---|-----|--------|--------|
| **1** | **Profil** (barre basse) → **Paramètres** | Touchez **retour** (←) | Vous revenez sur **Profil**, pas sur Accueil |
| **2** | **Calendrier** (barre basse) → icône **Profil** / drawer | Puis **retour** | Vous revenez au **Calendrier** (ou écran d’avant) |
| **2b** | **Candidatures** → sous-onglet **Entreprises** (ou Contacts, …) | Retour système | Liste **Candidatures** (sous-onglet 0) — **ne doit pas** fermer l’app |
| **2b2** | Liste **Candidatures** (sous-onglet 0) | Retour | **Accueil** |
| **2c** | Drawer → **Entreprises** depuis **Calendrier** | Puis retour | Retour **Calendrier** (onglet d’avant), pas Accueil |

#### B — Comptes USER vs ADMIN

| # | Compte | Action | OK si… |
|---|--------|--------|--------|
| **3** | **TEST_USER** (`Connexion USER`) | Ouvrez le **drawer** (menu ☰) | **Pas** de section « Administration » |
| **4** | **TEST_ADMIN** ou admin (`Connexion ADMIN`) | Drawer → **Administration** → hub → **Utilisateurs** → ouvrir un compte test → **Impersonnaliser** | Hub accessible ; actions OK ; bannière orange **Impersonnalisation** visible sur **tous** les écrans ; bouton **Désimpersonnaliser** (bannière ou drawer) → retour hub admin `/admin` |

#### C — Relances (liste)

| # | Où | Action | OK si… |
|---|-----|--------|--------|
| **5** | Onglet **Candidatures** → sous-onglet **Relances** | Parcourez la liste | Pas de crash ; **pas** de gros FAB « + » global sur cet écran |

*Astuce données* : candidature **Orange** a 2 relances seedées.

#### D — FAB depuis une candidature (cœur de l’étape)

Ouvrez une candidature (ex. **Capgemini** ou **Orange**) → bouton **+** (FAB) → **Ajouter** :

| # | Type | Action | OK si… |
|---|------|--------|--------|
| **6** | **Relance** | Remplir date + notes → **Créer** | Snackbar + **Voir** ouvre le **détail relance** |
| **7** | **Appel** | Avec contact (picker) ou sans | Appel créé ; détail accessible |
| **8** | **Entretien** | Date du jour, lieu, notes | Entretien créé ; détail accessible |
| **9** | **Contact** | Créer ou lier un contact | Contact visible sur la **fiche candidature** |

#### E — Shell candidatures / contacts

| # | Où | Action | OK si… |
|---|-----|--------|--------|
| **10** | Barre basse **Candidatures** | Allez sous-onglet Relances ou Appels, puis **re-touchez Candidatures** | Retour à la **liste principale** des candidatures |
| **11** | Candidatures → sous-onglet **Contacts** | FAB **+** | Sheet création contact + choix **entreprise** |

#### F — Retour système Android (Accueil)

| # | Où | Action | OK si… |
|---|-----|--------|--------|
| **12** | Onglet **Accueil** (barre basse, pile vide, drawer fermé) | Appuyez **deux fois** sur retour système (< 2 s) | 1er appui : snackbar **flottante au-dessus de la barre basse** — *« Appuyez à nouveau pour mettre l'application en arrière-plan (pas de fermeture forcée) »* ; 2e appui : app en **arrière-plan** Android (processus conservé, pas kill) |

### Retours porteur déjà confirmés (17/06)

| Sujet | Statut |
|-------|--------|
| Retour Profil → Accueil | **OK** |
| Retour listes candidatures | **OK** (actualisation au retour : à surveiller) |
| Drawer USER sans Administration | **OK** |
| Hub ADMIN | **OK** |
| Édition prénom/nom/email/tél (base) | **OK** |
| Impersonnalisation → sortie | **KO** → correctif agent : rebuild APK + re-test point 4 |
| FAB 6–11 | **À re-tester** |

### Backlog noté (ne bloque pas si corrigé + re-test OK)

- **Tutoriel première connexion** : parcours complet, bypass partiel, reprise aux blocs clés (`BL-TUT-01`)
- **Recherche globale** : recherches récentes + toutes entités utilisateur avec filtres (`BL-26-19`)
- **Profil** : changement email (double saisie + lien validation), téléphone avec indicatif pays (`BL-26-20`)
- **Logs mobile** : erreurs profil remontées au backoffice admin (`BL-26-21`)

### Points bonus (mentionnés ligne 517 — si vous avez le temps)

Non bloquants pour dire OK étape 2, mais utiles à noter en « Notes porteur » :

- **FAB accueil** : créer candidature **ou** contact depuis l’accueil
- **Analytics** : activé par défaut (pas de bannière « Analytics OFF »)
- **Détail appel** : liens cliquables vers contact / candidature / entreprise

### Quand tout est OK

Répondez dans le chat (ou remplissez la ligne 517 du tableau) :

```text
OK Mobile — navigation retour, admin, relances, ajouts candidature

Notes : Samsung R5CT7263YJL, 7 candidatures seed, points 1–11 OK
Preuves : (optionnel) capture drawer USER sans admin + FAB relance Capgemini
```

En cas de blocage sur **un seul** point :

```text
KO Mobile — navigation retour, admin, relances, ajouts candidature

Point 6 : FAB relance → snackbar OK mais « Voir » ne ouvre pas le détail
```

L’agent corrige → vous **re-testez la même étape** (pas l’étape 3).

---

## Les 5 étapes mobile (vue d’ensemble)

| Étape | Sujet | Quand | Guide détaillé |
|-------|--------|-------|----------------|
| **1** | Inscription + vérif email | ✅ Fait | `TODOS_A_VALIDER.md` § étape 1 |
| **2** | Navigation + FAB + admin | **Maintenant** | **Ce guide** § ci-dessus |
| **3** | SMTP `@jobbingtrack.com` (OVH) | Après OK étape 2 | `TODOS_A_VALIDER.md` § étape 3 + `docs/emails/OVH_MX_PLAN_JOBBINGTRACK.md` |
| **4** | Agent email `/agent` | Après OK étape 3 | `TODOS_A_VALIDER.md` § étape 4 — navigateur + backoffice |
| **5** | Consentements RGPD sync mobile↔web | Après OK étape 4 | `TODOS_A_VALIDER.md` § étape 5 |

Après l’étape **5** : validations Lot D restantes (lignes 324+ du tableau) puis déploiement prod.

---

## Plus tard — compatibilité Android (pas maintenant)

**Ne pas** lancer la matrice multi-API tant que l’**étape 2** n’est pas validée (OK explicite).

Après étapes **1→5** et avant bêta Play Store :

→ [`../mobile/STRATEGIE_COMPATIBILITE_ANDROID.md`](../mobile/STRATEGIE_COMPATIBILITE_ANDROID.md)

Résumé : `compileSdk 36` déjà OK ; tester **plusieurs API** (AVD + Blackview si ancien), pas deux fois Android 16 seul.

---

## File parallèle — Déploiement VPS (optionnel maintenant)

Ne bloque **pas** l’étape 2 mobile. Si vous avez un VPS prêt :

→ [`../production/PORTEUR_ACTIONS_DEPLOIEMENT.md`](../production/PORTEUR_ACTIONS_DEPLOIEMENT.md)

---

## Fichiers à ignorer pour l’instant (porteur)

| Fichier | Pourquoi |
|---------|----------|
| `TODOS.md` | Backlog technique agent (centaines de lignes) |
| `TODOS_A_VALIDER.md` § P1A/P1B en haut | Validations backoffice **reportées** après mobile |
| `TODOS_A_VERIFIER.md` | Preuves agent — pas une todo porteur |
| `docs/BACKLOG.md` | Idées futures |

---

## Aide rapide

| Problème | Action |
|----------|--------|
| Trop de candidatures | `node scripts/mobile/reset-porteur-validation-data.js --confirm` |
| Login admin mobile | `node scripts/mobile/setup/sync-admin-mobile-login.js` + rebuild APK debug |
| Erreur réseau mobile | `adb reverse tcp:5002 tcp:5002` + `diagnose-mobile-api-connection.js` |
| Perdu dans la doc | Revenir **ici** — [`GUIDE_VALIDATION_PORTEUR.md`](GUIDE_VALIDATION_PORTEUR.md) |
| Logique retour complète | [`../mobile/NAVIGATION_RETOUR_MOBILE.md`](../mobile/NAVIGATION_RETOUR_MOBILE.md) |
| Bloqué en impersonnalisation | Drawer → **Désimpersonnaliser** ou bannière orange en haut → hub admin |
