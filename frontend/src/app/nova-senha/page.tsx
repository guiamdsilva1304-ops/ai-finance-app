"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";

export default function NovaSenhaPage() {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    // Verifica se tem sessao valida (vinda do link do email)
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push("/recuperar-senha");
    });
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < 6) { setErro("A senha deve ter pelo menos 6 caracteres."); return; }
    if (senha !== confirmar) { setErro("As senhas não coincidem."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) { setErro("Erro ao atualizar senha. Tente novamente."); }
    else { setSucesso(true); setTimeout(() => router.push("/dashboard"), 2000); }
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
        {!sucesso ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0d2414", margin: "0 0 8px" }}>Nova senha</h1>
            <p style={{ fontSize: 14, color: "#888", margin: "0 0 24px" }}>Escolha uma senha segura para sua conta.</p>
            {erro && <div style={{ background: "#ffeef0", border: "1px solid #ffcdd2", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#c62828", marginBottom: 16 }}>{erro}</div>}
            <form onSubmit={salvar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6 }}>NOVA SENHA</label>
                <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" required
                  style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px", fontSize: 15, fontFamily: "'Nunito',sans-serif", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6 }}>CONFIRMAR SENHA</label>
                <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="Repita a senha" required
                  style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px", fontSize: 15, fontFamily: "'Nunito',sans-serif", boxSizing: "border-box" }} />
              </div>
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: loading ? "#ccc" : "#1D9E75", color: "#fff", fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Nunito',sans-serif" }}>
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0d2414", margin: "0 0 12px" }}>Senha atualizada!</h2>
            <p style={{ fontSize: 14, color: "#666" }}>Redirecionando para o dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
