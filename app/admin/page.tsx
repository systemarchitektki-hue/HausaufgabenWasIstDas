"use client";

import { useState } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createCode() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/create-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult(data.error || "Fehler");
        return;
      }

      setResult(`Neuer Code: ${data.code}`);
    } catch {
      setResult("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 600 }}>
      <h1>Admin</h1>
      <p>Hier kannst du neue Zugangscodes erstellen.</p>

      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Admin Passwort"
        type="password"
        style={{ width: "100%", padding: 12, fontSize: 16 }}
      />

      <button
        onClick={createCode}
        disabled={loading}
        style={{ marginTop: 12, padding: 12, width: "100%", fontSize: 16 }}
      >
        {loading ? "Erstelle..." : "Neuen Code erstellen"}
      </button>

      {result && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #333", borderRadius: 8 }}>
          {result}
        </div>
      )}
    </main>
  );
}
