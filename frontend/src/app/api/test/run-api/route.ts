import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { getProjectRoot } from '../testRunnerUtils'

const RUN_TIMEOUT_MS = 120000 // 2 min

function extractReportId(stdout: string): string | null {
  const match = stdout.match(/\d{8}-\d{6}/)
  return match ? match[0] : null
}

export async function POST(request: NextRequest) {
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

    const command = `cd "${projectRoot}" && sh "${scriptDir}/generate-test-report.sh" api "${testCommand}" "${testName}"`

    let stdout = ''
    let reportId: string | null = null
    try {
      stdout = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: RUN_TIMEOUT_MS,
      })
      reportId = extractReportId(stdout)
    } catch (err: unknown) {
      const execErr = err as { stdout?: string; stderr?: string; message?: string }
      stdout = execErr.stdout || ''
      reportId = extractReportId(stdout)
      return NextResponse.json({
        success: false,
        error: execErr.message || 'Erreur lors de l’exécution des tests',
        reportId: reportId || undefined,
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

