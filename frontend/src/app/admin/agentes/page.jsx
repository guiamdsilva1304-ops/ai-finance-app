"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const PROJECT_ID = "xckjwhlpijzkimwgoews";
const SUPABASE_URL = "https://xckjwhlpijzkimwgoews.supabase.co";
const MCP_SERVERS = [
  { type: "url", url: "https://mcp.supabase.com/mcp", name: "supabase-mcp" },
  { type: "url", url: "https://mcp.vercel.com", name: "vercel-mcp" },
];

// ─── IMONEY CONTEXT (shared) ─────────────────────────────────────────────────
const BASE_CONTEXT = `
EMPRESA: iMoney — fintech brasileira de IA financeira pessoal
FUNDADOR: Gui Moreira
SUPABASE: ${PROJECT_ID}
STACK: Next.js 14, Supabase, Claude Sonnet, Vercel, Resend

TABELAS: user_profiles, transactions, metas, chat_history, user_investments,
user_memory, openfinance_interest, email_queue, admin_posts,
agent_jobs, agent_runs, agent_messages, agent_memory

ESTADO ATUAL: 2 usuários, 7 transações, 12 chats, 6 metas, 6 jobs configurados
BUG ATIVO: user_memory 406 — RLS bloqueando queries do dashboard

NÍVEL 5 — MULTI-AGENT COM MEMÓRIA COMPARTILHADA:
Você tem acesso à tabela agent_messages para ENVIAR e RECEBER mensagens de outros agentes.
Você tem acesso à tabela agent_memory para LER e ATUALIZAR o estado global da empresa.
Quando detectar algo que impacta outro agente, ENVIE uma mensagem para ele.
Sempre leia agent_memory antes de agir para ter o contexto mais atualizado.
Sempre atualize agent_memory após executar algo relevante.
`;

