"use client";
import { useCallback, useEffect, useState } from "react";

interface Meta { id: string; nome: string; valor_alvo: number; valor_atual: number; prazo_meses: number; concluida: boolean }
interface Tx { id: string; descricao: string; valor: number; tipo: string; categoria: string | null; date: string | null; created_at: string }
interface DrawerData {
  profile: {
    user_id: string; nome: string | null; email: string | null; phone: string | null;
    plan: string; last_login_at: string | null; created_at: string | null;
    admin_notes: string; streak: number;
  };
  timeline: { icone: string; titulo: string; ts: string }[];
  msgsPorDia: { dia: string; count: number }[];
  metas: Meta[];
  ultimasTransacoes: Tx[];
}

const PLAN_BADGE: Record<string, string> = {
  free: "bg-white/10 text-[#dff0e3]/60",
  pro: "bg-[#00C853]/15 text-[#00C853]",
  premium: "bg-[#F9A825]/15 text-[#F9A825]",
};

export default function UserDrawer({ userId, onClose, onWhatsApp, onEmail }: {
  userId: string;
  onClose: () => void;
  onWhatsApp: (alvo: { nome: string | null; email: string | null; phone: string | null }) => void;
  onEmail: (alvo: { nome: string | null; email: string | null; phone: string | null }) => void;
}) {
  const [data, setData] = useState<DrawerData | null>(null);
  const [erro, setErro] = useState("");
  const [notas, setNotas] = useState("");
  const [salvandoNotas, setSalvandoNotas] = useState(false);
  const [notasSalvas, setNotasSalvas] = useState(false);
  const [mudandoPlano, setMudandoPlano] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/users/${userId}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Erro ao carregar usuário");
      setData(d);
      setNotas(d.profile.admin_notes ?? "");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro");
    }
  }, [userId]);

  useEffect(() => { setData(null); setErro(""); carregar(); }, [carregar]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const salvarNotas = async () => {
    setSalvandoNotas(true);
    try {
      const r = await fetch(`/api/admin/users/${userId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notas }),
      });
      if (r.ok) { setNotasSalvas(true); setTimeout(() => setNotasSalvas(false), 2000); }
    } finally {
      setSalvandoNotas(false);
    }
  };

  const mudarPlano = async (plan: string) => {
    if (!data) return;
    if (!confirm(`Mudar plano de ${data.profile.nome ?? "usuário"} para ${plan.toUpperCase()}? Isso não passa pelo gateway de pagamento.`)) return;
    setMudandoPlano(true);
    try {
      const r = await fetch(`/api/admin/users/${userId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (r.ok) await carregar();
      else alert((await r.json()).error ?? "Erro ao mudar plano");
    } finally {
      setMudandoPlano(false);
    }
  };

  const maxMsgs = Math.max(1, ...(data?.msgsPorDia ?? []).map(m => m.count));
  const p = data?.profile;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-[#00C853]/15 bg-[#0a1a0a] p-5"
        style={{ fontFamily: "'Nunito','Segoe UI',sans-serif" }}
      >
        <div className="mb-5 flex items-start justify-between">
          {p ? (
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00C853]/15 text-lg font-black text-[#00C853]">
                {(p.nome ?? p.email ?? "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[15px] font-extrabold text-white">
                  {p.nome ?? "Sem nome"}
                  <span className={`ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${PLAN_BADGE[p.plan] ?? PLAN_BADGE.free}`}>{p.plan}</span>
                </p>
                <p className="text-[11px] text-[#3a6b45]">{p.email ?? "sem email"} {p.phone ? `· ${p.phone}` : ""} · 🔥 {p.streak}d</p>
              </div>
            </div>
          ) : <div className="h-12 w-48 animate-pulse rounded-xl bg-[#0e1a10]" />}
          <button onClick={onClose} className="text-lg text-[#3a6b45] hover:text-white">✕</button>
        </div>

        {erro && <p className="rounded-xl border border-[#ff5252]/30 bg-[#ff5252]/5 p-3 text-xs text-[#ff5252]">{erro}</p>}

        {data && p && (
          <div className="space-y-6">
            {/* Ações */}
            <div className="flex gap-2">
              <button
                onClick={() => onWhatsApp({ nome: p.nome, email: p.email, phone: p.phone })}
                disabled={!p.phone}
                className="flex-1 rounded-xl bg-[#00C853] py-2 text-xs font-extrabold text-[#0a1f0a] disabled:cursor-not-allowed disabled:opacity-30"
              >
                📱 WhatsApp
              </button>
              <button
                onClick={() => onEmail({ nome: p.nome, email: p.email, phone: p.phone })}
                disabled={!p.email}
                className="flex-1 rounded-xl border border-[#00C853]/25 py-2 text-xs font-bold text-[#00C853] disabled:cursor-not-allowed disabled:opacity-30"
              >
                ✉️ Email
              </button>
              <select
                value={p.plan}
                disabled={mudandoPlano}
                onChange={e => mudarPlano(e.target.value)}
                className="rounded-xl border border-white/15 bg-[#0e1a10] px-2 text-xs font-bold text-[#dff0e3]"
                title="Mudar plano (cortesia, sem cobrança)"
              >
                <option value="free">free</option>
                <option value="pro">pro</option>
                <option value="premium">premium</option>
              </select>
            </div>

            {/* Timeline */}
            <section>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#3a6b45]">Timeline</h4>
              <div className="space-y-2">
                {data.timeline.map((ev, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[12px]">
                    <span>{ev.icone}</span>
                    <span className="flex-1 truncate text-[#dff0e3]/80">{ev.titulo}</span>
                    <span className="shrink-0 text-[10px] text-[#3a6b45]">
                      {new Date(ev.ts).toLocaleDateString("pt-BR")} {new Date(ev.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Mensagens por dia */}
            <section>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#3a6b45]">Mensagens — últimos 14 dias</h4>
              <div className="space-y-1">
                {data.msgsPorDia.map(m => (
                  <div key={m.dia} className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-[10px] text-[#3a6b45]">{m.dia.slice(5).split("-").reverse().join("/")}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-[#00C853]" style={{ width: `${(m.count / maxMsgs) * 100}%` }} />
                    </div>
                    <span className="w-5 shrink-0 text-right text-[10px] text-[#dff0e3]/60">{m.count}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Metas */}
            <section>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#3a6b45]">Metas ({data.metas.length})</h4>
              {data.metas.length === 0 && <p className="text-xs text-[#3a6b45]">Nenhuma meta.</p>}
              <div className="space-y-2.5">
                {data.metas.map(m => {
                  const pct = m.valor_alvo > 0 ? Math.min(100, Math.round((m.valor_atual / m.valor_alvo) * 100)) : 0;
                  return (
                    <div key={m.id}>
                      <div className="mb-1 flex justify-between text-[12px]">
                        <span className="truncate font-bold text-[#dff0e3]">{m.nome} {m.concluida ? "✅" : ""}</span>
                        <span className="shrink-0 text-[#3a6b45]">{pct}% de R$ {m.valor_alvo.toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#0d5435] to-[#00C853]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Últimas transações */}
            <section>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#3a6b45]">Últimas transações</h4>
              {data.ultimasTransacoes.length === 0 && <p className="text-xs text-[#3a6b45]">Nenhuma transação.</p>}
              <div className="space-y-1.5">
                {data.ultimasTransacoes.map(t => (
                  <div key={t.id} className="flex items-center justify-between text-[12px]">
                    <span className="truncate text-[#dff0e3]/80">{t.descricao}</span>
                    <span className={`shrink-0 font-bold ${t.tipo === "receita" ? "text-[#00C853]" : "text-[#ff8a80]"}`}>
                      {t.tipo === "receita" ? "+" : "−"} R$ {Number(t.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Notas internas */}
            <section>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#3a6b45]">Notas internas</h4>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                rows={3}
                placeholder="Só você vê isso."
                className="w-full rounded-xl border border-[#00C853]/15 bg-[#07100a] p-3 text-[12px] text-[#dff0e3] outline-none focus:border-[#00C853]/50"
              />
              <button
                onClick={salvarNotas}
                disabled={salvandoNotas}
                className="mt-1.5 rounded-lg border border-[#00C853]/25 px-3 py-1.5 text-[11px] font-bold text-[#00C853] hover:bg-[#00C853]/10 disabled:opacity-50"
              >
                {notasSalvas ? "✓ Salvo" : salvandoNotas ? "Salvando…" : "Salvar notas"}
              </button>
            </section>
          </div>
        )}
      </aside>
    </>
  );
}
