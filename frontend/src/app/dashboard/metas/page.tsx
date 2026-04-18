"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { formatBRL } from "@/lib/utils";
import { Plus, Trash2, CheckCircle2, Target, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Meta } from "@/types";

export default function MetasPage() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sobra, setSobra] = useState(0);

  // Form
  const [nome, setNome] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [valorAtual, setValorAtual] = useState("");
  const [prazo, setPrazo] = useState("12");
  const [formError, setFormError] = useState("");

  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [metasRes, memRes] = await Promise.all([
      supabase.from("metas").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("user_memory").select("last_renda,last_gastos").eq("user_id", user.id).single(),
    ]);
    setMetas(metasRes.data ?? []);
    if (memRes.data) setSobra((memRes.data.last_renda ?? 0) - (memRes.data.last_gastos ?? 0));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!nome.trim()) { setFormError("Informe o nome da meta."); return; }
    const alvo = parseFloat(valorAlvo);
    if (isNaN(alvo) || alvo <= 0) { setFormError("Valor alvo inválido."); return; }
    const atual = parseFloat(valorAtual || "0");
    const meses = parseInt(prazo);
    if (meses < 1 || meses > 600) { setFormError("Prazo deve ser entre 1 e 600 meses."); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").insert({
      user_id: user!.id, nome: nome.trim().slice(0, 100),
      valor_alvo: alvo, valor_atual: atual,
      prazo_meses: meses, criada_em: new Date().toISOString().split("T")[0],
      concluida: false,
    });
    setNome(""); setValorAlvo(""); setValorAtual(""); setPrazo("12");
    setShowForm(false); setSaving(false); load();
  }

  async function toggleConcluida(meta: Meta) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").update({ concluida: !meta.concluida })
      .eq("id", meta.id).eq("user_id", user!.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir meta?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").delete().eq("id", id).eq("user_id", user!.id);
    load();
  }

  async function updateValorAtual(meta: Meta, novoValor: number) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").update({ valor_atual: novoValor })
      .eq("id", meta.id).eq("user_id", user!.id);
    load();
  }

  const ativas = metas.filter(m => !m.concluida);
  const concluidas = metas.filter(m => m.concluida);

  function aporte(meta: Meta) {
    const falta = meta.valor_alvo - meta.valor_atual;
    return falta > 0 ? falta / meta.prazo_meses : 0;
  }

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>
            🎯 Metas Financeiras
          </h1>
          <p className="text-sm text-[#6b9e80] mt-0.5">
            Sobra mensal disponível: <strong className="text-[#16a34a]">{formatBRL(sobra)}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost p-2.5"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/></button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus size={16}/> Nova meta</button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={save} className="card mb-6 border-[#bbf7d0] bg-[#f8fdf9] animate-fade-up opacity-0">
          <p className="font-bold text-[#0d2414] mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>➕ Nova meta</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="label">Nome da meta</label>
              <input value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: Reserva de emergência, Viagem, iPhone..." className="input" maxLength={100}/>
            </div>
            <div>
              <label className="label">Valor alvo (R$)</label>
              <input type="number" value={valorAlvo} onChange={e => setValorAlvo(e.target.value)}
                placeholder="10000" min="1" step="0.01" className="input"/>
            </div>
            <div>
              <label className="label">Já tenho (R$)</label>
              <input type="number" value={valorAtual} onChange={e => setValorAtual(e.target.value)}
                placeholder="0" min="0" step="0.01" className="input"/>
            </div>
            <div>
              <label className="label">Prazo (meses)</label>
              <input type="number" value={prazo} onChange={e => setPrazo(e.target.value)}
                min="1" max="600" className="input"/>
            </div>
            {valorAlvo && prazo && (
              <div className="flex items-center bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-[#6b9e80] font-bold uppercase tracking-wider">Aporte mensal estimado</p>
                  <p className="text-lg font-black text-[#15803d]" style={{ fontFamily: "Nunito, sans-serif" }}>
                    {formatBRL((parseFloat(valorAlvo) - parseFloat(valorAtual || "0")) / parseInt(prazo || "1"))}
                  </p>
                </div>
              </div>
            )}
          </div>
          {formError && <p className="text-xs text-red-500 mb-3">⚠ {formError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Salvando..." : "💾 Criar meta"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary px-4">Cancelar</button>
          </div>
        </form>
      )}

      {/* Metas ativas */}
      {loading ? (
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="card h-28 shimmer"/>)}</div>
      ) : ativas.length === 0 ? (
        <div className="card text-center py-12 bg-[#f8fdf9]">
          <Target size={40} className="text-[#bbf7d0] mx-auto mb-3"/>
          <p className="font-bold text-[#0d2414]">Nenhuma meta ativa</p>
          <p className="text-sm text-[#6b9e80] mt-1">Crie sua primeira meta financeira acima.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ativas.map((meta, i) => {
            const pct = Math.min(100, (meta.valor_atual / meta.valor_alvo) * 100);
            const falta = meta.valor_alvo - meta.valor_atual;
            const ap = aporte(meta);
            const pctSobra = sobra > 0 ? (ap / sobra) * 100 : 0;
            return (
              <div key={meta.id} className="card card-hover animate-fade-up opacity-0" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>{meta.nome}</p>
                    <p className="text-xs text-[#8db89d] mt-0.5">{meta.prazo_meses} meses restantes</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => toggleConcluida(meta)}
                      className="p-2 rounded-lg hover:bg-[#f0fdf4] text-[#8db89d] hover:text-[#16a34a] transition-colors" title="Marcar como concluída">
                      <CheckCircle2 size={15}/>
                    </button>
                    <button onClick={() => remove(meta.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-[#8db89d] hover:text-red-500 transition-colors">
                      <Trash2 size={15}/>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold text-[#16a34a]">{formatBRL(meta.valor_atual)}</span>
                    <span className="text-[#8db89d]">{pct.toFixed(0)}% de {formatBRL(meta.valor_alvo)}</span>
                  </div>
                  <div className="h-2.5 bg-[#f0fdf4] rounded-full overflow-hidden border border-[#e4f5e9]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#16a34a] to-[#4ade80] transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Quick update */}
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#6b9e80]">
                      Falta <strong className="text-[#0d2414]">{formatBRL(falta)}</strong>
                      {" · "}Aporte ideal: <strong className={cn(pctSobra > 80 ? "text-red-500" : "text-[#16a34a]")}>{formatBRL(ap)}/mês</strong>
                      {pctSobra > 0 && ` (${pctSobra.toFixed(0)}% da sobra)`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {[50, 100, 500].map(v => (
                      <button key={v} onClick={() => updateValorAtual(meta, Math.min(meta.valor_alvo, meta.valor_atual + v))}
                        className="text-xs bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] font-bold px-2.5 py-1.5 rounded-lg hover:bg-[#dcfce7] transition-colors">
                        +{formatBRL(v, true)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Concluídas */}
      {concluidas.length > 0 && (
        <div className="mt-8">
          <p className="text-sm font-bold text-[#8db89d] uppercase tracking-wider mb-3">✅ Concluídas ({concluidas.length})</p>
          <div className="space-y-2">
            {concluidas.map(meta => (
              <div key={meta.id} className="card py-3 px-4 flex items-center gap-3 opacity-60">
                <CheckCircle2 size={18} className="text-[#16a34a] shrink-0"/>
                <p className="flex-1 font-bold text-[#0d2414] text-sm line-through">{meta.nome}</p>
                <p className="font-black text-sm text-[#16a34a]">{formatBRL(meta.valor_alvo)}</p>
                <button onClick={() => remove(meta.id)}
                  className="p-1.5 hover:bg-red-50 hover:text-red-500 text-[#8db89d] rounded-lg transition-colors">
                  <Trash2 size={13}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
