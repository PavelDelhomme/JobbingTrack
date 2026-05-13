import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { getProjectRoot, isRunningInFrontendContainer } from '../testRunnerUtils'

const RUN_TIMEOUT_MS = 120000
const TESTS_TAG = '[TESTS FRONTEND]'

function extractReportId(stdout: string): string | null {
  const match = stdout.match(/\d{8}-\d{6}/)
  return match ? match[0] : null
}

export async function POST(request: NextRequest) {
  console.log(`${TESTS_TAG} Démarrage des Tests Frontend depuis le backoffice — ${new Date().toLocaleString('fr-FR', { timeZone: process.env.TZ || 'Europe/Paris' })}`)
  try {
    const body = await request.json().catch(() => ({}))
    const testName = body.testName || 'Tests Frontend'
    const projectRoot = getProjectRoot()
    const scriptPath = `${projectRoot}/scripts/reports/generate-test-report.sh`
    const inContainer = isRunningInFrontendContainer()
    const testCommand = inContainer ? 'npm run test:unit' : 'make test-frontend'
    const command = `cd "${projectRoot}" && sh "${scriptPath}" frontend "${testCommand}" "${testName}"`
    let stdout = ''
    let reportId: string | null = null
    try {
      stdout = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: RUN_TIMEOUT_MS,
        env: { ...process.env, TESTS_RESULTS_DIR: process.env.TESTS_RESULTS_DIR || undefined },
      })
      reportId = extractReportId(stdout)
    } catch (err: unknown) {
      const execErr = err as { stdout?: string }
      reportId = execErr.stdout ? extractReportId(execErr.stdout) : null
      console.log(`${TESTS_TAG} Fin (échec) — ${new Date().toLocaleString('fr-FR', { timeZone: process.env.TZ || 'Europe/Paris' })} — rapport: ${reportId ?? 'N/A'}`)
      // Rapport généré mais tests en échec → 200 pour que l'UI affiche le rapport
      if (reportId) {
        return NextResponse.json({
          success: false,
          message: 'Tests terminés avec des échecs',
          reportId,
          reportLocation: 'tests/results/',
          error: (err as Error).message,
        })
      }
      return NextResponse.json({ success: false, error: (err as Error).message, reportId: undefined }, { status: 500 })
    }
    console.log(`${TESTS_TAG} Fin — ${new Date().toLocaleString('fr-FR', { timeZone: process.env.TZ || 'Europe/Paris' })} — rapport: ${reportId ?? 'N/A'}`)
    return NextResponse.json({ success: true, message: 'Rapport généré', reportId, reportLocation: 'tests/results/' })
  } catch (error: unknown) {
    console.log(`${TESTS_TAG} Fin (erreur) — ${new Date().toLocaleString('fr-FR', { timeZone: process.env.TZ || 'Europe/Paris' })}`)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }, { status: 500 })
  }
}

