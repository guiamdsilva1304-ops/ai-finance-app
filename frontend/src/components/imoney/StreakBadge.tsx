"use client"

import { useCallback, useEffect, useState } from "react"
import { createSupabaseBrowser } from "@/lib/supabase"
import { loadStreakInfo, type StreakInfo } from "@/lib/streak"
import { WeeklyReward } from "./WeeklyReward"

export function StreakBadge() {
  const [info, setInfo] = useState<StreakInfo | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowser()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)
    setInfo(await loadStreakInfo(supabase, user.id))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div style={{
        background: "var(--bg-card)", borderRadius: 16, padding: "14px 16px",
        border: "1.5px solid var(--border)", marginBottom: 14,
        height: 64, animation: "pulse 1.5s infinite"
      }} />
    )
  }

  const semanas = info?.semanasAtivas ?? 0
  const recorde = info?.recordeSemanas ?? 0

  if (semanas === 0) {
    return (
      <a href="/dashboard/transacoes" style={{ textDecoration: "none", display: "block", marginBottom: 14 }}>
        <div style={{
          background: "var(--bg-card)", borderRadius: 16, padding: "14px 16px",
          border: "1.5px dashed var(--border)", display: "flex", alignItems: "center", gap: 12
        }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>🔥</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: "var(--text-1)", margin: "0 0 2px", fontFamily: "Nunito, sans-serif" }}>
              Sua primeira semana ativa começa agora
            </p>
            <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0 }}>
              Uma ação por semana mantém seu plano vivo →
            </p>
          </div>
        </div>
      </a>
    )
  }

  const isDestaque = semanas >= 4
  const bgColor = isDestaque
    ? "linear-gradient(135deg, #ff6b00 0%, #ff9500 100%)"
    : "var(--bg-card)"
  const borderColor = isDestaque ? "transparent" : "var(--border)"
  const textColor = isDestaque ? "#fff" : "var(--text-1)"
  const subColor = isDestaque ? "rgba(255,255,255,0.8)" : "var(--text-2)"
  const labelColor = isDestaque ? "rgba(255,255,255,0.7)" : "var(--text-3)"

  return (
    <>
      {info?.recompensaDisponivel && userId && (
        <WeeklyReward userId={userId} isoWeekAtual={info.isoWeekAtual} onClaimed={load} />
      )}
      <a href="/dashboard/transacoes" style={{ textDecoration: "none", display: "block", marginBottom: 14 }}>
        <div style={{
          background: bgColor,
          borderRadius: 16,
          padding: "14px 16px",
          border: `1.5px solid ${borderColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: isDestaque ? "0 4px 20px rgba(255,107,0,0.25)" : undefined,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 32, flexShrink: 0 }}>🔥</span>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: labelColor, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>
                Semanas ativas
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: textColor, lineHeight: 1, fontFamily: "Nunito, sans-serif" }}>
                  {semanas}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: subColor }}>
                  {semanas === 1 ? "semana" : "semanas"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            {isDestaque && (
              <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.9)", background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "2px 8px", display: "block", marginBottom: 4 }}>
                🏆 Incrível!
              </span>
            )}
            <p style={{ fontSize: 11, color: subColor, margin: 0, fontWeight: 600 }}>
              Recorde: {recorde} {recorde === 1 ? "semana" : "semanas"}
            </p>
          </div>
        </div>
      </a>
    </>
  )
}

// Versão compacta para o header — visão periférica em toda sessão
export function StreakBadgeCompact() {
  const [semanas, setSemanas] = useState<number | null>(null)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    let ativo = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const info = await loadStreakInfo(supabase, user.id)
      if (ativo) setSemanas(info.semanasAtivas)
    }
    load()
    return () => { ativo = false }
  }, [supabase])

  if (!semanas) return null

  return (
    <a href="/dashboard" title={`${semanas} ${semanas === 1 ? "semana ativa" : "semanas ativas"}`} style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      background: semanas >= 4 ? "linear-gradient(135deg, #ff6b00, #ff9500)" : "var(--bg-hover, #f0fdf4)",
      borderRadius: 999, padding: "4px 10px", textDecoration: "none",
      fontSize: 12, fontWeight: 800, fontFamily: "Nunito, sans-serif",
      color: semanas >= 4 ? "#fff" : "var(--text-1, #1a3a1a)",
    }}>
      🔥 {semanas}
    </a>
  )
}
