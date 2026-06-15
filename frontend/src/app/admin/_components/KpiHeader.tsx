"use client";
import { useEffect, useState } from "react";

interface Kpis {
  mrr: number;
  mrrDelta: number | null;
  pagantes: number;
  pagantesDelta: number | null;
  totalUsuarios: number;
  trialPaid: number;
  dau: number;
  mau: number;
  dauMau: number;
  churn30d: number;
  msgsPorUser: number;
  msgsPorUserDelta: number | null;
}

function Delta({ valor, invertido, sufixo = "" }: { valor: number | null; invertido?: boolean; sufixo?: string }) {
  if (valor === null || Math.abs(valor) < 0.005) {
    return <span className="text-[10px] font-bold text-[#5c7568]">— sem variação 7d</span>;
  }
  const positivoBom = invertido ? valor < 0 : valor > 0;
  return (
    <span className={`text-[10px] font-extrabold ${positivoBom ? "text-[#00803a]" : "text-[#d32f2f]"}`}>
      {valor > 0 ? "↑" : "↓"} {Math.abs(valor).toFixed(valor % 1 === 0 ? 0 : 1)}{sufixo} vs semana ant.
    </span>
  );
}

function Card({ titulo, valor, sub, delta }: { titulo: string; valor: string; sub?: string; delta?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#1a3a1a]/10 bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#5c7568]">{titulo}</p>
      <p className="mt-1.5 text-2xl font-black text-[#16241a]">{valor}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        {sub ? <span className="text-[11px] text-[#5c7568]">{sub}</span> : <span />}
        {delta}
      </div>
    </div>
  );
}

export default function KpiHeader() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/admin/kpis")
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Erro ao carregar KPIs");
        setKpis(data);
      })
      .catch(e => setErro(e instanceof Error ? e.message : "Erro"));
  }, []);

  if (erro) return <p className="rounded-xl border border-[#d32f2f]/30 bg-[#d32f2f]/5 p-3 text-xs text-[#d32f2f]">KPIs indisponíveis: {erro}</p>;

  if (!kpis) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-[#1a3a1a]/[0.06]" />
        ))}
      </div>
    );
  }

  const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <Card titulo="MRR" valor={brl(kpis.mrr)} delta={<Delta valor={kpis.mrrDelta} sufixo=" R$" />} />
      <Card
        titulo="Pagantes"
        valor={`${kpis.pagantes} / ${kpis.totalUsuarios}`}
        delta={<Delta valor={kpis.pagantesDelta} />}
      />
      <Card titulo="Trial → Paid" valor={`${kpis.trialPaid.toFixed(1)}%`} />
      <Card
        titulo="DAU / MAU"
        valor={`${kpis.dauMau.toFixed(0)}%`}
        sub={`${kpis.dau} hoje / ${kpis.mau} em 30d`}
      />
      <Card titulo="Churn 30d" valor={`${kpis.churn30d.toFixed(1)}%`} sub="últ. acesso > 30d" />
      <Card
        titulo="Msgs / user (7d)"
        valor={kpis.msgsPorUser.toFixed(1)}
        delta={<Delta valor={kpis.msgsPorUserDelta} />}
      />
    </div>
  );
}
