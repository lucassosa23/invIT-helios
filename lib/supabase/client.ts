import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase para Client Components (navegador). Singleton via
 *  closure — `createBrowserClient` ya devuelve la misma instancia si lo
 *  llamás múltiples veces con los mismos args, pero lo cacheamos igual
 *  por claridad. */
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (cached) return cached;
  cached = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return cached;
}
