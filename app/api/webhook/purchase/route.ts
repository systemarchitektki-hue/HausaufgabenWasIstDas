import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part(4)}-${part(4)}-${part(4)}`;
}

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-webhook-secret") || "";

    if (!process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "WEBHOOK_SECRET fehlt" }, { status: 500 });
    }
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const orderId = body.order_id ? String(body.order_id) : null;

    if (!email) {
      return NextResponse.json({ ok: false, error: "email fehlt" }, { status: 400 });
    }

    const code = randomCode();

    const { data, error } = await supabaseAdmin
      .from("access_codes")
      .insert({ code, status: "active", plan: "lifetime", email, order_id: orderId })
      .select("id, code")
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Code konnte nicht erstellt werden" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, code: data.code });
  } catch {
    return NextResponse.json({ ok: false, error: "Serverfehler" }, { status: 500 });
  }
}
