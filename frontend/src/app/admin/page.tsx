"use client";
import { useRouter } from "next/navigation";

const AGENTS = [
  { id:"marketing", icon:"📣", name:"Marketing de Conteúdo", desc:"Posts prontos para Instagram, TikTok, LinkedIn e WhatsApp.", status:"ativo", href:"/admin/agents/marketing" },
  { id:"onboarding", icon:"🚀", name:"Onboarding & Vendas", desc:"Sequências de e-mail e WhatsApp para ativar usuários.", status:"em breve", href:"#" },
  { id:"growth", icon:"📈", name:"Growth & Aquisição", desc:"Estratégias de aquisição e funis de conversão.", status:"em breve", href:"#" },
  { id:"feedback", icon:"🎯", name:"Feedback & UX", desc:"Analisa feedbacks e prioriza features.", status:"em breve", href:"#" },
  { id:"dados", icon:"📊", name:"Dados & Métricas", desc:"Relatórios de saúde do negócio.", status:"em breve", href:"#" },
  { id:"suporte", icon:"💬", name:"Suporte ao Usuário", desc:"Respostas para dúvidas e gestão de churn.", status:"em breve", href:"#" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const logout = async () => {
    await fetch("/api/admin/auth", { method:"DELETE" });
    router.push("/admin/login");
  };
  return (
    <div style={{ minHeight:"100vh", background:"#07100a", color:"#dff0e3", fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      <div style={{ background:"#0e1a10", borderBottom:"1px solid rgba(0,200,83,0.12)", padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:"#00C853", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>💸</div>
          <span style={{ fontWeight:800, color:"#fff", fontSize:15 }}>iMoney <span style={{ color:"#00C853" }}>Admin</span></span>
        </div>
        <button onClick={logout} style={{ background:"transparent", border:"1px solid rgba(255,82,82,0.3)", color:"#ff5252", fontFamily:"inherit", fontSize:12, padding:"5px 12px", borderRadius:8, cursor:"pointer" }}>Sair</button>
      </div>
      <div style={{ maxWidth:960, margin:"0 auto", padding:"28px 20px 60px" }}>
        <h1 style={{ fontSize:26, fontWeight:900, color:"#fff", letterSpacing:"-0.5px", margin:0, marginBottom:4 }}>Central de Agentes</h1>
        <p style={{ color:"#6b8f72", fontSize:14, marginBottom:28 }}>IA trabalhando para a iMoney enquanto você foca no produto.</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12 }}>
          {AGENTS.map(a => (
            <div key={a.id} onClick={() => a.status === "ativo" && router.push(a.href)}
              style={{ background:"#0e1a10", border:`1px solid ${a.status==="ativo"?"rgba(0,200,83,0.25)":"rgba(0,200,83,0.08)"}`, borderRadius:16, padding:20, cursor:a.status==="ativo"?"pointer":"default", opacity:a.status==="ativo"?1:0.6 }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                <div style={{ width:44, height:44, background:a.status==="ativo"?"rgba(0,200,83,0.15)":"#152018", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{a.icon}</div>
                <div style={{ background:a.status==="ativo"?"rgba(0,200,83,0.15)":"rgba(255,255,255,0.05)", color:a.status==="ativo"?"#00C853":"#6b8f72", fontSize:10, fontFamily:"monospace", padding:"3px 9px", borderRadius:20 }}>{a.status}</div>
              </div>
              <div style={{ fontWeight:800, fontSize:15, color:"#fff", marginBottom:6 }}>{a.name}</div>
              <div style={{ fontSize:12, color:"#6b8f72", lineHeight:1.55 }}>{a.desc}</div>
              {a.status==="ativo" && <div style={{ marginTop:14, color:"#00C853", fontSize:12, fontWeight:700 }}>Abrir agente →</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
