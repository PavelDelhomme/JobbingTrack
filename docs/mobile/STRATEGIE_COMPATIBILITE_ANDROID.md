# Stratégie compatibilité Android — Flutter JobbingTrack

Dernière mise à jour : 2 juillet 2026

**Statut** : **cadrage produit — pas maintenant**  
Ne bloque **pas** la validation mobile **étape 2** ni le premier déploiement VPS. À exécuter **après** clôture des étapes 1→5 (`GUIDE_VALIDATION_PORTEUR.md`) et **avant** ouverture bêta / Play Store large.

Sources : cadrage porteur (Perplexity, juin 2026) + état réel du dépôt JobbingTrack.

---

## Ce que le projet fait déjà

| Paramètre | Valeur actuelle | Fichier |
|-----------|-----------------|---------|
| `compileSdk` | **36** (Android 16) | `mobile/android/app/build.gradle.kts` |
| `minSdk` | **Flutter default** (`flutter.minSdkVersion`, souvent **21**) | idem |
| `targetSdk` | **Flutter default** (`flutter.targetSdkVersion`, souvent **35–36** selon SDK Flutter) | idem |
| `maxSdkVersion` | **Non utilisé** (correct — Google déconseille) | — |

Vérifier les valeurs effectives après un build :

```bash
bash scripts/mobile/setup/build-apk-debug.sh
# Puis inspecter mobile/build/app/outputs/apk/debug/output-metadata.json
# ou le manifest fusionné sous mobile/build/app/intermediates/merged_manifest/
```

**Ne pas** figer `minSdk 21` / `targetSdk 36` en dur dans `build.gradle.kts` tant que Flutter gère les defaults — sauf si un plugin impose un minimum plus haut (alors documenter la raison).

---

## Objectif « meilleur des mondes »

| Niveau | Rôle |
|--------|------|
| **Build** | `minSdk` bas (21+) pour couvrir les vieux appareils ; `targetSdk` / `compileSdk` récents pour Play Store et comportements Android 15–16 |
| **Validation** | Peu d’appareils **physiques**, mais **plusieurs niveaux d’API Android** (pas deux fois la même majeure) |
| **CI / préprod** | Émulateurs AVD sur paliers manquants + Samsung référence |

---

## Parc de test recommandé (3 à 5 niveaux API)

| Rôle | Android | API | Comment le couvrir |
|------|---------|-----|-------------------|
| Minimum théorique | 5.0–6.0 | 21–23 | **AVD** `JobbingTrack_API21` ou `API23` (à créer) |
| Milieu ancien | 8–9 | 26–28 | **AVD** + idéalement **Blackview BV9700 Pro** si API ≤ 28 |
| Milieu moderne | 11–12 | 30–32 | **AVD** `JobbingTrack_API30` |
| Récent | 14–15 | 34–35 | **AVD** ou second émulateur |
| Dernier | 16 | 36 | **Samsung** (appareil porteur principal) |

### Vos appareils physiques (porteur)

| Appareil | Intérêt | Action |
|----------|---------|--------|
| **Samsung** (ex. `R5CT7263YJL`) | Référence **Android 16** — validation courante (étape 2) | **Garder** — tests USB + `adb reverse` |
| **2× Android 16** | Peu de valeur ajoutée vs un seul | **Un seul** suffit pour la majeure 16 ; l’autre en secours |
| **Blackview BV9700 Pro** | **Très utile** si API **< 30** | **Paramètres → À propos → Version Android** → noter API dans ce doc |

Sans appareil intermédiaire physique : combler avec **AVD** (`docs/mobile/EMULATEUR_ADB.md`, `CLONE_APPAREIL.md` § « Autres Android »).

---

## Quand faire quoi (ordre projet)

```
Maintenant     → Étape 2 mobile (GUIDE_VALIDATION_PORTEUR) sur Samsung
Après étapes 3–5 → Smokes + parcours métier stabilisés
Avant bêta Play → Matrice API (ce document) + gate COMPATIBILITE_PLATEFORMES
Déploiement VPS  → Indépendant ; APK pointé vers API prod (BL-26-12)
```

| Phase | Action compat Android |
|-------|----------------------|
| **B — étape 2** | Samsung USB uniquement — **suffisant** |
| **B — étapes 3–5** | Idem + noter bugs spécifiques API si vus |
| **Gate préprod** | Remplir matrice ci-dessous ; 1 smoke rapide par palier AVD |
| **Play Store / bêta** | Tous paliers OK + `SECURITY_RELEASE_IMPACT_REPORT` |

---

## Matrice de validation (à remplir plus tard)

Cocher **porteur** avant bêta publique :

| Palier API | Appareil / AVD | Install APK | Login | Parcours candidature + FAB | Notifications | Notes |
|------------|----------------|-------------|-------|----------------------------|---------------|-------|
| 21–23 | AVD | [ ] | [ ] | [ ] | [ ] | |
| 26–28 | Blackview ou AVD | [ ] | [ ] | [ ] | [ ] | |
| 30–32 | AVD | [ ] | [ ] | [ ] | [ ] | |
| 34–35 | AVD | [ ] | [ ] | [ ] | [ ] | |
| 36 | Samsung | [ ] | [ ] | [ ] | [ ] | **Étape 2 en cours** |

Smoke de référence par palier (agent) :

```bash
node scripts/mobile/smoke-preflight.js
node scripts/mobile/smoke-run-mobile-fast.js   # gate rapide — adapter MOBILE_ADB_DEVICE
```

---

## Vérifications par thème (checklist future)

Lors des campagnes multi-API :

- **UI** : safe area, clavier, drawer, FAB
- **Permissions** : contacts, notifications, biométrie (API 28 vs 33+)
- **Stockage** : scoped storage (API 29+)
- **WebView / HTTPS** : certificats dev vs prod
- **Performances** : cold start, liste 7 candidatures vs gros volume
- **OTA** : install APK release canal dev/prod (`MOBILE_RELEASE_PIPELINE.md`)

---

## Dette technique liée

| ID | Sujet | Voir |
|----|--------|------|
| **BL-26-09** | Toolchain Gradle / Kotlin Built-in Flutter | `TODOS.md` |
| **BL-26-12** | `API_BASE_URL` release / prod | `TODOS.md` |
| **BL-26-14** | **Matrice compat Android multi-API** | Ce document |

---

## Références

- [`COMPATIBILITE_PLATEFORMES.md`](COMPATIBILITE_PLATEFORMES.md) — gate release global
- [`CLONE_APPAREIL.md`](CLONE_APPAREIL.md) — limites Samsung ↔ émulateur
- [`EMULATEUR_ADB.md`](EMULATEUR_ADB.md) — AVD local
- [`GUIDE_VALIDATION_PORTEUR.md`](../pilotage/GUIDE_VALIDATION_PORTEUR.md) — étapes 1→5 **prioritaires**
- [`RESET_DONNEES_PORTEUR_VALIDATION.md`](RESET_DONNEES_PORTEUR_VALIDATION.md) — jeu de test 7 candidatures
