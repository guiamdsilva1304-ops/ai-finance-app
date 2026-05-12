"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { RefreshCw, Trash2, CheckCircle2, Star } from "lucide-react";
import { GoalCard } from "@/components/imoney/primitives";
import { C, FONT } from "@/components/imoney/tokens";
import type { Meta } from "@/types";

type MetaExt = Meta & { principal?: boolean };

function metaEmoji(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes('reserva') || n.includes('emergên') || n.includes('emergenc')) return '🏦';
  if (n.includes('viagem') || n.includes('férias') || n.includes('ferias') || n.includes('europa') || n.includes('eua')) return '✈️';
  if (n.includes('carro') || n.includes('auto') || n.includes('moto') || n.includes('trocar')) return '🚗';
  if (n.includes('casa') || n.includes('apto') || n.includes('imóv') || n.includes('entrada')) return '🏡';
  if (n.includes('casamento') || n.includes('noivado') || n.includes('anel')) return '💍';
  if (n.includes('estud') || n.includes('curso') || n.includes('faculd') || n.includes('mba')) return '📚';
  if (n.includes('invest') || n.includes('bolsa') || n.includes('ação')) return '📈';
  if (n.includes('celular') || n.includes('iphone') || n.includes('notebook')) return '📱';
  if (n.includes('div') || n.includes('empréstimo') || n.includes('emprestimo')) return '💳';
  return '🎯';
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('pt-BR');
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
}

function statusLeft(meta: MetaExt): string {
  if (meta.concluida) return 'CONQUISTADO!';
  const pct = meta.valor_alvo > 0 ? Math.round((meta.valor_atual / meta.valor_alvo) * 100) : 0;
  if (pct < 5) return `${pct}% · começando`;
  const m = meta.prazo_meses;
  if (m >= 24) return `${pct}% · ${Math.round(m / 12)} anos restantes`;
  if (m === 1) return `${pct}% · último mês`;
  return `${pct}% · faltam ${m} meses`;
}

function statusRight(meta: MetaExt, aporte: number): string {
  if (meta.concluida) return fmtDate(meta.criada_em ?? new Date().toISOString());
  return `R$ ${fmtInt(aporte)}/mês`;
}

