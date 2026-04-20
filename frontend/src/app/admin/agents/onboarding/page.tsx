"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const C = { green:"#00C853", greenGlow:"rgba(0,200,83,0.12)", bg:"#07100a", s1:"#0e1a10", s2:"#152018", s3:"#1c2b1e", border:"rgba(0,200,83,0.16)", text:"#dff0e3", muted:"#6b8f72", white:"#ffffff", red:"#ff5252" };

const SEQUENCE_INFO = [
  { day:"Imediato", icon:"👋", title:"Boas-vindas", desc:"Primeiro passo claro" },
  { day:"Dia 1", icon:"💰", title:"Cadastrar renda", desc:"Por que é importante" },
  { day:"Dia 2", icon:"📊", title:"Adicionar gastos", desc:"Categorias principais" },
  { day:"Dia 3", icon:"🎯", title:"Primeira meta", desc:"Definir objetivo" },
  { day:"Dia 5", icon:"🔗", title:"Open Finance", desc:"Categorização automática" },
  { day:"Dia 7", icon:"🤖", title:"Assessor IA", desc:"O que ele pode fazer" },
  { day:"Dia 14", icon:"💚", title:"Re-engajamento", desc:"Abordagem empática" },
];

export default function OnboardingAgent() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [context, setContext] = useState("");
  const [sendNow, setSendNow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeEmail, setActiveEmail] = useState(0);
  const [tab, setTab] = useState<"config"|"output">("config");
  const [copied, setCopied] = useState<string|null>(null);

  const generate = async () => {
    if (!userName.trim() || !userEmail.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/admin/agents/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, userEmail, context, sendNow }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const data = await res.json();
      setResult(data);
      setTab("output");
      setActiveEmail(0);
    } catch(e:any) { alert("Erro: " + e.message); }
    finally { setLoading(false); }
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(()=>setCopied(null),2000); });
  };

  const logout = async () => { await fetch("/api/admin/auth",{method:"DELETE"}); router.push("/admin/login"); };

  const current = result?.sequence?.[activeEmail];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}} *{box-sizing:border-box} input::placeholder,textarea::placeholder{color:#4a6b50}`}</style>

      {/* TOPBAR */}
      <div style={{ background:C.s1, borderBottom:`1px solid ${C.border}`, padding:"0 24px", height:58, position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => router.push("/admin")} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, fontFamily:"inherit", fontSize:12, padding:"5px 10px", borderRadius:8, cursor:"pointer" }}>← Admin</button>
          <span style={{ fontSize:14, fontWeight:800, color:C.white }}>🚀 Agente de Onboarding</span>
          <div style={{ background:C.greenGlow, border:`1px solid ${C.border}`, color:C.green, fontSize:10, fontFamily:"monospace", padding:"2px 8px", borderRadius:20 }}>claude opus + resend</div>
        </div>
        <button onClick={logout} style={{ background:"transparent", border:"1px solid rgba(255,82,82,0.25)", color:C.red, fontFamily:"inherit", fontSize:11, padding:"4px 10px", borderRadius:8, cursor:"pointer" }}>Sair</button>
      </div>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"24px 16px 80px" }}>

        {/* TABS */}
        <div style={{ display:"flex", gap:6, marginBottom:20, background:C.s1, borderRadius:14, padding:5, border:`1px solid ${C.border}` }}>
          {([["config","⚙️ Configurar"],["output",`📧 Sequência${result?` (${result.sequence?.length} emails)`:""}`]] as const).map(([id,lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex:1, background:tab===id?C.s3:"transparent", border:`1px solid ${tab===id?C.border:"transparent"}`, color:tab===id?C.green:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:tab===id?800:500, padding:"9px 0", borderRadius:10, cursor:"pointer" }}>{lbl}</button>
          ))}
        </div>

        {/* CONFIG */}
        {tab === "config" && (
          <div style={{ animation:"up .25s ease" }}>

            {/* PREVIEW DA SEQUÊNCIA */}
            <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
              <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:14 }}>// Sequência que será gerada</div>
              <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
                {SEQUENCE_INFO.map((s, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:C.s2, borderRadius:10 }}>
                    <div style={{ width:36, height:36, background:C.greenGlow, border:`1px solid ${C.border}`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{s.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{s.title}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{s.desc}</div>
                    </div>
                    <div style={{ fontSize:11, fontFamily:"monospace", color:C.green, background:C.greenGlow, padding:"3px 8px", borderRadius:20, border:`1px solid ${C.border}` }}>{s.day}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* DADOS DO USUÁRIO */}
            <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
              <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:16 }}>// Dados do usuário</div>
              <div style={{ display:"flex", flexDirection:"column" as const, gap:12 }}>
                <div>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Nome do usuário</div>
                  <input value={userName} onChange={e=>setUserName(e.target.value)} placeholder="ex: João Silva" style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`, color:C.text, fontFamily:"inherit", fontSize:14, padding:"12px 14px", borderRadius:10, outline:"none" }} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Email do usuário</div>
                  <input type="email" value={userEmail} onChange={e=>setUserEmail(e.target.value)} placeholder="ex: joao@email.com" style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`, color:C.text, fontFamily:"inherit", fontSize:14, padding:"12px 14px", borderRadius:10, outline:"none" }} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Contexto adicional (opcional)</div>
                  <textarea value={context} onChange={e=>setContext(e.target.value)} placeholder="ex: usuário veio de campanha no Instagram sobre reserva de emergência, jovem de 25 anos..." rows={3} style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`, color:C.text, fontFamily:"inherit", fontSize:13, padding:"12px 14px", borderRadius:10, outline:"none", resize:"vertical" }} />
                </div>
              </div>
            </div>

            {/* ENVIO */}
            <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
              <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, textTransform:"uppercase" as const, letterSpacing:"1.5px", marginBottom:14 }}>// Envio</div>
              <div onClick={() => setSendNow(!sendNow)} style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer", padding:"12px 14px", background:C.s2, borderRadius:10, border:`1px solid ${sendNow?C.green:C.border}` }}>
                <div style={{ width:20, height:20, borderRadius:6, background:sendNow?C.green:C.s1, border:`2px solid ${sendNow?C.green:C.muted}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {sendNow && <span style={{ color:"#000", fontSize:12, fontWeight:900 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>Enviar primeiro email agora</div>
                  <div style={{ fontSize:11, color:C.muted }}>O email de boas-vindas será enviado imediatamente via Resend</div>
                </div>
              </div>
            </div>

            {/* GERAR */}
            <button onClick={generate} disabled={loading || !userName.trim() || !userEmail.trim()} style={{ width:"100%", background:loading?"#007a32":(!userName.trim()||!userEmail.trim())?"#1a3a1a":C.green, color:"#000", border:"none", borderRadius:14, padding:"17px 0", fontFamily:"inherit", fontSize:16, fontWeight:900, cursor:loading||(!userName.trim()||!userEmail.trim())?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:"0 4px 20px rgba(0,200,83,0.25)", opacity:(!userName.trim()||!userEmail.trim())?0.5:1 }}>
              <span style={loading?{display:"inline-block",animation:"spin .8s linear infinite"}:{}}>{loading?"◌":"✦"}</span>
              {loading ? "Gerando 7 emails com Claude Opus..." : "Gerar Sequência de Onboarding"}
            </button>
          </div>
        )}

        {/* OUTPUT */}
        {tab === "output" && result && (
          <div style={{ animation:"up .25s ease" }}>

            {result.sent && (
              <div style={{ background:"rgba(0,200,83,0.08)", border:`1px solid ${C.green}`, borderRadius:12, padding:"12px 16px", marginBottom:16, fontSize:13, color:C.green, textAlign:"center" as const }}>
                ✅ Email de boas-vindas enviado para {userEmail}!
              </div>
            )}

            {/* SELETOR DE EMAIL */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const, marginBottom:16 }}>
              {result.sequence?.map((_:any, i:number) => {
                const info = SEQUENCE_INFO[i];
                const on = activeEmail === i;
                return (
                  <button key={i} onClick={() => setActiveEmail(i)} style={{ background:on?C.greenGlow:C.s1, border:`1px solid ${on?C.green:C.border}`, color:on?C.green:C.muted, fontFamily:"inherit", fontSize:12, fontWeight:on?800:500, padding:"8px 12px", borderRadius:10, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                    <span>{info?.icon}</span>
                    <span>{info?.day}</span>
                  </button>
                );
              })}
            </div>

            {current && (
              <>
                {/* EMAIL ATUAL */}
                <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                    <div>
                      <div style={{ fontSize:10, fontFamily:"monospace", color:C.green, letterSpacing:"1px", marginBottom:4 }}>// {SEQUENCE_INFO[activeEmail]?.day?.toUpperCase()} · {SEQUENCE_INFO[activeEmail]?.title?.toUpperCase()}</div>
                      <div style={{ fontSize:16, fontWeight:800, color:C.white }}>{current.subject}</div>
                      <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Preview: {current.preview}</div>
                    </div>
                    <button onClick={() => copy(current.plain, `plain-${activeEmail}`)} style={{ background:copied===`plain-${activeEmail}`?C.greenGlow:"transparent", border:`1px solid ${copied===`plain-${activeEmail}`?C.green:C.border}`, color:copied===`plain-${activeEmail}`?C.green:C.muted, fontFamily:"monospace", fontSize:11, padding:"5px 10px", borderRadius:7, cursor:"pointer", flexShrink:0 }}>
                      {copied===`plain-${activeEmail}`?"✓ copiado!":"copiar texto"}
                    </button>
                  </div>

                  {/* PREVIEW HTML */}
                  <div style={{ border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
                    <div style={{ background:C.s2, padding:"8px 14px", fontSize:10, fontFamily:"monospace", color:C.muted, borderBottom:`1px solid ${C.border}` }}>// preview do email</div>
                    <iframe srcDoc={current.html} style={{ width:"100%", height:400, border:"none", background:"#fff" }} title={`Email ${activeEmail+1}`} />
                  </div>

                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => copy(current.html, `html-${activeEmail}`)} style={{ flex:1, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, fontFamily:"inherit", fontSize:12, fontWeight:700, padding:"10px 0", borderRadius:10, cursor:"pointer" }}>
                      {copied===`html-${activeEmail}`?"✓ HTML copiado!":"📋 Copiar HTML"}
                    </button>
                    <button onClick={() => copy(current.plain, `plain-${activeEmail}`)} style={{ flex:1, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, fontFamily:"inherit", fontSize:12, fontWeight:700, padding:"10px 0", borderRadius:10, cursor:"pointer" }}>
                      {copied===`plain-${activeEmail}`?"✓ copiado!":"📄 Copiar texto"}
                    </button>
                    <button onClick={() => copy(current.subject, `subj-${activeEmail}`)} style={{ flex:1, background:C.greenGlow, border:`1px solid ${C.green}`, color:C.green, fontFamily:"inherit", fontSize:12, fontWeight:700, padding:"10px 0", borderRadius:10, cursor:"pointer" }}>
                      {copied===`subj-${activeEmail}`?"✓ copiado!":"✉️ Copiar assunto"}
                    </button>
                  </div>
                </div>

                {/* NAVEGAR */}
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => setActiveEmail(Math.max(0,activeEmail-1))} disabled={activeEmail===0} style={{ flex:1, background:"transparent", border:`1px solid ${C.border}`, color:activeEmail===0?C.s2:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:700, padding:"12px 0", borderRadius:12, cursor:activeEmail===0?"not-allowed":"pointer" }}>← Anterior</button>
                  <button onClick={() => setTab("config")} style={{ flex:1, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, fontFamily:"inherit", fontSize:13, fontWeight:700, padding:"12px 0", borderRadius:12, cursor:"pointer" }}>⚙️ Nova sequência</button>
                  <button onClick={() => setActiveEmail(Math.min((result.sequence?.length||1)-1,activeEmail+1))} disabled={activeEmail===(result.sequence?.length||1)-1} style={{ flex:1, background:C.green, color:"#000", border:"none", fontFamily:"inherit", fontSize:13, fontWeight:900, padding:"12px 0", borderRadius:12, cursor:activeEmail===(result.sequence?.length||1)-1?"not-allowed":"pointer", opacity:activeEmail===(result.sequence?.length||1)-1?0.5:1 }}>Próximo →</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
