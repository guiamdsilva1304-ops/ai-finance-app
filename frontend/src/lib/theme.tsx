'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createSupabaseBrowser } from './supabase'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  isDark: boolean
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({ isDark: false, toggle: () => {} })

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    const cached = localStorage.getItem('imoney_theme')
    if (cached === 'dark') { setIsDark(true); applyTheme('dark') }

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      supabase.from('user_profiles')
        .select('theme')
        .eq('user_id', data.user.id)
        .maybeSingle()
        .then(({ data: p }) => {
          if (!p?.theme) return
          const t: Theme = p.theme === 'dark' ? 'dark' : 'light'
          setIsDark(t === 'dark')
          applyTheme(t)
          localStorage.setItem('imoney_theme', t)
        })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle() {
    const next = !isDark
    const t: Theme = next ? 'dark' : 'light'
    setIsDark(next)
    applyTheme(t)
    localStorage.setItem('imoney_theme', t)
    if (userId) {
      supabase.from('user_profiles')
        .update({ theme: t })
        .eq('user_id', userId)
        .then(() => {})
    }
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
