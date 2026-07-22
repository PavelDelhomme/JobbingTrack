import { NextRequest } from "next/server";
import { requirePilotageAdmin, securePilotageJson } from "@/lib/pilotage/auth";
import { applyValiderDecision, buildPilotageBoard } from "@/lib/pilotage/board";
import {
  isPilotageInteractiveAllowed,
  pilotageEnvDenialMessage,
} from "@/lib/pilotage/envGate";
import { detectRawSecrets } from "@/lib/pilotage/redactSecrets";

export async function POST(request: NextRequest) {
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

  let body: { itemId?: string; decision?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return securePilotageJson(
      { success: false, error: "JSON invalide" },
      { status: 400 },
    );
  }

  const itemId = String(body.itemId || "").trim();
  const decision = String(body.decision || "").toUpperCase();
  const note = body.note ? String(body.note).slice(0, 500) : undefined;

  if (!itemId) {
    return securePilotageJson(
      { success: false, error: "itemId requis" },
      { status: 400 },
    );
  }
  if (decision !== "OK" && decision !== "KO") {
    return securePilotageJson(
      { success: false, error: "decision doit être OK ou KO" },
      { status: 400 },
    );
  }
  if (note && detectRawSecrets(note).length) {
    return securePilotageJson(
      { success: false, error: "Note refusée : secret potentiel détecté" },
      { status: 400 },
    );
  }

  const result = applyValiderDecision({
    itemId,
    decision: decision as "OK" | "KO",
    note,
  });
  if (!result.ok) {
    return securePilotageJson(
      { success: false, error: result.error },
      { status: 400 },
    );
  }

  return securePilotageJson({
    success: true,
    message: result.message,
    board: buildPilotageBoard(),
  });
}
