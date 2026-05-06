"use client";

import { useState } from "react";
import { createSupabaseBrowser as createClientComponentClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function TwoFactorVerify() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;

    setLoading(true);
    setError("");

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.find((f) => f.status === "verified");

    if (!totp) {
      setError("Fator de autenticação não encontrado.");
      setLoading(false);
      return;
    }

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totp.id,
    });

    if (challengeError) {
      setError("Erro ao iniciar verificação.");
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totp.id,
      challengeId: challengeData.id,
      code,
    });

    setLoading(false);

    if (verifyError) {
      setError("Código incorreto ou expirado. Tente novamente.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image src="/logo.png" alt="iMoney" width={48} height={48} />
        </div>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#00C853]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificação em duas etapas</h1>
          <p className="text-gray-500 text-sm">
            Abra seu aplicativo autenticador e insira o código de 6 dígitos.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000 000"
            className="w-full px-4 py-4 border border-gray-200 rounded-xl text-center text-3xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#00C853] focus:border-transparent transition"
            autoFocus
          />

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-[#00C853] hover:bg-[#00b348] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition text-sm"
          >
            {loading ? "Verificando..." : "Confirmar acesso"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          O código é gerado pelo Google Authenticator, Authy ou similar e se renova a cada 30 segundos.
        </p>
      </div>
    </div>
  );
}
