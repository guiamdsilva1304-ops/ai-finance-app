'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import { Plus, CreditCard, Trash2, X, ChevronRight, Wallet } from 'lucide-react'

interface CreditCard {
  id: string
  nome: string
  bandeira: string
  limite: number
  limite_disponivel: number | null
  vencimento_fatura: number
  fechamento_fatura: number
  cor: string
  ativo: boolean
}

const BANDEIRAS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'elo', label: 'Elo' },
  { value: 'amex', label: 'American Express' },
  { value: 'hipercard', label: 'Hipercard' },
  { value: 'outros', label: 'Outros' },
]

const CORES = [
  '#1a3a1a', '#00C853', '#1565C0', '#6A1B9A',
  '#E65100', '#212121', '#AD1457', '#00838F',
]

function BandeiraIcon({ bandeira }: { bandeira: string }) {
  const logos: Record<string, string> = {
    visa: 'VISA',
    mastercard: 'MC',
    elo: 'ELO',
    amex: 'AMEX',
    hipercard: 'HIPER',
    outros: '●●●●',
  }
  return (
    <span className="text-xs font-black tracking-wider opacity-90">
      {logos[bandeira] || '●●●●'}
    </span>
  )
}

function CardVisual({ card }: { card: CreditCard }) {
  const usado = card.limite - (card.limite_disponivel ?? card.limite)
  const percentUsado = card.limite > 0 ? (usado / card.limite) * 100 : 0
  const corBarra = percentUsado > 80 ? '#ef4444' : percentUsado > 60 ? '#f59e0b' : '#00C853'

  return (
    <div
      className="relative rounded-2xl p-5 text-white overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${card.cor} 0%, ${card.cor}cc 100%)`,
        minHeight: 160,
      }}
    >
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10 bg-white" />
      <div className="absolute -bottom-8 -right-2 w-36 h-36 rounded-full opacity-10 bg-white" />

      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs opacity-70 font-medium mb-0.5">iMoney</p>
          <p className="font-bold text-base">{card.nome}</p>
        </div>
        <BandeiraIcon bandeira={card.bandeira} />
      </div>

      <div className="mb-3">
        <p className="text-xs opacity-70 mb-0.5">Limite disponível</p>
        <p className="text-xl font-black">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            card.limite_disponivel ?? card.limite
          )}
        </p>
        <p className="text-xs opacity-60">
          de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.limite)}
        </p>
      </div>

      <div className="mb-3">
        <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(percentUsado, 100)}%`, backgroundColor: corBarra }}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs opacity-70">
        <span>Fecha dia {card.fechamento_fatura}</span>
        <span>Vence dia {card.vencimento_fatura}</span>
      </div>
    </div>
  )
}

function ModalNovoCartao({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (data: Omit<CreditCard, 'id' | 'ativo'>) => Promise<void>
}) {
  const [form, setForm] = useState({
    nome: '',
    bandeira: 'visa',
    limite: '',
    limite_disponivel: '',
    vencimento_fatura: '',
    fechamento_fatura: '',
    cor: CORES[0],
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async () => {
    if (!form.nome || !form.limite || !form.vencimento_fatura || !form.fechamento_fatura) {
      setErro('Preencha todos os campos obrigatórios.')
      return
    }
    setLoading(true)
    setErro('')
    try {
      await onSave({
        nome: form.nome,
        bandeira: form.bandeira,
        limite: parseFloat(form.limite),
        limite_disponivel: form.limite_disponivel
          ? parseFloat(form.limite_disponivel)
          : parseFloat(form.limite),
        vencimento_fatura: parseInt(form.vencimento_fatura),
        fechamento_fatura: parseInt(form.fechamento_fatura),
        cor: form.cor,
      })
      onClose()
    } catch {
      setErro('Algo deu errado ao salvar — tente em instantes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CreditCard className="text-[#00C853]" size={20} />
            <h2 className="font-black text-[#1a3a1a] text-lg" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Novo Cartão
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <CardVisual
            card={{
              id: 'preview',
              nome: form.nome || 'Meu Cartão',
              bandeira: form.bandeira,
              limite: parseFloat(form.limite) || 0,
              limite_disponivel: form.limite_disponivel
                ? parseFloat(form.limite_disponivel)
                : parseFloat(form.limite) || 0,
              vencimento_fatura: parseInt(form.vencimento_fatura) || 10,
              fechamento_fatura: parseInt(form.fechamento_fatura) || 3,
              cor: form.cor,
              ativo: true,
            }}
          />

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Cor do cartão
            </label>
            <div className="flex gap-2">
              {CORES.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, cor: c })}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: form.cor === c ? '#00C853' : 'transparent',
                    transform: form.cor === c ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Nome do cartão *
            </label>
            <input
              type="text"
              placeholder="ex: Nubank, Itaú Black..."
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="input w-full"
              maxLength={100}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Bandeira *
            </label>
            <select
              value={form.bandeira}
              onChange={(e) => setForm({ ...form, bandeira: e.target.value })}
              className="input w-full bg-white"
            >
              {BANDEIRAS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Limite total *
              </label>
              <input
                type="number"
                placeholder="5000"
                value={form.limite}
                onChange={(e) => setForm({ ...form, limite: e.target.value })}
                className="input w-full"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Disponível agora
              </label>
              <input
                type="number"
                placeholder="3200"
                value={form.limite_disponivel}
                onChange={(e) => setForm({ ...form, limite_disponivel: e.target.value })}
                className="input w-full"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Fechamento (dia) *
              </label>
              <input
                type="number"
                placeholder="3"
                min={1}
                max={31}
                value={form.fechamento_fatura}
                onChange={(e) => setForm({ ...form, fechamento_fatura: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Vencimento (dia) *
              </label>
              <input
                type="number"
                placeholder="10"
                min={1}
                max={31}
                value={form.vencimento_fatura}
                onChange={(e) => setForm({ ...form, vencimento_fatura: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>

          {erro && <p className="text-red-500 text-sm font-medium">{erro}</p>}
        </div>

        <div className="p-5 border-t border-gray-100">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full py-3.5"
          >
            {loading ? 'Salvando...' : 'Adicionar Cartão'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CartoesPage() {
  const supabase = createSupabaseBrowser()
  const [cartoes, setCartoes] = useState<CreditCard[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const limiteTotal = cartoes.reduce((acc, c) => acc + c.limite, 0)
  const disponivelTotal = cartoes.reduce((acc, c) => acc + (c.limite_disponivel ?? c.limite), 0)
  const usadoTotal = limiteTotal - disponivelTotal

  useEffect(() => {
    fetchCartoes()
  }, [])

  async function fetchCartoes() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('created_at', { ascending: false })
    setCartoes(data || [])
    setLoading(false)
  }

  async function handleSave(data: Omit<CreditCard, 'id' | 'ativo'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    const { error } = await supabase
      .from('credit_cards')
      .insert({ ...data, user_id: user.id })
    if (error) throw error
    await fetchCartoes()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este cartão?')) return
    await supabase.from('credit_cards').update({ ativo: false }).eq('id', id)
    await fetchCartoes()
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <div className="p-5 lg:p-8 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-[#0d2414]" style={{ fontFamily: 'Nunito, sans-serif', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CreditCard size={28} color="#00C853" /> Cartões
          </h1>
          <p className="text-sm text-[#6b9e80] mt-0.5">Gerencie seus cartões de crédito</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {([
          { href: "/dashboard/transacoes", label: "Transações", active: false },
          { href: "/dashboard/orcamento",  label: "Orçamento",  active: false },
          { href: "/dashboard/cartoes",    label: "Cartões",    active: true },
        ] as { href: string; label: string; active: boolean }[]).map(({ href, label, active }) => (
          <a key={href} href={href} style={{
            display: "inline-flex", alignItems: "center",
            padding: "7px 16px", borderRadius: 999,
            background: active ? "#1D9E75" : "transparent",
            color: active ? "#fff" : "#6b9e80",
            fontWeight: 700, fontSize: 13, fontFamily: "Nunito, sans-serif",
            textDecoration: "none",
            border: active ? "1.5px solid transparent" : "1.5px solid #e4f5e9",
          }}>{label}</a>
        ))}
      </div>

      {/* Resumo geral */}
      {cartoes.length > 0 && (
        <div className="card mb-5" style={{ background: '#0d2414', color: '#fff' }}>
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={18} style={{ color: '#00C853' }} />
            <span className="text-sm font-semibold opacity-80">Visão geral</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs opacity-60 mb-1">Limite total</p>
              <p className="font-black text-sm">{fmt(limiteTotal)}</p>
            </div>
            <div>
              <p className="text-xs opacity-60 mb-1">Usado</p>
              <p className="font-black text-sm" style={{ color: '#fca5a5' }}>{fmt(usadoTotal)}</p>
            </div>
            <div>
              <p className="text-xs opacity-60 mb-1">Disponível</p>
              <p className="font-black text-sm" style={{ color: '#00C853' }}>{fmt(disponivelTotal)}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${limiteTotal > 0 ? (disponivelTotal / limiteTotal) * 100 : 0}%`,
                  background: '#00C853',
                }}
              />
            </div>
            <p className="text-xs opacity-50 mt-1 text-right">
              {limiteTotal > 0 ? Math.round((disponivelTotal / limiteTotal) * 100) : 0}% disponível
            </p>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl shimmer" />
          ))}
        </div>
      ) : cartoes.length === 0 ? (
        <div className="card text-center py-12 bg-[#f8fdf9]">
          <p className="text-4xl mb-3">💳</p>
          <p className="font-black text-[#0d2414] text-lg" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Nenhum cartão ainda
          </p>
          <p className="text-sm text-[#6b9e80] mt-1 mb-6">
            Adicione seus cartões para o Assessor IA conhecer seu limite e gastos.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Adicionar primeiro cartão
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {cartoes.map((card) => (
            <div key={card.id} className="relative group">
              <CardVisual card={card} />
              <button
                onClick={() => handleDelete(card.id)}
                className="absolute top-3 right-3 bg-red-500/80 backdrop-blur-sm text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dica Assessor */}
      {cartoes.length > 0 && (
        <div className="card mt-5 flex items-center gap-3" style={{ background: '#E8F5E9' }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#00C853' }}
          >
            <span className="text-white text-lg">✦</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0d2414]">Assessor IA atualizado</p>
            <p className="text-xs text-[#6b9e80] mt-0.5">
              O Assessor já conhece seus cartões e usa esse contexto nas conversas.
            </p>
          </div>
          <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
        </div>
      )}

      {showModal && (
        <ModalNovoCartao
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
