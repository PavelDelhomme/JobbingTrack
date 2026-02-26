import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

function resolveReportsDir(): string {
  if (process.env.USER_JOURNEY_REPORTS_DIR) return process.env.USER_JOURNEY_REPORTS_DIR
  const cwd = process.cwd()
  const isDocker = cwd === '/app' || process.env.DOCKER === 'true'
  const projectRoot = process.env.PROJECT_ROOT
    || (isDocker ? '/app' : (cwd.includes('frontend') ? join(cwd, '..') : cwd))
  return join(projectRoot, 'tests', 'user-journey-reports')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportData, journeyName } = body

    if (!reportData) {
      return NextResponse.json(
        { success: false, error: 'Données du rapport manquantes' },
        { status: 400 }
      )
    }

    const reportsDir = resolveReportsDir()
    await mkdir(reportsDir, { recursive: true })

    const safeName = (journeyName || 'custom')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 10) + '_' +
      now.toTimeString().slice(0, 8).replace(/:/g, '')
    const fileName = `user-journey-${safeName}-${timestamp}.json`
    const filePath = join(reportsDir, fileName)

    await writeFile(filePath, JSON.stringify(reportData, null, 2), 'utf-8')

    return NextResponse.json({
      success: true,
      message: 'Rapport sauvegardé',
      filePath: fileName
    })
  } catch (error: any) {
    console.error('Erreur sauvegarde rapport user-journey:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

