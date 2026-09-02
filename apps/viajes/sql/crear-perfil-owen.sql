-- =============================================
-- CREAR PERFIL MANUAL - Owen Alvarez
-- UUID: 208508ce-fe5a-4d0b-9c8b-4cddd0c552a6
-- Email: owenalvarez97@gmail.com
-- =============================================

-- Insertar perfil (solo si no existe)
INSERT INTO perfiles (id, email, nombre_completo)
SELECT 
    '208508ce-fe5a-4d0b-9c8b-4cddd0c552a6'::uuid, 
    'owenalvarez97@gmail.com', 
    'Owen Alvarez'
WHERE NOT EXISTS (
    SELECT 1 FROM perfiles WHERE id = '208508ce-fe5a-4d0b-9c8b-4cddd0c552a6'::uuid
);

-- Verificar que se creó
SELECT * FROM perfiles WHERE id = '208508ce-fe5a-4d0b-9c8b-4cddd0c552a6'::uuid;
