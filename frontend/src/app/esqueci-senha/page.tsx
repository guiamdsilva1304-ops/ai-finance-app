"use client";

import { useState } from "react";
import Link from "next/link";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (res.status === 429) {
      setError("Muitas tentativas. Aguarde 1 hora antes de tentar novamente.");
      return;
    }

    if (!res.ok) {
      setError("Não foi possível enviar o email. Verifique o endereço e tente novamente.");
      return;
    }

    setSent(true);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/icon.svg" alt="iMoney" width={48} height={48} />
        </div>

        {!sent ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Esqueceu sua senha?
              </h1>
              <p className="text-gray-500 text-sm">
                Sem problema. Informe seu email e enviaremos um link para você criar uma nova senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00C853] focus:border-transparent transition"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-[#00C853] hover:bg-[#00b348] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition text-sm"
              >
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link href="/login" className="text-sm text-[#00C853] hover:underline">
                ← Voltar para o login
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#00C853]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email enviado!</h2>
            <p className="text-gray-500 text-sm mb-2">
              Se esse email estiver cadastrado, você receberá um link de recuperação em:
            </p>
            <p className="font-semibold text-gray-800 text-sm mb-6">{email}</p>
            <p className="text-gray-400 text-xs mb-8">
              Verifique também sua caixa de spam. O link expira em 1 hora.
            </p>
            <Link href="/login" className="text-sm text-[#00C853] hover:underline">
              ← Voltar para o login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
