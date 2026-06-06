"use client";
import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { ProBanner } from "@/components/ui/ProBanner";
import { formatBRL } from "@/lib/utils";
import { Calculator, Shield, PiggyBank, FileText, HelpCircle, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = "simulador" | "emergencia" | "cofre" | "impostos";

// Tabela IR 2026 — retorna apenas o IR sobre a base de cálculo
function calcularIR(baseCalculo: number): number {
  if (baseCalculo <= 2824) return 0;
  if (baseCalculo <= 3751.05) return Math.max(0, baseCalculo * 0.075 - 211.80);
  if (baseCalculo <= 4664.68) return Math.max(0, baseCalculo * 0.15 - 492.78);
  if (baseCalculo <= 5000) return Math.max(0, baseCalculo * 0.225 - 869.48);
  if (baseCalculo <= 7000) {
    const ir = baseCalculo * 0.275 - 1119.48;
    const redutor = Math.max(0, ((7000 - baseCalculo) / 2000) * ir);
    return Math.max(0, ir - redutor);
  }
  return Math.max(0, baseCalculo * 0.275 - 1119.48);
}

// Tabela INSS CLT 2026 — alíquota progressiva
function calcularINSS(renda: number): number {
  if (renda <= 1412) return renda * 0.075;
  if (renda <= 2666.68) return renda * 0.09;
  if (renda <= 4000.03) return renda * 0.12;
  if (renda <= 7786.02) return renda * 0.14;
  return 1089.04; // teto
}

// DAS MEI 2026 — valor FIXO, não percentual
const DAS_MEI_COMERCIO_2026 = 75.90;
const DAS_MEI_SERVICO_2026  = 80.90;
const MEI_LIMITE_MENSAL = 14120; // R$ 169.440/ano

const TOOLS_ORDER: Tool[] = ["simulador", "emergencia", "cofre", "impostos"];
const TAB_DONE_KEY = (tab: Tool) => `imoney_autonomo_${tab}_done`;
const RENDA_KEY = "imoney_autonomo_renda";

const NEXT_LABEL: Partial<Record<Tool, string>> = {
  simulador: "2. Reserva de Emergência",
  emergencia: "3. Cofre Mensal",
  cofre: "4. Impostos",
};

const SLIDER_ANCHORS = [
  { value: 3, label: "Mínimo seguro" },
  { value: 6, label: "Recomendado MEI" },
  { value: 9, label: "Boa margem" },
  { value: 12, label: "Ideal autônomo" },
];

function CollapseSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1.5px solid #e4f5e9", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", padding: "14px 18px", background: "#fff", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1a3a1a" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{subtitle}</div>}
        </div>
        <span style={{ fontSize: 18, color: "#00C853", fontWeight: 700, lineHeight: 1, marginLeft: 12, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ padding: "14px 18px", background: "#fff", borderTop: "1px solid #e4f5e9" }}>{children}</div>}
    </div>
  );
}

