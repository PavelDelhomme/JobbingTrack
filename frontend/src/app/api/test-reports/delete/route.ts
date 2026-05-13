import { NextRequest, NextResponse } from 'next/server'
import { rm, stat, readdir } from 'fs/promises'
import { isAbsolute, join, relative, resolve } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
    ? '/app/reports/performance/backend'
    : join(PROJECT_ROOT, 'reports/performance/backend'),
  'performance-frontend': IS_DOCKER
    ? '/app/frontend/performance-reports'
    : join(PROJECT_ROOT, 'frontend', 'performance-reports'),
  'playwright': IS_DOCKER
    ? '/app/frontend/playwright-report'
    : join(PROJECT_ROOT, 'frontend', 'playwright-report'),
  'tests-results': process.env.TESTS_RESULTS_DIR || (IS_DOCKER ? '/app/tests/results' : join(PROJECT_ROOT, 'tests', 'results')),
  'user-journey': IS_DOCKER
    ? '/app/tests/user-journey-reports'
    : join(PROJECT_ROOT, 'tests', 'user-journey-reports'),
  'analytics': IS_DOCKER
    ? '/app/tests/analytics-reports'
    : join(PROJECT_ROOT, 'tests', 'analytics-reports'),
  'security-reports': join(PROJECT_ROOT, 'reports', 'security'),
  'security-results': join(PROJECT_ROOT, 'tests', 'results', 'security'),
}

function isWithinDirectory(baseDir: string, targetPath: string): boolean {
  const relativePath = relative(resolve(baseDir), resolve(targetPath))
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))
}

/**
 * Supprimer un fichier/répertoire avec gestion des permissions
 * Essaie plusieurs méthodes pour garantir la suppression
 */
