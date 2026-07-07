import { NextRequest, NextResponse } from "next/server";
import {
  controllerUnavailableResponse,
  proxyEmulatorGet,
} from "@/lib/server/emulatorProxyFetch";

/** Historique builds — fallback liste vide si contrôleur pas encore redémarré (route absente). */
export async function GET(request: NextRequest) {
  const clientBase = request.nextUrl.searchParams.get("controllerBaseUrl") || undefined;
  const result = await proxyEmulatorGet("/build-history", clientBase, 8000);

  if (!result.ok) {
    return NextResponse.json(controllerUnavailableResponse(result.error), {
      status: result.status || 502,
    });
  }

  if (result.status === 404) {
    return NextResponse.json(
      { history: [], _fallback: "controller_route_missing" },
      { status: 200 },
    );
  }

  return NextResponse.json(result.data, { status: result.status });
}
