-- La tabla `_prisma_migrations` la gestiona Prisma internamente. La
-- conexión del CLI es superuser (bypassea RLS), así que enabling RLS
-- no afecta `prisma migrate`. Cierra el último advisor "RLS Disabled
-- in Public" de Supabase.
--
-- Usamos DO block + IF EXISTS porque la shadow DB de prisma migrate dev
-- no contiene la tabla `_prisma_migrations` (la crea Prisma al
-- terminar). Sin el guard, el migrate falla al intentar diffear.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = '_prisma_migrations'
  ) THEN
    EXECUTE 'ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;
