"use client";

import { FONT } from "./tokens";

interface NextStepMeta {
  id: string;
  nome: string;
  valor_alvo: number;
  valor_atual: number;
  prazo_meses: number;
  created_at?: string;
}

const DIA_LABEL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function fmt(v: number): string {
  return Math.round(v).toLocaleString("pt-BR");
}

export function NextStepCard({ meta, preferredSaveDay }: { meta: NextStepMeta | null; preferredSaveDay: number | null }) {
  if (!meta || meta.valor_alvo <= 0 || meta.prazo_meses <= 0) return null;

  const falta = meta.valor_alvo - meta.valor_atual;
  if (falta <= 0) return null;

  const aporteMes = meta.valor_alvo / meta.prazo_meses;
  const hoje = new Date();
  const isDiaDeGuardar = preferredSaveDay !== null && hoje.getDay() === preferredSaveDay;

  // Progresso esperado pelo plano: meses decorridos desde a criação × aporte planejado
  const criada = meta.created_at ? new Date(meta.created_at) : hoje;
  const mesesDecorridos = Math.max(0, (hoje.getTime() - criada.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  const esperado = Math.min(meta.valor_alvo, aporteMes * mesesDecorridos);
  const delta = meta.valor_atual - esperado;

  let titulo: string;
  let cta: string | null;
  if (isDiaDeGuardar) {
    titulo = `Hoje é seu dia de guardar R$ ${fmt(aporteMes)}.`;
    cta = "Registrar agora →";
  } else if (delta >= 1) {
    titulo = `Você está R$ ${fmt(delta)} à frente do plano. 🔥`;
    cta = preferredSaveDay !== null
      ? `Próximo aporte: ${DIA_LABEL[preferredSaveDay]} →`
      : null;
  } else {
    titulo = `Guardar R$ ${fmt(aporteMes)} te mantém no ritmo de "${meta.nome}".`;
    cta = "Registrar →";
  }

  return (
    <a
      href={`/dashboard/metas/${meta.id}`}
      style={{
        display: "block", textDecoration: "none",
        background: "linear-gradient(135deg, #00C853 0%, #00E676 100%)",
        borderRadius: 18, padding: "16px 18px", marginBottom: 12,
        boxShadow: "0 6px 24px rgba(0,200,83,0.3)",
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 800, color: "rgba(10,31,10,0.55)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px", fontFamily: FONT }}>
        ▶ Próximo passo
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <p style={{ fontSize: 15, fontWeight: 900, color: "#0a1f0a", margin: 0, lineHeight: 1.35, fontFamily: FONT }}>
          {titulo}
        </p>
        {cta && (
          <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 800, color: "#0a1f0a", background: "rgba(255,255,255,0.45)", borderRadius: 10, padding: "8px 12px", whiteSpace: "nowrap", fontFamily: FONT }}>
            {cta}
          </span>
        )}
      </div>
    </a>
  );
}
