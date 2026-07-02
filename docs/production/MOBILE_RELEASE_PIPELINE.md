# Pipeline mobile — Android / iOS

Dernière mise à jour : 17 juin 2026

## Vue d'ensemble

| Canal | Mécanisme |
|-------|-----------|
| **Android préprod/prod interne** | OTA via API + install APK in-app |
| **Android store** | GitHub Actions → Play Console (à brancher) |
| **iOS** | App Store / TestFlight (pas d'install APK) |

Portainer déploie l'**API** ; l'app mobile consomme `GET /api/v1/mobile/releases/latest`.

## Android — mise à jour automatique (implémenté)

### Côté serveur (variables Portainer)

| Variable | Rôle |
|----------|------|
| `MOBILE_ANDROID_LATEST_VERSION` | Version distante (ex. `1.0.1`) |
| `MOBILE_ANDROID_LATEST_BUILD` | Code build (ex. `2`) |
| `MOBILE_ANDROID_MIN_*` | Blocage des versions trop anciennes |
| `MOBILE_ANDROID_APK_FILENAME` | Fichier dans volume `/app/mobile-releases` |
| `MOBILE_ANDROID_DOWNLOAD_URL` | Alternative : URL GitHub Releases |
| `MOBILE_ANDROID_FORCE_UPDATE` | `true` = dialog non dismissible |

### Côté app Flutter

Au démarrage (splash) :

1. Appel API release
2. Comparaison version locale (`package_info_plus`)
3. Dialog **Télécharger et installer** (Android) ou **App Store** (iOS)

Fichiers : `mobile/lib/services/mobile_update_service.dart`, `mobile/lib/widgets/mobile_update_dialog.dart`.

### Publier une version

**Local :**

```bash
export API_BASE_URL=https://api.jobbingtrack.delhomme.ovh
bash scripts/mobile/setup/build-apk-release.sh
```

**CI GitHub :** workflow `mobile-release-android.yml` (manuel ou tag `mobile-v*`).

**Sur le VPS :**

```bash
docker cp jobbingtrack-1.0.1+2.apk jobbingtrack-api-gateway:/app/mobile-releases/
```

Puis mettre à jour les variables Portainer et redeploy.

## iOS

Pas d'installation silencieuse hors App Store. Configurer `MOBILE_IOS_APP_STORE_URL` ; l'app ouvre le store.

## Signature release Android

Pour upgrades successifs, utiliser **le même keystore**. Documenter secrets CI :

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`

(À configurer avant publication Play Store.)

## Backoffice (futur)

Afficher version API/mobile en prod, activer bannière « mise à jour obligatoire » — pilotage métier, pas remplacement du pipeline ci-dessus.
