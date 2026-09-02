# Contexto del Proyecto - Trans Services ERP
## Actualizado: 2026-05-19

---

## Estado General

Sistema ERP con múltiples aplicaciones (viajes, preoperacional, asistencia, HSEQ, etc.) que comparten base de datos Supabase.

### Usuario de prueba actual
- **Email:** owenalvarez97@gmail.com
- **UUID:** 208508ce-fe5a-4d0b-9c8b-4cddd0c552a6
- **Rol:** conductor
- **Conductor ID:** 4e91ee12-9118-4dc8-adbc-b38ef5e0ed59

---

## Problema Original (SOLUCIONADO)

**Error:** `infinite recursion detected in policy for relation "perfiles"`

**Causa:** La función `is_admin()` consultaba la tabla `perfiles` desde dentro de una política RLS de `perfiles`, generando recursión infinita.

**Solución aplicada:**
1. Crear tabla `user_roles` separada de `perfiles`
2. `is_admin()` lee `user_roles` (tabla diferente) con `SECURITY DEFINER`
3. Eliminar columna `perfiles.rol` con `CASCADE`
4. Actualizar `js/supabase-client.js` para insertar/leer desde `user_roles`

---

## Cambios Realizados en Archivos

### 1. SQL - `sql/schema-roles.sql` (NUEVO desde cero)
- Elimina TODO lo anterior con `CASCADE`
- Crea tabla `user_roles` (user_id UUID PK, rol VARCHAR, created_at)
- Funciones `is_admin()` y `get_user_role()` como `SECURITY DEFINER`
- Políticas RLS limpias en todas las tablas:
  - `perfiles`: cada usuario ve solo el suyo
  - `conductores`: admin ve todo, conductor ve su email
  - `viajes`: admin ve todo, conductor ve los suyos por email
  - `vehiculos`: todos leen, solo admin modifica
  - Tablas adicionales: preoperacionales, asistencia, vencimientos, incidentes, registros_lavado, capacitaciones, asistencia_capacitaciones
- Política `conductores_insert` corregida para permitir auto-registro: `is_admin() OR email = auth.jwt()->>'email'`

### 2. JS - `js/supabase-client.js`
- `createProfile()`: inserta en `perfiles` + `user_roles`
- `getProfile()`: lee rol desde `user_roles` y lo agrega al objeto perfil
- Manejo de errores mejorado (rate limit 429, permisos RLS)

### 3. HTML - `register.html`
- Protección anti-doble-envío (`isSubmitting`)
- Manejo de errores en `createConductor` con mensaje claro

### 4. JS - `js/app.js` (CAMBIOS EXTENSOS)

#### Fase 1: Guardado de firma del conductor (COMPLETADA)
- ✅ `handleSubmit`: incluye `id: currentTripId` para evitar duplicados
- ✅ `submitHSEAuth`: merge de firmas para no perder la firma del conductor
- ✅ `handleSubmit`: helper `getNum()` para convertir campos vacíos a `null` (evita errores 400)
- ✅ `handleSubmit`: hora_salida/hora_llegada con `|| null`
- ✅ `initAuth`: búsqueda insensible a mayúsculas (`.ilike`) para cargar conductor
- ✅ `handleSubmit`: verifica que `currentConductor` esté cargado antes de guardar

#### Fase 2: Flujo de análisis de riesgo y HSE (COMPLETADA)
- ✅ `handleSubmit`: guarda `risk_inputs` JSONB con valores individuales de cada radio
- ✅ `handleSubmit`: estados corregidos:
  - BAJO (≤15): "Pendiente"
  - MEDIO (16-23): "Pendiente HSE"
  - ALTO (>23): "Pendiente Gerencia"
- ✅ `handleSubmit`: muestra modal HSE automáticamente cuando `risk_score > 15` (solo viajes NUEVOS)
- ✅ `editTrip`: restaura radio buttons desde `risk_inputs` al editar
- ✅ `submitHSEAuth`: lee `risk_score` del viaje, si es MEDIO → "Autorizado" + WhatsApp, si es ALTO → "Pendiente Gerencia"
- ✅ SQL: columna `risk_inputs JSONB` agregada a tabla `viajes`

#### Fase 3: Flujo WhatsApp y firmas HSE/Gerencia (COMPLETADA)
- ✅ WhatsApp se envía al **INICIO** del viaje, no al finalizar:
  - BAJO/MEDIO: "🚛 VIAJE INICIADO" después de guardar (BAJO) o después de firma HSE (MEDIO)
  - ALTO: "🚨 SOLICITUD DE AUTORIZACIÓN" después de firma HSE
