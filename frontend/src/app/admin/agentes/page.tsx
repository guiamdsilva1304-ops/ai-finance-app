'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { marked } from 'marked'
import Hub from './Hub'
import ApprovalQueue from './ApprovalQueue'
import ContentPipeline from './ContentPipeline'
import Metricas from './Metricas'

import AgenteCS from './AgenteCS'
import AgenteDados from './AgenteDados'
import AgenteReceita from './AgenteReceita'
import AgenteConteudo from './AgenteConteudo'

type AgentId = 'seo' | 'growth'
type Aba = 'hub' | 'metricas' | 'aprovacao' | 'pipeline' | 'agentes' | 'cs' | 'dados' | 'receita' | 'conteudo'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: Date
  cards?: Card[]
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
  Reels: '#534AB7', Carrossel: '#085041', Post: '#0C447C', Stories: '#633806',
}

const AGENTES: Agent[] = [
  {
    id: 'seo',
    nome: 'Agente SEO',
    cargo: 'Head of Growth Organico',
    descricao: 'Pesquisa keywords, escreve e publica 70% dos artigos automaticamente.',
    status: 'ativo', cor: '#378ADD', iniciais: 'SEO',
    systemPrompt: 'Voce e o agente de SEO da iMoney, app brasileiro de financas pessoais com IA. Especialista em SEO para financas pessoais no Brasil. Quando pedirem para escrever e publicar um artigo, retorne APENAS este JSON sem markdown sem backticks: {"artigo":{"titulo":"...","slug":"url-do-artigo","meta_description":"...","conteudo":"artigo completo em markdown","publicar_automaticamente":true}} Use publicar_automaticamente true para artigos informativos 70% dos casos. Para outros pedidos responda em markdown.',
    sugestoes: [
      'Escreva e publique: Como montar reserva de emergencia em 2026',
      'Escreva e publique: Quanto guardar por mes com salario de R$ 3.000',
      'Liste as 20 keywords mais valiosas para o blog da iMoney',
      'Monte um cluster de conteudo sobre investimentos para iniciantes',
    ],
  },
  {
    id: 'growth',
    nome: 'Agente de growth',
    cargo: 'Head of Growth',
    descricao: 'Age de forma autonoma: dispara emails, segmenta usuarios e converte cadastros em pagantes.',
    status: 'ativo', cor: '#7F77DD', iniciais: 'GRW',
    systemPrompt: 'Voce e o agente de growth da iMoney, app brasileiro de financas pessoais com IA. Foco: converter cadastros gratuitos em pagantes R$ 29,90/mes e reduzir churn. Break-even: 22 usuarios. Meta: 100 pagantes em 6 meses. Quando pedirem uma acao de growth, retorne APENAS este JSON sem markdown sem backticks: {"acoes":[{"tipo":"email","descricao":"...","status":"executado","detalhe":"assunto e corpo"},{"tipo":"alerta","descricao":"...","status":"pendente","detalhe":"requer aprovacao"}]} Use executado para acoes automaticas. Use pendente para mudancas de preco ou campanhas novas. Para analises responda em markdown.',
    sugestoes: [
      'Execute a sequencia de boas-vindas para novos cadastros',
      'Identifique usuarios inativos ha 30 dias e reative',
      'Dispare campanha de upgrade para usuarios ativos ha 60 dias',
      'Monte o funil completo: cadastro ativacao pagamento',
    ],
  },
]

