import {
  getPilotageRuntimeEnv,
  isPilotageInteractiveAllowed,
} from "./envGate";

describe("pilotage envGate", () => {
  const keys = [
    "JT_RUNTIME_ENV",
    "APP_ENV",
    "NEXT_PUBLIC_JT_RUNTIME_ENV",
    "NODE_ENV",
  ] as const;
  const backup: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of keys) backup[k] = process.env[k];
  });

  afterEach(() => {
    for (const k of keys) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  it("autorise development / preprod", () => {
    process.env.JT_RUNTIME_ENV = "preprod";
    process.env.NODE_ENV = "production";
    expect(getPilotageRuntimeEnv()).toBe("preprod");
    expect(isPilotageInteractiveAllowed()).toBe(true);

    process.env.JT_RUNTIME_ENV = "development";
    expect(isPilotageInteractiveAllowed()).toBe(true);
  });

  it("bloque production", () => {
    process.env.JT_RUNTIME_ENV = "production";
    expect(isPilotageInteractiveAllowed()).toBe(false);

    delete process.env.JT_RUNTIME_ENV;
    delete process.env.APP_ENV;
    delete process.env.NEXT_PUBLIC_JT_RUNTIME_ENV;
    process.env.NODE_ENV = "production";
    expect(isPilotageInteractiveAllowed()).toBe(false);
  });
});
