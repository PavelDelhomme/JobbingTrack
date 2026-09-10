import { isMailhogUiAvailable } from "../mailhogAvailability";

describe("mailhogAvailability", () => {
  const prev = process.env.NEXT_PUBLIC_MAILHOG_ENABLED;

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_MAILHOG_ENABLED;
    else process.env.NEXT_PUBLIC_MAILHOG_ENABLED = prev;
  });

  it("désactive sur hostname public", () => {
    delete process.env.NEXT_PUBLIC_MAILHOG_ENABLED;
    expect(isMailhogUiAvailable("jobbingtrack.com")).toBe(false);
  });

  it("active sur localhost", () => {
    delete process.env.NEXT_PUBLIC_MAILHOG_ENABLED;
    expect(isMailhogUiAvailable("localhost")).toBe(true);
  });

  it("respecte le flag forcé", () => {
    process.env.NEXT_PUBLIC_MAILHOG_ENABLED = "true";
    expect(isMailhogUiAvailable("jobbingtrack.com")).toBe(true);
  });
});
