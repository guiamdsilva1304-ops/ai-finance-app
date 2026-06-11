import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;
  // Admin — autenticação separada via cookie, não depende de sessão Supabase
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return res;
    const adminCookie = req.cookies.get("imoney_admin_session");
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;
    if (!sessionSecret || adminCookie?.value !== sessionSecret) {
      const url = new URL("/admin/login", req.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    return res;
  }
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  const { data: { session } } = await supabase.auth.getSession();
  const publicPaths = ["/", "/login", "/privacidade", "/termos", "/blog", "/esqueci-senha", "/onboarding", "/redefinir-senha"];
  const isPublic =
    publicPaths.some((p) => pathname === p || pathname.startsWith("/blog/")) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next/") ||
    /\.(png|jpg|jpeg|svg|ico|webp|gif|woff|woff2|ttf|otf)$/.test(pathname);
  if (isPublic) return res;
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const currentLevel = mfaData?.currentLevel;
  const nextLevel = mfaData?.nextLevel;
  if (nextLevel === "aal2" && currentLevel === "aal1" && pathname !== "/verificacao-2fa") {
    return NextResponse.redirect(new URL("/verificacao-2fa", req.url));
  }
  return res;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
