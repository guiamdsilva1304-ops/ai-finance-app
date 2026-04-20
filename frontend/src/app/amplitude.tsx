"use client";
import { useEffect } from "react";
import * as amplitude from "@amplitude/unified";

let initialized = false;

export function AmplitudeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (initialized || typeof window === "undefined") return;
    initialized = true;
    amplitude.initAll("d4314eb57fb0a3da4e9328614aaba244", {
      analytics: { autocapture: true },
      sessionReplay: { sampleRate: 1 },
    });
  }, []);
  return <>{children}</>;
}

export function identifyUser(userId: string, properties: Record<string, any>) {
  amplitude.setUserId(userId);
  const identify = new amplitude.Identify();
  Object.entries(properties).forEach(([key, value]) => identify.set(key, value));
  amplitude.identify(identify);
}

export { amplitude };
