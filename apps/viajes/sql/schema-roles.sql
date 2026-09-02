-- =============================================
-- SETUP LIMPIO DESDE CERO - Trans Services A&B
-- Fecha: 2026-05-17
-- =============================================
-- Este script elimina TODO lo anterior (incluyendo políticas
-- ocultas que consultan perfiles.rol) y recrea todo limpio.
-- Ejecutar desde Supabase Dashboard > SQL Editor.
-- =============================================

-- =============================================
-- 0. ELIMINAR FUNCIONES ANTIGUAS CON CASCADE
-- =============================================
-- CASCADE borra automáticamente TODO lo que dependa de estas funciones:
-- políticas RLS, vistas, triggers, etc. Esto limpia el ERP de un solo golpe.
DROP FUNCTION IF EXISTS get_user_role() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- =============================================
-- 1. ELIMINAR COLUMNA rol CON CASCADE
-- =============================================
-- CASCADE elimina automáticamente TODO lo que dependa de perfiles.rol:
-- políticas RLS, vistas, funciones, etc. Esto es necesario porque
-- hay políticas ocultas en otras tablas (preoperacionales,
-- asistencia, vencimientos, etc.) que consultan perfiles.rol.
ALTER TABLE perfiles DROP COLUMN IF EXISTS rol CASCADE;

-- =============================================
-- 2. ELIMINAR POLÍTICAS CONOCIDAS (por si CASCADE no las alcanzó)
-- =============================================
-- Tabla: perfiles
DROP POLICY IF EXISTS "admin_ver_perfiles" ON perfiles;
DROP POLICY IF EXISTS "perfiles_select" ON perfiles;
DROP POLICY IF EXISTS "perfiles_insert" ON perfiles;
DROP POLICY IF EXISTS "perfiles_update" ON perfiles;
DROP POLICY IF EXISTS "perfiles_delete" ON perfiles;
DROP POLICY IF EXISTS "perfiles_select_own_or_admin" ON perfiles;
DROP POLICY IF EXISTS "perfiles_insert_own" ON perfiles;
DROP POLICY IF EXISTS "perfiles_update_own_or_admin" ON perfiles;
DROP POLICY IF EXISTS "perfiles_delete_admin_only" ON perfiles;

-- Tabla: conductores
DROP POLICY IF EXISTS "admin_total_conductores" ON conductores;
DROP POLICY IF EXISTS "conductor_su_perfil" ON conductores;
DROP POLICY IF EXISTS "conductores_select" ON conductores;
DROP POLICY IF EXISTS "conductores_insert" ON conductores;
DROP POLICY IF EXISTS "conductores_insert_admin_only" ON conductores;
DROP POLICY IF EXISTS "conductores_update" ON conductores;
DROP POLICY IF EXISTS "conductores_update_admin_only" ON conductores;
DROP POLICY IF EXISTS "conductores_delete" ON conductores;
DROP POLICY IF EXISTS "conductores_delete_admin_only" ON conductores;

-- Tabla: viajes
DROP POLICY IF EXISTS "Permitir lectura a todos" ON viajes;
DROP POLICY IF EXISTS "Permitir inserción viajes" ON viajes;
DROP POLICY IF EXISTS "Permitir actualización viajes" ON viajes;
DROP POLICY IF EXISTS "Permitir eliminación viajes" ON viajes;
DROP POLICY IF EXISTS "admin_total_viajes" ON viajes;
DROP POLICY IF EXISTS "conductor_sus_viajes" ON viajes;
DROP POLICY IF EXISTS "viajes_select" ON viajes;
DROP POLICY IF EXISTS "viajes_insert" ON viajes;
DROP POLICY IF EXISTS "viajes_update" ON viajes;
DROP POLICY IF EXISTS "viajes_delete" ON viajes;
DROP POLICY IF EXISTS "viajes_select_owner_or_admin" ON viajes;
DROP POLICY IF EXISTS "viajes_insert_owner_or_admin" ON viajes;
DROP POLICY IF EXISTS "viajes_update_owner_or_admin" ON viajes;
DROP POLICY IF EXISTS "viajes_delete_admin_only" ON viajes;

-- Tabla: vehiculos
DROP POLICY IF EXISTS "todos_leen_vehiculos" ON vehiculos;
DROP POLICY IF EXISTS "admin_modifica_vehiculos" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_select" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_insert" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_insert_admin_only" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_update" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_update_admin_only" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_delete" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_delete_admin_only" ON vehiculos;

