import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const testName = body.testName || 'Tests Backend'
    
    // Lancer les tests backend avec génération automatique de rapport
    const command = 'cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack && bash scripts/generate-test-report.sh backend "make test-backend" "' + testName + '"'
    
    // Exécuter en arrière-plan mais capturer le résultat
    exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Erreur exécution tests backend:', error)
        console.error('stderr:', stderr)
      } else {
        console.log('Tests backend terminés avec rapport généré')
        console.log('stdout:', stdout.substring(0, 500)) // Limiter la sortie
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Tests backend lancés avec génération automatique de rapport',
      reportLocation: 'tests/results/'
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

