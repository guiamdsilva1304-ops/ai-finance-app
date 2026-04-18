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
