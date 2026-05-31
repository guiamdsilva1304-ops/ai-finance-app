"use client";
import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { ProBanner } from "@/components/ui/ProBanner";
import { formatBRL } from "@/lib/utils";
import { Calculator, Shield, PiggyBank, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = "simulador" | "emergencia" | "cofre" | "impostos";

function calcularIR(rendaMensal: number): { aliquota: number; ir: number; liquido: number } {
  if (rendaMensal <= 2824) return { aliquota: 0, ir: 0, liquido: rendaMensal };
  if (rendaMensal <= 3751.05) { const ir = rendaMensal * 0.075 - 211.80; return { aliquota: 7.5, ir, liquido: rendaMensal - ir }; }
  if (rendaMensal <= 4664.68) { const ir = rendaMensal * 0.15 - 492.78; return { aliquota: 15, ir, liquido: rendaMensal - ir }; }
  if (rendaMensal <= 5000) { const ir = rendaMensal * 0.225 - 869.48; return { aliquota: 22.5, ir, liquido: rendaMensal - ir }; }
  if (rendaMensal <= 7000) {
    const ir = rendaMensal * 0.275 - 1119.48;
    const redutor = Math.max(0, (7000 - rendaMensal) / 2000 * ir);
    return { aliquota: 27.5, ir: ir - redutor, liquido: rendaMensal - (ir - redutor) };
  }
  const ir = rendaMensal * 0.275 - 1119.48;
  return { aliquota: 27.5, ir, liquido: rendaMensal - ir };
}

function calcularINSS(renda: number): number {
  if (renda <= 1412) return renda * 0.075;
  if (renda <= 2666.68) return renda * 0.09;
  if (renda <= 4000.03) return renda * 0.12;
  if (renda <= 7786.02) return renda * 0.14;
  return 1089.04;
}

const DAS_MEI_2026 = 76.90; // DAS MEI 2026 (comércio/indústria)
const DAS_MEI_SERVICO_2026 = 80.90; // DAS MEI serviços

export default function RendaPage() {
  const supabase = createSupabaseBrowser()
  const [plano, setPlano] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: p } = await supabase.from("user_profiles").select("plan,ocupacao").eq("id", data.user.id).single()
        setPlano(p?.plan ?? "free")
      } else {
        setPlano("free")
      }
    })
  }, [])

  const [tool, setTool] = useState<Tool>("simulador");

  // Simulador mês fraco
  const [rendaMedia, setRendaMedia] = useState("");
  const [pctReserva, setPctReserva] = useState("20");

  // Emergência
  const [gastosM, setGastosM] = useState("");
  const [mesesEmerg, setMesesEmerg] = useState("6");

  // Cofre mensal
  const [rendaCofre, setRendaCofre] = useState("");
  const [pctCofre, setPctCofre] = useState("30");

  // Impostos
  const [rendaBruta, setRendaBruta] = useState("");
  const [regime, setRegime] = useState<"clt" | "mei" | "autonomo">("autonomo");
  const [tipoMEI, setTipoMEI] = useState<"comercio" | "servico">("comercio");

  const TOOLS: { id: Tool; icon: React.ReactNode; label: string; desc: string }[] = [
    { id: "simulador", icon: <Calculator size={18}/>, label: "Mês Fraco", desc: "Simule meses de baixa renda" },
    { id: "emergencia", icon: <Shield size={18}/>, label: "Reserva", desc: "Calcule sua reserva de emergência" },
    { id: "cofre", icon: <PiggyBank size={18}/>, label: "Cofre Mensal", desc: "Guarde % fixa por recebimento" },
    { id: "impostos", icon: <FileText size={18}/>, label: "Impostos", desc: "MEI, autônomo e CLT" },
  ];

  if (plano === null) return null
  if (plano === "free") return (
    <ProBanner
      feature="Finanças para Autônomos"
      descricao="Calculadora de impostos (MEI, autônomo, CLT), simulador de mês fraco, cofre mensal e reserva de emergência. Ferramentas exclusivas para freelancers e empreendedores."
    />
  )

  // Cálculos
  const rMedia = parseFloat(rendaMedia) || 0;
  const pctR = parseFloat(pctReserva) / 100;
  const reservaMensal = rMedia * pctR;
  const metaMesFraco = rMedia * (1 - pctR);

  const gastosEmerg = parseFloat(gastosM) || 0;
  const totalEmerg = gastosEmerg * parseInt(mesesEmerg);
  const tempoEmerg3 = gastosEmerg > 0 ? Math.ceil(totalEmerg / (gastosEmerg * 0.2)) : 0;

  const rCofre = parseFloat(rendaCofre) || 0;
  const pctC = parseFloat(pctCofre) / 100;
  const cofreMensal = rCofre * pctC;
  const cofreLivre = rCofre * (1 - pctC);

  const rBruta = parseFloat(rendaBruta) || 0;
  const inss = regime === "clt" ? calcularINSS(rBruta) : regime === "autonomo" ? rBruta * 0.20 : 0;
  const baseIR = regime === "mei" ? 0 : Math.max(0, rBruta - inss - 528.5);
  const { ir, liquido: liquidoIR } = calcularIR(baseIR);
  const das = regime === "mei" ? (tipoMEI === "comercio" ? DAS_MEI_2026 : DAS_MEI_SERVICO_2026) : 0;
  const liquidoFinal = regime === "mei" ? rBruta - das : liquidoIR - (regime === "clt" ? inss : inss);
  const totalImpostos = regime === "mei" ? das : inss + ir;
  const pctImpostos = rBruta > 0 ? (totalImpostos / rBruta * 100).toFixed(1) : "0";

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto" style={{ fontFamily: "Nunito, sans-serif" }}>
      <div className="mb-7">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h1 className="text-2xl font-black text-[#0d2414]">💼 Finanças para Autônomos</h1>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#085041", background: "#E1F5EE", padding: "2px 10px", borderRadius: 20 }}>Pro</span>
        </div>
        <p className="text-sm text-[#6b9e80]">Ferramentas exclusivas para MEI, freelancers e empreendedores</p>
      </div>

      {/* Tool tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {TOOLS.map(({ id, icon, label, desc }) => (
          <button key={id} onClick={() => setTool(id)}
            className={cn(
              "card text-left p-3.5 transition-all duration-150 border-2",
              tool === id ? "border-[#16a34a] bg-[#f0fdf4] shadow-green" : "border-transparent hover:border-[#bbf7d0]"
            )}>
            <span className={cn("mb-1.5 block", tool === id ? "text-[#16a34a]" : "text-[#6b9e80]")}>{icon}</span>
            <p className="text-sm font-black text-[#0d2414]">{label}</p>
            <p className="text-xs text-[#6b9e80] mt-0.5 leading-tight">{desc}</p>
          </button>
        ))}
      </div>

      {/* SIMULADOR MÊS FRACO */}
      {tool === "simulador" && (
        <div className="card p-6 space-y-5">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Calculator size={20} className="text-[#16a34a]"/>
            <h2 className="text-lg font-black text-[#0d2414]">Simulador de Mês Fraco</h2>
          </div>
          <p className="text-sm text-[#6b9e80]">Descubra quanto guardar nos meses bons para aguentar os meses de baixa renda sem estresse.</p>

          <div>
            <label className="block text-xs font-bold text-[#6b9e80] mb-1.5 uppercase tracking-wide">Renda média mensal (R$)</label>
            <input type="number" value={rendaMedia} onChange={e => setRendaMedia(e.target.value)} placeholder="Ex: 5000"
              className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6b9e80] mb-1.5 uppercase tracking-wide">% para reservar nos meses bons: {pctReserva}%</label>
            <input type="range" min="10" max="50" step="5" value={pctReserva} onChange={e => setPctReserva(e.target.value)} className="w-full accent-[#16a34a]"/>
            <div className="flex justify-between text-xs text-[#6b9e80] mt-1"><span>10% (mínimo)</span><span>50% (agressivo)</span></div>
          </div>

          {rMedia > 0 && (
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
                <div style={{ height: "100%", width: `${pctReserva}%`, background: "#16a34a", borderRadius: 4 }}/>
              </div>
              <div style={{ fontSize: 13, color: "#6b9e80", lineHeight: 1.6 }}>
                💡 Em 3 meses bons guardando {pctReserva}%, você acumula <strong style={{ color: "#0d2414" }}>{formatBRL(reservaMensal * 3)}</strong> — suficiente para 1 mês fraco completo sem trabalhar.
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESERVA DE EMERGÊNCIA */}
      {tool === "emergencia" && (
        <div className="card p-6 space-y-5">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Shield size={20} className="text-[#16a34a]"/>
            <h2 className="text-lg font-black text-[#0d2414]">Reserva de Emergência</h2>
          </div>
          <p className="text-sm text-[#6b9e80]">Para autônomos, a reserva ideal é de 6 a 12 meses — bem mais que os 3 meses recomendados para CLT.</p>

          <div>
            <label className="block text-xs font-bold text-[#6b9e80] mb-1.5 uppercase tracking-wide">Gastos mensais essenciais (R$)</label>
            <input type="number" value={gastosM} onChange={e => setGastosM(e.target.value)} placeholder="Aluguel + contas + alimentação"
              className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6b9e80] mb-1.5 uppercase tracking-wide">Meses de cobertura desejados: {mesesEmerg}</label>
            <input type="range" min="3" max="12" step="1" value={mesesEmerg} onChange={e => setMesesEmerg(e.target.value)} className="w-full accent-[#16a34a]"/>
            <div className="flex justify-between text-xs text-[#6b9e80] mt-1"><span>3 meses (mínimo)</span><span>12 meses (ideal autônomo)</span></div>
          </div>

          {gastosEmerg > 0 && (
            <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6b9e80", marginBottom: 4 }}>META DE RESERVA</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#16a34a", marginBottom: 12 }}>{formatBRL(totalEmerg)}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444" }}>
                  <span>Guardando 20% da renda/mês</span>
                  <strong>{tempoEmerg3} meses</strong>
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
                💡 Com {formatBRL(totalEmerg)} no Tesouro Selic, você ganha aproximadamente {formatBRL(totalEmerg * 0.1475 / 12)}/mês em rendimentos enquanto a reserva fica parada.
              </div>
            </div>
          )}
        </div>
      )}

      {/* COFRE MENSAL */}
      {tool === "cofre" && (
        <div className="card p-6 space-y-5">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <PiggyBank size={20} className="text-[#16a34a]"/>
            <h2 className="text-lg font-black text-[#0d2414]">Cofre por Recebimento</h2>
          </div>
          <p className="text-sm text-[#6b9e80]">A estratégia mais eficaz para autônomos: cada vez que receber, separe automaticamente uma % antes de gastar qualquer coisa.</p>

          <div>
            <label className="block text-xs font-bold text-[#6b9e80] mb-1.5 uppercase tracking-wide">Valor recebido (R$)</label>
            <input type="number" value={rendaCofre} onChange={e => setRendaCofre(e.target.value)} placeholder="Ex: 3000"
              className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6b9e80] mb-1.5 uppercase tracking-wide">% para separar imediatamente: {pctCofre}%</label>
            <input type="range" min="10" max="50" step="5" value={pctCofre} onChange={e => setPctCofre(e.target.value)} className="w-full accent-[#16a34a]"/>
            <div className="flex justify-between text-xs text-[#6b9e80] mt-1"><span>10%</span><span>50%</span></div>
          </div>

          {rCofre > 0 && (
            <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", marginBottom: 4 }}>COFRE (impostos + reserva)</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#16a34a" }}>{formatBRL(cofreMensal)}</div>
                </div>
                <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6b9e80", marginBottom: 4 }}>LIVRE PARA GASTAR</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#0d2414" }}>{formatBRL(cofreLivre)}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#6b9e80", lineHeight: 1.6 }}>
                💡 Do cofre de {formatBRL(cofreMensal)}: use parte para pagar impostos e DAS, e o restante vai para a sua reserva de emergência.
              </div>
            </div>
          )}
        </div>
      )}

      {/* IMPOSTOS */}
      {tool === "impostos" && (
        <div className="card p-6 space-y-5">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <FileText size={20} className="text-[#16a34a]"/>
            <h2 className="text-lg font-black text-[#0d2414]">Calculadora de Impostos 2026</h2>
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
            <input type="number" value={rendaBruta} onChange={e => setRendaBruta(e.target.value)}
              placeholder={regime === "mei" ? "Máx: R$ 9.400/mês" : "Ex: 5000"}
              className="input w-full" />
            {regime === "mei" && rBruta > 9400 && (
              <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>⚠️ Acima do limite MEI (R$ 9.400/mês). Considere migrar para ME.</p>
            )}
          </div>

          {rBruta > 0 && (
            <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b9e80", marginBottom: 2 }}>LÍQUIDO MENSAL</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#16a34a" }}>{formatBRL(liquidoFinal)}</div>
                <div style={{ fontSize: 13, color: "#6b9e80" }}>{pctImpostos}% de impostos sobre a renda bruta</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {regime !== "mei" && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444", padding: "8px 0", borderBottom: "1px solid #e4f5e9" }}>
                    <span>INSS ({regime === "clt" ? "descontado na fonte" : "autônomo 20%"})</span>
                    <strong style={{ color: "#ef4444" }}>- {formatBRL(inss)}</strong>
                  </div>
                )}
                {regime !== "mei" && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444", padding: "8px 0", borderBottom: "1px solid #e4f5e9" }}>
                    <span>IR na fonte</span>
                    <strong style={{ color: "#ef4444" }}>- {formatBRL(ir)}</strong>
                  </div>
                )}
                {regime === "mei" && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444", padding: "8px 0", borderBottom: "1px solid #e4f5e9" }}>
                    <span>DAS MEI 2026 ({tipoMEI === "comercio" ? "Comércio" : "Serviços"})</span>
                    <strong style={{ color: "#ef4444" }}>- {formatBRL(das)}</strong>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "#0d2414", padding: "8px 0" }}>
                  <span>Total de impostos</span>
                  <strong style={{ color: "#ef4444" }}>- {formatBRL(totalImpostos)}</strong>
                </div>
              </div>

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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
