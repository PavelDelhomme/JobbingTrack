# Toolchain Android / Flutter — état et dette (BL-26-09)

Dernière mise à jour : 7 juillet 2026

## État actuel (audit agent)

| Composant | Version / état | Statut |
|-----------|----------------|--------|
| Gradle wrapper | **8.14** (`gradle-8.14-all.zip`) | OK |
| Android Gradle Plugin | **8.11.1** (`settings.gradle.kts`) | OK |
| Kotlin Gradle Plugin | **2.3.20** | OK — dette Built-in Kotlin Flutter |
| compileSdk | **36** | OK |
| JVM / desugaring | **17** + desugar 2.1.4 | OK |
| Build APK debug | OK via `build-apk-debug.sh` | OK |
| `flutter pub outdated` | ~33 packages avec contraintes | **Dette** — pas de bump massif avant gate mobile |

Commande d'audit :

```bash
bash scripts/mobile/audit-android-toolchain.sh
```

## Dette connue (ne pas ignorer avant Flutter majeur)

1. **Built-in Kotlin** — warning Flutter sur plugins utilisant `kotlin { compilerOptions }` sans plugin Kotlin explicite. Contournement actuel : `scripts/mobile/setup/patch-android-plugin-gradle-kts.sh` (idempotent, avant `flutter build apk`).

2. **Packages directes bloquées** (juillet 2026, `flutter pub outdated`) :
   - `device_info_plus` 11.x → 13.x (major)
   - `flutter_contacts` 1.x → 2.x (major)
   - `package_info_plus` 8.x → 10.x (major)
   - `flutter_secure_storage` 9.x → 10.x (major)
   - `permission_handler` 11.x → 12.x (major)

   Ces majors impliquent retests smokes ADB complets — **après OK porteur étape 2**.

3. **Gradle 8.14** — déjà appliqué (correctif warning 8.13 documenté BL-26-09).

## Procédure build

```bash
# Debug Samsung (adb reverse)
bash scripts/mobile/setup/build-apk-debug.sh

# Release OTA (API prod injectée)
API_BASE_URL=https://api.jobbingtrack.delhomme.ovh bash scripts/mobile/setup/build-apk-release.sh
```

## Références

- [`mobile/README.md`](../../mobile/README.md)
- [`PROCESSUS_APPLICATION_MOBILE_ET_API.md`](PROCESSUS_APPLICATION_MOBILE_ET_API.md) § API
- Flutter : [Migrate to built-in Kotlin](https://docs.flutter.dev/release/breaking-changes/kotlin-version)
