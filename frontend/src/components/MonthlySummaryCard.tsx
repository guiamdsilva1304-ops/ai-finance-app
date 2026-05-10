'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Sparkles, Lock } from 'lucide-react'

interface MonthlySummary {
  id: string
  year: number
  month: number
  summary_text: string
  total_spent: number
  total_income: number
  top_categories: { category: string; total: number }[]
  vs_previous_month: { prev_total: number; diff_percent: number }
  generated_at: string
}

interface MonthlySummaryCardProps {
  isPro: boolean
}

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
]

export default function MonthlySummaryCard({ isPro }: MonthlySummaryCardProps) {
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    if (!isPro) { setLoading(false); return }
    fetchSummary()
  }, [isPro])

  async function fetchSummary() {
    const now = new Date()
    const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth()
    const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

    const { data } = await supabase
      .from('monthly_summaries')
      .select('*')
      .eq('year', targetYear)
      .eq('month', targetMonth)
      .single()

    setSummary(data)
    setLoading(false)
  }

  const diffPercent = summary?.vs_previous_month?.diff_percent ?? 0
  const saldo = (summary?.total_income ?? 0) - (summary?.total_spent ?? 0)
  const saldoPositivo = saldo >= 0

  if (!isPro) {
    return (
      <div className="rounded-2xl border border-dashed border-green-200 bg-green-50/40 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-green-600" />
          <span className="text-sm font-semibold text-green-800">Resumo Mensal com IA</span>
          <span className="ml-auto text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">PRO</span>
        </div>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          Receba todo mês uma análise completa dos seus gastos com comparação ao mês anterior e dicas personalizadas do seu Assessor.
        </p>
        <a
          href="/dashboard/pro"
          className="block w-full text-center bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          <Lock size={13} className="inline mr-1.5 mb-0.5" />
          Assinar Pro — R$29,90/mês
        </a>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
        <div className="h-16 bg-gray-50 rounded mb-3" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-green-600" />
          <span className="text-sm font-semibold text-gray-700">Resumo Mensal</span>
        </div>
        <p className="text-sm text-gray-400">
          Seu primeiro resumo será gerado no dia 1 do próximo mês. ✨
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#1a3a1a] to-[#2d5a2d] px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-green-400" />
            <span className="text-sm font-semibold text-white">
              Resumo de {MONTH_NAMES[summary.month - 1]}
            </span>
          </div>
          <span className="text-xs text-green-300 bg-green-900/40 px-2 py-0.5 rounded-full">
            {summary.year}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Receitas</p>
          <p className="text-sm font-bold text-green-600">
            R$ {summary.total_income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Gastos</p>
          <p className="text-sm font-bold text-red-500">
            R$ {summary.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Saldo</p>
          <p className={`text-sm font-bold ${saldoPositivo ? 'text-green-600' : 'text-red-500'}`}>
            {saldoPositivo ? '+' : ''}R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="px-5 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center gap-2">
        {diffPercent > 5 ? (
          <TrendingUp size={14} className="text-red-500 shrink-0" />
        ) : diffPercent < -5 ? (
          <TrendingDown size={14} className="text-green-600 shrink-0" />
        ) : (
          <Minus size={14} className="text-gray-400 shrink-0" />
        )}
        <p className="text-xs text-gray-500">
          Gastos {diffPercent > 0 ? 'aumentaram' : diffPercent < 0 ? 'caíram' : 'estáveis'}{' '}
          <span className={`font-semibold ${diffPercent > 0 ? 'text-red-500' : 'text-green-600'}`}>
            {diffPercent > 0 ? '+' : ''}{diffPercent}%
          </span>{' '}
          vs mês anterior
        </p>
      </div>

      <div className="px-5 py-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Top categorias
        </p>
        <div className="space-y-1.5 mb-4">
          {summary.top_categories.slice(0, expanded ? undefined : 3).map((c, i) => {
            const pct = Math.round((c.total / summary.total_spent) * 100)
            return (
              <div key={i}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs text-gray-600">{c.category}</span>
                  <span className="text-xs font-semibold text-gray-700">
                    R$ {c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    <span className="text-gray-400 font-normal ml-1">({pct}%)</span>
                  </span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {expanded && (
          <div className="bg-green-50 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={13} className="text-green-600" />
              <p className="text-xs font-semibold text-green-800">Análise do Assessor</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
              {summary.summary_text}
            </p>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-xs text-green-600 font-medium py-1 hover:text-green-800 transition-colors"
        >
          {expanded ? (
            <><ChevronUp size={14} /> Ver menos</>
          ) : (
            <><ChevronDown size={14} /> Ver análise completa</>
          )}
        </button>
      </div>
    </div>
  )
}
