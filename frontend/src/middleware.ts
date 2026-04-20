import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "imoney_admin_session";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "imoney-admin-secret-2025";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
  matcher: ["/admin/:path*"],
};
