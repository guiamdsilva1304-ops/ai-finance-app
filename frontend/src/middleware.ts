import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "imoney_admin_session";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "imoney-admin-secret-2025";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rotas de API nunca são bloqueadas
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Só protege páginas /admin
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname === "/admin/login") return NextResponse.next();

  const session = req.cookies.get(ADMIN_COOKIE)?.value;
  if (session !== SESSION_SECRET) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Só aplica em páginas admin — NÃO em /api/
  matcher: ["/admin/:path*"],
};