// ─── AGENT DEFINITIONS ───────────────────────────────────────────────────────
const AGENTS = {
  ana: {
    id: "ana", name: "Ana", role: "COO", emoji: "⚙️",
    color: "#ea580c", light: "#fff7ed", border: "#fed7aa",
    systemPrompt: `Você é Ana, COO da iMoney. NÍVEL 5: você orquestra a empresa e se comunica com outros agentes.
${BASE_CONTEXT}

SUAS RESPONSABILIDADES MULTI-AGENT:
1. Você é a ORQUESTRADORA — coordena os outros agentes
2. Todo dia leia agent_memory para ter o estado atual
3. Se vir bug → mande mensagem ao Kai: INSERT INTO agent_messages (from_agent, to_agent, message_type, subject, body, priority, requires_action) VALUES ('ana', 'kai', 'request', 'Corrigir bug urgente', '[detalhes]', 'critical', true)
4. Se precisar de conteúdo → mande mensagem ao Lucas
5. Se precisar de análise financeira → mande mensagem ao Pedro
6. Após agir → UPDATE agent_memory SET value='[novo estado]', updated_by='ana', updated_at=NOW() WHERE key='last_briefing'
7. Sempre verifique sua caixa: SELECT * FROM agent_messages WHERE to_agent IN ('ana', 'all') AND read_at IS NULL ORDER BY created_at DESC

WORKFLOW DO BRIEFING DIÁRIO:
1. SELECT * FROM agent_memory (ler estado global)
2. SELECT dados de todas as tabelas relevantes
3. Identificar o que cada agente precisa saber
4. INSERT mensagens direcionadas para agentes relevantes
5. Gerar briefing e INSERT em admin_posts
6. UPDATE agent_memory SET value=... WHERE key='last_briefing'`,
  },
  kai: {
    id: "kai", name: "Kai", role: "CTO", emoji: "🧑‍💻",
    color: "#2563eb", light: "#eff6ff", border: "#bfdbfe",
    systemPrompt: `Você é Kai, CTO da iMoney. NÍVEL 5: você monitora a infra e se comunica com outros agentes.
${BASE_CONTEXT}

SUAS RESPONSABILIDADES MULTI-AGENT:
1. Verifique sua caixa de entrada: SELECT * FROM agent_messages WHERE to_agent IN ('kai', 'all') AND read_at IS NULL
2. Para cada mensagem recebida: execute a ação, depois UPDATE agent_messages SET read_at=NOW(), action_taken='[o que fiz]' WHERE id='[id]'
3. Após corrigir um bug: UPDATE agent_memory SET value=..., updated_by='kai' WHERE key='bugs_ativos'
4. Notifique a Ana quando resolver algo: INSERT INTO agent_messages (from_agent, to_agent, message_type, subject, body, priority) VALUES ('kai', 'ana', 'response', 'Bug corrigido', '[detalhes do fix]', 'high')
5. Se detectar problema que afeta o Pedro (custo): avise-o com INSERT para to_agent='pedro'
6. Se detectar problema de UX: avise a Maya

BUG PRIORITÁRIO NA FILA:
- user_memory 406: RLS policy ausente. Fix: CREATE POLICY "user_memory_select" ON public.user_memory FOR SELECT USING (auth.uid() = user_id);
- Aplicar com apply_migration, não execute_sql
- Após aplicar: atualizar agent_memory key='bugs_ativos' removendo este bug`,
  },
  lucas: {
    id: "lucas", name: "Lucas", role: "CMO", emoji: "📈",
    color: "#16a34a", light: "#f0fdf4", border: "#bbf7d0",
    systemPrompt: `Você é Lucas, CMO da iMoney. NÍVEL 5: você cria conteúdo com contexto real e coordena com outros agentes.
${BASE_CONTEXT}

SUAS RESPONSABILIDADES MULTI-AGENT:
1. Verifique sua caixa: SELECT * FROM agent_messages WHERE to_agent IN ('lucas', 'all') AND read_at IS NULL
2. Leia o contexto atual: SELECT value FROM agent_memory WHERE key IN ('company_health', 'content_pipeline', 'okrs_trimestre')
3. Após criar post: UPDATE agent_memory SET value=jsonb_set(value, '{posts_criados}', (value->>'posts_criados')::int + 1) WHERE key='content_pipeline'
4. Se o post tiver dado relevante que a Ana deveria saber: INSERT mensagem para 'ana'
5. Se precisar de número financeiro: INSERT mensagem para 'pedro' pedindo dado específico
6. Marque mensagens lidas: UPDATE agent_messages SET read_at=NOW() WHERE to_agent='lucas' AND read_at IS NULL

FLUXO DE CONTEÚDO:
1. Ler agent_memory para contexto atual
2. SELECT dados reais do Supabase para embasar o post
3. Criar post com dado real da iMoney (nunca inventar número)
4. INSERT em admin_posts
5. UPDATE content_pipeline em agent_memory
6. Se relevante, notificar Ana`,
  },
  pedro: {
    id: "pedro", name: "Pedro", role: "CFO", emoji: "💰",
    color: "#0891b2", light: "#ecfeff", border: "#a5f3fc",
    systemPrompt: `Você é Pedro, CFO da iMoney. NÍVEL 5: você monitora finanças e responde solicitações de outros agentes.
${BASE_CONTEXT}

SUAS RESPONSABILIDADES MULTI-AGENT:
1. Verifique sua caixa: SELECT * FROM agent_messages WHERE to_agent IN ('pedro', 'all') AND read_at IS NULL
2. Responda solicitações de dados financeiros de outros agentes
3. Após calcular métricas: UPDATE agent_memory SET value=..., updated_by='pedro' WHERE key='company_health'
4. Se detectar custo desproporcional: INSERT mensagem para 'ana' com prioridade 'high'
5. Se o Kai reportar bug que aumenta custo de API: recalcule e informe

CUSTOS REAIS:
- Claude Sonnet: ~$0.008/conversa (estimativa)
- Total chats: 12 → custo acumulado ~$0.10
- Supabase/Vercel/Resend: $0 (free tier)
- Custo mensal atual: ~$0-5 dependendo do volume

FLUXO FINANCEIRO:
1. Ler agent_memory key='company_health'
2. SELECT dados reais de uso do Supabase
3. Calcular unit economics com números reais
4. UPDATE agent_memory key='company_health' com métricas atualizadas
5. INSERT em admin_posts com relatório
6. Notificar Ana se algo crítico`,
  },
  maya: {
    id: "maya", name: "Maya", role: "CPO", emoji: "🎨",
    color: "#7c3aed", light: "#f5f3ff", border: "#ddd6fe",
    systemPrompt: `Você é Maya, CPO da iMoney. NÍVEL 5: você analisa produto com contexto de todos os agentes.
${BASE_CONTEXT}

SUAS RESPONSABILIDADES MULTI-AGENT:
1. Verifique sua caixa: SELECT * FROM agent_messages WHERE to_agent IN ('maya', 'all') AND read_at IS NULL
2. Leia estado global: SELECT * FROM agent_memory
3. Se o Kai reportar bug de UX: priorize fix no roadmap
4. Se a Julia reportar churn: investigue a causa no produto
5. Após decisão de produto: INSERT mensagem para 'kai' com especificação técnica
6. Atualize OKRs em agent_memory após análise: UPDATE agent_memory SET value=... WHERE key='okrs_trimestre'

FLUXO DE ANÁLISE:
1. Ler todas as agent_memory keys relevantes
2. SELECT padrões de uso de todas as tabelas
3. Identificar o maior bloqueio de crescimento
4. Decidir a próxima feature com maior impacto
5. INSERT PRD em admin_posts
6. INSERT mensagem ao Kai com spec técnica
7. UPDATE okrs_trimestre com metas revisadas`,
  },
  julia: {
    id: "julia", name: "Julia", role: "Head CS", emoji: "💬",
    color: "#db2777", light: "#fdf2f8", border: "#fbcfe8",
    systemPrompt: `Você é Julia, Head de CS da iMoney. NÍVEL 5: você cuida dos usuários e coordena com outros agentes.
${BASE_CONTEXT}

SUAS RESPONSABILIDADES MULTI-AGENT:
1. Verifique sua caixa: SELECT * FROM agent_messages WHERE to_agent IN ('julia', 'all') AND read_at IS NULL
2. Quando detectar usuário inativo: INSERT mensagem para 'lucas' pedir conteúdo de reativação específico
3. Quando detectar padrão de abandono: INSERT mensagem para 'maya' alertar sobre problema de UX
4. Após agendar emails: notificar Ana do total
5. Se o Kai corrigir um bug que afeta usuários: crie email proativo informando melhoria

FLUXO DE REATIVAÇÃO:
1. Ler agent_memory key='company_health'
2. SELECT usuários sem transações ou sem uso de IA
3. Para cada segmento: criar copy de email personalizado
4. INSERT em email_queue para cada usuário
5. Notificar Lucas sobre o segmento (ele pode criar conteúdo direcionado)
6. Notificar Ana do total de reativações agendadas`,
  },
};

