import {
  isServicesListPath,
  isServicesLogsPath,
  isServicesTabActive,
  pathMatchesHref,
} from "../navPath";

describe("navPath", () => {
  it("distingue liste vs logs (service-logs n’est pas un détail)", () => {
    expect(isServicesListPath("/backoffice/services")).toBe(true);
    expect(isServicesListPath("/backoffice/services/auth-service")).toBe(true);
    expect(isServicesListPath("/backoffice/services/service-logs")).toBe(false);
    expect(isServicesListPath("/backoffice/services/logs")).toBe(false);
    expect(isServicesLogsPath("/backoffice/services/service-logs")).toBe(true);
    expect(isServicesLogsPath("/backoffice/services/logs")).toBe(true);
  });

  it("active le bon onglet ServicesSubNav", () => {
    expect(
      isServicesTabActive("/backoffice/services/service-logs", "/backoffice/services"),
    ).toBe(false);
    expect(
      isServicesTabActive(
        "/backoffice/services/service-logs",
        "/backoffice/services/logs",
      ),
    ).toBe(true);
    expect(
      isServicesTabActive("/backoffice/services/auth-service", "/backoffice/services"),
    ).toBe(true);
  });

  it("résout les alias mobile-logs", () => {
    expect(
      pathMatchesHref(
        "/backoffice/administration/mobile-logs",
        "/backoffice/mobile/logs",
      ),
    ).toBe(true);
  });
});
