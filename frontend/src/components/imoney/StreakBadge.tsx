"use client"

import { useEffect, useState } from "react"
import { createSupabaseBrowser } from "@/lib/supabase"

interface StreakData {
  control_streak_days: number
  control_streak_max: number
}

export function StreakBadge() {
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from("user_profiles")
        .select("control_streak_days, control_streak_max")
        .eq("user_id", user.id)
        .maybeSingle()

      setStreak(data ?? { control_streak_days: 0, control_streak_max: 0 })
      setLoading(false)
    }
    load()
  }, [supabase])

  if (loading) {
    return (
      <div style={{
        background: "#fff", borderRadius: 16, padding: "14px 16px",
        border: "1.5px solid #e4f5e9", marginBottom: 14,
        height: 64, animation: "pulse 1.5s infinite"
      }} />
    )
  }

  const dias = streak?.control_streak_days ?? 0
  const max = streak?.control_streak_max ?? 0
  const semStreakIniciada = dias === 0

  if (semStreakIniciada) {
    return (
      <a href="/dashboard/transacoes" style={{ textDecoration: "none", display: "block", marginBottom: 14 }}>
        <div style={{
          background: "#fff", borderRadius: 16, padding: "14px 16px",
          border: "1.5px dashed #d1fae5", display: "flex", alignItems: "center", gap: 12
        }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>🔥</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#0d2414", margin: "0 0 2px", fontFamily: "Nunito, sans-serif" }}>
              Comece sua sequência hoje
            </p>
            <p style={{ fontSize: 12, color: "#6b9e80", margin: 0 }}>
              Registre uma transação para iniciar seu streak
            </p>
          </div>
        </div>
      </a>
    )
  }

  const isDestaque = dias >= 7
  const bgColor = isDestaque
    ? "linear-gradient(135deg, #ff6b00 0%, #ff9500 100%)"
    : "#fff"
  const borderColor = isDestaque ? "transparent" : "#e4f5e9"
  const textColor = isDestaque ? "#fff" : "#0d2414"
  const subColor = isDestaque ? "rgba(255,255,255,0.8)" : "#6b9e80"
  const labelColor = isDestaque ? "rgba(255,255,255,0.7)" : "#8db89d"

  return (
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
              Sequência de controle
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: textColor, lineHeight: 1, fontFamily: "Nunito, sans-serif" }}>
                {dias}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: subColor }}>
                {dias === 1 ? "dia" : "dias"}
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
            Recorde: {max} {max === 1 ? "dia" : "dias"}
          </p>
        </div>
      </div>
    </a>
  )
}
