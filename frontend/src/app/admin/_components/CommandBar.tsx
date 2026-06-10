"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Hit {
  user_id: string;
  nome: string | null;
  email: string | null;
  phone: string | null;
  plan: string;
  last_login_at: string | null;
  streak: number;
}

function relativo(ts: string | null): string {
  if (!ts) return "nunca acessou";
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

const PLAN_STYLE: Record<string, string> = {
  free: "bg-white/10 text-[#dff0e3]/60",
  pro: "bg-[#00C853]/15 text-[#00C853]",
  premium: "bg-[#F9A825]/15 text-[#F9A825]",
};

export default function CommandBar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQ(""); setHits([]); setErro("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setHits([]); setBuscando(false); return; }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        if (!res.ok) { setErro(data.error ?? "Erro na busca"); setHits([]); }
        else { setErro(""); setHits(data.users ?? []); }
      } catch {
        setErro("Erro de conexão");
      } finally {
        setBuscando(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  if (!open) return null;

  const irPara = (path: string) => { onClose(); router.push(path); };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-[12vh]"
      onClick={onClose}
      style={{ fontFamily: "'Nunito','Segoe UI',sans-serif" }}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-[#00C853]/20 bg-[#0e1a10] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[#00C853]/10 px-4">
          <span className="text-[#3a6b45]">🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === "Escape") onClose(); }}
            placeholder="Nome, email ou telefone…"
            className="w-full bg-transparent py-3.5 text-sm text-[#dff0e3] placeholder-[#3a6b45] outline-none"
          />
          {buscando && <span className="text-xs text-[#3a6b45]">buscando…</span>}
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {erro && <p className="px-3 py-4 text-xs text-[#ff5252]">{erro}</p>}
          {!erro && q.trim().length >= 2 && !buscando && hits.length === 0 && (
            <p className="px-3 py-4 text-xs text-[#3a6b45]">Nenhum usuário encontrado.</p>
          )}
          {!erro && q.trim().length < 2 && (
            <p className="px-3 py-4 text-xs text-[#3a6b45]">Digite pelo menos 2 caracteres. Esc fecha.</p>
          )}
          {hits.map(u => (
            <div key={u.user_id} className="rounded-xl px-3 py-2.5 hover:bg-white/5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[#dff0e3]">
                    {u.nome ?? u.email ?? "Sem nome"}
                    <span className={`ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${PLAN_STYLE[u.plan] ?? PLAN_STYLE.free}`}>{u.plan}</span>
                  </p>
                  <p className="truncate text-[11px] text-[#3a6b45]">
                    {u.email ?? "sem email"} {u.phone ? `· ${u.phone}` : ""} · {relativo(u.last_login_at)} · 🔥 {u.streak}d
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => irPara(`/admin/usuarios?u=${u.user_id}`)}
                    className="rounded-lg border border-[#00C853]/25 px-2 py-1 text-[11px] font-bold text-[#00C853] hover:bg-[#00C853]/10"
                  >
                    👁️ Perfil
                  </button>
                  <button
                    onClick={() => irPara(`/admin/usuarios?u=${u.user_id}&tab=tx`)}
                    className="rounded-lg border border-white/15 px-2 py-1 text-[11px] font-bold text-[#dff0e3]/70 hover:bg-white/5"
                  >
                    📊 Transações
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