- ✅ `handleSubmit()`: detecta `isEditing` ANTES de guardar; si edita → solo guarda, sin WhatsApp
- ✅ `handleSubmit()`: solo muestra modal HSE cuando `!currentTripId` (nuevo viaje)
- ✅ `editTrip()`: setea `skipGerenciaSignature` ANTES de `updateRisk()` para ocultar firma Gerencia en viajes ya autorizados
- ✅ `checkSignatures()`: oculta Gerencia si `skipGerenciaSignature` está true o `currentTripId` es null
- ✅ `skipGerenciaSignature`: variable global que evita mostrar firma Gerencia en viajes ya autorizados o finalizados; se resetea en `resetFormAndExit()`
- ✅ `editTrip()`: para estado "Autorizado" solo habilita input `kmLlegada`, no muestra firmas
- ✅ `editTrip()`: para estado "Pendiente Gerencia" abre paso 7, oculta firma conductor, muestra solo auto-firma Gerencia (botón visible), canvas manual bloqueado

#### Fase 4: Sistema PIN y modales (COMPLETADA)
- ✅ `index.html`: modal PIN `z-index` cambiado de `z-[100]` a `z-[120]` para aparecer sobre modal HSE
- ✅ `index.html`: botón "Verificar" del modal PIN tiene `id="btnPinVerify"`
- ✅ `app.js`: `submitPinAuth()` busca `getElementById('btnPinVerify')` en lugar de `button:last-child`
- ✅ `app.js`: fix race condition en `submitPinAuth()` — captura `pinAuthCallback` en variable local ANTES de llamar `closePinAuthModal()`
- ✅ `app.js`: `openPinAuthModal`, `closePinAuthModal`, `submitPinAuth` exportadas a `window`
- ✅ `admin_trips.html`: botón "Aprobar" para viajes ALTO usa PIN admin (`verifyPinAdmin()`) antes de firma Gerencia
- ✅ `admin_trips.html`: import de `generatePDF` renombrado a `generatePDFReport` para evitar conflicto de nombres

### 5. JS - `js/pdf-generator.js` (NUEVO)
- Generador PDF profesional independiente para STE-F-010
- `normalizeTripData()`: convierte datos de Supabase (snake_case) a formato camelCase para el PDF
- `loadLogo()`: carga `assets/logo.png` como base64 para el encabezado
- `generatePDF(data)`: genera PDF con autoTable, colores corporativos, firma, análisis de riesgo
- Compatible con datos del DOM (formulario) y datos de Supabase (admin/historial)
- Exportado como módulo ES6; Vite lo bundlea como chunk separado `pdf-generator-*.js`

### 6. SQL - `sql/crear-conductor-owen.sql`
- Script para crear conductor manualmente (usado para recuperar cuenta rota)

### 7. SQL - `sql/crear-perfil-owen.sql`
- Script para crear perfil manualmente (usado para recuperar cuenta rota)

### 8. SQL - `sql/add-risk-inputs.sql`
- Agrega columna `risk_inputs JSONB` a tabla `viajes`

---

## Bugs Encontrados y Estado

