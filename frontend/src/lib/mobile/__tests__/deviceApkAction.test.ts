import {
  resolveBuildApkAction,
  resolveDeviceApkAction,
  resolveWizardBanner,
} from "@/lib/mobile/deviceApkAction";
import type { AdbDevice, ApkInfo } from "@/lib/mobile/emulatorControllerClient";

const apk: ApkInfo = {
  exists: true,
  version: "1.0.18",
  buildNumber: 18,
};

const deviceSynced: AdbDevice = {
  id: "R5CT7263YJL",
  status: "device",
  model: "Samsung",
  appInstalled: true,
  appVersionName: "1.0.18",
  appVersionCode: "18",
};

describe("resolveBuildApkAction", () => {
  it("premier build sans APK", () => {
    const action = resolveBuildApkAction({ exists: false }, null);
    expect(action.buttonLabel).toBe("Lancer le build APK");
    expect(action.kind).toBe("first_build");
  });

  it("rebuild quand APK et appareil alignés", () => {
    const action = resolveBuildApkAction(apk, deviceSynced);
    expect(action.buttonLabel).toBe("Rebuild APK");
    expect(action.kind).toBe("rebuild_optional");
  });

  it("rebuild recommandé si versions différentes", () => {
    const action = resolveBuildApkAction(apk, {
      ...deviceSynced,
      appVersionName: "1.0.15",
      appVersionCode: "15",
    });
    expect(action.kind).toBe("rebuild_recommended");
    expect(action.buttonLabel).toBe("Rebuild APK");
  });

  it("APK prêt app absente — rebuild différé vers étape 2", () => {
    const action = resolveBuildApkAction(apk, {
      id: "R5CT7263YJL",
      status: "device",
      model: "SM-G990B2",
      appInstalled: false,
    });
    expect(action.deferToStep2).toBe(true);
    expect(action.buttonLabel).toMatch(/optionnel/i);
  });
});

describe("resolveDeviceApkAction", () => {
  it("app absente — ton critical", () => {
    const action = resolveDeviceApkAction(
      { id: "x", status: "device", model: "Samsung", appInstalled: false },
      apk,
    );
    expect(action.kind).toBe("install");
    expect(action.tone).toBe("critical");
  });
});

describe("resolveWizardBanner", () => {
  it("oriente vers rebuild quand appareil à jour", () => {
    const banner = resolveWizardBanner(apk, deviceSynced);
    expect(banner.title).toMatch(/synchronisé/i);
    expect(resolveDeviceApkAction(deviceSynced, apk).kind).toBe("up_to_date");
  });
});
