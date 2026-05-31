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

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

function metaEmoji(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes("reserva") || n.includes("emergên") || n.includes("emergenc")) return "🏦";
  if (n.includes("viagem") || n.includes("férias") || n.includes("ferias")) return "✈️";
  if (n.includes("carro") || n.includes("auto")) return "🚗";
  if (n.includes("casa") || n.includes("apto")) return "🏡";
  if (n.includes("casamento") || n.includes("noivado")) return "💍";
  if (n.includes("estud") || n.includes("curso")) return "📚";
  if (n.includes("div") || n.includes("empréstimo")) return "💳";
  return "🎯";
}

function gerarInsight(nome: string, dash: DashData | null, meta: Meta | null, hora: number): string {
  const firstName = nome || "você";
  if (!dash && !meta) return `Bem-vindo à iMoney, ${firstName}! Crie sua primeira meta e veja seu plano tomar forma. 🌱`;

  const pct = meta && meta.valor_alvo > 0
    ? Math.round((meta.valor_atual / meta.valor_alvo) * 100)
    : null;

  if (dash && dash.sobra < 0)
    return `Seus gastos estão acima da renda este mês. Quer entender onde cortar? 🔍`;

  if (pct !== null && pct >= 75)
    return `${firstName}, você está quase lá! ${pct}% da meta "${meta!.nome}" concluída. 🔥`;

  if (pct !== null && pct >= 50)
    return `Metade do caminho! ${pct}% de "${meta!.nome}" realizado. Continue assim! ⚡`;

  if (dash && dash.sobra > 0 && meta) {
    const aporte = Math.round((meta.valor_alvo - meta.valor_atual) / Math.max(1, meta.prazo_meses));
    return `Guardando R$ ${fmtInt(aporte)}/mês você chega em "${meta.nome}" no prazo. Está conseguindo? 💪`;
  }

  if (hora < 12) return `Bom dia, ${firstName}! Que tal registrar seus gastos de ontem? 📝`;
  if (hora < 18) return `Como estão suas finanças hoje, ${firstName}? Posso analisar para você. 📊`;
  return `Boa noite, ${firstName}! Revise seus gastos do dia antes de dormir. 🌙`;
}

interface ScoreProfile {
  score_saude: number | null;
  diagnostico_json: { score_imoney?: { titulo?: string } } | null;
}

interface Meta {
  id: string; nome: string;
  valor_alvo: number; valor_atual: number;
  prazo_meses: number; concluida: boolean; principal?: boolean;
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

function SonhoHero({ meta, loading }: { meta: Meta | null; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ background: "#0a3d28", borderRadius: 22, padding: "20px 22px 22px", marginBottom: 14, height: 140, animation: "pulse 1.5s infinite" }} />
    );
  }
  if (!meta) {
    return (
      <a href="/dashboard/metas?add=true" style={{ display: "block", textDecoration: "none", background: "linear-gradient(135deg, #0a3d28 0%, #1D9E75 100%)", borderRadius: 22, padding: "22px", marginBottom: 14 }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "Nunito, sans-serif" }}>🎯 Defina seu primeiro sonho</p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", margin: 0 }}>Diga o que você quer realizar →</p>
      </a>
    );
  }

  const pct = meta.valor_alvo > 0 ? Math.min(100, Math.round((meta.valor_atual / meta.valor_alvo) * 100)) : 0;
  const falta = meta.valor_alvo - meta.valor_atual;
  const aporte = meta.prazo_meses > 0 ? Math.round(falta / meta.prazo_meses) : 0;
  const emoji = metaEmoji(meta.nome);
  const pctColor = pct >= 75 ? "#FFD600" : pct >= 50 ? "#69F0AE" : "#00C853";

  return (
    <a href={`/dashboard/metas/${meta.id}`} style={{ display: "block", textDecoration: "none", background: "linear-gradient(155deg, #0a3d28 0%, #064e2e 100%)", borderRadius: 22, padding: "20px 22px 22px", marginBottom: 14, border: "1px solid rgba(0,200,83,0.2)" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>{emoji}</span>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Seu sonho principal</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: "#fff", margin: 0, fontFamily: "Nunito, sans-serif", lineHeight: 1.2 }}>{meta.nome}</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 32, fontWeight: 900, color: pctColor, margin: 0, lineHeight: 1, fontFamily: "Nunito, sans-serif" }}>{pct}%</p>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", margin: "2px 0 0" }}>concluído</p>
        </div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.12)", height: 8, borderRadius: 999, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ background: `linear-gradient(90deg, #1D9E75, ${pctColor})`, height: "100%", borderRadius: 999, width: `${pct}%`, transition: "width 1s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 2px" }}>Guardado</p>
          <p style={{ fontSize: 16, fontWeight: 900, color: "#fff", margin: 0, fontFamily: "Nunito, sans-serif" }}>R$ {fmtInt(meta.valor_atual)}</p>
        </div>
        <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 2px" }}>Faltam</p>
          <p style={{ fontSize: 16, fontWeight: 900, color: "#fff", margin: 0, fontFamily: "Nunito, sans-serif" }}>R$ {fmtInt(falta)}</p>
        </div>
        <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 2px" }}>Por mês</p>
          <p style={{ fontSize: 16, fontWeight: 900, color: "#A7F3D0", margin: 0, fontFamily: "Nunito, sans-serif" }}>R$ {fmtInt(aporte)}</p>
        </div>
      </div>
    </a>
  );
}

