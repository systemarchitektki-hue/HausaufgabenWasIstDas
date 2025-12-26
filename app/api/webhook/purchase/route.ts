import { NextResponse } from "next/server";
import { sendAccessEmail as sendAccessEmailSmtp } from "@/lib/mailer";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part(4)}-${part(4)}-${part(4)}`;
}

async function safeJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);

    // Secret kommt entweder aus Header (Make) ODER aus URL (Digistore)
    const secret =
      req.headers.get("x-webhook-secret") ||
      url.searchParams.get("secret") ||
      "";

    if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Digistore kann (je nach Einstellung) Query-Parameter senden, Make sendet JSON Body.
    const body = await safeJson(req);

    const email =
      String(body?.email ?? url.searchParams.get("email") ?? "")
        .trim()
        .toLowerCase();

    const orderIdRaw =
      body?.order_id ?? url.searchParams.get("order_id");

    const orderId = orderIdRaw ? String(orderIdRaw) : null;

    // Optional: Digistore Event abprüfen (nur bei Zahlung ausliefern)
    const event =
      String(body?.event ?? url.searchParams.get("event") ?? "").trim();

    if (event && event !== "on_payment") {
      // Nicht fehlschlagen lassen – nur ignorieren, damit Digistore "ok" bekommt.
      return NextResponse.json({ ok: true, ignored: true, reason: "not_on_payment" });
    }

    if (!email) {
      return NextResponse.json({ ok: false, error: "email fehlt" }, { status: 400 });
    }

    // Deduping: Wenn es schon einen Code für diese order_id gibt, keinen neuen erstellen.
    if (orderId) {
      const existing = await supabaseAdmin
        .from("access_codes")
        .select("code")
        .eq("order_id", orderId)
        .maybeSingle();

      if (existing.data?.code) {
        // Optional: Mail nochmal senden (oder einfach ok zurückgeben)
        await sendAccessEmailSmtp(email, existing.data.code);
        return NextResponse.json({ ok: true, code: existing.data.code, reused: true });
      }
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

    // E-Mail mit Code senden (SMTP all-inkl)
    await sendAccessEmailSmtp(email, data.code);

    return NextResponse.json({ ok: true, code: data.code });
  } catch (e: any) {
    // (Optional) Debug-Info in Logs, ohne sie dem Kunden zu zeigen:
    console.error("purchase webhook error:", e);
    return NextResponse.json({ ok: false, error: "Serverfehler" }, { status: 500 });
  }
}
