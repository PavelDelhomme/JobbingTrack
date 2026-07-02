import { NextRequest, NextResponse } from "next/server";
import {
  controllerUnavailableResponse,
  proxyEmulatorGet,
  proxyEmulatorPost,
} from "@/lib/server/emulatorProxyFetch";

export const maxDuration = 300;

function clientBaseFromRequest(request: NextRequest): string | undefined {
  return request.nextUrl.searchParams.get("controllerBaseUrl") || undefined;
}

async function readJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const segment = `/${(path || []).join("/")}`;
  const clientBase = clientBaseFromRequest(request);

  const result = await proxyEmulatorGet(segment, clientBase);
  if (!result.ok) {
    return NextResponse.json(controllerUnavailableResponse(result.error), {
      status: result.status || 502,
    });
  }

  if (result.buffer) {
    return new NextResponse(result.buffer, {
      status: result.status,
      headers: {
        "Content-Type": result.contentType || "application/octet-stream",
        ...(segment === "/download-apk"
          ? { "Content-Disposition": 'attachment; filename="app-debug.apk"' }
          : {}),
      },
    });
  }

  return NextResponse.json(result.data, { status: result.status });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const segment = `/${(path || []).join("/")}`;
  const body = await readJsonBody(request);
  const clientBase =
    typeof body.controllerBaseUrl === "string" ? body.controllerBaseUrl : undefined;

  const result = await proxyEmulatorPost(segment, body, clientBase);
  if (!result.ok) {
    return NextResponse.json(
      {
        ...controllerUnavailableResponse(result.error),
        _triedPath: segment,
      },
      { status: result.status || 502 },
    );
  }

  return NextResponse.json(result.data, { status: result.status });
}
