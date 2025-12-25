import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // 1) /app schützen (Cookie muss da sein)
  if (pathname.startsWith("/app")) {
    const codeId = req.cookies.get("hh_access")?.value;
    if (!codeId) {
      const url = req.nextUrl.clone();
      url.pathname = "/start";
      return NextResponse.redirect(url);
    }
  }

  // 2) /admin zusätzlich schützen (URL-Key muss stimmen)
  if (pathname.startsWith("/admin")) {
    const key = searchParams.get("key") || "";
    const expected = process.env.ADMIN_PANEL_KEY || "";

    // Wenn ADMIN_PANEL_KEY nicht gesetzt ist -> Admin sperren
    if (!expected || key !== expected) {
      const url = req.nextUrl.clone();
      url.pathname = "/start";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};