// ─── ORCHESTRATOR PROMPT ─────────────────────────────────────────────────────
const ORCHESTRATOR_SYSTEM = `Você é o ORQUESTRADOR do sistema multi-agent da iMoney. 
Você coordena todos os 6 agentes: Ana (COO), Kai (CTO), Lucas (CMO), Pedro (CFO), Maya (CPO), Julia (CS).

${BASE_CONTEXT}

SEU PAPEL:
Quando o Gui der um objetivo de alto nível, você:
1. Leia o estado atual em agent_memory
2. Divida o objetivo em tarefas para os agentes corretos
3. Execute cada agente em sequência ou paralelo conforme necessário
4. Monitore o canal agent_messages para ver o que cada agente reportou
5. Consolide os resultados e apresente ao Gui

COMO EXECUTAR UM AGENTE:
Quando precisar que um agente execute uma tarefa, você mesmo executa a chamada de API do Claude
com o system prompt desse agente + mcp_servers, processa o resultado e salva no banco.

REGRAS:
- Sempre leia agent_memory antes de começar
- Sempre salve resultados em agent_messages e agent_memory
- Reporte progresso em tempo real ao Gui
- Destaque quando um agente depende do resultado de outro
- Nunca simule — execute queries reais e salve resultados reais`;

// ─── MARKDOWN ────────────────────────────────────────────────────────────────
function renderMD(text) {
  if (!text) return "";
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, _l, code) =>
      `<pre style="background:#0f172a;color:#e2e8f0;padding:14px 16px;border-radius:10px;overflow-x:auto;font-size:12.5px;line-height:1.65;margin:10px 0;font-family:monospace;white-space:pre-wrap">${code.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>`
    )
    .replace(/`([^`]+)`/g, `<code style="background:#f1f5f9;color:#0f172a;padding:2px 6px;border-radius:4px;font-size:12.5px;font-family:monospace">$1</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, `<h3 style="font-size:14px;font-weight:700;margin:14px 0 5px;color:#111827">$1</h3>`)
    .replace(/^## (.+)$/gm, `<h2 style="font-size:15.5px;font-weight:800;margin:16px 0 7px;color:#111827">$1</h2>`)
    .replace(/^# (.+)$/gm, `<h1 style="font-size:17px;font-weight:800;margin:18px 0 8px;color:#0f172a">$1</h1>`)
    .replace(/^[-*] (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0"><span style="color:#9ca3af;flex-shrink:0;margin-top:2px">•</span><span>$1</span></div>`)
    .replace(/^\d+\. (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0"><span style="color:#9ca3af;font-weight:700;flex-shrink:0">·</span><span>$1</span></div>`)
    .replace(/\n\n/g, `<div style="height:8px"></div>`)
    .replace(/\n/g, "<br/>");
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function AgentesPage() {
  const [view, setView] = useState("orchestrator"); // "orchestrator" | "agent" | "network" | "memory"
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [orchMessages, setOrchMessages] = useState([]);
  const [agentChats, setAgentChats] = useState({});
  const [agentHistories, setAgentHistories] = useState({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [collapsed, setSidebarCollapsed] = useState(false);
  const [agentMessages, setAgentMessages] = useState([]);
  const [agentMemory, setAgentMemory] = useState([]);
  const [activeAgents, setActiveAgents] = useState({}); // { agentId: bool }
  const [orchHistory, setOrchHistory] = useState([]);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [orchMessages, agentChats, view, selectedAgent, loading]);

  // Load real-time data
  const loadNetworkData = useCallback(async () => {
    try {
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const headers = { apikey: anon, Authorization: `Bearer ${anon}` };
      const [msgs, mem] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/agent_messages?select=*&order=created_at.desc&limit=50`, { headers }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/rest/v1/agent_memory?select=*`, { headers }).then(r => r.json()),
      ]);
      if (Array.isArray(msgs)) setAgentMessages(msgs);
      if (Array.isArray(mem)) setAgentMemory(mem);
    } catch {}
  }, []);

  useEffect(() => { loadNetworkData(); const t = setInterval(loadNetworkData, 8000); return () => clearInterval(t); }, [loadNetworkData]);

  const unread = agentMessages.filter(m => !m.read_at).length;
  const agentList = Object.values(AGENTS);

  // ── SEND TO ORCHESTRATOR ──
  const sendToOrchestrator = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg = { role: "user", content: userText };
    const newHistory = [...orchHistory, userMsg];
    setOrchMessages(p => [...p, { from: "user", text: userText }]);
    setOrchHistory(newHistory);
    setLoading(true);

    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: ORCHESTRATOR_SYSTEM,
          messages: newHistory,
          mcp_servers: MCP_SERVERS,
        }),
      });
      const data = await res.json();
      const content = data.content || [];
      const tools = content.filter(b => b.type === "mcp_tool_use").map(b => ({ name: b.name, input: b.input }));
      const reply = content.filter(b => b.type === "text").map(b => b.text).join("") || "Sem resposta.";
      setOrchMessages(p => [...p, { from: "orchestrator", text: reply, tools }]);
      setOrchHistory(h => [...h, { role: "assistant", content: reply }]);
      setTimeout(loadNetworkData, 2000);
    } catch (err) {
      setOrchMessages(p => [...p, { from: "orchestrator", text: `Erro: ${err.message}` }]);
    } finally { setLoading(false); setTimeout(() => textareaRef.current?.focus(), 50); }
  }, [input, loading, orchHistory, loadNetworkData]);

  // ── SEND TO INDIVIDUAL AGENT ──
  const sendToAgent = useCallback(async (text, agent) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    if (!text) setInput("");
    if (textareaRef.current && !text) textareaRef.current.style.height = "auto";

    const ag = agent || selectedAgent;
    if (!ag) return;

    const userMsg = { role: "user", content: userText };
    const currentHistory = agentHistories[ag.id] || [];
    const newHistory = [...currentHistory, userMsg];

    setActiveAgents(p => ({ ...p, [ag.id]: true }));
    setAgentChats(p => ({ ...p, [ag.id]: [...(p[ag.id] || []), { from: "user", text: userText }] }));
    setAgentHistories(p => ({ ...p, [ag.id]: newHistory }));
    setLoading(true);

    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: ag.systemPrompt,
          messages: newHistory,
          mcp_servers: MCP_SERVERS,
        }),
      });
      const data = await res.json();
      const content = data.content || [];
      const tools = content.filter(b => b.type === "mcp_tool_use").map(b => ({ name: b.name, input: b.input }));
      const reply = content.filter(b => b.type === "text").map(b => b.text).join("") || "Sem resposta.";
      const hasSave = tools.some(t => ["insert","update"].some(k => t.input?.query?.toLowerCase().includes(k)));
      setAgentChats(p => ({ ...p, [ag.id]: [...(p[ag.id] || []), { from: "agent", text: reply, tools, saved: hasSave }] }));
      setAgentHistories(p => ({ ...p, [ag.id]: [...newHistory, { role: "assistant", content: reply }] }));
      setTimeout(loadNetworkData, 2000);
    } catch (err) {
      setAgentChats(p => ({ ...p, [ag.id]: [...(p[ag.id] || []), { from: "agent", text: `Erro: ${err.message}` }] }));
    } finally {
      setActiveAgents(p => ({ ...p, [ag.id]: false }));
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [input, loading, selectedAgent, agentHistories, loadNetworkData]);

  const handleSend = () => {
    if (view === "orchestrator") sendToOrchestrator();
    else if (view === "agent" && selectedAgent) sendToAgent();
  };

  const priorityColor = { critical: "#dc2626", high: "#ea580c", normal: "#2563eb", low: "#64748b" };
  const msgTypeIcon = { alert: "🚨", request: "📩", response: "✅", decision: "🎯", broadcast: "📢" };
  const getAgent = (id) => AGENTS[id] || { emoji: "🤖", name: id, color: "#64748b", light: "#f8fafc", border: "#e2e8f0" };

  const ORCH_PROMPTS = [
    "Rode o briefing diário completo — todos os agentes em sequência",
    "Kai tem mensagem pendente. Faça ele verificar e agir",
    "Orquestre uma semana completa de conteúdo: Ana → Lucas → Pedro",
    "Faça o Kai corrigir o bug do user_memory e avisar os outros agentes",
    "Análise completa: Pedro calcula custos → Ana gera briefing → Lucas cria post",
  ];

  return (
    <div style={{ display:"flex", height:"100vh", background:"#f8fafc", fontFamily:"'Nunito',sans-serif", overflow:"hidden" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: collapsed ? 68 : 280, background:"#0f172a", display:"flex", flexDirection:"column", transition:"width 0.22s ease", flexShrink:0, overflow:"hidden" }}>
        {/* Logo */}
        <div style={{ padding:"16px 14px", borderBottom:"1px solid #1e293b", display:"flex", alignItems:"center", gap:10, minHeight:66 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:"#16a34a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>🧭</div>
          {!collapsed && <div style={{ flex:1 }}><div style={{ fontWeight:800, fontSize:14, color:"#f8fafc" }}>iMoney</div><div style={{ fontSize:10, color:"#16a34a" }}>🤝 Nível 5 · Multi-Agent</div></div>}
          <button onClick={() => setSidebarCollapsed(!collapsed)} style={{ background:"none", border:"none", color:"#334155", cursor:"pointer", fontSize:13, padding:4 }}>{collapsed?"»":"«"}</button>
        </div>

        {/* Nav */}
        <div style={{ padding:"10px 8px", borderBottom:"1px solid #1e293b" }}>
          {[
            { id:"orchestrator", icon:"🎛️", label:"Orquestrador", sub:"Coordena todos" },
            { id:"network", icon:"🕸️", label:"Rede de Agentes", sub:`${unread} msg${unread!==1?"s":""} não lidas` },
            { id:"memory", icon:"🧠", label:"Memória Compartilhada", sub:"Estado global" },
          ].map(nav => (
            <button key={nav.id} onClick={() => { setView(nav.id); setSelectedAgent(null); setTimeout(() => textareaRef.current?.focus(), 50); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding: collapsed ? "9px 16px" : "9px 10px", borderRadius:10, border:"none", background: view===nav.id && !selectedAgent ? "#1e293b" : "transparent", cursor:"pointer", marginBottom:2, textAlign:"left", position:"relative" }}>
              {view===nav.id && !selectedAgent && <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:3, height:22, background:"#16a34a", borderRadius:"0 3px 3px 0" }} />}
              <div style={{ width:34, height:34, borderRadius:9, background: view===nav.id && !selectedAgent ? "#f0fdf4" : "#1e293b", border:`2px solid ${view===nav.id && !selectedAgent ? "#16a34a" : "#1e293b"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{nav.icon}</div>
              {!collapsed && <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:12.5, color: view===nav.id && !selectedAgent ? "#f8fafc" : "#94a3b8" }}>{nav.label}</div><div style={{ fontSize:10.5, color:"#334155" }}>{nav.sub}</div></div>}
              {!collapsed && nav.id==="network" && unread>0 && <span style={{ fontSize:10, background:"#dc2626", color:"#fff", padding:"1px 6px", borderRadius:20, fontWeight:700, flexShrink:0 }}>{unread}</span>}
            </button>
          ))}
        </div>

        {/* Agents */}
        <div style={{ flex:1, overflowY:"auto", padding:"10px 8px" }}>
          {!collapsed && <p style={{ fontSize:10, fontWeight:700, color:"#1e293b", textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 6px 8px" }}>Falar com agente</p>}
          {agentList.map(agent => {
            const isActive = activeAgents[agent.id];
            const isSelected = view==="agent" && selectedAgent?.id===agent.id;
            const msgs = agentChats[agent.id]?.length || 0;
            const pending = agentMessages.filter(m => m.to_agent===agent.id && !m.read_at).length;
            return (
              <button key={agent.id} onClick={() => { setView("agent"); setSelectedAgent(agent); setTimeout(() => textareaRef.current?.focus(), 50); }}
                title={collapsed ? agent.name : ""}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding: collapsed?"9px 16px":"9px 10px", borderRadius:10, border:"none", background: isSelected?"#1e293b":"transparent", cursor:"pointer", marginBottom:2, textAlign:"left", position:"relative" }}>
                {isSelected && <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:3, height:22, background:agent.color, borderRadius:"0 3px 3px 0" }} />}
                <div style={{ position:"relative", flexShrink:0 }}>
                  <div style={{ width:34, height:34, borderRadius:9, background: isSelected?agent.light:"#1e293b", border:`2px solid ${isSelected?agent.color:"#1e293b"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{agent.emoji}</div>
                  {isActive && <div style={{ position:"absolute", bottom:-2, right:-2, width:10, height:10, borderRadius:"50%", background:"#16a34a", border:"2px solid #0f172a", animation:"pulse2 1s infinite" }} />}
                </div>
                {!collapsed && (
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontWeight:700, fontSize:12.5, color: isSelected?"#f8fafc":"#94a3b8" }}>{agent.name}</span>
                      {msgs>0 && <div style={{ width:5, height:5, borderRadius:"50%", background:agent.color }} />}
                    </div>
                    <p style={{ fontSize:10.5, color: isSelected?"#475569":"#334155", margin:0 }}>{agent.role}</p>
                  </div>
                )}
                {!collapsed && pending>0 && <span style={{ fontSize:9, background:agent.color+"33", color:agent.color, padding:"1px 5px", borderRadius:10, fontWeight:700, flexShrink:0, border:`1px solid ${agent.color}66` }}>{pending}</span>}
              </button>
            );
          })}
        </div>

        {!collapsed && (
          <div style={{ padding:"10px 14px", borderTop:"1px solid #1e293b" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#1e293b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Infra</div>
            {[{l:"Supabase",s:"multi-agent ativo"},{l:"Vercel",s:"cron disponível"}].map(s=>(
              <div key={s.l} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#16a34a" }} />
                <div style={{ fontSize:10.5, color:"#64748b" }}>{s.l} <span style={{ color:"#334155" }}>· {s.s}</span></div>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

        {/* Header */}
        <header style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"12px 24px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          {view==="orchestrator" && <>
            <div style={{ width:44, height:44, borderRadius:12, background:"#f0fdf4", border:"2px solid #16a34a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:21 }}>🎛️</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <h2 style={{ margin:0, fontWeight:800, fontSize:16, color:"#0f172a" }}>Orquestrador</h2>
                <span style={{ fontSize:11, fontWeight:700, color:"#16a34a", background:"#f0fdf4", border:"1px solid #bbf7d0", padding:"2px 8px", borderRadius:20 }}>🤝 Multi-Agent</span>
                <span style={{ fontSize:11, color:"#ea580c", background:"#fff7ed", border:"1px solid #fed7aa", padding:"2px 8px", borderRadius:20, fontWeight:700 }}>🚀 Nível 5</span>
              </div>
              <p style={{ margin:0, fontSize:12.5, color:"#64748b" }}>Coordena todos os agentes, lê a memória compartilhada e executa workflows complexos</p>
            </div>
          </>}
          {view==="network" && <>
            <div style={{ width:44, height:44, borderRadius:12, background:"#f0fdf4", border:"2px solid #16a34a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:21 }}>🕸️</div>
            <div style={{ flex:1 }}>
              <h2 style={{ margin:0, fontWeight:800, fontSize:16, color:"#0f172a" }}>Rede de Agentes</h2>
              <p style={{ margin:0, fontSize:12.5, color:"#64748b" }}>Canal de comunicação entre agentes — mensagens, alertas e decisões em tempo real</p>
            </div>
            <button onClick={loadNetworkData} style={{ background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:8, padding:"6px 12px", fontSize:12, color:"#475569", cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>↺ Atualizar</button>
          </>}
          {view==="memory" && <>
            <div style={{ width:44, height:44, borderRadius:12, background:"#f5f3ff", border:"2px solid #7c3aed", display:"flex", alignItems:"center", justifyContent:"center", fontSize:21 }}>🧠</div>
            <div style={{ flex:1 }}>
              <h2 style={{ margin:0, fontWeight:800, fontSize:16, color:"#0f172a" }}>Memória Compartilhada</h2>
              <p style={{ margin:0, fontSize:12.5, color:"#64748b" }}>Estado global da empresa — lido e atualizado por todos os agentes</p>
            </div>
            <button onClick={loadNetworkData} style={{ background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:8, padding:"6px 12px", fontSize:12, color:"#475569", cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>↺ Atualizar</button>
          </>}
          {view==="agent" && selectedAgent && <>
            <div style={{ width:44, height:44, borderRadius:12, background:selectedAgent.light, border:`2px solid ${selectedAgent.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:21 }}>{selectedAgent.emoji}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <h2 style={{ margin:0, fontWeight:800, fontSize:16, color:"#0f172a" }}>{selectedAgent.name}</h2>
                <span style={{ fontSize:11, fontWeight:700, color:selectedAgent.color, background:selectedAgent.light, border:`1px solid ${selectedAgent.border}`, padding:"2px 8px", borderRadius:20 }}>{selectedAgent.role}</span>
                <span style={{ fontSize:11, color:"#64748b", background:"#f8fafc", border:"1px solid #e2e8f0", padding:"2px 8px", borderRadius:20 }}>🤝 Multi-Agent</span>
              </div>
              <p style={{ margin:0, fontSize:12.5, color:"#64748b" }}>Verifica caixa de mensagens, age e comunica resultados aos outros agentes</p>
            </div>
            {(agentChats[selectedAgent.id]||[]).length>0 && (
              <button onClick={() => { setAgentChats(p=>({...p,[selectedAgent.id]:[]})); setAgentHistories(p=>({...p,[selectedAgent.id]:[]})); }}
                style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"6px 12px", fontSize:12, color:"#64748b", cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Nova</button>
            )}
          </>}
        </header>

        {/* ── CONTENT ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px 16px" }}>

          {/* ORCHESTRATOR VIEW */}
          {view==="orchestrator" && (
            <div style={{ maxWidth:780, margin:"0 auto" }}>
              {orchMessages.length===0 ? (
                <div style={{ textAlign:"center", maxWidth:540, margin:"24px auto" }}>
                  <div style={{ fontSize:52, marginBottom:12 }}>🎛️</div>
                  <h3 style={{ fontWeight:800, fontSize:21, color:"#0f172a", marginBottom:6 }}>Orquestrador Multi-Agent</h3>
                  <p style={{ color:"#64748b", fontSize:14, lineHeight:1.7, marginBottom:4, maxWidth:420, margin:"0 auto 4px" }}>
                    Dê um objetivo de alto nível — o orquestrador divide entre os agentes certos, coordena a execução e consolida os resultados.
                  </p>
                  <p style={{ color:"#94a3b8", fontSize:12, marginBottom:24 }}>Acesso a Supabase + Vercel · Memória compartilhada entre agentes</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8, textAlign:"left" }}>
                    {ORCH_PROMPTS.map((p,i) => (
                      <button key={i} onClick={() => sendToOrchestrator(p)}
                        style={{ background:"#fff", border:"1px solid #bbf7d0", borderRadius:10, padding:"11px 14px", fontSize:13, color:"#374151", cursor:"pointer", textAlign:"left", fontFamily:"'Nunito',sans-serif", lineHeight:1.5, transition:"all 0.15s" }}
                        onMouseEnter={e=>{e.currentTarget.style.background="#f0fdf4";e.currentTarget.style.borderColor="#16a34a";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor="#bbf7d0";}}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {orchMessages.map((msg, i) => (
                    <div key={i}>
                      {msg.tools?.length>0 && (
                        <div style={{ display:"flex", gap:5, marginBottom:6, paddingLeft: msg.from==="orchestrator"?44:0, flexWrap:"wrap" }}>
                          {msg.tools.map((t,ti) => {
                            const isW = ["insert","update"].some(k=>t.input?.query?.toLowerCase().includes(k));
                            return <span key={ti} style={{ fontSize:10, background:isW?"#f0fdf4":"#eff6ff", border:`1px solid ${isW?"#bbf7d0":"#bfdbfe"}`, color:isW?"#15803d":"#1d4ed8", padding:"2px 7px", borderRadius:20, fontWeight:600 }}>{isW?"💾":"⚡"} {t.name.replace(/_/g," ")}</span>;
                          })}
                        </div>
                      )}
                      <div style={{ display:"flex", justifyContent:msg.from==="user"?"flex-end":"flex-start", gap:10 }}>
                        {msg.from==="orchestrator" && <div style={{ width:33, height:33, borderRadius:9, background:"#f0fdf4", border:"2px solid #bbf7d0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0, marginTop:2 }}>🎛️</div>}
                        <div style={{ maxWidth: msg.from==="user"?"62%":"87%", background:msg.from==="user"?"#16a34a":"#fff", color:msg.from==="user"?"#fff":"#0f172a", padding:"11px 15px", borderRadius:msg.from==="user"?"16px 16px 4px 16px":"4px 16px 16px 16px", fontSize:14, lineHeight:1.65, border:msg.from==="orchestrator"?"1px solid #e2e8f0":"none", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}
                          dangerouslySetInnerHTML={msg.from==="orchestrator"?{__html:renderMD(msg.text)}:undefined}>
                          {msg.from==="user"?msg.text:null}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && view==="orchestrator" && (
                    <div style={{ display:"flex", gap:10 }}>
                      <div style={{ width:33, height:33, borderRadius:9, background:"#f0fdf4", border:"2px solid #bbf7d0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🎛️</div>
                      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"4px 16px 16px 16px", padding:"12px 16px" }}>
                        <div style={{ fontSize:11.5, color:"#94a3b8", marginBottom:6 }}>Orquestrando agentes...</div>
                        <div style={{ display:"flex", gap:5 }}>{[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#16a34a", opacity:0.6, animation:"pulse 1.3s ease-in-out infinite", animationDelay:`${i*0.2}s` }} />)}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* NETWORK VIEW */}
          {view==="network" && (
            <div style={{ maxWidth:760, margin:"0 auto" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div>
                  <h3 style={{ margin:0, fontWeight:800, fontSize:17, color:"#0f172a" }}>Canal de Mensagens</h3>
                  <p style={{ margin:0, fontSize:13, color:"#64748b" }}>{agentMessages.length} mensagens · {unread} não lidas</p>
                </div>
                {unread>0 && <span style={{ fontSize:12, background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", padding:"4px 10px", borderRadius:20, fontWeight:700 }}>🔔 {unread} novas</span>}
              </div>
              {agentMessages.length===0 ? (
                <div style={{ textAlign:"center", padding:"48px 0", color:"#94a3b8" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🕸️</div>
                  <div style={{ fontWeight:700, fontSize:15 }}>Nenhuma mensagem ainda</div>
                  <div style={{ fontSize:13, marginTop:4 }}>Os agentes vão se comunicar aqui quando executarem tarefas</div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {agentMessages.map(msg => {
                    const fromAg = getAgent(msg.from_agent);
                    const toAg = msg.to_agent==="all" ? { emoji:"📢", name:"Todos", color:"#16a34a" } : getAgent(msg.to_agent);
                    return (
                      <div key={msg.id} style={{ background:"#fff", border:`1px solid ${msg.read_at?"#e2e8f0":"#bfdbfe"}`, borderLeft:`3px solid ${priorityColor[msg.priority]||"#64748b"}`, borderRadius:10, padding:"12px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                          <span style={{ fontSize:16 }}>{msgTypeIcon[msg.message_type]||"💬"}</span>
                          <span style={{ fontSize:13, fontWeight:700 }}>{fromAg.emoji} {fromAg.name}</span>
                          <span style={{ fontSize:11, color:"#94a3b8" }}>→</span>
                          <span style={{ fontSize:13, fontWeight:700 }}>{toAg.emoji} {toAg.name}</span>
                          <span style={{ fontSize:10, background:priorityColor[msg.priority]+"22", color:priorityColor[msg.priority], padding:"1px 6px", borderRadius:20, border:`1px solid ${priorityColor[msg.priority]}44`, fontWeight:600, marginLeft:"auto" }}>{msg.priority}</span>
                          {!msg.read_at && <span style={{ fontSize:10, background:"#dbeafe", color:"#1d4ed8", padding:"1px 6px", borderRadius:20, fontWeight:700 }}>NOVA</span>}
                        </div>
                        <div style={{ fontWeight:700, fontSize:13, color:"#0f172a", marginBottom:3 }}>{msg.subject}</div>
                        <div style={{ fontSize:12.5, color:"#475569", lineHeight:1.5 }}>{msg.body}</div>
                        {msg.action_taken && <div style={{ marginTop:8, fontSize:12, color:"#15803d", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:7, padding:"5px 8px" }}>✅ {msg.action_taken}</div>}
                        {msg.requires_action && !msg.action_taken && <div style={{ marginTop:8, fontSize:12, color:"#dc2626", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:7, padding:"5px 8px" }}>⚡ Requer ação do agente</div>}
                        <div style={{ fontSize:10.5, color:"#9ca3af", marginTop:6 }}>{new Date(msg.created_at).toLocaleString("pt-BR")}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MEMORY VIEW */}
          {view==="memory" && (
            <div style={{ maxWidth:760, margin:"0 auto" }}>
              <div style={{ marginBottom:16 }}>
                <h3 style={{ margin:0, fontWeight:800, fontSize:17, color:"#0f172a" }}>Memória Compartilhada</h3>
                <p style={{ margin:0, fontSize:13, color:"#64748b" }}>Estado global lido e atualizado por todos os agentes em tempo real</p>
              </div>
              {agentMemory.length===0 ? (
                <div style={{ textAlign:"center", padding:"48px 0", color:"#94a3b8" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🧠</div>
                  <div style={{ fontWeight:700, fontSize:15 }}>Carregando memória...</div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {agentMemory.map(mem => {
                    const updater = getAgent(mem.updated_by);
                    let displayVal;
                    try { displayVal = JSON.stringify(mem.value, null, 2); } catch { displayVal = String(mem.value); }
                    return (
                      <div key={mem.key} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"14px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
                          <span style={{ fontSize:14 }}>🧠</span>
                          <code style={{ fontSize:12, fontWeight:700, color:"#0f172a", background:"#f1f5f9", padding:"2px 6px", borderRadius:4 }}>{mem.key}</code>
                          <span style={{ fontSize:11, color:"#94a3b8", marginLeft:"auto" }}>{updater.emoji} {mem.updated_by}</span>
                        </div>
                        <pre style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"10px", fontSize:11.5, color:"#374151", overflow:"auto", maxHeight:140, margin:0, fontFamily:"monospace", whiteSpace:"pre-wrap" }}>{displayVal}</pre>
                        <div style={{ fontSize:10.5, color:"#9ca3af", marginTop:6 }}>Atualizado: {new Date(mem.updated_at).toLocaleString("pt-BR")}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* AGENT CHAT VIEW */}
          {view==="agent" && selectedAgent && (
            <div style={{ maxWidth:780, margin:"0 auto" }}>
              {(agentChats[selectedAgent.id]||[]).length===0 ? (
                <div style={{ textAlign:"center", maxWidth:500, margin:"24px auto" }}>
                  <div style={{ width:64, height:64, borderRadius:18, background:selectedAgent.light, border:`2px solid ${selectedAgent.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 14px" }}>{selectedAgent.emoji}</div>
                  <h3 style={{ fontWeight:800, fontSize:19, color:"#0f172a", marginBottom:6 }}>Falar com {selectedAgent.name}</h3>
                  <p style={{ color:"#64748b", fontSize:13.5, lineHeight:1.7, maxWidth:380, margin:"0 auto 6px" }}>
                    {selectedAgent.name} verifica sua caixa de mensagens, executa ações e comunica resultados aos outros agentes automaticamente.
                  </p>
                  <p style={{ color:"#94a3b8", fontSize:12, marginBottom:22 }}>Acesso a agent_messages + agent_memory + Supabase + Vercel</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:7 }}>
                    {[
                      `Verifique sua caixa de mensagens e execute as ações pendentes`,
                      `Leia a memória compartilhada e me diga o estado atual da empresa`,
                      `Execute sua tarefa principal e notifique os outros agentes`,
                      `Qual mensagem mais urgente você tem e o que vai fazer?`,
                    ].map((p,i) => (
                      <button key={i} onClick={() => sendToAgent(p, selectedAgent)}
                        style={{ background:"#fff", border:`1px solid ${selectedAgent.border}`, borderRadius:10, padding:"10px 13px", fontSize:13, color:"#374151", cursor:"pointer", textAlign:"left", fontFamily:"'Nunito',sans-serif", lineHeight:1.45, transition:"all 0.15s" }}
                        onMouseEnter={e=>{e.currentTarget.style.background=selectedAgent.light;e.currentTarget.style.borderColor=selectedAgent.color;}}
                        onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor=selectedAgent.border;}}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {(agentChats[selectedAgent.id]||[]).map((msg, i) => (
                    <div key={i}>
                      {msg.tools?.length>0 && (
                        <div style={{ display:"flex", gap:5, marginBottom:6, paddingLeft:msg.from==="agent"?44:0, flexWrap:"wrap" }}>
                          {msg.tools.map((t,ti) => {
                            const isW = ["insert","update"].some(k=>t.input?.query?.toLowerCase().includes(k));
                            return <span key={ti} style={{ fontSize:10, background:isW?"#f0fdf4":"#eff6ff", border:`1px solid ${isW?"#bbf7d0":"#bfdbfe"}`, color:isW?"#15803d":"#1d4ed8", padding:"2px 7px", borderRadius:20, fontWeight:600 }}>{isW?"💾":"⚡"} {t.name.replace(/_/g," ")}</span>;
                          })}
                          {msg.saved && <span style={{ fontSize:10, background:"#f0fdf4", border:"1px solid #bbf7d0", color:"#15803d", padding:"2px 7px", borderRadius:20, fontWeight:700 }}>✅ persistido</span>}
                        </div>
                      )}
                      <div style={{ display:"flex", justifyContent:msg.from==="user"?"flex-end":"flex-start", gap:10 }}>
                        {msg.from==="agent" && <div style={{ width:33, height:33, borderRadius:9, background:selectedAgent.light, border:`2px solid ${selectedAgent.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0, marginTop:2 }}>{selectedAgent.emoji}</div>}
                        <div style={{ maxWidth:msg.from==="user"?"62%":"87%", background:msg.from==="user"?selectedAgent.color:"#fff", color:msg.from==="user"?"#fff":"#0f172a", padding:"11px 15px", borderRadius:msg.from==="user"?"16px 16px 4px 16px":"4px 16px 16px 16px", fontSize:14, lineHeight:1.65, border:msg.from==="agent"?"1px solid #e2e8f0":"none", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}
                          dangerouslySetInnerHTML={msg.from==="agent"?{__html:renderMD(msg.text)}:undefined}>
                          {msg.from==="user"?msg.text:null}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && view==="agent" && (
                    <div style={{ display:"flex", gap:10 }}>
                      <div style={{ width:33, height:33, borderRadius:9, background:selectedAgent.light, border:`2px solid ${selectedAgent.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>{selectedAgent.emoji}</div>
                      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"4px 16px 16px 16px", padding:"12px 16px" }}>
                        <div style={{ fontSize:11.5, color:"#94a3b8", marginBottom:6 }}>Agindo e comunicando...</div>
                        <div style={{ display:"flex", gap:5 }}>{[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:"50%", background:selectedAgent.color, opacity:0.6, animation:"pulse 1.3s ease-in-out infinite", animationDelay:`${i*0.2}s` }} />)}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input — só no chat */}
        {(view==="orchestrator" || view==="agent") && (
          <div style={{ background:"#fff", borderTop:"1px solid #e2e8f0", padding:"14px 24px 18px", flexShrink:0 }}>
            <div style={{ maxWidth:780, margin:"0 auto" }}>
              <div style={{ display:"flex", gap:10, alignItems:"flex-end", background:"#f8fafc", border:`2px solid #e2e8f0`, borderRadius:13, padding:"8px 8px 8px 15px", transition:"border-color 0.2s" }}
                onFocusCapture={e=>e.currentTarget.style.borderColor=view==="orchestrator"?"#16a34a":selectedAgent?.color||"#16a34a"}
                onBlurCapture={e=>e.currentTarget.style.borderColor="#e2e8f0"}>
                <textarea ref={textareaRef} value={input}
                  onChange={e=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,130)+"px";}}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
                  placeholder={view==="orchestrator" ? "Dê um objetivo — o orquestrador coordena os agentes..." : `Fale com ${selectedAgent?.name||"o agente"}...`}
                  rows={1}
                  style={{ flex:1, border:"none", background:"transparent", resize:"none", fontSize:14, color:"#0f172a", outline:"none", fontFamily:"'Nunito',sans-serif", lineHeight:1.6, minHeight:24, maxHeight:130, overflowY:"auto" }} />
                <button onClick={handleSend} disabled={!input.trim()||loading}
                  style={{ width:36, height:36, borderRadius:9, border:"none", background: view==="orchestrator"?"#16a34a":selectedAgent?.color||"#16a34a", color:"#fff", cursor:input.trim()&&!loading?"pointer":"not-allowed", opacity:input.trim()&&!loading?1:0.3, fontSize:17, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>↑</button>
              </div>
              <p style={{ fontSize:11, color:"#cbd5e1", textAlign:"center", margin:"7px 0 0" }}>
                {view==="orchestrator" ? "Nível 5 · Orquestrador coordena agentes com memória compartilhada e canal de mensagens" : "Nível 5 · Agente lê mensagens, age e notifica outros agentes autonomamente"}
              </p>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        @keyframes pulse { 0%,100%{transform:scale(0.75);opacity:0.3} 50%{transform:scale(1.2);opacity:1} }
        @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:0.3} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:10px; }
      `}</style>
    </div>
  );
}
