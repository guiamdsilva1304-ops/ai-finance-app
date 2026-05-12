"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { formatBRL } from "@/lib/utils";
import { RefreshCw, Trash2, CheckCircle2, Star } from "lucide-react";
import { GoalCard } from "@/components/imoney/primitives";
import { C, FONT } from "@/components/imoney/tokens";
import type { Meta } from "@/types";

function metaEmoji(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes('reserva') || n.includes('emergên') || n.includes('emergenc')) return '🏦';
  if (n.includes('viagem') || n.includes('férias') || n.includes('ferias')) return '✈️';
  if (n.includes('carro') || n.includes('auto') || n.includes('moto')) return '🚗';
  if (n.includes('casa') || n.includes('apto') || n.includes('imóv')) return '🏡';
  if (n.includes('casamento') || n.includes('noivado') || n.includes('anel')) return '💍';
  if (n.includes('estud') || n.includes('curso') || n.includes('faculd')) return '📚';
  if (n.includes('invest') || n.includes('bolsa') || n.includes('ação')) return '📈';
  if (n.includes('celular') || n.includes('iphone') || n.includes('notebook')) return '📱';
  if (n.includes('div') || n.includes('empréstimo') || n.includes('emprestimo')) return '💳';
  return '🎯';
}

function brlNum(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type MetaExt = Meta & { principal?: boolean };

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

  const ativas = metas.filter(m => !m.concluida);
  const concluidas = metas.filter(m => m.concluida);

  function aporte(meta: MetaExt) {
    const falta = meta.valor_alvo - meta.valor_atual;
    return falta > 0 ? falta / meta.prazo_meses : 0;
  }

  const aporteEstimado = valorAlvo && prazo
    ? (parseFloat(valorAlvo.replace(',', '.') || '0') - parseFloat(valorAtual.replace(',', '.') || '0')) / parseInt(prazo || '1')
    : null;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 80px', fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: C.green900, margin: 0 }}>🎯 Metas Financeiras</h1>
          <p style={{ fontSize: 13, color: C.ink3, marginTop: 4, marginBottom: 0 }}>
            Sobra mensal disponível: <strong style={{ color: C.green500 }}>{formatBRL(sobra)}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={load}
            style={{ background: 'none', border: `1.5px solid ${C.divider}`, borderRadius: 12, padding: '8px 10px', cursor: 'pointer', color: C.ink3 }}>
            <RefreshCw size={16} style={loading ? { animation: 'spin 1s linear infinite' } : {}}/>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ background: C.green500, color: C.green900, border: 'none', borderRadius: 12, padding: '8px 18px', fontWeight: 800, fontSize: 14, fontFamily: FONT, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
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
            {aporteEstimado !== null && !isNaN(aporteEstimado) && aporteEstimado > 0 && (
              <div className="flex items-center bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-[#6b9e80] font-bold uppercase tracking-wider">Aporte mensal estimado</p>
                  <p className="text-lg font-black text-[#15803d]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                    {formatBRL(aporteEstimado)}
                  </p>
                </div>
              </div>
            )}
          </div>
          {formError && <p className="text-xs text-red-500 mb-3">⚠ {formError}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              type="submit"
              disabled={saving}
              style={{ flex: 1, background: C.green900, color: '#fff', border: 'none', borderRadius: 14, padding: '13px 0', fontWeight: 800, fontSize: 15, fontFamily: FONT, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? "Salvando..." : "💾 Criar meta"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{ background: '#fff', color: C.ink2, border: `1.5px solid ${C.divider}`, borderRadius: 14, padding: '13px 20px', fontWeight: 700, fontSize: 14, fontFamily: FONT, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Metas ativas */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ height: 140, borderRadius: 16, background: '#e8f5e9', animation: 'pulse 1.5s infinite' }}/>
          ))}
        </div>
      ) : ativas.length === 0 ? (
        <div style={{ background: C.green50, borderRadius: 20, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <p style={{ fontWeight: 800, color: C.green900, margin: '0 0 6px' }}>Nenhuma meta ativa</p>
          <p style={{ fontSize: 13, color: C.ink3, margin: 0 }}>Crie sua primeira meta financeira acima.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ativas.map(meta => {
            const pct = Math.min(100, meta.valor_alvo > 0 ? (meta.valor_atual / meta.valor_alvo) * 100 : 0);
            const ap = aporte(meta);
            return (
              <div key={meta.id}>
                <GoalCard
                  title={meta.nome}
                  emoji={metaEmoji(meta.nome)}
                  current={brlNum(meta.valor_atual)}
                  target={formatBRL(meta.valor_alvo)}
                  pct={pct}
                  statusLeft={`Aporte: ${formatBRL(ap)}/mês`}
                  statusRight={`${meta.prazo_meses} meses restantes`}
                  tone={meta.principal ? 'dark' : 'white'}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 6px 2px' }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button
                      onClick={() => togglePrincipal(meta)}
                      title={meta.principal ? "Remover como principal" : "Marcar como meta principal"}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: meta.principal ? '#f59e0b' : C.ink3 }}>
                      <Star size={15} fill={meta.principal ? "currentColor" : "none"}/>
                    </button>
                    <button
                      onClick={() => toggleConcluida(meta)}
                      title="Marcar como concluída"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: C.ink3 }}>
                      <CheckCircle2 size={15}/>
                    </button>
                    <button
                      onClick={() => remove(meta.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: C.ink3 }}>
                      <Trash2 size={15}/>
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[50, 100, 500].map(v => (
                      <button
                        key={v}
                        onClick={() => updateValorAtual(meta, Math.min(meta.valor_alvo, meta.valor_atual + v))}
                        style={{
                          fontSize: 12, fontWeight: 700, fontFamily: FONT,
                          background: C.green50, border: `1.5px solid ${C.green100}`,
                          color: '#15803d', padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                        }}>
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
        <div style={{ marginTop: 36 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            ✅ Concluídas ({concluidas.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {concluidas.map(meta => (
              <div key={meta.id} style={{
                background: '#fff', borderRadius: 14, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12, opacity: 0.6,
                border: `1px solid ${C.divider}`,
              }}>
                <CheckCircle2 size={18} style={{ color: C.green500, flexShrink: 0 }}/>
                <p style={{ flex: 1, fontWeight: 700, color: C.green900, fontSize: 14, margin: 0, textDecoration: 'line-through' }}>{meta.nome}</p>
                <p style={{ fontWeight: 900, fontSize: 14, color: C.green500, margin: 0 }}>{formatBRL(meta.valor_alvo)}</p>
                <button
                  onClick={() => remove(meta.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.ink3 }}>
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
