import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_GATEWAY_URL || 'http://localhost:5002'

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    const body = await request.json().catch(() => ({}))
    const res = await fetch(`${API_URL}/api/v1/admin/playwright/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(body.scenarios ? body : { scenarios: [] }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || res.statusText, reportId: undefined },
        { status: res.status }
      )
    }
    return NextResponse.json({
      success: true,
      message: data.message || 'Lancement Playwright effectué',
      executionId: data.executionId,
      reportId: data.reportId ?? data.executionId ?? undefined,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
