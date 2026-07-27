import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { requirePilotageAdmin, securePilotageJson } from "@/lib/pilotage/auth";
import {
  isPilotageInteractiveAllowed,
  pilotageEnvDenialMessage,
} from "@/lib/pilotage/envGate";
import { displayDocsPath, resolvePilotageById } from "@/lib/pilotage/paths";
import {
  detectRawSecrets,
  redactPilotageSecrets,
} from "@/lib/pilotage/redactSecrets";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const auth = requirePilotageAdmin(request);
  if (!auth.ok) {
    return securePilotageJson(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const { id } = await context.params;
  const resolved = resolvePilotageById(id);
  if (!resolved.ok) {
    return securePilotageJson(
      { success: false, error: resolved.error },
      { status: 404 },
    );
  }

  if (!fs.existsSync(resolved.absPath)) {
    return securePilotageJson(
      { success: false, error: "Fichier introuvable sur le disque" },
      { status: 404 },
    );
  }

  const raw = fs.readFileSync(resolved.absPath, "utf8");
  const { content, redactedCount } = redactPilotageSecrets(raw);

  return securePilotageJson({
    success: true,
    file: {
      id: resolved.meta.id,
      label: resolved.meta.label,
      description: resolved.meta.description,
      path: displayDocsPath(resolved.meta),
      contentType: resolved.meta.contentType,
      writable: resolved.meta.writable && auth.role === "SUPER_ADMIN",
      sensitive: !!resolved.meta.sensitive,
      content,
      redactedCount,
      bytes: Buffer.byteLength(raw, "utf8"),
      mtime: fs.statSync(resolved.absPath).mtime.toISOString(),
    },
  });
}

export async function PUT(request: NextRequest, context: Ctx) {
  const auth = requirePilotageAdmin(request, { superAdminWrite: true });
  if (!auth.ok) {
    return securePilotageJson(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (!isPilotageInteractiveAllowed()) {
    return securePilotageJson(
      { success: false, error: pilotageEnvDenialMessage() },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const resolved = resolvePilotageById(id);
  if (!resolved.ok) {
    return securePilotageJson(
      { success: false, error: resolved.error },
      { status: 404 },
    );
  }

  if (!resolved.meta.writable) {
    return securePilotageJson(
      { success: false, error: "Fichier en lecture seule" },
      { status: 403 },
    );
  }

  let body: { content?: unknown };
  try {
    body = await request.json();
  } catch {
    return securePilotageJson(
      { success: false, error: "JSON invalide" },
      { status: 400 },
    );
  }

  if (typeof body.content !== "string") {
    return securePilotageJson(
      { success: false, error: "Champ content (string) requis" },
      { status: 400 },
    );
  }

  if (body.content.length > 2_000_000) {
    return securePilotageJson(
      { success: false, error: "Contenu trop volumineux" },
      { status: 413 },
    );
  }

  const secrets = detectRawSecrets(body.content);
  if (secrets.length > 0) {
    return securePilotageJson(
      {
        success: false,
        error:
          "Contenu refusé : secrets potentiels détectés. Ne collez pas de mots de passe / clés API / tokens dans les docs pilotage.",
        hints: secrets.map((s) => s.slice(0, 24) + "…"),
      },
      { status: 400 },
    );
  }

  if (resolved.meta.contentType === "json") {
    try {
      JSON.parse(body.content);
    } catch {
      return securePilotageJson(
        { success: false, error: "JSON invalide" },
        { status: 400 },
      );
    }
  }

  fs.writeFileSync(resolved.absPath, body.content, "utf8");

  // Miroir frontend UNIQUEMENT pour suivi-actif.
  // validation-board (sensitive) : jamais de copie public/ — API ADMIN only.
  if (resolved.meta.id === "SUIVI_ACTIF" && !resolved.meta.sensitive) {
    const mirrors = [
      `${resolved.root}/frontend/src/lib/pilotage/suiviActif.json`,
      `${resolved.root}/frontend/public/pilotage/suivi-actif.json`,
    ];
    for (const mirror of mirrors) {
      try {
        fs.mkdirSync(path.dirname(mirror), { recursive: true });
        fs.writeFileSync(mirror, body.content, "utf8");
      } catch {
        // miroir best-effort
      }
    }
  }

  return securePilotageJson({
    success: true,
    message: "Fichier enregistré",
    file: {
      id: resolved.meta.id,
      path: displayDocsPath(resolved.meta),
      mtime: new Date().toISOString(),
      writtenBy: auth.email || auth.userId,
    },
  });
}
