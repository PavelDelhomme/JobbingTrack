import { NextRequest } from "next/server";
import { requirePilotageAdmin, securePilotageJson } from "@/lib/pilotage/auth";
import { buildPilotageBoard } from "@/lib/pilotage/board";
import {
  getPilotageRuntimeEnv,
  isPilotageInteractiveAllowed,
} from "@/lib/pilotage/envGate";

export async function GET(request: NextRequest) {
  const auth = requirePilotageAdmin(request);
  if (!auth.ok) {
    return securePilotageJson(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const board = buildPilotageBoard();
  return securePilotageJson({
    success: true,
    interactive: isPilotageInteractiveAllowed(),
    runtimeEnv: getPilotageRuntimeEnv(),
    canWrite:
      auth.role === "SUPER_ADMIN" && isPilotageInteractiveAllowed(),
    board,
  });
}
