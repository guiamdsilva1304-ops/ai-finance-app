import {
  MarketingNavBar, Hero, FeatureGrid, DreamShowcase,
  PricingTable, BlogPreview, Footer,
} from '@/components/imoney';

export default function HomePage() {
  return (
    <>
      <MarketingNavBar/>
      <Hero/>
      <FeatureGrid/>
      <DreamShowcase/>
      <PricingTable/>
      <BlogPreview/>
      <Footer/>
    </>
  );
}
