import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/');
    
    // Sécuriser le chemin pour éviter les accès non autorisés
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return NextResponse.json(
        { error: 'Chemin invalide' },
        { status: 400 }
      );
    }

    // Chemin vers le dossier docs à la racine du projet
    // process.cwd() pointe vers frontend/, donc on remonte d'un niveau
    const projectRoot = path.join(process.cwd(), '..');
    const docsPath = path.join(projectRoot, 'docs', filePath);
    
    // Normaliser le chemin pour éviter les problèmes de séparateurs
    const normalizedPath = path.normalize(docsPath);
    
    // Vérifier que le chemin normalisé est bien dans le dossier docs
    const docsDir = path.normalize(path.join(projectRoot, 'docs'));
    if (!normalizedPath.startsWith(docsDir)) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(docsPath)) {
      return NextResponse.json(
        { error: 'Fichier non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que c'est un fichier markdown
    if (!docsPath.endsWith('.md')) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé' },
        { status: 400 }
      );
    }

    // Lire le contenu du fichier
    const content = fs.readFileSync(docsPath, 'utf-8');

    // Retourner le contenu avec le bon Content-Type
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la lecture du fichier:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', message: error.message },
      { status: 500 }
    );
  }
}

