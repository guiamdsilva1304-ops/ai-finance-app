"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Evento {
  id: string;
  icone: string;
  tipo: string;
  user_id: string | null;
  nome: string;
  descricao: string;
  ts: string;
}

function relativo(ts: string): string {
  const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

const POLL_MS = 10_000;

export default function ActivityFeed() {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [erro, setErro] = useState("");
  const [novos, setNovos] = useState<Set<string>>(new Set());
  const conhecidosRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let ativo = true;
    const buscar = async () => {
      try {
        const r = await fetch("/api/admin/activity");
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Erro ao carregar feed");
        if (!ativo) return;
        const lista: Evento[] = (data.eventos ?? []).slice(0, 50);
        const recem = new Set<string>();
        if (conhecidosRef.current.size > 0) {
          for (const e of lista) if (!conhecidosRef.current.has(e.id)) recem.add(e.id);
        }
        conhecidosRef.current = new Set(lista.map(e => e.id));
        setNovos(recem);
        setEventos(lista);
        setErro("");
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro");
      }
    };
    buscar();
    const timer = setInterval(buscar, POLL_MS);
    return () => { ativo = false; clearInterval(timer); };
  }, []);

  if (erro && !eventos) return <p className="rounded-xl border border-[#ff5252]/30 bg-[#ff5252]/5 p-3 text-xs text-[#ff5252]">Feed indisponível: {erro}</p>;
  if (!eventos) return <div className="h-64 animate-pulse rounded-2xl bg-[#0e1a10]" />;

  return (
    <div className="rounded-2xl border border-[#00C853]/10 bg-[#0e1a10]">
      <div className="flex items-center justify-between border-b border-[#00C853]/10 px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#3a6b45]">Ao vivo · atualiza a cada 10s</span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#00C853]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C853] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00C853]" />
          </span>
          LIVE
        </span>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-2">
        {eventos.length === 0 && <p className="px-3 py-6 text-center text-xs text-[#3a6b45]">Nenhum evento ainda.</p>}
        {eventos.map(e => (
          <button
            key={e.id}
            onClick={() => e.user_id && router.push(`/admin/usuarios?u=${e.user_id}`)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${
              novos.has(e.id) ? "bg-[#00C853]/[0.07]" : ""
            }`}
          >
            <span className="text-base">{e.icone}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-[#dff0e3]/85">
              <strong className="font-extrabold text-[#dff0e3]">{e.nome}</strong> {e.descricao}
            </span>
            <span className="shrink-0 text-[10px] text-[#3a6b45]">{relativo(e.ts)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
