"use client";

import { useState } from "react";
import { createSupabaseBrowser as createClientComponentClient } from "@/lib/supabase";

type Step = "idle" | "qr" | "verify" | "done";

export default function TwoFactorSetup() {
  const supabase = createClientComponentClient();
  const [step, setStep] = useState<Step>("idle");
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [existingFactorId, setExistingFactorId] = useState<string | null>(null);

  useState(() => { checkStatus(); });

  async function checkStatus() {
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.find((f) => f.status === "verified");
    setIsEnabled(!!totp);
    setExistingFactorId(totp?.id || null);
  }

  async function startEnroll() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "iMoney" });
    setLoading(false);
    if (error || !data) { setError("Erro ao iniciar configuração. Tente novamente."); return; }
    setQrCode(data.totp.qr_code);
    setFactorId(data.id);
    setStep("qr");
  }

  async function verifyTotp() {
    if (totpCode.length !== 6) { setError("Digite o código de 6 dígitos."); return; }
    setLoading(true);
    setError("");
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) { setError("Erro ao criar desafio MFA."); setLoading(false); return; }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challengeData.id, code: totpCode });
    setLoading(false);
    if (verifyError) { setError("Código incorreto. Verifique e tente novamente."); return; }
    setIsEnabled(true);
    setExistingFactorId(factorId);
    setStep("done");
  }

  async function removeTotp() {
    if (!existingFactorId) return;
    setRemoving(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: existingFactorId });
    setRemoving(false);
    if (error) { setError("Erro ao desativar 2FA."); return; }
    setIsEnabled(false);
    setExistingFactorId(null);
    setStep("idle");
  }

  if (isEnabled && step !== "done") {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#00C853]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">Verificação em duas etapas</h3>
              <span className="text-xs bg-green-100 text-[#00C853] font-medium px-2 py-0.5 rounded-full">Ativa</span>
            </div>
            <p className="text-sm text-gray-500">Sua conta está protegida com autenticação por aplicativo.</p>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>
          <button onClick={removeTotp} disabled={removing} className="text-sm text-red-400 hover:text-red-600 transition disabled:opacity-50 flex-shrink-0">
            {removing ? "Removendo..." : "Desativar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">Verificação em duas etapas</h3>
          <p className="text-sm text-gray-500">Adicione uma camada extra de segurança usando um aplicativo autenticador (Google Authenticator, Authy etc.).</p>
        </div>
      </div>

      {step === "idle" && (
        <button onClick={startEnroll} disabled={loading} className="w-full bg-[#00C853] hover:bg-[#00b348] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm">
          {loading ? "Configurando..." : "Ativar verificação em duas etapas"}
        </button>
      )}

      {step === "qr" && (
        <div className="space-y-5">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">Escaneie o QR code com seu aplicativo autenticador:</p>
            <div className="inline-block p-3 bg-white border-2 border-gray-100 rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="QR Code 2FA" width={180} height={180} />
            </div>
            <p className="text-xs text-gray-400 mt-3">Use Google Authenticator, Authy ou similar</p>
          </div>
          <button onClick={() => setStep("verify")} className="w-full bg-[#00C853] hover:bg-[#00b348] text-white font-semibold py-3 rounded-xl transition text-sm">
            Já escaneei → Continuar
          </button>
          <button onClick={() => setStep("idle")} className="w-full text-gray-400 hover:text-gray-600 text-sm transition">Cancelar</button>
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código de verificação</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#00C853] focus:border-transparent transition"
            />
            <p className="text-xs text-gray-400 mt-1 text-center">Digite o código de 6 dígitos do seu aplicativo</p>
          </div>
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 text-center">{error}</div>}
          <button onClick={verifyTotp} disabled={loading || totpCode.length !== 6} className="w-full bg-[#00C853] hover:bg-[#00b348] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm">
            {loading ? "Verificando..." : "Confirmar e ativar"}
          </button>
          <button onClick={() => { setStep("qr"); setError(""); }} className="w-full text-gray-400 hover:text-gray-600 text-sm transition">← Voltar</button>
        </div>
      )}

      {step === "done" && (
        <div className="text-center py-2">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-[#00C853]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900 mb-1">2FA ativado com sucesso!</p>
          <p className="text-sm text-gray-500">Sua conta está ainda mais segura agora.</p>
        </div>
      )}
    </div>
  );
}
