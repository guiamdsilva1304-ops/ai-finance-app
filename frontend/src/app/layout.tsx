import type { Metadata } from "next";
import "./globals.css";
import { AmplitudeProvider } from "./amplitude";

export const metadata: Metadata = {
  title: "iMoney — assessorIA financeira",
  description: "Assessoria financeira inteligente com IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AmplitudeProvider>
          {children}
        </AmplitudeProvider>
      </body>
    </html>
  );
}