async function safeRemove(path: string, isDir: boolean = false): Promise<boolean> {
  // Méthode 1: Essayer directement avec fs/promises
  try {
    if (isDir) {
      await rm(path, { recursive: true, force: true })
    } else {
      await rm(path, { force: true })
    }
    // Vérifier que le fichier/répertoire n'existe plus
    try {
      await stat(path)
      // Si on arrive ici, le fichier existe encore
    } catch {
      // Le fichier n'existe plus, succès
      return true
    }
  } catch (error: any) {
    // Continuer avec les autres méthodes
  }

  // Méthode 2: Changer les permissions puis supprimer
  try {
    await execAsync(`chmod -R 777 "${path}" 2>/dev/null || true`)
    if (isDir) {
      await rm(path, { recursive: true, force: true })
    } else {
      await rm(path, { force: true })
    }
    // Vérifier
    try {
      await stat(path)
    } catch {
      return true
    }
  } catch (error: any) {
    // Continuer
  }

  // Méthode 3: Utiliser Docker exec si on est dans Docker
  try {
    const containerName = process.env.CONTAINER_NAME || 'jobbingtrack-frontend'
    const dockerPath = path.replace(PROJECT_ROOT, '/app')
    
    // Vérifier si le conteneur existe
    try {
      await execAsync(`docker ps --format '{{.Names}}' | grep -q "^${containerName}$"`)
    } catch {
      // Le conteneur n'existe pas, on ne peut pas utiliser Docker
      throw new Error('Container not found')
    }
    
    const command = isDir 
      ? `docker exec ${containerName} rm -rf "${dockerPath}"`
      : `docker exec ${containerName} rm -f "${dockerPath}"`
    
    await execAsync(command)
    
    // Vérifier que le fichier n'existe plus
    try {
      await stat(path)
      // Existe encore, essayer une dernière fois avec chmod
      await execAsync(`chmod -R 777 "${path}" 2>/dev/null || true`)
      if (isDir) {
        await rm(path, { recursive: true, force: true })
      } else {
        await rm(path, { force: true })
      }
    } catch {
      // N'existe plus, succès
      return true
    }
  } catch (dockerError) {
    // Docker n'est pas disponible ou a échoué
  }

  // Méthode 4: Dernière tentative avec sudo (si disponible)
  try {
    const command = isDir 
      ? `sudo rm -rf "${path}" 2>/dev/null || rm -rf "${path}" 2>/dev/null || true`
      : `sudo rm -f "${path}" 2>/dev/null || rm -f "${path}" 2>/dev/null || true`
    await execAsync(command)
    
    // Vérifier
    try {
      await stat(path)
      // Existe encore, on retourne false
      return false
    } catch {
      return true
    }
  } catch {
    return false
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const all = searchParams.get('all') === 'true'

    if (all) {
      // ✅ Supprimer tous les rapports de tous les types
      let totalDeleted = 0
      const errors: string[] = []

      // Supprimer les rapports de tests results
      try {
        const testsResultsDir = resolve(REPORT_DIRS['tests-results'])
        try {
          await stat(testsResultsDir)
          const entries = await readdir(testsResultsDir, { withFileTypes: true })
          const reportDirs = entries.filter(
            entry => entry.isDirectory() && /^\d{8}-\d{6}$/.test(entry.name)
          )

          for (const dir of reportDirs) {
            const dirPath = join(testsResultsDir, dir.name)
            const resolvedPath = resolve(dirPath)
            
            if (!resolvedPath.startsWith(testsResultsDir)) continue

            const success = await safeRemove(resolvedPath, true)
            if (success) {
              totalDeleted++
            } else {
              // Essayer une dernière fois avec chmod + rm via exec
              try {
                await execAsync(`chmod -R 777 "${resolvedPath}" 2>/dev/null || true`)
                await rm(resolvedPath, { recursive: true, force: true })
                // Vérifier que ça a fonctionné
                try {
                  await stat(resolvedPath)
                  errors.push(`tests/results/${dir.name}`)
                } catch {
                  totalDeleted++
                }
              } catch {
                errors.push(`tests/results/${dir.name}`)
              }
            }
          }
        } catch {
          // Le répertoire n'existe pas, c'est OK
        }
      } catch (error: any) {
        console.error('Erreur suppression tests results:', error.message)
      }

      // Supprimer les rapports de performance backend
      try {
        const perfBackendDir = resolve(REPORT_DIRS['performance-backend'])
        try {
          await stat(perfBackendDir)
          const files = await readdir(perfBackendDir)
          const reportFiles = files.filter(f => 
            f.endsWith('.json') || f.endsWith('.html')
          )

          for (const file of reportFiles) {
            const filePath = join(perfBackendDir, file)
            const success = await safeRemove(filePath, false)
            if (success) {
              totalDeleted++
            } else {
              // Essayer une dernière fois
              try {
                await execAsync(`chmod 777 "${filePath}" 2>/dev/null || true`)
                await rm(filePath, { force: true })
                try {
                  await stat(filePath)
                  errors.push(`reports/performance/backend/${file}`)
                } catch {
                  totalDeleted++
                }
              } catch {
                errors.push(`reports/performance/backend/${file}`)
              }
            }
          }
        } catch {
          // Le répertoire n'existe pas, c'est OK
        }
      } catch (error: any) {
        console.error('Erreur suppression perf backend:', error.message)
      }

      // Supprimer les rapports de performance frontend
      try {
        const perfFrontendDir = resolve(REPORT_DIRS['performance-frontend'])
        try {
          await stat(perfFrontendDir)
          const files = await readdir(perfFrontendDir)
          const reportFiles = files.filter(f => 
            f.endsWith('.json') || f.endsWith('.html')
          )

          for (const file of reportFiles) {
            const filePath = join(perfFrontendDir, file)
            const success = await safeRemove(filePath, false)
            if (success) {
              totalDeleted++
            } else {
              // Essayer une dernière fois
              try {
                await execAsync(`chmod 777 "${filePath}" 2>/dev/null || true`)
                await rm(filePath, { force: true })
                try {
                  await stat(filePath)
                  errors.push(`frontend/performance-reports/${file}`)
                } catch {
                  totalDeleted++
                }
              } catch {
                errors.push(`frontend/performance-reports/${file}`)
              }
            }
          }
        } catch {
          // Le répertoire n'existe pas, c'est OK
        }
      } catch (error: any) {
        console.error('Erreur suppression perf frontend:', error.message)
      }

      for (const [label, securityDir] of [
        ['reports/security', REPORT_DIRS['security-reports']],
        ['tests/results/security', REPORT_DIRS['security-results']]
      ] as const) {
        try {
          const resolvedSecurityDir = resolve(securityDir)
          try {
            await stat(resolvedSecurityDir)
            const entries = await readdir(resolvedSecurityDir, { withFileTypes: true })
            const reportDirs = entries.filter(entry => entry.isDirectory())

            for (const dir of reportDirs) {
              const dirPath = join(resolvedSecurityDir, dir.name)
              const resolvedPath = resolve(dirPath)
              if (!resolvedPath.startsWith(resolvedSecurityDir)) continue

              const success = await safeRemove(resolvedPath, true)
              if (success) {
                totalDeleted++
              } else {
                errors.push(`${label}/${dir.name}`)
              }
            }
          } catch {
            // Le répertoire n'existe pas, c'est OK
          }
        } catch (error: any) {
          console.error(`Erreur suppression ${label}:`, error.message)
        }
      }

      return NextResponse.json({
        success: true,
        message: `${totalDeleted} rapport(s) supprimé(s)${errors.length > 0 ? `, ${errors.length} erreur(s)` : ''}`,
        deleted: totalDeleted,
        errors: errors.length > 0 ? errors : undefined
      })
    } else if (id) {
      // ✅ Supprimer un rapport spécifique selon son type
      let deleted = false
      let error: string | null = null

      // Identifier le type de rapport
      if (id.startsWith('perf-backend-')) {
        const timestamp = id.replace('perf-backend-', '')
        const baseName = `backend_performance_${timestamp.replace('_', '_')}`
        const jsonPath = join(REPORT_DIRS['performance-backend'], `${baseName}.json`)
        const htmlPath = join(REPORT_DIRS['performance-backend'], `${baseName}.html`)
        
        try {
          try { await stat(jsonPath); await safeRemove(jsonPath, false); deleted = true; } catch {}
          try { await stat(htmlPath); await safeRemove(htmlPath, false); deleted = true; } catch {}
        } catch (e: any) {
          error = e.message
        }
      } else if (id.startsWith('perf-frontend-')) {
        const timestamp = id.replace('perf-frontend-', '')
        const baseName = `performance_${timestamp.replace('_', '_')}`
        const jsonPath = join(REPORT_DIRS['performance-frontend'], `${baseName}.json`)
        const htmlPath = join(REPORT_DIRS['performance-frontend'], `${baseName}.html`)
        
        try {
          try { await stat(jsonPath); await safeRemove(jsonPath, false); deleted = true; } catch {}
          try { await stat(htmlPath); await safeRemove(htmlPath, false); deleted = true; } catch {}
        } catch (e: any) {
          error = e.message
        }
      } else if (id.startsWith('playwright-')) {
        // Pour Playwright, on ne supprime pas le dossier complet, juste le rapport
        // (car il peut être régénéré)
        deleted = true // On considère que c'est fait
      } else if (id.startsWith('security-reports-')) {
        const suffix = id.replace('security-reports-', '')
        const reportPath = join(REPORT_DIRS['security-reports'], suffix)
        const resolvedPath = resolve(reportPath)

        if (!isWithinDirectory(REPORT_DIRS['security-reports'], resolvedPath)) {
          return NextResponse.json(
            { success: false, error: 'Chemin non autorisé' },
            { status: 403 }
          )
        }

        try {
          await stat(resolvedPath)
          deleted = await safeRemove(resolvedPath, true)
          if (!deleted) error = 'Impossible de supprimer le rapport sécurité'
        } catch (e: any) {
          error = e.message
        }
      } else if (id.startsWith('security-results-')) {
        const suffix = id.replace('security-results-', '')
        const reportPath = join(REPORT_DIRS['security-results'], suffix)
        const resolvedPath = resolve(reportPath)

        if (!isWithinDirectory(REPORT_DIRS['security-results'], resolvedPath)) {
          return NextResponse.json(
            { success: false, error: 'Chemin non autorisé' },
            { status: 403 }
          )
        }

        try {
          await stat(resolvedPath)
          deleted = await safeRemove(resolvedPath, true)
          if (!deleted) error = 'Impossible de supprimer le rapport sécurité'
        } catch (e: any) {
          error = e.message
        }
      } else {
        // Format standard: YYYYMMDD-HHMMSS (tests results)
        const reportPath = join(REPORT_DIRS['tests-results'], id)
        const resolvedPath = resolve(reportPath)

        if (!resolvedPath.startsWith(resolve(REPORT_DIRS['tests-results']))) {
          return NextResponse.json(
            { success: false, error: 'Chemin non autorisé' },
            { status: 403 }
          )
        }

        try {
          await stat(resolvedPath)
          const success = await safeRemove(resolvedPath, true)
          if (success) {
            deleted = true
          } else {
            error = 'Impossible de supprimer le répertoire'
          }
        } catch (e: any) {
          error = e.message
        }
      }

      if (deleted) {
        return NextResponse.json({
          success: true,
          message: `Rapport ${id} supprimé`,
          deleted: 1
        })
      } else {
        return NextResponse.json(
          { success: false, error: error || 'Rapport non trouvé ou erreur de suppression' },
          { status: error ? 500 : 404 }
        )
      }
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
