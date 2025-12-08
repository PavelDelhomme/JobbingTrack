import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join, resolve } from 'path'

// Chemin vers les résultats de tests (depuis la racine du projet)
const PROJECT_ROOT = process.cwd().includes('frontend') 
  ? join(process.cwd(), '..')
  : process.cwd()
const TESTS_RESULTS_DIR = process.env.TESTS_RESULTS_DIR || join(PROJECT_ROOT, 'tests', 'results')

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const filePath = searchParams.get('path') // Support legacy

    if (!id && !filePath) {
      return NextResponse.json(
        { success: false, error: 'Paramètre id ou path manquant' },
        { status: 400 }
      )
    }

    // Construire le chemin du fichier
    let fullPath: string
    let fileName: string
    if (id) {
      // Utiliser l'ID (format: YYYYMMDD-HHMMSS)
      fullPath = join(TESTS_RESULTS_DIR, id, 'report.html')
      fileName = `report-${id}.html`
    } else if (filePath) {
      // Support legacy avec path
      if (filePath.startsWith('/') || filePath.includes('..')) {
        const resolved = resolve(TESTS_RESULTS_DIR, filePath.replace(TESTS_RESULTS_DIR, ''))
        if (!resolved.startsWith(resolve(TESTS_RESULTS_DIR))) {
          return NextResponse.json(
            { success: false, error: 'Chemin non autorisé' },
            { status: 403 }
          )
        }
        fullPath = resolved
      } else {
        fullPath = join(TESTS_RESULTS_DIR, filePath)
      }
      fileName = filePath.split('/').pop() || 'report.html'
    } else {
      return NextResponse.json(
        { success: false, error: 'Paramètre manquant' },
        { status: 400 }
      )
    }
    
    // Vérifier que le chemin résolu est bien dans le répertoire autorisé
    const resolvedDir = resolve(TESTS_RESULTS_DIR)
    const resolvedFile = resolve(fullPath)
    if (!resolvedFile.startsWith(resolvedDir)) {
      return NextResponse.json(
        { success: false, error: 'Chemin non autorisé' },
        { status: 403 }
      )
    }

    // Vérifier que le fichier existe
    try {
      await stat(fullPath)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Fichier non trouvé' },
        { status: 404 }
      )
    }

    // Lire le contenu HTML
    const content = await readFile(fullPath, 'utf-8')

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    console.error('Erreur téléchargement rapport:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors du téléchargement du rapport'
      },
      { status: 500 }
    )
  }
}

