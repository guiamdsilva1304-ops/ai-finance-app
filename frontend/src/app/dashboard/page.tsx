"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { MetricCard, MetricCardSkeleton } from "@/components/ui/MetricCard";
import { formatBRL, getScoreColor, getScoreLabel } from "@/lib/utils";
import { TrendingUp, Wallet, PiggyBank, BarChart3, RefreshCw } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";

const CATEGORY_COLORS = [
  "#16a34a","#22c55e","#4ade80","#86efac",
  "#f59e0b","#fb923c","#6366f1","#a855f7",
];

interface EcoData {
  selic_anual: number; selic_meta: number;
  ipca_mensal: number; ipca_anual: number;
  ultima_atualizacao: string;
}

interface DashData {
  userId: string; renda: number; gastos: number;
  sobra: number; score: number; perfil: string; trend: string;
  gastosCat: Record<string, number>;
}

export default function DashboardPage() {
  const [eco, setEco] = useState<EcoData | null>(null);
  const [dash, setDash] = useState<DashData | null>(null);
  const [rates, setRates] = useState<Record<string, { rate: number; pct: number; emoji: string }>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch eco data from FastAPI backend
    const [ecoRes, ratesRes, memRes] = await Promise.allSettled([
      fetch("/api/rates/eco"),
      fetch("/api/rates/fx"),
      supabase.from("user_memory").select("*").eq("user_id", user.id).single(),
    ]);

    if (ecoRes.status === "fulfilled" && ecoRes.value.ok)
      setEco(await ecoRes.value.json());

    if (ratesRes.status === "fulfilled" && ratesRes.value.ok)
      setRates(await ratesRes.value.json());

    if (memRes.status === "fulfilled" && memRes.value.data) {
      const m = memRes.value.data;
      const renda = m.last_renda ?? 0;
      const gastos = m.last_gastos ?? 0;
      const gastosCat = m.gastos_categorias ?? {};
      const sobra = renda - gastos;
      // Simple score calc
      const savingsRate = renda > 0 ? (sobra / renda) * 100 : 0;
      const score = Math.min(100, Math.round(50 + savingsRate * 0.8));
      setDash({
        userId: user.id, renda, gastos, sobra, score,
        perfil: getScoreLabel(score), trend: m.trend ?? "estável",
        gastosCat,
      });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const pieData = dash
    ? Object.entries(dash.gastosCat)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  const projecaoData = dash && eco
    ? Array.from({ length: 13 }, (_, i) => ({
        mes: i === 0 ? "Hoje" : `M${i}`,
        valor: Math.round(dash.sobra * i * Math.pow(1 + eco.selic_anual / 100 / 12, i)),
        semJuros: Math.round(dash.sobra * i),
      }))
    : [];

  const jurosReais = eco ? (eco.selic_anual - eco.ipca_anual).toFixed(2) : "—";

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-[#0d2414] font-[Nunito]">Dashboard</h1>
          <p className="text-sm text-[#6b9e80] mt-0.5">Visão geral das suas finanças</p>
        </div>
        <button onClick={load} className="btn-ghost p-2.5 rounded-xl" title="Atualizar">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Eco indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-6">
        {[
          { label: "SELIC Efetiva", value: eco ? `${eco.selic_anual}% a.a.` : "…", color: "#16a34a" },
          { label: "Meta SELIC", value: eco ? `${eco.selic_meta}% a.a.` : "…", color: "#15803d" },
          { label: "IPCA Mensal", value: eco ? `${eco.ipca_mensal}%` : "…", color: "#0d2414" },
          { label: "IPCA 12m", value: eco ? `${eco.ipca_anual}%` : "…", color: "#0d2414" },
          { label: "Juro Real", value: eco ? `${jurosReais}% a.a.` : "…", color: Number(jurosReais) > 6 ? "#16a34a" : "#f59e0b" },
        ].map(({ label, value, color }, i) => (
          <div key={label}
            className="bg-white border border-[#e4f5e9] rounded-xl px-3 py-2.5 animate-fade-up opacity-0"
            style={{ animationDelay: `${i * 60}ms` }}>
            <p className="text-[10px] font-bold text-[#8db89d] uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm font-black leading-none" style={{ color, fontFamily: "Nunito, sans-serif" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {loading ? (
          [0,1,2,3].map(i => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard label="Renda Mensal" value={formatBRL(dash?.renda ?? 0)}
              icon={<Wallet size={16}/>} animDelay={0} />
            <MetricCard label="Gastos Totais"
              value={formatBRL(dash?.gastos ?? 0)}
              sub={dash?.renda ? `${((dash.gastos/dash.renda)*100).toFixed(1)}% da renda` : ""}
              trend={dash && dash.gastos > dash.renda * 0.8 ? "down" : "neutral"}
              icon={<TrendingUp size={16}/>} animDelay={60} />
            <MetricCard label="Sobra Mensal"
              value={formatBRL(Math.abs(dash?.sobra ?? 0))}
              sub={dash && dash.sobra >= 0 ? "disponível para investir" : "DÉFICIT"}
              trend={dash && dash.sobra > 0 ? "up" : "down"}
              icon={<PiggyBank size={16}/>} animDelay={120} />
            <MetricCard label="SELIC" value={eco ? `${eco.selic_anual}% a.a.` : "—"}
              sub={eco ? `Meta: ${eco.selic_meta}% | IPCA: ${eco.ipca_anual}%` : ""}
              icon={<BarChart3 size={16}/>} animDelay={180} />
          </>
        )}
      </div>

      {/* Score + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Score card */}
        <div className="card-green animate-fade-up opacity-0 anim-3 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-green-200 uppercase tracking-widest mb-3">Score iMoney</p>
            <div className="flex items-end gap-3 mb-2">
              <span className="text-6xl font-black leading-none"
                style={{ color: getScoreColor(dash?.score ?? 0), fontFamily: "Nunito, sans-serif" }}>
                {loading ? "—" : dash?.score ?? 0}
              </span>
              <span className="text-green-200 text-sm mb-1 font-bold">/100</span>
            </div>
            <p className="text-green-100 font-bold text-lg">{dash?.perfil ?? "Calculando..."}</p>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-green-200 mb-1">
              <span>Progresso</span><span>{dash?.score ?? 0}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/80 rounded-full transition-all duration-700"
                style={{ width: `${dash?.score ?? 0}%` }} />
            </div>
            <p className="text-xs text-green-200 mt-2">Tendência: {dash?.trend ?? "—"}</p>
          </div>
        </div>

        {/* Pie chart */}
        <div className="card col-span-1 lg:col-span-2 animate-fade-up opacity-0 anim-4">
          <p className="text-sm font-bold text-[#0d2414] mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>
            Distribuição de Gastos
          </p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-sm text-[#8db89d]">Registre gastos para ver a distribuição</p>
            </div>
          )}
        </div>
      </div>

      {/* Projection chart */}
      {dash && dash.sobra > 0 && projecaoData.length > 0 && (
        <div className="card animate-fade-up opacity-0 anim-5">
          <p className="text-sm font-bold text-[#0d2414] mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>
            📈 Projeção Patrimonial — 12 meses
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={projecaoData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4f5e9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#8db89d" }} />
              <YAxis tick={{ fontSize: 11, fill: "#8db89d" }}
                tickFormatter={(v) => formatBRL(v, true)} width={70} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Area type="monotone" dataKey="valor" name="Com juros"
                stroke="#16a34a" strokeWidth={2.5} fill="url(#gradGreen)" />
              <Area type="monotone" dataKey="semJuros" name="Sem investir"
                stroke="#bbf7d0" strokeWidth={1.5} fill="none" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Exchange rates */}
      {Object.keys(rates).length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-bold text-[#8db89d] uppercase tracking-widest mb-3">
            Câmbio em Tempo Real
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2">
            {Object.entries(rates).slice(0, 7).map(([code, r], i) => (
              <div key={code}
                className="bg-white border border-[#e4f5e9] rounded-xl p-2.5 text-center animate-fade-up opacity-0"
                style={{ animationDelay: `${i * 40}ms` }}>
                <p className="text-lg mb-0.5">{r.emoji}</p>
                <p className="text-[10px] font-bold text-[#8db89d]">{code}</p>
                <p className="text-sm font-black text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>
                  R$ {r.rate.toFixed(2)}
                </p>
                <p className={`text-[10px] font-bold ${r.pct >= 0 ? "text-[#16a34a]" : "text-red-500"}`}>
                  {r.pct >= 0 ? "▲" : "▼"} {Math.abs(r.pct).toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
