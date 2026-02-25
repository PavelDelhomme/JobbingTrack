import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { getProjectRoot } from '../testRunnerUtils'

const RUN_TIMEOUT_MS = 120000 // 2 min

/** Lance les tests Playwright Emails + MailHog (spec admin-emails-mailhog). */
export async function POST() {
  try {
    const projectRoot = getProjectRoot()
    const command = `cd "${projectRoot}/tests" && npx playwright test e2e/specs/admin-emails-mailhog.spec.ts --config=e2e/playwright.config.ts --reporter=list`
    const stdout = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 2 * 1024 * 1024,
      timeout: RUN_TIMEOUT_MS,
      env: { ...process.env, CI: '1' },
    })
    return NextResponse.json({
      success: true,
      message: 'Tests Emails MailHog terminés',
      output: stdout,
    })
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string }
    const output = [execErr.stdout, execErr.stderr].filter(Boolean).join('\n')
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message,
        output: output || undefined,
      },
      { status: 500 }
    )
  }
}
