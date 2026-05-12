import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_PUBLIC_PATH = '/b4ck0ff1ce'
const ADMIN_INTERNAL_PATH = '/backoffice'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === ADMIN_INTERNAL_PATH || pathname.startsWith(`${ADMIN_INTERNAL_PATH}/`)) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(ADMIN_INTERNAL_PATH, ADMIN_PUBLIC_PATH)
    return NextResponse.redirect(url)
  }

  if (pathname === ADMIN_PUBLIC_PATH || pathname.startsWith(`${ADMIN_PUBLIC_PATH}/`)) {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = pathname.replace(ADMIN_PUBLIC_PATH, ADMIN_INTERNAL_PATH)
    const response = handleAdminAuth(request)
    if (response) return response
    return NextResponse.rewrite(rewriteUrl)
  }

  // Essayer d'abord les cookies, puis les headers Authorization
  const token = request.cookies.get('token')?.value ||
                request.headers.get('authorization')?.replace('Bearer ', '') ||
                request.headers.get('Authorization')?.replace('Bearer ', '')

  // Rediriger les utilisateurs connectés depuis la page de login vers le backoffice
  // Mais seulement si le token est valide (format JWT ou mock en dev)
  if (pathname === '/login' && token) {
    // Vérifier que le token a un format valide (JWT ou mock)
    const isValidToken = token.includes('.') || (process.env.NODE_ENV === 'development' && token.startsWith('mock-jwt-token'));
    if (isValidToken) {
      return NextResponse.redirect(new URL(ADMIN_PUBLIC_PATH, request.url))
    }
  }

  return NextResponse.next()
}

function handleAdminAuth(request: NextRequest) {
  const token = request.cookies.get('token')?.value ||
                request.headers.get('authorization')?.replace('Bearer ', '') ||
                request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token.startsWith('mock-jwt-token-') || token.includes('.')) {
    return null
  }

  return null
}

export const config = {
  matcher: [
    '/login',
    '/backoffice/:path*',
    '/b4ck0ff1ce/:path*',
  ],
}
