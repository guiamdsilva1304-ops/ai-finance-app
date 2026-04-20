"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const C = { green:"#00C853", greenGlow:"rgba(0,200,83,0.12)", bg:"#07100a", s1:"#0e1a10", s2:"#152018", s3:"#1c2b1e", border:"rgba(0,200,83,0.16)", text:"#dff0e3", muted:"#6b8f72", white:"#ffffff", red:"#ff5252" };

const PLATFORMS = ["instagram","tiktok","twitter","linkedin","whatsapp"];
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function PostsBank() {
  const router = useRouter();
  const [tab, setTab] = useState<"bank"|"calendar">("bank");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [calLoading, setCalLoading] = useState(false);
  const [calendar, setCalendar] = useState<any>(null);
  const [platform, setPlatform] = useState("instagram");
  const [audience, setAudience] = useState("jovens");
  const [aesthetic, setAesthetic] = useState("bold");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [copied, setCopied] = useState<string|null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => { if(tab==="bank") loadPosts(); }, [tab]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/posts");
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {}
    finally { setLoading(false); }
  };

  const deletePost = async (id: string) => {
    await fetch("/api/admin/posts", { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id }) });
    setPosts(p => p.filter(x => x.id !== id));
  };

  const markUsed = async (id: string, used: boolean) => {
    await fetch("/api/admin/posts", { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id, used }) });
    setPosts(p => p.map(x => x.id===id ? {...x, used} : x));
  };

  const generateCalendar = async () => {
    setCalLoading(true); setCalendar(null);
    try {
      const res = await fetch("/api/admin/calendar", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ month, year, platform, audience, aesthetic }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCalendar(data);
    } catch(e:any) { alert("Erro: " + e.message); }
    finally { setCalLoading(false); }
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(()=>setCopied(null),2000); });
  };

  const filtered = filter === "all" ? posts : filter === "used" ? posts.filter(p=>p.used) : posts.filter(p=>!p.used);

  const logout = async () => { await fetch("/api/admin/auth",{method:"DELETE"}); router.push("/admin/login"); };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      <style>{`@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}} @keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>

      {/* TOPBAR */}
      <div style={{ background:C.s1, borderBottom:`1px solid ${C.border}`, padding:"0 24px", height:58, position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => router.push("/admin")} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, fontFamily:"inherit", fontSize:12, padding:"5px 10px", borderRadius:8, cursor:"pointer" }}>← Admin</button>
          <span style={{ fontSize:14, fontWeight:800, color:C.white }}>📅 Banco de Posts & Calendário</span>
        </div>
        <button onClick={logout} style={{ background:"transparent", border:"1px solid rgba(255,82,82,0.25)", color:C.red, fontFamily:"inherit", fontSize:11, padding:"4px 10px", borderRadius:8, cursor:"pointer" }}>Sair</button>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"24px 16px 80px" }}>

        {/* TABS */}
        <div style={{ display:"flex", gap:6, marginBottom:20, background:C.s1, borderRadius:14, padding:5, border:`1px solid ${C.border}` }}>
          {([["bank","🗃️ Banco de Posts"],["calendar","📅 Calendário Editorial"]] as const).map(([id,lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex:1, background:tab===id?C.s3:"transparent", border:`1px solid ${tab===id?C.border:"transparent"}`, color:tab===id?C.green:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:tab===id?800:500, padding:"9px 0", borderRadius:10, cursor:"pointer" }}>{lbl}</button>
          ))}
        </div>

        {/* BANCO DE POSTS */}
        {tab === "bank" && (
          <div style={{ animation:"up .25s ease" }}>
            <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
              <div style={{ fontSize:13, color:C.muted }}>{filtered.length} posts</div>
              <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                {["all","unused","used"].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ background:filter===f?C.greenGlow:"transparent", border:`1px solid ${filter===f?C.green:C.border}`, color:filter===f?C.green:C.muted, fontFamily:"inherit", fontSize:11, padding:"4px 10px", borderRadius:8, cursor:"pointer" }}>
                    {f==="all"?"Todos":f==="unused"?"Não usados":"Usados"}
                  </button>
                ))}
                <button onClick={loadPosts} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, fontFamily:"inherit", fontSize:11, padding:"4px 10px", borderRadius:8, cursor:"pointer" }}>↻ Atualizar</button>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign:"center", padding:48, color:C.muted }}>Carregando...</div>
            ) : filtered.length === 0 ? (
              <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:"48px 20px", textAlign:"center" as const }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🗃️</div>
                <div style={{ color:C.muted, fontSize:14 }}>Nenhum post salvo ainda.<br/>Gere posts no Agente de Marketing!</div>
                <button onClick={() => router.push("/admin/agents/marketing")} style={{ marginTop:16, background:C.greenGlow, border:`1px solid ${C.green}`, color:C.green, fontFamily:"inherit", fontSize:13, fontWeight:700, padding:"10px 20px", borderRadius:10, cursor:"pointer" }}>Ir para o Agente →</button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column" as const, gap:12 }}>
                {filtered.map((post, i) => (
                  <div key={post.id} style={{ background:C.s1, border:`1px solid ${post.used?"rgba(0,200,83,0.05)":C.border}`, borderRadius:16, padding:20, opacity:post.used?0.6:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                      <div style={{ background:C.greenGlow, border:`1px solid ${C.border}`, color:C.green, fontSize:10, fontFamily:"monospace", padding:"2px 8px", borderRadius:20 }}>{post.platform}</div>
                      <div style={{ background:C.s2, border:`1px solid ${C.border}`, color:C.muted, fontSize:10, fontFamily:"monospace", padding:"2px 8px", borderRadius:20 }}>{post.theme}</div>
                      <div style={{ fontSize:10, color:C.muted, marginLeft:"auto" }}>{new Date(post.created_at).toLocaleDateString("pt-BR")}</div>
                      {post.used && <div style={{ background:"rgba(0,200,83,0.1)", color:C.green, fontSize:10, fontFamily:"monospace", padding:"2px 8px", borderRadius:20 }}>✓ usado</div>}
                    </div>
                    <div style={{ fontSize:13, color:C.text, lineHeight:1.7, whiteSpace:"pre-wrap", background:C.s2, borderRadius:10, padding:"12px 14px", borderLeft:`3px solid ${C.green}`, marginBottom:10 }}>
                      {post.post?.slice(0,300)}{post.post?.length > 300 ? "..." : ""}
                    </div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const }}>
                      <button onClick={() => copy(`${post.post}\n\n${(post.hashtags||[]).map((h:string)=>"#"+h).join(" ")}`, post.id)} style={{ background:copied===post.id?C.green:"transparent", border:`1px solid ${copied===post.id?C.green:C.border}`, color:copied===post.id?"#000":C.muted, fontFamily:"monospace", fontSize:11, padding:"4px 10px", borderRadius:7, cursor:"pointer", fontWeight:700 }}>
                        {copied===post.id?"✓ copiado!":"📋 copiar"}
                      </button>
                      <button onClick={() => markUsed(post.id, !post.used)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, fontFamily:"monospace", fontSize:11, padding:"4px 10px", borderRadius:7, cursor:"pointer" }}>
                        {post.used?"↩ desmarcar":"✓ marcar usado"}
                      </button>
                      <button onClick={() => deletePost(post.id)} style={{ background:"transparent", border:"1px solid rgba(255,82,82,0.2)", color:C.red, fontFamily:"monospace", fontSize:11, padding:"4px 10px", borderRadius:7, cursor:"pointer" }}>🗑 deletar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CALENDÁRIO */}
        {tab === "calendar" && (
          <div style={{ animation:"up .25s ease" }}>
            <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:16 }}>
              <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:16 }}>// Configurar Calendário</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Mês</div>
                  <select value={month} onChange={e=>setMonth(Number(e.target.value))} style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`, color:C.text, fontFamily:"inherit", fontSize:13, padding:"10px 12px", borderRadius:10, outline:"none", appearance:"none" }}>
                    {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Ano</div>
                  <select value={year} onChange={e=>setYear(Number(e.target.value))} style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`, color:C.text, fontFamily:"inherit", fontSize:13, padding:"10px 12px", borderRadius:10, outline:"none", appearance:"none" }}>
                    {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Plataforma</div>
                  <select value={platform} onChange={e=>setPlatform(e.target.value)} style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`, color:C.text, fontFamily:"inherit", fontSize:13, padding:"10px 12px", borderRadius:10, outline:"none", appearance:"none" }}>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Estética</div>
                  <select value={aesthetic} onChange={e=>setAesthetic(e.target.value)} style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`, color:C.text, fontFamily:"inherit", fontSize:13, padding:"10px 12px", borderRadius:10, outline:"none", appearance:"none" }}>
                    {["bold","clean","editorial","gradient","ilustrado"].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={generateCalendar} disabled={calLoading} style={{ width:"100%", background:calLoading?"#007a32":C.green, color:"#000", border:"none", borderRadius:12, padding:"14px 0", fontFamily:"inherit", fontSize:15, fontWeight:900, cursor:calLoading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <span style={calLoading?{display:"inline-block",animation:"spin .8s linear infinite"}:{}}>{calLoading?"◌":"📅"}</span>
                {calLoading?"Gerando 30 posts com Claude Opus...":"Gerar Calendário Editorial Completo"}
              </button>
              {calLoading && <div style={{ textAlign:"center", fontSize:12, color:C.muted, marginTop:8 }}>Isso pode levar 1-2 minutos — gerando 30 posts únicos...</div>}
            </div>

            {calendar && (
              <div style={{ animation:"up .3s ease" }}>
                <div style={{ fontSize:13, color:C.green, fontWeight:700, marginBottom:14, textAlign:"center" as const }}>
                  ✅ {calendar.posts?.length} posts gerados e salvos no banco!
                </div>
                <div style={{ display:"flex", flexDirection:"column" as const, gap:10 }}>
                  {(calendar.posts||[]).map((post: any, i: number) => (
                    <div key={i} style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, padding:18 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                        <div style={{ background:C.green, color:"#000", fontSize:11, fontWeight:900, fontFamily:"monospace", padding:"3px 10px", borderRadius:20 }}>Dia {post.day}</div>
                        <div style={{ color:C.muted, fontSize:11 }}>{post.weekday}</div>
                        <div style={{ background:C.s2, border:`1px solid ${C.border}`, color:C.muted, fontSize:10, fontFamily:"monospace", padding:"2px 8px", borderRadius:20, marginLeft:"auto" }}>{post.format}</div>
                        <div style={{ color:C.muted, fontSize:10 }}>⏰ {post.melhor_horario}</div>
                      </div>
                      <div style={{ fontSize:13, color:C.green, fontWeight:700, marginBottom:6 }}>{post.hook}</div>
                      <div style={{ fontSize:12, color:C.muted, lineHeight:1.6, whiteSpace:"pre-wrap", marginBottom:10 }}>{post.post?.slice(0,200)}...</div>
                      <button onClick={() => copy(`${post.post}\n\n${(post.hashtags||[]).map((h:string)=>"#"+h).join(" ")}`, `cal-${i}`)} style={{ background:copied===`cal-${i}`?C.green:"transparent", border:`1px solid ${copied===`cal-${i}`?C.green:C.border}`, color:copied===`cal-${i}`?"#000":C.muted, fontFamily:"monospace", fontSize:11, padding:"4px 10px", borderRadius:7, cursor:"pointer", fontWeight:700 }}>
                        {copied===`cal-${i}`?"✓ copiado!":"📋 copiar post"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
