import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { getProjectRoot, isRunningInFrontendContainer } from '../testRunnerUtils'

// Côté serveur (conteneur frontend), utiliser l'URL interne Docker pour joindre l'API gateway
const API_URL = process.env.API_GATEWAY_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'

const TESTS_TAG = '[TESTS PLAYWRIGHT]'
const RUN_TIMEOUT_MS = 300000 // 5 min pour toute la suite Playwright

function extractReportId(stdout: string): string | null {
  const match = stdout.match(/\d{8}-\d{6}/)
  return match ? match[0] : null
}

/** Lance la suite Playwright complète (même pattern que run-backoffice) et retourne le reportId. */
async function runFullPlaywrightSuite(): Promise<{ success: boolean; reportId?: string; error?: string }> {
  const projectRoot = getProjectRoot()
  const scriptPath = `${projectRoot}/scripts/generate-test-report.sh`
  const inContainer = isRunningInFrontendContainer()
  const testCommand = inContainer ? 'npm run test:e2e' : 'make test-e2e'
  const command = `cd "${projectRoot}" && sh "${scriptPath}" playwright "${testCommand}" "Tests Playwright"`
  try {
    const stdout = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: RUN_TIMEOUT_MS,
      env: {
        ...process.env,
        TESTS_RESULTS_DIR: process.env.TESTS_RESULTS_DIR || (inContainer ? '/tmp/tests/results' : undefined),
      },
    })
    const reportId = extractReportId(stdout)
    return { success: true, reportId: reportId ?? undefined }
  } catch (err: unknown) {
    const execErr = err as { stdout?: string }
    const reportId = execErr.stdout ? extractReportId(execErr.stdout) : null
    return {
      success: false,
      reportId: reportId ?? undefined,
      error: (err as Error).message,
    }
  }
}

export async function POST(request: NextRequest) {
  console.log(`${TESTS_TAG} Démarrage des Tests Playwright depuis le backoffice — ${new Date().toLocaleString('fr-FR', { timeZone: process.env.TZ || 'Europe/Paris' })}`)
  try {
    const body = await request.json().catch(() => ({}))
    const scenarios = body?.scenarios
    // Pas de scénarios = lancer toute la suite (hub ou page sans sélection). Évite 400 "Aucun scénario fourni".
    const hasScenarios = Array.isArray(scenarios) && scenarios.length > 0

    if (!hasScenarios) {
      const result = await runFullPlaywrightSuite()
      console.log(`${TESTS_TAG} Fin — ${new Date().toLocaleString('fr-FR', { timeZone: process.env.TZ || 'Europe/Paris' })} — rapport: ${result.reportId ?? 'N/A'}`)
      if (result.reportId && !result.success) {
        return NextResponse.json({
          success: false,
          message: 'Tests Playwright terminés avec des échecs',
          reportId: result.reportId,
          reportLocation: 'tests/results/',
          error: result.error,
        })
      }
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Échec exécution Playwright', reportId: result.reportId },
          { status: 500 }
        )
      }
      return NextResponse.json({
        success: true,
        message: 'Rapport Playwright généré',
        reportId: result.reportId,
        reportLocation: 'tests/results/',
      })
    }

    // Scénarios fournis (page Playwright custom) : appeler l'API admin
    const auth = request.headers.get('authorization')
    const res = await fetch(`${API_URL}/api/v1/admin/playwright/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.log(`${TESTS_TAG} Fin (erreur API) — ${new Date().toLocaleString('fr-FR', { timeZone: process.env.TZ || 'Europe/Paris' })}`)
      return NextResponse.json(
        { success: false, error: data.error || data.message || res.statusText, reportId: undefined },
        { status: res.status }
      )
    }
    console.log(`${TESTS_TAG} Fin — ${new Date().toLocaleString('fr-FR', { timeZone: process.env.TZ || 'Europe/Paris' })} — executionId: ${data.executionId ?? 'N/A'}`)
    return NextResponse.json({
      success: true,
      message: data.message || 'Lancement Playwright effectué',
      executionId: data.executionId,
      reportId: data.reportId ?? data.executionId ?? undefined,
    })
  } catch (error: unknown) {
    console.log(`${TESTS_TAG} Fin (erreur) — ${new Date().toLocaleString('fr-FR', { timeZone: process.env.TZ || 'Europe/Paris' })}`)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
