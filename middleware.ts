import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = req.nextUrl

  // Rotas públicas
  const publicRoutes = ['/', '/login', '/privacidade', '/termos', '/blog', '/mfa']
  if (publicRoutes.some((r) => pathname === r || pathname.startsWith('/blog/'))) return res

  // Não autenticado → login
  if (!session) return NextResponse.redirect(new URL('/login', req.url))

  // MFA
  const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (mfaData?.nextLevel === 'aal2' && mfaData?.currentLevel !== 'aal2' && pathname !== '/mfa') {
    return NextResponse.redirect(new URL('/mfa', req.url))
  }

  // Proteção do /admin — só is_admin = true
  if (pathname.startsWith('/admin')) {
    const { data: perfil } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (!perfil?.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|og-image.png).*)'],
}
