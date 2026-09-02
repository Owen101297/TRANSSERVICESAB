-- ============================================================
-- CREAR USUARIO ADMIN - Trans Services A&B
-- Correo: transserviceshseq.ab@gmail.com
-- Contraseña: 1012OWen
-- Fecha: 2026-05-18
-- ============================================================
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Ve a tu proyecto > SQL Editor
-- 3. Crea un New Query
-- 4. Pega TODO este script
-- 5. Click en Run
-- ============================================================

-- Asegurar que pgcrypto este disponible para hashear la contraseña
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    new_user_id UUID;
    user_exists BOOLEAN;
BEGIN
    -- Verificar si el usuario ya existe
    SELECT id INTO new_user_id 
    FROM auth.users 
    WHERE email = 'transserviceshseq.ab@gmail.com';
    
    user_exists := (new_user_id IS NOT NULL);

    IF NOT user_exists THEN
        -- Generar nuevo UUID
        new_user_id := gen_random_uuid();
        
        -- Insertar usuario en auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            email_change,
            created_at,
            updated_at,
            confirmation_sent_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_user_id,
            'authenticated',
            'authenticated',
            'transserviceshseq.ab@gmail.com',
            crypt('1012OWen', gen_salt('bf')),
            now(),
            now(),
            '',
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"nombre_completo":"Administrador HSEQ"}',
            false
        );
        
        RAISE NOTICE 'Usuario creado exitosamente. ID: %', new_user_id;
    ELSE
        -- Actualizar contraseña del usuario existente
        UPDATE auth.users 
        SET encrypted_password = crypt('1012OWen', gen_salt('bf')),
            updated_at = now()
        WHERE id = new_user_id;
        
        RAISE NOTICE 'Usuario ya existia. Contraseña actualizada. ID: %', new_user_id;
    END IF;

    -- Asegurar que el perfil exista
    INSERT INTO perfiles (id, email, nombre_completo)
    VALUES (new_user_id, 'transserviceshseq.ab@gmail.com', 'Administrador HSEQ')
    ON CONFLICT (id) DO NOTHING;
    
    -- Actualizar/Crear rol admin
    INSERT INTO user_roles (user_id, rol)
    VALUES (new_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET rol = 'admin';
    
    RAISE NOTICE 'Perfil y rol admin configurados correctamente.';
END $$;

-- =============================================
-- VERIFICACION
-- =============================================
SELECT 
    u.id,
    u.email,
    u.created_at,
    p.nombre_completo,
    ur.rol
FROM auth.users u
LEFT JOIN perfiles p ON u.id = p.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'transserviceshseq.ab@gmail.com';
