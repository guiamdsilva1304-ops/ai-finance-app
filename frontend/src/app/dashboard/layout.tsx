"use client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/imoney/primitives";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { NPSToast } from "@/components/NPSToast";
import { StreakBadgeCompact } from "@/components/imoney/StreakBadge";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const [email, setEmail] = useState<string>();
  const [plan, setPlan] = useState<string>('free');
  const [ocupacao, setOcupacao] = useState<string>();
  const [displayName, setDisplayName] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = "/"; return; }
      const userEmail = data.user.email ?? '';
      setEmail(userEmail);
      const { data: perfil } = await supabase
        .from('user_profiles')
        .select('plan, ocupacao, nome_preferido, nome')
        .eq('user_id', data.user.id)
        .maybeSingle();
      setPlan(perfil?.plan ?? 'free');
      setOcupacao(perfil?.ocupacao ?? undefined);
      const dn =
        perfil?.nome_preferido ||
        ((perfil?.nome || '') as string).split(' ')[0] ||
        userEmail.split('@')[0].replace(/[._\-0-9]/g, ' ').trim().split(' ').filter(Boolean)[0] || '';
      setDisplayName(dn ? dn.charAt(0).toUpperCase() + dn.slice(1) : '');
      supabase.auth.getSession().then(({ data: s }) => {
        if (s.session?.access_token) {
          fetch('/api/onboarding/welcome', {
            method: 'POST',
            headers: { Authorization: `Bearer ${s.session.access_token}` },
          }).catch(() => {});
        }
      });
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (!mounted) return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-page)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-[#16a34a] border-t-transparent animate-spin"/>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {/* ── Bolão Copa 2026 — banner permanente ── */}
      {new Date() < new Date('2026-07-20') && (
        <Link
          href="/dashboard/bolao"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: '7px 16px', textDecoration: 'none',
            background: 'linear-gradient(90deg, #0d1f0d 0%, #1a3a1a 50%, #0d1f0d 100%)',
            borderBottom: '1px solid rgba(0,200,83,0.2)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>⚽</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#e8f0e8', fontFamily: 'Nunito, sans-serif', letterSpacing: 0.3 }}>
            Bolão Copa 2026
          </span>
          <span style={{ fontSize: 11, color: '#5a8a5a', fontFamily: 'Nunito, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#00C853', boxShadow: '0 0 4px #00C853' }} />
            Palpite e concorra ao Premium vitalício
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#00C853', fontFamily: 'Nunito, sans-serif', letterSpacing: 0.3 }}>
            Jogar agora →
          </span>
        </Link>
      )}
      <div className="md:hidden border-b px-4 py-3 flex items-center justify-between" style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Logo size={100} showText={false} showTagline={false} />
          {displayName && (
            <span className="text-sm font-bold truncate max-w-[120px]" style={{ color: 'var(--text-1)', fontFamily: 'Nunito, sans-serif' }}>
              {displayName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StreakBadgeCompact />
          {plan === 'free' && (
            <Link
              href="/dashboard/pro"
              className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex items-center gap-1"
              style={{ background: '#1D9E75' }}
            >
              <Icon name="sparkles" size={12} color="#fff" /> Pro
            </Link>
          )}
          {(plan === 'pro' || plan === 'premium') && (
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
              style={{ background: isDark ? '#1a3a22' : '#E1F5EE', color: isDark ? '#4ade80' : '#085041' }}
            >
              <Icon name="sparkles" size={12} color={isDark ? '#4ade80' : '#085041'} /> Pro
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
            title="Sair"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <Sidebar email={email} plan={plan} ocupacao={ocupacao} displayName={displayName} />
        <main className="flex-1 min-w-0 pb-24 md:pb-0">{children}</main>
      </div>

      <NPSToast />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </ThemeProvider>
  );
}
