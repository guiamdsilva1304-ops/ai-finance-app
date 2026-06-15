"use client";
import { usePathname, useRouter } from "next/navigation";

const ITEMS = [
  { href: "/admin", icon: "🏠", label: "Overview" },
  { href: "/admin/usuarios", icon: "👥", label: "Usuários" },
  { href: "/admin/atividade", icon: "📡", label: "Atividade" },
  { href: "/admin/agentes", icon: "🤖", label: "Agentes" },
  { href: "/admin/assessor", icon: "💬", label: "Assessor Admin" },
  { href: "/admin/whatsapp", icon: "📱", label: "WhatsApp" },
  { href: "/admin/bolao", icon: "⚽", label: "Bolão Copa" },
  { href: "/admin/config", icon: "⚙️", label: "Configurações" },
];

export default function AdminSidebar({ open, onClose, onOpenCommandBar }: {
  open: boolean;
  onClose: () => void;
  onOpenCommandBar: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  return (
    <>
      {/* backdrop mobile */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-[#0a1a0a] border-r border-[#00C853]/10 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ fontFamily: "'Nunito','Segoe UI',sans-serif" }}
      >
        <div className="flex h-[60px] items-center gap-2.5 border-b border-[#00C853]/10 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00C853] text-base">💸</div>
          <span className="text-[15px] font-extrabold text-white">
            iMoney <span className="text-[#00C853]">Admin</span>
          </span>
        </div>

        <button
          onClick={onOpenCommandBar}
          className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-[#00C853]/15 bg-[#0e1a10] px-3 py-2 text-left text-xs text-[#86ad91] hover:border-[#00C853]/40"
        >
          <span>🔍 Buscar usuário…</span>
          <kbd className="rounded bg-[#07100a] px-1.5 py-0.5 text-[10px] font-bold text-[#86ad91]">⌘K</kbd>
        </button>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {ITEMS.map(item => {
            const active = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-colors ${
                  active
                    ? "bg-[#00C853]/10 text-[#00C853]"
                    : "text-[#dff0e3]/70 hover:bg-white/5 hover:text-[#dff0e3]"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="border-t border-[#00C853]/10 p-3">
          <button
            onClick={logout}
            className="w-full rounded-xl border border-[#ff5252]/30 px-3 py-2 text-xs font-bold text-[#ff5252] hover:bg-[#ff5252]/10"
          >
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
