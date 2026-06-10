"use client";
import { useEffect, useMemo, useState } from "react";
import { calcularScore, segmentoDoScore, SEGMENTO_LABEL, type Segmento } from "@/lib/admin-score";

export interface RadarUser {
  user_id: string;
  nome: string | null;
  email: string | null;
  phone: string | null;
  plan: string;
  last_login_at: string | null;
  streak: number;
  totalMsgs: number;
  temMeta: boolean;
  temTransacao7d: boolean;
}

type Filtro = "todos" | Segmento | "pagantes";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "risco", label: "🔴 Em risco" },
  { id: "engajado", label: "🟡 Engajados" },
  { id: "alta", label: "🟢 Alta propensão" },
  { id: "pagantes", label: "💎 Pagantes" },
];

const SEG_BG: Record<Segmento, string> = {
  risco: "bg-red-950/30 hover:bg-red-950/50",
  engajado: "bg-yellow-950/20 hover:bg-yellow-950/40",
  alta: "bg-[#00C853]/[0.06] hover:bg-[#00C853]/10",
};

const PLAN_BADGE: Record<string, string> = {
  free: "bg-white/10 text-[#dff0e3]/60",
  pro: "bg-[#00C853]/15 text-[#00C853]",
  premium: "bg-[#F9A825]/15 text-[#F9A825]",
};

export function relativo(ts: string | null): string {
  if (!ts) return "nunca";
  const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

export default function UserRadarTable({ onVerPerfil, onWhatsApp, onEmail }: {
  onVerPerfil: (userId: string) => void;
  onWhatsApp: (u: RadarUser) => void;
  onEmail: (u: RadarUser) => void;
}) {
  const [users, setUsers] = useState<RadarUser[] | null>(null);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  useEffect(() => {
    fetch("/api/admin/users")
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Erro ao carregar usuários");
        setUsers(data.users ?? []);
      })
      .catch(e => setErro(e instanceof Error ? e.message : "Erro"));
  }, []);

  const linhas = useMemo(() => {
    const scored = (users ?? []).map(u => {
      const score = calcularScore(u);
      return { ...u, score, seg: segmentoDoScore(score) };
    });
    scored.sort((a, b) => b.score - a.score);
    if (filtro === "todos") return scored;
    if (filtro === "pagantes") return scored.filter(u => u.plan !== "free");
    return scored.filter(u => u.seg === filtro);
  }, [users, filtro]);

  if (erro) return <p className="rounded-xl border border-[#ff5252]/30 bg-[#ff5252]/5 p-3 text-xs text-[#ff5252]">Radar indisponível: {erro}</p>;
  if (!users) return <div className="h-64 animate-pulse rounded-2xl bg-[#0e1a10]" />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              filtro === f.id
                ? "bg-[#00C853] text-[#0a1f0a]"
                : "border border-[#00C853]/15 bg-[#0e1a10] text-[#dff0e3]/60 hover:border-[#00C853]/40"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto self-center text-[11px] text-[#3a6b45]">{linhas.length} usuários</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#00C853]/10 bg-[#0e1a10]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#00C853]/10">
              {["Nome", "Plano", "Último acesso", "Msgs", "Streak", "Score", "Ações"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-[#3a6b45]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map(u => (
              <tr
                key={u.user_id}
                className={`cursor-pointer border-b border-white/[0.03] transition-colors ${SEG_BG[u.seg]}`}
                onClick={() => onVerPerfil(u.user_id)}
              >
                <td className="px-3 py-2.5">
                  <p className="font-extrabold text-[#dff0e3]">{u.nome ?? u.email ?? "Sem nome"}</p>
                  <p className="text-[10px] text-[#3a6b45]">{u.email ?? "sem email"}</p>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${PLAN_BADGE[u.plan] ?? PLAN_BADGE.free}`}>{u.plan}</span>
                </td>
                <td className="px-3 py-2.5 text-[#dff0e3]/70">{relativo(u.last_login_at)}</td>
                <td className="px-3 py-2.5 text-[#dff0e3]/70">{u.totalMsgs}</td>
                <td className="px-3 py-2.5 text-[#dff0e3]/70">🔥 {u.streak}d</td>
                <td className="px-3 py-2.5">
                  <span className="font-black text-white">{u.score}</span>
                  <span className="ml-1.5 text-[10px] text-[#3a6b45]">{SEGMENTO_LABEL[u.seg]}</span>
                </td>
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onWhatsApp(u)}
                      disabled={!u.phone}
                      title={u.phone ? "Enviar WhatsApp" : "Sem telefone vinculado"}
                      className="rounded-lg border border-[#00C853]/25 px-2 py-1 text-[11px] font-bold text-[#00C853] hover:bg-[#00C853]/10 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      📱
                    </button>
                    <button
                      onClick={() => onEmail(u)}
                      disabled={!u.email}
                      title={u.email ? "Enviar email" : "Sem email"}
                      className="rounded-lg border border-white/15 px-2 py-1 text-[11px] font-bold text-[#dff0e3]/70 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ✉️
                    </button>
                    <button
                      onClick={() => onVerPerfil(u.user_id)}
                      title="Ver perfil"
                      className="rounded-lg border border-white/15 px-2 py-1 text-[11px] font-bold text-[#dff0e3]/70 hover:bg-white/5"
                    >
                      👁️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-xs text-[#3a6b45]">Nenhum usuário neste filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
