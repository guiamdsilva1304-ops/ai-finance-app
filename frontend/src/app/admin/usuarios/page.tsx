"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import UserRadarTable, { type RadarUser } from "../_components/UserRadarTable";
import UserDrawer from "../_components/UserDrawer";
import { WhatsAppModal, EmailModal, type AlvoContato } from "../_components/ActionModals";

function UsuariosInner() {
  const router = useRouter();
  const params = useSearchParams();
  const drawerId = params.get("u");
  const [waAlvo, setWaAlvo] = useState<AlvoContato | null>(null);
  const [emailAlvo, setEmailAlvo] = useState<AlvoContato | null>(null);

  const abrirPerfil = (id: string) => router.push(`/admin/usuarios?u=${id}`);
  const fecharPerfil = () => router.push("/admin/usuarios");

  return (
    <div className="px-5 pb-16 pt-7 text-[#16241a]" style={{ fontFamily: "'Nunito','Segoe UI',sans-serif" }}>
      <div className="mx-auto max-w-[1100px]">
        <h1 className="mb-1 text-lg font-black text-[#16241a]">👥 Radar de Usuários</h1>
        <p className="mb-5 text-xs text-[#5c7568]">Ordenado por propensão a pagar. Clique numa linha para abrir o perfil completo.</p>

        <UserRadarTable
          onVerPerfil={abrirPerfil}
          onWhatsApp={(u: RadarUser) => setWaAlvo(u)}
          onEmail={(u: RadarUser) => setEmailAlvo(u)}
        />
      </div>

      {drawerId && (
        <UserDrawer
          userId={drawerId}
          onClose={fecharPerfil}
          onWhatsApp={setWaAlvo}
          onEmail={setEmailAlvo}
        />
      )}
      {waAlvo && <WhatsAppModal alvo={waAlvo} onClose={() => setWaAlvo(null)} />}
      {emailAlvo && <EmailModal alvo={emailAlvo} onClose={() => setEmailAlvo(null)} />}
    </div>
  );
}

export default function AdminUsuarios() {
  return (
    <Suspense fallback={<div className="p-7 text-sm text-[#5c7568]">Carregando…</div>}>
      <UsuariosInner />
    </Suspense>
  );
}
