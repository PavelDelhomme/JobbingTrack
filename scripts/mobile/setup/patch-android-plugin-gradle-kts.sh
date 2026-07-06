#!/usr/bin/env bash
# Corrige les plugins Flutter Android en .kts qui utilisent kotlin { compilerOptions }
# sans id("org.jetbrains.kotlin.android") dans plugins {} (ex. local_auth_android 2.0.9).
# À lancer avant flutter build apk — idempotent.
set -euo pipefail

resolve_pub_cache() {
  if [[ -n "${PUB_CACHE:-}" && -d "${PUB_CACHE}/hosted/pub.dev" ]]; then
    echo "$PUB_CACHE"
    return
  fi
  if [[ -d "${HOME}/.pub-cache/hosted/pub.dev" ]]; then
    echo "${HOME}/.pub-cache"
    return
  fi
  if [[ -d "/root/.pub-cache/hosted/pub.dev" ]]; then
    echo "/root/.pub-cache"
    return
  fi
  return 1
}

PUB_ROOT="$(resolve_pub_cache || true)"
if [[ -z "${PUB_ROOT:-}" ]]; then
  echo "[patch-android-plugin-gradle-kts] WARN — pub-cache introuvable, skip"
  exit 0
fi

HOSTED="${PUB_ROOT}/hosted/pub.dev"
patched=0

while IFS= read -r -d '' file; do
  if grep -q 'org.jetbrains.kotlin.android\|kotlin-android' "$file"; then
    continue
  fi
  if ! grep -q 'kotlin[[:space:]]*{' "$file"; then
    continue
  fi
  if ! grep -q 'id("com.android.library")' "$file"; then
    continue
  fi
  # Insère le plugin Kotlin Android après com.android.library
  sed -i '/id("com.android.library")/a\    id("org.jetbrains.kotlin.android")' "$file"
  echo "[patch-android-plugin-gradle-kts] OK $(basename "$(dirname "$(dirname "$file")")")"
  patched=$((patched + 1))
done < <(find "$HOSTED" -path '*/android/build.gradle.kts' -print0 2>/dev/null)

if [[ "$patched" -eq 0 ]]; then
  echo "[patch-android-plugin-gradle-kts] Aucun patch nécessaire"
else
  echo "[patch-android-plugin-gradle-kts] $patched fichier(s) corrigé(s)"
fi
