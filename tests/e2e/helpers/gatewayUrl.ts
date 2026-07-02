/**
 * Base URL API Gateway pour Playwright (processus sur l'hôte).
 * Logique alignée sur scripts/lib/gateway-url.js (perspective host).
 */
export function e2eGatewayBaseUrl(): string {
  const override = process.env.PLAYWRIGHT_API_GATEWAY_URL?.trim();
  if (override) return override.replace(/\/$/, "");

  const hostOverride = process.env.API_GATEWAY_HOST_URL?.trim();
  if (hostOverride) return hostOverride.replace(/\/$/, "");

  const raw =
    process.env.API_GATEWAY_URL?.trim() ||
    process.env.API_URL?.trim() ||
    "http://localhost:5002";
  const u = raw.replace(/\/$/, "");
  try {
    const parsed = new URL(u);
    const pubPort = process.env.API_GATEWAY_PORT?.trim() || "5002";
    const intPort = process.env.API_GATEWAY_INTERNAL_PORT?.trim() || "3000";
    if (
      parsed.hostname === "api-gateway" ||
      parsed.hostname === "jobbingtrack-api-gateway"
    ) {
      return `http://127.0.0.1:${pubPort}`;
    }
    if (
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      parsed.port === intPort &&
      intPort !== pubPort
    ) {
      return `http://127.0.0.1:${pubPort}`;
    }
  } catch {
    return `http://127.0.0.1:${process.env.API_GATEWAY_PORT?.trim() || "5002"}`;
  }
  return u;
}
