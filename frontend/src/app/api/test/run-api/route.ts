import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const testName = body.testName || 'Tests API'
    const tests = body.tests || [] // Liste des tests à exécuter (health, contacts, interviews, etc.)
    
    // Construire la commande selon les tests sélectionnés
    let testCommand = 'make test-api'
    if (tests && tests.length > 0) {
      // Si des tests spécifiques sont demandés, utiliser le script de test spécifique
      const testTypes = tests.join(',')
      testCommand = `bash scripts/test-api-specific.sh "${testTypes}"`
    }
    
    // Lancer les tests API avec génération automatique de rapport
    const command = `cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack && bash scripts/generate-test-report.sh api "${testCommand}" "${testName}"`
    
    // Exécuter en arrière-plan
    exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Erreur exécution tests API:', error)
        console.error('stderr:', stderr)
      } else {
        console.log('Tests API terminés avec rapport généré')
      }
    })
    
    return NextResponse.json({
      success: true,
      message: `Tests API lancés avec génération automatique de rapport${tests.length > 0 ? ` (${tests.length} test(s) sélectionné(s))` : ''}`,
      reportLocation: 'tests/results/',
      selectedTests: tests
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

