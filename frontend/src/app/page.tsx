import {
  MarketingNavBar, Hero, FeatureGrid, PWASection, DreamShowcase,
  PricingTable, BlogPreview, Footer,
} from '@/components/imoney';

export default function HomePage() {
  return (
    <>
      <MarketingNavBar/>
      <Hero/>
      <FeatureGrid/>
      <PWASection/>
      <DreamShowcase/>
      <PricingTable/>
      <BlogPreview/>
      <Footer/>
    </>
  );
}
