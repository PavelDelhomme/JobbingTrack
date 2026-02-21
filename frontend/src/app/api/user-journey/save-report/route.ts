import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Chemin vers les rapports user-journey
const PROJECT_ROOT = process.cwd().includes('frontend') 
  ? join(process.cwd(), '..')
  : process.cwd()
const IS_DOCKER = process.cwd() === '/app' || process.env.DOCKER === 'true'
const REPORTS_DIR = IS_DOCKER
  ? '/app/tests/user-journey-reports'
  : join(PROJECT_ROOT, 'tests', 'user-journey-reports')

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

    // Créer le répertoire s'il n'existe pas
    if (!existsSync(REPORTS_DIR)) {
      await mkdir(REPORTS_DIR, { recursive: true })
    }

    // Générer le nom du fichier avec timestamp (sanitiser le nom pour le système de fichiers)
    const safeName = (journeyName || 'custom').replace(/[^a-zA-Z0-9À-ÿ_-]/g, '-').replace(/-+/g, '-').slice(0, 50)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toTimeString().split(' ')[0].replace(/:/g, '')
    const fileName = `user-journey-${safeName}-${timestamp}.json`
    const filePath = join(REPORTS_DIR, fileName)

    // Sauvegarder le rapport
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

