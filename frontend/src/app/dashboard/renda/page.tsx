"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/utils";
import { Calculator, Shield, PiggyBank, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = "simulador" | "emergencia" | "cofre" | "impostos";

// IR 2026 table with reducer Lei 15.270/2025
function calcularIR(rendaMensal: number): { aliquota: number; ir: number; liquido: number } {
  const base = rendaMensal;
  if (base <= 2824) return { aliquota: 0, ir: 0, liquido: base };
  if (base <= 3751.05) { const ir = base * 0.075 - 211.80; return { aliquota: 7.5, ir, liquido: base - ir }; }
  if (base <= 4664.68) { const ir = base * 0.15 - 492.78; return { aliquota: 15, ir, liquido: base - ir }; }
  if (base <= 5000) { const ir = base * 0.225 - 869.48; return { aliquota: 22.5, ir, liquido: base - ir }; }
  // Redutor Lei 15.270/2025 — isenção efetiva até R$5.000
  if (base <= 7000) {
    const ir = base * 0.275 - 1119.48;
    const redutor = Math.max(0, (7000 - base) / 2000 * ir);
    return { aliquota: 27.5, ir: ir - redutor, liquido: base - (ir - redutor) };
  }
  const ir = base * 0.275 - 1119.48;
  return { aliquota: 27.5, ir, liquido: base - ir };
}

function calcularINSS(renda: number): number {
  if (renda <= 1412) return renda * 0.075;
  if (renda <= 2666.68) return renda * 0.09;
  if (renda <= 4000.03) return renda * 0.12;
  if (renda <= 7786.02) return renda * 0.14;
  return 1089.04; // teto
}

export default function RendaPage() {
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
  const [dasMEI] = useState(81.05); // DAS MEI 2026

  const TOOLS: { id: Tool; icon: React.ReactNode; label: string; desc: string }[] = [
    { id: "simulador", icon: <Calculator size={18}/>, label: "Mês Fraco", desc: "Simule meses de baixa renda" },
    { id: "emergencia", icon: <Shield size={18}/>, label: "Reserva", desc: "Calcule sua reserva de emergência" },
    { id: "cofre", icon: <PiggyBank size={18}/>, label: "Cofre Mensal", desc: "Guarde % fixa por recebimento" },
    { id: "impostos", icon: <FileText size={18}/>, label: "Impostos", desc: "MEI, autônomo e CLT" },
  ];

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-black text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>
          🔀 Renda Variável
        </h1>
        <p className="text-sm text-[#6b9e80] mt-0.5">Ferramentas para freelancers, autônomos e empreendedores</p>
      </div>

      {/* Tool tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {TOOLS.map(({ id, icon, label, desc }) => (
          <button key={id} onClick={() => setTool(id)}
            className={cn(
              "card text-left p-3.5 transition-all duration-150 border-2",
              tool === id
                ? "border-[#16a34a] bg-[#f0fdf4] shadow-green"
                : "border-transparent hover:border-[#bbf7d0]"
            )}>
            <div className={cn("mb-2", tool === id ? "text-[#16a34a]" : "text-[#8db89d]")}>{icon}</div>
            <p className={cn("text-sm font-bold", tool === id ? "text-[#15803d]" : "text-[#0d2414]")}
              style={{ fontFamily: "Nunito, sans-serif" }}>{label}</p>
            <p className="text-[11px] text-[#8db89d] mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* ── SIMULADOR MÊS FRACO ── */}
      {tool === "simulador" && (
        <div className="card animate-fade-up opacity-0">
          <p className="font-bold text-[#0d2414] mb-5" style={{ fontFamily: "Nunito, sans-serif" }}>
            📉 Simulador de Mês Fraco
          </p>
          <div className="space-y-4 mb-5">
            <div>
              <label className="label">Renda média mensal (R$)</label>
              <input type="number" value={rendaMedia} onChange={e => setRendaMedia(e.target.value)}
                placeholder="5000" min="0" className="input"/>
            </div>
            <div>
              <label className="label">% do mês fraco vs média: {pctReserva}%</label>
              <input type="range" value={pctReserva} onChange={e => setPctReserva(e.target.value)}
                min="10" max="90" step="5" className="w-full accent-[#16a34a]"/>
              <div className="flex justify-between text-xs text-[#8db89d] mt-1">
                <span>10% (muito fraco)</span><span>90% (quase normal)</span>
              </div>
            </div>
          </div>
          {rendaMedia && (
            <div className="space-y-3">
              {(() => {
                const media = parseFloat(rendaMedia);
                const pct = parseFloat(pctReserva) / 100;
                const rendaFraca = media * pct;
                const queda = media - rendaFraca;
                const meses = [3, 6, 12];
                return (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="font-bold text-amber-800 text-sm mb-1">Cenário simulado</p>
                      <p className="text-2xl font-black text-amber-700" style={{ fontFamily: "Nunito, sans-serif" }}>
                        {formatBRL(rendaFraca)}
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        Queda de {formatBRL(queda)} ({(100 - parseFloat(pctReserva)).toFixed(0)}% a menos)
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#0d2414]">Reserve para aguentar meses fracos:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {meses.map(m => (
                        <div key={m} className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3 text-center">
                          <p className="text-xs text-[#6b9e80] font-bold">{m} meses</p>
                          <p className="font-black text-[#15803d] mt-1" style={{ fontFamily: "Nunito, sans-serif" }}>
                            {formatBRL(queda * m)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── RESERVA DE EMERGÊNCIA ── */}
      {tool === "emergencia" && (
        <div className="card animate-fade-up opacity-0">
          <p className="font-bold text-[#0d2414] mb-5" style={{ fontFamily: "Nunito, sans-serif" }}>
            🛡️ Reserva de Emergência
          </p>
          <div className="space-y-4 mb-5">
            <div>
              <label className="label">Gastos mensais essenciais (R$)</label>
              <input type="number" value={gastosM} onChange={e => setGastosM(e.target.value)}
                placeholder="3000" min="0" className="input"/>
            </div>
            <div>
              <label className="label">Meses de cobertura desejados: {mesesEmerg}</label>
              <input type="range" value={mesesEmerg} onChange={e => setMesesEmerg(e.target.value)}
                min="3" max="12" step="1" className="w-full accent-[#16a34a]"/>
              <div className="flex justify-between text-xs text-[#8db89d] mt-1">
                <span>3 meses (mínimo)</span><span>12 meses (ideal autônomo)</span>
              </div>
            </div>
          </div>
          {gastosM && (
            <div className="space-y-3">
              {(() => {
                const gastos = parseFloat(gastosM);
                const meta = gastos * parseInt(mesesEmerg);
                return (
                  <>
                    <div className="card-green p-4">
                      <p className="text-green-100 text-sm font-bold mb-1">Meta da sua reserva</p>
                      <p className="text-3xl font-black text-white" style={{ fontFamily: "Nunito, sans-serif" }}>
                        {formatBRL(meta)}
                      </p>
                      <p className="text-green-200 text-xs mt-1">{mesesEmerg} × {formatBRL(gastos)}/mês</p>
                    </div>
                    <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4">
                      <p className="text-sm font-bold text-[#0d2414] mb-2">Onde guardar a reserva:</p>
                      <ul className="text-sm text-[#4a7a5a] space-y-1">
                        {[
                          "✓ Tesouro Selic — liquidez diária, rende SELIC",
                          "✓ CDB liquidez diária 100%+ CDI",
                          "✓ Conta remunerada (Nubank, PicPay, Mercado Pago)",
                          "✗ Poupança — rendimento abaixo da inflação",
                          "✗ Ações e FIIs — não para reserva!",
                        ].map(t => <li key={t} className="text-xs">{t}</li>)}
                      </ul>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── COFRE MENSAL ── */}
      {tool === "cofre" && (
        <div className="card animate-fade-up opacity-0">
          <p className="font-bold text-[#0d2414] mb-5" style={{ fontFamily: "Nunito, sans-serif" }}>
            🐷 Cofre Mensal — Método Pague-se Primeiro
          </p>
          <div className="space-y-4 mb-5">
            <div>
              <label className="label">Valor que recebi hoje (R$)</label>
              <input type="number" value={rendaCofre} onChange={e => setRendaCofre(e.target.value)}
                placeholder="2500" min="0" className="input"/>
            </div>
            <div>
              <label className="label">% para guardar: {pctCofre}%</label>
              <input type="range" value={pctCofre} onChange={e => setPctCofre(e.target.value)}
                min="5" max="70" step="5" className="w-full accent-[#16a34a]"/>
            </div>
          </div>
          {rendaCofre && (
            <div className="space-y-3">
              {(() => {
                const renda = parseFloat(rendaCofre);
                const pct = parseFloat(pctCofre) / 100;
                const guardar = renda * pct;
                const gastar = renda - guardar;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="card-green p-4 text-center">
                        <p className="text-green-200 text-xs font-bold mb-1">GUARDAR AGORA</p>
                        <p className="text-2xl font-black text-white" style={{ fontFamily: "Nunito, sans-serif" }}>
                          {formatBRL(guardar)}
                        </p>
                        <p className="text-green-200 text-xs mt-1">{pctCofre}% do recebido</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                        <p className="text-amber-700 text-xs font-bold mb-1">DISPONÍVEL PARA GASTAR</p>
                        <p className="text-2xl font-black text-amber-800" style={{ fontFamily: "Nunito, sans-serif" }}>
                          {formatBRL(gastar)}
                        </p>
                        <p className="text-amber-600 text-xs mt-1">{(100 - parseFloat(pctCofre)).toFixed(0)}% do recebido</p>
                      </div>
                    </div>
                    <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3">
                      <p className="text-xs text-[#4a7a5a]">
                        💡 <strong>Regra de ouro:</strong> Ao receber qualquer valor, transfira imediatamente os {pctCofre}% para uma conta separada. O que fica na conta principal é tudo que pode gastar.
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── IMPOSTOS ── */}
      {tool === "impostos" && (
        <div className="card animate-fade-up opacity-0">
          <p className="font-bold text-[#0d2414] mb-5" style={{ fontFamily: "Nunito, sans-serif" }}>
            📄 Calculadora de Impostos 2026
          </p>
          <div className="space-y-4 mb-5">
            <div>
              <label className="label">Regime</label>
              <div className="grid grid-cols-3 gap-2">
                {(["clt","mei","autonomo"] as const).map(r => (
                  <button key={r} type="button" onClick={() => setRegime(r)}
                    className={cn("py-2.5 rounded-xl text-sm font-bold border transition-all",
                      regime === r
                        ? "bg-[#f0fdf4] border-[#16a34a] text-[#15803d]"
                        : "bg-white border-[#e4f5e9] text-[#8db89d] hover:bg-[#f8fdf9]"
                    )} style={{ fontFamily: "Nunito, sans-serif" }}>
                    {r === "clt" ? "CLT" : r === "mei" ? "MEI" : "Autônomo"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Renda bruta mensal (R$)</label>
              <input type="number" value={rendaBruta} onChange={e => setRendaBruta(e.target.value)}
                placeholder="5000" min="0" className="input"/>
            </div>
          </div>

          {rendaBruta && (() => {
            const bruta = parseFloat(rendaBruta);
            if (regime === "mei") {
              const liquido = bruta - dasMEI;
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="card bg-[#f8fdf9]">
                      <p className="metric-label mb-1">DAS MEI (fixo)</p>
                      <p className="metric-val text-amber-600">{formatBRL(dasMEI)}</p>
                      <p className="metric-sub">5% do salário mínimo</p>
                    </div>
                    <div className="card bg-[#f8fdf9]">
                      <p className="metric-label mb-1">Líquido estimado</p>
                      <p className="metric-val text-[#16a34a]">{formatBRL(liquido)}</p>
                    </div>
                  </div>
                  <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3 text-xs text-[#4a7a5a]">
                    <strong>Limite MEI 2026:</strong> R$ 81.000/ano (R$ 6.750/mês). Acima disso você deve migrar para ME.
                    MEI não recolhe IR sobre o pró-labore dentro do limite.
                  </div>
                </div>
              );
            }
            if (regime === "autonomo") {
              const inss = calcularINSS(bruta);
              const baseIR = Math.max(0, bruta - inss);
              const { ir, aliquota, liquido } = calcularIR(baseIR);
              const totalImposto = inss + ir;
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Renda bruta", val: formatBRL(bruta), color: "text-[#0d2414]" },
                      { label: "INSS", val: formatBRL(inss), color: "text-amber-600" },
                      { label: `IR (${aliquota}%)`, val: formatBRL(ir), color: "text-red-500" },
                      { label: "Líquido", val: formatBRL(liquido), color: "text-[#16a34a]" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="card bg-[#f8fdf9] text-center">
                        <p className="metric-label mb-1">{label}</p>
                        <p className={cn("metric-val", color)}>{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3 text-xs text-[#4a7a5a]">
                    Carga total: <strong>{formatBRL(totalImposto)}</strong> ({((totalImposto/bruta)*100).toFixed(1)}% da renda bruta).
                    Tabela IR 2026 com redutor Lei 15.270/2025 (isenção efetiva até R$ 5.000/mês).
                  </div>
                </div>
              );
            }
            // CLT
            const inss = calcularINSS(bruta);
            const baseIR = Math.max(0, bruta - inss);
            const { ir, aliquota, liquido } = calcularIR(baseIR);
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Salário bruto", val: formatBRL(bruta), color: "text-[#0d2414]" },
                    { label: "INSS", val: formatBRL(inss), color: "text-amber-600" },
                    { label: `IRRF (${aliquota}%)`, val: formatBRL(ir), color: "text-red-500" },
                    { label: "Líquido", val: formatBRL(liquido), color: "text-[#16a34a]" },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="card bg-[#f8fdf9] text-center">
                      <p className="metric-label mb-1">{label}</p>
                      <p className={cn("metric-val", color)}>{val}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3 text-xs text-[#4a7a5a]">
                  Cálculo estimado. Não inclui benefícios (VT, VR, plano de saúde) nem deduções de dependentes.
                  Para apuração exata consulte o holerite ou um contador.
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
