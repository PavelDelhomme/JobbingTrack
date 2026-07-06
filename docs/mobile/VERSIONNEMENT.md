# Versionnement mobile JobbingTrack

## Deux nombres, deux rôles

Chaque build Flutter est identifié par **`MAJEUR.MINEUR.PATCH+BUILD`** dans `mobile/pubspec.yaml` :

```yaml
version: 1.0.0+5
#        │      └─ numéro de build (entier, toujours croissant)
#        └─ version semver (lisible utilisateur / store)
```

| Partie | Exemple | Rôle |
|--------|---------|------|
| **Version** (`1.0.0`) | Semver | Ce que l’utilisateur et le Play Store affichent : évolution produit |
| **Build** (`+5`) | Entier strictement croissant | Identifiant technique de chaque APK ; requis par Android et par l’OTA |

**Ce n’est pas la même chose que `1.0.5`.**  
`1.0.5` = cinquième **correctif** semver (`1.0.0` → `1.0.1` → … → `1.0.5`).  
`1.0.0+5` = version produit **1.0.0**, cinquième **compilation** (build n°5).

---

## Quand incrémenter quoi ?

### Numéro de build (`+N`) — **à chaque APK**

- Chaque `flutter build apk`, chaque publication OTA dev, chaque install test.
- **Toujours** augmenter, même si la version semver ne change pas.
- L’OTA compare d’abord la semver, puis le build si la semver est identique.

Exemples en phase dev intensive :

| pubspec | Signification |
|---------|----------------|
| `1.0.0+1` | Premier APK 1.0.0 |
| `1.0.0+2` | Rebuild / correctif interne, même version affichée |
| `1.0.0+5` | Cinquième build, toujours affiché « 1.0.0 » côté store |

### Version semver (`MAJEUR.MINEUR.PATCH`) — **quand le produit évolue**

| Type | Exemple | Quand |
|------|---------|--------|
| **PATCH** | `1.0.0` → `1.0.1` | Correctifs, stabilité, petits ajustements sans nouvelle fonctionnalité |
| **MINEUR** | `1.0.1` → `1.1.0` | Nouvelles fonctionnalités compatibles (ex. nouvel écran, OTA, cloche) |
| **MAJEUR** | `1.1.0` → `2.0.0` | Changement majeur, rupture, refonte |

**Bonne pratique** : quand tu changes la semver, incrémente aussi le build.

```yaml
# Correctif publié en store
version: 1.0.1+6

# Nouvelle fonctionnalité
version: 1.1.0+7

# Refonte majeure
version: 2.0.0+8
```

---

## Affichage dans l’app

| Contexte | Format | Exemple |
|----------|--------|---------|
| Drawer (utilisateur) | `1.0.0` + ligne « Build 5 » | Lisible |
| OTA / technique | `1.0.0+5` | Comparaison serveur |
| Backoffice releases | `v1.0.0 (build 5)` | Publication |
| Tag GitHub (optionnel) | `mobile-v1.0.0+5` | Trace release |

---

## Workflow équipe

1. **Modifier** `mobile/pubspec.yaml` (semver et/ou build).
2. **Build** APK (backoffice étape 1 ou `scripts/mobile/setup/build-apk-debug.sh`).
3. **Publier** canal `dev` (bouton « Publier sur canal dev » — lit le pubspec).
4. **Tester** OTA sur Samsung (canal dev en debug).
5. **Promouvoir** en `production` uniquement avec un **vrai APK** (jamais un fichier smoke de test).

Le backoffice affiche `pubspec` actuel, build suggéré et alerte `needsPubspecBump` si le pubspec n’a pas dépassé la release dev active.

---

## OTA — règle de comparaison

Le serveur expose `version` + `buildNumber`. L’app compare :

1. Semver (`1.0.0` vs `1.0.1`) — majeur, mineur, patch dans l’ordre.
2. Si semver égale → compare les **builds** (`+4` &lt; `+5` → mise à jour proposée).

Une release avec semver plus récente mais build plus petit reste **plus récente** (ex. `1.0.1+1` &gt; `1.0.0+99`).

---

## FAQ

**Pourquoi je vois `1.0.0+5` et pas `1.0.5` ?**  
Parce que le `+5` n’est pas un chiffre de patch : c’est le numéro de build Android. Les correctifs s’écrivent `1.0.1`, `1.0.2`, etc.

**Je peux sauter des builds ?**  
Non recommandé : Android exige `versionCode` strictement croissant. Garde une suite `+1`, `+2`, `+3`…

**Debug vs release ?**  
Même règle. En debug on utilise souvent la même semver longtemps et on fait monter le build (`1.0.0+4`, `+5`…) — normal avant la première mise en store.

---

## Fichiers concernés

- `mobile/pubspec.yaml` — source de vérité
- `mobile/lib/services/app_version_info.dart` — lecture `package_info_plus`
- `backend/api-gateway/.../mobileReleaseStore.js` — suggestions OTA, garde-fous APK
- `frontend/.../MobileReleaseManagementPanel.tsx` — backoffice releases
