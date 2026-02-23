import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { getProjectRoot, isRunningInFrontendContainer } from '../testRunnerUtils'

const RUN_TIMEOUT_MS = 120000

function extractReportId(stdout: string): string | null {
  const match = stdout.match(/\d{8}-\d{6}/)
  return match ? match[0] : null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const testName = body.testName || 'Tests Sécurité'
    const projectRoot = getProjectRoot()
    const scriptPath = `${projectRoot}/scripts/generate-test-report.sh`
    const inContainer = isRunningInFrontendContainer()
    const testCommand = inContainer
      ? 'cd /app/tests && node security/test-security.js'
      : 'make test-security'
    const command = `cd "${projectRoot}" && sh "${scriptPath}" security "${testCommand}" "${testName}"`

    let stdout = ''
    let reportId: string | null = null
    try {
      stdout = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: RUN_TIMEOUT_MS,
        env: {
          ...process.env,
          TESTS_RESULTS_DIR: process.env.TESTS_RESULTS_DIR || (inContainer ? '/tmp/tests/results' : undefined),
        },
      })
      reportId = extractReportId(stdout)
    } catch (err: unknown) {
      const execErr = err as { stdout?: string; message?: string }
      reportId = execErr.stdout ? extractReportId(execErr.stdout) : null
      if (reportId) {
        return NextResponse.json({
          success: false,
          message: 'Tests terminés avec des échecs',
          reportId,
          reportLocation: 'tests/results/',
          error: (err as Error).message || 'Erreur exécution tests sécurité',
        })
      }
      return NextResponse.json({
        success: false,
        error: (err as Error).message || 'Erreur exécution tests sécurité',
        reportId: undefined,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Rapport généré',
      reportId,
      reportLocation: 'tests/results/',
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
