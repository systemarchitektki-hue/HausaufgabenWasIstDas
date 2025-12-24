"use client";

import { useRef, useState } from "react";

export default function StartPage() {
  const codeRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function verify() {
    const raw = codeRef.current?.value ?? "";
    const clean = raw.trim();

    // Sichtbarer Beweis, dass der Klick wirklich ankommt:
    console.log("CLICKED - CODE:", clean);

    if (!clean) {
      setMsg("Bitte Code eingeben.");
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data.message || "Code falsch oder Fehler.");
        return;
      }

      // Weiterleitung (sicher)
      window.location.assign("/app");

    } catch {
      setMsg("Fehler: Bitte nochmal versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 500 }}>
      <h1>Start</h1>
      <p>Gib deinen Zugangscode ein:</p>

      <input
        ref={codeRef}
        placeholder="z.B. TESTCODE"
        style={{ width: "100%", padding: 12, fontSize: 16 }}
      />

      <button
        onClick={verify}
        disabled={loading}
        style={{ marginTop: 12, padding: 12, width: "100%", fontSize: 16 }}
      >
        {loading ? "Prüfe..." : "Weiter"}
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