| # | Bug | Estado | Archivo(s) involucrados |
|---|---|---|---|
| 1 | Recursión infinita en RLS de perfiles | ✅ SOLUCIONADO | `schema-roles.sql` |
| 2 | Al finalizar viaje se creaba duplicado | ✅ SOLUCIONADO | `app.js` (handleSubmit) |
| 3 | Firma del conductor se perdía al autorizar HSE | ✅ SOLUCIONADO | `app.js` (submitHSEAuth) |
| 4 | Campos numéricos/time vacíos causaban error 400 | ✅ SOLUCIONADO | `app.js` (handleSubmit) |
| 5 | `currentConductor` no cargaba (undefined) | ✅ SOLUCIONADO | `app.js` (initAuth, register) |
| 6 | Registro de conductor fallaba silenciosamente | ✅ SOLUCIONADO | `register.html`, `schema-roles.sql` |
| 19 | Panel admin sin CRUD de conductores | ✅ SOLUCIONADO | `admin_drivers.html`, `supabase-client.js` |
| 7 | Modal HSE nunca se abría | ✅ SOLUCIONADO | `app.js` (handleSubmit) |
| 8 | Radio buttons de riesgo no se restauraban en edición | ✅ SOLUCIONADO | `app.js` (editTrip) |
| 9 | Estados de riesgo mal implementados | ✅ SOLUCIONADO | `app.js` (handleSubmit) |
| 10 | Firma de Gerencia es decorativa (no existe función) | ✅ SOLUCIONADO | `app.js`, `index.html`, `admin_trips.html` |
| 11 | Auto-firma HSE trivializada | ✅ SOLUCIONADO (ahora pide PIN) | `index.html`, `admin_trips.html` |
| 12 | Auto-firma Gerencia trivializada | ✅ SOLUCIONADO (ahora pide PIN) | `index.html`, `admin_trips.html` |
| 13 | No hay vuelta al portal raíz desde viajes | ⏳ PENDIENTE | `index.html` |
| 14 | Claves Supabase hardcodeadas | ⏳ PENDIENTE | `supabase-client.js` |
| 15 | Link del portal raíz apunta a /dist/ incorrecto | ⏳ PENDIENTE | `apps/index.html` |
| 20 | PDF desde panel de usuario no muestra datos | ✅ SOLUCIONADO | `dist/` (rebuild con Vite) |
| 21 | `generatePDF` en `dist/` era versión obsoleta sin `normalizeTripData` | ✅ SOLUCIONADO | `vite build` |
| 22 | Flujo WhatsApp enviaba mensaje al finalizar viaje desde historial | ✅ SOLUCIONADO | `app.js` (handleSubmit) |
| 23 | `checkSignatures()` mostraba firma Gerencia al crear viaje nuevo | ✅ SOLUCIONADO | `app.js` (checkSignatures) |
| 24 | Modal HSE aparecía al editar viaje ya autorizado | ✅ SOLUCIONADO | `app.js` (handleSubmit) |
| 25 | `pinAuthCallback` se anulaba antes de ejecutarse | ✅ SOLUCIONADO | `app.js` (submitPinAuth) |
| 26 | PIN modal quedaba detrás de modal HSE (z-index) | ✅ SOLUCIONADO | `index.html` |
| 27 | Botón Verificar PIN no encontrado por selector | ✅ SOLUCIONADO | `index.html`, `app.js` |
| 16 | Logout redirige mal y causa loop infinito | ✅ SOLUCIONADO | `supabase-client.js`, `login.html`, `admin_trips.html`, `admin_drivers.html`, `app.js` |
| 17 | Tabla de conductores: 7 headers vs 6 columnas de datos | ✅ SOLUCIONADO | `admin_drivers.html` |
| 18 | Métrica 'En Curso' cuenta 'Pendientes' (label engañoso) | ✅ SOLUCIONADO | `admin_trips.html` |

---

## Flujos Actuales (después de correcciones)

### Registro de conductor
1. `register.html` → `signUp()` → Auth
2. → `createProfile()` → `perfiles` + `user_roles`
3. → `createConductor()` → `conductores` (ahora funciona con RLS corregido)

### Crear viaje (riesgo BAJO ≤15)
1. Conductor completa formulario
2. Firma en paso 7
3. Guarda → estado "Pendiente"
4. WhatsApp "🚛 VIAJE INICIADO" se envía automáticamente
5. Formulario se resetea

### Crear viaje (riesgo MEDIO 16-23)
1. Conductor completa formulario
2. Firma en paso 7
3. Guarda → estado "Pendiente HSE"
4. **Modal HSE se abre automáticamente**
5. HSE firma + PIN → estado "Autorizado"
6. WhatsApp "🚛 VIAJE INICIADO" se envía automáticamente
7. Formulario se resetea

### Crear viaje (riesgo ALTO >23)
1. Conductor completa formulario
2. Firma en paso 7
3. Guarda → estado "Pendiente HSE"
4. **Modal HSE se abre automáticamente**
5. HSE firma + PIN → estado "Pendiente Gerencia"
6. WhatsApp "🚨 SOLICITUD DE AUTORIZACIÓN" se envía
7. Formulario se resetea
8. Desde **Historial** → abrir viaje "Pendiente Gerencia"
9. Gerencia presiona "✅ APROBACIÓN GERENCIA" → auto-firma + PIN
10. Guarda → estado "Autorizado"
11. Conductor abre desde historial → ingresa **KM Llegada**
12. Guarda → estado "Finalizado" (sin WhatsApp)

### Editar viaje existente (finalizar)
1. Abre desde historial
2. Solo input **KM Llegada** está habilitado
3. Ingresa KM final
4. Guarda → estado "Finalizado"
5. **NO envía WhatsApp**, solo guarda y muestra alert "✅ Viaje finalizado"

---

## Fases Pendientes

