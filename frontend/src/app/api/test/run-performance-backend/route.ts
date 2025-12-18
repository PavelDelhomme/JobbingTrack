import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const testName = body.testName || 'Tests Performance Backend'
    
    // Lancer les tests de performance backend avec génération automatique de rapport
    const command = 'cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack && bash scripts/generate-test-report.sh performance-backend "make test-performance-backend" "' + testName + '"'
    
    // Exécuter en arrière-plan
    exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Erreur exécution tests performance backend:', error)
        console.error('stderr:', stderr)
      } else {
        console.log('Tests performance backend terminés avec rapport généré')
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Tests de performance backend lancés avec génération automatique de rapport',
      reportLocation: 'tests/results/'
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

