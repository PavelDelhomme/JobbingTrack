import { NextRequest } from "next/server";
import { requirePilotageAdmin, securePilotageJson } from "@/lib/pilotage/auth";
import { applyBoardAction, buildPilotageBoard } from "@/lib/pilotage/board";
import {
  isPilotageInteractiveAllowed,
  pilotageEnvDenialMessage,
} from "@/lib/pilotage/envGate";
import { detectRawSecrets } from "@/lib/pilotage/redactSecrets";
import type { DecisionStamp } from "@/lib/pilotage/validationBoardTypes";

type ActionBody = {
  type?: string;
  itemId?: string;
  decision?: string;
  note?: string;
  checklistItemId?: string;
  done?: boolean;
  checklistNote?: string;
  direction?: string;
  cycleId?: string | null;
  column?: string;
  label?: string;
  description?: string;
  inboxKind?: string;
  sourceRef?: string;
};

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

  let body: ActionBody;
  try {
    body = await request.json();
  } catch {
    return securePilotageJson(
      { success: false, error: "JSON invalide" },
      { status: 400 },
    );
  }

  const itemId = String(body.itemId || "").trim();
  if (!itemId) {
    return securePilotageJson(
      { success: false, error: "itemId requis" },
      { status: 400 },
    );
  }

  const note = body.note ? String(body.note).slice(0, 2000) : undefined;
  if (note && detectRawSecrets(note).length) {
    return securePilotageJson(
      { success: false, error: "Note refusée : secret potentiel détecté" },
      { status: 400 },
    );
  }
  if (body.checklistNote && detectRawSecrets(String(body.checklistNote)).length) {
    return securePilotageJson(
      { success: false, error: "Note critère refusée : secret potentiel" },
      { status: 400 },
    );
  }

  // Compat : ancien format { itemId, decision } sans type
  let type = String(body.type || "").toLowerCase();
  if (!type && body.decision) type = "decide";

  if (
    type !== "decide" &&
    type !== "checklist" &&
    type !== "reorder" &&
    type !== "move" &&
    type !== "note" &&
    type !== "setcolumn" &&
    type !== "focus" &&
    type !== "promoteinbox"
  ) {
    return securePilotageJson(
      {
        success: false,
        error:
          "type doit être decide|checklist|reorder|move|note|setColumn|focus|promoteInbox",
      },
      { status: 400 },
    );
  }

  let decision: DecisionStamp | undefined;
  if (body.decision) {
    const raw = String(body.decision).toUpperCase().trim();
    let normalized: DecisionStamp | null = null;
    if (raw === "OK") normalized = "OK";
    else if (raw === "KO") normalized = "KO";
    else if (raw === "PARTIEL") normalized = "PARTIEL";
    else if (raw === "REWORK") normalized = "REWORK";
    else if (
      raw === "PLUS_TARD" ||
      raw === "PLUS TARD" ||
      raw.replace(/\s+/g, "_") === "PLUS_TARD"
    ) {
      normalized = "PLUS_TARD";
    }
    if (!normalized) {
      return securePilotageJson(
        {
          success: false,
          error: "decision doit être OK|KO|PARTIEL|PLUS_TARD|REWORK",
        },
        { status: 400 },
      );
    }
    decision = normalized;
  }

  const direction =
    body.direction === "up" || body.direction === "down"
      ? body.direction
      : undefined;

  const actionType =
    type === "setcolumn"
      ? "setColumn"
      : type === "promoteinbox"
        ? "promoteInbox"
        : (type as
            | "decide"
            | "checklist"
            | "reorder"
            | "move"
            | "note"
            | "focus");

  const inboxKindRaw = body.inboxKind
    ? String(body.inboxKind).toLowerCase()
    : undefined;
  const inboxKind =
    inboxKindRaw === "error" || inboxKindRaw === "feedback"
      ? inboxKindRaw
      : undefined;

  const result = applyBoardAction({
    type: actionType,
    itemId,
    decision,
    note,
    checklistItemId: body.checklistItemId
      ? String(body.checklistItemId)
      : undefined,
    done: typeof body.done === "boolean" ? body.done : undefined,
    checklistNote: body.checklistNote
      ? String(body.checklistNote).slice(0, 300)
      : undefined,
    direction,
    cycleId:
      body.cycleId === null
        ? null
        : body.cycleId !== undefined
          ? String(body.cycleId)
          : undefined,
    column: body.column
      ? (String(body.column) as import("@/lib/pilotage/validationBoardTypes").KanbanColumnId)
      : undefined,
    label: body.label ? String(body.label).slice(0, 200) : undefined,
    description: body.description
      ? String(body.description).slice(0, 2000)
      : undefined,
    inboxKind,
    sourceRef: body.sourceRef
      ? String(body.sourceRef).slice(0, 120)
      : undefined,
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
