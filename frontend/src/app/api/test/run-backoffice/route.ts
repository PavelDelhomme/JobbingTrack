import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const testName = body.testName || 'Tests Backoffice (E2E)'
    
    // Lancer les tests backoffice (tests E2E) avec génération automatique de rapport
    const command = 'cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack && bash scripts/generate-test-report.sh backoffice "make test-e2e" "' + testName + '"'
    
    // Exécuter en arrière-plan
    exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Erreur exécution tests backoffice:', error)
        console.error('stderr:', stderr)
      } else {
        console.log('Tests backoffice terminés avec rapport généré')
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Tests backoffice (E2E) lancés avec génération automatique de rapport',
      reportLocation: 'tests/results/'
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

