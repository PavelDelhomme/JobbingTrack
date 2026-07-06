# Contrôleur ADB + build APK (dev local). Réseau hôte + USB pour appareils physiques.
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    android-tools-adb \
    bash \
    ca-certificates \
    curl \
    git \
    openjdk-17-jdk-headless \
  && rm -rf /var/lib/apt/lists/* \
  # SDK Flutter monté depuis l'hôte (volume ro) : évite « dubious ownership » au build
  && git config --global --add safe.directory /opt/flutter \
  && git config --global --add safe.directory /workspace \
  && git config --global --add safe.directory '*'

ENV MOBILE_PROJECT_PATH=/workspace/mobile
ENV EMULATOR_CONTROLLER_HOST=0.0.0.0
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="/opt/flutter/bin:${JAVA_HOME}/bin:${PATH}"

WORKDIR /workspace/tools/emulator-controller

CMD ["node", "launcher.js"]
