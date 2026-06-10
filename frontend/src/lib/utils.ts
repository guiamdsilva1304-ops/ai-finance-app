import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatBRL(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    const s = Math.abs(value) >= 1_000_000 ? "M" : "k";
    const d = Math.abs(value) >= 1_000_000 ? 1_000_000 : 1_000;
    return `R$ ${(value / d).toFixed(1)}${s}`;
  }
  return new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(value);
}
export function formatPct(v: number, d = 1) { return `${v >= 0 ? "+" : ""}${v.toFixed(d)}%`; }
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" });
}
export function getScoreColor(s: number) { return s >= 70 ? "#16a34a" : s >= 45 ? "#f59e0b" : "#ef4444"; }
export function getScoreLabel(s: number) {
  if (s >= 80) return "Excelente";
  if (s >= 65) return "Muito Bom";
  if (s >= 50) return "Regular";
  if (s >= 35) return "Atenção";
  return "Crítico";
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

const LEADING_EMOJI = /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*/u;

export function metaEmoji(nome: string): string {
  // Se o usuário já colocou emoji no nome (padrão do onboarding), ele tem prioridade
  const proprio = nome.match(LEADING_EMOJI);
  if (proprio) return proprio[1];
  const n = nome.toLowerCase();
  if (n.includes("reserva") || n.includes("emergên") || n.includes("emergenc")) return "🏦";
  if (n.includes("viagem") || n.includes("férias") || n.includes("ferias") || n.includes("europa") || n.includes("eua")) return "✈️";
  if (n.includes("carro") || n.includes("auto") || n.includes("moto") || n.includes("trocar")) return "🚗";
  if (n.includes("casa") || n.includes("apto") || n.includes("imóv") || n.includes("entrada")) return "🏡";
  if (n.includes("casamento") || n.includes("noivado") || n.includes("anel")) return "💍";
  if (n.includes("estud") || n.includes("curso") || n.includes("faculd") || n.includes("mba")) return "📚";
  if (n.includes("invest") || n.includes("bolsa") || n.includes("ação")) return "📈";
  if (n.includes("celular") || n.includes("iphone") || n.includes("notebook")) return "📱";
  if (n.includes("filho") || n.includes("bebê") || n.includes("filhos")) return "👶";
  if (n.includes("aposent") || n.includes("reform")) return "🌴";
  if (n.includes("div") || n.includes("empréstimo")) return "💳";
  return "🎯";
}

export function metaNomeLimpo(nome: string): string {
  return nome.replace(LEADING_EMOJI, "");
}
