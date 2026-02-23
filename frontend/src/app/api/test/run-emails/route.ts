import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_GATEWAY_URL || 'http://localhost:5002'

/** Lance un test email minimal (vérification du service). Pas de rapport généré. */
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    const res = await fetch(`${API_URL}/api/v1/emails/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify({
        to: 'redacted@example.invalid',
        subject: '🧪 Test JobbingTrack (hub)',
        content: '<p>Test lancé depuis le hub Tests.</p>',
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || res.statusText },
        { status: res.status }
      )
    }
    return NextResponse.json({
      success: true,
      message: 'Test email lancé (consultez la page Tests Emails pour plus d’options).',
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
