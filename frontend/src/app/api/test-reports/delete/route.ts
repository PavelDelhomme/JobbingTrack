import { NextRequest, NextResponse } from 'next/server'
import { rm, stat } from 'fs/promises'
import { join, resolve } from 'path'

const PROJECT_ROOT = process.cwd().includes('frontend') 
  ? join(process.cwd(), '..')
  : process.cwd()
const TESTS_RESULTS_DIR = process.env.TESTS_RESULTS_DIR || join(PROJECT_ROOT, 'tests', 'results')

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const all = searchParams.get('all') === 'true'

    // Vérifier que le répertoire existe
    const resolvedDir = resolve(TESTS_RESULTS_DIR)
    
    if (all) {
      // Supprimer tous les rapports
      try {
        await stat(resolvedDir)
      } catch {
        return NextResponse.json({
          success: true,
          message: 'Aucun rapport à supprimer',
          deleted: 0
        })
      }

      const { readdir } = await import('fs/promises')
      const entries = await readdir(resolvedDir, { withFileTypes: true })
      const reportDirs = entries.filter(
        entry => entry.isDirectory() && /^\d{8}-\d{6}$/.test(entry.name)
      )

      let deletedCount = 0
      for (const dir of reportDirs) {
        const dirPath = join(resolvedDir, dir.name)
        const resolvedPath = resolve(dirPath)
        
        // Sécurité : vérifier que le chemin est bien dans TESTS_RESULTS_DIR
        if (!resolvedPath.startsWith(resolvedDir)) {
          continue
        }

        try {
          await rm(resolvedPath, { recursive: true, force: true })
          deletedCount++
        } catch (error: any) {
          console.error(`Erreur suppression ${dir.name}:`, error.message)
        }
      }

      return NextResponse.json({
        success: true,
        message: `${deletedCount} rapport(s) supprimé(s)`,
        deleted: deletedCount
      })
    } else if (id) {
      // Supprimer un rapport spécifique
      const reportPath = join(resolvedDir, id)
      const resolvedPath = resolve(reportPath)

      // Sécurité : vérifier que le chemin est bien dans TESTS_RESULTS_DIR
      if (!resolvedPath.startsWith(resolvedDir)) {
        return NextResponse.json(
          { success: false, error: 'Chemin non autorisé' },
          { status: 403 }
        )
      }

      // Vérifier que le répertoire existe
      try {
        await stat(resolvedPath)
      } catch {
        return NextResponse.json(
          { success: false, error: 'Rapport non trouvé' },
          { status: 404 }
        )
      }

      // Supprimer le répertoire
      await rm(resolvedPath, { recursive: true, force: true })

      return NextResponse.json({
        success: true,
        message: `Rapport ${id} supprimé`,
        deleted: 1
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'ID du rapport manquant ou paramètre "all" requis' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Erreur suppression rapport:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la suppression' },
      { status: 500 }
    )
  }
}

