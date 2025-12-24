"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Msg = { from: "user" | "bot"; text: string };

export default function AppPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { from: "bot", text: "Hi! Lade ein Foto deiner Aufgabe hoch oder schreib deine Frage." },
  ]);

  const [text, setText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Nur Bild-Dateien erlauben
    if (!file.type.startsWith("image/")) {
      alert("Bitte wähle eine Bild-Datei aus (PNG/JPG/WebP).");
      return;
    }

    // Grobe Größen-Check (Base64 wird größer als Datei!)
    // 2.5 MB ist ein guter Start für lokale Tests.
    const maxBytes = 2.5 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("Das Bild ist zu groß. Bitte ein kleineres Bild wählen (unter ca. 2.5 MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setImageDataUrl(result); // z.B. "data:image/jpeg;base64,...."
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageDataUrl(null);
    setImageName(null);
  }

  async function sendMessage() {
    const clean = text.trim();

    // Erlaubt: Text ODER Bild ODER beides
    if ((!clean && !imageDataUrl) || loading) return;

    // Was wir im Chat anzeigen, wenn nur ein Bild gesendet wird:
    const userDisplay = [
      clean ? clean : null,
      imageDataUrl ? "[Bild hochgeladen]" : null,
    ]
      .filter(Boolean)
      .join(" ");

    setMessages((m) => [...m, { from: "user", text: userDisplay }]);
    setText("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,          // optional
          imageDataUrl: imageDataUrl, // optional
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { from: "bot", text: data.error || "Fehler beim Senden." },
        ]);
        return;
      }

      setMessages((m) => [...m, { from: "bot", text: data.reply }]);

      // Nach dem Senden Bild wieder entfernen (damit nicht aus Versehen erneut gesendet wird)
      removeImage();
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Netzwerkfehler. Versuch es nochmal." }]);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/start");
  }

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Hausaufgabenhelfer</h1>
        <button onClick={logout} style={{ padding: "8px 12px" }}>
          Logout
        </button>
      </div>

      <div
        style={{
          marginTop: 16,
          border: "1px solid #333",
          borderRadius: 8,
          padding: 12,
          minHeight: 320,
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ margin: "10px 0" }}>
            <b>{m.from === "user" ? "Du" : "Helfer"}:</b> {m.text}
          </div>
        ))}
      </div>

      {/* Upload Bereich */}
      <div style={{ marginTop: 12, padding: 12, border: "1px dashed #444", borderRadius: 8 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input type="file" accept="image/*" onChange={handleFileChange} />

          {imageName && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>Datei: <b>{imageName}</b></span>
              <button onClick={removeImage} style={{ padding: "6px 10px" }}>
                Bild entfernen
              </button>
            </div>
          )}
        </div>

        {imageDataUrl && (
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 6, opacity: 0.8 }}>Vorschau:</div>
            {/* Vorschau */}
            <img
              src={imageDataUrl}
              alt="Upload Vorschau"
              style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #222" }}
            />
          </div>
        )}
      </div>

      {/* Text + Senden */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Optional: Schreib kurz, wobei du nicht weiterkommst…"
          style={{ flex: 1, padding: 12, fontSize: 16 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button onClick={sendMessage} disabled={loading} style={{ padding: "12px 16px" }}>
          {loading ? "..." : "Senden"}
        </button>
      </div>
    </main>
  );
}
