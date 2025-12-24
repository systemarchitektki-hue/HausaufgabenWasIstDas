import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // Cookie löschen (wichtig: gleicher Name wie beim Login)
  res.cookies.set("hh_access", "", {
    httpOnly: true,
    secure: false, // lokal ok
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