export default function RendaPage() {
  const supabase = createSupabaseBrowser();
  const [plano, setPlano] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: p } = await supabase.from("user_profiles").select("plan,ocupacao").eq("user_id", data.user.id).single();
        setPlano(p?.plan ?? "free");
      } else {
        setPlano("free");
      }
    });
  }, []);

  const [tool, setTool] = useState<Tool>("simulador");

  // ── Renda compartilhada entre abas (localStorage) ──
  const [rendaContextoSaved, setRendaContextoSaved] = useState(""); // valor lido no mount

  // Simulador
  const [rendaMedia, setRendaMedia] = useState("");
  const [pctReserva, setPctReserva] = useState("20");

  // Emergência
  const [gastosM, setGastosM] = useState("");
  const [mesesEmerg, setMesesEmerg] = useState("6");
  const [guardaMes, setGuardaMes] = useState("");

  // Cofre
  const [rendaCofre, setRendaCofre] = useState("");
  const [pctCofre, setPctCofre] = useState("30");

  // Impostos
  const [rendaBruta, setRendaBruta] = useState("");
  const [regime, setRegime] = useState<"clt" | "mei" | "autonomo">("autonomo");
  const [tipoMEI, setTipoMEI] = useState<"comercio" | "servico">("comercio");

  // UI
  const [mediaTransacoes, setMediaTransacoes] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [jornadaCompleta, setJornadaCompleta] = useState(false);
  const [tabsDone, setTabsDone] = useState<Record<Tool, boolean>>({
    simulador: false, emergencia: false, cofre: false, impostos: false,
  });

  // Mount: restaura contexto de renda e flags de conclusão
  useEffect(() => {
    const saved = localStorage.getItem(RENDA_KEY) ?? "";
    setRendaContextoSaved(saved);
    if (saved) {
      setRendaMedia(v => v || saved);
      setRendaCofre(v => v || saved);
      setRendaBruta(v => v || saved);
      const rNum = parseFloat(saved);
      if (rNum > 0) setGuardaMes(v => v || String(Math.round(rNum * 0.20)));
    }
    setTabsDone({
      simulador: !!localStorage.getItem(TAB_DONE_KEY("simulador")),
      emergencia: !!localStorage.getItem(TAB_DONE_KEY("emergencia")),
      cofre: !!localStorage.getItem(TAB_DONE_KEY("cofre")),
      impostos: !!localStorage.getItem(TAB_DONE_KEY("impostos")),
    });
  }, []);

  // Persiste renda em qualquer aba que a tenha
  function persistRenda(value: string) {
    if (value) localStorage.setItem(RENDA_KEY, value);
  }
  function handleRendaMedia(v: string)  { setRendaMedia(v);  persistRenda(v); }
  function handleRendaCofre(v: string)  { setRendaCofre(v);  persistRenda(v); }
  function handleRendaBruta(v: string)  { setRendaBruta(v);  persistRenda(v); }

  // Label "💾 Valor salvo" quando campo foi pré-preenchido do contexto
  const isFromContext = (value: string) => rendaContextoSaved !== "" && value === rendaContextoSaved;

  // Buscar média de gastos (Supabase)
  useEffect(() => {
    if (plano !== "pro" && plano !== "premium") return;
    async function fetchMedia() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
      const { data } = await supabase
        .from("transactions")
        .select("valor")
        .eq("user_id", user.id)
        .eq("tipo", "saida")
        .gte("date", ninetyDaysAgo);
      if (data && data.length >= 10) {
        const total = data.reduce((sum, t) => sum + Math.abs(Number(t.valor)), 0);
        setMediaTransacoes(Math.round(total / 3));
      }
    }
    fetchMedia();
  }, [plano]);

  function markCurrentTabDone(currentTool: Tool) {
    const hasDone =
      (currentTool === "simulador" && !!rendaMedia) ||
      (currentTool === "emergencia" && !!gastosM) ||
      (currentTool === "cofre" && !!rendaCofre) ||
      (currentTool === "impostos" && !!rendaBruta);
    if (hasDone) {
      localStorage.setItem(TAB_DONE_KEY(currentTool), "1");
      setTabsDone(prev => ({ ...prev, [currentTool]: true }));
    }
  }

  function changeTool(newTool: Tool) {
    markCurrentTabDone(tool);
    setTool(newTool);
  }

  const TOOLS: { id: Tool; num: string; icon: React.ReactNode; label: string; desc: string }[] = [
    { id: "simulador", num: "1", icon: <Calculator size={18} />, label: "Mês Fraco", desc: "Simule meses de baixa renda" },
    { id: "emergencia", num: "2", icon: <Shield size={18} />, label: "Reserva", desc: "Calcule sua reserva de emergência" },
    { id: "cofre", num: "3", icon: <PiggyBank size={18} />, label: "Cofre Mensal", desc: "Guarde % fixa por recebimento" },
    { id: "impostos", num: "4", icon: <FileText size={18} />, label: "Impostos", desc: "Calcule DAS, carnê-leão e IRPF" },
  ];

  if (plano === null) return null;
  if (plano !== "pro" && plano !== "premium") return (
    <ProBanner
      feature="Finanças para Autônomos"
      descricao="Calculadora de impostos (MEI, autônomo, CLT), simulador de mês fraco, cofre mensal e reserva de emergência. Ferramentas exclusivas para freelancers e empreendedores."
    />
  );

  // ── CÁLCULOS ──

  // Simulador
  const rMedia = parseFloat(rendaMedia) || 0;
  const pctR = parseFloat(pctReserva) / 100;
  const reservaMensal = rMedia * pctR;
  const metaMesFraco = rMedia * (1 - pctR);

  // Reserva emergência
  const gastosEmerg = parseFloat(gastosM) || 0;
  const mesesEmergNum = parseInt(mesesEmerg);
  const totalEmerg = gastosEmerg * mesesEmergNum;
  const guardaMesNum = parseFloat(guardaMes) || 0;
  const mesesParaChegar = guardaMesNum > 0 ? Math.ceil(totalEmerg / guardaMesNum) : 0;

  // Cofre
  const rCofre = parseFloat(rendaCofre) || 0;
  const pctC = parseFloat(pctCofre) / 100;
  const cofreMensal = rCofre * pctC;
  const cofreLivre = rCofre * (1 - pctC);

  // Impostos — BUG FIX: liquidoFinal = bruto − totalImpostos (sem double-counting)
  const rBruta = parseFloat(rendaBruta) || 0;
  const inss = regime === "clt"
    ? calcularINSS(rBruta)
    : regime === "autonomo"
    ? rBruta * 0.20
    : 0; // MEI não tem INSS separado — já incluso no DAS
  // Desconto simplificado (R$ 528,50) entra só na base do IR, não é dedução extra
  const baseIR = regime === "mei" ? 0 : Math.max(0, rBruta - inss - 528.5);
  const ir = calcularIR(baseIR);
  const das = regime === "mei"
    ? (tipoMEI === "comercio" ? DAS_MEI_COMERCIO_2026 : DAS_MEI_SERVICO_2026)
    : 0;
  const totalImpostos = regime === "mei" ? das : inss + ir;
  const liquidoFinal = rBruta - totalImpostos; // sempre consistente: bruto − total

  const pctImpostosNum = rBruta > 0 ? (totalImpostos / rBruta) * 100 : 20;
  const pctImpostos = pctImpostosNum.toFixed(1);

  // Cofre breakdown — usa % de impostos calculada (ou 20% padrão)
  const impostosCofre = cofreMensal * (pctImpostosNum / 100);
  const reservaCofre = cofreMensal - impostosCofre;

  const currentAnchor = SLIDER_ANCHORS.find(a => a.value === mesesEmergNum);

  function NextButton({ current }: { current: Tool }) {
    const nextLabel = NEXT_LABEL[current];
    if (!nextLabel) return null;
    const nextTool = TOOLS_ORDER[TOOLS_ORDER.indexOf(current) + 1];
    return (
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e4f5e9", textAlign: "right" }}>
        <button onClick={() => changeTool(nextTool)}
          style={{ background: "#f0fdf4", border: "1.5px solid #00C853", color: "#00C853", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito, sans-serif" }}>
          Próximo: {nextLabel} →
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto" style={{ fontFamily: "Nunito, sans-serif" }}>
      <div className="mb-7">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h1 className="text-2xl font-black text-[#0d2414]">💼 Finanças para Autônomos</h1>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#085041", background: "#E1F5EE", padding: "2px 10px", borderRadius: 20 }}>Pro</span>
        </div>
        <p className="text-sm text-[#6b9e80]">Ferramentas exclusivas para MEI, freelancers e empreendedores</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {TOOLS.map(({ id, num, icon, label, desc }) => {
          const isDone = tabsDone[id];
          const isActive = tool === id;
          return (
            <button key={id} onClick={() => changeTool(id)}
              className={cn(
                "card text-left p-3.5 transition-all duration-150 border-2",
                isActive ? "border-[#16a34a] bg-[#f0fdf4] shadow-green" : "border-transparent hover:border-[#bbf7d0]"
              )}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: "#00C853", color: "#fff", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{num}</span>
                <span className={cn(isActive ? "text-[#16a34a]" : "text-[#6b9e80]")}>{icon}</span>
              </div>
              <p className="text-sm font-black text-[#0d2414]">{label}</p>
              <p className="text-xs text-[#6b9e80] mt-0.5 leading-tight">{desc}</p>
              {isDone && !isActive ? (
                <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 5 }}>
                  <CheckCircle size={10} color="#16a34a" />
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#16a34a" }}>Concluído</span>
                </div>
              ) : !isDone && !isActive ? (
                <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 5 }}>
                  <AlertCircle size={10} color="#f59e0b" />
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b" }}>Pendente</span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ── SIMULADOR MÊS FRACO ── */}
      {tool === "simulador" && (
        <div className="card p-6 space-y-5">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Calculator size={20} className="text-[#16a34a]" />
            <h2 className="text-lg font-black text-[#0d2414]">1. Simulador de Mês Fraco</h2>
          </div>
          <p className="text-sm text-[#6b9e80]">Descubra quanto guardar nos meses bons para aguentar os meses de baixa renda sem estresse.</p>

          <div>
            <label className="block text-xs font-bold text-[#6b9e80] mb-1.5 uppercase tracking-wide">Renda média mensal (R$)</label>
            <input type="number" value={rendaMedia} onChange={e => handleRendaMedia(e.target.value)} placeholder="Ex: 5000"
              className="input w-full" />
            {isFromContext(rendaMedia) && (
              <p style={{ fontSize: 11, color: "#6b9e80", marginTop: 4 }}>💾 Valor salvo — altere se necessário</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6b9e80] mb-1.5 uppercase tracking-wide">% para reservar nos meses bons: {pctReserva}%</label>
            <input type="range" min="10" max="50" step="5" value={pctReserva} onChange={e => setPctReserva(e.target.value)} className="w-full accent-[#16a34a]" />
            <div className="flex justify-between text-xs text-[#6b9e80] mt-1"><span>10% (mínimo)</span><span>50% (agressivo)</span></div>
          </div>

          {rMedia > 0 && (
            <>
              <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6b9e80", marginBottom: 2 }}>GUARDAR POR MÊS BOM</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#16a34a" }}>{formatBRL(reservaMensal)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6b9e80", marginBottom: 2 }}>VIVER COM</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#0d2414" }}>{formatBRL(metaMesFraco)}</div>
                  </div>
                </div>
                <div style={{ height: 8, background: "#e4f5e9", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pctReserva}%`, background: "#16a34a", borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 13, color: "#6b9e80", lineHeight: 1.6 }}>
                  💡 Em 3 meses bons guardando {pctReserva}%, você acumula <strong style={{ color: "#0d2414" }}>{formatBRL(reservaMensal * 3)}</strong> — suficiente para 1 mês fraco completo sem trabalhar.
                </div>
              </div>
              <NextButton current="simulador" />
            </>
          )}
        </div>
      )}

      {/* ── RESERVA DE EMERGÊNCIA ── */}
      {tool === "emergencia" && (
        <div className="card p-6 space-y-5">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Shield size={20} className="text-[#16a34a]" />
            <h2 className="text-lg font-black text-[#0d2414]">2. Reserva de Emergência</h2>
            <div style={{ position: "relative", display: "inline-flex" }}>
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(v => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
                <HelpCircle size={16} color="#6b9e80" />
              </button>
              {showTooltip && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)",
                  background: "#1a3a1a", borderRadius: 10, padding: "12px 14px",
                  maxWidth: 250, fontSize: 12, color: "#fff", lineHeight: 1.6, zIndex: 50,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.30)", whiteSpace: "normal", width: "max-content",
                }}>
                  Para autônomos, a recomendação é de 6 a 12 meses de gastos essenciais — o dobro do recomendado para CLT — porque a renda é variável e não há seguro-desemprego.
                  <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 10, height: 10, background: "#1a3a1a" }} />
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-[#6b9e80]">Para autônomos, a reserva ideal é de 6 a 12 meses — bem mais que os 3 meses recomendados para CLT.</p>

          {mediaTransacoes !== null && (
            <div style={{ background: "#fff8e6", border: "1px solid #fde047", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#713f12", lineHeight: 1.5 }}>
                📊 Com base nas suas transações: <strong>{formatBRL(mediaTransacoes)}/mês</strong> — usar este valor?
              </span>
              <button onClick={() => setGastosM(String(mediaTransacoes))}
                style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", background: "none", border: "1.5px solid #16a34a", borderRadius: 7, padding: "4px 12px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                Usar
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#6b9e80] mb-1.5 uppercase tracking-wide">Gastos mensais essenciais (R$)</label>
            <input type="number" value={gastosM} onChange={e => setGastosM(e.target.value)} placeholder="Aluguel + contas + alimentação"
              className="input w-full" />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6b9e80] mb-1.5 uppercase tracking-wide">
              Meses de cobertura desejados: {mesesEmerg}{currentAnchor ? ` — ${currentAnchor.label.toUpperCase()}` : ""}
            </label>
            <input type="range" min="3" max="12" step="1" value={mesesEmerg} onChange={e => setMesesEmerg(e.target.value)} className="w-full accent-[#16a34a]" />
            <div style={{ display: "flex", marginTop: 6 }}>
              {SLIDER_ANCHORS.map(anchor => {
                const isActive = mesesEmergNum === anchor.value;
                return (
                  <div key={anchor.value} style={{ position: "relative", flex: anchor.value === 12 ? 0 : 1, textAlign: anchor.value === 12 ? "right" : "left" }}>
                    <div style={{ fontSize: 10, fontWeight: isActive ? 800 : 600, color: isActive ? "#16a34a" : "#bbb" }}>{anchor.value}m</div>
                    <div style={{ fontSize: 9, fontWeight: isActive ? 700 : 400, color: isActive ? "#16a34a" : "#ccc", lineHeight: 1.3, maxWidth: anchor.value === 12 ? "none" : 60 }}>
                      {anchor.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {gastosEmerg > 0 && (
            <>
              <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b9e80", marginBottom: 4 }}>META DE RESERVA</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#16a34a", marginBottom: 12 }}>{formatBRL(totalEmerg)}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444" }}>
                    <span>{mesesEmerg} meses × {formatBRL(gastosEmerg)}/mês</span>
                    <strong style={{ color: "#0d2414" }}>{formatBRL(totalEmerg)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444" }}>
                    <span>Onde guardar</span>
                    <strong style={{ color: "#16a34a" }}>Tesouro Selic ou CDB DI</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444" }}>
                    <span>Rendimento atual (SELIC)</span>
                    <strong style={{ color: "#16a34a" }}>~14,75% a.a.</strong>
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: "#6b9e80", background: "#fff", borderRadius: 8, padding: "10px 14px" }}>
                  💡 Com {formatBRL(totalEmerg)} no Tesouro Selic, você ganha aproximadamente {formatBRL(totalEmerg * 0.1475 / 12)}/mês enquanto a reserva fica parada.
                </div>
              </div>

              {/* Projeção — pré-preenchida com renda × 20% */}
              <div style={{ background: "#fff", border: "1.5px solid #e4f5e9", borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b9e80", marginBottom: 10 }}>📈 PROJEÇÃO PERSONALIZADA</div>
                <label style={{ fontSize: 12, color: "#6b9e80", display: "block", marginBottom: 6 }}>Quanto posso guardar por mês?</label>
                <input
                  type="number"
                  value={guardaMes}
                  onChange={e => setGuardaMes(e.target.value)}
                  placeholder="Ex: 500"
                  className="input w-full"
                  style={{ marginBottom: 6 }}
                />
                {guardaMes && rendaContextoSaved && guardaMes === String(Math.round(parseFloat(rendaContextoSaved) * 0.20)) && (
                  <p style={{ fontSize: 11, color: "#6b9e80", marginBottom: 6 }}>💾 Calculado automaticamente como 20% da sua renda</p>
                )}
                {guardaMesNum > 0 && (
                  <div style={{ fontSize: 14, color: "#0d2414", fontWeight: 700, padding: "10px 14px", background: "#f0fdf4", borderRadius: 8 }}>
                    Você chega em <span style={{ color: "#16a34a", fontSize: 18 }}>{mesesParaChegar} meses</span>
                    {mesesParaChegar > 24 && <span style={{ fontSize: 12, color: "#6b9e80", fontWeight: 400 }}> — considere aumentar o valor mensal</span>}
                  </div>
                )}
              </div>

              <button onClick={() => changeTool("cofre")}
                style={{ width: "100%", padding: "14px 0", background: "#16a34a", color: "#fff", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 800, cursor: "pointer", transition: "opacity .15s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = ".88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                Configurar Cofre Mensal →
              </button>
              <NextButton current="emergencia" />
            </>
          )}
        </div>
      )}

      {/* ── COFRE MENSAL ── */}
      {tool === "cofre" && (
        <div className="card p-6 space-y-5">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <PiggyBank size={20} className="text-[#16a34a]" />
            <h2 className="text-lg font-black text-[#0d2414]">3. Cofre por Recebimento</h2>
          </div>
          <p className="text-sm text-[#6b9e80]">A estratégia mais eficaz para autônomos: cada vez que receber, separe automaticamente uma % antes de gastar qualquer coisa.</p>

          <div>
            <label className="block text-xs font-bold text-[#6b9e80] mb-1.5 uppercase tracking-wide">Valor recebido (R$)</label>
            <input type="number" value={rendaCofre} onChange={e => handleRendaCofre(e.target.value)} placeholder="Ex: 3000"
              className="input w-full" />
            {isFromContext(rendaCofre) && (
              <p style={{ fontSize: 11, color: "#6b9e80", marginTop: 4 }}>💾 Valor salvo — altere se necessário</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6b9e80] mb-1.5 uppercase tracking-wide">% para separar imediatamente: {pctCofre}%</label>
            <input type="range" min="10" max="50" step="5" value={pctCofre} onChange={e => setPctCofre(e.target.value)} className="w-full accent-[#16a34a]" />
            <div className="flex justify-between text-xs text-[#6b9e80] mt-1"><span>10%</span><span>50%</span></div>
          </div>

          {rCofre > 0 && (
            <>
              <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "20px 24px" }}>
                {/* Totais */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", marginBottom: 4 }}>COFRE TOTAL</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#16a34a" }}>{formatBRL(cofreMensal)}</div>
                  </div>
                  <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b9e80", marginBottom: 4 }}>LIVRE PARA GASTAR</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#0d2414" }}>{formatBRL(cofreLivre)}</div>
                  </div>
                </div>

                {/* Breakdown do cofre */}
                <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6b9e80", marginBottom: 10, textTransform: "uppercase" }}>Como dividir o cofre</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#444", paddingBottom: 10, borderBottom: "1px dashed #e4f5e9", marginBottom: 10 }}>
                    <span>🏛️ Impostos/DAS estimados <span style={{ fontSize: 11, color: "#9ca3af" }}>({pctImpostos}%)</span></span>
                    <strong style={{ color: "#ef4444" }}>{formatBRL(impostosCofre)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#444" }}>
                    <span>🛡️ Para reserva de emergência</span>
                    <strong style={{ color: "#16a34a" }}>{formatBRL(reservaCofre)}</strong>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: "#9ca3af", lineHeight: 1.5 }}>
                    {rBruta > 0 ? `% baseada no cálculo da aba Impostos (${regime === "mei" ? "MEI" : regime === "clt" ? "CLT" : "Autônomo"})` : "% padrão de 20% — use a aba Impostos para refinar"}
                  </div>
                </div>

                <div style={{ marginTop: 12, fontSize: 13, color: "#6b9e80", lineHeight: 1.6 }}>
                  💡 Separe o cofre assim que receber, antes de gastar qualquer coisa.
                </div>
              </div>
              <NextButton current="cofre" />
            </>
          )}
        </div>
      )}

      {/* ── IMPOSTOS ── */}
      {tool === "impostos" && (
        <div className="card p-6 space-y-5">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <FileText size={20} className="text-[#16a34a]" />
            <h2 className="text-lg font-black text-[#0d2414]">4. Calculadora de Impostos 2026</h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6b9e80] mb-2 uppercase tracking-wide">Regime</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["clt", "mei", "autonomo"] as const).map(r => (
                <button key={r} onClick={() => setRegime(r)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `2px solid ${regime === r ? "#16a34a" : "#e4f5e9"}`, background: regime === r ? "#f0fdf4" : "#fff", color: regime === r ? "#16a34a" : "#6b9e80", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {r === "clt" ? "CLT" : r === "mei" ? "MEI" : "Autônomo"}
                </button>
              ))}
            </div>
          </div>

          {regime === "mei" && (
            <div>
              <label className="block text-xs font-bold text-[#6b9e80] mb-2 uppercase tracking-wide">Tipo de atividade</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["comercio", "servico"] as const).map(t => (
                  <button key={t} onClick={() => setTipoMEI(t)}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `2px solid ${tipoMEI === t ? "#16a34a" : "#e4f5e9"}`, background: tipoMEI === t ? "#f0fdf4" : "#fff", color: tipoMEI === t ? "#16a34a" : "#6b9e80", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {t === "comercio" ? "Comércio/Indústria" : "Serviços"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#6b9e80] mb-1.5 uppercase tracking-wide">
              {regime === "mei" ? "Faturamento mensal (R$)" : "Renda bruta mensal (R$)"}
            </label>
            <input type="number" value={rendaBruta} onChange={e => handleRendaBruta(e.target.value)}
              placeholder={regime === "mei" ? `Máx: ${formatBRL(MEI_LIMITE_MENSAL)}/mês` : "Ex: 5000"}
              className="input w-full" />
            {isFromContext(rendaBruta) && (
              <p style={{ fontSize: 11, color: "#6b9e80", marginTop: 4 }}>💾 Valor salvo — altere se necessário</p>
            )}
            {regime === "mei" && rBruta > MEI_LIMITE_MENSAL && (
              <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                ⚠️ Você está acima do limite MEI (R$ {MEI_LIMITE_MENSAL.toLocaleString("pt-BR")}/mês = R$ 169.440/ano). Considere migrar para ME.
              </p>
            )}
          </div>

          {rBruta > 0 && (
            <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "20px 24px" }}>
              {/* Líquido */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b9e80", marginBottom: 2 }}>LÍQUIDO MENSAL</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#16a34a" }}>{formatBRL(liquidoFinal)}</div>
                <div style={{ fontSize: 13, color: "#6b9e80" }}>{pctImpostos}% de impostos sobre a renda bruta</div>
              </div>

              {/* Breakdown de deduções */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6b9e80", padding: "8px 0", borderBottom: "1px solid #e4f5e9" }}>
                  <span>Renda bruta</span>
                  <strong style={{ color: "#0d2414" }}>{formatBRL(rBruta)}</strong>
                </div>
                {regime !== "mei" && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444", padding: "8px 0", borderBottom: "1px solid #e4f5e9" }}>
                    <span>INSS ({regime === "clt" ? "progressivo" : "autônomo 20%"})</span>
                    <strong style={{ color: "#ef4444" }}>− {formatBRL(inss)}</strong>
                  </div>
                )}
                {regime !== "mei" && ir > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444", padding: "8px 0", borderBottom: "1px solid #e4f5e9" }}>
                    <span>IR (carnê-leão / IRRF)</span>
                    <strong style={{ color: "#ef4444" }}>− {formatBRL(ir)}</strong>
                  </div>
                )}
                {regime !== "mei" && ir === 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6b9e80", padding: "8px 0", borderBottom: "1px solid #e4f5e9" }}>
                    <span>IR (carnê-leão / IRRF)</span>
                    <strong style={{ color: "#16a34a" }}>Isento</strong>
                  </div>
                )}
                {regime === "mei" && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444", padding: "8px 0", borderBottom: "1px solid #e4f5e9" }}>
                    <span>DAS MEI 2026 ({tipoMEI === "comercio" ? "Comércio" : "Serviços"}) — valor fixo</span>
                    <strong style={{ color: "#ef4444" }}>− {formatBRL(das)}</strong>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: "#0d2414", padding: "10px 0" }}>
                  <span>= Líquido mensal</span>
                  <strong style={{ color: "#16a34a" }}>{formatBRL(liquidoFinal)}</strong>
                </div>
              </div>

              {/* Dica contextual */}
              {regime === "mei" && (
                <div style={{ fontSize: 12, color: "#6b9e80", background: "#fff", borderRadius: 8, padding: "10px 14px" }}>
                  💡 O DAS MEI vence todo dia 20. Configure débito automático para não perder e manter seus benefícios previdenciários.
                </div>
              )}
              {regime === "autonomo" && (
                <div style={{ fontSize: 12, color: "#6b9e80", background: "#fff", borderRadius: 8, padding: "10px 14px" }}>
                  💡 Como autônomo, você paga 20% de INSS sobre a renda. Guarde esse valor assim que receber para não ser pego de surpresa no carnê-leão.
                </div>
              )}
              {regime === "clt" && (
                <div style={{ fontSize: 12, color: "#6b9e80", background: "#fff", borderRadius: 8, padding: "10px 14px" }}>
                  💡 Pela nova tabela 2026 (Lei 15.270/2025), rendas até R$ 5.000 têm isenção efetiva de IR com o redutor aplicado.
                </div>
              )}

              {/* Verificação: bruto − total = líquido (sanity check visual) */}
              <div style={{ marginTop: 12, fontSize: 11, color: "#9ca3af", background: "#fff", borderRadius: 8, padding: "8px 12px" }}>
                Verificação: {formatBRL(rBruta)} − {formatBRL(totalImpostos)} = {formatBRL(liquidoFinal)}
              </div>

              {/* Jornada completa */}
              <div style={{ paddingTop: 16, borderTop: "1px solid #e4f5e9", marginTop: 12, textAlign: "right" }}>
                <button
                  onClick={() => { setJornadaCompleta(true); markCurrentTabDone("impostos"); }}
                  style={{ background: jornadaCompleta ? "#00C853" : "#f0fdf4", border: "1.5px solid #00C853", color: jornadaCompleta ? "#fff" : "#00C853", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito, sans-serif" }}>
                  {jornadaCompleta ? "✓ Jornada completa! 🎉" : "✓ Marcar jornada como completa"}
                </button>
              </div>
              {jornadaCompleta && (
                <div style={{ background: "#f0fdf4", border: "1.5px solid #00C853", borderRadius: 12, padding: "20px 24px", textAlign: "center", marginTop: 12 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#1a3a1a" }}>Parabéns!</div>
                  <div style={{ fontSize: 13, color: "#6b9e80", marginTop: 6, lineHeight: 1.6 }}>
                    Você completou toda a jornada de Finanças para Autônomos. Continue assim — organização financeira é o que separa quem cresce de quem fica no mesmo lugar.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seções educacionais */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6b9e80", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Entenda seu regime</div>

            <CollapseSection title="📌 O que é o carnê-leão?" subtitle="Autônomos e profissionais liberais">
              <p style={{ fontSize: 13, color: "#6b9e80", lineHeight: 1.7, margin: "0 0 8px" }}>
                Autônomos precisam recolher o Imposto de Renda mensalmente por conta própria, através do <strong style={{ color: "#1a3a1a" }}>carnê-leão</strong> no portal da Receita Federal (app Meu Imposto de Renda).
              </p>
              <p style={{ fontSize: 13, color: "#6b9e80", lineHeight: 1.7, margin: "0 0 8px" }}>
                O vencimento é sempre no <strong style={{ color: "#1a3a1a" }}>último dia útil do mês seguinte</strong> ao recebimento. Exemplo: recebeu em julho → paga até 31 de agosto.
              </p>
              <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6, margin: 0 }}>
                💡 Guarde o valor do IR assim que receber — não gaste esse dinheiro.
              </p>
            </CollapseSection>

            <CollapseSection title="📌 Como funciona o INSS do autônomo?" subtitle="Contribuição individual — 20% da renda">
              <p style={{ fontSize: 13, color: "#6b9e80", lineHeight: 1.7, margin: "0 0 8px" }}>
                Diferente do CLT (que paga ~7,5–14%), o autônomo contribui com <strong style={{ color: "#1a3a1a" }}>20% sobre o salário de contribuição</strong> — você escolhe o valor entre o mínimo e o teto do INSS.
              </p>
              <p style={{ fontSize: 13, color: "#6b9e80", lineHeight: 1.7, margin: "0 0 8px" }}>
                A contribuição é <strong style={{ color: "#1a3a1a" }}>obrigatória</strong> para ter direito à aposentadoria, auxílio-doença e outros benefícios previdenciários.
              </p>
              <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6, margin: 0 }}>
                💡 Sem contribuição, você não tem cobertura em caso de doença ou acidente.
              </p>
            </CollapseSection>

            <CollapseSection title="📌 MEI paga menos imposto?" subtitle="DAS fixo de ~R$ 80/mês até R$ 169.440/ano">
              <p style={{ fontSize: 13, color: "#6b9e80", lineHeight: 1.7, margin: "0 0 8px" }}>
                Sim! O MEI paga um <strong style={{ color: "#1a3a1a" }}>DAS fixo</strong> de R$ {DAS_MEI_COMERCIO_2026.toFixed(2).replace(".", ",")} (comércio) ou R$ {DAS_MEI_SERVICO_2026.toFixed(2).replace(".", ",")} (serviços) por mês em 2026 — independentemente do quanto faturou.
              </p>
              <p style={{ fontSize: 13, color: "#6b9e80", lineHeight: 1.7, margin: "0 0 8px" }}>
                O limite é de <strong style={{ color: "#1a3a1a" }}>R$ 169.440/ano</strong> (R$ {MEI_LIMITE_MENSAL.toLocaleString("pt-BR")}/mês). Ideal para quem está começando ou tem renda mais baixa.
              </p>
              <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6, margin: 0 }}>
                💡 Se você já fatura mais que isso, considere migrar para ME ou Simples Nacional.
              </p>
            </CollapseSection>
          </div>
        </div>
      )}
    </div>
  );
}
