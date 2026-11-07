import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

// Every route requires a session except:
//  - /login and NextAuth's own endpoints
//  - /api/cron/*, which authenticates with CRON_SECRET instead of a user session
//  - static assets
export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|api/auth|api/cron|_next/static|_next/image|favicon.ico).*)"],
};
