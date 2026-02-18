import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join, resolve } from 'path'

// ✅ Détecter si on est dans Docker ou sur l'hôte
const IS_DOCKER = process.cwd() === '/app' || process.env.DOCKER === 'true'
const PROJECT_ROOT = IS_DOCKER
  ? '/app'
  : (process.cwd().includes('frontend') 
      ? join(process.cwd(), '..')
      : process.cwd())

// Dossiers de rapports
const REPORT_DIRS = {
  'performance-backend': IS_DOCKER 
    ? '/app/backend-performance-reports'
    : join(PROJECT_ROOT, 'backend-performance-reports'),
  'performance-frontend': IS_DOCKER
    ? '/app/frontend/performance-reports'
    : join(PROJECT_ROOT, 'frontend', 'performance-reports'),
  'playwright': IS_DOCKER
    ? '/app/frontend/playwright-report'
    : join(PROJECT_ROOT, 'frontend', 'playwright-report'),
  'tests-results': IS_DOCKER
    ? (process.env.TESTS_RESULTS_DIR || '/app/tests/results')
    : join(PROJECT_ROOT, 'tests', 'results'),
  'user-journey': IS_DOCKER
    ? '/app/tests/user-journey-reports'
    : join(PROJECT_ROOT, 'tests', 'user-journey-reports'),
  'analytics': IS_DOCKER
    ? '/app/tests/analytics-reports'
    : join(PROJECT_ROOT, 'tests', 'analytics-reports'),
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const filePath = searchParams.get('path')
    const format = searchParams.get('format') || 'html' // html ou pdf

    if (!id && !filePath) {
      return NextResponse.json(
        { success: false, error: 'Paramètre id ou path manquant' },
        { status: 400 }
      )
    }

    // ✅ Déterminer le chemin selon le type de rapport
    let fullPath: string
    let fileName: string
    
    if (id) {
      // Identifier le type de rapport depuis l'ID
      if (id.startsWith('perf-backend-')) {
        const timestamp = id.replace('perf-backend-', '')
        // Chercher d'abord un HTML, sinon JSON
        const htmlFile = `backend_performance_${timestamp.replace('_', '_')}.html`
        const jsonFile = `backend_performance_${timestamp.replace('_', '_')}.json`
        const htmlPath = join(REPORT_DIRS['performance-backend'], htmlFile)
        const jsonPath = join(REPORT_DIRS['performance-backend'], jsonFile)
        
        try {
          await stat(htmlPath)
          fullPath = htmlPath
          fileName = `performance-backend-${timestamp}.html`
        } catch {
          fullPath = jsonPath
          fileName = `performance-backend-${timestamp}.json`
        }
      } else if (id.startsWith('perf-frontend-')) {
        const timestamp = id.replace('perf-frontend-', '')
        const htmlFile = `performance_${timestamp.replace('_', '_')}.html`
        const jsonFile = `performance_${timestamp.replace('_', '_')}.json`
        const htmlPath = join(REPORT_DIRS['performance-frontend'], htmlFile)
        const jsonPath = join(REPORT_DIRS['performance-frontend'], jsonFile)
        
        try {
          await stat(htmlPath)
          fullPath = htmlPath
          fileName = `performance-frontend-${timestamp}.html`
        } catch {
          fullPath = jsonPath
          fileName = `performance-frontend-${timestamp}.json`
        }
      } else if (id.startsWith('playwright-')) {
        fullPath = join(REPORT_DIRS['playwright'], 'index.html')
        fileName = `playwright-report-${id.replace('playwright-', '')}.html`
      } else {
        // Format standard: YYYYMMDD-HHMMSS (tests results)
        fullPath = join(REPORT_DIRS['tests-results'], id, 'report.html')
        fileName = `test-report-${id}.html`
      }
    } else if (filePath) {
      // Support legacy
      if (filePath.startsWith('/') || filePath.includes('..')) {
        const resolved = resolve(REPORT_DIRS['tests-results'], filePath.replace(REPORT_DIRS['tests-results'], ''))
        if (!resolved.startsWith(resolve(REPORT_DIRS['tests-results']))) {
          return NextResponse.json(
            { success: false, error: 'Chemin non autorisé' },
            { status: 403 }
          )
        }
        fullPath = resolved
      } else {
        fullPath = join(REPORT_DIRS['tests-results'], filePath)
      }
      fileName = filePath.split('/').pop() || 'report.html'
    } else {
      return NextResponse.json(
        { success: false, error: 'Paramètre manquant' },
        { status: 400 }
      )
    }
    
    // Vérifier que le chemin résolu est bien dans un répertoire autorisé
    const authorizedDirs = Object.values(REPORT_DIRS).map(d => resolve(d))
    const resolvedFile = resolve(fullPath)
    const isAuthorized = authorizedDirs.some(dir => resolvedFile.startsWith(dir))
    
    if (!isAuthorized) {
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

    // Lire le contenu
    const content = await readFile(fullPath)
    
    // Déterminer le Content-Type
    let contentType = 'text/html'
    if (fullPath.endsWith('.json')) {
      contentType = 'application/json'
    } else if (fullPath.endsWith('.pdf')) {
      contentType = 'application/pdf'
    }
    
    // Retourner le fichier
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
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
