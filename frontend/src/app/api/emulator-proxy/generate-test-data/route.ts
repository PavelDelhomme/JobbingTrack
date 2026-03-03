import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
  'http://localhost:5002';

/**
 * Proxy POST /api/v1/admin/generate-test-data vers la gateway.
 * Évite les 404 si la gateway est sur un autre port ou non exposée côté client.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  let body: { preset?: string; custom?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const url = `${GATEWAY_URL.replace(/\/$/, '')}/api/v1/admin/generate-test-data`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    );
  }
}
