-- =============================================
-- AGREGAR risk_inputs A VIAJES
-- =============================================
-- Necesitamos guardar los valores individuales del análisis de riesgo
-- para poder restaurarlos cuando se edita un viaje.

ALTER TABLE viajes ADD COLUMN IF NOT EXISTS risk_inputs JSONB;

-- Verificar que se agregó
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'viajes' AND column_name = 'risk_inputs';
