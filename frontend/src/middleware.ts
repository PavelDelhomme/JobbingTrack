import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  
  // Routes protégées du backoffice
  if (request.nextUrl.pathname.startsWith('/backoffice')) {
    if (!token) {
      // Pas de token : rediriger vers login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      // Décoder le JWT pour vérifier le rôle (version simplifiée)
      // En production, vous devriez valider la signature du token
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )

      const payload = JSON.parse(jsonPayload)
      const userRole = payload.role

      // Vérifier que l'utilisateur a le rôle ADMIN ou SUPER_ADMIN
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        // Utilisateur USER : rediriger vers une page d'erreur ou la page d'accueil
        return NextResponse.redirect(new URL('/access-denied', request.url))
      }

      // Utilisateur autorisé, continuer
      return NextResponse.next()
    } catch (error) {
      // Token invalide
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/backoffice/:path*',
  ],
}
