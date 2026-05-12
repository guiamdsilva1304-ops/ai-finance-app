'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { createSupabaseBrowser } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/imoney/primitives";
import { LogOut } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS: { href: string; icon: IconName; label: string }[] = [
  { href: "/dashboard",               icon: 'home',        label: "Dashboard" },
  { href: "/dashboard/assessor",      icon: 'sparkles',    label: "Assessor" },
  { href: "/dashboard/transacoes",    icon: 'wallet',      label: "Transações" },
  { href: "/dashboard/metas",         icon: 'target',      label: "Metas" },
  { href: "/dashboard/investimentos", icon: 'trending-up', label: "Investimentos" },
  { href: "/dashboard/renda",         icon: 'pie',         label: "Renda Variável" },
  { href: "/dashboard/perfil",        icon: 'user',        label: "Meu Perfil" },
  { href: "/dashboard/openfinance",   icon: 'compass',     label: "Open Finance" },
];

const MOBILE_NAV_LEFT: { href: string; icon: IconName; label: string }[] = [
  { href: "/dashboard",         icon: 'home',   label: "Início" },
  { href: "/dashboard/metas",   icon: 'target', label: "Metas" },
];

const MOBILE_NAV_RIGHT: { href: string; icon: IconName; label: string }[] = [
  { href: "/dashboard/investimentos", icon: 'trending-up', label: "Investir" },
  { href: "/dashboard/perfil",        icon: 'user',        label: "Você" },
];

interface SidebarProps {
  email?: string;
  plan?: string;
}

export function Sidebar({ email, plan = 'free' }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const supabase = createSupabaseBrowser();

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

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon, label }) => {
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

      {/* Botão Pro */}
      {!collapsed && plan === 'free' && (
        <div className="px-3 pb-3">
          <Link
            href="/dashboard/pro"
            className="flex items-center gap-2 w-full justify-center py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0a3d28 0%, #1D9E75 100%)' }}
          >
            <Icon name="sparkles" size={14} color="#fff" />
            Assinar Pro
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

      {/* Bottom */}
      <div className="px-3 pb-5 border-t border-[#e4f5e9] pt-3 space-y-1">
        <button
          onClick={logout}
          className={cn("nav-link w-full text-left text-red-400 hover:text-red-500 hover:bg-red-50", collapsed && "justify-center px-2")}
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

      {/* Mobile top header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e4f5e9] px-4 py-3 flex items-center justify-between">
        <Logo size={100} showText={false} showTagline={false} />
        <div className="flex items-center gap-2">
          {plan === 'free' && (
            <Link href="/dashboard/pro" className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex items-center gap-1" style={{ background: '#1D9E75' }}>
              <Icon name="sparkles" size={12} color="#fff" /> Pro
            </Link>
          )}
          {plan === 'pro' && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: '#E1F5EE', color: '#085041' }}>
              <Icon name="sparkles" size={12} color="#085041" /> Pro
            </span>
          )}
        </div>
      </div>

      {/* Mobile bottom navigation with FAB */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e4f5e9] flex items-end justify-around px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 72 }}>
        {MOBILE_NAV_LEFT.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
              style={{ color: active ? '#1D9E75' : '#aaa' }}>
              <div className={cn("p-1.5 rounded-xl transition-all", active && "bg-[#E1F5EE]")}>
                <Icon name={icon} size={20} color={active ? '#1D9E75' : '#aaa'} />
              </div>
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500 }}>{label}</span>
            </Link>
          );
        })}

        {/* FAB */}
        <Link href="/dashboard/metas?add=true"
          style={{ width: 54, height: 54, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: '0 4px 18px rgba(29,158,117,0.45)', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: 30, fontWeight: 300, lineHeight: 1, marginTop: -2 }}>+</span>
        </Link>

        {MOBILE_NAV_RIGHT.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
              style={{ color: active ? '#1D9E75' : '#aaa' }}>
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
