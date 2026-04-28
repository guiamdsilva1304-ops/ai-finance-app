"use client";
import { useState, useEffect } from "react";

export default function MarcaPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/brand/logo").then(r => r.json()).then(d => {
      if (d.url) setLogoUrl(d.url);
    });
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/brand/logo", { method: "POST", body: form });
    const data = await res.json();
    if (data.url) {
      setLogoUrl(data.url);
      setMsg("✅ Logo atualizada com sucesso!");
    } else {
      setMsg("❌ Erro: " + data.error);
    }
    setUploading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Nunito', sans-serif", padding: 40 }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h1 style={{ fontWeight: 800, fontSize: 24, color: "#0f172a", marginBottom: 4 }}>🎨 Identidade Visual</h1>
        <p style={{ color: "#64748b", marginBottom: 32 }}>A logo salva aqui será usada em todas as imagens geradas pelo Lucas</p>

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 16 }}>Logo atual</div>
          
          {logoUrl ? (
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, padding: 20, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <img src={logoUrl} alt="Logo iMoney" style={{ height: 80, objectFit: "contain" }} />
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>iMoney Logo</div>
                <div style={{ fontSize: 12, color: "#16a34a", marginTop: 4 }}>✅ Ativa — sendo usada nas imagens</div>
                <a href={logoUrl} target="_blank" style={{ fontSize: 11, color: "#3b82f6" }}>Ver URL completa</a>
              </div>
            </div>
          ) : (
            <div style={{ padding: 24, background: "#fef2f2", border: "1px dashed #fca5a5", borderRadius: 12, marginBottom: 24, color: "#dc2626", fontSize: 13 }}>
              ⚠️ Nenhuma logo cadastrada ainda
            </div>
          )}

          <label style={{ display: "block", cursor: "pointer" }}>
            <div style={{ background: "#16a34a", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, color: "#fff", fontWeight: 700, textAlign: "center", opacity: uploading ? 0.6 : 1 }}>
              {uploading ? "Enviando..." : logoUrl ? "🔄 Trocar logo" : "⬆️ Fazer upload da logo"}
            </div>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleUpload} style={{ display: "none" }} disabled={uploading} />
          </label>

          {msg && <div style={{ marginTop: 12, fontSize: 13, color: msg.startsWith("✅") ? "#16a34a" : "#dc2626", textAlign: "center" }}>{msg}</div>}

          <div style={{ marginTop: 20, padding: 16, background: "#f0fdf4", borderRadius: 10, fontSize: 12, color: "#15803d" }}>
            💡 <strong>Dica:</strong> Use PNG com fundo transparente para melhor resultado. A logo será colada automaticamente no canto inferior direito de cada imagem gerada.
          </div>
        </div>
      </div>
    </div>
  );
}
