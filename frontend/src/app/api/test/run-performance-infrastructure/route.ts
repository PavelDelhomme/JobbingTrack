import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { getProjectRoot, isRunningInFrontendContainer } from '../testRunnerUtils'

const TAG = '[TESTS PERFORMANCE-INFRA]'
const RUN_TIMEOUT_MS = 600_000

export async function POST(_request: NextRequest) {
  console.log(`${TAG} Démarrage — ${new Date().toLocaleString('fr-FR', { timeZone: process.env.TZ || 'Europe/Paris' })}`)
  const projectRoot = getProjectRoot()
  const inContainer = isRunningInFrontendContainer()

  if (inContainer) {
    console.log(`${TAG} Conteneur frontend : make / stack hôte non disponibles — réponse « skipped »`)
    return NextResponse.json({
      success: true,
      skipped: true,
      message:
        'Dans le conteneur Next, lancer plutôt `make test-database` sur l’hôte ou en CI (connexion Prisma / schéma / enums).',
    })
  }

  try {
    const command = `cd "${projectRoot}" && make -s test-database`
    const stdout = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 20 * 1024 * 1024,
      timeout: RUN_TIMEOUT_MS,
      env: { ...process.env, TEST_NOPROMPT: process.env.TEST_NOPROMPT || '1' },
    })
    console.log(`${TAG} Fin OK — ${new Date().toLocaleString('fr-FR', { timeZone: process.env.TZ || 'Europe/Paris' })}`)
    return NextResponse.json({
      success: true,
      message: 'Suite test-database terminée (voir terminal / logs make).',
      tail: stdout.slice(-4000),
    })
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string }
    console.log(`${TAG} Fin erreur — ${e.message ?? err}`)
    return NextResponse.json(
      {
        success: false,
        error: e.message ?? String(err),
        tail: (e.stdout || e.stderr || '').slice(-4000),
      },
      { status: 500 }
    )
  }
}
