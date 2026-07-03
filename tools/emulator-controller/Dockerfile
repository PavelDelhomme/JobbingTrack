# Contrôleur ADB + build APK (dev local). Réseau hôte pour joindre adb/appareils USB.
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends android-tools-adb bash curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV MOBILE_PROJECT_PATH=/workspace/mobile
ENV EMULATOR_CONTROLLER_HOST=0.0.0.0
ENV PATH="/opt/flutter/bin:${PATH}"

WORKDIR /workspace/tools/emulator-controller

CMD ["node", "launcher.js"]
