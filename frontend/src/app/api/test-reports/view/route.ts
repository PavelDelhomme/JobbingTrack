import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join, resolve, relative } from 'path'
import { existsSync } from 'fs'

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
    if (id) {
      // Utiliser l'ID (format: YYYYMMDD-HHMMSS)
      fullPath = join(TESTS_RESULTS_DIR, id, 'report.html')
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
    let content = await readFile(fullPath, 'utf-8')
    
    // Ajouter viewport meta tag si absent pour améliorer l'affichage mobile
    if (!content.includes('viewport') && !content.includes('meta name="viewport"')) {
      // Insérer le viewport meta tag dans le <head>
      const viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">'
      
      // Chercher le <head> ou l'insérer après <html>
      if (content.includes('<head>')) {
        content = content.replace('<head>', `<head>${viewportMeta}`)
      } else if (content.includes('<html')) {
        // Insérer après la balise html
        const htmlMatch = content.match(/<html[^>]*>/)
        if (htmlMatch) {
          content = content.replace(htmlMatch[0], `${htmlMatch[0]}\n<head>${viewportMeta}</head>`)
        }
      } else {
        // Si pas de structure HTML, ajouter au début
        content = `<!DOCTYPE html><html><head>${viewportMeta}</head><body>${content}</body></html>`
      }
    }
    
    // Ajouter des styles pour améliorer l'affichage mobile
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
          white-space: nowrap;
        }
        pre { 
          font-size: 11px; 
          overflow-x: auto;
          word-wrap: break-word;
          white-space: pre-wrap;
        }
        h1, h2, h3 { 
          font-size: 1.2em; 
        }
      }
    </style>
    `
    
    // Insérer les styles dans le <head>
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

