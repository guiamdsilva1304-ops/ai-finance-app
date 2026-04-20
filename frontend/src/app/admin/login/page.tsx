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
      router.push(from);
    } catch { setError("Erro de conexão."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ background:"#0e1a10", border:"1px solid rgba(0,200,83,0.2)", borderRadius:20, padding:"40px 32px", width:"100%", maxWidth:400, boxShadow:"0 32px 80px rgba(0,0,0,0.6)" }}>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ width:60, height:60, background:"#00C853", borderRadius:16, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:28, marginBottom:16 }}>💸</div>
        <div style={{ fontSize:22, fontWeight:900, color:"#fff" }}>iMoney <span style={{ color:"#00C853" }}>Admin</span></div>
        <div style={{ fontSize:12, color:"#6b8f72", marginTop:4, fontFamily:"monospace" }}>acesso restrito</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <input
          type="password"
          placeholder="Senha de administrador"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          style={{ background:"#152018", border:"1px solid rgba(0,200,83,0.2)", color:"#dff0e3", fontFamily:"inherit", fontSize:14, padding:"14px 16px", borderRadius:12, outline:"none", width:"100%" }}
        />
        {error && <div style={{ color:"#ff5252", fontSize:12, background:"rgba(255,82,82,0.08)", border:"1px solid rgba(255,82,82,0.2)", padding:"10px 14px", borderRadius:8, textAlign:"center" }}>⚠️ {error}</div>}
        <button onClick={login} disabled={loading || !password} style={{ background:"#00C853", color:"#000", border:"none", borderRadius:12, padding:"14px 0", fontFamily:"inherit", fontSize:15, fontWeight:800, cursor:"pointer", opacity:!password?0.5:1 }}>
          {loading ? "Entrando..." : "Entrar →"}
        </button>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <div style={{ minHeight:"100vh", background:"#07100a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Nunito','Segoe UI',sans-serif", padding:20 }}>
      <Suspense fallback={<div style={{ color:"#6b8f72" }}>Carregando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
