'use client'

import { useState, useRef, useEffect } from 'react'

type AgentId = 'conteudo' | 'seo' | 'growth' | 'dados' | 'dev'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: Date
}

interface Agent {
  id: AgentId
  nome: string
  cargo: string
  descricao: string
  status: 'ativo' | 'beta' | 'em breve'
  cor: string
  iniciais: string
  systemPrompt: string
  sugestoes: string[]
}

const AGENTES: Agent[] = [
  {
    id: 'conteudo',
    nome: 'Agente de conteúdo',
    cargo: 'Head of Content',
    descricao: 'Gera o plano semanal completo: Reels, Carrosséis e Posts com roteiro, hook e legenda.',
    status: 'ativo',
    cor: '#1D9E75',
    iniciais: 'MKT',
    systemPrompt: `Você é o agente de conteúdo da iMoney, um app brasileiro de finanças pessoais com IA voltado para jovens de 20–30 anos.

A voz da marca é próxima, direta, sem juridiquês. Tom: amigo que entende de dinheiro.

Você domina criação de conteúdo para TikTok, Reels e Instagram:
- Reels: viralidade, topo de funil, educação rápida
- Carrossel: engajamento profundo, salvar/compartilhar
- Post estático: autoridade, frase de impacto

Quando pedirem plano semanal, entregue 6 dias: Segunda (Reels), Terça (Carrossel), Quarta (Reels), Quinta (Post), Sexta (Reels), Sábado (Carrossel).
Para cada peça: formato, hook, roteiro ou slides, CTA e legenda com hashtags.
Nunca mencione o app diretamente nos primeiros posts — venda o resultado, não o produto.`,
    sugestoes: [
      'Gere o plano completo desta semana — tema: reserva de emergência',
      'Crie um Reels: erros que jovens cometem com o salário',
      'Monte um carrossel: 7 hábitos de quem não fica no vermelho',
      'Escreva 3 hooks para vídeos sobre investimentos para iniciantes',
    ],
  },
  {
    id: 'seo',
    nome: 'Agente SEO',
    cargo: 'Head of Growth Orgânico',
    descricao: 'Pesquisa keywords, planeja artigos e otimiza o blog da iMoney para ranquear no Google.',
    status: 'ativo',
    cor: '#378ADD',
    iniciais: 'SEO',
    systemPrompt: `Você é o agente de SEO da iMoney, app brasileiro de finanças pessoais com IA.

Especialista em SEO para o mercado brasileiro de finanças pessoais. Sabe o que jovens de 20–30 anos buscam no Google sobre dinheiro, dívidas e investimentos.

Concorrentes no Google: Nubank blog, Neon, Mobills, Me Poupe.
Vantagem da iMoney: voz humana, foco em IA como ferramenta real.

Entregue: keywords com volume e dificuldade, estrutura de artigos (H1, H2s, meta, slug), artigos completos otimizados, clusters de conteúdo.
Escreva como pessoa fala, não como banco escreve.`,
    sugestoes: [
      'Liste as 20 keywords mais valiosas para o blog da iMoney',
      'Escreva artigo completo: "Como montar reserva de emergência em 2025"',
      'Monte um cluster de conteúdo sobre investimentos para iniciantes',
      'O que o Nubank blog faz bem e o que podemos superar?',
    ],
  },
  {
    id: 'growth',
    nome: 'Agente de growth',
    cargo: 'Head of Growth',
    descricao: 'Cria sequências de email, funis de conversão e estratégias para transformar cadastros em pagantes.',
    status: 'ativo',
    cor: '#7F77DD',
    iniciais: 'GRW',
    systemPrompt: `Você é o agente de growth da iMoney, app brasileiro de finanças pessoais com IA.

Foco: converter cadastros gratuitos em pagantes (R$ 29,90/mês) e reduzir churn.

Contexto técnico:
- Emails via Resend API
- Cron job no Vercel (roda a cada hora)
- Tabela email_queue no Supabase
- Waitlist Open Finance já ativa

Estratégia: orgânico total, zero ads na fase 1.
Break-even: 22 usuários pagantes. Meta: 100 pagantes em 6 meses.

Entregue: sequências de email prontas (assunto + corpo), estratégias de funil, táticas de retenção, scripts de onboarding.`,
    sugestoes: [
      'Crie a sequência completa de 5 emails de boas-vindas',
      'Escreva o email de upgrade: free → Pro (R$ 29,90)',
      'Estratégia para reativar usuários inativos há 30 dias',
      'Monte o funil completo: cadastro → ativação → pagamento',
    ],
  },
  {
    id: 'dados',
    nome: 'Agente de dados',
    cargo: 'Head of Analytics',
    descricao: 'Analisa métricas, monitora MRR, identifica churn e gera relatórios semanais do negócio.',
    status: 'beta',
    cor: '#EF9F27',
    iniciais: 'DAD',
    systemPrompt: `Você é o agente de dados da iMoney, app brasileiro de finanças pessoais com IA.

Analisa métricas do negócio e produto para decisões baseadas em dados.

Contexto:
- Burn mensal: R$ 660
- Break-even: 22 usuários a R$ 29,90/mês
- Meta fase 1 (6 meses): 100 pagantes
- Runway: ~7 meses com R$ 5k

Tabelas Supabase: user_profiles, transactions, metas, user_investments, chat_history, email_queue, openfinance_interest.

Entregue: análises de retenção, projeções de MRR, queries SQL para o Supabase, relatórios semanais, alertas sobre métricas preocupantes.`,
    sugestoes: [
      'Projete o MRR mês a mês até atingir R$ 1M faturado',
      'Escreva a query SQL para calcular churn mensal no Supabase',
      'Quais métricas acompanhar semanalmente no meu estágio?',
      'Monte um dashboard de métricas para o /admin da iMoney',
    ],
  },
  {
    id: 'dev',
    nome: 'Agente dev',
    cargo: 'CTO',
    descricao: 'Arquiteta features, escreve código Next.js 14 + Supabase, faz deploy e resolve bugs de produção.',
    status: 'ativo',
    cor: '#D85A30',
    iniciais: 'DEV',
    systemPrompt: `Você é o agente dev da iMoney, responsável pela parte técnica do produto.

Stack:
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, fonte Nunito
- Backend: Supabase (PostgreSQL + Auth + RLS)
- IA: Anthropic API (Claude Sonnet) via /api/chat
- Deploy: Vercel · Emails: Resend API + cron job

Páginas: / (landing), /login, /dashboard, /dashboard/assessor, /dashboard/transacoes, /dashboard/metas, /dashboard/investimentos, /dashboard/perfil, /dashboard/renda, /dashboard/openfinance, /admin, /admin/agentes

Tabelas Supabase: user_memory, transactions, metas, user_profiles, user_investments, chat_history, pluggy_connections, openfinance_interest, email_queue, admin_posts

Env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY, CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY

Entregue: código completo e funcional, componentes no padrão visual (branco/verde, Nunito), queries SQL otimizadas, debug com contexto do stack.`,
    sugestoes: [
      'Como adicionar streaming na resposta dos agentes?',
      'Adiciona autenticação por role admin nesta página',
      'Escreva o componente de histórico de chats dos agentes',
      'Crie um cron job semanal que gera relatório de MRR por email',
    ],
  },
]

