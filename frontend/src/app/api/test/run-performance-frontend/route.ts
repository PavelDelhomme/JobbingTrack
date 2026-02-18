import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { getProjectRoot } from '../testRunnerUtils'

const RUN_TIMEOUT_MS = 120000
function extractReportId(stdout: string): string | null {
  const match = stdout.match(/\d{8}-\d{6}/)
  return match ? match[0] : null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const testName = body.testName || 'Tests Performance Frontend'
    const projectRoot = getProjectRoot()
    const scriptPath = `${projectRoot}/scripts/generate-test-report.sh`
    const command = `cd "${projectRoot}" && sh "${scriptPath}" performance-frontend "make test-performance-frontend" "${testName}"`
    let stdout = ''
    let reportId: string | null = null
    try {
      stdout = execSync(command, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, timeout: RUN_TIMEOUT_MS })
      reportId = extractReportId(stdout)
    } catch (err: unknown) {
      const execErr = err as { stdout?: string }
      reportId = execErr.stdout ? extractReportId(execErr.stdout) : null
      return NextResponse.json({ success: false, error: (err as Error).message, reportId: reportId || undefined }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: 'Rapport généré', reportId, reportLocation: 'tests/results/' })
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }, { status: 500 })
  }
}

