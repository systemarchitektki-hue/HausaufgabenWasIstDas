import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getCookieValue(cookieHeader: string, name: string) {
  const found = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(name + "="));
  if (!found) return null;
  return decodeURIComponent(found.split("=").slice(1).join("="));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userText = String(body.message || "").trim();
    const imageDataUrl = body.imageDataUrl ? String(body.imageDataUrl) : null;

    if (!userText && !imageDataUrl) {
      return NextResponse.json(
        { ok: false, error: "Bitte Text eingeben oder ein Bild hochladen." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY fehlt in .env.local" },
        { status: 500 }
      );
    }

    // 1) code_id aus Cookie holen
    const cookieHeader = req.headers.get("cookie") || "";
    const codeId = getCookieValue(cookieHeader, "hh_access");
    if (!codeId) {
      return NextResponse.json({ ok: false, error: "Nicht eingeloggt." }, { status: 401 });
    }

    // 2) Tageslimit prüfen
    const cap = parseInt(process.env.USAGE_CAP_PER_DAY || "30", 10);
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

const { data: usage, error: usageErr } = await supabaseAdmin
  .rpc("increment_usage", { p_code_id: codeId, p_day: day, p_cap: cap })
  .single();

type UsageResult = { allowed: boolean; new_count: number };
const u = usage as UsageResult | null;

if (usageErr || !u) {
  return NextResponse.json({ ok: false, error: "Fehler beim Limit-Check." }, { status: 500 });
}

if (!u.allowed) {
  return NextResponse.json(
    { ok: false, error: `Tageslimit erreicht (${cap}/Tag). Bitte morgen wieder.` },
    { status: 429 }
  );
}

    // 3) OpenAI aufrufen (wie bisher)
    const systemMsg = {
      role: "system" as const,
      content:
        "Du bist ein geduldiger Hausaufgaben-Lerncoach für Schüler. " +
        "Gib keine reine Endlösung. Erkläre in kleinen Schritten. " +
        "Stelle mindestens eine Rückfrage, bevor du zur nächsten Schwierigkeit gehst. " +
        "Wenn ein Bild hochgeladen wurde: Lies die Aufgabe aus dem Bild und formuliere sie kurz in eigenen Worten, bevor du erklärst.",
    };

    const userMsg = imageDataUrl
      ? {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text:
                (userText ? userText + "\n\n" : "") +
                "Hier ist ein Foto der Aufgabe. Bitte hilf mir Schritt für Schritt.",
            },
            {
              type: "image_url" as const,
              image_url: { url: imageDataUrl },
            },
          ],
        }
      : { role: "user" as const, content: userText };

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [systemMsg, userMsg],
    });

    const reply = response.choices?.[0]?.message?.content ?? "Keine Antwort erhalten.";

    await supabaseAdmin.from("events").insert({
  access_code_id: codeId,
  type: "chat_request",
  payload: {
    hasImage: Boolean(imageDataUrl),
    chars: userText.length,
    countToday: u.new_count,
  },
});

    return NextResponse.json({ ok: true, reply, countToday: u.new_count });

  } catch {
    return NextResponse.json(
      { ok: false, error: "Server-Fehler beim OpenAI Aufruf." },
      { status: 500 }
    );
  }
}
