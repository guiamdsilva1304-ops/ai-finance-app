// Score de propensão usado no Radar de Usuários do admin.
// Mantido em lib para tabela, drawer e assistente IA usarem o mesmo cálculo.

export interface ScoreInputs {
  last_login_at: string | null;
  temMeta: boolean;
  temTransacao7d: boolean;
  totalMsgs: number;
}

export type Segmento = "risco" | "engajado" | "alta";

export function calcularScore(u: ScoreInputs): number {
  let score = 0;
  if (u.last_login_at && Date.now() - new Date(u.last_login_at).getTime() <= 3 * 86_400_000) score += 30;
  if (u.temMeta) score += 20;
  if (u.temTransacao7d) score += 20;
  if (u.totalMsgs > 0) score += 30;
  return score;
}

export function segmentoDoScore(score: number): Segmento {
  if (score < 30) return "risco";
  if (score <= 70) return "engajado";
  return "alta";
}

export const SEGMENTO_LABEL: Record<Segmento, string> = {
  risco: "🔴 Em risco",
  engajado: "🟡 Engajado",
  alta: "🟢 Alta propensão",
};
