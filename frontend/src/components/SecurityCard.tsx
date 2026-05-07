"use client";

import { useState } from "react";
import { useMFA } from "@/hooks/useMFA";
import dynamic from "next/dynamic";

const TwoFactorSetup = dynamic(() => import("@/components/TwoFactorSetup"), { ssr: false });

export function SecurityCard() {
  const { status } = useMFA();
  const isEnabled = status === "enabled";
  const isLoading = status === "loading";

  return (
    <div className="space-y-3">
      {/* Nível de segurança */}
      <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-medium">Nível de segurança</span>
          {!isLoading && (
            <span className={`text-xs font-semibold ${isEnabled ? "text-[#00C853]" : "text-amber-500"}`}>
              {isEnabled ? "Alta" : "Básica"}
            </span>
          )}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          {!isLoading && (
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: isEnabled ? "100%" : "45%",
                background: isEnabled
                  ? "linear-gradient(90deg, #00C853, #00E676)"
                  : "linear-gradient(90deg, #fbbf24, #f59e0b)",
              }}
            />
          )}
        </div>
      </div>

      {/* Componente existente de 2FA */}
      <TwoFactorSetup />
    </div>
  );
}
