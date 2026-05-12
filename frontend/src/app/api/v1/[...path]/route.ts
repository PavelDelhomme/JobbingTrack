/**
 * Proxy API Route pour toutes les requêtes /api/v1/*
 * Permet de proxifier les requêtes client-side vers l'API Gateway
 * Sans ce proxy, les rewrites Next.js ne fonctionnent que pour SSR
 */

import { NextRequest, NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:3000';
type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'PATCH');
}

async function proxyRequest(
  request: NextRequest,
  path: string[],
  method: string
) {
  try {
    // Construire l'URL de destination
    const pathString = path.join('/');
    const url = `${API_GATEWAY_URL}/api/v1/${pathString}`;
    
    // Récupérer les paramètres de recherche
    const searchParams = request.nextUrl.searchParams.toString();
    const fullUrl = searchParams ? `${url}?${searchParams}` : url;

    // Copier les headers pertinents
    const headers: HeadersInit = {};
    
    // Headers essentiels
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;
    
    const contentType = request.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;
    
    // Autres headers utiles
    const userAgent = request.headers.get('user-agent');
    if (userAgent) headers['User-Agent'] = userAgent;

    // Préparer le body pour les requêtes non-GET
    let body: string | undefined = undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        const requestBody = await request.text();
        if (requestBody) body = requestBody;
      } catch (error) {
        console.error('❌ Erreur lecture body:', error);
      }
    }

    console.log(`🔄 Proxy ${method} ${fullUrl}`);

    // Faire la requête vers l'API Gateway
    const response = await fetch(fullUrl, {
      method,
      headers,
      body,
      // Important : ne pas suivre les redirections automatiquement
      redirect: 'manual',
    });

    // Copier les headers de la réponse
    const responseHeaders = new Headers();
    
    // Copier tous les headers sauf ceux qui pourraient causer des problèmes
    const headersToSkip = ['connection', 'transfer-encoding', 'content-encoding'];
    response.headers.forEach((value, key) => {
      if (!headersToSkip.includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // Lire le body de la réponse
    const responseBody = await response.text();

    console.log(`✅ Proxy ${method} ${fullUrl} → ${response.status}`);

    // Retourner la réponse
    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('❌ Erreur proxy API:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur de communication avec l\'API',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}

