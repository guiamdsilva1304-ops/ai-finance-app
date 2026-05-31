"use client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/imoney/primitives";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string>();
  const [plan, setPlan] = useState<string>('free');
  const [ocupacao, setOcupacao] = useState<string>();
  const [mounted, setMounted] = useState(false);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = "/"; return; }
      setEmail(data.user.email ?? undefined);
      const { data: perfil } = await supabase
        .from('user_profiles')
        .select('plan, ocupacao')
        .eq('user_id', data.user.id)
        .maybeSingle();
      setPlan(perfil?.plan ?? 'free');
      setOcupacao(perfil?.ocupacao ?? undefined);
      // Dispara email de boas-vindas no primeiro acesso (fire-and-forget)
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
    <div className="flex min-h-screen bg-[#f8fdf9] items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#16a34a] border-t-transparent animate-spin"/>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fdf9]">
      {/* Mobile header */}
      <div className="md:hidden bg-white border-b border-[#e4f5e9] px-4 py-3 flex items-center justify-between">
        <Logo size={100} showText={false} showTagline={false} />
        <div className="flex items-center gap-2">
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
              style={{ background: '#E1F5EE', color: '#085041' }}
            >
              <Icon name="sparkles" size={12} color="#085041" /> Pro
            </span>
          )}
          {/* Botão Sair — mobile */}
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
        <Sidebar email={email} plan={plan} ocupacao={ocupacao} />
        <main className="flex-1 min-w-0 pb-24 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
