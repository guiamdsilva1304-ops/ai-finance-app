"use client";
import { Sidebar } from "@/components/layout/Sidebar";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string>();
  const [plan, setPlan] = useState<string>('free');
  const [mounted, setMounted] = useState(false);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = "/"; return; }
      setEmail(data.user.email ?? undefined);
      const { data: perfil } = await supabase
        .from('user_profiles')
        .select('plan')
        .eq('id', data.user.id)
        .single();
      if (perfil?.plan) setPlan(perfil.plan);
    });
  }, []);

  if (!mounted) return (
    <div className="flex min-h-screen bg-[#f8fdf9] items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#16a34a] border-t-transparent animate-spin"/>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fdf9]">
      <Sidebar email={email} plan={plan} />
      <main className="flex-1 min-w-0 overflow-x-hidden pb-20 md:pb-0">{children}</main>
    </div>
  );
}
