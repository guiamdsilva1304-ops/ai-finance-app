"use client";
import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { MetricCard, MetricCardSkeleton } from "@/components/ui/MetricCard";
import { formatBRL, getScoreColor, getScoreLabel } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { GoalCard, Icon } from "@/components/imoney/primitives";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import MonthlySummaryCard from "@/components/MonthlySummaryCard";

const CATEGORY_COLORS = [
  "#16a34a","#22c55e","#4ade80","#86efac",
  "#f59e0b","#fb923c","#6366f1","#a855f7",
];

function scoreNivelColor(score: number) {
  if (score <= 30) return "#ef4444";
  if (score <= 50) return "#f97316";
  if (score <= 70) return "#eab308";
  if (score <= 85) return "#22c55e";
  return "#00C853";
}

function scoreNivelLabel(score: number) {
  if (score <= 30) return "Crítico";
  if (score <= 50) return "Atenção";
  if (score <= 70) return "Estável";
  if (score <= 85) return "Saudável";
  return "Excelente";
}

function metaEmoji(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes('reserva') || n.includes('emergên') || n.includes('emergenc')) return '🏦';
  if (n.includes('viagem') || n.includes('férias') || n.includes('ferias')) return '✈️';
  if (n.includes('carro') || n.includes('auto')) return '🚗';
  if (n.includes('casa') || n.includes('apto')) return '🏡';
  if (n.includes('casamento') || n.includes('noivado')) return '💍';
  if (n.includes('estud') || n.includes('curso')) return '📚';
  if (n.includes('div') || n.includes('empréstimo')) return '💳';
  return '🎯';
}

function brlNum(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface ScoreProfile {
  score_saude: number | null;
  diagnostico_json: { score_imoney?: { titulo?: string } } | null;
}

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
  const [isPro, setIsPro] = useState(false);
  const [scoreProfile, setScoreProfile] = useState<ScoreProfile | null>(null);
  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const metasRes = await supabase.from("metas").select("*").eq("user_id", session.user.id).eq("concluida", false).single();
    if (metasRes.data) setMainMeta(metasRes.data);

    const profileRes = await supabase.from("user_profiles").select("plan").eq("user_id", session.user.id).single();
    if (profileRes.data) setIsPro(profileRes.data.plan === "pro");

    const { data: sp } = await supabase
      .from("user_profiles")
      .select("score_saude, diagnostico_json")
      .eq("id", session.user.id)
      .maybeSingle();
    setScoreProfile(sp ?? null);

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

      {/* Score iMoney card */}
      {!loading && (
        scoreProfile?.diagnostico_json?.score_imoney ? (
          <a href="/dashboard/score" style={{ display: "block", textDecoration: "none", marginBottom: 20 }}>
            <div style={{ background: "#fff", border: "1.5px solid #e4f5e9", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer", transition: "box-shadow 0.2s", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: scoreNivelColor(scoreProfile.score_saude ?? 0), fontFamily: "Nunito, sans-serif" }}>{scoreProfile.score_saude ?? 0}</span>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#8db89d", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Score iMoney</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#0d2414", margin: "2px 0 0", fontFamily: "Nunito, sans-serif" }}>
                    {scoreNivelLabel(scoreProfile.score_saude ?? 0)}
                    {scoreProfile.diagnostico_json?.score_imoney?.titulo && (
                      <span style={{ fontWeight: 600, color: "#6b9e80" }}> · {scoreProfile.diagnostico_json.score_imoney.titulo}</span>
                    )}
                  </p>
                </div>
              </div>
              <span style={{ fontSize: 18, color: "#16a34a" }}>→</span>
            </div>
          </a>
        ) : (
          <a href="/dashboard/diagnostico" style={{ display: "block", textDecoration: "none", marginBottom: 20 }}>
            <div style={{ background: "linear-gradient(135deg, #0a3d28 0%, #1D9E75 100%)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", margin: "0 0 3px" }}>🎯 Descubra seu Score iMoney</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", margin: 0, fontWeight: 600 }}>Diagnóstico financeiro gratuito em 5 perguntas</p>
              </div>
              <div style={{ background: "#fff", borderRadius: 10, padding: "8px 14px", flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#1D9E75" }}>Calcular →</span>
              </div>
            </div>
          </a>
        )
      )}

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
              icon={<Icon name="wallet" size={16} color="#1D9E75" />} animDelay={0} />
            <MetricCard label="Gastos do Mês"
              value={formatBRL(dash?.gastos ?? 0)}
              sub={dash?.renda ? `${((dash.gastos/dash.renda)*100).toFixed(1)}% da renda` : ""}
              trend={dash && dash.gastos > dash.renda * 0.8 ? "down" : "neutral"}
              icon={<Icon name="trending-up" size={16} color="#1D9E75" />} animDelay={60} />
            <MetricCard label="Sobra do Mês"
              value={formatBRL(Math.abs(dash?.sobra ?? 0))}
              sub={dash && dash.sobra >= 0 ? "disponível para investir" : "DÉFICIT"}
              trend={dash && dash.sobra > 0 ? "up" : "down"}
              icon={<Icon name="piggy-bank" size={16} color="#1D9E75" />} animDelay={120} />
            <MetricCard label="SELIC" value={eco ? `${eco.selic_anual}% a.a.` : "—"}
              sub={eco ? `Meta: ${eco.selic_meta}% | IPCA: ${eco.ipca_anual}%` : ""}
              icon={<Icon name="pie" size={16} color="#1D9E75" />} animDelay={180} />
          </>
        )}
      </div>

      {mainMeta && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#8db89d', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Meta Principal</p>
            <a href="/dashboard/metas" style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', textDecoration: 'none' }}>Ver todas →</a>
          </div>
          <GoalCard
            title={mainMeta.nome}
            emoji={metaEmoji(mainMeta.nome)}
            current={brlNum(mainMeta.valor_atual)}
            target={formatBRL(mainMeta.valor_alvo)}
            pct={Math.min(100, mainMeta.valor_alvo > 0 ? Math.round((mainMeta.valor_atual / mainMeta.valor_alvo) * 100) : 0)}
            statusLeft={`${mainMeta.prazo_meses} meses restantes`}
            statusRight={`${Math.min(100, mainMeta.valor_alvo > 0 ? Math.round((mainMeta.valor_atual / mainMeta.valor_alvo) * 100) : 0)}% concluído`}
            tone="white"
          />
        </div>
      )}

      {/* Resumo Mensal */}
      <div className="mb-6">
        <MonthlySummaryCard isPro={isPro} />
      </div>

      {/* Charts */}
      {dash && pieData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
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
