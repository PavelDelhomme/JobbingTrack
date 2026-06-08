import { NextRequest, NextResponse } from "next/server";
import { appendFile, mkdir } from "fs/promises";
import { join } from "path";
import {
  decodeJwtPayload,
  isElevatedAdmin,
  issueStepUpToken,
  stepUpTtlSeconds,
} from "@/lib/test-reports/stepUpAuth";
import { getTestsResultsDir } from "@/lib/test-reports/paths";
import { resolveReportDirectory } from "@/lib/test-reports/resolveReport";

function secureJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

async function appendAudit(entry: Record<string, unknown>) {
  const auditDir = join(getTestsResultsDir(), "security-audit");
  await mkdir(auditDir, { recursive: true });
  const line = `${JSON.stringify({ ...entry, at: new Date().toISOString() })}\n`;
  await appendFile(join(auditDir, "step-up.jsonl"), line, "utf8");
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    if (!bearer) {
      return secureJson(
        { success: false, error: "Authentification requise" },
        { status: 401 },
      );
    }

    const payload = decodeJwtPayload(bearer);
    const userId = payload?.sub || payload?.userId;
    const email = payload?.email;
    if (!userId || !email || !isElevatedAdmin(payload?.role)) {
      return secureJson(
        { success: false, error: "Rôle administrateur requis" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const reportId = String(body.reportId ?? "").trim();
    const password = String(body.password ?? "");
    if (!reportId || !password) {
      return secureJson(
        { success: false, error: "reportId et password requis" },
        { status: 400 },
      );
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(reportId)) {
      return secureJson(
        { success: false, error: "Identifiant de rapport invalide" },
        { status: 400 },
      );
    }

    const reportDir = await resolveReportDirectory(reportId);
    if (!reportDir) {
      return secureJson(
        { success: false, error: "Rapport non trouvé" },
        { status: 404 },
      );
    }

    const apiBase =
      process.env.API_GATEWAY_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://api-gateway:3000";

    const loginRes = await fetch(`${apiBase}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    if (!loginRes.ok) {
      await appendAudit({
        action: "step_up_denied",
        userId,
        reportId,
        reason: "invalid_password",
      });
      return secureJson(
        { success: false, error: "Mot de passe incorrect" },
        { status: 401 },
      );
    }

    const stepUpToken = issueStepUpToken(String(userId), reportId);
    await appendAudit({
      action: "step_up_granted",
      userId,
      reportId,
      ttlSeconds: stepUpTtlSeconds(),
    });

    return secureJson({
      success: true,
      stepUpToken,
      expiresInSeconds: stepUpTtlSeconds(),
      message:
        "Accès sensible accordé pour une consultation unique et courte durée.",
    });
  } catch (error: unknown) {
    console.error("[SENSITIVE STEP-UP] Erreur:", error);
    return secureJson(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erreur step-up auth",
      },
      { status: 500 },
    );
  }
}
