import type { AdbDevice, ApkInfo } from "@/lib/mobile/emulatorControllerClient";

export type BuildApkActionKind =
  | "first_build"
  | "rebuild_optional"
  | "rebuild_recommended"
  | "apk_ready";

export type BuildApkAction = {
  kind: BuildApkActionKind;
  buttonLabel: string;
  title: string;
  detail: string;
  tone: DeviceApkAction["tone"];
  /** true = l’APK est prêt, l’étape 2 install prime sur un rebuild */
  deferToStep2?: boolean;
};

export type DeviceApkActionKind =
  | "build_apk"
  | "install"
  | "reinstall"
  | "up_to_date"
  | "select_device";

export type DeviceApkAction = {
  kind: DeviceApkActionKind;
  title: string;
  detail: string;
  tone: "warning" | "info" | "amber" | "ok" | "neutral" | "critical";
};

export function deviceMatchesBuiltApk(d: AdbDevice, apk: ApkInfo | null): boolean {
  if (!apk?.exists || !apk.version || apk.buildNumber == null || !d.appInstalled) return false;
  return d.appVersionName === apk.version && String(d.appVersionCode) === String(apk.buildNumber);
}

export function apkLabel(apk: ApkInfo | null): string | null {
  if (!apk?.exists || !apk.version || apk.buildNumber == null) return null;
  return `v${apk.version}+${apk.buildNumber}`;
}

export function deviceAppLabel(d: AdbDevice | null): string | null {
  if (!d?.appInstalled || !d.appVersionName) return null;
  return `v${d.appVersionName} (${d.appVersionCode ?? "?"})`;
}

/** Recommandation porteur : build, install ou réinstall selon APK + appareil sélectionné. */
export function resolveDeviceApkAction(
  device: AdbDevice | null,
  apk: ApkInfo | null,
): DeviceApkAction {
  const built = apkLabel(apk);

  if (!apk?.exists) {
    return {
      kind: "build_apk",
      title: "Build APK requis",
      detail:
        "Aucun APK debug sur le serveur. Étape 1 → « Lancer le build APK » (obligatoire avant installation USB).",
      tone: "warning",
    };
  }

  if (!device) {
    return {
      kind: "select_device",
      title: "Sélectionnez un appareil",
      detail: built
        ? `APK prêt (${built}). Branchez le Samsung (USB débogage) puis choisissez l’appareil ci-dessous.`
        : "Branchez un appareil USB avec le débogage activé.",
      tone: "neutral",
    };
  }

  if (!device.appInstalled) {
    return {
      kind: "install",
      title: "Installation requise — app absente",
      detail: `JobbingTrack n’est pas installé sur ${device.model || device.id}. `
        + `APK prêt : ${built ?? "?"}. Passez à l’étape 2 → « Installer sur l’appareil » (inutile de rebuild).`,
      tone: "critical",
    };
  }

  if (deviceMatchesBuiltApk(device, apk)) {
    return {
      kind: "up_to_date",
      title: "Appareil à jour — étape 2 OK",
      detail:
        `${device.model || device.id} : ${deviceAppLabel(device)} = APK ${built ?? "buildé"}. `
        + "Pas de réinstall nécessaire. Pour tester des correctifs mobile : étape 1 « Rebuild APK » puis étape 2 « Réinstaller ».",
      tone: "ok",
    };
  }

  const phone = deviceAppLabel(device) ?? "version inconnue";
  return {
    kind: "reinstall",
    title: "Réinstallation recommandée",
    detail: `${device.model || device.id} : ${phone} ≠ APK ${built ?? "buildé"}. `
      + "Si vous venez de modifier le code mobile : étape 1 (Build APK) puis étape 2 (Installer). "
      + "Sinon : étape 2 suffit (adb install -r).",
    tone: "amber",
  };
}

/** Étape 1 — libellé bouton build et message selon APK disque + appareil sélectionné. */
export function resolveBuildApkAction(
  apk: ApkInfo | null,
  device: AdbDevice | null,
): BuildApkAction {
  const built = apkLabel(apk);

  if (!apk?.exists) {
    return {
      kind: "first_build",
      buttonLabel: "Lancer le build APK",
      title: "Premier build requis",
      detail:
        "Aucun APK debug sur le serveur de build. Lancez la compilation (1–3 min) avant l’étape 2 Install.",
      tone: "warning",
    };
  }

  const deviceMatches = Boolean(device && deviceMatchesBuiltApk(device, apk));

  if (device && !device.appInstalled) {
    return {
      kind: "apk_ready",
      buttonLabel: "Rebuild APK (optionnel)",
      title: `APK ${built} prêt — installez sur l’appareil`,
      detail:
        `${device.model || device.id} : application absente. `
        + "Étape 2 « Installer » suffit — pas besoin de rebuild tant que le code n’a pas changé.",
      tone: "ok",
      deferToStep2: true,
    };
  }

  if (deviceMatches) {
    return {
      kind: "rebuild_optional",
      buttonLabel: "Rebuild APK",
      title: `APK ${built} — appareil déjà synchronisé`,
      detail:
        `${device!.model || device!.id} a la même version que l’APK compilé. `
        + "Étape 2 terminée. Après correctifs agent (navigation, FAB…) : « Rebuild APK » incrémente le build, "
        + "puis « Réinstaller » en étape 2 pour valider sur le Samsung.",
      tone: "ok",
    };
  }

  if (device?.appInstalled && built) {
    return {
      kind: "rebuild_recommended",
      buttonLabel: "Rebuild APK",
      title: "Version appareil ≠ APK compilé",
      detail:
        `Téléphone ${deviceAppLabel(device) ?? "?"} vs APK ${built}. `
        + "Code mobile modifié récemment → « Rebuild APK » puis « Réinstaller ». "
        + "Sinon, étape 2 « Réinstaller » peut suffire sans rebuild.",
      tone: "amber",
    };
  }

  return {
    kind: "apk_ready",
    buttonLabel: "Rebuild APK",
    title: `APK prêt (${built})`,
    detail: device
      ? `${device.model || device.id} : app non installée ou version inconnue — étape 2 « Installer » après build si besoin.`
      : "APK compilé sur le serveur. Branchez le Samsung puis étape 2. Rebuild si le code mobile a changé.",
    tone: "info",
  };
}

/** Bannière principale : prochaine action la plus utile pour le porteur. */
export function resolveWizardBanner(
  apk: ApkInfo | null,
  device: AdbDevice | null,
): Pick<DeviceApkAction, "title" | "detail" | "tone"> {
  const build = resolveBuildApkAction(apk, device);
  const deviceAct = resolveDeviceApkAction(device, apk);

  if (!apk?.exists) {
    return { title: build.title, detail: build.detail, tone: build.tone };
  }
  if (deviceAct.kind === "install" || deviceAct.kind === "reinstall") {
    return { title: deviceAct.title, detail: deviceAct.detail, tone: deviceAct.tone };
  }
  if (deviceAct.kind === "up_to_date") {
    return { title: build.title, detail: build.detail, tone: build.tone };
  }
  if (deviceAct.kind === "select_device") {
    return {
      title: build.title,
      detail: `${build.detail} ${deviceAct.detail}`,
      tone: build.tone,
    };
  }
  return { title: deviceAct.title, detail: deviceAct.detail, tone: deviceAct.tone };
}

export function actionToneClass(tone: DeviceApkAction["tone"]): string {
  switch (tone) {
    case "warning":
      return "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100";
    case "amber":
      return "border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-100";
    case "ok":
      return "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100";
    case "info":
      return "border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100";
    case "critical":
      return "border-red-400 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100";
    default:
      return "border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100";
  }
}
