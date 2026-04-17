/**
 * Base URL de l’API Gateway pour Playwright (processus sur l’hôte, hors réseau Docker).
 * Si le `.env` exporte `API_GATEWAY_URL=http://api-gateway:3000` (nom de service Compose),
 * `getaddrinfo ENOTFOUND api-gateway` survient : on retombe sur le port **hôte** (5002 par défaut).
 */
export function e2eGatewayBaseUrl(): string {
  const override = process.env.PLAYWRIGHT_API_GATEWAY_URL?.trim();
  if (override) return override.replace(/\/$/, '');

  const raw =
    process.env.API_GATEWAY_URL?.trim() ||
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    'http://localhost:5002';
  const u = raw.replace(/\/$/, '');
  try {
    const parsed = new URL(u);
    if (parsed.hostname === 'api-gateway') {
      const port = process.env.API_GATEWAY_PORT?.trim() || '5002';
      return `http://127.0.0.1:${port}`;
    }
  } catch {
    return 'http://localhost:5002';
  }
  return u;
}
