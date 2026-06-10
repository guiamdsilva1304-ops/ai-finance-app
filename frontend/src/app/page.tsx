import { createClient } from '@supabase/supabase-js';
import {
  MarketingNavBar, Hero, FeatureGrid, PWASection, DreamShowcase,
  PricingTable, BlogPreview, Footer,
} from '@/components/imoney';

export const revalidate = 3600;

export default async function HomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, title, category, reading_time_min')
    .eq('published', true)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(3);

  return (
    <>
      <MarketingNavBar/>
      <Hero/>
      <FeatureGrid/>
      <PWASection/>
      <DreamShowcase/>
      <PricingTable/>
      <BlogPreview posts={posts ?? []}/>
      <Footer/>
    </>
  );
}
