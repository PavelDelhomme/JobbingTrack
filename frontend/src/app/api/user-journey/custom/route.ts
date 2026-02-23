import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { getProjectRoot } from '../../test/testRunnerUtils';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, steps } = body;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune étape fournie' },
        { status: 400 }
      );
    }

    const projectRoot = getProjectRoot();
    const stepsJson = JSON.stringify(steps).replace(/'/g, "'\\''");
    const testScriptPath = join(projectRoot, 'tests', 'user-journey', 'test-custom-journey.js');
    const apiUrl = process.env.API_GATEWAY_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

    const command = `cd "${projectRoot}" && node "${testScriptPath}" custom '${stepsJson}'`;
    const env: Record<string, string> = {
      ...process.env,
      API_URL: apiUrl,
      OUTPUT_JSON: 'true'
    };
    if (token) env.TEST_TOKEN = token;

    let stdout = '';
    let stderr = '';
    try {
      const result = await execAsync(command, {
        env,
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });
      stdout = result.stdout ?? '';
      stderr = result.stderr ?? '';
    } catch (err: unknown) {
      const execErr = err as { stdout?: string; stderr?: string };
      stdout = execErr.stdout ?? '';
      stderr = execErr.stderr ?? '';
      // Même en cas d'exit code 1 (étape en erreur), le script imprime le JSON : on parse et on renvoie 200
    }

    // Parser le résultat JSON depuis stdout (présent même si le script a exit 1)
    let results: { results?: unknown[]; summary?: Record<string, unknown>; context?: Record<string, unknown> };
    try {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        results = JSON.parse(jsonMatch[0]) as typeof results;
      } else {
        throw new Error('Aucun JSON trouvé dans la sortie');
      }
    } catch (parseError: unknown) {
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
  } catch (error: unknown) {
    console.error('Erreur exécution parcours personnalisé:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'exécution du parcours'
      },
      { status: 500 }
    );
  }
}

