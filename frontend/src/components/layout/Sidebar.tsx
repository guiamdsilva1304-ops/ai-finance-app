"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { createSupabaseBrowser } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, MessageCircle, Receipt, Target,
  TrendingUp, User, BarChart3, Landmark, LogOut,
  ChevronLeft, ChevronRight, Menu, X,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard",              icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/assessor",     icon: MessageCircle,   label: "Assessor" },
  { href: "/dashboard/transacoes",   icon: Receipt,         label: "Transações" },
  { href: "/dashboard/metas",        icon: Target,          label: "Metas" },
  { href: "/dashboard/investimentos",icon: TrendingUp,      label: "Investimentos" },
  { href: "/dashboard/renda",        icon: BarChart3,       label: "Renda Variável" },
  { href: "/dashboard/perfil",       icon: User,            label: "Meu Perfil" },
  { href: "/dashboard/openfinance",  icon: Landmark,        label: "Open Finance" },
];

interface SidebarProps {
  email?: string;
}

export function Sidebar({ email }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createSupabaseBrowser();

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("px-4 py-5 border-b border-[#e4f5e9]", collapsed && "px-3")}>
        <Logo size={collapsed ? 48 : 72} showText={!collapsed} showTagline={!collapsed} />
      </div>

      {/* Email */}
      {!collapsed && email && (
        <div className="px-4 py-2.5 border-b border-[#e4f5e9]">
          <p className="text-[11px] text-[#8db89d] truncate">{email}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "nav-link",
                active && "active",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 border-t border-[#e4f5e9] pt-3 space-y-1">
        <button
          onClick={logout}
          className={cn(
            "nav-link w-full text-red-500 hover:bg-red-50 hover:text-red-600",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Sair" : undefined}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="nav-link w-full hidden lg:flex"
          title={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed
            ? <ChevronRight size={16} />
            : <><ChevronLeft size={16} /><span>Recolher</span></>
          }
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white border border-[#e4f5e9] rounded-xl p-2.5 shadow-card"
      >
        {mobileOpen ? <X size={20} className="text-[#15803d]" /> : <Menu size={20} className="text-[#15803d]" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen sticky top-0",
          "bg-white border-r border-[#e4f5e9] shadow-[1px_0_8px_rgba(20,83,45,0.06)]",
          "transition-all duration-200 shrink-0",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 h-full z-40 w-64 bg-white border-r border-[#e4f5e9] shadow-card",
          "transition-transform duration-250",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
