import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  
  // Durante o build, retorna cliente vazio que não quebra
  if (!url || !key) {
    return createBrowserClient("https://placeholder.supabase.co", "placeholder-key");
  }
  
  return createBrowserClient(url, key);
}
