import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente Supabase para Server Components, Server Actions y Route Handlers.
 *  Lee/escribe cookies del request usando `next/headers`, que en Next 16
 *  son asíncronas. Usalo siempre que estés en server-side. */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // `setAll` puede tirar si se llama desde un Server Component
            // que solo lee. Eso es seguro porque el middleware refresca
            // las cookies en el response.
          }
        },
      },
    },
  );
}
