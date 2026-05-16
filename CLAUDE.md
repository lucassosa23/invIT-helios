# invIT — Guidelines de desarrollo

Este archivo te brieffa para trabajar en este repo. Stack: Next.js 16 (App Router, Turbopack), React 19, Prisma 7 con `@prisma/adapter-pg`, Supabase (Auth + Postgres + RLS), Tailwind v4, TypeScript estricto.

La app es **single-tenant single-admin** (Lucas, Helios Salud · IT). Toda la persistencia vive en Postgres/Supabase; no usamos localStorage para datos de dominio.

---

## Arquitectura — qué va dónde

- **Pages server-side fetchean datos** en `app/(app)/<route>/page.tsx`. Usan `getInventory()`, `getOrders()`, `getRequests()` y los queries de cada feature. Pasan los datos por prop al shell del feature.
- **Server Actions** viven en `features/<feature>/lib/actions.ts` (o `monthly-plan-actions.ts` para casos puntuales). Empiezan con `"use server"`. Cada exportable es `async` y devuelve un valor serializable.
- **Queries de lectura** server-only viven en `features/<feature>/lib/queries.ts` con `import "server-only"` arriba.
- **Mappers** (DB ↔ tipos de la app) en `features/<feature>/lib/mappers.ts`. Convierten enums de Prisma a strings lowercase del dominio.
- **Helpers compartidos**: `lib/helpers.ts` (server-only) tiene `makeSku`, `monthYearString`, `monthlyPlanReferenceFor`, `revalidateDomainPaths`, `idSchema`, `parseId`. **Usalos siempre** en lugar de re-implementar.
- **Helpers puros de formato** en `lib/format.ts` (pueden ejecutarse en cliente): `formatCurrency`, `formatRelative`, `stockTone`, etc.
- **Tipos de dominio**: `lib/fake-data.ts` define `Asset`, `Status`, `Priority` (sí, conviven con el código fake del dashboard hasta que migremos esas pantallas).
- **Auth**: `lib/auth/current-user.ts` exporta `getCurrentUser()` y `requireUser()`. `requireUser()` tira si no hay sesión.
- **Inventory context**: `lib/inventory-context.tsx` monta `<InventoryProvider>` en el layout. Cualquier client component descendiente usa `useInventory()` de `lib/hooks.ts`.

## Server Actions — reglas obligatorias

Cada Server Action debe seguir este patrón:

```ts
export async function fooAction(rawId: string, rawInput: Input): Promise<Result> {
  await requireUser();                              // 1. Auth
  const id = parseId(rawId, "id");                  // 2. Validar IDs con zod
  const data = inputSchema.parse(rawInput);         // 3. Validar inputs con zod

  // 4. Lógica (transacción si toca varias tablas)
  const result = await prisma.$transaction(async (tx) => { /* ... */ });

  revalidateDomainPaths();                          // 5. Revalidar
  return result;                                    // 6. Retornar serializable
}
```

- **Auth siempre** — `await requireUser()` antes de tocar la DB. Sin excepciones.
- **IDs siempre validados** — `parseId(id)` (cuid format). Nunca pasar un string crudo del cliente a `where: { id }`.
- **Inputs siempre validados** — schemas zod en el mismo archivo, parseados en la entrada.
- **Transacciones** cuando mutás más de una tabla o si la consistencia importa (ej: descontar stock + crear movement + actualizar status).
- **Revalidación**: usar `revalidateDomainPaths()` salvo que sea muy obvio que solo cambia una página puntual.
- **No exponer modelo crudo de Prisma** al cliente. Pasar por un mapper.
- **`"use server"` solo exporta async functions.** Helpers sync van en otro archivo (suele ser `lib/helpers.ts` o `lib/format.ts`).

## Seguridad — checklist por feature

Al agregar/modificar una feature, verificá:

