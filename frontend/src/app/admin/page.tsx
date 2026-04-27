"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";

const AGENTS = [
  { id:"agentes", icon:"🤖", name:"Equipe de Agentes IA", desc:"Ana, Kai, Lucas, Pedro, Maya e Julia — sua empresa rodando 24h.", status:"ativo", href:"/admin/agentes" },
  { id:"marketing", icon:"📱", name:"Pipeline de Marketing", desc:"Lucas gera posts com IA + imagens DALL-E. Você aprova em 15 min.", status:"ativo", href:"/admin/marketing" },
  { id:"onboarding", icon:"🚀", name:"Onboarding & Vendas", desc:"Sequências de e-mail e WhatsApp para ativar usuários cadastrados.", status:"ativo", href:"/admin/agents/onboarding" },
  { id:"growth", icon:"📈", name:"Growth & Aquisição", desc:"Estratégias de aquisição e funis de conversão.", status:"em breve", href:"#" },
  { id:"feedback", icon:"🎯", name:"Feedback & UX", desc:"Analisa feedbacks e prioriza features.", status:"em breve", href:"#" },
  { id:"dados", icon:"📊", name:"Dados & Métricas", desc:"Relatórios de saúde do negócio.", status:"em breve", href:"#" },
  { id:"suporte", icon:"💬", name:"Suporte ao Usuário", desc:"Respostas para dúvidas e gestão de churn.", status:"em breve", href:"#" },
];

interface WaitlistEntry { id: string; email: string; created_at: string; user_id: string | null; }
interface RetencaoData {
  totalUsuarios: number;
  ativosUltimos7dias: number;
  ativosUltimos30dias: number;
  novosUltimos7dias: number;
  novosUltimos30dias: number;
  comTransacoes: number;
  comMetas: number;
  semAcesso7dias: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [stats, setStats] = useState({ transactions: 0, chatMessages: 0 });
  const [loading, setLoading] = useState(true);
  const [retencao, setRetencao] = useState<RetencaoData | null>(null);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function load() {
      const agora = new Date();
      const dias7 = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const dias30 = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [txRes, chatRes, waitRes, totalUsersRes, ativos7Res, ativos30Res, novos7Res, novos30Res, comTxRes, comMetasRes, inativos7Res] = await Promise.allSettled([
        supabase.from("transactions").select("id", { count: "exact", head: true }),
        supabase.from("chat_history").select("id", { count: "exact", head: true }),
        supabase.from("openfinance_interest").select("*").order("created_at", { ascending: false }),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("last_login_at", dias7),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("last_login_at", dias30),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("created_at", dias7),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("created_at", dias30),
        supabase.from("transactions").select("user_id").limit(1000),
        supabase.from("metas").select("user_id").limit(1000),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).lt("last_login_at", dias7),
      ]);

      const uniqueComTx = new Set((comTxRes.status === "fulfilled" ? comTxRes.value.data ?? [] : []).map((r: any) => r.user_id)).size;
      const uniqueComMetas = new Set((comMetasRes.status === "fulfilled" ? comMetasRes.value.data ?? [] : []).map((r: any) => r.user_id)).size;

      setRetencao({
        totalUsuarios: totalUsersRes.status === "fulfilled" ? totalUsersRes.value.count ?? 0 : 0,
        ativosUltimos7dias: ativos7Res.status === "fulfilled" ? ativos7Res.value.count ?? 0 : 0,
        ativosUltimos30dias: ativos30Res.status === "fulfilled" ? ativos30Res.value.count ?? 0 : 0,
        novosUltimos7dias: novos7Res.status === "fulfilled" ? novos7Res.value.count ?? 0 : 0,
        novosUltimos30dias: novos30Res.status === "fulfilled" ? novos30Res.value.count ?? 0 : 0,
        comTransacoes: uniqueComTx,
        comMetas: uniqueComMetas,
        semAcesso7dias: inativos7Res.status === "fulfilled" ? inativos7Res.value.count ?? 0 : 0,
      });
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

        {/* RETENÇÃO & CRESCIMENTO */}
        <h2 style={{ fontSize:13, fontWeight:700, color:"#3a6b45", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:12 }}>📈 Retenção & Crescimento</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:10, marginBottom:12 }}>
          {[
            { label:"Total de usuários", value: retencao?.totalUsuarios ?? "...", icon:"👥", color:"#00C853" },
            { label:"Ativos (7 dias)", value: retencao?.ativosUltimos7dias ?? "...", icon:"🟢", color:"#00C853" },
            { label:"Ativos (30 dias)", value: retencao?.ativosUltimos30dias ?? "...", icon:"📅", color:"#00C853" },
            { label:"Novos (7 dias)", value: retencao?.novosUltimos7dias ?? "...", icon:"✨", color:"#64d98a" },
            { label:"Novos (30 dias)", value: retencao?.novosUltimos30dias ?? "...", icon:"🆕", color:"#64d98a" },
            { label:"Com transações", value: retencao?.comTransacoes ?? "...", icon:"💳", color:"#ffb300" },
            { label:"Com metas", value: retencao?.comMetas ?? "...", icon:"🎯", color:"#ffb300" },
            { label:"Inativos +7 dias", value: retencao?.semAcesso7dias ?? "...", icon:"😴", color:"#ff5252" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{ background:"#0e1a10", border:"1px solid rgba(0,200,83,0.12)", borderRadius:14, padding:"14px 16px" }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
              <div style={{ fontSize:22, fontWeight:900, color, marginBottom:4 }}>{value}</div>
              <div style={{ fontSize:11, color:"#3a6b45", lineHeight:1.4 }}>{label}</div>
            </div>
          ))}
        </div>

        {retencao && retencao.totalUsuarios > 0 && (
          <div style={{ background:"#0e1a10", border:"1px solid rgba(0,200,83,0.12)", borderRadius:14, padding:"16px 20px", marginBottom:32 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#3a6b45", marginBottom:12 }}>TAXAS DE ENGAJAMENTO</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:20 }}>
              {[
                { label:"Retenção 7 dias", value: Math.round((retencao.ativosUltimos7dias / retencao.totalUsuarios) * 100), bom: 40 },
                { label:"Retenção 30 dias", value: Math.round((retencao.ativosUltimos30dias / retencao.totalUsuarios) * 100), bom: 20 },
                { label:"Ativação (tem transação)", value: Math.round((retencao.comTransacoes / retencao.totalUsuarios) * 100), bom: 50 },
                { label:"Engajamento (tem meta)", value: Math.round((retencao.comMetas / retencao.totalUsuarios) * 100), bom: 30 },
              ].map(({ label, value, bom }) => (
                <div key={label} style={{ flex:1, minWidth:140 }}>
                  <div style={{ fontSize:11, color:"#3a6b45", marginBottom:6 }}>{label}</div>
                  <div style={{ background:"#07100a", borderRadius:8, height:8, marginBottom:4 }}>
                    <div style={{ height:8, borderRadius:8, width:`${Math.min(100, value)}%`, background: value >= bom ? "#00C853" : value >= bom/2 ? "#ffb300" : "#ff5252", transition:"width 0.5s" }}/>
                  </div>
                  <div style={{ fontSize:13, fontWeight:800, color: value >= bom ? "#00C853" : value >= bom/2 ? "#ffb300" : "#ff5252" }}>{value}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

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
