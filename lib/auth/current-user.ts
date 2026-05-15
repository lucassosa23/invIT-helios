import { cache } from "react";
import type { User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Devuelve el user logueado tomando la sesión de Supabase + la fila en
 *  nuestra tabla `users`. Si es la primera vez que entra (auth user existe
 *  pero todavía no tiene fila en `users`), la crea con role ADMIN.
 *
 *  `cache()` de React lo memoiza por request — varios Server Components
 *  pueden llamarlo y solo se hace una query a la DB.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const existing = await prisma.user.findUnique({
    where: { authId: authUser.id },
  });
  if (existing) return existing;

  // Primer login: creamos la fila. El primer user del sistema es ADMIN.
  // Para futuros users (cuando agreguemos invites), el role se va a setear
  // antes vía un flujo distinto.
  const isFirstUser = (await prisma.user.count()) === 0;

  const fallbackName = authUser.email?.split("@")[0] ?? "Usuario";
  const displayName =
    (authUser.user_metadata?.name as string | undefined)?.trim() ??
    (authUser.user_metadata?.full_name as string | undefined)?.trim() ??
    fallbackName;

  // Si llegó hasta acá pero su email es null (raro), no creamos fila —
  // mejor fallar al caller para evitar data inválida.
  if (!authUser.email) return null;

  try {
    return await prisma.user.create({
      data: {
        authId: authUser.id,
        email: authUser.email,
        name: displayName,
        role: isFirstUser ? "ADMIN" : "VIEWER",
      },
    });
  } catch {
    // Si dos requests entran a la vez y ambos crean la fila, el unique
    // constraint en authId tira error en uno. Reintentamos el findUnique.
    return prisma.user.findUnique({ where: { authId: authUser.id } });
  }
});

/** Devuelve el user actual o tira un Error. Útil dentro de Server Actions
 *  donde sabemos que el middleware ya validó la sesión. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}
