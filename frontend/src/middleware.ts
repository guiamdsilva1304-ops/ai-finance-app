import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Rotas públicas — sempre permitidas
  const publicPaths = ["/", "/login", "/privacidade", "/termos", "/blog", "/esqueci-senha", "/onboarding"];
  const isPublic =
    publicPaths.some((p) => pathname === p || pathname.startsWith("/blog/")) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/");

  if (isPublic) return res;

  // Sem sessão → redireciona para login
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Verifica nível MFA
  const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const currentLevel = mfaData?.currentLevel;
  const nextLevel = mfaData?.nextLevel;

  if (
    nextLevel === "aal2" &&
    currentLevel === "aal1" &&
    pathname !== "/verificacao-2fa"
  ) {
    return NextResponse.redirect(new URL("/verificacao-2fa", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo\\.png|logo\\.svg|logo-white\\.svg|icon\\.svg|og-image\\.png|og-image\\.svg).*)",
  ],
};