-- Tablas adicionales descubiertas
DROP POLICY IF EXISTS "preoperacionales_select_owner_or_admin" ON preoperacionales;
DROP POLICY IF EXISTS "preoperacionales_insert_owner_or_admin" ON preoperacionales;
DROP POLICY IF EXISTS "preoperacionales_update_owner_or_admin" ON preoperacionales;
DROP POLICY IF EXISTS "preoperacionales_delete_admin_only" ON preoperacionales;

DROP POLICY IF EXISTS "asistencia_select_all" ON asistencia;
DROP POLICY IF EXISTS "asistencia_insert_admin_only" ON asistencia;
DROP POLICY IF EXISTS "asistencia_update_admin_only" ON asistencia;
DROP POLICY IF EXISTS "asistencia_delete_admin_only" ON asistencia;

DROP POLICY IF EXISTS "vencimientos_select_all" ON vencimientos;
DROP POLICY IF EXISTS "vencimientos_insert_admin_only" ON vencimientos;
DROP POLICY IF EXISTS "vencimientos_update_admin_only" ON vencimientos;
DROP POLICY IF EXISTS "vencimientos_delete_admin_only" ON vencimientos;

DROP POLICY IF EXISTS "incidentes_select_all" ON incidentes;
DROP POLICY IF EXISTS "incidentes_insert_admin_only" ON incidentes;
DROP POLICY IF EXISTS "incidentes_update_admin_only" ON incidentes;
DROP POLICY IF EXISTS "incidentes_delete_admin_only" ON incidentes;

DROP POLICY IF EXISTS "registros_lavado_select_all" ON registros_lavado;
DROP POLICY IF EXISTS "registros_lavado_insert_admin_only" ON registros_lavado;
DROP POLICY IF EXISTS "registros_lavado_update_admin_only" ON registros_lavado;
DROP POLICY IF EXISTS "registros_lavado_delete_admin_only" ON registros_lavado;

DROP POLICY IF EXISTS "capacitaciones_select_all" ON capacitaciones;
DROP POLICY IF EXISTS "capacitaciones_insert_admin_only" ON capacitaciones;
DROP POLICY IF EXISTS "capacitaciones_update_admin_only" ON capacitaciones;
DROP POLICY IF EXISTS "capacitaciones_delete_admin_only" ON capacitaciones;

DROP POLICY IF EXISTS "asistencia_cap_select_all" ON asistencia_capacitaciones;
DROP POLICY IF EXISTS "asistencia_cap_insert_admin_only" ON asistencia_capacitaciones;
DROP POLICY IF EXISTS "asistencia_cap_update_admin_only" ON asistencia_capacitaciones;
DROP POLICY IF EXISTS "asistencia_cap_delete_admin_only" ON asistencia_capacitaciones;

-- =============================================
-- 3. CREAR TABLA user_roles (separada de perfiles)
-- =============================================
-- Esta tabla almacena los roles. Al estar separada,
-- se evita la recursión infinita que ocurría cuando
-- is_admin() consultaba la misma tabla perfiles.
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    rol VARCHAR(20) NOT NULL DEFAULT 'conductor',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_rol ON user_roles(rol);

-- =============================================
-- 4. CREAR FUNCIONES ÚTILES (SECURITY DEFINER)
-- =============================================
-- SECURITY DEFINER permite que estas funciones lean user_roles
-- SIN activar las políticas RLS. Rompe la recursión.

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR(20) AS $$
DECLARE
    r VARCHAR(20);
BEGIN
    SELECT ur.rol INTO r
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    LIMIT 1;
    RETURN COALESCE(r, 'conductor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.rol = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. HABILITAR RLS EN user_roles
-- =============================================
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select" ON user_roles FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "user_roles_insert" ON user_roles FOR INSERT
    WITH CHECK (user_id = auth.uid() AND rol = 'conductor');

CREATE POLICY "user_roles_update" ON user_roles FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid() AND rol = 'conductor');

-- =============================================
-- 6. POLÍTICAS RLS LIMPIAS - perfiles
-- =============================================
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo ve/edita su propio perfil.
-- El admin accede a perfiles desde SQL directo o funciones.
CREATE POLICY "perfiles_select" ON perfiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "perfiles_insert" ON perfiles FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "perfiles_update" ON perfiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "perfiles_delete" ON perfiles FOR DELETE
    USING (is_admin());

-- =============================================
-- 7. POLÍTICAS RLS LIMPIAS - conductores
-- =============================================
ALTER TABLE conductores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conductores_select" ON conductores FOR SELECT
    USING (is_admin() OR email = auth.jwt()->>'email');

CREATE POLICY "conductores_insert" ON conductores FOR INSERT
    WITH CHECK (is_admin() OR email = auth.jwt()->>'email');

