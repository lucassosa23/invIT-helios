/**
 * Skeleton que Next muestra automáticamente entre que clickeás un link
 * y termina el SSR de la nueva ruta. Sin esto el browser se queda con
 * la página vieja "freezada" hasta que llega la nueva y se siente como
 * lag, aunque el server tarde 200ms.
 *
 * Aplica a todas las rutas hijas de `(app)`. Si alguna page necesita
 * un loading específico, puede sobreescribirlo con su propio
 * `loading.tsx` en su segment.
 */
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* PageHeader skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-[36ch] animate-pulse rounded bg-muted/60" />
      </div>

      {/* Content skeleton */}
      <div className="flex flex-col gap-3">
        <div className="h-24 animate-pulse rounded-xl bg-card ring-1 ring-foreground/5" />
        <div className="h-32 animate-pulse rounded-xl bg-card ring-1 ring-foreground/5" />
        <div className="h-32 animate-pulse rounded-xl bg-card ring-1 ring-foreground/5" />
      </div>
    </div>
  );
}