export default function MetasPage() {
  const [metas, setMetas] = useState<MetaExt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sobra, setSobra] = useState(0);

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
    const alvo = parseFloat(valorAlvo.replace(',', '.'));
    if (isNaN(alvo) || alvo <= 0) { setFormError("Valor alvo inválido."); return; }
    const atual = parseFloat((valorAtual || "0").replace(',', '.'));
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

  async function toggleConcluida(meta: MetaExt) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").update({ concluida: !meta.concluida })
      .eq("id", meta.id).eq("user_id", user!.id);
    load();
  }

  async function togglePrincipal(meta: MetaExt) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").update({ principal: false }).eq("user_id", user!.id);
    if (!meta.principal) {
      await supabase.from("metas").update({ principal: true }).eq("id", meta.id).eq("user_id", user!.id);
    }
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir meta?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").delete().eq("id", id).eq("user_id", user!.id);
    load();
  }

  async function updateValorAtual(meta: MetaExt, novoValor: number) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").update({ valor_atual: novoValor })
      .eq("id", meta.id).eq("user_id", user!.id);
    load();
  }

  function calcAporte(meta: MetaExt): number {
    const falta = meta.valor_alvo - meta.valor_atual;
    return falta > 0 ? falta / meta.prazo_meses : 0;
  }

  function tone(meta: MetaExt): 'white' | 'dark' | 'gold' {
    if (meta.concluida) return 'gold';
    if (meta.principal) return 'dark';
    return 'white';
  }

  // Principal first, then ativas, then concluidas
  const sorted = [
    ...metas.filter(m => !m.concluida && m.principal),
    ...metas.filter(m => !m.concluida && !m.principal),
    ...metas.filter(m => m.concluida),
  ];

  const aporteEstimado = valorAlvo && prazo
    ? (parseFloat(valorAlvo.replace(',', '.') || '0') - parseFloat(valorAtual.replace(',', '.') || '0')) / parseInt(prazo || '1')
    : null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px 80px', fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: C.green900, margin: 0 }}>🎯 Metas Financeiras</h1>
          <p style={{ fontSize: 13, color: C.ink3, marginTop: 4, marginBottom: 0 }}>
            Sobra mensal disponível: <strong style={{ color: C.green500 }}>R$ {fmtInt(sobra)}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ background: 'none', border: `1.5px solid ${C.divider}`, borderRadius: 12, padding: '8px 10px', cursor: 'pointer', color: C.ink3 }}>
            <RefreshCw size={16} style={loading ? { animation: 'spin 1s linear infinite' } : {}}/>
          </button>
          <button onClick={() => setShowForm(!showForm)} style={{ background: C.green500, color: C.green900, border: 'none', borderRadius: 12, padding: '8px 18px', fontWeight: 800, fontSize: 14, fontFamily: FONT, cursor: 'pointer' }}>
            + Nova meta
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={save} style={{ background: C.green50, borderRadius: 20, padding: 24, marginBottom: 28, border: `1.5px solid ${C.green100}` }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: C.green900, marginBottom: 20, marginTop: 0 }}>➕ Nova meta</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="label">Nome da meta</label>
              <input value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: Reserva de emergência, Viagem Europa..." className="input" maxLength={100}/>
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
            {aporteEstimado !== null && !isNaN(aporteEstimado) && aporteEstimado > 0 && (
              <div style={{ background: '#fff', border: `1.5px solid ${C.green100}`, borderRadius: 12, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Aporte mensal</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: C.green500, margin: 0 }}>R$ {fmtInt(aporteEstimado)}</p>
              </div>
            )}
          </div>
          {formError && <p className="text-xs text-red-500 mb-3">⚠ {formError}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, background: C.green900, color: '#fff', border: 'none', borderRadius: 14, padding: '13px 0', fontWeight: 800, fontSize: 15, fontFamily: FONT, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? "Salvando..." : "💾 Criar meta"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: '#fff', color: C.ink2, border: `1.5px solid ${C.divider}`, borderRadius: 14, padding: '13px 20px', fontWeight: 700, fontSize: 14, fontFamily: FONT, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Grid de metas */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ height: 160, borderRadius: 20, background: C.green50, animation: 'pulse 1.5s infinite' }}/>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ background: C.green50, borderRadius: 20, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <p style={{ fontWeight: 800, color: C.green900, margin: '0 0 6px' }}>Nenhuma meta ainda</p>
          <p style={{ fontSize: 13, color: C.ink3, margin: 0 }}>Crie sua primeira meta financeira acima.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {sorted.map(meta => {
            const ap = calcAporte(meta);
            const pct = meta.valor_alvo > 0 ? Math.min(100, Math.round((meta.valor_atual / meta.valor_alvo) * 100)) : 0;
            return (
              <div key={meta.id}>
                <GoalCard
                  title={meta.concluida ? `🎉 ${meta.nome}` : meta.nome}
                  emoji={meta.concluida ? '✨' : metaEmoji(meta.nome)}
                  current={fmtInt(meta.valor_atual)}
                  target={meta.concluida ? undefined : fmtInt(meta.valor_alvo)}
                  pct={pct}
                  statusLeft={statusLeft(meta)}
                  statusRight={statusRight(meta, ap)}
                  tone={tone(meta)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px 0' }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {!meta.concluida && (
                      <button onClick={() => togglePrincipal(meta)} title={meta.principal ? "Remover principal" : "Marcar como principal"}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: meta.principal ? '#f59e0b' : C.ink3 }}>
                        <Star size={14} fill={meta.principal ? "currentColor" : "none"}/>
                      </button>
                    )}
                    <button onClick={() => toggleConcluida(meta)} title={meta.concluida ? "Reabrir" : "Concluir"}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: meta.concluida ? C.green500 : C.ink3 }}>
                      <CheckCircle2 size={14}/>
                    </button>
                    <button onClick={() => remove(meta.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: C.ink3 }}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                  {!meta.concluida && (
                    <div style={{ display: 'flex', gap: 5 }}>
                      {[50, 100, 500].map(v => (
                        <button key={v} onClick={() => updateValorAtual(meta, Math.min(meta.valor_alvo, meta.valor_atual + v))}
                          style={{ fontSize: 11, fontWeight: 700, fontFamily: FONT, background: C.green50, border: `1.5px solid ${C.green100}`, color: '#15803d', padding: '4px 8px', borderRadius: 7, cursor: 'pointer' }}>
                          +{fmtInt(v)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
