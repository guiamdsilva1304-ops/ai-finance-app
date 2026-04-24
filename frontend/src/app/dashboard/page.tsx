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

interface Meta {
  id: string; nome: string;
  valor_alvo: number; valor_atual: number;
  prazo_meses: number; concluida: boolean;
}

interface EcoData {
  selic_anual: number; selic_meta: number;
  ipca_mensal: number; ipca_anual: number;
  ultima_atualizacao: string;
}

interface DashData {
  renda: number; gastos: number;
  sobra: number; score: number; perfil: string;
  gastosCat: Record<string, number>;
}

export default function DashboardPage() {
  const [eco, setEco] = useState<EcoData | null>(null);
  const [dash, setDash] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainMeta, setMainMeta] = useState<Meta | null>(null);
  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const metasRes = await supabase.from("metas").select("*").eq("user_id", session.user.id).eq("concluida", false).eq("principal", true).single();
    if (metasRes.data) setMainMeta(metasRes.data);
    const [ecoRes, summaryRes] = await Promise.allSettled([
      fetch("/api/rates/eco"),
      fetch("/api/dashboard/summary", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }),
    ]);

    if (ecoRes.status === "fulfilled" && ecoRes.value.ok)
      setEco(await ecoRes.value.json());

    if (summaryRes.status === "fulfilled" && summaryRes.value.ok) {
      const s = await summaryRes.value.json();
      const savingsRate = s.renda > 0 ? (s.sobra / s.renda) * 100 : 0;
      const score = Math.min(100, Math.max(0, Math.round(50 + savingsRate * 0.8)));
      setDash({
        renda: s.renda,
        gastos: s.gastos,
        sobra: s.sobra,
        gastosCat: s.gastosCat,
        score,
        perfil: getScoreLabel(score),
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

  const jurosReais = eco
    ? (((1 + eco.selic_anual / 100) / (1 + eco.ipca_anual / 100) - 1) * 100).toFixed(2)
    : "—";

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
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
            <MetricCard label="Renda do Mês" value={formatBRL(dash?.renda ?? 0)}
              icon={<Wallet size={16}/>} animDelay={0} />
            <MetricCard label="Gastos do Mês"
              value={formatBRL(dash?.gastos ?? 0)}
              sub={dash?.renda ? `${((dash.gastos/dash.renda)*100).toFixed(1)}% da renda` : ""}
              trend={dash && dash.gastos > dash.renda * 0.8 ? "down" : "neutral"}
              icon={<TrendingUp size={16}/>} animDelay={60} />
            <MetricCard label="Sobra do Mês"
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

      {mainMeta && (
        <div className="bg-white border border-[#e4f5e9] rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <div>
                <p className="text-xs font-bold text-[#8db89d] uppercase tracking-wider">Meta Principal</p>
                <p className="font-black text-[#0d2414]" style={{fontFamily:"Nunito,sans-serif"}}>{mainMeta.nome}</p>
              </div>
            </div>
            <a href="/dashboard/metas" className="text-xs font-bold text-[#16a34a] hover:underline">Ver todas →</a>
          </div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#6b9e80] font-bold">{formatBRL(mainMeta.valor_atual)} guardados</span>
            <span className="font-black text-[#0d2414]">{formatBRL(mainMeta.valor_alvo)}</span>
          </div>
          <div className="w-full bg-[#f0fdf4] rounded-full h-3">
            <div className="bg-gradient-to-r from-[#16a34a] to-[#22c55e] h-3 rounded-full transition-all"
              style={{width: `${Math.min(100, Math.round((mainMeta.valor_atual / mainMeta.valor_alvo) * 100))}%`}}/>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[#8db89d]">{Math.min(100, Math.round((mainMeta.valor_atual / mainMeta.valor_alvo) * 100))}% concluído</span>
            <span className="text-xs text-[#8db89d]">{mainMeta.prazo_meses} meses restantes</span>
          </div>
        </div>
      )}

      {/* Charts */}
      {dash && pieData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Pie chart */}
          <div className="card">
            <p className="font-bold text-[#0d2414] mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>
              Gastos por Categoria
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {pieData.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1 text-xs text-[#6b9e80]">
                  <span className="w-2 h-2 rounded-full inline-block"
                    style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}/>
                  {d.name}
                </span>
              ))}
            </div>
          </div>

          {/* Projeção */}
          {projecaoData.length > 0 && dash.sobra > 0 && (
            <div className="card">
              <p className="font-bold text-[#0d2414] mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>
                Projeção de Poupança (12 meses)
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={projecaoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4f5e9"/>
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }}/>
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={(v: number) => formatBRL(v)}/>
                  <Area type="monotone" dataKey="valor" stroke="#16a34a" fill="#f0fdf4"
                    name="Com juros (SELIC)"/>
                  <Area type="monotone" dataKey="semJuros" stroke="#86efac" fill="#dcfce7"
                    name="Sem juros"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {!loading && (!dash || (dash.renda === 0 && dash.gastos === 0)) && (
        <div className="card text-center py-12 bg-[#f8fdf9]">
          <p className="text-3xl mb-2">📊</p>
          <p className="font-bold text-[#0d2414]">Nenhuma transação este mês</p>
          <p className="text-sm text-[#6b9e80] mt-1">
            Registre suas receitas e gastos em <strong>Transações</strong> para ver o dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
