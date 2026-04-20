"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const C = { green:"#00C853", greenGlow:"rgba(0,200,83,0.12)", bg:"#07100a", s1:"#0e1a10", s2:"#152018", s3:"#1c2b1e", border:"rgba(0,200,83,0.16)", text:"#dff0e3", muted:"#6b8f72", white:"#ffffff", red:"#ff5252" };

const PLATFORMS = [{ id:"auto", label:"🤖 Automático" },{ id:"instagram", label:"📸 Instagram" },{ id:"tiktok", label:"🎵 TikTok" },{ id:"twitter", label:"𝕏 Twitter" },{ id:"linkedin", label:"💼 LinkedIn" },{ id:"whatsapp", label:"💬 WhatsApp" }];
const FORMATS = [{ id:"auto", label:"🤖 Automático" },{ id:"educacional", label:"📚 Educacional" },{ id:"dica", label:"⚡ Dica Rápida" },{ id:"cta", label:"📲 CTA Download" },{ id:"historia", label:"💬 Caso de Sucesso" },{ id:"mito", label:"❌ Mito vs Verdade" },{ id:"dado", label:"📊 Dado de Impacto" },{ id:"carrossel", label:"📋 Carrossel" },{ id:"pergunta", label:"🤔 Pergunta" }];
const TONES = [{ id:"auto", label:"🤖 Automático" },{ id:"amigavel", label:"🤝 Amigável" },{ id:"inspirador", label:"✨ Inspirador" },{ id:"direto", label:"🎯 Direto" },{ id:"humor", label:"😄 Bem-humorado" },{ id:"autoridade", label:"📊 Autoridade" },{ id:"urgencia", label:"🔥 Urgência" }];
const AESTHETICS = [{ id:"bold", label:"💥 Bold & Impact", desc:"Estilo atual iMoney" },{ id:"clean", label:"✨ Clean & Minimal", desc:"Elegante e respirado" },{ id:"editorial", label:"📰 Editorial", desc:"Revista financeira" },{ id:"gradient", label:"🌊 Gradient", desc:"Moderno e tech" },{ id:"ilustrado", label:"🎨 Ilustrado", desc:"Flat brasileiro" }];

