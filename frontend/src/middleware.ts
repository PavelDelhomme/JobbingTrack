import { NextResponse} from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    // Verifier si c'est une route du backoffice
    if (request.nextUrl.pathname.startsWith('/backoffice')) {
      // Récupérer le token depuis les cookies
      const token = request.cookies.get('token')?.value;
      
    // Si pas de token, rediriger vers login
      if (!token) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(url);
      }
    }
    
    return NextResponse.next();
}

export const config = {
    // Proteger toutes les routes du backoffice
    matcher: ['/backoffice/:path*'],
}