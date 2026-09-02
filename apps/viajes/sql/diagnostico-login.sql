-- ============================================================
-- DIAGNOSTICO Y CORRECCION - Error "Database error querying schema"
-- Fecha: 2026-05-18
-- ============================================================
-- Este script verifica que todo este correctamente configurado
-- y corrige cualquier problema que impida el login del admin.
-- ============================================================

-- =============================================
-- 1. VERIFICAR QUE LAS TABLAS EXISTEN
-- =============================================
DO $$
BEGIN
    -- Verificar perfiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'perfiles') THEN
        RAISE EXCEPTION 'La tabla perfiles NO EXISTE. Ejecuta schema-roles.sql o schema.sql primero.';
    END IF;
    
    -- Verificar user_roles
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
        RAISE EXCEPTION 'La tabla user_roles NO EXISTE. Ejecuta schema-roles.sql primero.';
    END IF;
    
    -- Verificar conductores
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conductores') THEN
        RAISE EXCEPTION 'La tabla conductores NO EXISTE. Ejecuta schema.sql primero.';
    END IF;
    
    -- Verificar viajes
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'viajes') THEN
        RAISE EXCEPTION 'La tabla viajes NO EXISTE. Ejecuta schema.sql primero.';
    END IF;
    
    RAISE NOTICE '✓ Todas las tablas existen.';
END $$;

-- =============================================
-- 2. VERIFICAR QUE EL USUARIO ADMIN EXISTE
-- =============================================
SELECT 
    'auth.users' as tabla,
    id,
    email,
    created_at,
    CASE WHEN email_confirmed_at IS NOT NULL THEN '✓ Confirmado' ELSE '✗ No confirmado' END as estado
FROM auth.users 
WHERE email = 'transserviceshseq.ab@gmail.com';

-- =============================================
-- 3. VERIFICAR PERFIL Y ROL
-- =============================================
SELECT 
    'perfiles' as tabla,
    p.id,
    p.email,
    p.nombre_completo,
    COALESCE(ur.rol, 'SIN ROL') as rol,
    CASE WHEN ur.rol = 'admin' THEN '✓ ADMIN' ELSE '✗ NO ES ADMIN' END as es_admin
FROM perfiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE p.email = 'transserviceshseq.ab@gmail.com';

-- =============================================
-- 4. VERIFICAR RLS ESTA HABILITADO
-- =============================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_activo
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('perfiles', 'user_roles', 'conductores', 'viajes', 'vehiculos')
ORDER BY tablename;

-- =============================================
-- 5. VERIFICAR FUNCIONES is_admin() Y get_user_role()
-- =============================================
SELECT 
    routine_name as funcion,
    routine_type as tipo
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_admin', 'get_user_role');

-- =============================================
-- 6. CORRECCION: Si el usuario existe en auth.users pero NO en perfiles
-- =============================================
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = 'transserviceshseq.ab@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        -- Asegurar perfil
        INSERT INTO perfiles (id, email, nombre_completo)
        VALUES (v_user_id, 'transserviceshseq.ab@gmail.com', 'Administrador HSEQ')
        ON CONFLICT (id) DO NOTHING;
        
        -- Asegurar rol admin
        INSERT INTO user_roles (user_id, rol)
        VALUES (v_user_id, 'admin')
        ON CONFLICT (user_id) DO UPDATE SET rol = 'admin';
        
        RAISE NOTICE '✓ Perfil y rol corregidos para %', v_user_id;
    ELSE
        RAISE NOTICE '✗ Usuario no encontrado en auth.users';
    END IF;
END $$;

-- =============================================
-- 7. VERIFICACION FINAL
-- =============================================
SELECT 
    u.id,
    u.email,
    p.nombre_completo,
    ur.rol,
    CASE WHEN ur.rol = 'admin' THEN '✓ LISTO PARA LOGIN' ELSE '✗ REVISAR' END as estado
FROM auth.users u
LEFT JOIN perfiles p ON u.id = p.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'transserviceshseq.ab@gmail.com';