function tentarParsearJSON(text: string) {
  let limpo = text
  const blocoJson = text.match(/```json([\s\S]*?)```/)
  if (blocoJson) limpo = blocoJson[1].trim()
  else limpo = text.replace(/```[\s\S]*?```/g, '').replace(/`/g, '').trim()
  try { return JSON.parse(limpo) } catch { }
  const matches = limpo.match(/\{[\s\S]*\}/g) ?? []
  for (const match of matches) {
    try { return JSON.parse(match) } catch { continue }
  }
  return null
}

function parseResposta(content: string, agentId: AgentId) {
  const json = tentarParsearJSON(content)
  if (json) {
    if (agentId === 'seo' && json.artigo) return { texto: '', cards: [{ titulo: json.artigo.titulo, texto: (json.artigo.publicar_automaticamente ? 'Publicado automaticamente' : 'Salvo como rascunho') + '\n\nSlug: /' + json.artigo.slug + '\n\nMeta: ' + json.artigo.meta_description, legenda: (json.artigo.conteudo ?? '').slice(0, 400) + '...' }] }
    if (agentId === 'growth' && json.acoes) return { texto: '', actions: json.acoes }
  }
  return { texto: content }
}

function MarkdownText({ content }: { content: string }) {
  const html = marked(content, { breaks: true, gfm: true }) as string
  return <div className="prose" style={{ fontSize: 13, lineHeight: 1.7, color: '#1a1a1a' }} dangerouslySetInnerHTML={{ __html: html }} />
}

function CardConteudo({ card }: { card: Card }) {
  const [exp, setExp] = useState(false)
  const cor = FORMAT_COLORS[card.formato || ''] || '#888'
  return (
    <div style={{ background: '#fff', border: '1px solid ' + cor + '44', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
      <div style={{ background: cor + '12', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExp(!exp)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: cor, background: cor + '22', padding: '3px 10px', borderRadius: 20 }}>{card.formato}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{card.dia}</span>
        </div>
        <span style={{ fontSize: 11, color: '#aaa' }}>{exp ? 'fechar' : 'ver tudo'}</span>
      </div>
      {exp && (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {card.hook && (<div><div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 4 }}>HOOK</div><div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', borderLeft: '3px solid ' + cor, paddingLeft: 10, lineHeight: 1.5 }}>{card.hook}</div></div>)}
          {card.titulo && (<div><div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 4 }}>TITULO</div><div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', borderLeft: '3px solid ' + cor, paddingLeft: 10 }}>{card.titulo}</div></div>)}
          {card.roteiro && (<div><div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 4 }}>ROTEIRO</div><div style={{ fontSize: 12, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{card.roteiro}</div></div>)}
          {card.slides && (<div><div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 6 }}>SLIDES</div>{card.slides.map((s, i) => (<div key={i} style={{ fontSize: 12, color: '#444', background: '#f8f9f8', borderRadius: 8, padding: '7px 10px', marginBottom: 4, display: 'flex', gap: 8 }}><span style={{ fontWeight: 700, color: cor, minWidth: 20 }}>{i + 1}</span><span>{s}</span></div>))}</div>)}
          {card.texto && (<div><div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 4 }}>TEXTO</div><div style={{ fontSize: 12, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{card.texto}</div></div>)}
          {card.cta && (<div><div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 4 }}>CTA</div><div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{card.cta}</div></div>)}
          {card.legenda && (<div><div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 4 }}>LEGENDA</div><div style={{ fontSize: 11, color: '#666', background: '#f8f9f8', borderRadius: 8, padding: '8px 10px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{card.legenda}</div></div>)}
        </div>
      )}
    </div>
  )
}

function CardAction({ action }: { action: AgentAction }) {
  const cores: Record<string, string> = { executado: '#1D9E75', pendente: '#EF9F27', erro: '#D85A30' }
  const icones: Record<string, string> = { email: 'EMAIL', publicar: 'POST', segmentar: 'SEG', alerta: 'AVISO' }
  const cor = cores[action.status] || '#888'
  return (
    <div style={{ background: '#fff', border: '1px solid ' + cor + '33', borderRadius: 10, padding: '10px 14px', marginBottom: 6, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: cor, flexShrink: 0 }}>{icones[action.tipo] || action.tipo.toUpperCase()}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>{action.descricao}</div>
        {action.detalhe && (<div style={{ fontSize: 11, color: '#888', lineHeight: 1.6 }}>{action.detalhe}</div>)}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: cor, background: cor + '18', padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{action.status}</span>
    </div>
  )
}

export default function AgentesPage() {
  const [aba, setAba] = useState<Aba>('hub')
  const [agenteSelecionado, setAgenteSelecionado] = useState<Agent>(AGENTES[0])
  const [mensagens, setMensagens] = useState<Record<AgentId, Message[]>>({ seo: [], growth: [] })
  const [memoriaCount, setMemoriaCount] = useState<Record<AgentId, number>>({ seo: 0, growth: 0 })
  const [carregandoMemoria, setCarregandoMemoria] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const msgs = mensagens[agenteSelecionado.id]

  const carregarHistorico = useCallback(async (agente: Agent) => {
    if (mensagens[agente.id].length > 0) return
    setCarregandoMemoria(true)
    try {
      const res = await fetch('/api/admin/agentes?agentId=' + agente.id)
      const data = await res.json()
      const raw: { role: string; content: string }[] = data.messages ?? []
      if (raw.length === 0) return
      const parsed: Message[] = raw.map(m => {
        const p = parseResposta(m.content, agente.id)
        return { role: m.role as 'user' | 'assistant', content: p.texto, ts: new Date(), cards: p.cards, actions: p.actions }
      })
      setMensagens(prev => ({ ...prev, [agente.id]: parsed }))
      setMemoriaCount(prev => ({ ...prev, [agente.id]: raw.length }))
    } catch { } finally { setCarregandoMemoria(false) }
  }, [mensagens])

  useEffect(() => { carregarHistorico(agenteSelecionado) }, [agenteSelecionado])
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
        body: JSON.stringify({ messages: historico.map(m => ({ role: m.role, content: m.content })), systemPrompt: agenteSelecionado.systemPrompt, agentId: agenteSelecionado.id }),
      })
      if (!res.ok) throw new Error('Erro na API')
      const data = await res.json()
      const parsed = parseResposta(data.content ?? 'Sem resposta.', agenteSelecionado.id)
      setMensagens(prev => ({ ...prev, [agenteSelecionado.id]: [...historico, { role: 'assistant', content: parsed.texto, ts: new Date(), cards: parsed.cards, actions: parsed.actions }] }))
      setMemoriaCount(prev => ({ ...prev, [agenteSelecionado.id]: prev[agenteSelecionado.id] + 2 }))
    } catch {
      setMensagens(prev => ({ ...prev, [agenteSelecionado.id]: [...historico, { role: 'assistant', content: 'Erro ao conectar. Tente novamente.', ts: new Date() }] }))
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#E1F5EE" strokeWidth="1.5"/><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" fill="#E1F5EE"/></svg>
          </div>
          <div><div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>iMoney</div><div style={{ fontSize: 11, color: '#999' }}>Agentes internos</div></div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #e8ede8' }}>
          {(['hub', 'metricas', 'aprovacao', 'pipeline', 'agentes', 'cs', 'dados', 'receita', 'conteudo'] as Aba[]).map(a => (
            <button key={a} onClick={() => setAba(a)} style={{ flex: 1, padding: '10px 0', border: 'none', background: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: aba === a ? '#1D9E75' : '#aaa', borderBottom: aba === a ? '2px solid #1D9E75' : '2px solid transparent' }}>
              {a === 'hub' ? '⚡ Hub' : a === 'metricas' ? '📊 Métricas' : a === 'aprovacao' ? '✓ Aprovação' : a === 'pipeline' ? '📋 Pipeline' : a === 'cs' ? '🎧 CS' : a === 'dados' ? '🔬 Dados' : a === 'receita' ? '💰 Receita' : a === 'conteudo' ? '✍️ Conteúdo' : 'Agentes'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: aba === 'agentes' ? 'block' : 'none' }}>
          {AGENTES.map(agente => {
            const ativo = agente.id === agenteSelecionado.id
            const count = memoriaCount[agente.id]
            return (
              <button key={agente.id} onClick={() => { setAgenteSelecionado(agente); setInput('') }}
                style={{ width: '100%', textAlign: 'left', background: ativo ? '#f0faf6' : 'transparent', border: ativo ? '1px solid ' + agente.cor + '44' : '1px solid transparent', borderRadius: 10, padding: '9px 10px', cursor: 'pointer', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: agente.cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: agente.cor, letterSpacing: '0.05em' }}>{agente.iniciais}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agente.nome}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>{agente.cargo}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, fontWeight: 600, ...badgeStyle[agente.status] }}>
                    {agente.status === 'em breve' ? 'Em breve' : agente.status.charAt(0).toUpperCase() + agente.status.slice(1)}
                  </span>
                  {count > 0 && (<div style={{ fontSize: 9, color: '#1D9E75', fontWeight: 700 }}>mem: {count}</div>)}
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ padding: '10px 14px', borderTop: '1px solid #e8ede8', fontSize: 11, color: '#bbb' }}>
          2 agentes ativos · R$ 660/mes burn
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ flex: 1, overflowY: 'auto', display: aba === 'hub' ? 'block' : 'none' }}><Hub /></div>
        <div style={{ flex: 1, overflowY: 'auto', display: aba === 'metricas' ? 'block' : 'none' }}><Metricas /></div>
        <div style={{ flex: 1, overflowY: 'auto', display: aba === 'aprovacao' ? 'block' : 'none' }}><ApprovalQueue /></div>


        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: aba === 'cs' ? 'block' : 'none' }}><AgenteCS /></div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: aba === 'dados' ? 'block' : 'none' }}><AgenteDados /></div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: aba === 'receita' ? 'block' : 'none' }}><AgenteReceita /></div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: aba === 'conteudo' ? 'block' : 'none' }}><AgenteConteudo /></div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: aba === 'pipeline' ? 'block' : 'none' }}><ContentPipeline /></div>

        <div style={{ flex: 1, flexDirection: 'column', overflow: 'hidden', display: aba === 'agentes' ? 'flex' : 'none' }}>
          <div style={{ padding: '14px 22px', borderBottom: '1px solid #e8ede8', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: agenteSelecionado.cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: agenteSelecionado.cor, letterSpacing: '0.05em' }}>{agenteSelecionado.iniciais}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{agenteSelecionado.nome}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{agenteSelecionado.descricao}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {carregandoMemoria && (<span style={{ fontSize: 11, color: '#aaa' }}>Carregando...</span>)}
              {memoriaCount[agenteSelecionado.id] > 0 && (<div style={{ fontSize: 11, color: '#888', background: '#f0faf6', border: '1px solid #b8e8d4', borderRadius: 20, padding: '3px 10px' }}>mem: {memoriaCount[agenteSelecionado.id]}</div>)}
              {msgs.length > 0 && (
                <button onClick={() => setMensagens(prev => ({ ...prev, [agenteSelecionado.id]: [] }))} style={{ fontSize: 12, color: '#aaa', background: 'none', border: '1px solid #e8ede8', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}>
                  Limpar
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {msgs.length === 0 && !carregandoMemoria && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '40px 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, background: agenteSelecionado.cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: agenteSelecionado.cor, letterSpacing: '0.05em' }}>{agenteSelecionado.iniciais}</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 5 }}>{agenteSelecionado.nome}</div>
                  <div style={{ fontSize: 13, color: '#888', maxWidth: 340, lineHeight: 1.6 }}>{agenteSelecionado.descricao}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 520, width: '100%' }}>
                  {agenteSelecionado.sugestoes.map((s, i) => (
                    <button key={i} onClick={() => enviar(s)} style={{ textAlign: 'left', padding: '9px 13px', background: '#fff', border: '1px solid #e8ede8', borderRadius: 10, cursor: 'pointer', fontSize: 12, color: '#555', lineHeight: 1.5 }}
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
                  <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, background: agenteSelecionado.cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: agenteSelecionado.cor, marginRight: 8, marginTop: 2, letterSpacing: '0.05em' }}>{agenteSelecionado.iniciais}</div>
                )}
                <div style={{ maxWidth: msg.cards || msg.actions ? '92%' : '72%', width: msg.cards || msg.actions ? '92%' : undefined }}>
                  {msg.role === 'user' ? (
                    <div style={{ background: agenteSelecionado.cor, color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '10px 14px', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.content}
                      <div style={{ fontSize: 10, marginTop: 4, opacity: .5, textAlign: 'right' }}>{msg.ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  ) : (
                    <div>
                      {msg.content && (
                        <div style={{ background: '#fff', border: '1px solid #e8ede8', borderRadius: '4px 14px 14px 14px', padding: '12px 16px', marginBottom: msg.cards || msg.actions ? 8 : 0 }}>
                          <MarkdownText content={msg.content} />
                          <div style={{ fontSize: 10, marginTop: 6, opacity: .4 }}>{msg.ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      )}
                      {msg.cards && Array.isArray(msg.cards) && msg.cards.map((card, ci) => (<CardConteudo key={ci} card={card} />))}
                      {msg.actions && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 8 }}>ACOES EXECUTADAS</div>
                          {msg.actions.map((action, ai) => (<CardAction key={ai} action={action} />))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: agenteSelecionado.cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: agenteSelecionado.cor, letterSpacing: '0.05em' }}>{agenteSelecionado.iniciais}</div>
                <div style={{ background: '#fff', border: '1px solid #e8ede8', borderRadius: '4px 14px 14px 14px', padding: '10px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(j => (<div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: agenteSelecionado.cor, animation: 'bounce 1.2s ' + (j * .2) + 's ease-in-out infinite' }} />))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '14px 22px', borderTop: '1px solid #e8ede8', background: '#fff', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: '#f8f9f8', borderRadius: 14, border: '1px solid #e8ede8', padding: '9px 12px' }}>
              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={'Fale com o ' + agenteSelecionado.nome + '...'} rows={1}
                style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', fontSize: 13, fontFamily: "'Nunito',sans-serif", color: '#1a1a1a', outline: 'none', lineHeight: 1.5, maxHeight: 160 }} />
              <button onClick={() => enviar()} disabled={!input.trim() || loading}
                style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: input.trim() && !loading ? agenteSelecionado.cor : '#e8ede8', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke={input.trim() && !loading ? '#fff' : '#aaa'} strokeWidth="2" strokeLinecap="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input.trim() && !loading ? '#fff' : '#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#bbb', marginTop: 5, textAlign: 'center' }}>Enter para enviar · Shift+Enter para nova linha</div>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap');
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#d0d0d0;border-radius:4px}
        .prose h2{font-size:14px;font-weight:500;margin:0.8em 0 0.4em;color:#1a1a1a} .prose h3{font-size:13px;font-weight:500;margin:0.6em 0 0.3em;color:#1a1a1a}
        .prose p{margin:0.4em 0;line-height:1.7} .prose ul,.prose ol{padding-left:1.4em;margin:0.4em 0}
        .prose li{margin:0.2em 0} .prose strong{font-weight:700;color:#1a1a1a}
        .prose code{background:#f0f0f0;padding:1px 5px;border-radius:4px;font-size:11px;font-family:monospace}
        .prose pre{background:#f5f5f5;border-radius:8px;padding:10px;overflow-x:auto;font-size:11px}
      `}</style>
    </div>
  )
}
