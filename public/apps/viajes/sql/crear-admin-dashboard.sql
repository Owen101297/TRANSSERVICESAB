-- ============================================================
-- CREAR USUARIO ADMIN - METODO CORRECTO (Dashboard)
-- Correo: transserviceshseq.ab@gmail.com
-- Fecha: 2026-05-18
-- ============================================================
-- INSTRUCCIONES PASO A PASO:
-- ============================================================

-- PASO 1: Ve a Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/xftllyjjqvozjjmgwomg

-- PASO 2: Crea el usuario en Authentication > Users
-- 1. Ve al menu lateral: Authentication > Users
-- 2. Click en boton "Add user"
-- 3. Selecciona "Create new user"
-- 4. Email: transserviceshseq.ab@gmail.com
-- 5. Password: 1012OWen
-- 6. Click en "Create user"
-- 7. Copia el UUID que se genera (es un texto como: a1b2c3d4-e5f6-...)

-- PASO 3: Ejecuta este SQL (reemplaza UUID_AQUI con el UUID real)
-- Nota: Si el script anterior (borrar-admin.sql) no se ejecuto,
-- primero ejecuta ese para limpiar.

-- Asegurar que el perfil existe
INSERT INTO perfiles (id, email, nombre_completo)
VALUES ('UUID_AQUI', 'transserviceshseq.ab@gmail.com', 'Administrador HSEQ')
ON CONFLICT (id) DO NOTHING;

-- Asignar rol admin
INSERT INTO user_roles (user_id, rol)
VALUES ('UUID_AQUI', 'admin')
ON CONFLICT (user_id) DO UPDATE SET rol = 'admin';

-- =============================================
-- VERIFICACION FINAL
-- =============================================
SELECT 
    u.id,
    u.email,
    p.nombre_completo,
    ur.rol
FROM auth.users u
LEFT JOIN perfiles p ON u.id = p.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'transserviceshseq.ab@gmail.com';
