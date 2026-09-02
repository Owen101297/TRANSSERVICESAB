-- ============================================================
-- BORRAR USUARIO ADMIN CREADO INCORRECTAMENTE
-- Fecha: 2026-05-18
-- ============================================================
-- Este script borra el usuario que insertamos directamente en
-- auth.users (porque el hash de contraseña puede no ser compatible
-- con Supabase Auth, causando error 500 al login).
-- ============================================================

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Buscar el ID del usuario
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = 'transserviceshseq.ab@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        -- Borrar de tablas relacionadas primero
        DELETE FROM user_roles WHERE user_id = v_user_id;
        DELETE FROM perfiles WHERE id = v_user_id;
        
        -- Borrar de auth.users
        DELETE FROM auth.users WHERE id = v_user_id;
        
        RAISE NOTICE 'Usuario borrado correctamente. ID: %', v_user_id;
    ELSE
        RAISE NOTICE 'Usuario no encontrado. Nada que borrar.';
    END IF;
END $$;

-- Verificar que ya no existe
SELECT 'Usuario eliminado' as estado
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'transserviceshseq.ab@gmail.com'
);
