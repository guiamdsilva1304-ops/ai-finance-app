import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bolão Copa do Mundo 2026 | iMoney',
  description: 'Palpite jogo a jogo, suba no ranking e concorra a uma assinatura vitalícia da iMoney. Grátis para participar.',
  openGraph: {
    title: 'Bolão iMoney · Copa do Mundo 2026',
    description: 'Palpite jogo a jogo e concorra a uma assinatura vitalícia. Totalmente grátis.',
    type: 'website',
  },
};

export default function BolaoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
