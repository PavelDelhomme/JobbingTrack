import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join, resolve } from 'path'
import { existsSync } from 'fs'

// Chemin vers la racine du projet
const PROJECT_ROOT = process.cwd().includes('frontend') 
  ? join(process.cwd(), '..')
  : process.cwd()

// ✅ Détecter si on est dans Docker ou sur l'hôte
const IS_DOCKER = process.cwd() === '/app' || process.env.DOCKER === 'true'
const PROJECT_ROOT_VIEW = IS_DOCKER
  ? '/app'
  : (process.cwd().includes('frontend') 
      ? join(process.cwd(), '..')
      : process.cwd())

// Dossiers de rapports
const REPORT_DIRS = {
  'performance-backend': IS_DOCKER 
    ? '/app/reports/performance/backend'
    : join(PROJECT_ROOT_VIEW, 'reports/performance/backend'),
  'performance-frontend': IS_DOCKER
    ? '/app/frontend/performance-reports'
    : join(PROJECT_ROOT_VIEW, 'frontend', 'performance-reports'),
  'playwright': IS_DOCKER
    ? '/app/frontend/playwright-report'
    : join(PROJECT_ROOT_VIEW, 'frontend', 'playwright-report'),
  'tests-results': process.env.TESTS_RESULTS_DIR || (IS_DOCKER ? '/app/tests/results' : join(PROJECT_ROOT_VIEW, 'tests', 'results')),
  'user-journey': process.env.USER_JOURNEY_REPORTS_DIR || (IS_DOCKER ? '/tmp/journey-reports' : join(PROJECT_ROOT_VIEW, 'tests', 'user-journey-reports')),
  'user-journey-legacy': IS_DOCKER
    ? '/app/tests/user-journey-reports'
    : '',
  'analytics': IS_DOCKER
    ? '/app/tests/analytics-reports'
    : join(PROJECT_ROOT_VIEW, 'tests', 'analytics-reports'),
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const filePath = searchParams.get('path')
    const category = searchParams.get('category') // Nouveau: catégorie du rapport
    const playwrightReport = searchParams.get('playwright') === '1' // Rapport HTML Playwright (captures d'écran)

    if (!id && !filePath) {
      return NextResponse.json(
        { success: false, error: 'Paramètre id ou path manquant' },
        { status: 400 }
      )
    }

    // ✅ NOUVEAU: Déterminer le chemin selon le type de rapport
    let fullPath: string
    
    if (id) {
      // Identifier le type de rapport depuis l'ID
      if (id.startsWith('perf-backend-')) {
        // Rapport performance backend
        const timestamp = id.replace('perf-backend-', '')
        const jsonFile = `backend_performance_${timestamp.replace('_', '_')}.json`
        fullPath = join(REPORT_DIRS['performance-backend'], jsonFile)
      } else if (id.startsWith('perf-frontend-')) {
        // Rapport performance frontend
        const timestamp = id.replace('perf-frontend-', '')
        const jsonFile = `performance_${timestamp.replace('_', '_')}.json`
        fullPath = join(REPORT_DIRS['performance-frontend'], jsonFile)
      } else if (id.startsWith('playwright-')) {
        // Rapport Playwright
        fullPath = join(REPORT_DIRS['playwright'], 'index.html')
      } else if (id.startsWith('user-journey-')) {
        // Rapport parcours utilisateur (JSON)
        const suffix = id.replace('user-journey-', '')
        fullPath = join(REPORT_DIRS['user-journey'], `user-journey-${suffix}.json`)
      } else {
        // Format standard: YYYYMMDD-HHMMSS (tests results)
        if (playwrightReport) {
          // Rapport Playwright détaillé (avec captures d'écran) pour ce run
          const playwrightPath = join(REPORT_DIRS['tests-results'], id, 'playwright-report', 'index.html')
          if (existsSync(playwrightPath)) {
            fullPath = playwrightPath
          } else {
            fullPath = join(REPORT_DIRS['tests-results'], id, 'report.html')
          }
        } else {
          fullPath = join(REPORT_DIRS['tests-results'], id, 'report.html')
        }
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
    let content = await readFile(fullPath, 'utf-8')

    // Sanitizer le HTML pour l’iframe : éviter "Uncaught SyntaxError: string literal contains an unescaped line break"
    // en échappant les retours à la ligne uniquement dans les chaînes (guillemets) des scripts
    content = content.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (match, body) => {
      const escapedBody = body.replace(
        /("(?:[^"\\]|\\.|[\r\n])*"|'(?:[^'\\]|\\.|[\r\n])*')/g,
        (strLiteral: string) => strLiteral.replace(/\r\n?|\n/g, '\\n').replace(/\r/g, '')
      )
      return match.slice(0, match.indexOf('>') + 1) + escapedBody + '</script>'
    })
    
    // Si c'est un JSON (rapport performance), générer un HTML
    if (fullPath.endsWith('.json')) {
      try {
        const jsonData = JSON.parse(content)
        content = generateHTMLFromJSON(jsonData, id || 'report')
      } catch {
        // Si erreur de parsing, retourner le JSON brut
        content = `<pre>${content}</pre>`
      }
    }
    
    // Ajouter viewport meta tag si absent
    if (!content.includes('viewport') && !content.includes('meta name="viewport"')) {
      const viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">'
      
      if (content.includes('<head>')) {
        content = content.replace('<head>', `<head>${viewportMeta}`)
      } else if (content.includes('<html')) {
        const htmlMatch = content.match(/<html[^>]*>/)
        if (htmlMatch) {
          content = content.replace(htmlMatch[0], `${htmlMatch[0]}\n<head>${viewportMeta}</head>`)
        }
      } else {
        content = `<!DOCTYPE html><html><head>${viewportMeta}</head><body>${content}</body></html>`
      }
    }
    
    // Ajouter des styles pour améliorer l'affichage
    const mobileStyles = `
    <style>
      @media (max-width: 768px) {
        body { 
          font-size: 14px; 
          padding: 10px; 
          margin: 0;
          overflow-x: auto;
        }
        .container { 
          max-width: 100%;
          padding: 10px;
        }
        table {
          font-size: 12px;
          display: block;
          overflow-x: auto;
        }
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #fff;
      }
      .dark body {
        background: #1a1a1a;
        color: #e5e5e5;
      }
      pre {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 5px;
        overflow-x: auto;
      }
      .dark pre {
        background: #2a2a2a;
      }
    </style>
    `
    
    if (content.includes('</head>')) {
      content = content.replace('</head>', `${mobileStyles}</head>`)
    } else if (content.includes('<head>')) {
      content = content.replace('<head>', `<head>${mobileStyles}`)
    }
    
    return NextResponse.json({
      success: true,
      content
    })
  } catch (error: any) {
    console.error('Erreur lecture rapport:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la lecture du rapport'
      },
      { status: 500 }
    )
  }
}

/**
 * Génère un HTML à partir d'un JSON de rapport
 */
function generateHTMLFromJSON(data: any, reportId: string): string {
  const isPerformance = reportId.includes('perf-')
  const isBackend = reportId.includes('backend')
  
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport ${isPerformance ? 'Performance' : 'Test'} - ${reportId}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header h1 {
      margin: 0 0 10px 0;
      color: #333;
    }
    .content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    pre {
      background: #f8f8f8;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      border: 1px solid #e0e0e0;
    }
    .metric {
      display: inline-block;
      margin: 10px;
      padding: 10px 20px;
      background: #e3f2fd;
      border-radius: 5px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #1976d2;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f5f5f5;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Rapport ${isPerformance ? 'Performance' : 'Test'}</h1>
    <p><strong>ID:</strong> ${reportId}</p>
    <p><strong>Date:</strong> ${data.date || data.timestamp || 'N/A'}</p>
  </div>
  <div class="content">
    <pre>${JSON.stringify(data, null, 2)}</pre>
  </div>
</body>
</html>`
  
  return html
}
