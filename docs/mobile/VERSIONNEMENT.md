# Versionnement mobile JobbingTrack

## Règle produit (depuis 07/07/2026)

Chaque APK est identifié par **`MAJOR.MINOR.BUILD+BUILD`** dans `mobile/pubspec.yaml` :

```yaml
version: 1.0.12+12
#        │       └─ numéro de build Android (versionCode, toujours croissant)
#        └─ version affichée (3e segment = build en ligne 1.0.x)
```

| Partie | Exemple | Rôle |
|--------|---------|------|
| **MAJOR** | `1` | Version majeure (rupture / refonte) — bump **manuel** |
| **MINOR** | `0` | Fonctionnalités regroupées — bump **manuel** quand vous « déployez une mineure » |
| **BUILD** (3e segment) | `12` | **Évolue à chaque APK** — visible dans l’app, le backoffice, l’OTA |
| **+BUILD** | `+12` | Identifiant technique Android (identique au 3e segment en dev) |

**Exemple visuel** : vous voyez **Version 1.0.12** dans le drawer (plus « 1.0.0 build 12 »).

---

## Incrément automatique

À chaque **Build APK** (backoffice ou `build-apk-debug.sh`) :

1. Le script `bump-pubspec-version.js` incrémente le build (`12` → `13`).
2. Il met à jour la version affichée (`1.0.12` → `1.0.13`).
3. Écrit `mobile/pubspec.yaml` : `1.0.13+13`.

Désactiver : `SKIP_VERSION_BUMP=1` avant le build.

Aligner un ancien `1.0.0+12` sans incrémenter :  
`node scripts/mobile/setup/bump-pubspec-version.js --align-only`

---

## Comparaison avec le standard Flutter / semver « pur »

| | Standard Flutter | JobbingTrack |
|---|------------------|--------------|
| pubspec | `1.0.0+12` | `1.0.12+12` |
| Affichage store | `1.0.0` (semver seul) | `1.0.12` |
| 3e chiffre | patch semver (correctifs) | **numéro de build visible** |
| +12 | build Android | build Android (identique) |

Pourquoi le standard sépare ? Voir **[VERSIONNEMENT_EXPLICATION_PORTEUR.md](./VERSIONNEMENT_EXPLICATION_PORTEUR.md)**.

---

## Quand incrémenter MAJOR / MINOR manuellement

| Action | Exemple | Quand |
|--------|---------|--------|
| Build dev quotidien | `1.0.12+12` → `1.0.13+13` | **Automatique** |
| Correctif nommé | `1.0.20+20` → `1.0.21+21` | Idem auto ; le « 21 » reste le build |
| Nouvelle fonctionnalité (mineure) | `1.0.25+25` → `1.1.25+25` ou `1.1.26+26` | Éditer pubspec : monter **MINOR**, puis builds suivants sur `1.1.x` |
| Refonte | `1.1.30+30` → `2.0.31+31` | Éditer pubspec : monter **MAJOR** |

---

## OTA — comparaison

1. Compare semver (`1.0.12` vs `1.0.13`) — majeur, mineur, patch.
2. Si semver égale → compare les **builds** (`+12` &lt; `+13`).

Les anciennes releases stockées en `1.0.0` + build `12` sont **normalisées à l’affichage** en `1.0.12` (API + backoffice).

---

## Affichage

| Contexte | Format |
|----------|--------|
| Drawer mobile | `Version 1.0.12` |
| OTA / technique | `1.0.12+12` |
| Backoffice | `v1.0.12 (build 12)` |
| Tag GitHub | `mobile-v1.0.12+12` |

---

## Fichiers concernés

- `mobile/pubspec.yaml` — source de vérité
- `scripts/mobile/lib/mobile-version-policy.cjs` — règles + bump
- `scripts/mobile/setup/bump-pubspec-version.js` — CLI bump
- `backend/api-gateway/src/lib/mobileVersionPolicy.js` — OTA / suggestions
- `mobile/lib/services/app_version_info.dart` — affichage app
- `frontend/.../MobileReleaseManagementPanel.tsx` — backoffice

---

## FAQ

**Pourquoi pas `1.0.5` pour le 5e build ?**  
En semver strict, `1.0.5` = 5e **correctif produit**, pas le 5e compile. JobbingTrack affiche le build dans le 3e chiffre : `1.0.5+5`.

**Build déjà publié sur dev ?**  
Relancer **Build APK** (auto +1) ou bump manuel — republication du même build est refusée.

**Promote prod change `main` ?**  
Non — OTA seulement ; tag GitHub optionnel. Voir BL-26-28 dans `TODOS.md`.
