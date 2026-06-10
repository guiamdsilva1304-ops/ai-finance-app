"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import KpiHeader from "./_components/KpiHeader";
import FunnelChart from "./_components/FunnelChart";
import AgentCards from "./_components/AgentCards";

const AGENTS = [
  { id:"blog", icon:"✍️", name:"Blog iMoney", desc:"Lucas gera artigos de SEO sobre finanças. Você aprova e publica.", status:"ativo", href:"/admin/blog" },
  { id:"marca", icon:"🎨", name:"Identidade Visual", desc:"Upload da logo e cores da iMoney usadas nas imagens geradas.", status:"ativo", href:"/admin/marca" },
  { id:"agentes", icon:"🤖", name:"Equipe de Agentes IA", desc:"Ana, Kai, Lucas, Pedro, Maya e Julia — sua empresa rodando 24h.", status:"ativo", href:"/admin/agentes" },
  { id:"marketing", icon:"📱", name:"Pipeline de Marketing", desc:"Lucas gera posts com IA + imagens DALL-E. Você aprova em 15 min.", status:"ativo", href:"/admin/marketing" },
  { id:"onboarding", icon:"🚀", name:"Onboarding & Vendas", desc:"Sequências de e-mail e WhatsApp para ativar usuários cadastrados.", status:"ativo", href:"/admin/agents/onboarding" },
  { id:"growth", icon:"📈", name:"Growth & Aquisição", desc:"Estratégias de aquisição e funis de conversão.", status:"em breve", href:"#" },
  { id:"feedback", icon:"🎯", name:"Feedback & UX", desc:"Analisa feedbacks e prioriza features.", status:"em breve", href:"#" },
  { id:"dados", icon:"📊", name:"Dados & Métricas", desc:"Relatórios de saúde do negócio.", status:"em breve", href:"#" },
  { id:"suporte", icon:"💬", name:"Suporte ao Usuário", desc:"Respostas para dúvidas e gestão de churn.", status:"em breve", href:"#" },
];

interface WaitlistEntry { id: string; email: string; created_at: string; user_id: string | null; }

export default function AdminDashboard() {
  const router = useRouter();
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    supabase
      .from("openfinance_interest")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error) setWaitlist(data ?? []);
      });
  }, [supabase]);

  return (
    <div className="text-[#dff0e3]" style={{ fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      <div className="mx-auto max-w-[1100px] px-5 pb-16 pt-7">

        {/* SAÚDE DO NEGÓCIO */}
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[#3a6b45]">💚 Saúde do negócio</h2>
        <KpiHeader />

        {/* FUNIL DE AQUISIÇÃO */}
        <h2 className="mb-3 mt-8 text-[13px] font-bold uppercase tracking-wider text-[#3a6b45]">🔻 Funil de aquisição</h2>
        <FunnelChart />

        {/* LISTA DE ESPERA */}
        <div className="mt-8 rounded-2xl border border-[#00C853]/15 bg-[#0e1a10] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="mb-0.5 text-[15px] font-extrabold text-white">🏦 Lista de Espera — Open Finance</div>
              <div className="text-xs text-[#3a6b45]">{waitlist.length} pessoas interessadas</div>
            </div>
            {waitlist.length > 0 && (
              <a
                href={`mailto:?bcc=${waitlist.map(w => w.email).join(",")}&subject=iMoney - Open Finance chegou!`}
                className="rounded-xl border border-[#00C853]/20 bg-[#00C853]/10 px-3.5 py-1.5 text-xs font-bold text-[#00C853]"
              >
                ✉️ Enviar e-mail para todos
              </a>
            )}
          </div>
          {waitlist.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#3a6b45]">Nenhum cadastro ainda.</div>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#00C853]/10">
                  {["E-mail","Data","Status"].map(h => (
                    <th key={h} className="px-2.5 py-2 text-left text-[11px] font-bold uppercase text-[#3a6b45]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {waitlist.map((entry, i) => (
                  <tr key={entry.id} className={`border-b border-[#00C853]/5 ${i % 2 === 0 ? "bg-[#00C853]/[0.02]" : ""}`}>
                    <td className="px-2.5 py-2.5 font-semibold text-[#dff0e3]">{entry.email}</td>
                    <td className="px-2.5 py-2.5 text-[#3a6b45]">{new Date(entry.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-2.5 py-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] ${entry.user_id ? "bg-[#00C853]/15 text-[#00C853]" : "bg-white/5 text-[#6b8f72]"}`}>
                        {entry.user_id ? "Usuário cadastrado" : "Visitante"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* CENTRAL DE AGENTES */}
        <h1 className="mb-1 mt-10 text-[26px] font-black tracking-tight text-white">Central de Agentes</h1>
        <p className="mb-5 text-sm text-[#6b8f72]">Status real de execução — dados de agent_logs e agent_budgets.</p>
        <AgentCards />

        <h2 className="mb-3 mt-8 text-[13px] font-bold uppercase tracking-wider text-[#3a6b45]">🧰 Ferramentas</h2>
        <div className="flex flex-wrap gap-2">
          {AGENTS.filter(a => a.status === "ativo").map(a => (
            <button
              key={a.id}
              onClick={() => router.push(a.href)}
              className="rounded-xl border border-[#00C853]/15 bg-[#0e1a10] px-3.5 py-2 text-xs font-bold text-[#dff0e3]/80 hover:border-[#00C853]/40"
            >
              {a.icon} {a.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
