import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = req.nextUrl

  const publicRoutes = ['/', '/login', '/privacidade', '/termos', '/blog', '/mfa']
  if (publicRoutes.some((r) => pathname === r || pathname.startsWith('/blog/'))) return res
  if (!session) return NextResponse.redirect(new URL('/login', req.url))

  const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (mfaData?.nextLevel === 'aal2' && mfaData?.currentLevel !== 'aal2' && pathname !== '/mfa') {
    return NextResponse.redirect(new URL('/mfa', req.url))
  }
  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|og-image.png).*)'],
}
