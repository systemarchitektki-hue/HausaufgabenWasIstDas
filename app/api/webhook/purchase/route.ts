// app-core/app/api/webhook/purchase/route.ts
import { NextResponse } from "next/server";
import { sendAccessEmail } from "@/lib/mailer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part(4)}-${part(4)}-${part(4)}`;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);

    // Secret: Header (z.B. Make) ODER URL (Digistore)
    const secret = req.headers.get("x-webhook-secret") || url.searchParams.get("secret") || "";
    if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Body lesen (Digistore kann je nach Setup anders senden; wir bleiben erstmal bei JSON)
    const body = await req.json();

    const email = String(body.email || "").trim().toLowerCase();
    const orderId = body.order_id ? String(body.order_id).trim() : null;

    if (!email) {
      return NextResponse.json({ ok: false, error: "email fehlt" }, { status: 400 });
    }
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "order_id fehlt" }, { status: 400 });
    }

    // 1) Existiert schon ein Code für diese order_id? (verhindert Duplikate)
    const existing = await supabaseAdmin
      .from("access_codes")
      .select("code")
      .eq("order_id", orderId)
      .maybeSingle();

    const code = existing.data?.code || randomCode();

    // 2) Nur wenn nicht vorhanden: neu speichern
    if (!existing.data?.code) {
      const ins = await supabaseAdmin
        .from("access_codes")
        .insert({ code, status: "active", plan: "lifetime", email, order_id: orderId })
        .select("code")
        .single();

      if (ins.error || !ins.data) {
        return NextResponse.json(
          { ok: false, error: "Code konnte nicht erstellt werden" },
          { status: 500 }
        );
      }
    }

    // 3) E-Mail senden (über Resend, kein SMTP)
    await sendAccessEmail(email, code);

    return NextResponse.json({ ok: true, code });
  } catch (err: any) {
    console.error("purchase webhook error:", err);
    return NextResponse.json({ ok: false, error: "Serverfehler" }, { status: 500 });
  }
}
