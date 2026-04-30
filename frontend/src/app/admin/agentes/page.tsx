'use client'

import { useState, useRef, useEffect } from 'react'
import { marked } from 'marked'

type AgentId = 'conteudo' | 'seo' | 'growth' | 'dados' | 'dev'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: Date
  cards?: Card[]
  diff?: DiffBlock[]
  actions?: AgentAction[]
}

interface Card {
  dia?: string
  formato?: string
  hook?: string
  titulo?: string
  roteiro?: string
  slides?: string[]
  cta?: string
  legenda?: string
  texto?: string
}

interface DiffBlock {
  arquivo: string
  antes: string
  depois: string
  descricao: string
}

interface AgentAction {
  tipo: 'email' | 'publicar' | 'segmentar' | 'alerta'
  descricao: string
  status: 'executado' | 'pendente' | 'erro'
  detalhe?: string
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

const FORMAT_COLORS: Record<string, string> = {
  Reels: '#534AB7',
  Carrossel: '#085041',
  Post: '#0C447C',
  Stories: '#633806',
}

const AGENTES: Agent[] = [
  {
    id: 'conteudo',
    nome: 'Agente de conteúdo',
    cargo: 'Head of Content',
    descricao: 'Gera o plano semanal completo com cards visuais por dia.',
    status: 'ativo',
    cor: '#1D9E75',
    iniciais: 'MKT',
    systemPrompt: `Você é o agente de conteúdo da iMoney, app brasileiro de finanças pessoais com IA para jovens de 20–30 anos.
Tom: amigo que entende de dinheiro. Direto, sem juridiquês.

Quando o usuário pedir "plano da semana", "posts da semana" ou "gere os posts", retorne APENAS este JSON exato (sem markdown, sem backticks, sem texto antes ou depois):
{"plano":[
  {"dia":"Segunda","formato":"Reels","hook":"...","roteiro":"...","cta":"...","legenda":"..."},
  {"dia":"Terça","formato":"Carrossel","titulo":"...","slides":["s1","s2","s3","s4","s5","s6 com CTA"],"legenda":"..."},
  {"dia":"Quarta","formato":"Reels","hook":"...","roteiro":"...","cta":"...","legenda":"..."},
  {"dia":"Quinta","formato":"Post","titulo":"...","texto":"...","legenda":"..."},
  {"dia":"Sexta","formato":"Reels","hook":"...","roteiro":"...","cta":"...","legenda":"..."},
  {"dia":"Sábado","formato":"Carrossel","titulo":"...","slides":["s1","s2","s3","s4","s5","s6 com CTA"],"legenda":"..."}
]}

Para outros pedidos (hooks avulsos, ideias, análises), responda em texto normal usando markdown.
Nunca mencione o app diretamente nos primeiros posts — venda o resultado, não o produto.`,
    sugestoes: [
      'Gere os posts para a semana — tema: reserva de emergência',
      'Gere os posts para a semana — tema: sair das dívidas',
      'Crie um Reels: erros que jovens cometem com o salário',
      '3 hooks para vídeos sobre investimentos para iniciantes',
    ],
  },
  {
    id: 'seo',
    nome: 'Agente SEO',
    cargo: 'Head of Growth Orgânico',
    descricao: 'Pesquisa keywords, escreve e publica 70% dos artigos automaticamente.',
    status: 'ativo',
    cor: '#378ADD',
    iniciais: 'SEO',
    systemPrompt: `Você é o agente de SEO da iMoney, app brasileiro de finanças pessoais com IA.

Especialista em SEO para finanças pessoais no Brasil. Concorrentes: Nubank blog, Neon, Mobills, Me Poupe.
Vantagem da iMoney: voz humana, IA como ferramenta real.

Quando pedirem para escrever e publicar um artigo, retorne APENAS este JSON (sem markdown, sem backticks):
{"artigo":{
  "titulo":"...",
  "slug":"url-do-artigo",
  "meta_description":"...",
  "conteudo":"artigo completo em markdown",
  "publicar_automaticamente": true
}}

Use publicar_automaticamente: true para artigos informativos (70% dos casos).
Use false para artigos com preços, promoções ou dados sensíveis.

Para outros pedidos (keywords, clusters, análises), responda em markdown normal.`,
    sugestoes: [
      'Escreva e publique: "Como montar reserva de emergência em 2025"',
      'Escreva e publique: "Quanto guardar por mês com salário de R$ 3.000"',
      'Liste as 20 keywords mais valiosas para o blog da iMoney',
      'Monte um cluster de conteúdo sobre investimentos para iniciantes',
    ],
  },
  {
    id: 'growth',
    nome: 'Agente de growth',
    cargo: 'Head of Growth',
    descricao: 'Age de forma autônoma: dispara emails, segmenta usuários e converte cadastros em pagantes.',
    status: 'ativo',
    cor: '#7F77DD',
    iniciais: 'GRW',
    systemPrompt: `Você é o agente de growth da iMoney, app brasileiro de finanças pessoais com IA.

Foco: converter cadastros gratuitos em pagantes (R$ 29,90/mês) e reduzir churn.
Break-even: 22 usuários. Meta: 100 pagantes em 6 meses.

Infraestrutura: Resend API (email_queue no Supabase), segmentação via user_profiles, cron job no Vercel.

Quando pedirem uma ação de growth, retorne APENAS este JSON (sem markdown, sem backticks):
{"acoes":[
  {"tipo":"email","descricao":"...","status":"executado","detalhe":"assunto e corpo do email"},
  {"tipo":"segmentar","descricao":"...","status":"executado","detalhe":"critério usado"},
  {"tipo":"alerta","descricao":"...","status":"pendente","detalhe":"requer sua aprovação"}
]}

Use "executado" para ações automáticas. Use "pendente" para mudanças de preço ou campanhas novas.
Para análises e estratégias, responda em markdown normal.`,
    sugestoes: [
      'Execute a sequência de boas-vindas para novos cadastros',
      'Identifique usuários inativos há 30 dias e reative',
      'Dispare campanha de upgrade para usuários ativos há 60 dias',
      'Monte o funil completo: cadastro → ativação → pagamento',
    ],
  },
  {
    id: 'dados',
    nome: 'Agente de dados',
    cargo: 'Head of Analytics',
    descricao: 'Analisa métricas, monitora MRR, identifica churn e gera relatórios semanais.',
    status: 'beta',
    cor: '#EF9F27',
    iniciais: 'DAD',
    systemPrompt: `Você é o agente de dados da iMoney, app brasileiro de finanças pessoais com IA.

Contexto:
- Burn mensal: R$ 660
- Break-even: 22 usuários a R$ 29,90/mês
- Meta fase 1 (6 meses): 100 pagantes
- Runway: ~7 meses com R$ 5k

Tabelas Supabase: user_profiles, transactions, metas, user_investments, chat_history, email_queue, openfinance_interest.

Entregue análises claras, queries SQL prontas para rodar, projeções de MRR e alertas acionáveis. Use markdown para formatar bem as respostas.`,
    sugestoes: [
      'Projete o MRR mês a mês até R$ 1M faturado',
      'Query SQL para calcular churn mensal no Supabase',
      'Quais métricas acompanhar semanalmente agora?',
      'Monte o dashboard de métricas para o /admin',
    ],
  },
  {
    id: 'dev',
    nome: 'Agente dev',
    cargo: 'CTO',
    descricao: 'Revisa o código automaticamente, identifica bugs e gera patches prontos para aplicar.',
    status: 'ativo',
    cor: '#D85A30',
    iniciais: 'DEV',
    systemPrompt: `Você é o agente dev da iMoney, responsável pela saúde técnica do produto.

Stack: Next.js 14 (App Router), TypeScript, Tailwind, Nunito, Supabase, Anthropic API (Claude Sonnet), Vercel, Resend.

Páginas: / /login /dashboard /dashboard/assessor /dashboard/transacoes /dashboard/metas /dashboard/investimentos /dashboard/perfil /dashboard/renda /dashboard/openfinance /admin /admin/agentes

Tabelas Supabase: user_memory, transactions, metas, user_profiles, user_investments, chat_history, pluggy_connections, openfinance_interest, email_queue, admin_posts

Quando identificar um bug ou melhoria de código, retorne APENAS este JSON (sem markdown, sem backticks):
{"diff":[
  {
    "arquivo":"caminho/do/arquivo.tsx",
    "antes":"código atual",
    "depois":"código corrigido",
    "descricao":"o que foi corrigido e por quê"
  }
]}

Para perguntas de arquitetura, análise ou discussão técnica, responda em markdown normal.`,
    sugestoes: [
      'Revise o código do /dashboard/assessor e aponte melhorias',
      'Analise a API route /api/chat e otimize para menor latência',
      'Identifique possíveis vazamentos de memória no frontend',
      'Revise as políticas RLS do Supabase e aponte falhas',
    ],
  },
]

function parseResposta(content: string, agentId: AgentId) {
  const clean = content.replace(/```json|```/g, '').trim()
  try {
    const first = clean.indexOf('{')
    const last = clean.lastIndexOf('}')
    if (first === -1 || last === -1) throw new Error('no json')
    const json = JSON.parse(clean.slice(first, last + 1))
    if (agentId === 'conteudo' && json.plano) return { texto: '', cards: json.plano }
    if (agentId === 'seo' && json.artigo) {
      return {
        texto: '', cards: [{
          titulo: json.artigo.titulo,
          texto: `${json.artigo.publicar_automaticamente ? '✅ Publicado automaticamente' : '📋 Salvo como rascunho'}\n\nSlug: /${json.artigo.slug}\n\nMeta: ${json.artigo.meta_description}`,
          legenda: json.artigo.conteudo?.slice(0, 400) + '...',
        }]
      }
    }
    if (agentId === 'growth' && json.acoes) return { texto: '', actions: json.acoes }
    if (agentId === 'dev' && json.diff) return { texto: '', diff: json.diff }
  } catch { /* texto normal */ }
  return { texto: content }
}

function MarkdownText({ content }: { content: string }) {
  const html = marked(content, { breaks: true, gfm: true }) as string
  return (
    <div
      style={{ fontSize: 13, lineHeight: 1.7, color: '#1a1a1a' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function CardConteudo({ card }: { card: Card }) {
  const [expandido, setExpandido] = useState(false)
  const cor = FORMAT_COLORS[card.formato || ''] || '#888'
  return (
    <div style={{ background: '#fff', border: `1px solid ${cor}44`, borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
      <div style={{ background: cor + '12', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setExpandido(!expandido)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: cor, background: cor + '22', padding: '3px 10px', borderRadius: 20 }}>{card.formato}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{card.dia}</span>
        </div>
        <span style={{ fontSize: 11, color: '#aaa' }}>{expandido ? '▲ fechar' : '▼ ver tudo'}</span>
      </div>
      {expandido && (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {card.hook && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 4 }}>HOOK</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', borderLeft: `3px solid ${cor}`, paddingLeft: 10, lineHeight: 1.5 }}>{card.hook}</div>
            </div>
          )}
          {card.titulo && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 4 }}>TÍTULO</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', borderLeft: `3px solid ${cor}`, paddingLeft: 10 }}>{card.titulo}</div>
            </div>
          )}
          {card.roteiro && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 4 }}>ROTEIRO</div>
              <div style={{ fontSize: 12, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{card.roteiro}</div>
            </div>
          )}
          {card.slides && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 6 }}>SLIDES</div>
              {card.slides.map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: '#444', background: '#f8f9f8', borderRadius: 8, padding: '7px 10px', marginBottom: 4, display: 'flex', gap: 8 }}>
                  <span style={{ fontWeight: 700, color: cor, minWidth: 20 }}>{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
          {card.texto && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 4 }}>TEXTO</div>
              <div style={{ fontSize: 12, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{card.texto}</div>
            </div>
          )}
          {card.cta && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 4 }}>CTA</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{card.cta}</div>
            </div>
          )}
          {card.legenda && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 4 }}>LEGENDA</div>
              <div style={{ fontSize: 11, color: '#666', background: '#f8f9f8', borderRadius: 8, padding: '8px 10px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{card.legenda}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CardDiff({ block }: { block: DiffBlock }) {
  const [copiado, setCopiado] = useState(false)
  const comando = `cd /workspaces/ai-finance-app && claude --print "aplique este patch em ${block.arquivo}: ${block.descricao}"`
  return (
    <div style={{ background: '#fff', border: '1px solid #D85A3033', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
      <div style={{ background: '#D85A3010', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#D85A30', marginBottom: 2, letterSpacing: '0.05em' }}>PATCH</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{block.arquivo}</div>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(comando); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}
          style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, border: 'none', background: copiado ? '#1D9E75' : '#D85A30', color: '#fff', cursor: 'pointer', fontWeight: 600, transition: 'background .2s' }}>
          {copiado ? '✓ Copiado!' : 'Copiar comando'}
        </button>
      </div>
      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>{block.descricao}</div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, borderRadius: 8, overflow: 'hidden', border: '1px solid #eee' }}>
          {block.antes.split('\n').map((l, i) => (
            <div key={`a${i}`} style={{ padding: '2px 10px', background: '#ffeef0', color: '#b91c1c' }}>- {l}</div>
          ))}
          {block.depois.split('\n').map((l, i) => (
            <div key={`d${i}`} style={{ padding: '2px 10px', background: '#f0fff4', color: '#166534' }}>+ {l}</div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: '#999', marginTop: 8, fontFamily: 'monospace', background: '#f5f5f5', borderRadius: 6, padding: '6px 10px', wordBreak: 'break-all' }}>{comando}</div>
      </div>
    </div>
  )
}

function CardAction({ action }: { action: AgentAction }) {
  const cores: Record<string, string> = { executado: '#1D9E75', pendente: '#EF9F27', erro: '#D85A30' }
  const icones: Record<string, string> = { email: 'EMAIL', publicar: 'POST', segmentar: 'SEG', alerta: '⚠️' }
  const cor = cores[action.status] || '#888'
  return (
    <div style={{ background: '#fff', border: `1px solid ${cor}33`, borderRadius: 10, padding: '10px 14px', marginBottom: 6, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: cor, flexShrink: 0, letterSpacing: '0.04em' }}>
        {icones[action.tipo] || action.tipo.toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>{action.descricao}</div>
        {action.detalhe && <div style={{ fontSize: 11, color: '#888', lineHeight: 1.6 }}>{action.detalhe}</div>}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: cor, background: cor + '18', padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
        {action.status}
      </span>
    </div>
  )
}

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
          agentId: agenteSelecionado.id,
        }),
      })
      if (!res.ok) throw new Error('Erro na API')
      const data = await res.json()
      const parsed = parseResposta(data.content ?? 'Sem resposta.', agenteSelecionado.id)
      setMensagens(prev => ({
        ...prev,
        [agenteSelecionado.id]: [...historico, { role: 'assistant', content: parsed.texto, ts: new Date(), cards: parsed.cards, diff: parsed.diff, actions: parsed.actions }],
      }))
    } catch {
      setMensagens(prev => ({
        ...prev,
        [agenteSelecionado.id]: [...historico, { role: 'assistant', content: 'Erro ao conectar. Tente novamente.', ts: new Date() }],
      }))
    } finally { setLoading(false) }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  const badgeStyle: Record<string, React.CSSProperties> = {
    ativo: { background: '#E1F5EE', color: '#085041' },
    beta: { background: '#FAEEDA', color: '#633806' },
    'em breve': { background: '#F1EFE8', color: '#5F5E5A' },
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Nunito',sans-serif", background: '#f8f9f8', overflow: 'hidden' }}>
      <aside style={{ width: 272, minWidth: 272, borderRight: '1px solid #e8ede8', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #e8ede8', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#E1F5EE" strokeWidth="1.5" />
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" fill="#E1F5EE" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>iMoney</div>
            <div style={{ fontSize: 11, color: '#999' }}>Agentes internos</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {AGENTES.map(agente => {
            const ativo = agente.id === agenteSelecionado.id
            const temMsgs = mensagens[agente.id].length > 0
            return (
              <button key={agente.id} onClick={() => { setAgenteSelecionado(agente); setInput('') }}
                style={{ width: '100%', textAlign: 'left', background: ativo ? '#f0faf6' : 'transparent', border: ativo ? `1px solid ${agente.cor}44` : '1px solid transparent', borderRadius: 10, padding: '9px 10px', cursor: 'pointer', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 10, transition: 'all .15s' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: `${agente.cor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: agente.cor, letterSpacing: '0.05em' }}>
                  {agente.iniciais}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agente.nome}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>{agente.cargo}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, fontWeight: 600, ...badgeStyle[agente.status] }}>
                    {agente.status === 'em breve' ? 'Em breve' : agente.status.charAt(0).toUpperCase() + agente.status.slice(1)}
                  </span>
                  {temMsgs && <div style={{ width: 5, height: 5, borderRadius: '50%', background: agente.cor }} />}
                </div>
              </button>
            )
          })}
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid #e8ede8', fontSize: 11, color: '#bbb' }}>
          5 agentes · Claude Sonnet · R$ 660/mês
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 22px', borderBottom: '1px solid #e8ede8', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${agenteSelecionado.cor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: agenteSelecionado.cor, letterSpacing: '0.05em' }}>
              {agenteSelecionado.iniciais}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{agenteSelecionado.nome}</div>
              <div style={{ fontSize: 12, color: '#999' }}>{agenteSelecionado.descricao}</div>
            </div>
          </div>
          {msgs.length > 0 && (
            <button onClick={() => setMensagens(prev => ({ ...prev, [agenteSelecionado.id]: [] }))}
              style={{ fontSize: 12, color: '#aaa', background: 'none', border: '1px solid #e8ede8', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}>
              Limpar
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {msgs.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '40px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: `${agenteSelecionado.cor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: agenteSelecionado.cor, letterSpacing: '0.05em' }}>
                {agenteSelecionado.iniciais}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 5 }}>{agenteSelecionado.nome}</div>
                <div style={{ fontSize: 13, color: '#888', maxWidth: 340, lineHeight: 1.6 }}>{agenteSelecionado.descricao}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 520, width: '100%' }}>
                {agenteSelecionado.sugestoes.map((s, i) => (
                  <button key={i} onClick={() => enviar(s)}
                    style={{ textAlign: 'left', padding: '9px 13px', background: '#fff', border: '1px solid #e8ede8', borderRadius: 10, cursor: 'pointer', fontSize: 12, color: '#555', lineHeight: 1.5, transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = agenteSelecionado.cor; e.currentTarget.style.color = '#1a1a1a' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8ede8'; e.currentTarget.style.color = '#555' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, background: `${agenteSelecionado.cor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: agenteSelecionado.cor, marginRight: 8, marginTop: 2, letterSpacing: '0.05em' }}>
                  {agenteSelecionado.iniciais}
                </div>
              )}
              <div style={{ maxWidth: msg.cards || msg.diff || msg.actions ? '92%' : '72%', width: msg.cards || msg.diff || msg.actions ? '92%' : undefined }}>
                {msg.role === 'user' ? (
                  <div style={{ background: agenteSelecionado.cor, color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '10px 14px', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.content}
                    <div style={{ fontSize: 10, marginTop: 4, opacity: .5, textAlign: 'right' }}>{msg.ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ) : (
                  <div>
                    {msg.content && (
                      <div style={{ background: '#fff', border: '1px solid #e8ede8', borderRadius: '4px 14px 14px 14px', padding: '12px 16px', marginBottom: msg.cards || msg.diff || msg.actions ? 8 : 0 }}>
                        <MarkdownText content={msg.content} />
                        <div style={{ fontSize: 10, marginTop: 6, opacity: .4 }}>{msg.ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    )}
                    {msg.cards && msg.cards.map((card, ci) => <CardConteudo key={ci} card={card} />)}
                    {msg.diff && msg.diff.map((block, di) => <CardDiff key={di} block={block} />)}
                    {msg.actions && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 8, paddingLeft: 2 }}>AÇÕES EXECUTADAS</div>
                        {msg.actions.map((action, ai) => <CardAction key={ai} action={action} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: `${agenteSelecionado.cor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: agenteSelecionado.cor, letterSpacing: '0.05em' }}>
                {agenteSelecionado.iniciais}
              </div>
              <div style={{ background: '#fff', border: '1px solid #e8ede8', borderRadius: '4px 14px 14px 14px', padding: '10px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(j => (
                  <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: agenteSelecionado.cor, animation: `bounce 1.2s ${j * .2}s ease-in-out infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #e8ede8', background: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: '#f8f9f8', borderRadius: 14, border: '1px solid #e8ede8', padding: '9px 12px' }}>
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={`Fale com o ${agenteSelecionado.nome}...`} rows={1}
              style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', fontSize: 13, fontFamily: "'Nunito',sans-serif", color: '#1a1a1a', outline: 'none', lineHeight: 1.5, maxHeight: 160 }} />
            <button onClick={() => enviar()} disabled={!input.trim() || loading}
              style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: input.trim() && !loading ? agenteSelecionado.cor : '#e8ede8', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke={input.trim() && !loading ? '#fff' : '#aaa'} strokeWidth="2" strokeLinecap="round" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input.trim() && !loading ? '#fff' : '#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 5, textAlign: 'center' }}>Enter para enviar · Shift+Enter para nova linha</div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap');
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#d0d0d0;border-radius:4px}
        .prose h1,.prose h2,.prose h3{font-weight:700;margin:0.8em 0 0.4em;color:#1a1a1a}
        .prose h2{font-size:14px} .prose h3{font-size:13px}
        .prose p{margin:0.4em 0;line-height:1.7}
        .prose ul,.prose ol{padding-left:1.4em;margin:0.4em 0}
        .prose li{margin:0.2em 0}
        .prose strong{font-weight:700;color:#1a1a1a}
        .prose code{background:#f0f0f0;padding:1px 5px;border-radius:4px;font-size:11px;font-family:monospace}
        .prose pre{background:#f5f5f5;border-radius:8px;padding:10px;overflow-x:auto;font-size:11px}
        .prose blockquote{border-left:3px solid #e0e0e0;margin:0.5em 0;padding-left:10px;color:#666}
      `}</style>
    </div>
  )
}
