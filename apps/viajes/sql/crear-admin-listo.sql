-- ============================================================
-- CREAR USUARIO ADMIN - TODO LISTO
-- UUID: c1676260-c0aa-45a6-be9c-30cb9b37e9c9
-- Correo: transserviceshseq.ab@gmail.com
-- Fecha: 2026-05-18
-- ============================================================
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Pega TODO este script
-- 3. Click en Run
-- 4. Listo, ve a login.html y prueba
-- ============================================================

-- PASO 1: Limpiar datos anteriores del mismo correo (si existen)
DELETE FROM user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'transserviceshseq.ab@gmail.com');
DELETE FROM perfiles WHERE email = 'transserviceshseq.ab@gmail.com';
DELETE FROM auth.users WHERE email = 'transserviceshseq.ab@gmail.com';

-- PASO 2: Insertar perfil del admin
INSERT INTO perfiles (id, email, nombre_completo)
VALUES ('c1676260-c0aa-45a6-be9c-30cb9b37e9c9', 'transserviceshseq.ab@gmail.com', 'Administrador HSEQ')
ON CONFLICT (id) DO NOTHING;

-- PASO 3: Insertar rol admin
INSERT INTO user_roles (user_id, rol)
VALUES ('c1676260-c0aa-45a6-be9c-30cb9b37e9c9', 'admin')
ON CONFLICT (user_id) DO UPDATE SET rol = 'admin';

-- PASO 4: Verificacion final
SELECT 
    u.id,
    u.email,
    p.nombre_completo,
    ur.rol,
    CASE 
        WHEN ur.rol = 'admin' THEN '✅ LISTO - Puedes iniciar sesion ahora'
        ELSE '❌ Error - Revisar'
    END as estado
FROM auth.users u
LEFT JOIN perfiles p ON u.id = p.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'transserviceshseq.ab@gmail.com';
