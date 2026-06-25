#!/usr/bin/env bash
# Résout le binaire Flutter utilisable (Arch pacman vs ~/flutter-sdk).
# Usage: source scripts/mobile/setup/resolve-flutter.sh && "$FLUTTER_BIN" build apk --debug

resolve_flutter_bin() {
  if [[ -n "${FLUTTER_BIN:-}" && -x "$FLUTTER_BIN" ]]; then
    return 0
  fi
  if [[ -x "${HOME}/flutter-sdk/bin/flutter" ]]; then
    if "${HOME}/flutter-sdk/bin/flutter" --version >/dev/null 2>&1; then
      FLUTTER_BIN="${HOME}/flutter-sdk/bin/flutter"
      return 0
    fi
  fi
  if command -v flutter >/dev/null 2>&1 && flutter --version >/dev/null 2>&1; then
    FLUTTER_BIN="$(command -v flutter)"
    return 0
  fi
  return 1
}

if ! resolve_flutter_bin; then
  echo "[resolve-flutter] ERREUR: Flutter introuvable ou snapshot Dart cassé (Arch)." >&2
  echo "  Installez ~/flutter-sdk (stable) ou export FLUTTER_BIN=/chemin/flutter" >&2
  exit 1
fi

export FLUTTER_BIN
export PATH="$(dirname "$FLUTTER_BIN"):$PATH"
