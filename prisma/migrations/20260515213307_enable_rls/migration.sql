-- Habilita Row-Level Security en todas las tablas de la app.
--
-- Contexto: nuestra arquitectura accede a la DB exclusivamente vía
-- Prisma con la conexión `postgres` (superuser) que bypassea RLS por
-- diseño. NO usamos PostgREST de Supabase desde el cliente.
-- Habilitar RLS sin policies para anon/authenticated implica:
--   - Prisma sigue funcionando (postgres bypassea RLS).
--   - Cualquier intento de leer/escribir vía PostgREST con la anon key
--     queda bloqueado (deny-all).
--   - Cierra defensa en profundidad: si en el futuro alguien agrega un
--     cliente browser que use PostgREST, RLS lo bloquea automático.
--
-- Para reactivar PostgREST en alguna tabla específica más adelante:
--   CREATE POLICY ... ON tabla FOR SELECT TO authenticated USING (...);

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."scan_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."scan_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."unknown_scans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."purchase_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."order_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."internal_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."monthly_reports_sent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;