### Fase 3: Firma de Gerencia (riesgo ALTO) ✅ COMPLETADA
- ✅ Implementar `autoSignGerencia()` que carga imagen URL en canvas
- ✅ Crear función `submitGerenciaAuth()` que guarda firma, cambia estado a "Autorizado"
- ✅ Modificar `editTrip()` para saltar al paso 7 cuando estado es "Pendiente Gerencia"
- ✅ Modificar `submitHSEAuth()` para abrir paso 7 después de HSE cuando riesgo es ALTO
- ✅ Modificar `admin_trips.html` para mostrar botón "Aprobar" en viajes "Pendiente Gerencia"

### Fase 4: PDF Profesional ✅ COMPLETADA
- ✅ Crear `js/pdf-generator.js` como módulo independiente
- ✅ `normalizeTripData()` convierte snake_case → camelCase
- ✅ `loadLogo()` carga logo PNG como base64
- ✅ `generatePDF()` usa autoTable, colores corporativos, firmas como imágenes
- ✅ Vite bundlea como chunk separado `pdf-generator-*.js`
- ✅ Rebuild de `dist/` para incluir el nuevo generador

### Fase 5: Seguridad UX
- Reemplazar auto-firma HSE por autenticación real (código, contraseña, o credenciales)
- Reemplazar auto-firma Gerencia por autenticación real
- Proteger rutas admin (no solo JS, sino validación visual)

### Fase 6: Mejoras generales
- Formulario wizard de registro paso a paso
- Persistencia de borrador en localStorage
- Variables de entorno para claves Supabase
- Corregir link del portal raíz
- Navegación de vuelta al portal desde las apps

---

## Datos Técnicos

### Supabase
- **URL:** https://xftllyjjqvozjjmgwomg.supabase.co
- **Anon Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdGxseWpqcXZvempqbWd3b21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjExMTIsImV4cCI6MjA5Mzc5NzExMn0.UURzZOytfoYMrxzpohRams_GcJ3ETsEnNNOaSQqeuu8
- **WhatsApp HSE:** 3136332887

### Estructura de tablas
- `auth.users` → autenticación (manejado por Supabase)
- `perfiles` → datos personales (id, email, nombre_completo)
- `user_roles` → roles separados (user_id, rol)
- `conductores` → datos laborales
- `viajes` → registro de viajes (+ `risk_inputs` JSONB, `signatures` JSON)
- `vehiculos` → catálogo
- `preoperacionales`, `asistencia`, `vencimientos`, `incidentes`, `registros_lavado`, `capacitaciones`, `asistencia_capacitaciones`

### Archivos modificados recientemente
1. `sql/schema-roles.sql` (reescrito desde cero)
2. `js/supabase-client.js` (roles, perfiles, fix logout, verifyPinAdmin, deleteConductor)
3. `js/app.js` (firma conductor, riesgo, edición, fix logout, sistema PIN HSE/Gerencia, flujo WhatsApp, skipGerenciaSignature)
4. `js/pdf-generator.js` (NUEVO: generador PDF profesional con normalizeTripData, autoTable, logo)
5. `register.html` (anti-doble-envío, manejo de errores)
6. `admin_trips.html` (botón "Aprobar" con PIN, fix logout, fix metrica, import generatePDFReport)
7. `admin_drivers.html` (CRUD completo: crear, editar, eliminar conductores)
8. `login.html` (evita redireccion loop)
9. `index.html` (quitar boton PDF, modal PIN auth z-120, btnPinVerify)
10. `sql/config-pin-admin.sql` (tabla config + función RPC verificar_pin_admin)
11. `sql/crear-conductor-owen.sql`
12. `sql/crear-perfil-owen.sql`
13. `sql/add-risk-inputs.sql`
14. `sql/crear-admin.sql`
15. `sql/crear-admin-listo.sql`
16. `sql/diagnostico-login.sql`
17. `sql/recargar-schema.sql`
18. `setup-admin.html`
19. `vite.config.js`
20. `dist/` (rebuild completo con Vite v6.4.2)

---

## Notas para Continuar

1. **Siempre verificar que el SQL se ejecutó** antes de probar cambios que dependen de columnas nuevas (ej. `risk_inputs`).
2. **Probar con un usuario real** (no solo el admin) para validar políticas RLS.
3. **Revisar la consola del navegador** para mensajes `initAuth:` que indiquen si conductor/perfil cargaron correctamente.
4. **Rate limit de Supabase Auth:** si aparece 429, esperar 10-15 minutos o crear usuario desde el dashboard.

---

## Última acción realizada

Rebuild completo del proyecto con Vite para incluir `pdf-generator.js` en el bundle de producción:

