"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const PLATFORMS = [
  { id:"instagram", label:"Instagram", icon:"📸", maxChars:2200 },
  { id:"tiktok", label:"TikTok", icon:"🎵", maxChars:2200 },
  { id:"twitter", label:"Twitter / X", icon:"𝕏", maxChars:280 },
  { id:"linkedin", label:"LinkedIn", icon:"💼", maxChars:3000 },
  { id:"whatsapp", label:"WhatsApp", icon:"💬", maxChars:1000 },
];
const FORMATS = [
  { id:"educacional", label:"📚 Post Educacional", desc:"Ensina algo valioso" },
  { id:"dica", label:"⚡ Dica Rápida", desc:"Insight direto" },
  { id:"cta", label:"📲 CTA Download", desc:"Converte para o app" },
  { id:"historia", label:"💬 Caso de Sucesso", desc:"Storytelling real" },
  { id:"mito", label:"❌ Mito vs Verdade", desc:"Destrói mitos" },
  { id:"dado", label:"📊 Dado de Impacto", desc:"Estatística que choca" },
  { id:"lista", label:"📋 Lista / Carrossel", desc:"Conteúdo scannable" },
  { id:"pergunta", label:"🤔 Pergunta", desc:"Estimula comentários" },
];
const TONES = [
  { id:"amigavel", label:"🤝 Amigável", desc:"Como um amigo próximo" },
  { id:"inspirador", label:"✨ Inspirador", desc:"Motiva à ação" },
  { id:"direto", label:"🎯 Direto", desc:"Sem rodeios" },
  { id:"humor", label:"😄 Bem-humorado", desc:"Leve e divertido" },
  { id:"autoridade", label:"📊 Autoridade", desc:"Especialista confiável" },
  { id:"urgencia", label:"🔥 Urgência", desc:"Senso de necessidade" },
];
const AUDIENCES = [
  { id:"jovens", label:"🧑 Jovens 18–28", desc:"Início da vida financeira" },
  { id:"adultos", label:"👨 Adultos 29–45", desc:"Consolidação patrimonial" },
  { id:"iniciantes", label:"🌱 Iniciantes", desc:"Sem educação financeira" },
  { id:"endividados", label:"🔴 No vermelho", desc:"Precisam sair das dívidas" },
  { id:"investidores", label:"📈 Investidores", desc:"Querem fazer render" },
  { id:"autonomos", label:"💼 MEI / Autônomos", desc:"Renda variável" },
];
const THEMES = [
  { e:"🛡️", l:"Reserva", v:"reserva de emergência" },
  { e:"📊", l:"Gastos", v:"controle de gastos no dia a dia" },
  { e:"📈", l:"Investir", v:"como começar a investir com pouco" },
  { e:"🔓", l:"Dívidas", v:"estratégias para sair das dívidas" },
  { e:"💡", l:"Renda extra", v:"como gerar renda extra em 2025" },
  { e:"🏛️", l:"Tesouro", v:"Tesouro Direto para iniciantes" },
  { e:"💳", l:"Cartão", v:"uso inteligente do cartão de crédito" },
  { e:"🎯", l:"Metas", v:"como definir e atingir metas financeiras" },
  { e:"🏠", l:"Casa própria", v:"planejamento para comprar a casa própria" },
  { e:"👴", l:"Aposentaria", v:"como se aposentar com conforto no Brasil" },
  { e:"📱", l:"iMoney", v:"como o iMoney transforma a vida financeira" },
  { e:"💰", l:"Salário", v:"como organizar o salário no primeiro dia do mês" },
];

const C = { green:"#00C853", greenGlow:"rgba(0,200,83,0.12)", bg:"#07100a", s1:"#0e1a10", s2:"#152018", s3:"#1c2b1e", border:"rgba(0,200,83,0.16)", text:"#dff0e3", muted:"#6b8f72", white:"#ffffff", red:"#ff5252" };

