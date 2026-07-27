import { NextRequest } from "next/server";
import { PILOTAGE_FILES } from "@/lib/pilotage/allowedFiles";
import { displayDocsPath } from "@/lib/pilotage/paths";
import {
  requirePilotageAdmin,
  securePilotageJson,
} from "@/lib/pilotage/auth";

/** Liste des fichiers pilotage autorisés (ADMIN+). */
export async function GET(request: NextRequest) {
  const auth = requirePilotageAdmin(request);
  if (!auth.ok) {
    return securePilotageJson(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  return securePilotageJson({
    success: true,
    canWrite: auth.role === "SUPER_ADMIN",
    files: PILOTAGE_FILES.map((f) => ({
      id: f.id,
      label: f.label,
      description: f.description,
      writable: f.writable && auth.role === "SUPER_ADMIN",
      contentType: f.contentType,
      path: displayDocsPath(f),
      sensitive: !!f.sensitive,
    })),
  });
}
