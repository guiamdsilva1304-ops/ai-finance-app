"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";

const AGENTS = [
  { id:"marketing", icon:"📣", name:"Marketing de Conteúdo", desc:"Posts prontos para Instagram, TikTok, LinkedIn e WhatsApp.", status:"ativo", href:"/admin/agents/marketing" },
  { id:"posts", icon:"🗃️", name:"Banco de Posts & Calendário", desc:"30 posts gerados de uma vez, organizados por dia. Histórico de tudo gerado.", status:"ativo", href:"/admin/posts" },
  { id:"onboarding", icon:"🚀", name:"Onboarding & Vendas", desc:"Sequências de e-mail e WhatsApp para ativar usuários.", status:"em breve", href:"#" },
  { id:"growth", icon:"📈", name:"Growth & Aquisição", desc:"Estratégias de aquisição e funis de conversão.", status:"em breve", href:"#" },
  { id:"feedback", icon:"🎯", name:"Feedback & UX", desc:"Analisa feedbacks e prioriza features.", status:"em breve", href:"#" },
  { id:"dados", icon:"📊", name:"Dados & Métricas", desc:"Relatórios de saúde do negócio.", status:"em breve", href:"#" },
  { id:"suporte", icon:"💬", name:"Suporte ao Usuário", desc:"Respostas para dúvidas e gestão de churn.", status:"em breve", href:"#" },
];

interface WaitlistEntry { id: string; email: string; created_at: string; user_id: string | null; }

export default function AdminDashboard() {
  const router = useRouter();
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [stats, setStats] = useState({ transactions: 0, chatMessages: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function load() {
      const [txRes, chatRes, waitRes] = await Promise.allSettled([
        supabase.from("transactions").select("id", { count: "exact", head: true }),
        supabase.from("chat_history").select("id", { count: "exact", head: true }),
        supabase.from("openfinance_interest").select("*").order("created_at", { ascending: false }),
      ]);
      setStats({
        transactions: txRes.status === "fulfilled" ? txRes.value.count ?? 0 : 0,
        chatMessages: chatRes.status === "fulfilled" ? chatRes.value.count ?? 0 : 0,
      });
      setWaitlist(waitRes.status === "fulfilled" ? waitRes.value.data ?? [] : []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
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

        <h2 style={{ fontSize:13, fontWeight:700, color:"#3a6b45", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:12 }}>Métricas da plataforma</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:10, marginBottom:32 }}>
          {[
            { label:"Transações registradas", value: loading ? "..." : stats.transactions, icon:"💳" },
            { label:"Msgs no Assessor IA", value: loading ? "..." : stats.chatMessages, icon:"🤖" },
            { label:"Lista de espera Open Finance", value: loading ? "..." : waitlist.length, icon:"🏦" },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{ background:"#0e1a10", border:"1px solid rgba(0,200,83,0.12)", borderRadius:14, padding:"16px 18px" }}>
              <div style={{ fontSize:22, marginBottom:8 }}>{icon}</div>
              <div style={{ fontSize:24, fontWeight:900, color:"#00C853", marginBottom:4 }}>{value}</div>
              <div style={{ fontSize:11, color:"#3a6b45", lineHeight:1.4 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ background:"#0e1a10", border:"1px solid rgba(0,200,83,0.15)", borderRadius:16, padding:20, marginBottom:32 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <div>
              <div style={{ fontWeight:800, color:"#fff", fontSize:15, marginBottom:2 }}>🏦 Lista de Espera — Open Finance</div>
              <div style={{ fontSize:12, color:"#3a6b45" }}>{waitlist.length} pessoas interessadas</div>
            </div>
            {waitlist.length > 0 && (
              <a href={`mailto:?bcc=${waitlist.map(w => w.email).join(",")}&subject=iMoney - Open Finance chegou!`}
                style={{ background:"rgba(0,200,83,0.1)", border:"1px solid rgba(0,200,83,0.2)", color:"#00C853", fontSize:12, fontWeight:700, padding:"7px 14px", borderRadius:10, textDecoration:"none" }}>
                ✉️ Enviar e-mail para todos
              </a>
            )}
          </div>
          {waitlist.length === 0 ? (
            <div style={{ textAlign:"center", padding:"30px 0", color:"#3a6b45", fontSize:13 }}>Nenhum cadastro ainda.</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(0,200,83,0.1)" }}>
                  {["E-mail","Data","Status"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"8px 10px", color:"#3a6b45", fontWeight:700, fontSize:11, textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {waitlist.map((entry, i) => (
                  <tr key={entry.id} style={{ borderBottom:"1px solid rgba(0,200,83,0.06)", background: i%2===0 ? "rgba(0,200,83,0.02)" : "transparent" }}>
                    <td style={{ padding:"10px", color:"#dff0e3", fontWeight:600 }}>{entry.email}</td>
                    <td style={{ padding:"10px", color:"#3a6b45" }}>{new Date(entry.created_at).toLocaleDateString("pt-BR")}</td>
                    <td style={{ padding:"10px" }}>
                      <span style={{ background: entry.user_id ? "rgba(0,200,83,0.15)" : "rgba(255,255,255,0.05)", color: entry.user_id ? "#00C853" : "#6b8f72", fontSize:10, padding:"3px 9px", borderRadius:20 }}>
                        {entry.user_id ? "Usuário cadastrado" : "Visitante"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <h1 style={{ fontSize:26, fontWeight:900, color:"#fff", letterSpacing:"-0.5px", margin:"0 0 4px" }}>Central de Agentes</h1>
        <p style={{ color:"#6b8f72", fontSize:14, marginBottom:20 }}>IA trabalhando para a iMoney enquanto você foca no produto.</p>
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
