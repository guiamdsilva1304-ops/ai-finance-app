"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { createSupabaseBrowser } from "@/lib/supabase";
import { formatBRL, formatDate, metaEmoji } from "@/lib/utils";
import { Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, Search, Tag, Download, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIAS, type Categoria, type Transaction } from "@/types";
import Link from "next/link";
import ImportarExtrato from "@/components/ImportarExtrato";
import { StreakToast, MetaProgressToast } from "@/components/imoney/celebration";
import VoiceTransactionButton from "@/components/VoiceTransactionButton";

const CAT_COLORS: Record<string, string> = {
  Moradia:"bg-blue-100 text-blue-700", Alimentação:"bg-orange-100 text-orange-700",
  Transporte:"bg-yellow-100 text-yellow-700", Saúde:"bg-red-100 text-red-700",
  Educação:"bg-purple-100 text-purple-700", Lazer:"bg-pink-100 text-pink-700",
  Vestuário:"bg-indigo-100 text-indigo-700", Outros:"bg-gray-100 text-gray-600",
};

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function fmtMesAno(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(". de ", "/").replace(".", "");
}

function shiftMonth(ym: string, delta: number): string {
  const d = new Date(ym + "-15");
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 7);
}

type DisplayItem =
  | { kind: "single"; transaction: Transaction }
  | { kind: "group"; parcelamentoId: string; transactions: Transaction[] };

