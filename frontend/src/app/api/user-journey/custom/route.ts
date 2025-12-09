import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

const PROJECT_ROOT = process.cwd().includes('frontend') 
  ? join(process.cwd(), '..')
  : process.cwd();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, steps } = body;

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune étape fournie' },
        { status: 400 }
      );
    }

    // Construire la commande pour exécuter le parcours personnalisé
    const stepsJson = JSON.stringify(steps);
    const testScriptPath = join(PROJECT_ROOT, 'tests', 'user-journey', 'test-custom-journey.js');
    const apiUrl = process.env.API_URL || 'http://localhost:5002';

    // Exécuter le script de test
    const command = `cd ${PROJECT_ROOT} && node ${testScriptPath} custom '${stepsJson}'`;
    
    const { stdout, stderr } = await execAsync(command, {
      env: {
        ...process.env,
        API_URL: apiUrl,
        OUTPUT_JSON: 'true'
      },
      maxBuffer: 10 * 1024 * 1024 // 10MB
    });

    // Parser le résultat JSON depuis stdout
    let results;
    try {
      // Extraire le JSON de la sortie
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        results = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Aucun JSON trouvé dans la sortie');
      }
    } catch (parseError: any) {
      console.error('Erreur parsing JSON:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur lors du parsing des résultats',
          details: stderr || stdout
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      name,
      results: results.results || [],
      summary: results.summary || {},
      context: results.context || {}
    });
  } catch (error: any) {
    console.error('Erreur exécution parcours personnalisé:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de l\'exécution du parcours'
      },
      { status: 500 }
    );
  }
}

