import { NextResponse } from 'next/server'

const jsonBody = () =>
  NextResponse.json({
    success: true,
    message: 'Frontend opérationnel',
    service: 'frontend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })

/** Liveness : ne dépend pas de l’API Gateway (contrairement à `GET /api/health`). */
export async function GET() {
  return jsonBody()
}

/** Probes Docker / load-balancer (`wget --spider`, `curl -I`) sans corps JSON. */
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