CREATE POLICY "conductores_update" ON conductores FOR UPDATE
    USING (is_admin() OR email = auth.jwt()->>'email')
    WITH CHECK (is_admin() OR email = auth.jwt()->>'email');

CREATE POLICY "conductores_delete" ON conductores FOR DELETE
    USING (is_admin());

-- =============================================
-- 8. POLÍTICAS RLS LIMPIAS - viajes
-- =============================================
ALTER TABLE viajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viajes_select" ON viajes FOR SELECT
    USING (
        is_admin()
        OR conductor_id IN (
            SELECT id FROM conductores
            WHERE conductores.email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "viajes_insert" ON viajes FOR INSERT
    WITH CHECK (
        is_admin()
        OR conductor_id IN (
            SELECT id FROM conductores
            WHERE conductores.email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "viajes_update" ON viajes FOR UPDATE
    USING (
        is_admin()
        OR conductor_id IN (
            SELECT id FROM conductores
            WHERE conductores.email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "viajes_delete" ON viajes FOR DELETE
    USING (is_admin());

-- =============================================
-- 9. POLÍTICAS RLS LIMPIAS - vehiculos
-- =============================================
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehiculos_select" ON vehiculos FOR SELECT USING (true);

CREATE POLICY "vehiculos_insert" ON vehiculos FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "vehiculos_update" ON vehiculos FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "vehiculos_delete" ON vehiculos FOR DELETE
    USING (is_admin());

-- =============================================
-- 10. POLÍTICAS RLS LIMPIAS - TABLAS ADICIONALES
-- =============================================
-- Estas tablas fueron descubiertas al intentar borrar perfiles.rol.
-- Se crean políticas genéricas: todos leen, solo admin modifica.
-- Si necesitas lógica más específica, ajusta después.

-- preoperacionales
ALTER TABLE IF EXISTS preoperacionales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preoperacionales_select" ON preoperacionales;
DROP POLICY IF EXISTS "preoperacionales_insert" ON preoperacionales;
DROP POLICY IF EXISTS "preoperacionales_update" ON preoperacionales;
DROP POLICY IF EXISTS "preoperacionales_delete" ON preoperacionales;
CREATE POLICY "preoperacionales_select" ON preoperacionales FOR SELECT USING (true);
CREATE POLICY "preoperacionales_insert" ON preoperacionales FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "preoperacionales_update" ON preoperacionales FOR UPDATE USING (is_admin());
CREATE POLICY "preoperacionales_delete" ON preoperacionales FOR DELETE USING (is_admin());

-- asistencia
ALTER TABLE IF EXISTS asistencia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asistencia_select" ON asistencia;
DROP POLICY IF EXISTS "asistencia_insert" ON asistencia;
DROP POLICY IF EXISTS "asistencia_update" ON asistencia;
DROP POLICY IF EXISTS "asistencia_delete" ON asistencia;
CREATE POLICY "asistencia_select" ON asistencia FOR SELECT USING (true);
CREATE POLICY "asistencia_insert" ON asistencia FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "asistencia_update" ON asistencia FOR UPDATE USING (is_admin());
CREATE POLICY "asistencia_delete" ON asistencia FOR DELETE USING (is_admin());

-- vencimientos
ALTER TABLE IF EXISTS vencimientos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vencimientos_select" ON vencimientos;
DROP POLICY IF EXISTS "vencimientos_insert" ON vencimientos;
DROP POLICY IF EXISTS "vencimientos_update" ON vencimientos;
DROP POLICY IF EXISTS "vencimientos_delete" ON vencimientos;
CREATE POLICY "vencimientos_select" ON vencimientos FOR SELECT USING (true);
CREATE POLICY "vencimientos_insert" ON vencimientos FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "vencimientos_update" ON vencimientos FOR UPDATE USING (is_admin());
CREATE POLICY "vencimientos_delete" ON vencimientos FOR DELETE USING (is_admin());

-- incidentes
ALTER TABLE IF EXISTS incidentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "incidentes_select" ON incidentes;
DROP POLICY IF EXISTS "incidentes_insert" ON incidentes;
DROP POLICY IF EXISTS "incidentes_update" ON incidentes;
DROP POLICY IF EXISTS "incidentes_delete" ON incidentes;
CREATE POLICY "incidentes_select" ON incidentes FOR SELECT USING (true);
CREATE POLICY "incidentes_insert" ON incidentes FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "incidentes_update" ON incidentes FOR UPDATE USING (is_admin());
CREATE POLICY "incidentes_delete" ON incidentes FOR DELETE USING (is_admin());

-- registros_lavado
ALTER TABLE IF EXISTS registros_lavado ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registros_lavado_select" ON registros_lavado;
DROP POLICY IF EXISTS "registros_lavado_insert" ON registros_lavado;
DROP POLICY IF EXISTS "registros_lavado_update" ON registros_lavado;
DROP POLICY IF EXISTS "registros_lavado_delete" ON registros_lavado;
CREATE POLICY "registros_lavado_select" ON registros_lavado FOR SELECT USING (true);
CREATE POLICY "registros_lavado_insert" ON registros_lavado FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "registros_lavado_update" ON registros_lavado FOR UPDATE USING (is_admin());
CREATE POLICY "registros_lavado_delete" ON registros_lavado FOR DELETE USING (is_admin());

-- capacitaciones
ALTER TABLE IF EXISTS capacitaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "capacitaciones_select" ON capacitaciones;
DROP POLICY IF EXISTS "capacitaciones_insert" ON capacitaciones;
DROP POLICY IF EXISTS "capacitaciones_update" ON capacitaciones;
DROP POLICY IF EXISTS "capacitaciones_delete" ON capacitaciones;
CREATE POLICY "capacitaciones_select" ON capacitaciones FOR SELECT USING (true);
CREATE POLICY "capacitaciones_insert" ON capacitaciones FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "capacitaciones_update" ON capacitaciones FOR UPDATE USING (is_admin());
CREATE POLICY "capacitaciones_delete" ON capacitaciones FOR DELETE USING (is_admin());

-- asistencia_capacitaciones
ALTER TABLE IF EXISTS asistencia_capacitaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asistencia_cap_select" ON asistencia_capacitaciones;
DROP POLICY IF EXISTS "asistencia_cap_insert" ON asistencia_capacitaciones;
DROP POLICY IF EXISTS "asistencia_cap_update" ON asistencia_capacitaciones;
DROP POLICY IF EXISTS "asistencia_cap_delete" ON asistencia_capacitaciones;
CREATE POLICY "asistencia_cap_select" ON asistencia_capacitaciones FOR SELECT USING (true);
CREATE POLICY "asistencia_cap_insert" ON asistencia_capacitaciones FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "asistencia_cap_update" ON asistencia_capacitaciones FOR UPDATE USING (is_admin());
CREATE POLICY "asistencia_cap_delete" ON asistencia_capacitaciones FOR DELETE USING (is_admin());

-- =============================================
-- NOTAS PARA IMPLEMENTACIÓN
-- =============================================
/*
1. EJECUTAR ESTE SCRIPT:
   - Ir a Supabase Dashboard > SQL Editor
   - Crear New Query
   - Pegar TODO este script
   - Click en Run

2. CREAR UN USUARIO ADMIN:
   - Ir a Authentication > Users
   - Crear un usuario normal (o copiar el UUID de uno existente)
   - Ir a SQL Editor y ejecutar:
     INSERT INTO user_roles (user_id, rol)
     VALUES ('UUID_DEL_USUARIO_AQUI', 'admin')
     ON CONFLICT (user_id) DO UPDATE SET rol = 'admin';

3. REGISTRO NORMAL (CONDUCTOR):
   - El frontend (register.html) se encarga de:
     a) Crear usuario en Auth
     b) Insertar en perfiles
     c) Insertar en user_roles con rol = 'conductor'
   - Todo automático desde la app.
   - NOTA: Los usuarios/registros anteriores se pierden porque se eliminó perfiles.rol.
     Si necesitas conservar roles viejos, avísame antes de ejecutar.

4. ESTRUCTURA FINAL DE TABLAS:
   - auth.users               -> Usuarios de autenticación (manejado por Supabase)
   - perfiles                 -> Datos personales (nombre, email, etc.)
   - user_roles               -> Roles separados (conductor | admin)
   - conductores              -> Datos laborales del conductor
   - viajes                   -> Registro de viajes
   - vehiculos                -> Catálogo de vehículos
   - preoperacionales         -> (política genérica por ahora)
   - asistencia               -> (política genérica por ahora)
   - vencimientos             -> (política genérica por ahora)
   - incidentes               -> (política genérica por ahora)
   - registros_lavado         -> (política genérica por ahora)
   - capacitaciones           -> (política genérica por ahora)
   - asistencia_capacitaciones-> (política genérica por ahora)

5. ¿POR QUÉ user_roles ESTÁ SEPARADA?
   - Evita recursión infinita en RLS.
   - is_admin() lee user_roles (tabla diferente) sin consultar perfiles.
   - SECURITY DEFINER en is_admin() asegura que no active RLS.

6. ¿QUÉ PASÓ CON LAS POLÍTICAS VIEJAS?
   - CASCADE eliminó TODO lo que dependía de perfiles.rol.
   - Se recrearon limpias usando is_admin() que lee user_roles.
*/
