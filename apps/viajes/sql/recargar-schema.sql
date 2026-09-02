-- ============================================================
-- RECARGAR SCHEMA CACHE - Supabase
-- Fecha: 2026-05-18
-- ============================================================
-- Ejecuta este script SI el diagnostico dice "LISTO PARA LOGIN"
-- pero al iniciar sesion sigue dando "Database error querying schema"
-- ============================================================

-- Forzar a PostgREST a recargar el schema
NOTIFY pgrst, 'reload schema';

-- Verificar que las funciones esten bien
SELECT 
    proname as funcion,
    prosrc as codigo
FROM pg_proc 
WHERE proname IN ('is_admin', 'get_user_role')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Verificar que las tablas nuevas sean visibles
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('perfiles', 'user_roles', 'conductores', 'viajes', 'vehiculos')
ORDER BY table_name;

-- Verificar que las politicas RLS existan
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('perfiles', 'user_roles', 'conductores', 'viajes')
ORDER BY tablename, policyname;
