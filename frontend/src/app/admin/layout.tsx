"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./_components/AdminSidebar";
import CommandBar from "./_components/CommandBar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Login fica fora do chrome do admin
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#0d1f0d]" style={{ fontFamily: "'Nunito','Segoe UI',sans-serif" }}>
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenCommandBar={() => { setSidebarOpen(false); setCmdOpen(true); }}
      />
      <CommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* topbar mobile */}
      <div className="sticky top-0 z-20 flex h-[52px] items-center justify-between border-b border-[#00C853]/10 bg-[#0a1a0a] px-4 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg border border-[#00C853]/20 px-2.5 py-1.5 text-sm text-[#dff0e3]"
          aria-label="Abrir menu"
        >
          ☰
        </button>
        <span className="text-sm font-extrabold text-white">iMoney <span className="text-[#00C853]">Admin</span></span>
        <button
          onClick={() => setCmdOpen(true)}
          className="rounded-lg border border-[#00C853]/20 px-2.5 py-1.5 text-sm text-[#dff0e3]"
          aria-label="Buscar"
        >
          🔍
        </button>
      </div>

      <main className="h-[calc(100vh-52px)] overflow-y-auto lg:ml-60 lg:h-screen">
        {children}
      </main>
    </div>
  );
}
