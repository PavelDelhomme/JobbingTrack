import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { getProjectRoot } from '../testRunnerUtils'

const RUN_TIMEOUT_MS = 120000 // 2 min

function extractReportId(stdout: string): string | null {
  const match = stdout.match(/\d{8}-\d{6}/)
  return match ? match[0] : null
}

/** URL de l’API pour les scripts de test. En Docker (frontend), utiliser le service api-gateway sur le réseau interne. */
function getApiUrlForTests(): string {
  const envUrl = process.env.API_GATEWAY_URL || process.env.API_URL
  if (envUrl && envUrl.trim()) return envUrl.trim()
  const root = process.env.PROJECT_ROOT || ''
  if (root === '/app') return 'http://api-gateway:3000'
  return 'http://localhost:5002'
}

export async function POST(request: NextRequest) {
  // Log visible dans les logs du conteneur frontend quand on lance les Tests API depuis le backoffice
  const startLabel = `[TESTS API] Démarrage des Tests API depuis le backoffice — ${new Date().toISOString()}`
  console.log(startLabel)

  try {
    const body = await request.json().catch(() => ({}))
    const testName = body.testName || 'Tests API'
    const tests = body.tests || [] // Liste des tests à exécuter (health, contacts, etc.)

    const projectRoot = getProjectRoot()
    const scriptDir = `${projectRoot}/scripts`
    let testCommand = 'make test-api'
    if (tests && tests.length > 0) {
      const testTypes = tests.join(',')
      testCommand = `sh "${scriptDir}/test-api-specific.sh" "${testTypes}"`
    }
    // Passer la commande entre guillemets simples pour que le shell transmette un seul argument à generate-test-report.sh
    const safeCommand = testCommand.replace(/'/g, "'\"'\"'")
    const safeName = (testName || '').toString().replace(/"/g, '\\"')

    const command = `cd "${projectRoot}" && sh "${scriptDir}/generate-test-report.sh" api '${safeCommand}' "${safeName}"`

    const apiUrl = getApiUrlForTests()
    const metricsAggregatorUrl = process.env.METRICS_AGGREGATOR_URL || (process.env.PROJECT_ROOT === '/app' ? 'http://jobbingtrack-metrics-aggregator:3014' : 'http://localhost:5004')
    const env = { ...process.env, API_URL: apiUrl, METRICS_AGGREGATOR_URL: metricsAggregatorUrl }

    let stdout = ''
    let reportId: string | null = null
    try {
      stdout = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: RUN_TIMEOUT_MS,
        env,
      })
      reportId = extractReportId(stdout)
    } catch (err: unknown) {
      const execErr = err as { stdout?: string; stderr?: string; message?: string; status?: number }
      stdout = execErr.stdout || ''
      reportId = extractReportId(stdout)
      const errorMessage = execErr.message || 'Erreur lors de l’exécution des tests'
      // Si un rapport a tout de même été généré (script a écrit le rapport puis exit 1), retourner 200 pour permettre de l’ouvrir
      if (reportId) {
        return NextResponse.json({
          success: false,
          error: errorMessage,
          reportId,
          reportLocation: 'tests/results/',
          selectedTests: tests,
        }, { status: 200 })
      }
      return NextResponse.json({
        success: false,
        error: errorMessage,
        reportId: undefined,
        selectedTests: tests,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Rapport généré${tests.length > 0 ? ` (${tests.length} test(s))` : ''}`,
      reportId,
      reportLocation: 'tests/results/',
      selectedTests: tests,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

