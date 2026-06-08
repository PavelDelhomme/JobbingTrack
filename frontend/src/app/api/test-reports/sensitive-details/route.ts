import { NextRequest, NextResponse } from "next/server";
import { appendFile, mkdir } from "fs/promises";
import { join } from "path";
import {
  consumeStepUpToken,
  decodeJwtPayload,
  isElevatedAdmin,
} from "@/lib/test-reports/stepUpAuth";
import { getTestsResultsDir } from "@/lib/test-reports/paths";
import { loadSecuritySensitiveDetails } from "@/lib/test-reports/resolveReport";

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

export async function GET(request: NextRequest) {
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
    if (!userId || !isElevatedAdmin(payload?.role)) {
      return secureJson(
        { success: false, error: "Rôle administrateur requis" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId")?.trim() ?? "";
    const stepUpToken = searchParams.get("stepUpToken")?.trim() ?? "";
    const surface = searchParams.get("surface")?.trim();

    if (!reportId || !stepUpToken) {
      return secureJson(
        {
          success: false,
          error: "Paramètres reportId et stepUpToken requis",
        },
        { status: 400 },
      );
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(reportId)) {
      return secureJson(
        { success: false, error: "Identifiant de rapport invalide" },
        { status: 400 },
      );
    }

    if (!consumeStepUpToken(stepUpToken, String(userId), reportId)) {
      await appendAudit({
        action: "sensitive_access_denied",
        userId,
        reportId,
        reason: "invalid_or_expired_step_up",
      });
      return secureJson(
        {
          success: false,
          error: "Jeton step-up invalide, expiré ou déjà utilisé",
        },
        { status: 403 },
      );
    }

    const surfaces = await loadSecuritySensitiveDetails(reportId, surface);
    if (!surfaces) {
      return secureJson(
        { success: false, error: "Rapport ou détails non trouvés" },
        { status: 404 },
      );
    }

    await appendAudit({
      action: "sensitive_access_granted",
      userId,
      reportId,
      surfaceFilter: surface ?? null,
      surfacesReturned: surfaces.length,
    });

    return secureJson({
      success: true,
      reportId,
      surfaces,
      policy:
        "Données sensibles : consultation unique, pas de cache, ne pas partager.",
    });
  } catch (error: unknown) {
    console.error("[SENSITIVE DETAILS] Erreur:", error);
    return secureJson(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lecture détails sensibles",
      },
      { status: 500 },
    );
  }
}
