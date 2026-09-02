-- ============================================================
-- CONFIGURACION SISTEMA - PIN Admin
-- Fecha: 2026-05-18
-- ============================================================
-- Este script crea:
-- 1. Tabla config_sistema para guardar configuraciones seguras
-- 2. Inserta el PIN admin "1012" hasheado con bcrypt
-- 3. Funcion RPC verificar_pin_admin() para validar desde frontend
-- ============================================================

-- Crear extension pgcrypto si no existe (para crypt/bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Crear tabla de configuracion
CREATE TABLE IF NOT EXISTS config_sistema (
    clave VARCHAR(100) PRIMARY KEY,
    valor_hash TEXT NOT NULL,
    descripcion TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE config_sistema ENABLE ROW LEVEL SECURITY;

-- Solo permitir lectura a todos (el hash no revela el PIN)
CREATE POLICY "config_sistema_select" ON config_sistema FOR SELECT USING (true);

-- 2. Insertar/Actualizar PIN admin (1012)
-- El hash se genera con bcrypt (gen_salt('bf'))
INSERT INTO config_sistema (clave, valor_hash, descripcion)
VALUES (
    'admin_pin',
    crypt('1012', gen_salt('bf')),
    'PIN de autorizacion para aprobaciones HSE y Gerencia'
)
ON CONFLICT (clave) DO UPDATE SET
    valor_hash = crypt('1012', gen_salt('bf')),
    updated_at = NOW();

-- 3. Crear funcion RPC para verificar PIN
-- SECURITY DEFINER permite que cualquiera la llame sin activar RLS
CREATE OR REPLACE FUNCTION verificar_pin_admin(pin_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    hash_almacenado TEXT;
BEGIN
    SELECT valor_hash INTO hash_almacenado
    FROM config_sistema
    WHERE clave = 'admin_pin';

    IF hash_almacenado IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN hash_almacenado = crypt(pin_input, hash_almacenado);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Verificacion
SELECT 
    clave,
    descripcion,
    updated_at,
    CASE 
        WHEN verificar_pin_admin('1012') THEN '✅ PIN correcto'
        ELSE '❌ PIN incorrecto'
    END as test_1012,
    CASE 
        WHEN verificar_pin_admin('0000') THEN '✅ PIN correcto'
        ELSE '❌ PIN incorrecto (esperado)'
    END as test_0000
FROM config_sistema
WHERE clave = 'admin_pin';
