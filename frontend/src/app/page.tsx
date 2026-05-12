'use client';
import {
  MarketingNavBar, Hero, FeatureGrid, DreamShowcase,
  PricingTable, BlogPreview, Footer,
} from '@/components/imoney';

export default function HomePage() {
  const cta = () => { window.location.href = '/login'; };
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
