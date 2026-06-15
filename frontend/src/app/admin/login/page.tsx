"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";

  const login = async () => {
    if (!password) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { setError("Senha incorreta."); return; }
      const data = await res.json();
      // Salva o session secret retornado pela API para uso nos headers das rotas de agentes
      if (data.sessionKey) {
        localStorage.setItem("imoney_admin_key", data.sessionKey);
      }
      router.push(from);
    } catch { setError("Erro de conexão."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ background:"#fff", border:"1px solid rgba(0,200,83,0.2)", borderRadius:20, padding:"40px 32px", width:"100%", maxWidth:400, boxShadow:"0 8px 32px rgba(0,0,0,0.08)" }}>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ width:60, height:60, background:"#00C853", borderRadius:16, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:28, marginBottom:16 }}>💸</div>
        <div style={{ fontSize:22, fontWeight:900, color:"#16241a" }}>iMoney <span style={{ color:"#00C853" }}>Admin</span></div>
        <div style={{ fontSize:12, color:"#5c7568", marginTop:4, fontFamily:"monospace" }}>acesso restrito</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <input
          type="password"
          placeholder="Senha de administrador"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          style={{ background:"#f5f8f5", border:"1px solid rgba(0,200,83,0.2)", color:"#16241a", fontFamily:"inherit", fontSize:14, padding:"14px 16px", borderRadius:12, outline:"none", width:"100%" }}
        />
        {error && <div style={{ color:"#d32f2f", fontSize:12, background:"rgba(211,47,47,0.06)", border:"1px solid rgba(211,47,47,0.2)", padding:"10px 14px", borderRadius:8, textAlign:"center" }}>⚠️ {error}</div>}
        <button onClick={login} disabled={loading || !password} style={{ background:"#00C853", color:"#000", border:"none", borderRadius:12, padding:"14px 0", fontFamily:"inherit", fontSize:15, fontWeight:800, cursor:"pointer", opacity:!password?0.5:1 }}>
          {loading ? "Entrando..." : "Entrar →"}
        </button>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <div style={{ minHeight:"100vh", background:"#f5f8f5", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Nunito','Segoe UI',sans-serif", padding:20 }}>
      <Suspense fallback={<div style={{ color:"#5c7568" }}>Carregando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
