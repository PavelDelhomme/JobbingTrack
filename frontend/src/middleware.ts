import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  BACKOFFICE_BASE_PATH,
  BACKOFFICE_LEGACY_PATH,
} from "@/config/backoffice.config";

function hasValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  return (
    token.includes(".") ||
    (process.env.NODE_ENV === "development" &&
      token.startsWith("mock-jwt-token"))
  );
}

function readSessionToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get("token")?.value ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "")
  );
}

function normalizeBackofficePath(pathname: string): string {
  let path = pathname;
  if (
    path === `${BACKOFFICE_BASE_PATH}/services/logs` ||
    path.startsWith(`${BACKOFFICE_BASE_PATH}/services/logs/`)
  ) {
    path = path.replace(
      `${BACKOFFICE_BASE_PATH}/services/logs`,
      `${BACKOFFICE_BASE_PATH}/services/service-logs`,
    );
  }
  return path;
}

/** URL canonique HTTPS dev (proxy 5443). */
function canonicalHttpsOrigin(): string {
  return (
    process.env.DEV_HTTPS_FRONTEND_URL ||
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    process.env.FRONTEND_PUBLIC_URL ||
    "https://jobbingtrack.localhost:5443"
  ).replace(/\/$/, "");
}

/**
 * Interdit l’usage navigateur en clair sur :5003 / :5002.
 * ERR_SSL_PROTOCOL_ERROR = souvent `https://localhost:5003` (TLS sur un port HTTP).
 */
function redirectPlainHttpDevPorts(request: NextRequest): NextResponse | null {
  const host = (request.headers.get("host") || "").toLowerCase();
  const xfProto = (
    request.headers.get("x-forwarded-proto") || ""
  ).toLowerCase();

  const isDevHttpPort =
    /^(localhost|127\.0\.0\.1):(5003|5002)$/.test(host) ||
    /^\[::1\]:(5003|5002)$/.test(host);

  // Accès direct Next/gateway sans proxy TLS
  if (isDevHttpPort && xfProto !== "https") {
    const target = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      canonicalHttpsOrigin(),
    );
    return NextResponse.redirect(target, 308);
  }

  return null;
}

export function middleware(request: NextRequest) {
  const httpsRedirect = redirectPlainHttpDevPorts(request);
  if (httpsRedirect) return httpsRedirect;

  const { pathname } = request.nextUrl;

  // Ancien alias → chemin canonique /backoffice (auth identique).
  if (
    pathname === BACKOFFICE_LEGACY_PATH ||
    pathname.startsWith(`${BACKOFFICE_LEGACY_PATH}/`)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(
      BACKOFFICE_LEGACY_PATH,
      BACKOFFICE_BASE_PATH,
    );
    return NextResponse.redirect(url, 308);
  }

  if (
    pathname === BACKOFFICE_BASE_PATH ||
    pathname.startsWith(`${BACKOFFICE_BASE_PATH}/`)
  ) {
    const token = readSessionToken(request);
    if (!hasValidSessionToken(token)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const normalized = normalizeBackofficePath(pathname);
    if (normalized !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = normalized;
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  const token = readSessionToken(request);
  if (pathname === "/login" && hasValidSessionToken(token)) {
    return NextResponse.redirect(new URL(BACKOFFICE_BASE_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Inclure la racine et pages publiques pour forcer la redirection HTTPS.
  matcher: [
    "/",
    "/login",
    "/backoffice/:path*",
    "/b4ck0ff1ce/:path*",
    "/((?!_next/static|_next/image|favicon.ico|health|api/).*)",
  ],
};
