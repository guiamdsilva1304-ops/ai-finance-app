import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";

export type MFAStatus = "disabled" | "enabled" | "loading";

export interface MFAFactor {
  id: string;
  type: string;
  status: string;
  created_at: string;
}

export function useMFA() {
  const supabase = createSupabaseBrowser();
  const [status, setStatus] = useState<MFAStatus>("loading");
  const [factors, setFactors] = useState<MFAFactor[]>([]);

  const checkMFAStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verified = data.totp.filter((f) => f.status === "verified");
      setFactors(verified);
      setStatus(verified.length > 0 ? "enabled" : "disabled");
    } catch {
      setStatus("disabled");
    }
  }, [supabase]);

  useEffect(() => {
    checkMFAStatus();
  }, [checkMFAStatus]);

  const enrollMFA = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "iMoney" });
    if (error) throw error;
    return data;
  };

  const verifyEnrollment = async (factorId: string, code: string) => {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) throw challengeError;
    const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId: challengeData.id, code });
    if (error) throw error;
    await checkMFAStatus();
    return data;
  };

  const disableMFA = async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
    await checkMFAStatus();
  };

  return { status, factors, enrollMFA, verifyEnrollment, disableMFA, refresh: checkMFAStatus };
}
