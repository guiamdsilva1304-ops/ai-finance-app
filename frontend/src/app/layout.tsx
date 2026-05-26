import type { Metadata } from "next";
import "./globals.css";
import "./imoney-tokens.css";
import { AmplitudeProvider } from "./amplitude";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL("https://imoney.ia.br"),
  title: { default: "iMoney — Assessor Financeiro com IA", template: "%s | iMoney" },
  description: "Controle suas finanças com inteligência artificial. Dashboard com SELIC e IPCA em tempo real, assessor financeiro IA, metas e muito mais. 100% gratuito para brasileiros.",
  keywords: ["finanças pessoais", "assessor financeiro", "inteligência artificial", "controle de gastos", "investimentos", "SELIC", "IPCA", "tesouro direto", "reserva de emergência", "metas financeiras", "app financeiro brasil", "educação financeira", "planejamento financeiro", "organizar dinheiro"],
  authors: [{ name: "iMoney", url: "https://imoney.ia.br" }],
  creator: "iMoney",
  publisher: "iMoney",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://imoney.ia.br",
    siteName: "iMoney",
    title: "iMoney — Assessor Financeiro com IA",
    description: "Controle suas finanças com IA. Dashboard com SELIC e IPCA em tempo real, assessor financeiro personalizado e metas financeiras. 100% gratuito.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "iMoney — Seu assessor pessoal" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "iMoney — Assessor Financeiro com IA",
    description: "Controle suas finanças com IA. Dashboard com SELIC e IPCA em tempo real. 100% gratuito para brasileiros.",
    images: ["/og-image.png"],
  },
  alternates: { canonical: "https://imoney.ia.br" },
  verification: { google: "WONpgV72z1PLGHk-AfjWdvn32beVilTymkv_t-FE08E" },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "iMoney",
          url: "https://imoney.ia.br",
          description: "Assessor financeiro com inteligência artificial para brasileiros.",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          inLanguage: "pt-BR",
          featureList: ["Assessor financeiro com IA", "Dashboard financeiro", "SELIC e IPCA em tempo real", "Controle de gastos", "Metas financeiras"],
        })}}/>
      </head>
      <body>
        {/* Google Analytics GA4 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-LVNS47QZV4"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-LVNS47QZV4');
          `}
        </Script>
        <AmplitudeProvider>{children}</AmplitudeProvider>
      </body>
    </html>
  );
}
