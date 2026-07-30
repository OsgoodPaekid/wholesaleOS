import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";

// Guard every /app page. API routes do their own auth checks.
const PROTECTED = ["/dashboard", "/products", "/purchases", "/sales", "/stock", "/expenses", "/customers", "/suppliers", "/users", "/profit", "/reports"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/products/:path*", "/purchases/:path*", "/sales/:path*", "/stock/:path*", "/expenses/:path*", "/customers/:path*", "/suppliers/:path*", "/users/:path*", "/profit/:path*", "/reports/:path*"],
};
