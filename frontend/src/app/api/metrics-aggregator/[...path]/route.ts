import { NextRequest, NextResponse } from "next/server";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function getMetricsBaseUrl(): string {
  return (
    process.env.METRICS_AGGREGATOR_INTERNAL_URL ||
    (process.env.PROJECT_ROOT === "/app"
      ? `http://jobbingtrack-metrics-aggregator:${process.env.METRICS_AGGREGATOR_INTERNAL_PORT || "3014"}`
      : `http://127.0.0.1:${process.env.METRICS_AGGREGATOR_PORT || "5004"}`)
  ).replace(/\/$/, "");
}

function buildTargetUrl(request: NextRequest, pathParts: string[]): string {
  const rawPath = pathParts.join("/");
  const normalizedPath = rawPath.startsWith("api/v1/")
    ? rawPath.slice("api/v1/".length)
    : rawPath;
  const target = new URL(`/api/v1/${normalizedPath}`, getMetricsBaseUrl());
  target.search = request.nextUrl.search;
  return target.toString();
}

type RouteContext = { params: Promise<{ path?: string[] }> };

async function proxy(request: NextRequest, context: RouteContext) {
  const apiKey = process.env.METRICS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "METRICS_API_KEY manquant côté serveur frontend",
      },
      { status: 500 },
    );
  }

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  }
  headers.set("X-API-Key", apiKey);

  const params = await context.params;
  const response = await fetch(buildTargetUrl(request, params.path || []), {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.arrayBuffer(),
    cache: "no-store",
  });

  const responseHeaders = new Headers(response.headers);
  for (const key of HOP_BY_HOP_HEADERS) responseHeaders.delete(key);

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
