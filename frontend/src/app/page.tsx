'use client';
import {
  MarketingNavBar, Hero, FeatureGrid, DreamShowcase,
  PricingTable, BlogPreview, Footer,
} from '@/components/imoney';

export default function HomePage() {
  const cta = () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  return (
    <>
      <MarketingNavBar onCta={cta}/>
      <Hero onCta={cta}/>
      <FeatureGrid/>
      <DreamShowcase/>
      <PricingTable onCta={cta}/>
      <BlogPreview/>
      <Footer/>
    </>
  );
}