export default function MarketingAgent() {
  const router = useRouter();
  const [platform, setPlatform] = useState("instagram");
  const [format, setFormat] = useState("educacional");
  const [tone, setTone] = useState("amigavel");
  const [audience, setAudience] = useState("jovens");
  const [theme, setTheme] = useState("");
  const [chip, setChip] = useState<number|null>(null);
  const [qty, setQty] = useState(2);
  const [aesthetic, setAesthetic] = useState("bold");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [activeVar, setActiveVar] = useState(0);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"config"|"output">("config");
  const [copied, setCopied] = useState<string|null>(null);
  const [hist, setHist] = useState<any[]>([]);
  const [saved, setSaved] = useState<string|null>(null);

  const pl = PLATFORMS.find(p => p.id === platform)!;
  const current = results[activeVar];

  const generate = useCallback(async () => {
    setLoading(true); setError(""); setResults([]); setActiveVar(0);
    try {
      const res = await fetch("/api/admin/agents/marketing", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ platform, format, tone, audience, theme, qty, aesthetic }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Erro"); }
      const data = await res.json();
      const vars = data.variations || [];
      if (!vars.length || !vars[0].post) throw new Error("Sem conteúdo. Tente novamente.");
      setResults(vars);
      setTab("output");
      // Nota: imagens sendo geradas em background
      setHist((h:any[]) => [{ text: vars[0].post.split("\n")[0].slice(0,50), pl: pl.label, ts: new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) }, ...h].slice(0,10));
      // Gerar imagens separadamente (evita timeout)
      const ASPECT: Record<string,string> = { instagram:"1:1", tiktok:"9:16", twitter:"16:9", linkedin:"1:1", whatsapp:"1:1" };
      const aspectRatio = ASPECT[platform] || "1:1";
      const varsWithImages = await Promise.all(vars.map(async (v: any) => {
        try {
          const imgRes = await fetch("/api/admin/agents/marketing/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: v.image_prompt || theme || "personal finance", aspectRatio }),
          });
          const imgData = await imgRes.json();
          return { ...v, imageUrl: imgData.imageUrl || null };
        } catch { return v; }
      }));
      setResults(varsWithImages);
    } catch(e:any) { setError(e.message); }
    finally { setLoading(false); }
  }, [platform, format, tone, audience, theme, qty, aesthetic, pl.label]);

  const copy = (type: string) => {
    if (!current) return;
    const tags = (current.hashtags||[]).map((h:string) => "#"+h.replace("#","")).join(" ");
    const txt = type === "post" ? current.post : `${current.post}\n\n${tags}`;
    navigator.clipboard.writeText(txt).then(() => { setCopied(type); setTimeout(() => setCopied(null), 2500); });
  };

  const downloadImage = () => {
    if (!current?.imageUrl) return;
    const a = document.createElement("a");
    a.href = current.imageUrl;
    a.download = `imoney-post-${platform}-${Date.now()}.png`;
    a.click();
  };

  const savePost = async () => {
    if (!current) return;
    try {
      await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform, format, tone, audience, theme, aesthetic,
          post: current.post,
          hashtags: current.hashtags,
          cta: current.cta,
          melhor_horario: current.melhor_horario,
          gancho: current.gancho,
          insight: current.insight,
          gemini_prompt: current.gemini_prompt,
          carousel_slides: current.carousel_slides || null,
        }),
      });
      setSaved("ok");
      setTimeout(() => setSaved(null), 3000);
    } catch {}
  };

  const logout = async () => { await fetch("/api/admin/auth",{method:"DELETE"}); router.push("/admin/login"); };
  const charCount = current?.post?.length || 0;
  const overLimit = charCount > pl.maxChars;

  const optGrid = (items: any[], selected: string, onSelect: (id:string)=>void) => (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
      {items.map(item => {
        const on = selected === item.id;
        return (
          <button key={item.id} onClick={() => onSelect(item.id)} style={{ background:on?C.greenGlow:C.s2, border:`1px solid ${on?C.green:C.border}`, color:on?C.green:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:on?700:500, padding:"10px 12px", borderRadius:12, cursor:"pointer", textAlign:"left" as const }}>
            <div>{item.label}</div>
            {item.desc && <div style={{ fontSize:10, opacity:0.7, marginTop:2 }}>{item.desc}</div>}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}} *{box-sizing:border-box}`}</style>

      {/* TOPBAR */}
      <div style={{ background:C.s1, borderBottom:`1px solid ${C.border}`, padding:"0 24px", height:58, position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => router.push("/admin")} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, fontFamily:"inherit", fontSize:12, padding:"5px 10px", borderRadius:8, cursor:"pointer" }}>← Admin</button>
          <span style={{ fontSize:14, fontWeight:800, color:C.white }}>📣 Agente de Marketing</span>
          <div style={{ background:C.greenGlow, border:`1px solid ${C.border}`, color:C.green, fontSize:10, fontFamily:"monospace", padding:"2px 8px", borderRadius:20 }}>claude opus + gemini</div>
        </div>
        <button onClick={logout} style={{ background:"transparent", border:"1px solid rgba(255,82,82,0.25)", color:C.red, fontFamily:"inherit", fontSize:11, padding:"4px 10px", borderRadius:8, cursor:"pointer" }}>Sair</button>
      </div>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"24px 16px 80px" }}>

        {/* TABS */}
        <div style={{ display:"flex", gap:6, marginBottom:20, background:C.s1, borderRadius:14, padding:5, border:`1px solid ${C.border}` }}>
          {([["config","⚙️ Configurar"],["output",`✦ Resultado${results.length?` (${results.length})`:""}`]] as const).map(([id,lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex:1, background:tab===id?C.s3:"transparent", border:`1px solid ${tab===id?C.border:"transparent"}`, color:tab===id?C.green:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:tab===id?800:500, padding:"9px 0", borderRadius:10, cursor:"pointer" }}>{lbl}</button>
          ))}
        </div>

        {/* CONFIG */}
        {tab === "config" && (
          <div style={{ animation:"up .25s ease" }}>
            {[
              { title:"Plataforma", content:(
                <div>
                  <div style={{ display:"flex", flexWrap:"wrap" as const, gap:8 }}>
                    {PLATFORMS.map(p => { const on = platform===p.id; return (
                      <button key={p.id} onClick={() => setPlatform(p.id)} style={{ background:on?C.greenGlow:C.s2, border:`1px solid ${on?C.green:C.border}`, color:on?C.green:C.muted, fontWeight:on?800:500, fontFamily:"inherit", fontSize:13, padding:"9px 16px", borderRadius:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>{p.icon} {p.label}</button>
                    ); })}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, fontFamily:"monospace", marginTop:8 }}>limite: {pl.maxChars.toLocaleString()} chars</div>
                </div>
              )},
              { title:"Formato", content: optGrid(FORMATS, format, setFormat) },
              { title:"Tom", content: optGrid(TONES, tone, setTone) },
              { title:"Público-alvo", content: optGrid(AUDIENCES, audience, setAudience) },
              { title:"Tema", content:(
                <div>
                  <input value={theme} onChange={e => { setTheme(e.target.value); setChip(null); }} placeholder="Digite um tema ou escolha abaixo..." style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`, color:C.text, fontFamily:"inherit", fontSize:13, padding:"11px 14px", borderRadius:12, outline:"none", marginBottom:12 }} />
                  <div style={{ display:"flex", flexWrap:"wrap" as const, gap:7 }}>
                    {THEMES.map((t,i) => { const on = chip===i; return (
                      <button key={i} onClick={() => { setChip(i); setTheme(t.v); }} style={{ background:on?C.greenGlow:C.s2, border:`1px solid ${on?C.green:C.border}`, color:on?C.green:C.muted, fontFamily:"inherit", fontSize:12, padding:"6px 11px", borderRadius:20, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 }}>{t.e} {t.l}</button>
                    ); })}
                  </div>
                </div>
              )},
              { title:"Estética Visual", content:(
                <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
                  {[
                    { id:"bold", icon:"💥", label:"Bold & Impact", desc:"Estilo atual iMoney — tipografia pesada, verde escuro" },
                    { id:"clean", icon:"✨", label:"Clean & Minimal", desc:"Fundo branco, elegante, muito espaço" },
                    { id:"editorial", icon:"📰", label:"Editorial", desc:"Estilo revista financeira brasileira" },
                    { id:"gradient", icon:"🌊", label:"Gradient & Modern", desc:"Gradientes verdes, futurista" },
                    { id:"ilustrado", icon:"🎨", label:"Ilustrado Brasileiro", desc:"Personagens e ilustrações flat" },
                  ].map(a => { const on = aesthetic===a.id; return (
                    <button key={a.id} onClick={() => setAesthetic(a.id)} style={{ background:on?C.greenGlow:C.s2, border:`1px solid ${on?C.green:C.border}`, color:on?C.green:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:on?700:500, padding:"10px 14px", borderRadius:12, cursor:"pointer", textAlign:"left" as const, display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:18 }}>{a.icon}</span>
                      <div>
                        <div>{a.label}</div>
                        <div style={{ fontSize:10, opacity:0.7, marginTop:1 }}>{a.desc}</div>
                      </div>
                    </button>
                  ); })}
                </div>
              )},
              { title:"Variações", content:(
                <div>
                  <div style={{ display:"flex", gap:8 }}>
                    {[1,2,3].map(n => { const on = qty===n; return (
                      <button key={n} onClick={() => setQty(n)} style={{ flex:1, background:on?C.greenGlow:C.s2, border:`1px solid ${on?C.green:C.border}`, color:on?C.green:C.muted, fontFamily:"inherit", fontSize:14, fontWeight:on?800:600, padding:"11px 0", borderRadius:12, cursor:"pointer" }}>{n} variação{n>1?"ões":""}</button>
                    ); })}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:8, textAlign:"center" as const }}>Claude Opus gera o texto · Gemini gera a imagem</div>
                </div>
              )},
            ].map(({ title, content }) => (
              <div key={title} style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
                <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:12 }}>// {title}</div>
                {content}
              </div>
            ))}

            {error && <div style={{ background:"rgba(255,82,82,0.08)", border:"1px solid rgba(255,82,82,0.25)", color:C.red, padding:"12px 16px", borderRadius:12, fontSize:13, marginBottom:12, textAlign:"center" as const }}>⚠️ {error}</div>}

            <button onClick={generate} disabled={loading} style={{ width:"100%", background:loading?"#007a32":C.green, color:"#000", border:"none", borderRadius:14, padding:"17px 0", fontFamily:"inherit", fontSize:16, fontWeight:900, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:loading?"none":"0 4px 20px rgba(0,200,83,0.25)" }}>
              <span style={loading?{display:"inline-block",animation:"spin .8s linear infinite"}:{}}>{loading?"◌":"✦"}</span>
              {loading ? `Gerando texto + imagem...` : `Gerar ${qty} variação${qty>1?"ões":""} com texto + imagem`}
            </button>

            {hist.length > 0 && (
              <div style={{ marginTop:20 }}>
                <div style={{ fontSize:10, fontFamily:"monospace", color:C.muted, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:10 }}>// gerações recentes</div>
                {hist.map((h:any,i:number) => (
                  <div key={i} style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:C.green, flexShrink:0 }} />
                    <div style={{ flex:1, fontSize:12, color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{h.text}…</div>
                    <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, flexShrink:0 }}>{h.pl} · {h.ts}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OUTPUT */}
        {tab === "output" && (
          <div style={{ animation:"up .25s ease" }}>
            {!results.length ? (
              <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:"60px 20px", textAlign:"center" as const }}>
                <div style={{ fontSize:40, marginBottom:14 }}>✦</div>
                <div style={{ color:C.muted, fontSize:14 }}>Nenhum conteúdo ainda.</div>
                <button onClick={() => setTab("config")} style={{ marginTop:16, background:C.greenGlow, border:`1px solid ${C.green}`, color:C.green, fontFamily:"inherit", fontSize:13, fontWeight:700, padding:"10px 20px", borderRadius:10, cursor:"pointer" }}>Configurar →</button>
              </div>
            ) : (
              <>
                {results.length > 1 && (
                  <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                    {results.map((_:any,i:number) => { const on = activeVar===i; return (
                      <button key={i} onClick={() => setActiveVar(i)} style={{ flex:1, background:on?C.greenGlow:C.s1, border:`1px solid ${on?C.green:C.border}`, color:on?C.green:C.muted, fontFamily:"inherit", fontSize:12, fontWeight:on?800:600, padding:"10px 0", borderRadius:12, cursor:"pointer" }}>Variação {i+1}</button>
                    ); })}
                  </div>
                )}

                {current && (
                  <>
                    {/* IMAGEM */}
                    {current.imageUrl && (
                      <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden", marginBottom:14 }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", borderBottom:`1px solid ${C.border}` }}>
                          <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const, letterSpacing:"1px" }}>// imagem gerada · gemini nano</div>
                          <button onClick={downloadImage} style={{ background:C.greenGlow, border:`1px solid ${C.green}`, color:C.green, fontFamily:"monospace", fontSize:11, padding:"5px 12px", borderRadius:7, cursor:"pointer", fontWeight:700 }}>⬇ baixar</button>
                        </div>
                        <img src={current.imageUrl} alt="Imagem gerada" style={{ width:"100%", maxHeight:400, objectFit:"cover", display:"block" }} />
                      </div>
                    )}

                    {/* POST */}
                    <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                        <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, letterSpacing:"1px" }}>// POST · {pl.icon} {pl.label.toUpperCase()}</div>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => copy("post")} style={{ background:copied==="post"?C.greenGlow:"transparent", border:`1px solid ${copied==="post"?C.green:C.border}`, color:copied==="post"?C.green:C.muted, fontFamily:"monospace", fontSize:11, padding:"5px 10px", borderRadius:7, cursor:"pointer" }}>{copied==="post"?"✓ copiado!":"copiar"}</button>
                          <button onClick={() => copy("all")} style={{ background:copied==="all"?C.green:"transparent", border:`1px solid ${copied==="all"?C.green:C.border}`, color:copied==="all"?"#000":C.muted, fontFamily:"monospace", fontSize:11, padding:"5px 10px", borderRadius:7, cursor:"pointer", fontWeight:700 }}>{copied==="all"?"✓ tudo!":"+ hashtags"}</button>
                        </div>
                      </div>
                      <div style={{ fontSize:14, lineHeight:1.85, color:C.text, whiteSpace:"pre-wrap", background:C.s2, borderRadius:12, padding:"18px 16px", borderLeft:`3px solid ${C.green}`, marginBottom:14 }}>{current.post}</div>
                      <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6, marginBottom:12 }}>
                        {(current.hashtags||[]).map((h:string,i:number) => (
                          <span key={i} style={{ background:C.greenGlow, color:C.green, fontSize:11, fontFamily:"monospace", padding:"3px 9px", borderRadius:20, border:`1px solid ${C.border}` }}>#{h.replace("#","")}</span>
                        ))}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:overLimit?"rgba(255,82,82,0.06)":C.s3, borderRadius:8, border:`1px solid ${overLimit?"rgba(255,82,82,0.2)":C.border}` }}>
                        <span style={{ fontSize:11, color:C.muted, fontFamily:"monospace" }}>caracteres</span>
                        <span style={{ fontSize:12, fontFamily:"monospace", fontWeight:700, color:overLimit?C.red:C.green }}>{charCount.toLocaleString()} / {pl.maxChars.toLocaleString()}{overLimit?" ⚠️":""}</span>
                      </div>
                    </div>

                    {/* ESTRATÉGIA */}
                    <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
                      <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:12 }}>// Estratégia</div>
                      {[
                        { icon:"🎣", title:"GANCHO ALTERNATIVO", val:current.gancho, italic:true },
                        { icon:"📣", title:"CTA IDEAL", val:current.cta },
                        { icon:"⏰", title:"MELHOR HORÁRIO", val:current.melhor_horario },
                        { icon:"💡", title:"POR QUE VAI ENGAJAR", val:current.insight, muted:true },
                        { icon:"🎨", title:"PROMPT PARA GEMINI / NANO BANANA (copie e cole no Gemini para gerar a imagem)", val:current.gemini_prompt, isPrompt:true },
                      ].filter(r => r.val).map(({ icon, title, val, italic, muted: m, isPrompt }: any, i, arr) => (
                        <div key={title} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"14px 0", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none" }}>
                          <div style={{ width:36, height:36, background:C.s2, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{icon}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:9, color:C.muted, fontFamily:"monospace", letterSpacing:"1px", marginBottom:4 }}>{title}</div>
                            {isPrompt ? (
                              <div>
                                <div style={{ fontSize:12, color:C.text, lineHeight:1.6, background:C.s2, padding:"10px 12px", borderRadius:8, fontFamily:"monospace", marginBottom:8 }}>{val}</div>
                                <button onClick={() => navigator.clipboard.writeText(val)} style={{ background:C.greenGlow, border:`1px solid ${C.green}`, color:C.green, fontFamily:"inherit", fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:7, cursor:"pointer" }}>📋 Copiar prompt</button>
                              </div>
                            ) : (
                              <div style={{ fontSize:13, color:m?C.muted:C.text, fontStyle:italic?"italic":"normal", lineHeight:1.55 }}>{val}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* CARROSSEL */}
                    {current.carousel_slides && current.carousel_slides.length > 0 && (
                      <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
                        <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:14 }}>// Slides do Carrossel</div>
                        <div style={{ display:"flex", flexDirection:"column" as const, gap:10 }}>
                          {current.carousel_slides.map((slide: any, i: number) => (
                            <div key={i} style={{ background:C.s2, borderRadius:12, padding:14, border:`1px solid ${C.border}` }}>
                              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                                <div style={{ background:C.green, color:"#000", fontSize:10, fontWeight:800, fontFamily:"monospace", padding:"2px 8px", borderRadius:20 }}>SLIDE {slide.slide}</div>
                                <button onClick={() => navigator.clipboard.writeText(slide.visual_prompt)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, fontSize:10, fontFamily:"monospace", padding:"3px 8px", borderRadius:6, cursor:"pointer" }}>copiar prompt</button>
                              </div>
                              <div style={{ fontSize:15, fontWeight:800, color:C.white, marginBottom:4 }}>{slide.titulo}</div>
                              {slide.subtitulo && <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>{slide.subtitulo}</div>}
                              <div style={{ fontSize:11, color:C.muted, fontFamily:"monospace", background:C.s1, padding:"8px 10px", borderRadius:8, lineHeight:1.5 }}>🎨 {slide.visual_prompt}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AÇÕES */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                      <button onClick={() => setTab("config")} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:700, padding:"12px 0", borderRadius:12, cursor:"pointer" }}>← Nova geração</button>
                      <button onClick={savePost} style={{ background:saved?C.greenGlow:"transparent", border:`1px solid ${saved?C.green:C.border}`, color:saved?C.green:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:700, padding:"12px 0", borderRadius:12, cursor:"pointer" }}>{saved?"✓ Salvo!":"💾 Salvar"}</button>
                      <button onClick={downloadImage} disabled={!current?.imageUrl} style={{ background:current?.imageUrl?C.s2:"transparent", border:`1px solid ${current?.imageUrl?C.green:C.border}`, color:current?.imageUrl?C.green:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:700, padding:"12px 0", borderRadius:12, cursor:current?.imageUrl?"pointer":"not-allowed" }}>⬇ Baixar imagem</button>
                      <button onClick={() => copy("all")} style={{ gridColumn:"1 / -1", background:C.green, color:"#000", border:"none", fontFamily:"inherit", fontSize:14, fontWeight:900, padding:"14px 0", borderRadius:12, cursor:"pointer", boxShadow:"0 4px 16px rgba(0,200,83,0.25)" }}>
                        {copied==="all" ? "✓ Copiado! Hora de postar 🚀" : "📋 Copiar post + hashtags"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
