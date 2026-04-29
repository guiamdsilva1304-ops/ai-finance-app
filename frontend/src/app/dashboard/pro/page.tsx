"use client";
import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const PIX_KEY = "seu_pix_aqui@email.com"; // TROCA PELO SEU PIX
const PRECO = "R$ 29,00";

const FEATURES_FREE = [
  "✅ Controle de gastos e receitas",
  "✅ Metas financeiras",
  "✅ Dashboard financeiro",
  "✅ 10 mensagens/mês com o Assessor IA",
  "❌ Relatórios avançados",
  "❌ Alertas inteligentes de gastos",
  "❌ Assessor IA ilimitado",
];

const FEATURES_PRO = [
  "✅ Controle de gastos e receitas",
  "✅ Metas financeiras",
  "✅ Dashboard financeiro",
  "✅ Assessor IA ilimitado 🔥",
  "✅ Relatórios financeiros avançados 🔥",
  "✅ Alertas inteligentes de gastos 🔥",
  "✅ Suporte prioritário",
];

export default function ProPage() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showPix, setShowPix] = useState(false);
  const supabase = createSupabaseBrowser();
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("user_profiles").select("is_pro").eq("id", user.id).single();
      setIsPro(data?.is_pro || false);
      setLoading(false);
    }
    check();
  }, []);

  const copyPix = () => {
    navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "'Nunito', sans-serif" }}>Carregando...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0fdf4 0%, #fff 50%, #f0fdf4 100%)", fontFamily: "'Nunito', sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
          <h1 style={{ fontWeight: 900, fontSize: 36, color: "#0f172a", margin: "0 0 12px" }}>
            {isPro ? "Você já é iMoney Pro! 🎉" : "Desbloqueie o iMoney Pro"}
          </h1>
          <p style={{ color: "#64748b", fontSize: 18, margin: 0 }}>
            {isPro ? "Aproveite todos os recursos premium" : "Assessor IA ilimitado + relatórios avançados + alertas inteligentes"}
          </p>
        </div>

        {/* Planos */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 48 }}>
          {/* Free */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20, padding: 32 }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: "#64748b", marginBottom: 4 }}>Free</div>
            <div style={{ fontWeight: 900, fontSize: 36, color: "#0f172a", marginBottom: 24 }}>R$ 0<span style={{ fontSize: 16, fontWeight: 400, color: "#94a3b8" }}>/mês</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FEATURES_FREE.map((f, i) => (
                <div key={i} style={{ fontSize: 14, color: f.startsWith("❌") ? "#94a3b8" : "#0f172a" }}>{f}</div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div style={{ background: "linear-gradient(135deg, #14532d, #16a34a)", border: "none", borderRadius: 20, padding: 32, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 16, right: 16, background: "#fbbf24", color: "#0f172a", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 20 }}>MAIS POPULAR</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: "#86efac", marginBottom: 4 }}>Pro</div>
            <div style={{ fontWeight: 900, fontSize: 36, color: "#fff", marginBottom: 24 }}>R$ 29<span style={{ fontSize: 16, fontWeight: 400, color: "#86efac" }}>/mês</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FEATURES_PRO.map((f, i) => (
                <div key={i} style={{ fontSize: 14, color: "#fff" }}>{f}</div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        {!isPro && (
          <div style={{ background: "#fff", border: "2px solid #16a34a", borderRadius: 20, padding: 40, textAlign: "center" }}>
            <h2 style={{ fontWeight: 900, fontSize: 24, color: "#0f172a", margin: "0 0 8px" }}>Assinar iMoney Pro</h2>
            <p style={{ color: "#64748b", margin: "0 0 32px" }}>Pagamento único via PIX — ativação em até 2 horas</p>

            {!showPix ? (
              <button onClick={() => setShowPix(true)} style={{ background: "#16a34a", border: "none", borderRadius: 12, padding: "16px 48px", fontSize: 18, color: "#fff", cursor: "pointer", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>
                💳 Assinar por {PRECO}/mês
              </button>
            ) : (
              <div>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 16, padding: 32, marginBottom: 20 }}>
                  <div style={{ fontSize: 14, color: "#16a34a", fontWeight: 700, marginBottom: 8 }}>📱 Pague via PIX</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>{PRECO}</div>
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 20px", fontSize: 16, color: "#0f172a", fontFamily: "monospace", marginBottom: 16 }}>
                    {PIX_KEY}
                  </div>
                  <button onClick={copyPix} style={{ background: copied ? "#16a34a" : "#0f172a", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 14, color: "#fff", cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif", marginBottom: 16 }}>
                    {copied ? "✅ Copiado!" : "📋 Copiar chave PIX"}
                  </button>
                  <div style={{ fontSize: 13, color: "#64748b" }}>
                    Após o pagamento, envie o comprovante para <strong>suporte@imoney.app</strong><br />
                    Ativação em até 2 horas úteis
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>🔒 Pagamento seguro • Cancele quando quiser</div>
              </div>
            )}
          </div>
        )}

        {isPro && (
          <div style={{ background: "linear-gradient(135deg, #14532d, #16a34a)", borderRadius: 20, padding: 40, textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontWeight: 900, fontSize: 24, margin: "0 0 8px" }}>Você é iMoney Pro!</h2>
            <p style={{ color: "#86efac", margin: 0 }}>Aproveite todos os recursos sem limites</p>
          </div>
        )}
      </div>
    </div>
  );
}
