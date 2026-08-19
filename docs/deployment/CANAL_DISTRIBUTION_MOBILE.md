# Canaux de distribution mobile — JobbingTrack

Dernière mise à jour : **19 août 2026**

## Vue d’ensemble

| Canal | Public | Mise à jour | État |
|-------|--------|-------------|------|
| **OTA interne** (API JobbingTrack) | Équipe / bêta | In-app, canal dev → prod | ✅ Livré |
| **APK sideload** (URL directe) | Restreint | Manuel / backoffice | ✅ Livré |
| **GitHub Releases** | Repo (public/privé) | Tag `mobile-v*` + CI | ✅ CI, upload manuel VPS |
| **Google Play Store** | Public | Play Console | 🔲 À brancher |
| **F-Droid** | Open source | Repo F-Droid + metadata | 🔲 À brancher |
| **Apple App Store / TestFlight** | Public / bêta | App Store Connect | 🔲 Futur |

Référence implémentation OTA : `docs/production/MOBILE_RELEASE_PIPELINE.md`

---

## 1. OTA interne (canal principal aujourd’hui)

### Flux

1. Build APK (`scripts/mobile/setup/build-apk-release.sh` ou debug local)
2. Publication canal **dev** : backoffice `/backoffice/mobile/releases` ou `publish-apk-remote.sh`
3. Test sur appareil (build debug → canal dev automatique)
4. **Promote → production** (one-click backoffice)
5. App Flutter : `GET /api/v1/mobile/releases/latest?platform=android&channel=…`

### Scripts

```bash
# Local → stack Docker locale
bash scripts/mobile/publish-built-dev.sh

# Local → VPS distant
DEPLOY_URL=https://api.example.com MOBILE_RELEASE_CHANNEL=dev \
  bash scripts/deploy/publish-apk-remote.sh
```

### Variables Portainer (prod)

`MOBILE_ANDROID_LATEST_*`, `MOBILE_ANDROID_MIN_*`, volume `jobbingtrack_mobile_releases`.

---

## 2. GitHub Releases (artefact CI)

Workflow : `.github/workflows/mobile-release-android.yml`

- Déclenchement : manuel ou tag `mobile-v1.0.42`
- Produit : APK signé (si keystore CI configuré) + release GitHub
- Lien avec OTA : `MOBILE_ANDROID_DOWNLOAD_URL` pointant vers l’asset release

**Keystore CI (avant prod store)** :

| Secret | Rôle |
|--------|------|
| `ANDROID_KEYSTORE_BASE64` | Keystore release |
| `ANDROID_KEYSTORE_PASSWORD` | Mot de passe |
| `ANDROID_KEY_ALIAS` | Alias clé |

---

## 3. Google Play Store (roadmap)

### Prérequis

1. Compte Google Play Console (frais unique développeur)
2. Keystore release **stable** (même clé pour toutes les MAJ)
3. Build **AAB** (Android App Bundle) — `flutter build appbundle --release`
4. Politique de confidentialité + fiche store

### Intégration CI (à implémenter)

```yaml
# Esquisse — .github/workflows/mobile-play-store.yml (futur)
# - build appbundle
# - upload avec r0adkll/upload-google-play ou fastlane supply
# secrets: PLAY_SERVICE_ACCOUNT_JSON, ANDROID_KEYSTORE_*
```

### Coexistence avec OTA

- **Play Store** : canal public, review Google
- **OTA interne** : builds debug/bêta plus rapides, canaux dev/prod internes
- Recommandation : `applicationId` distinct ou flavor **store** vs **internal** (comme YTMusic dev/prod flavors)

---

## 4. F-Droid (roadmap)

F-Droid exige :

- Code source public (ou repo accessible)
- Build reproductible (pas d’APK binaire opaque)
- Pas de dépendances propriétaires non documentées
- Fichier `metadata/fr.jobbingtrack.yml` dans un repo F-Droid ou Fastlane metadata

### Étapes

1. Publier le repo (déjà GitHub)
2. Ajouter `fastlane/metadata/android` (description, screenshots)
3. Soumettre au repo F-Droid ou héberger un **F-Droid repo privé** (plus simple pour usage perso)

Doc F-Droid : [Inclusion How-To](https://f-droid.org/docs/Inclusion_How-To/)

---

## 5. iOS

Pas d’installation hors App Store (sauf TestFlight / entreprise).

- Configurer `MOBILE_IOS_APP_STORE_URL` en prod
- L’app ouvre le store si MAJ iOS requise
- Workflow CI iOS : **non implémenté** (macOS runner + certificats Apple)

---

## 6. Matrice de choix

| Besoin | Canal recommandé |
|--------|------------------|
| Test rapide équipe | OTA canal **dev** |
| Prod perso / VPS | OTA canal **production** + promote |
| Distribution publique Android | Play Store (futur) |
| Open source / sans Google | F-Droid (futur) |
| iOS | App Store / TestFlight |

---

## 7. Alignement YTMusic

YTMusic utilise sideload APK via `/api/deploy/apk` + flavors dev/prod.  
JobbingTrack utilise un pipeline plus riche (canaux dev/prod, backoffice, promote).  
Les deux évitent Play Store en phase actuelle ; JobbingTrack documente la montée en charge vers stores.

---

## Pilotage

Carte **DEPLOY-C3** : premier APK OTA canal dev validé sur device.  
Carte **DEPLOY-GHA-01** : chaîne GH Actions + Portainer + scripts admin.
