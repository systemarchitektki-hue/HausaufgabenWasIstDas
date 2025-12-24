import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

function randomCode() {
  // Einfacher Code-Generator, z.B. ABCD-1234-EFGH
  const part = (len: number) =>
    Array.from({ length: len }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

  return `${part(4)}-${part(4)}-${part(4)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const password = String(body.password || "");

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ ok: false, error: "ADMIN_PASSWORD fehlt in .env.local" }, { status: 500 });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ ok: false, error: "Falsches Admin-Passwort." }, { status: 401 });
    }

    const code = randomCode();

    const { data, error } = await supabaseAdmin
      .from("access_codes")
      .insert({ code, status: "active", plan: "lifetime" })
      .select("id, code")
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Fehler beim Erstellen des Codes." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, code: data.code, id: data.id });
  } catch {
    return NextResponse.json({ ok: false, error: "Serverfehler." }, { status: 500 });
  }
}