**Problema:** Al descargar PDF desde el panel de usuario (historial), los datos no aparecían. La causa era que el `dist/` tenía una versión obsoleta de `generatePDF` (creada el 18/05 7:26pm) que no incluía `normalizeTripData` ni `autoTable`. El archivo `pdf-generator.js` fue creado posteriormente (18/05 8:05pm) pero nunca se había incluido en el bundle.

**Solución aplicada:**
1. Ejecutar `npx vite build` desde `apps/viajes/`
2. Vite generó nuevos chunks con hash:
   - `main-DJ8jJKmb.js` (40.49 kB)
   - `pdf-generator-B2EORo8W.js` (10.81 kB) — **nuevo chunk con normalizeTripData + autoTable**
   - `supabase-client-C06uOCjZ.js` (217.58 kB)
3. Verificado que `pdf-generator-B2EORo8W.js` contiene:
   - `normalizeTripData` (minificado como `de`) — convierte `hora_salida` → `horaSalida`
   - `autoTable` — tablas profesionales en el PDF
   - `loadLogo` — carga `./assets/logo.png`
4. `dist/index.html` ahora apunta al nuevo bundle `main-DJ8jJKmb.js`

**Flujos corregidos recientemente:**
- `handleSubmit()`: detecta `isEditing` ANTES de guardar; edición → solo guarda, sin WhatsApp
- `handleSubmit()`: solo muestra modal HSE cuando `!currentTripId` (nuevo viaje)
- `editTrip()`: setea `skipGerenciaSignature` ANTES de `updateRisk()`
- `checkSignatures()`: oculta Gerencia si `skipGerenciaSignature` o `currentTripId` null
- PIN modal: z-index 120, botón con ID `btnPinVerify`, fix race condition en callback

Próxima acción: Probar descarga de PDF desde el panel de usuario (historial) y verificar que todos los datos aparecen correctamente.

---

## Estado: Master Data Core (2026-08-13)

### Migración canonical completada para otras apps
Todas las apps excepto viajes ya apuntan a tablas canonical:
- `apps/lavado` → `flota.lavados`
- `apps/encuesta` → `operacion.encuestas`
- `apps/asistencia` → `operacion.asistencia`
- `apps/preoperacional` → `flota.inspecciones`
- `apps/aseo` → `hseq.aseo_inspecciones`
- `apps/botiquin` → `hseq.botiquin_inspecciones`
- `apps/extintor` → `hseq.extintor_inspecciones`
- `apps/fleet` → `flota.vehiculos` (select con schema calificado)

### Viajes: PENDIENTE
La app viajes NO fue migrada porque:
1. Las tablas canonical `operacion.viajes` aún no existen en la DB (solo en SQL)
2. El modelo canonical usa `vehiculo_id` (UUID FK) pero la app usa `vehiculo_placa` (TEXT)
3. `core.conductores` tiene columnas diferentes a `public.conductores` (split en personas + conductores)
4. Requiere ejecutar las migraciones SQL primero

### Mapeo de tablas viajes → canonical
| Legacy (public.*) | Canonical | Call sites |
|---------------------|-----------|------------|
| `viajes` | `operacion.viajes` | SELECT×10, INSERT×1, UPDATE×2, DELETE×1 |
| `conductores` | `core.personas` + `core.conductores` | SELECT×4, INSERT×2, UPDATE×1, DELETE×1 |
| `perfiles` | `core.personas` | SELECT×2, INSERT×1, UPDATE×1 |
| `user_roles` | `core.user_roles` | SELECT×1, INSERT×1 |
| `vehiculos` | `flota.vehiculos` | SELECT×3 |
| `preoperacionales` | `flota.inspecciones` | UPDATE×1 (FK cleanup) |
| `asistencia` | `operacion.asistencia` | UPDATE×1 (FK cleanup) |
| `asistencia_capacitaciones` | `operacion.capacitacion_asistencia` | DELETE×1 (FK cleanup) |
| `incidentes` | `hseq.incidentes` | UPDATE×1 (FK cleanup) |
| `vencimientos` | Sin canonical | DELETE×1 (FK cleanup) |

### Próximo paso para viajes
1. Ejecutar en Supabase Dashboard:
   - `supabase/migrations/20260813000000_master_data_core.sql`
   - `supabase/migrations/20260813000001_data_migration_legacy_to_canonical.sql`
2. Verificar que las tablas canonical existen y tienen datos
3. Migrar `js/supabase-client.js` (40+ call sites)
4. Migrar `js/app.js` (inline queries)
5. Migrar `admin_trips.html` y `admin_drivers.html`
