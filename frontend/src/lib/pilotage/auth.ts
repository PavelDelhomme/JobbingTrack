import { NextRequest, NextResponse } from "next/server";
import {
  decodeJwtPayload,
  isElevatedAdmin,
} from "@/lib/test-reports/stepUpAuth";

export function securePilotageJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export type PilotageAuth =
  | { ok: true; userId: string; role: string; email?: string }
  | { ok: false; status: number; error: string };

export function requirePilotageAdmin(
  request: NextRequest,
  opts?: { superAdminWrite?: boolean },
): PilotageAuth {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (!bearer) {
    return { ok: false, status: 401, error: "Authentification requise" };
  }
  const payload = decodeJwtPayload(bearer);
  const userId = payload?.sub || payload?.userId;
  const role = payload?.role || "";
  if (!userId || !isElevatedAdmin(role)) {
    return { ok: false, status: 403, error: "Rôle administrateur requis" };
  }
  if (opts?.superAdminWrite && role !== "SUPER_ADMIN") {
    return {
      ok: false,
      status: 403,
      error: "Écriture réservée au SUPER_ADMIN",
    };
  }
  return { ok: true, userId, role, email: payload?.email };
}
