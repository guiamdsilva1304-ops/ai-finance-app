"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { formatBRL, formatPct } from "@/lib/utils";
import { Plus, Trash2, RefreshCw, Globe, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Investment, ExchangeRate } from "@/types";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const TIPOS = [
  "Ações BR (B3)","Ações EUA","Ações Europa","Ações Outros",
  "FIIs","ETF","Tesouro Direto","CDB/LCI/LCA",
  "Criptomoedas","Fundos","Previdência","Poupança","Outro",
];
const MOEDAS = ["BRL","USD","EUR","GBP","ARS","JPY","CAD","AUD","CHF","CNY","BTC"];
const PAISES = ["Brasil","Estados Unidos","Europa","Reino Unido","Japão","China","Canadá","Austrália","Suíça","Outro"];
const PIE_COLORS = ["#16a34a","#22c55e","#4ade80","#86efac","#f59e0b","#fb923c","#6366f1","#a855f7","#14b8a6","#ef4444"];

export default function InvestimentosPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [rates, setRates] = useState<Record<string, ExchangeRate>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [valor, setValor] = useState("");
  const [moeda, setMoeda] = useState("BRL");
  const [pais, setPais] = useState("Brasil");
  const [corretora, setCorretora] = useState("");
  const [notas, setNotas] = useState("");
  const [formError, setFormError] = useState("");

  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [invRes, ratesRes] = await Promise.all([
      supabase.from("user_investments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      fetch("/api/rates/fx").then(r => r.json()).catch(() => ({})),
    ]);
    setInvestments(invRes.data ?? []);
    setRates(ratesRes);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  function toBRL(val: number, m: string): number {
    if (m === "BRL") return val;
    const rate = rates[m]?.rate ?? 1;
    return val * rate;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!nome.trim()) { setFormError("Informe o nome."); return; }
    const v = parseFloat(valor);
    if (isNaN(v) || v <= 0) { setFormError("Valor inválido."); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const valorBrl = toBRL(v, moeda);
    await supabase.from("user_investments").insert({
      user_id: user!.id,
      nome: nome.trim().slice(0, 100), tipo,
      valor_original: v, moeda, valor_brl: valorBrl,
      pais, corretora: corretora.trim().slice(0, 100),
      notas: notas.trim().slice(0, 300),
      updated_at: new Date().toISOString(),
    });
    setNome(""); setValor(""); setMoeda("BRL"); setTipo(TIPOS[0]);
    setPais("Brasil"); setCorretora(""); setNotas("");
    setShowForm(false); setSaving(false); load();
  }

  async function remove(id: string) {
    if (!confirm("Remover investimento?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("user_investments").delete().eq("id", id).eq("user_id", user!.id);
    load();
  }

  // Totals
  const totalBRL = investments.reduce((s, inv) => s + toBRL(inv.valor_original, inv.moeda), 0);
  const noExterior = investments.filter(i => i.pais !== "Brasil");
  const totalExterior = noExterior.reduce((s, inv) => s + toBRL(inv.valor_original, inv.moeda), 0);

  // Pie data by tipo
  const pieData = Object.entries(
    investments.reduce((acc, inv) => {
      const v = toBRL(inv.valor_original, inv.moeda);
      acc[inv.tipo] = (acc[inv.tipo] ?? 0) + v;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const moedaInfo = moeda !== "BRL" ? rates[moeda] : null;
  const valorBRL = valor && moedaInfo ? (parseFloat(valor) * moedaInfo.rate).toFixed(2) : null;

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>
            📈 Investimentos
          </h1>
          <p className="text-sm text-[#6b9e80] mt-0.5">Patrimônio consolidado com cotações em tempo real</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost p-2.5"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/></button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus size={16}/> Adicionar</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Patrimônio Total", value: formatBRL(totalBRL), sub: `${investments.length} ativo(s)`, delay: 0 },
          { label: "Brasil", value: formatBRL(totalBRL - totalExterior), sub: `${investments.length - noExterior.length} ativo(s)`, delay: 60 },
          { label: "Exterior", value: formatBRL(totalExterior), sub: `${noExterior.length} ativo(s)`, delay: 120, icon: <Globe size={15}/> },
        ].map(({ label, value, sub, delay, icon }) => (
          <div key={label} className="card animate-fade-up opacity-0" style={{ animationDelay: `${delay}ms` }}>
            <div className="flex justify-between items-start mb-2">
              <p className="metric-label">{label}</p>
              {icon && <span className="text-[#8db89d]">{icon}</span>}
            </div>
            <p className="metric-val">{value}</p>
            <p className="metric-sub">{sub}</p>
          </div>
        ))}
      </div>

      {/* Exchange rates strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
        {Object.entries(rates).slice(0, 7).map(([code, r]) => (
          <div key={code} className="shrink-0 bg-white border border-[#e4f5e9] rounded-xl px-3 py-2 text-center min-w-[80px]">
            <p className="text-base mb-0.5">{r.emoji}</p>
            <p className="text-[10px] font-bold text-[#8db89d]">{code}</p>
            <p className="text-sm font-black text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>R$ {r.rate.toFixed(2)}</p>
            <p className={cn("text-[10px] font-bold", r.pct_change >= 0 ? "text-[#16a34a]" : "text-red-500")}>
              {r.pct_change >= 0 ? "▲" : "▼"} {Math.abs(r.pct_change).toFixed(2)}%
            </p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={save} className="card mb-6 border-[#bbf7d0] bg-[#f8fdf9] animate-fade-up opacity-0">
          <p className="font-bold text-[#0d2414] mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>➕ Novo investimento</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="label">Nome do ativo</label>
              <input value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: Apple AAPL, Tesouro IPCA+ 2035, KNRI11..."
                className="input" maxLength={100}/>
            </div>
            <div>
              <label className="label">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="input">
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">País</label>
              <select value={pais} onChange={e => setPais(e.target.value)} className="input">
                {PAISES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Moeda</label>
              <select value={moeda} onChange={e => setMoeda(e.target.value)} className="input">
                {MOEDAS.map(m => <option key={m}>{m} {rates[m]?.emoji ?? ""}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Valor investido</label>
              <input type="number" value={valor} onChange={e => setValor(e.target.value)}
                placeholder="0.00" min="0.01" step="0.01" className="input"/>
              {valorBRL && (
                <p className="text-xs text-[#16a34a] mt-1 font-bold">
                  💱 ≈ R$ {parseFloat(valorBRL).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div>
              <label className="label">Corretora / Banco</label>
              <input value={corretora} onChange={e => setCorretora(e.target.value)}
                placeholder="Ex: XP, Rico, Interactive Brokers..." className="input" maxLength={100}/>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notas (opcional)</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="Observações sobre este investimento..." rows={2}
                className="input resize-none" maxLength={300}/>
            </div>
          </div>
          {formError && <p className="text-xs text-red-500 mb-3">⚠ {formError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Salvando..." : "💾 Salvar"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary px-4">Cancelar</button>
          </div>
        </form>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="card h-20 shimmer"/>)}</div>
      ) : investments.length === 0 ? (
        <div className="card text-center py-12 bg-[#f8fdf9]">
          <TrendingUp size={40} className="text-[#bbf7d0] mx-auto mb-3"/>
          <p className="font-bold text-[#0d2414]">Nenhum investimento cadastrado</p>
          <p className="text-sm text-[#6b9e80] mt-1">Cadastre seus ativos para consolidar o patrimônio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* List */}
          <div className="lg:col-span-2 space-y-3">
            {investments.map((inv, i) => {
              const valAtual = toBRL(inv.valor_original, inv.moeda);
              const emoji = rates[inv.moeda]?.emoji ?? (inv.moeda === "BRL" ? "🇧🇷" : "🌐");
              return (
                <div key={inv.id} className="card card-hover animate-fade-up opacity-0"
                  style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7] flex items-center justify-center text-lg shrink-0">
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-[#0d2414] text-sm" style={{ fontFamily: "Nunito, sans-serif" }}>{inv.nome}</p>
                          <p className="text-xs text-[#8db89d]">{inv.tipo} · {inv.pais}</p>
                          {inv.corretora && <p className="text-xs text-[#8db89d]">{inv.corretora}</p>}
                        </div>
                        <button onClick={() => remove(inv.id)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-500 text-[#8db89d] rounded-lg transition-colors shrink-0">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div>
                          <p className="text-xs text-[#8db89d]">Investido</p>
                          <p className="font-black text-sm text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>
                            {inv.moeda !== "BRL" && `${inv.moeda} ${inv.valor_original.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#8db89d]">Valor em BRL</p>
                          <p className="font-black text-sm text-[#16a34a]" style={{ fontFamily: "Nunito, sans-serif" }}>
                            {formatBRL(valAtual)}
                          </p>
                        </div>
                        {inv.moeda !== "BRL" && rates[inv.moeda] && (
                          <div className="ml-auto">
                            <p className="text-[10px] text-[#8db89d]">Cotação</p>
                            <p className="text-xs font-bold text-[#0d2414]">
                              R$ {rates[inv.moeda].rate.toFixed(4)}
                              <span className={cn("ml-1", rates[inv.moeda].pct_change >= 0 ? "text-[#16a34a]" : "text-red-500")}>
                                {formatPct(rates[inv.moeda].pct_change)}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                      {inv.notas && <p className="text-xs text-[#6b9e80] mt-1.5 italic">{inv.notas}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pie chart */}
          {pieData.length > 1 && (
            <div className="card">
              <p className="text-sm font-bold text-[#0d2414] mb-3" style={{ fontFamily: "Nunito, sans-serif" }}>
                Distribuição por tipo
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(v)}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map(({ name, value }, i) => (
                  <div key={name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                    <span className="flex-1 text-[#4a7a5a] truncate">{name}</span>
                    <span className="font-bold text-[#0d2414]">{((value / totalBRL) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
