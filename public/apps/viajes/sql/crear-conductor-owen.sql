-- =============================================
-- CREAR CONDUCTOR MANUAL - Owen Alvarez
-- UUID: 208508ce-fe5a-4d0b-9c8b-4cddd0c552a6
-- Email: owenalvarez97@gmail.com
-- =============================================

-- 1. Insertar conductor
INSERT INTO conductores (
    email, nombres, apellidos, numero_documento, 
    licencia_conducir, categoria_licencia, licencia_vencimiento, 
    telefono, estado
)
SELECT 
    'owenalvarez97@gmail.com', 
    'Owen', 
    'Alvarez', 
    'PENDIENTE', 
    'PENDIENTE', 
    'B1', 
    '2026-12-31', 
    '3000000000', 
    'activo'
WHERE NOT EXISTS (
    SELECT 1 FROM conductores WHERE email = 'owenalvarez97@gmail.com'
);

-- 2. Verificar que se creó
SELECT * FROM conductores WHERE email = 'owenalvarez97@gmail.com';
