import type { Metadata } from "next";
import "./globals.css";
import { AmplitudeProvider } from "./amplitude";

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-finance-app-ashen.vercel.app"),
  title: {
    default: "iMoney — Assessor Financeiro com IA",
    template: "%s | iMoney",
  },
  description: "Controle suas finanças com inteligência artificial. Dashboard com SELIC e IPCA em tempo real, assessor financeiro IA, metas e muito mais. Gratuito para brasileiros.",
  keywords: [
    "finanças pessoais", "assessor financeiro", "inteligência artificial",
    "controle de gastos", "investimentos", "SELIC", "IPCA", "tesouro direto",
    "reserva de emergência", "metas financeiras", "app financeiro brasil",
    "educação financeira", "CDB", "FIIs", "planejamento financeiro",
    "organizar dinheiro", "app de finanças", "controle financeiro",
  ],
  authors: [{ name: "iMoney", url: "https://ai-finance-app-ashen.vercel.app" }],
  creator: "iMoney",
  publisher: "iMoney",
  category: "finance",
  applicationName: "iMoney",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://ai-finance-app-ashen.vercel.app",
    siteName: "iMoney",
    title: "iMoney — Assessor Financeiro com IA",
    description: "Controle suas finanças com IA. Dashboard com SELIC e IPCA em tempo real, assessor financeiro personalizado e metas financeiras. 100% gratuito.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "iMoney — Assessor Financeiro com IA",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "iMoney — Assessor Financeiro com IA",
    description: "Controle suas finanças com IA. Dashboard com SELIC e IPCA em tempo real. 100% gratuito para brasileiros.",
    images: ["/og-image.png"],
    creator: "@imoneyapp",
  },
  alternates: {
    canonical: "https://ai-finance-app-ashen.vercel.app",
    languages: {
      "pt-BR": "https://ai-finance-app-ashen.vercel.app",
    },
  },
  verification: {
    google: "google-site-verification-token",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "iMoney",
              url: "https://ai-finance-app-ashen.vercel.app",
              description: "Assessor financeiro com inteligência artificial para brasileiros. Controle gastos, acompanhe investimentos e planeje seu futuro financeiro.",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "BRL",
              },
              inLanguage: "pt-BR",
              audience: {
                "@type": "Audience",
                geographicArea: {
                  "@type": "Country",
                  name: "Brasil",
                },
              },
              featureList: [
                "Assessor financeiro com IA",
                "Dashboard financeiro",
                "SELIC e IPCA em tempo real",
                "Controle de gastos",
                "Metas financeiras",
                "Reserva de emergência",
              ],
            }),
          }}
        />
      </head>
      <body>
        <AmplitudeProvider>
          {children}
        </AmplitudeProvider>
      </body>
    </html>
  );
}
