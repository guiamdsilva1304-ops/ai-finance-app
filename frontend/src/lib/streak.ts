import type { SupabaseClient } from "@supabase/supabase-js";

// Streak por "semanas ativas": semana com >= 1 ação no app
// (transação registrada, mensagem ao Assessor ou meta criada).
// Quebrar streak diário é devastador; semana ativa preserva o hábito.

export interface StreakInfo {
  semanasAtivas: number;
  recordeSemanas: number;
  diasAtivosParaRecompensa: number;
  recompensaDisponivel: boolean;
  isoWeekAtual: string;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Domingo que encerra a semana ISO "2026-W24"
function fimDaSemanaISO(week: string): Date {
  const [y, w] = week.split("-W").map(Number);
  const jan4 = new Date(y, 0, 4);
  const dia = jan4.getDay() || 7;
  const segunda = new Date(y, 0, 4 - dia + 1 + (w - 1) * 7);
  return new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + 6);
}

// Sorteio determinístico por usuário+semana: parece aleatório, é reprodutível
export function pickReward(userId: string, week: string): number {
  const s = `${userId}:${week}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 3;
}

export async function loadStreakInfo(supabase: SupabaseClient, userId: string): Promise<StreakInfo> {
  const desde = new Date(Date.now() - 90 * 86400000).toISOString();

  const [txRes, chatRes, metasRes, perfilRes] = await Promise.all([
    supabase.from("transactions").select("created_at").eq("user_id", userId).gte("created_at", desde).limit(500),
    supabase.from("chat_history").select("created_at").eq("user_id", userId).eq("role", "user").gte("created_at", desde).limit(500),
    supabase.from("metas").select("created_at").eq("user_id", userId).gte("created_at", desde),
    supabase.from("user_profiles").select("last_reward_week").eq("user_id", userId).maybeSingle(),
  ]);

  const dias = new Set<string>();
  const semanas = new Set<string>();
  const registrar = (rows: Array<{ created_at: string | null }> | null) => {
    for (const r of rows ?? []) {
      if (!r.created_at) continue;
      const d = new Date(r.created_at);
      dias.add(dayKey(d));
      semanas.add(isoWeek(d));
    }
  };
  registrar(txRes.error ? null : txRes.data);
  registrar(chatRes.error ? null : chatRes.data);
  registrar(metasRes.error ? null : metasRes.data);

  const hoje = new Date();
  const isoWeekAtual = isoWeek(hoje);

  // Semanas consecutivas terminando na atual; a semana em curso ainda
  // sem ação não quebra a sequência (só conta quando ativa).
  const cursor = new Date(hoje);
  if (!semanas.has(isoWeek(cursor))) cursor.setDate(cursor.getDate() - 7);
  let semanasAtivas = 0;
  while (semanas.has(isoWeek(cursor))) {
    semanasAtivas++;
    cursor.setDate(cursor.getDate() - 7);
  }

  // Recorde dentro da janela de 90 dias
  let recordeSemanas = 0;
  let run = 0;
  const c2 = new Date(hoje);
  for (let i = 0; i < 14; i++) {
    if (semanas.has(isoWeek(c2))) { run++; recordeSemanas = Math.max(recordeSemanas, run); }
    else run = 0;
    c2.setDate(c2.getDate() - 7);
  }

  // Recompensa variável: a cada 7 dias ativos desde a última recompensa
  const lastRewardWeek = perfilRes.error ? null : (perfilRes.data?.last_reward_week ?? null);
  const cutoff = lastRewardWeek ? dayKey(fimDaSemanaISO(lastRewardWeek)) : null;
  const diasAtivosParaRecompensa = [...dias].filter(d => !cutoff || d > cutoff).length;
  const recompensaDisponivel = diasAtivosParaRecompensa >= 7 && lastRewardWeek !== isoWeekAtual;

  return { semanasAtivas, recordeSemanas, diasAtivosParaRecompensa, recompensaDisponivel, isoWeekAtual };
}
