import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Essayer d'abord les cookies, puis les headers Authorization
  const token = request.cookies.get('token')?.value ||
                request.headers.get('authorization')?.replace('Bearer ', '') ||
                request.headers.get('Authorization')?.replace('Bearer ', '')

  // Rediriger les utilisateurs connectés depuis la page de login vers le backoffice
  if (request.nextUrl.pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/backoffice', request.url))
  }

  // Routes protégées du backoffice
  if (request.nextUrl.pathname.startsWith('/backoffice')) {
    if (!token) {
      // Pas de token : rediriger vers login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // En mode développement, accepter tous les tokens mock ou JWT
    if (token && (token.startsWith('mock-jwt-token-') || token.includes('.'))) {
      // Token de développement valide
      return NextResponse.next()
    }

    // Pour les vrais JWT, vérifier le rôle côté client uniquement
    // Le middleware laisse passer et la vérification se fait côté client
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/login',
    '/backoffice/:path*',
  ],
}
