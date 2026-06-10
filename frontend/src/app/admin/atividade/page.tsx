"use client";
import ActivityFeed from "../_components/ActivityFeed";

export default function AdminAtividade() {
  return (
    <div className="px-5 pb-16 pt-7 text-[#dff0e3]" style={{ fontFamily: "'Nunito','Segoe UI',sans-serif" }}>
      <div className="mx-auto max-w-[800px]">
        <h1 className="mb-1 text-lg font-black text-white">📡 Feed de Atividade</h1>
        <p className="mb-5 text-xs text-[#3a6b45]">Tudo que acontece na plataforma. Clique num evento para abrir o usuário.</p>
        <ActivityFeed />
      </div>
    </div>
  );
}
