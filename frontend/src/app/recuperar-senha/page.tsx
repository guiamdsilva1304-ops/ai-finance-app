"use client";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const supabase = createSupabaseBrowser();

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setErro("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://imoney.ia.br/nova-senha",
    });
    if (error) { setErro("Email não encontrado. Verifique e tente novamente."); }
    else { setEnviado(true); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0fdf4 0%, #fff 60%)", fontFamily: "'Nunito',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');`}</style>
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div style={{ fontSize: 32 }}>🧭</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#0a3d28" }}>iMoney</div>
      </div>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.08)", padding: "36px 32px" }}>
        {!enviado ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0d2414", margin: "0 0 8px" }}>Esqueceu a senha?</h1>
            <p style={{ fontSize: 14, color: "#888", margin: "0 0 24px", lineHeight: 1.6 }}>Digite seu email e enviaremos um link para você criar uma nova senha.</p>
            {erro && <div style={{ background: "#ffeef0", border: "1px solid #ffcdd2", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#c62828", marginBottom: 16 }}>{erro}</div>}
            <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6 }}>SEU EMAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required
                  style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px", fontSize: 15, fontFamily: "'Nunito',sans-serif", boxSizing: "border-box" }} />
              </div>
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: loading ? "#ccc" : "#1D9E75", color: "#fff", fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Nunito',sans-serif" }}>
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </form>
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <Link href="/login" style={{ fontSize: 13, color: "#1D9E75", fontWeight: 600, textDecoration: "none" }}>← Voltar ao login</Link>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0d2414", margin: "0 0 12px" }}>Email enviado!</h2>
            <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, margin: "0 0 24px" }}>Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para criar uma nova senha.</p>
            <p style={{ fontSize: 12, color: "#aaa" }}>Não recebeu? Verifique o spam ou <button onClick={() => setEnviado(false)} style={{ background: "none", border: "none", color: "#1D9E75", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>tente novamente</button>.</p>
            <Link href="/login" style={{ display: "block", marginTop: 20, fontSize: 13, color: "#1D9E75", fontWeight: 600, textDecoration: "none" }}>← Voltar ao login</Link>
          </div>
        )}
      </div>
    </div>
  );
}