export default function AgentesPage() {
  const [agenteSelecionado, setAgenteSelecionado] = useState<Agent>(AGENTES[0])
  const [mensagens, setMensagens] = useState<Record<AgentId, Message[]>>({
    conteudo: [], seo: [], growth: [], dados: [], dev: [],
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const msgs = mensagens[agenteSelecionado.id]

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [input])

  async function enviar(texto?: string) {
    const conteudo = (texto ?? input).trim()
    if (!conteudo || loading) return
    const novaMsgUser: Message = { role: 'user', content: conteudo, ts: new Date() }
    const historico = [...msgs, novaMsgUser]
    setMensagens(prev => ({ ...prev, [agenteSelecionado.id]: historico }))
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/agentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historico.map(m => ({ role: m.role, content: m.content })),
          systemPrompt: agenteSelecionado.systemPrompt,
        }),
      })
      if (!res.ok) throw new Error('Erro na API')
      const data = await res.json()
      setMensagens(prev => ({
        ...prev,
        [agenteSelecionado.id]: [
          ...historico,
          { role: 'assistant', content: data.content ?? 'Sem resposta.', ts: new Date() },
        ],
      }))
    } catch {
      setMensagens(prev => ({
        ...prev,
        [agenteSelecionado.id]: [
          ...historico,
          { role: 'assistant', content: 'Erro ao conectar. Tente novamente.', ts: new Date() },
        ],
      }))
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  const badgeStyle: Record<string, React.CSSProperties> = {
    ativo:      { background: '#E1F5EE', color: '#085041' },
    beta:       { background: '#FAEEDA', color: '#633806' },
    'em breve': { background: '#F1EFE8', color: '#5F5E5A' },
  }

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:"'Nunito',sans-serif", background:'#f8f9f8', overflow:'hidden' }}>
      <aside style={{ width:272, minWidth:272, borderRight:'1px solid #e8ede8', background:'#fff', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid #e8ede8', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'#1D9E75', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#E1F5EE" strokeWidth="1.5"/>
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" fill="#E1F5EE"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#1a1a1a' }}>iMoney</div>
            <div style={{ fontSize:11, color:'#999' }}>Agentes internos</div>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px' }}>
          {AGENTES.map(agente => {
            const ativo = agente.id === agenteSelecionado.id
            const temMsgs = mensagens[agente.id].length > 0
            return (
              <button key={agente.id} onClick={() => { setAgenteSelecionado(agente); setInput('') }}
                style={{ width:'100%', textAlign:'left', background: ativo ? '#f0faf6' : 'transparent',
                  border: ativo ? `1px solid ${agente.cor}44` : '1px solid transparent',
                  borderRadius:10, padding:'9px 10px', cursor:'pointer', marginBottom:3,
                  display:'flex', alignItems:'center', gap:10, transition:'all .15s' }}>
                <div style={{ width:34, height:34, borderRadius:8, flexShrink:0, background:`${agente.cor}18`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:9, fontWeight:700, color:agente.cor, letterSpacing:'0.05em' }}>
                  {agente.iniciais}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#1a1a1a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{agente.nome}</div>
                  <div style={{ fontSize:11, color:'#999', marginTop:1 }}>{agente.cargo}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
                  <span style={{ fontSize:10, padding:'2px 6px', borderRadius:20, fontWeight:600, ...badgeStyle[agente.status] }}>
                    {agente.status === 'em breve' ? 'Em breve' : agente.status.charAt(0).toUpperCase() + agente.status.slice(1)}
                  </span>
                  {temMsgs && <div style={{ width:5, height:5, borderRadius:'50%', background:agente.cor }} />}
                </div>
              </button>
            )
          })}
        </div>
        <div style={{ padding:'10px 14px', borderTop:'1px solid #e8ede8', fontSize:11, color:'#bbb' }}>
          5 agentes · Claude Sonnet · R$ 660/mês
        </div>
      </aside>

      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'14px 22px', borderBottom:'1px solid #e8ede8', background:'#fff',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`${agenteSelecionado.cor}18`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:10, fontWeight:700, color:agenteSelecionado.cor, letterSpacing:'0.05em' }}>
              {agenteSelecionado.iniciais}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#1a1a1a' }}>{agenteSelecionado.nome}</div>
              <div style={{ fontSize:12, color:'#999' }}>{agenteSelecionado.descricao}</div>
            </div>
          </div>
          {msgs.length > 0 && (
            <button onClick={() => setMensagens(prev => ({ ...prev, [agenteSelecionado.id]: [] }))}
              style={{ fontSize:12, color:'#aaa', background:'none', border:'1px solid #e8ede8', borderRadius:8, padding:'4px 12px', cursor:'pointer' }}>
              Limpar
            </button>
          )}
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          {msgs.length === 0 && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, padding:'40px 0' }}>
              <div style={{ width:52, height:52, borderRadius:12, background:`${agenteSelecionado.cor}18`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:14, fontWeight:700, color:agenteSelecionado.cor, letterSpacing:'0.05em' }}>
                {agenteSelecionado.iniciais}
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:15, fontWeight:700, color:'#1a1a1a', marginBottom:5 }}>{agenteSelecionado.nome}</div>
                <div style={{ fontSize:13, color:'#888', maxWidth:340, lineHeight:1.6 }}>{agenteSelecionado.descricao}</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, maxWidth:520, width:'100%' }}>
                {agenteSelecionado.sugestoes.map((s, i) => (
                  <button key={i} onClick={() => enviar(s)}
                    style={{ textAlign:'left', padding:'9px 13px', background:'#fff', border:'1px solid #e8ede8',
                      borderRadius:10, cursor:'pointer', fontSize:12, color:'#555', lineHeight:1.5, transition:'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = agenteSelecionado.cor; e.currentTarget.style.color='#1a1a1a' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='#e8ede8'; e.currentTarget.style.color='#555' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((msg, i) => (
            <div key={i} style={{ display:'flex', justifyContent: msg.role==='user' ? 'flex-end' : 'flex-start' }}>
              {msg.role==='assistant' && (
                <div style={{ width:26, height:26, borderRadius:6, flexShrink:0, background:`${agenteSelecionado.cor}18`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:8, fontWeight:700, color:agenteSelecionado.cor, marginRight:8, marginTop:2, letterSpacing:'0.05em' }}>
                  {agenteSelecionado.iniciais}
                </div>
              )}
              <div style={{ maxWidth:'72%', background: msg.role==='user' ? agenteSelecionado.cor : '#fff',
                color: msg.role==='user' ? '#fff' : '#1a1a1a',
                borderRadius: msg.role==='user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                padding:'10px 14px', fontSize:13, lineHeight:1.65,
                border: msg.role==='assistant' ? '1px solid #e8ede8' : 'none',
                whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                {msg.content}
                <div style={{ fontSize:10, marginTop:4, opacity:.5, textAlign: msg.role==='user' ? 'right' : 'left' }}>
                  {msg.ts.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:26, height:26, borderRadius:6, background:`${agenteSelecionado.cor}18`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:8, fontWeight:700, color:agenteSelecionado.cor, letterSpacing:'0.05em' }}>
                {agenteSelecionado.iniciais}
              </div>
              <div style={{ background:'#fff', border:'1px solid #e8ede8', borderRadius:'4px 14px 14px 14px',
                padding:'10px 16px', display:'flex', gap:4, alignItems:'center' }}>
                {[0,1,2].map(j => (
                  <div key={j} style={{ width:6, height:6, borderRadius:'50%', background:agenteSelecionado.cor,
                    animation:`bounce 1.2s ${j*.2}s ease-in-out infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding:'14px 22px', borderTop:'1px solid #e8ede8', background:'#fff', flexShrink:0 }}>
          <div style={{ display:'flex', gap:10, alignItems:'flex-end', background:'#f8f9f8',
            borderRadius:14, border:'1px solid #e8ede8', padding:'9px 12px' }}>
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={`Fale com o ${agenteSelecionado.nome}...`} rows={1}
              style={{ flex:1, resize:'none', border:'none', background:'transparent', fontSize:13,
                fontFamily:"'Nunito',sans-serif", color:'#1a1a1a', outline:'none', lineHeight:1.5, maxHeight:160 }} />
            <button onClick={() => enviar()} disabled={!input.trim() || loading}
              style={{ width:32, height:32, borderRadius:8, flexShrink:0,
                background: input.trim() && !loading ? agenteSelecionado.cor : '#e8ede8',
                border:'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display:'flex', alignItems:'center', justifyContent:'center', transition:'background .15s' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke={input.trim()&&!loading?'#fff':'#aaa'} strokeWidth="2" strokeLinecap="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input.trim()&&!loading?'#fff':'#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div style={{ fontSize:11, color:'#bbb', marginTop:5, textAlign:'center' }}>Enter para enviar · Shift+Enter para nova linha</div>
        </div>
      </main>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap');
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#d0d0d0;border-radius:4px}
      `}</style>
    </div>
  )
}
