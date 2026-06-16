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

export function middleware(request: NextRequest) {
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
  matcher: ["/login", "/backoffice/:path*", "/b4ck0ff1ce/:path*"],
};
