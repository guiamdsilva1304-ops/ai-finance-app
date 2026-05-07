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
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;

  const publicPaths = ["/", "/login", "/privacidade", "/termos", "/blog", "/verificacao-2fa"];
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith("/blog/") || pathname.startsWith("/api/cron") || pathname.startsWith("/api/webhooks"));

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|og-image.png).*)"],
};