export default function MarketingAgent() {
  const router = useRouter();
  const [briefing, setBriefing] = useState("");
  const [platform, setPlatform] = useState("auto");
  const [format, setFormat] = useState("auto");
  const [tone, setTone] = useState("auto");
  const [aesthetic, setAesthetic] = useState("bold");
  const [qty, setQty] = useState(2);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [activeVar, setActiveVar] = useState(0);
  const [tab, setTab] = useState<"config"|"output">("config");
  const [copied, setCopied] = useState<string|null>(null);
  const [saved, setSaved] = useState(false);
  const [hist, setHist] = useState<any[]>([]);

  const current = results[activeVar];

  const generate = useCallback(async () => {
    if (!briefing.trim()) return;
    setLoading(true); setResults([]); setActiveVar(0);
    try {
      const res = await fetch("/api/admin/agents/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefing, platform, format, tone, aesthetic, qty }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const data = await res.json();
      const vars = data.variations || [];
      if (!vars.length) throw new Error("Sem conteúdo gerado.");
      setResults(vars);
      setTab("output");
      setHist(h => [{ text: briefing.slice(0,50), ts: new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) }, ...h].slice(0,8));
    } catch(e:any) { alert("Erro: " + e.message); }
    finally { setLoading(false); }
  }, [briefing, platform, format, tone, aesthetic, qty]);

  const copy = (type: string) => {
    if (!current) return;
    const tags = (current.hashtags||[]).map((h:string) => "#"+h.replace("#","")).join(" ");
    const txt = type === "post" ? current.post : `${current.post}\n\n${tags}`;
    navigator.clipboard.writeText(txt).then(() => { setCopied(type); setTimeout(()=>setCopied(null),2500); });
  };

  const savePost = async () => {
    if (!current) return;
    try {
      await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: current.plataforma_recomendada || platform,
          format: current.formato_recomendado || format,
          tone: current.tom_recomendado || tone,
          theme: briefing.slice(0,100),
          aesthetic,
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
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
  };

  const logout = async () => { await fetch("/api/admin/auth",{method:"DELETE"}); router.push("/admin/login"); };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}} *{box-sizing:border-box} textarea::placeholder,input::placeholder{color:#4a6b50} textarea:focus,input:focus{border-color:#00C853 !important} select option{background:#152018}`}</style>

      {/* TOPBAR */}
      <div style={{ background:C.s1, borderBottom:`1px solid ${C.border}`, padding:"0 24px", height:58, position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => router.push("/admin")} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, fontFamily:"inherit", fontSize:12, padding:"5px 10px", borderRadius:8, cursor:"pointer" }}>← Admin</button>
          <span style={{ fontSize:14, fontWeight:800, color:C.white }}>📣 Agente de Marketing</span>
          <div style={{ background:C.greenGlow, border:`1px solid ${C.border}`, color:C.green, fontSize:10, fontFamily:"monospace", padding:"2px 8px", borderRadius:20 }}>claude opus</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => router.push("/admin/posts")} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, fontFamily:"inherit", fontSize:11, padding:"4px 10px", borderRadius:8, cursor:"pointer" }}>🗃️ Banco</button>
          <button onClick={logout} style={{ background:"transparent", border:"1px solid rgba(255,82,82,0.25)", color:C.red, fontFamily:"inherit", fontSize:11, padding:"4px 10px", borderRadius:8, cursor:"pointer" }}>Sair</button>
        </div>
      </div>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"24px 16px 80px" }}>

        {/* TABS */}
        <div style={{ display:"flex", gap:6, marginBottom:20, background:C.s1, borderRadius:14, padding:5, border:`1px solid ${C.border}` }}>
          {([["config","✍️ Briefing"],["output",`✦ Resultado${results.length?` (${results.length})`:""}`]] as const).map(([id,lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex:1, background:tab===id?C.s3:"transparent", border:`1px solid ${tab===id?C.border:"transparent"}`, color:tab===id?C.green:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:tab===id?800:500, padding:"9px 0", borderRadius:10, cursor:"pointer" }}>{lbl}</button>
          ))}
        </div>

        {/* ── BRIEFING TAB ── */}
        {tab === "config" && (
          <div style={{ animation:"up .25s ease" }}>

            {/* MAIN INPUT */}
            <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
              <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:10 }}>// O que você quer comunicar?</div>
              <textarea
                value={briefing}
                onChange={e => setBriefing(e.target.value)}
                placeholder={`Descreva livremente o que você quer. Exemplos:\n\n"Quero um post educativo sobre reserva de emergência para jovens que acabaram de começar a trabalhar e não sabem por onde começar"\n\n"Preciso de algo que mostre como o iMoney ajuda a organizar gastos automaticamente, tom mais descontraído"\n\n"Post sobre os erros mais comuns com cartão de crédito que levam as pessoas ao endividamento"`}
                rows={8}
                style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`, color:C.text, fontFamily:"inherit", fontSize:14, padding:"14px 16px", borderRadius:12, outline:"none", resize:"vertical", lineHeight:1.6 }}
              />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                <div style={{ fontSize:11, color:C.muted }}>
                  {briefing.length > 0 ? `${briefing.length} caracteres` : "Quanto mais detalhes, melhor o resultado"}
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {["Reserva de emergência para iniciantes","Post viral sobre cartão de crédito","Caso de sucesso de usuário iMoney","Dado impactante sobre finanças no Brasil"].map(ex => (
                    <button key={ex} onClick={() => setBriefing(ex)} style={{ background:C.s2, border:`1px solid ${C.border}`, color:C.muted, fontFamily:"inherit", fontSize:10, padding:"3px 8px", borderRadius:6, cursor:"pointer" }}>
                      {ex.split(" ").slice(0,2).join(" ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* QUANTIDADE */}
            <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
              <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:12 }}>// Quantas variações?</div>
              <div style={{ display:"flex", gap:8 }}>
                {[1,2,3].map(n => { const on = qty===n; return (
                  <button key={n} onClick={() => setQty(n)} style={{ flex:1, background:on?C.greenGlow:C.s2, border:`1px solid ${on?C.green:C.border}`, color:on?C.green:C.muted, fontFamily:"inherit", fontSize:14, fontWeight:on?800:600, padding:"11px 0", borderRadius:12, cursor:"pointer" }}>
                    {n} variação{n>1?"ões":""}
                  </button>
                ); })}
              </div>
            </div>

            {/* ESTÉTICA */}
            <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
              <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:12 }}>// Estética Visual</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {AESTHETICS.map(a => { const on = aesthetic===a.id; return (
                  <button key={a.id} onClick={() => setAesthetic(a.id)} style={{ background:on?C.greenGlow:C.s2, border:`1px solid ${on?C.green:C.border}`, color:on?C.green:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:on?700:500, padding:"10px 14px", borderRadius:12, cursor:"pointer", textAlign:"left" as const }}>
                    <div>{a.label}</div>
                    <div style={{ fontSize:10, opacity:0.7, marginTop:2 }}>{a.desc}</div>
                  </button>
                ); })}
              </div>
            </div>

            {/* CONFIG OPCIONAIS */}
            <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden", marginBottom:14 }}>
              <button onClick={() => setShowConfig(!showConfig)} style={{ width:"100%", background:"transparent", border:"none", color:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:600, padding:"16px 20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span>⚙️ Configurações opcionais {showConfig ? "(ocultar)" : "(plataforma, formato, tom)"}</span>
                <span style={{ fontSize:16 }}>{showConfig?"▲":"▼"}</span>
              </button>
              {showConfig && (
                <div style={{ padding:"0 20px 20px", borderTop:`1px solid ${C.border}` }}>
                  <div style={{ marginTop:16, display:"flex", flexDirection:"column" as const, gap:12 }}>
                    {[
                      { label:"Plataforma", val:platform, set:setPlatform, opts:PLATFORMS },
                      { label:"Formato", val:format, set:setFormat, opts:FORMATS },
                      { label:"Tom de voz", val:tone, set:setTone, opts:TONES },
                    ].map(({ label, val, set, opts }) => (
                      <div key={label}>
                        <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>{label} <span style={{ color:C.green, fontSize:10 }}>(🤖 Automático = Claude decide o melhor)</span></div>
                        <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6 }}>
                          {opts.map(o => { const on = val===o.id; return (
                            <button key={o.id} onClick={() => set(o.id)} style={{ background:on?C.greenGlow:C.s2, border:`1px solid ${on?C.green:C.border}`, color:on?C.green:C.muted, fontFamily:"inherit", fontSize:12, fontWeight:on?700:400, padding:"6px 12px", borderRadius:20, cursor:"pointer" }}>{o.label}</button>
                          ); })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* GERAR */}
            <button onClick={generate} disabled={loading || !briefing.trim()} style={{ width:"100%", background:loading?"#007a32":!briefing.trim()?"#1a3a1a":C.green, color:"#000", border:"none", borderRadius:14, padding:"17px 0", fontFamily:"inherit", fontSize:16, fontWeight:900, cursor:loading||!briefing.trim()?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:loading||!briefing.trim()?"none":"0 4px 20px rgba(0,200,83,0.25)", opacity:!briefing.trim()?0.5:1 }}>
              <span style={loading?{display:"inline-block",animation:"spin .8s linear infinite"}:{}}>{loading?"◌":"✦"}</span>
              {loading ? "Analisando e gerando conteúdo..." : "Gerar conteúdo com Claude Opus"}
            </button>

            {/* HISTÓRICO */}
            {hist.length > 0 && (
              <div style={{ marginTop:20 }}>
                <div style={{ fontSize:10, fontFamily:"monospace", color:C.muted, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:10 }}>// Briefings recentes</div>
                {hist.map((h,i) => (
                  <div key={i} onClick={() => setBriefing(h.text)} style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, marginBottom:6, cursor:"pointer" }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:C.green, flexShrink:0 }} />
                    <div style={{ flex:1, fontSize:12, color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{h.text}…</div>
                    <div style={{ fontSize:10, fontFamily:"monospace", color:C.green }}>{h.ts}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── OUTPUT TAB ── */}
        {tab === "output" && (
          <div style={{ animation:"up .25s ease" }}>
            {!results.length ? (
              <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:"60px 20px", textAlign:"center" as const }}>
                <div style={{ fontSize:40, marginBottom:14 }}>✦</div>
                <div style={{ color:C.muted, fontSize:14 }}>Escreva um briefing e gere conteúdo.</div>
                <button onClick={() => setTab("config")} style={{ marginTop:16, background:C.greenGlow, border:`1px solid ${C.green}`, color:C.green, fontFamily:"inherit", fontSize:13, fontWeight:700, padding:"10px 20px", borderRadius:10, cursor:"pointer" }}>← Ir para briefing</button>
              </div>
            ) : (
              <>
                {/* RECOMENDAÇÕES DO CLAUDE */}
                {current?.analise && (
                  <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
                    <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:14 }}>// Análise Estratégica do Claude</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      {[
                        { icon:"📱", label:"Plataforma ideal", val:current.plataforma_recomendada },
                        { icon:"📋", label:"Formato ideal", val:current.formato_recomendado },
                        { icon:"🎯", label:"Tom de voz", val:current.tom_recomendado },
                        { icon:"👥", label:"Público-alvo", val:current.publico_recomendado },
                        { icon:"⏰", label:"Melhor horário", val:current.melhor_horario },
                      ].filter(r => r.val).map(({ icon, label, val }) => (
                        <div key={label} style={{ background:C.s2, borderRadius:10, padding:"10px 12px" }}>
                          <div style={{ fontSize:9, color:C.muted, fontFamily:"monospace", letterSpacing:"1px", marginBottom:4 }}>{icon} {label.toUpperCase()}</div>
                          <div style={{ fontSize:13, color:C.green, fontWeight:700 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {current.analise && (
                      <div style={{ marginTop:12, fontSize:12, color:C.muted, lineHeight:1.6, background:C.s2, padding:"10px 14px", borderRadius:10, borderLeft:`3px solid ${C.green}` }}>
                        💡 {current.analise}
                      </div>
                    )}
                  </div>
                )}

                {/* SELETOR DE VARIAÇÃO */}
                {results.length > 1 && (
                  <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                    {results.map((_,i) => { const on = activeVar===i; return (
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
                          <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const }}>// Imagem gerada</div>
                          <button onClick={() => { const a=document.createElement("a"); a.href=current.imageUrl; a.download=`imoney-post-${Date.now()}.png`; a.click(); }} style={{ background:C.greenGlow, border:`1px solid ${C.green}`, color:C.green, fontFamily:"monospace", fontSize:11, padding:"5px 12px", borderRadius:7, cursor:"pointer", fontWeight:700 }}>⬇ baixar</button>
                        </div>
                        <img src={current.imageUrl} alt="Post" style={{ width:"100%", maxHeight:400, objectFit:"cover", display:"block" }} />
                      </div>
                    )}

                    {/* POST */}
                    <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                        <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, letterSpacing:"1px" }}>// POST PRONTO</div>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => copy("post")} style={{ background:copied==="post"?C.greenGlow:"transparent", border:`1px solid ${copied==="post"?C.green:C.border}`, color:copied==="post"?C.green:C.muted, fontFamily:"monospace", fontSize:11, padding:"5px 10px", borderRadius:7, cursor:"pointer" }}>{copied==="post"?"✓":"copiar"}</button>
                          <button onClick={() => copy("all")} style={{ background:copied==="all"?C.green:"transparent", border:`1px solid ${copied==="all"?C.green:C.border}`, color:copied==="all"?"#000":C.muted, fontFamily:"monospace", fontSize:11, padding:"5px 10px", borderRadius:7, cursor:"pointer", fontWeight:700 }}>{copied==="all"?"✓ copiado!":"+ hashtags"}</button>
                        </div>
                      </div>
                      <div style={{ fontSize:14, lineHeight:1.85, color:C.text, whiteSpace:"pre-wrap", background:C.s2, borderRadius:12, padding:"18px 16px", borderLeft:`3px solid ${C.green}`, marginBottom:14 }}>{current.post}</div>
                      <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6 }}>
                        {(current.hashtags||[]).map((h:string,i:number) => (
                          <span key={i} style={{ background:C.greenGlow, color:C.green, fontSize:11, fontFamily:"monospace", padding:"3px 9px", borderRadius:20, border:`1px solid ${C.border}` }}>#{h.replace("#","")}</span>
                        ))}
                      </div>
                    </div>

                    {/* ESTRATÉGIA */}
                    <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
                      <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:12 }}>// Estratégia & Visual</div>
                      {[
                        { icon:"🎣", title:"GANCHO ALTERNATIVO", val:current.gancho, italic:true },
                        { icon:"📣", title:"CTA IDEAL", val:current.cta },
                        { icon:"💡", title:"POR QUE VAI ENGAJAR", val:current.insight, muted:true },
                        { icon:"🎨", title:"PROMPT PARA GEMINI (copie e cole para gerar a imagem)", val:current.gemini_prompt, isPrompt:true },
                      ].filter(r => r.val).map(({ icon, title, val, italic, muted:m, isPrompt }:any, i, arr) => (
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
                    {current.carousel_slides?.length > 0 && (
                      <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
                        <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:14 }}>// Slides do Carrossel</div>
                        {current.carousel_slides.map((slide:any, i:number) => (
                          <div key={i} style={{ background:C.s2, borderRadius:12, padding:14, border:`1px solid ${C.border}`, marginBottom:8 }}>
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
                    )}

                    {/* AÇÕES */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                      <button onClick={() => setTab("config")} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:700, padding:"12px 0", borderRadius:12, cursor:"pointer" }}>← Novo briefing</button>
                      <button onClick={savePost} style={{ background:saved?C.greenGlow:"transparent", border:`1px solid ${saved?C.green:C.border}`, color:saved?C.green:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:700, padding:"12px 0", borderRadius:12, cursor:"pointer" }}>{saved?"✓ Salvo!":"💾 Salvar"}</button>
                      <button onClick={() => copy("all")} style={{ background:C.green, color:"#000", border:"none", fontFamily:"inherit", fontSize:13, fontWeight:900, padding:"12px 0", borderRadius:12, cursor:"pointer" }}>
                        {copied==="all"?"✓ Copiado! 🚀":"📋 Copiar tudo"}
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