- [ ] Todas las server actions empiezan con `await requireUser()`.
- [ ] IDs validados con `parseId()` o `idSchema`.
- [ ] Inputs validados con zod schema (limitar tamaños: `.max(N)`).
- [ ] No exponer secrets al cliente. **Solo** variables con prefijo `NEXT_PUBLIC_` viajan al bundle del browser. `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RESEND_API_KEY` son server-only.
- [ ] No usar `prisma.$queryRaw` con concatenación de strings. Si hace falta SQL crudo, usar template literals (Prisma los parametriza).
- [ ] Mutaciones críticas (delete, update de stock, transición de estado) deben ir en transacción.
- [ ] `Movement` para todo cambio de stock (`type: IN/OUT/RECEIVE/ADJUST`, `sourceKind` + `sourceRef`, `actorId`, `prevStock`/`nextStock`).
- [ ] `.env` está en `.gitignore`. Nunca commitear claves.

## Código limpio — qué hacer y qué no

**Hacé**:
- Reusar helpers de `lib/helpers.ts` y `lib/format.ts` antes de escribir nuevos.
- Pasar datos por prop desde la page server-side al shell, no fetchear desde el cliente.
- `useTransition` para deshabilitar botones mientras dura una server action.
- Toast con descripción específica del error (`err instanceof Error ? err.message : String(err)`).
- Borrar código en vez de comentarlo. Si tenés dudas, está en git.
- Comentar **WHY** cuando no es obvio (hidden invariant, workaround, decisión de diseño). Nunca comentar **WHAT** (eso lo dice el nombre del símbolo).

**No hagás**:
- No agregar features extra ni abstracciones especulativas. Tres líneas similares > abstracción prematura.
- No agregar comentarios `// TODO: refactor` sin ticket. Si es deuda real, anotala en la memoria del proyecto.
- No mezclar UI con lógica de negocio: la validación va en zod schema (server-side), no inline.
- No usar localStorage para datos de dominio. Usalo solo para preferencias del browser (theme, snapshot del reconciler).
- No crear archivos `.md` ni documentación a menos que se pida.
- No emojis en código o commits a menos que se pidan.

## Estilo de commits

Lucas escribe sus commits, no AI. Tono humano, prosa natural en castellano rioplatense. Sin firma `Co-Authored-By: Claude`.

Ejemplos buenos del repo:
- `wip(requests): server-side listo, faltan mutaciones del UI`
- `fix(notifications): bell sin hydration mismatch del badge`
- `refactor(dashboard,notifications): consumir inventory desde DB (Fase C parte 4)`

Solo commitear cuando el user lo pide explícitamente.

## Operación / troubleshooting

- Tras cambiar `prisma/schema.prisma` + `migrate dev`: matar dev server, borrar `.next`, relevantar. Turbopack cachea el cliente Prisma y los Server Actions tiran "Unknown argument X" si no.
  ```
  pkill -9 -f "next dev"; rm -rf .next; pnpm dev
  ```
- `pnpm` puede no estar en el PATH en algunos contextos: usar `node_modules/.bin/tsc`, `node_modules/.bin/eslint`, `node_modules/.bin/next build`.
- Si el user reporta "internal server error", lo primero es chequear que su dev server no tenga `.next` stale.

## Deuda técnica pendiente

- `lib/fake-data.ts` aún alimenta `/dashboard` y `/activity` con datos generados por `@faker-js/faker`. Migrar a queries reales contra DB.
- `MonthlyPlanReconciler` mantiene su snapshot en localStorage — único uso restante para datos de dominio. Es per-browser, sirve para detectar transiciones de stock entre visitas.
- DB usa el rol `postgres.<project>` de Supabase Session Pooler que bypassea RLS. En esta arquitectura single-tenant la última línea de defensa es `requireUser()` + lógica de la app. Si se escala a multi-tenant, hay que migrar a rol restringido + policies por workspace.

## Siguiente bloque grande

Scanner de pistola: schema ya tiene `Asset.barcode`, `ScanSession`, `ScanLine`, `UnknownScan` y `Movement` listos. El brief está en histórico de chat.
