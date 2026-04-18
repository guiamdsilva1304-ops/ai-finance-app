"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { formatBRL, formatDate } from "@/lib/utils";
import { Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIAS, type Categoria, type Transaction } from "@/types";

const CAT_COLORS: Record<string, string> = {
  Moradia:"bg-blue-100 text-blue-700", Alimentação:"bg-orange-100 text-orange-700",
  Transporte:"bg-yellow-100 text-yellow-700", Saúde:"bg-red-100 text-red-700",
  Educação:"bg-purple-100 text-purple-700", Lazer:"bg-pink-100 text-pink-700",
  Vestuário:"bg-indigo-100 text-indigo-700", Outros:"bg-gray-100 text-gray-600",
};

export default function TransacoesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<"todos"|"gasto"|"receita">("todos");
  const [filterCat, setFilterCat] = useState<string>("todas");
  const [showForm, setShowForm] = useState(false);
  const [categorizando, setCategorizando] = useState(false);

  // Form state
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<"gasto"|"receita">("gasto");
  const [cat, setCat] = useState<Categoria>("Outros");
  const [dataT, setDataT] = useState(new Date().toISOString().split("T")[0]);
  const [formError, setFormError] = useState("");

  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("transactions").select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(500);
    setTransactions(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // Auto-categorize via FastAPI
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!desc.trim()) { setFormError("Informe a descrição."); return; }
    const v = parseFloat(valor);
    if (isNaN(v) || v <= 0) { setFormError("Valor inválido."); return; }
    if (v > 10_000_000) { setFormError("Valor muito alto."); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("transactions").insert({
      user_id: user!.id,
      descricao: desc.trim().slice(0, 200),
      valor: v, categoria: cat, tipo, date: dataT, source: "manual",
    });
    setDesc(""); setValor(""); setTipo("gasto"); setCat("Outros");
    setDataT(new Date().toISOString().split("T")[0]);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir transação?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("transactions").delete().eq("id", id).eq("user_id", user!.id);
    load();
  }

  // Filtered list
  const filtered = transactions.filter(t => {
    if (filterTipo !== "todos" && t.tipo !== filterTipo) return false;
    if (filterCat !== "todas" && t.categoria !== filterCat) return false;
    if (search && !t.descricao.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalGastos = filtered.filter(t => t.tipo === "gasto").reduce((s, t) => s + t.valor, 0);
  const totalReceitas = filtered.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>
            📝 Transações
          </h1>
          <p className="text-sm text-[#6b9e80] mt-0.5">Registre e acompanhe seus gastos e receitas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost p-2.5"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/></button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus size={16}/> Nova
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card animate-fade-up opacity-0 anim-1">
          <p className="metric-label mb-1">Gastos (filtrado)</p>
          <p className="metric-val text-red-500">{formatBRL(totalGastos)}</p>
        </div>
        <div className="card animate-fade-up opacity-0 anim-2">
          <p className="metric-label mb-1">Receitas (filtrado)</p>
          <p className="metric-val text-[#16a34a]">{formatBRL(totalReceitas)}</p>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={save} className="card mb-5 animate-fade-up opacity-0 border-[#bbf7d0] bg-[#f8fdf9]">
          <p className="font-bold text-[#0d2414] mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>
            ➕ Nova transação
          </p>
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
              <label className="label">Valor (R$)</label>
              <input type="number" value={valor} onChange={e => setValor(e.target.value)}
                placeholder="0,00" min="0.01" step="0.01" className="input"/>
            </div>
            <div>
              <label className="label">Data</label>
              <input type="date" value={dataT} onChange={e => setDataT(e.target.value)} className="input"/>
            </div>
            <div>
              <label className="label">Tipo</label>
              <div className="flex gap-2">
                {(["gasto","receita"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setTipo(t)}
                    className={cn("flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all",
                      tipo === t
                        ? t === "gasto"
                          ? "bg-red-50 border-red-300 text-red-700"
                          : "bg-[#f0fdf4] border-[#86efac] text-[#15803d]"
                        : "bg-white border-[#e4f5e9] text-[#8db89d] hover:bg-[#f8fdf9]"
                    )} style={{ fontFamily: "Nunito, sans-serif" }}>
                    {t === "gasto" ? "📤 Gasto" : "📥 Receita"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Categoria</label>
              <select value={cat} onChange={e => setCat(e.target.value as Categoria)}
                className="input">
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
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
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 bg-[#f8fdf9]">
          <p className="text-3xl mb-2">📋</p>
          <p className="font-bold text-[#0d2414]">Nenhuma transação encontrada</p>
          <p className="text-sm text-[#6b9e80] mt-1">Clique em "+ Nova" para registrar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t, i) => (
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
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn("badge text-[10px] px-1.5 py-0.5", CAT_COLORS[t.categoria] ?? "badge-green")}>
                    {t.categoria}
                  </span>
                  <span className="text-[11px] text-[#8db89d]">{formatDate(t.date)}</span>
                  {t.source === "pluggy" && (
                    <span className="badge bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5">🏦 Open Finance</span>
                  )}
                </div>
              </div>
              <p className={cn("font-black text-sm shrink-0", t.tipo === "gasto" ? "text-red-500" : "text-[#16a34a]")}
                style={{ fontFamily: "Nunito, sans-serif" }}>
                {t.tipo === "gasto" ? "-" : "+"}{formatBRL(t.valor)}
              </p>
              <button onClick={() => remove(t.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-[#8db89d] hover:text-red-500 transition-colors shrink-0">
                <Trash2 size={13}/>
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-center text-[#8db89d] mt-4">
        {filtered.length} transaç{filtered.length === 1 ? "ão" : "ões"} · máx. 500 por usuário
      </p>
    </div>
  );
}
