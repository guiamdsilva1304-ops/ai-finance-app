"use client";
import { useEffect, useState } from "react";

export interface AlvoContato {
  nome: string | null;
  email: string | null;
  phone: string | null;
}

function templateWhatsApp(nome: string | null): string {
  const n = nome ? `, ${nome.split(" ")[0]}` : "";
  return `Oi${n}! 👋 Aqui é o Guilherme, fundador da iMoney. Vi que você anda usando o app e queria saber: o que está funcionando bem pra você? E o que está faltando? Sua resposta vai direto pra mim. 💚`;
}

function templateEmail(nome: string | null): { assunto: string; corpo: string } {
  const n = nome ? `, ${nome.split(" ")[0]}` : "";
  return {
    assunto: "Como está sendo sua experiência na iMoney?",
    corpo: `Oi${n}!\n\nAqui é o Guilherme, fundador da iMoney. Queria te ouvir: o que está funcionando bem? O que está faltando?\n\nResponde esse email que eu leio pessoalmente.\n\nUm abraço,\nGuilherme — iMoney`,
  };
}

function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-[#00C853]/20 bg-white p-5"
        onClick={e => e.stopPropagation()}
        style={{ fontFamily: "'Nunito','Segoe UI',sans-serif" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-[#16241a]">{titulo}</h3>
          <button onClick={onClose} className="text-[#5c7568] hover:text-[#16241a]">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function WhatsAppModal({ alvo, onClose }: { alvo: AlvoContato; onClose: () => void }) {
  const [texto, setTexto] = useState(templateWhatsApp(alvo.nome));
  const [copiado, setCopiado] = useState(false);
  const fone = (alvo.phone ?? "").replace(/\D/g, "");

  return (
    <Modal titulo={`📱 WhatsApp para ${alvo.nome ?? alvo.phone ?? ""}`} onClose={onClose}>
      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        rows={5}
        className="w-full rounded-xl border border-[#00C853]/15 bg-white p-3 text-[13px] text-[#16241a] outline-none focus:border-[#00C853]/50"
      />
      <div className="mt-3 flex gap-2">
        <a
          href={`https://wa.me/${fone}?text=${encodeURIComponent(texto)}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-xl bg-[#00C853] py-2.5 text-center text-[13px] font-extrabold text-[#0a1f0a]"
        >
          Abrir no WhatsApp →
        </a>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(texto);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          }}
          className="rounded-xl border border-[#00C853]/25 px-4 text-[13px] font-bold text-[#00C853]"
        >
          {copiado ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-[#5c7568]">Abre o WhatsApp Web/app com a mensagem pronta — envio pela API oficial chega na fase do canal WhatsApp.</p>
    </Modal>
  );
}

export function EmailModal({ alvo, onClose }: { alvo: AlvoContato; onClose: () => void }) {
  const t = templateEmail(alvo.nome);
  const [assunto, setAssunto] = useState(t.assunto);
  const [corpo, setCorpo] = useState(t.corpo);

  return (
    <Modal titulo={`✉️ Email para ${alvo.nome ?? alvo.email ?? ""}`} onClose={onClose}>
      <input
        value={assunto}
        onChange={e => setAssunto(e.target.value)}
        className="mb-2 w-full rounded-xl border border-[#00C853]/15 bg-white p-2.5 text-[13px] text-[#16241a] outline-none focus:border-[#00C853]/50"
      />
      <textarea
        value={corpo}
        onChange={e => setCorpo(e.target.value)}
        rows={7}
        className="w-full rounded-xl border border-[#00C853]/15 bg-white p-3 text-[13px] text-[#16241a] outline-none focus:border-[#00C853]/50"
      />
      <a
        href={`mailto:${alvo.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`}
        className="mt-3 block rounded-xl bg-[#00C853] py-2.5 text-center text-[13px] font-extrabold text-[#0a1f0a]"
      >
        Abrir no cliente de email →
      </a>
      <p className="mt-2 text-[10px] text-[#5c7568]">Envio direto via Resend chega na fase do canal WhatsApp (junto com broadcast).</p>
    </Modal>
  );
}
