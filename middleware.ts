import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Cookie lesen (da steht jetzt die UUID drin)
  const codeId = req.cookies.get("hh_access")?.value;

  // Wenn kein Cookie vorhanden: zurück zur Startseite
  if (!codeId) {
    const url = req.nextUrl.clone();
    url.pathname = "/start";
    return NextResponse.redirect(url);
  }

  // Cookie ist da -> App darf geöffnet werden
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