export default function TransacoesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMes, setFilterMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [filterTipo, setFilterTipo] = useState<"todos"|"gasto"|"receita">("todos");
  const [filterCat, setFilterCat] = useState<string>("todas");
  const [showForm, setShowForm] = useState(false);
  const [categorizando, setCategorizando] = useState(false);
  const [plan, setPlan] = useState<string>("free");
  const [exportando, setExportando] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [streakToast, setStreakToast] = useState<string | null>(null);
  const [metaToastValor, setMetaToastValor] = useState<number | null>(null);
  const [mainMeta, setMainMeta] = useState<{ id: string; nome: string; valor_alvo: number; valor_atual: number } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Form state
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<"gasto"|"receita">("gasto");
  const [cat, setCat] = useState<Categoria>("Outros");
  const [dataT, setDataT] = useState(new Date().toISOString().split("T")[0]);
  const [formError, setFormError] = useState("");
  const [isParcelado, setIsParcelado] = useState(false);
  const [numParcelas, setNumParcelas] = useState(2);

  const valorNum = parseFloat(valor) || 0;
  const valorParcela = isParcelado && numParcelas >= 2 ? valorNum / numParcelas : valorNum;

  const supabase = createSupabaseBrowser();
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data }, { data: perfil }, { data: metas }] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(500),
      supabase.from("user_profiles").select("plan").eq("user_id", user.id).single(),
      supabase.from("metas").select("id,nome,valor_alvo,valor_atual,principal").eq("user_id", user.id).eq("concluida", false).order("created_at", { ascending: false }),
    ]);
    setTransactions(data ?? []);
    if (perfil?.plan) setPlan(perfil.plan);
    const principal = (metas ?? []).find(m => m.principal) ?? (metas ?? [])[0] ?? null;
    setMainMeta(principal);
    setLoading(false);
  }, [supabase]);

  async function exportarCSV() {
    if (plan !== "premium") { setShowPremiumModal(true); return; }
    setExportando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/export/transactions", {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date();
      a.download = `imoney-transacoes-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Algo deu errado ao exportar — tente em instantes.");
    } finally {
      setExportando(false);
    }
  }

  useEffect(() => { load(); }, [load]);

  async function autoCategorizar() {
    if (!desc || !valor) return;
    setCategorizando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: mem } = await supabase.from("user_memory").select("last_renda").eq("user_id", user!.id).single();
      const res = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000"}/api/categorizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao: desc, valor: parseFloat(valor), renda: mem?.last_renda ?? 3000 }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.categoria && CATEGORIAS.includes(d.categoria)) setCat(d.categoria);
      }
    } catch { /* ignore */ }
    setCategorizando(false);
  }

  function resetForm() {
    setDesc(""); setValor(""); setTipo("gasto"); setCat("Outros");
    setDataT(new Date().toISOString().split("T")[0]);
    setIsParcelado(false); setNumParcelas(2); setFormError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!desc.trim()) { setFormError("Informe a descrição."); return; }
    const v = parseFloat(valor);
    if (isNaN(v) || v <= 0) { setFormError("Valor inválido."); return; }
    if (v > 10_000_000) { setFormError("Valor muito alto."); return; }
    if (isParcelado && tipo !== "gasto") { setFormError("Parcelamento é só para gastos."); return; }
    if (isParcelado && (numParcelas < 2 || numParcelas > 60)) { setFormError("Parcelas: entre 2 e 60."); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (isParcelado) {
      const parcela = parseFloat((v / numParcelas).toFixed(2));
      const { data: grupo } = await supabase.from("parcelamentos").insert({
        user_id: user.id,
        descricao: desc.trim().slice(0, 200),
        valor_total: v,
        valor_parcela: parcela,
        num_parcelas: numParcelas,
        categoria: cat,
        data_inicio: dataT,
      }).select("id").single();

      if (grupo) {
        const rows = Array.from({ length: numParcelas }, (_, i) => ({
          user_id: user.id,
          descricao: desc.trim().slice(0, 200),
          valor: parcela,
          categoria: cat,
          tipo: "gasto" as const,
          date: addMonths(dataT, i),
          source: "parcelamento" as const,
          parcelamento_id: grupo.id,
          parcela_numero: i + 1,
          parcela_total: numParcelas,
        }));
        await supabase.from("transactions").insert(rows);
      }
    } else {
      await supabase.from("transactions").insert({
        user_id: user.id,
        descricao: desc.trim().slice(0, 200),
        valor: v, categoria: cat, tipo, date: dataT, source: "manual",
      });
    }

    const waReceita = tipo === "receita";
    resetForm();
    setShowForm(false);
    setSaving(false);
    if (waReceita) {
      // Micro-celebração: progresso da meta no card, não toast genérico
      if (mainMeta && mainMeta.valor_alvo > 0) setMetaToastValor(v);
      else setStreakToast(`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} registrados! Continue assim 💪`);
    }
    load();
  }

  async function removeSingle(t: Transaction) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("transactions").delete().eq("id", t.id).eq("user_id", user!.id);
    load();
  }

  async function removeGroup(parcelamentoId: string, fromDate?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    let q = supabase.from("transactions").delete()
      .eq("parcelamento_id", parcelamentoId)
      .eq("user_id", user!.id);
    if (fromDate) q = q.gte("date", fromDate);
    await q;
    load();
  }

  async function handleRemoveTransaction(t: Transaction) {
    if (!t.parcelamento_id) {
      if (!confirm("Excluir transação?")) return;
      await removeSingle(t);
    } else {
      const ok = confirm(
        `"${t.descricao}" (${t.parcela_numero}/${t.parcela_total})\n\nOK → excluir apenas esta parcela\nCancelar → excluir esta e todas as futuras`
      );
      if (ok) {
        await removeSingle(t);
      } else {
        await removeGroup(t.parcelamento_id, t.date);
      }
    }
  }

  async function handleRemoveAllGroup(parcelamentoId: string, descricao: string, total: number) {
    if (!confirm(`Excluir todas as ${total} parcelas de "${descricao}"?`)) return;
    await removeGroup(parcelamentoId);
  }

  const filtered = transactions.filter(t => {
    if (!t.date.startsWith(filterMes)) return false;
    if (filterTipo !== "todos" && t.tipo !== filterTipo) return false;
    if (filterCat !== "todas" && t.categoria !== filterCat) return false;
    if (search && !t.descricao.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Build display list: group parcelamento transactions into one item
  // Use ALL transactions for the parcelamento map so the group card shows the full installment plan
  const displayList: DisplayItem[] = (() => {
    const parcelamentoMap = new Map<string, Transaction[]>();
    for (const t of transactions) {
      if (t.parcelamento_id) {
        const arr = parcelamentoMap.get(t.parcelamento_id) ?? [];
        arr.push(t);
        parcelamentoMap.set(t.parcelamento_id, arr);
      }
    }
    const seen = new Set<string>();
    const result: DisplayItem[] = [];
    for (const t of filtered) {
      if (!t.parcelamento_id) {
        result.push({ kind: "single", transaction: t });
      } else if (!seen.has(t.parcelamento_id)) {
        seen.add(t.parcelamento_id);
        const txs = (parcelamentoMap.get(t.parcelamento_id) ?? [])
          .slice()
          .sort((a, b) => a.date.localeCompare(b.date));
        result.push({ kind: "group", parcelamentoId: t.parcelamento_id, transactions: txs });
      }
    }
    return result;
  })();

  const totalGastos = filtered.filter(t => t.tipo === "gasto").reduce((s, t) => s + t.valor, 0);
  const totalReceitas = filtered.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);

  function toggleGroup(id: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const modalImportar = (
    <div
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={() => setShowImportModal(false)}
    >
      <div
        style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>
            📂 Importar Extrato
          </h2>
          <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <ImportarExtrato onSucesso={() => { setShowImportModal(false); load(); }} />
      </div>
    </div>
  );

  const modalPremium = (
    <div
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={() => setShowPremiumModal(false)}
    >
      <div
        style={{ background: "#fff", borderRadius: 20, padding: "32px 28px", maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 8, fontFamily: "Nunito, sans-serif" }}>
          Exportação CSV é Premium
        </div>
        <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 24 }}>
          Com o plano Premium você exporta todas as suas transações em CSV para usar em planilhas, contadores ou onde precisar.
        </p>
        <Link href="/dashboard/premium"
          style={{ display: "block", background: "linear-gradient(135deg, #78350f 0%, #F59E0B 100%)", color: "#fff", padding: "14px 0", borderRadius: 12, textDecoration: "none", fontWeight: 800, fontSize: 15, marginBottom: 12, fontFamily: "Nunito, sans-serif" }}>
          Ver plano Premium — R$39,90/mês
        </Link>
        <button onClick={() => setShowPremiumModal(false)}
          style={{ background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer" }}>
          Agora não
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      {streakToast && (
        <StreakToast
          mensagem={streakToast}
          emoji="💰"
          onClose={() => setStreakToast(null)}
        />
      )}
      {metaToastValor !== null && mainMeta && (
        <MetaProgressToast
          metaId={mainMeta.id}
          metaNome={mainMeta.nome}
          emoji={metaEmoji(mainMeta.nome)}
          valorAtual={mainMeta.valor_atual}
          valorAlvo={mainMeta.valor_alvo}
          valorEntrada={metaToastValor}
          onClose={() => setMetaToastValor(null)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>
            📝 Transações
          </h1>
          <p className="text-sm text-[#6b9e80] mt-0.5">Registre e acompanhe seus gastos e receitas</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={load} className="btn-ghost p-2"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/></button>
          <button onClick={exportarCSV} disabled={exportando} className="btn-ghost p-2" title="Exportar CSV (Premium)">
            <Download size={16} className={exportando ? "animate-pulse" : ""}/>
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn-ghost p-2" title="Importar extrato">
            📂
          </button>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary">
            <Plus size={16}/> Nova
          </button>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={() => setFilterMes(m => shiftMonth(m, -1))}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#1D9E75] hover:bg-[#f0fdf4] transition-colors font-bold text-lg"
        >‹</button>
        <span className="font-black text-[#0d2414] text-base capitalize min-w-36 text-center" style={{ fontFamily: "Nunito, sans-serif" }}>
          {new Date(filterMes + "-15").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={() => setFilterMes(m => shiftMonth(m, 1))}
          disabled={filterMes >= new Date().toISOString().slice(0, 7)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#1D9E75] hover:bg-[#f0fdf4] transition-colors font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed"
        >›</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card animate-fade-up opacity-0 anim-1">
          <p className="metric-label mb-1">Gastos do mês</p>
          <p className="metric-val text-red-500">{formatBRL(totalGastos)}</p>
        </div>
        <div className="card animate-fade-up opacity-0 anim-2">
          <p className="metric-label mb-1">Receitas do mês</p>
          <p className="metric-val text-[#16a34a]">{formatBRL(totalReceitas)}</p>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={save} className="card mb-5 animate-fade-up opacity-0 border-[#bbf7d0] bg-[#f8fdf9]">
          <p className="font-bold text-[#0d2414] mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>➕ Nova transação</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="label">Descrição</label>
              <div className="flex gap-2">
                <input value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="Ex: Mercado, salário, Netflix..."
                  className="input flex-1" maxLength={200}/>
                <button type="button" onClick={autoCategorizar} disabled={!desc || !valor || categorizando}
                  className="btn-secondary px-3 text-xs shrink-0" title="Auto-categorizar com IA">
                  {categorizando ? <RefreshCw size={14} className="animate-spin"/> : <Tag size={14}/>}
                </button>
              </div>
            </div>
            <div>
              <label className="label">{isParcelado ? "Valor total (R$)" : "Valor (R$)"}</label>
              <input type="number" value={valor} onChange={e => setValor(e.target.value)}
                placeholder="0,00" min="0.01" step="0.01" className="input"/>
            </div>
            <div>
              <label className="label">{isParcelado ? "Data da 1ª parcela" : "Data"}</label>
              <input type="date" value={dataT} onChange={e => setDataT(e.target.value)} className="input"/>
            </div>
            <div>
              <label className="label">Tipo</label>
              <div className="flex gap-2">
                {(["gasto","receita"] as const).map(t => (
                  <button key={t} type="button" onClick={() => { setTipo(t); if (t === "receita") setIsParcelado(false); }}
                    className={cn("flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all",
                      tipo === t
                        ? t === "gasto" ? "bg-red-50 border-red-300 text-red-700" : "bg-[#f0fdf4] border-[#86efac] text-[#15803d]"
                        : "bg-white border-[#e4f5e9] text-[#8db89d] hover:bg-[#f8fdf9]"
                    )} style={{ fontFamily: "Nunito, sans-serif" }}>
                    {t === "gasto" ? "📤 Gasto" : "📥 Receita"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Categoria</label>
              <select value={cat} onChange={e => setCat(e.target.value as Categoria)} className="input">
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {tipo === "gasto" && (
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setIsParcelado(p => !p)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border transition-all w-full",
                    isParcelado
                      ? "bg-orange-50 border-orange-300 text-orange-700"
                      : "bg-white border-[#e4f5e9] text-[#8db89d] hover:bg-[#f8fdf9]"
                  )}
                >
                  <span style={{ fontSize: 16 }}>💳</span>
                  {isParcelado ? "Parcelado ✓" : "É parcelado?"}
                </button>
              </div>
            )}

            {isParcelado && (
              <>
                <div>
                  <label className="label">Número de parcelas</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={numParcelas}
                      onChange={e => setNumParcelas(Math.min(60, Math.max(2, parseInt(e.target.value) || 2)))}
                      min={2} max={60}
                      className="input w-24 text-center font-bold"
                    />
                    <span className="text-sm text-[#6b9e80]">vezes</span>
                  </div>
                </div>
                <div>
                  <label className="label">Valor de cada parcela</label>
                  <div
                    className="input flex items-center"
                    style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", color: "#15803d", fontWeight: 800 }}
                  >
                    {valorNum > 0 && numParcelas >= 2
                      ? `${numParcelas}x de ${formatBRL(valorParcela)}`
                      : "—"}
                  </div>
                </div>
              </>
            )}
          </div>

          {formError && <p className="text-xs text-red-500 mb-3">⚠ {formError}</p>}

          {isParcelado && valorNum > 0 && (
            <div className="mb-3 p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-800">
              <p className="font-bold mb-1">📅 Serão criadas {numParcelas} transações mensais</p>
              <p>1ª parcela em {formatDate(dataT)} · última em {formatDate(addMonths(dataT, numParcelas - 1))}</p>
              <p className="mt-1 font-semibold">Total: {formatBRL(valorNum)} · {numParcelas}x {formatBRL(valorParcela)}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Salvando..." : isParcelado ? `💾 Criar ${numParcelas} parcelas` : "💾 Salvar"}
            </button>
            <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="btn-secondary px-4">Cancelar</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8db89d]"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..." className="input pl-9 py-2 text-xs h-9"/>
        </div>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value as typeof filterTipo)}
          className="input py-2 text-xs h-9 w-auto">
          <option value="todos">Todos</option>
          <option value="gasto">Gastos</option>
          <option value="receita">Receitas</option>
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="input py-2 text-xs h-9 w-auto">
          <option value="todas">Todas categorias</option>
          {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3].map(i => <div key={i} className="card h-16 shimmer"/>)}
        </div>
      ) : displayList.length === 0 ? (
        transactions.length === 0 ? (
          <div className="card text-center py-12 bg-[#f8fdf9]">
            <p className="text-3xl mb-2">🌱</p>
            <p className="font-bold text-[#0d2414]">Seu histórico começa aqui</p>
            <p className="text-sm text-[#6b9e80] mt-1 mb-4">Cada registro te aproxima do seu sonho.</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary mx-auto">
              <Plus size={16}/> Registrar primeira transação
            </button>
          </div>
        ) : (
          <div className="card text-center py-12 bg-[#f8fdf9]">
            <p className="text-3xl mb-2">🔍</p>
            <p className="font-bold text-[#0d2414]">Nada por aqui nesse período</p>
            <p className="text-sm text-[#6b9e80] mt-1">Ajuste os filtros ou o mês para ver seus registros.</p>
          </div>
        )
      ) : (
        <div className="space-y-2">
          {displayList.map((item, i) => {
            if (item.kind === "single") {
              const t = item.transaction;
              return (
                <div key={t.id}
                  className="card card-hover py-3 px-4 flex items-center gap-3 animate-fade-up opacity-0"
                  style={{ animationDelay: `${i * 30}ms` }}>
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                    t.tipo === "gasto" ? "bg-red-50" : "bg-[#f0fdf4]")}>
                    {t.tipo === "gasto"
                      ? <TrendingDown size={15} className="text-red-500"/>
                      : <TrendingUp size={15} className="text-[#16a34a]"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#0d2414] truncate">{t.descricao}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={cn("badge text-[10px] px-1.5 py-0.5", CAT_COLORS[t.categoria] ?? "badge-green")}>
                        {t.categoria}
                      </span>
                      <span className="text-[11px] text-[#8db89d]">{formatDate(t.date)}</span>
                      {t.importado_via && t.importado_via !== "manual" && (
                        <span className="badge bg-purple-50 text-purple-600 text-[10px] px-1.5 py-0.5">📂 Importado</span>
                      )}
                    </div>
                  </div>
                  <p className={cn("font-black text-sm shrink-0", t.tipo === "gasto" ? "text-red-500" : "text-[#16a34a]")}
                    style={{ fontFamily: "Nunito, sans-serif" }}>
                    {t.tipo === "gasto" ? "-" : "+"}{formatBRL(t.valor)}
                  </p>
                  <button onClick={() => handleRemoveTransaction(t)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-[#8db89d] hover:text-red-500 transition-colors shrink-0">
                    <Trash2 size={13}/>
                  </button>
                </div>
              );
            }

            // Grouped parcelamento item
            const { parcelamentoId, transactions: txs } = item;
            const expanded = expandedGroups.has(parcelamentoId);
            const pagas = txs.filter(t => t.date <= today).length;
            const pendentes = txs.filter(t => t.date > today).length;
            const proxima = txs.find(t => t.date > today);
            const primeira = txs[0];
            const ultima = txs[txs.length - 1];
            const total = txs.length;
            const valorParc = primeira?.valor ?? 0;

            return (
              <div key={parcelamentoId} className="animate-fade-up opacity-0" style={{ animationDelay: `${i * 30}ms` }}>
                {/* Card principal do parcelamento */}
                <div
                  className="card py-3 px-4 cursor-pointer select-none"
                  style={{ borderLeft: "3px solid #fb923c" }}
                  onClick={() => toggleGroup(parcelamentoId)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-orange-50">
                      <span style={{ fontSize: 15 }}>💳</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-[#0d2414] truncate">{primeira?.descricao}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 shrink-0">
                          {total}×
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={cn("badge text-[10px] px-1.5 py-0.5", CAT_COLORS[primeira?.categoria] ?? "badge-green")}>
                          {primeira?.categoria}
                        </span>
                        <span className="text-[11px] text-[#8db89d]">
                          {fmtMesAno(primeira?.date)} → {fmtMesAno(ultima?.date)}
                        </span>
                        {pagas > 0 && (
                          <span className="text-[10px] text-[#16a34a] font-semibold">{pagas} paga{pagas > 1 ? "s" : ""}</span>
                        )}
                        {pendentes > 0 && (
                          <span className="badge bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5">
                            📅 {pendentes} pendente{pendentes > 1 ? "s" : ""}
                            {proxima && ` · próx. ${fmtMesAno(proxima.date)}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="font-black text-sm text-red-500" style={{ fontFamily: "Nunito, sans-serif" }}>
                        -{formatBRL(valorParc)}<span className="text-[10px] font-normal text-[#8db89d]">/mês</span>
                      </p>
                      <button
                        onClick={e => { e.stopPropagation(); handleRemoveAllGroup(parcelamentoId, primeira?.descricao ?? "", total); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[#8db89d] hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13}/>
                      </button>
                      <div className="text-[#8db89d]">
                        {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parcelas expandidas */}
                {expanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-orange-200 pl-3">
                    {txs.map(t => {
                      const isFutura = t.date > today;
                      return (
                        <div key={t.id} className="card py-2 px-3 flex items-center gap-2"
                          style={{ background: isFutura ? "var(--bg-hover)" : undefined }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-[#8db89d]">{t.parcela_numero}/{t.parcela_total}</span>
                              <span className="text-[11px] text-[#0d2414]">{formatDate(t.date)}</span>
                              {isFutura
                                ? <span className="badge bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5">📅 Agendado</span>
                                : <span className="badge bg-green-50 text-green-700 text-[10px] px-1.5 py-0.5">✓ Paga</span>
                              }
                            </div>
                          </div>
                          <p className="font-bold text-sm text-red-500 shrink-0" style={{ fontFamily: "Nunito, sans-serif" }}>
                            -{formatBRL(t.valor)}
                          </p>
                          <button onClick={() => handleRemoveTransaction(t)}
                            className="p-1 rounded-lg hover:bg-red-50 text-[#8db89d] hover:text-red-500 transition-colors shrink-0">
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-center text-[#8db89d] mt-4">
        {filtered.length} transaç{filtered.length === 1 ? "ão" : "ões"} · máx. 500 por usuário
      </p>

      <VoiceTransactionButton onSuccess={load} isPro={plan === 'pro' || plan === 'premium'} />

      {mounted && showImportModal && createPortal(modalImportar, document.body)}
      {mounted && showPremiumModal && createPortal(modalPremium, document.body)}
    </div>
  );
}
