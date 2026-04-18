"use client";
import { Sidebar } from "@/components/layout/Sidebar";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string>();
  const [mounted, setMounted] = useState(false);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = "/";
      else setEmail(data.user.email ?? undefined);
    });
  }, []);

  if (!mounted) return (
    <div className="flex min-h-screen bg-[#f8fdf9] items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#16a34a] border-t-transparent animate-spin"/>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fdf9]">
      <Sidebar email={email} />
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