function AssessorCard({ insight }: { insight: string }) {
  return (
    <a href="/dashboard/assessor" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", background: "#fff", borderRadius: 16, padding: "14px 16px", marginBottom: 24, border: "1.5px solid #e4f5e9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #0a3d28, #1D9E75)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, boxShadow: "0 0 0 3px rgba(0,200,83,0.15)" }}>🧭</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#00C853", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>Assessor IA · online</p>
        <p style={{ fontSize: 13, color: "#0d2414", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, fontFamily: "Nunito, sans-serif" }}>
          {insight}
        </p>
      </div>
      <span style={{ color: "#1D9E75", fontSize: 18, flexShrink: 0 }}>›</span>
    </a>
  );
}

export default function DashboardPage() {
  const [eco, setEco] = useState<EcoData | null>(null);
  const [dash, setDash] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainMeta, setMainMeta] = useState<Meta | null>(null);
  const [allMetas, setAllMetas] = useState<Meta[]>([]);
  const [userName, setUserName] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [scoreProfile, setScoreProfile] = useState<ScoreProfile | null>(null);
  const [hora] = useState(() => new Date().getHours());
  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [metasRes, profileRes] = await Promise.all([
      supabase.from("metas").select("*").eq("user_id", session.user.id).eq("concluida", false).order("created_at", { ascending: false }),
     supabase.from("user_profiles").select("plan,full_name,nome").or(`id.eq.${session.user.id},user_id.eq.${session.user.id}`).limit(1).single(),
    ]);
    const metas: Meta[] = metasRes.data ?? [];
    setAllMetas(metas);
    const principal = metas.find(m => m.principal) ?? metas[0] ?? null;
    setMainMeta(principal);

    if (profileRes.data) {
      setIsPro(profileRes.data.plan === "pro" || profileRes.data.plan === "premium");
      const name = profileRes.data.full_name || profileRes.data.nome || "";
      if (name) {
        setUserName(name.split(" ")[0]);
      }
    }
    // fallback sempre: se ainda não tem nome, usa email
    if (!profileRes.data?.full_name && !profileRes.data?.nome) {
      const email = session.user.email || "";
      const emailName = email.split("@")[0].replace(/[._\-0-9]/g, " ").trim().split(" ").filter(Boolean)[0] || "";
      if (emailName) setUserName(emailName.charAt(0).toUpperCase() + emailName.slice(1).toLowerCase());
    }

    const { data: sp } = await supabase
      .from("user_profiles")
      .select("score_saude, diagnostico_json")
      .eq("user_id", session.user.id)
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

  const insight = gerarInsight(userName, dash, mainMeta, hora);
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const saudacaoEmoji = hora < 12 ? "☀️" : hora < 18 ? "🌤️" : "🌙";

  return (
    <>
    {/* ── Mobile ───────────────────────────────────────── */}
    <div className="md:hidden" style={{ minHeight: "100vh", background: "#f7fdf9", paddingBottom: 100 }}>
      <div style={{ padding: "20px 20px 0", fontFamily: "Nunito, sans-serif" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0d2414", margin: "0 0 2px" }}>
            {userName ? `${saudacao}, ${userName}! ${saudacaoEmoji}` : `${saudacao}! ${saudacaoEmoji}`}
          </h1>
          <p style={{ fontSize: 13, color: "#6b9e80", margin: 0 }}>
            {!loading && dash && dash.sobra < 0
              ? "⚠️ Gastos acima da renda este mês"
              : !loading && allMetas.length === 0
              ? "Crie seu primeiro sonho para começar 🎯"
              : "Veja como seus sonhos estão evoluindo"}
          </p>
        </div>

        <SonhoHero meta={mainMeta} loading={loading} />
        <AssessorCard insight={insight} />

        {!loading && dash && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            {[
              { label: "Renda", value: `R$ ${fmtInt(dash.renda)}`, color: "#1D9E75", icon: "💰" },
              { label: "Gastos", value: `R$ ${fmtInt(dash.gastos)}`, color: dash.gastos > dash.renda * 0.8 ? "#ef4444" : "#0d2414", icon: "📤" },
              { label: "Sobra", value: `R$ ${fmtInt(Math.abs(dash.sobra))}`, color: dash.sobra >= 0 ? "#1D9E75" : "#ef4444", icon: dash.sobra >= 0 ? "✅" : "❌" },
              { label: "SELIC", value: eco ? `${eco.selic_anual}%` : "—", color: "#0d2414", icon: "📈" },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", border: "1.5px solid #e4f5e9" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#8db89d", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>{icon} {label}</p>
                <p style={{ fontSize: 16, fontWeight: 900, color, margin: 0, fontFamily: "Nunito, sans-serif" }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {allMetas.length > 1 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#0d2414", margin: 0, fontFamily: "Nunito, sans-serif" }}>Outras metas</p>
              <a href="/dashboard/metas" style={{ fontSize: 13, fontWeight: 700, color: "#1D9E75", textDecoration: "none" }}>Ver todas →</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {allMetas.slice(1, 3).map(meta => {
                const pct = meta.valor_alvo > 0 ? Math.min(100, Math.round((meta.valor_atual / meta.valor_alvo) * 100)) : 0;
                return (
                  <a key={meta.id} href={`/dashboard/metas/${meta.id}`} style={{ textDecoration: "none", background: "#fff", borderRadius: 16, padding: "14px 16px", border: "1.5px solid #e4f5e9", display: "block" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{metaEmoji(meta.nome)}</span>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 800, color: "#0d2414", margin: 0, fontFamily: "Nunito, sans-serif" }}>{meta.nome}</p>
                          <p style={{ fontSize: 12, color: "#6b9e80", margin: 0 }}>R$ {fmtInt(meta.valor_atual)} de {fmtInt(meta.valor_alvo)}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 900, color: "#1D9E75" }}>{pct}%</span>
                    </div>
                    <div style={{ background: "#e8f5e9", height: 6, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ background: "linear-gradient(90deg, #1D9E75, #00C853)", height: "100%", borderRadius: 999, width: `${pct}%` }} />
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        )}

        {!loading && scoreProfile?.score_saude != null && (() => {
          const sc = scoreProfile.score_saude ?? 0;
          const cor = scoreNivelColor(sc);
          const nivel = scoreNivelLabel(sc);
          return (
            <a href="/dashboard/score" style={{ display: "block", textDecoration: "none", marginBottom: 14 }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: "16px", border: `1.5px solid ${cor}30`, boxShadow: `0 2px 12px ${cor}14` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#8db89d", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Saúde Financeira</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 40, fontWeight: 900, color: cor, lineHeight: 1, fontFamily: "Nunito, sans-serif" }}>{sc}</span>
                    <span style={{ fontSize: 14, color: "#c4d8c8", fontWeight: 700 }}>/100</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: cor, background: `${cor}18`, borderRadius: 8, padding: "3px 10px" }}>{nivel}</span>
                </div>
                <div style={{ height: 6, background: "#f0f7f2", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, sc)}%`, background: `linear-gradient(90deg, ${cor}99, ${cor})`, borderRadius: 999 }} />
                </div>
                <p style={{ fontSize: 11, color: "#8db89d", margin: "6px 0 0", fontWeight: 600 }}>Toque para ver diagnóstico completo →</p>
              </div>
            </a>
          );
        })()}
      </div>
    </div>

    {/* ── Desktop ───────────────────────────────────────── */}
    <div className="hidden md:block p-5 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0d2414", margin: "0 0 4px", fontFamily: "Nunito, sans-serif" }}>
            {`${saudacao}${userName ? `, ${userName}` : ""}! ${saudacaoEmoji}`}
          </h1>
          <p style={{ fontSize: 13, color: "#6b9e80", margin: 0 }}>
            {!loading && dash && dash.sobra < 0
              ? "⚠️ Seus gastos estão acima da renda este mês"
              : "Veja como seus sonhos estão evoluindo"}
          </p>
        </div>
        <button onClick={load} className="btn-ghost p-2.5 rounded-xl" title="Atualizar">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SonhoHero meta={mainMeta} loading={loading} />
      </div>

      <AssessorCard insight={insight} />

      {!loading && (
        scoreProfile?.score_saude != null ? (() => {
          const sc = scoreProfile.score_saude ?? 0;
          const cor = scoreNivelColor(sc);
          const nivel = scoreNivelLabel(sc);
          const proxNivel = sc <= 30 ? "Atenção" : sc <= 50 ? "Estável" : sc <= 70 ? "Saudável" : sc <= 85 ? "Excelente" : null;
          const pctBarra = Math.min(100, sc);
          return (
            <a href="/dashboard/score" style={{ display: "block", textDecoration: "none", marginBottom: 20 }}>
              <div style={{ background: "#fff", border: `1.5px solid ${cor}30`, borderRadius: 20, padding: "20px 22px", boxShadow: `0 4px 20px ${cor}18`, cursor: "pointer", transition: "box-shadow 0.2s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#8db89d", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Saúde Financeira</p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 48, fontWeight: 900, color: cor, lineHeight: 1, fontFamily: "Nunito, sans-serif" }}>{sc}</span>
                      <span style={{ fontSize: 16, color: "#c4d8c8", fontWeight: 700 }}>/100</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: cor, background: `${cor}18`, borderRadius: 8, padding: "2px 10px", marginLeft: 4 }}>{nivel}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {proxNivel && (
                      <p style={{ fontSize: 11, color: "#8db89d", margin: "0 0 4px", fontWeight: 600 }}>Próximo nível</p>
                    )}
                    {proxNivel && (
                      <p style={{ fontSize: 13, fontWeight: 800, color: "#0d2414", margin: 0 }}>{proxNivel} →</p>
                    )}
                    {!proxNivel && <span style={{ fontSize: 22 }}>🏆</span>}
                  </div>
                </div>
                <div style={{ height: 8, background: "#f0f7f2", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pctBarra}%`, background: `linear-gradient(90deg, ${cor}99, ${cor})`, borderRadius: 999, transition: "width 1s ease" }} />
                </div>
                <p style={{ fontSize: 11, color: "#8db89d", margin: "8px 0 0", fontWeight: 600 }}>
                  Use o Assessor IA para melhorar seu score → ver diagnóstico completo
                </p>
              </div>
            </a>
          );
        })() : (
          <a href="/dashboard/diagnostico" style={{ display: "block", textDecoration: "none", marginBottom: 20 }}>
            <div style={{ background: "linear-gradient(135deg, #0a3d28 0%, #1D9E75 100%)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
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

      <div className="mb-6">
        <MonthlySummaryCard isPro={isPro} />
      </div>

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
    </>
  );
}
