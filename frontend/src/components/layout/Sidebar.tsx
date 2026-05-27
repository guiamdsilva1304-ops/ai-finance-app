'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { createSupabaseBrowser } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/imoney/primitives";
import { LogOut } from "lucide-react";
import { useState } from "react";

// ─── Perfis que veem Renda Variável ──────────────────────────────────────────

const RENDA_VARIAVEL_OCUPACOES = [
  'Empresário/Sócio',
  'Autônomo',
  'Freelancer',
  'MEI',
];

// ─── Nav builder ─────────────────────────────────────────────────────────────

function buildNavItems(ocupacao?: string): { href: string; icon: IconName; label: string }[] {
  const base = [
    { href: "/dashboard",               icon: 'home'        as IconName, label: "Dashboard" },
    { href: "/dashboard/assessor",      icon: 'sparkles'    as IconName, label: "Assessor" },
    { href: "/dashboard/transacoes",    icon: 'wallet'      as IconName, label: "Transações" },
    { href: "/dashboard/metas",         icon: 'target'      as IconName, label: "Metas" },
    { href: "/dashboard/investimentos", icon: 'trending-up' as IconName, label: "Investimentos" },
  ];

  const mostraRendaVariavel = ocupacao && RENDA_VARIAVEL_OCUPACOES.some(o =>
    ocupacao.toLowerCase().includes(o.toLowerCase())
  );

  if (mostraRendaVariavel) {
    base.push({ href: "/dashboard/renda", icon: 'pie' as IconName, label: "Renda Variável" });
  }

  return base;
}

// ─── Mobile nav ───────────────────────────────────────────────────────────────

const MOBILE_NAV_LEFT: { href: string; icon: IconName; label: string }[] = [
  { href: "/dashboard",            icon: 'home',   label: "Início" },
  { href: "/dashboard/transacoes", icon: 'wallet', label: "Transações" },
];

const MOBILE_NAV_RIGHT: { href: string; icon: IconName; label: string }[] = [
  { href: "/dashboard/assessor", icon: 'sparkles', label: "Assessor" },
  { href: "/dashboard/perfil",   icon: 'user',     label: "Você" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  email?: string;
  plan?: string;
  ocupacao?: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function Sidebar({ email, plan = 'free', ocupacao }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const supabase = createSupabaseBrowser();

  const navItems = buildNavItems(ocupacao);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("px-4 py-5 border-b border-[#e4f5e9]", collapsed && "px-3")}>
        <Logo size={collapsed ? 48 : 200} showText={false} showTagline={false} />
      </div>

      {/* Email */}
      {!collapsed && email && (
        <div className="px-4 py-2.5 border-b border-[#e4f5e9]">
          <p className="text-[11px] text-[#8db89d] truncate">{email}</p>
        </div>
      )}

      {/* Nav principal */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "nav-link",
                active && "active",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon name={icon} size={18} color={active ? '#1D9E75' : '#8db89d'} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Botão Pro / status de plano */}
      {!collapsed && plan === 'free' && (
        <div className="px-3 pb-3">
          <Link
            href="/dashboard/pro"
            className="flex items-center gap-2 w-full justify-center py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0a3d28 0%, #1D9E75 100%)' }}
          >
            <Icon name="sparkles" size={14} color="#fff" />
            Fazer upgrade
          </Link>
        </div>
      )}

      {!collapsed && plan === 'pro' && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 w-full justify-center py-2 px-4 rounded-xl text-xs font-bold" style={{ background: '#E1F5EE', color: '#085041' }}>
            <Icon name="sparkles" size={12} color="#085041" />
            iMoney Pro ativo
          </div>
        </div>
      )}

      {!collapsed && plan === 'premium' && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 w-full justify-center py-2 px-4 rounded-xl text-xs font-bold" style={{ background: '#FEF3C7', color: '#92400E' }}>
            ⭐ Premium
          </div>
        </div>
      )}

      {/* Bottom — Open Finance, Perfil, Sair */}
      <div className="px-3 pb-5 border-t border-[#e4f5e9] pt-3 space-y-1">
        {/* Open Finance */}
        <Link
          href="/dashboard/openfinance"
          className={cn(
            "nav-link",
            pathname.startsWith("/dashboard/openfinance") && "active",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Open Finance" : undefined}
        >
          <Icon
            name="compass"
            size={18}
            color={pathname.startsWith("/dashboard/openfinance") ? '#1D9E75' : '#8db89d'}
          />
          {!collapsed && <span>Open Finance</span>}
        </Link>

        {/* Meu Perfil */}
        <Link
          href="/dashboard/perfil"
          className={cn(
            "nav-link",
            pathname.startsWith("/dashboard/perfil") && "active",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Meu Perfil" : undefined}
        >
          <Icon
            name="user"
            size={18}
            color={pathname.startsWith("/dashboard/perfil") ? '#1D9E75' : '#8db89d'}
          />
          {!collapsed && <span>Meu Perfil</span>}
        </Link>

        {/* Sair */}
        <button
          onClick={logout}
          className={cn(
            "nav-link w-full text-left text-red-400 hover:text-red-500 hover:bg-red-50",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Sair" : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 border-r border-[#e4f5e9] bg-white transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 bg-white border border-[#e4f5e9] rounded-full p-0.5 shadow-sm hover:bg-[#f0faf6] transition-colors"
        >
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={14} color="#1D9E75" />
        </button>
      </aside>

      {/* Mobile bottom navigation */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e4f5e9] flex items-end justify-around px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 72 }}
      >
        {MOBILE_NAV_LEFT.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
              style={{ color: active ? '#1D9E75' : '#aaa' }}
            >
              <div className={cn("p-1.5 rounded-xl transition-all", active && "bg-[#E1F5EE]")}>
                <Icon name={icon} size={20} color={active ? '#1D9E75' : '#aaa'} />
              </div>
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500 }}>{label}</span>
            </Link>
          );
        })}

        {/* FAB — Adicionar meta */}
        <Link
          href="/dashboard/metas?add=true"
          style={{
            width: 54, height: 54, borderRadius: '50%',
            background: '#1D9E75', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 14, boxShadow: '0 4px 18px rgba(29,158,117,0.45)',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#fff', fontSize: 30, fontWeight: 300, lineHeight: 1, marginTop: -2 }}>+</span>
        </Link>

        {MOBILE_NAV_RIGHT.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
              style={{ color: active ? '#1D9E75' : '#aaa' }}
            >
              <div className={cn("p-1.5 rounded-xl transition-all", active && "bg-[#E1F5EE]")}>
                <Icon name={icon} size={20} color={active ? '#1D9E75' : '#aaa'} />
              </div>
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500 }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
