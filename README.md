# A&B OS — Frontend

Sistema operativo empresarial de TRANSSERVICES A&B. Este repositorio contiene
el **frontend completo** (Next.js), construido módulo por módulo siguiendo
el Blueprint Maestro y el roadmap de fases.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre http://localhost:3000 — redirige automáticamente a /dashboard.
El Portal Conductor (mobile-first) vive en /portal-conductor.

## Estado de los módulos (todos construidos)

| Módulo | Ruta | Notas |
|---|---|---|
| Dashboard | /dashboard | Datos reales agregados de Flota, Personas, HSEQ |
| Personas | /personas | Lista, ficha 360, crear |
| Contratistas | /contratistas | Lista, ficha 360 (cuenta vehiculos/conductores en vivo), crear |
| Flota | /flota | Lista, ficha 360, crear. Vencimientos SOAT/RTM/poliza calculados |
| Asignaciones | /asignaciones | Activas/Programadas/Historial. Nucleo de la regla conductor<->vehiculo |
| Operacion (Viajes) | /operacion | Solo viajes fuera de municipio o +2h, con novedades |
| SG-SST | /sgsst | Matriz general Resolucion 0312/2019 - 7 estandares, 60 items, listo para subir documentos |
| PESV | /pesv | 4 fases, 24 pasos (Res. 40595/2022) + Indicadores (Formulario 2 VIGIA2) |
| HSEQ | /hseq | Hallazgos con flujo completo: evidencia -> notificacion -> tarea -> cierre |
| Documentos | /documentos | Vista transversal - agrega documentos de Flota + Personas + Contratistas |
| Capacitaciones | /capacitaciones | Lista + crear |
| Encuestas | /encuestas | Lista + crear |
| Asistencia | /asistencia | Registro de asistencia a eventos |
| Reportes | /reportes | Hub que agrega indicadores reales de todos los modulos |
| Intelligence | /intelligence | Insights cruzados calculados en vivo |
| Administracion | /administracion | Usuarios (desde Personas) + Roles configurables |
| Portal Conductor | /portal-conductor | Mobile-first: mi asignacion, preoperacional, novedad |

## Estructura

```
app/
  (app)/              <- grupo desktop: Sidebar + Topbar (AppShell)
    dashboard/  personas/  contratistas/  flota/  asignaciones/
    operacion/  sgsst/  pesv/  hseq/  documentos/
    capacitaciones/  encuestas/  asistencia/  reportes/  intelligence/
    administracion/
  (portal)/           <- grupo mobile: bottom nav (MobileShell)
    portal-conductor/

components/
  ui/                  <- Design System: Button, Card, StatCard, DataTable,
                          StatusBadge, PlateTag, Avatar, ProfileTag, TurnoTag,
                          DocExpiryBadge, DocUploadSlot, FormField (TextField/
                          SelectField/FormSection)
  layout/              <- Sidebar, Topbar, AppShell, MobileShell,
                          ModulePlaceholder

lib/
  modules.ts           <- mapa central de navegacion (unica fuente de verdad
                          del sidebar)
  types/                <- un archivo por dominio (persona, vehiculo,
                          contratista, asignacion, viaje, sgsst, pesv, hseq,
                          documento, capacitacion, encuesta, asistencia)
  data/                 <- seeds de cada dominio (datos de ejemplo, ver abajo)
```

## Que es real vs. que es ejemplo

- **Datos reales confirmados**: 30 vehiculos, 5 contratistas (uno con
  rotacion 12h/24h y ciclo de 4 dias de descanso, 6 vehiculos).
- **Datos de ejemplo (seed)**: nombres de personas, nombres de contratistas
  (Contratista 1-5, genericos), viajes, hallazgos, capacitaciones, encuestas.
  Todo esta marcado como tal en cada pantalla.
- **SG-SST y PESV**: la estructura normativa (estandares, pasos, ciclo PHVA)
  esta verificada contra fuentes publicas sobre la Resolucion 0312/2019 y
  40595/2022, pero la redaccion exacta de cada item debe confirmarse contra
  el texto oficial antes de un reporte formal (a la ARL o a VIGIA2).

## Identidad visual

- Base: asfalto nocturno (asphalt-950 a asphalt-700), centro de mando 24/7.
- Acentos: ambar de senalizacion (signal-amber, alertas/primario), cian
  radar (radar-cyan, datos en vivo/activo), rojo (alert-red, critico), verde
  (ok-green, cumple/activo).
- Tipografia: Big Shoulders Display (titulos) + IBM Plex Sans (cuerpo) +
  IBM Plex Mono (placas, datos, timestamps).
- Motivo de firma: linea de ruta punteada (.route-line / .route-line-h).

Todos los tokens de color y tipografia estan centralizados en
app/globals.css.

## Regla de integracion entre modulos (importante)

La relacion Conductor <-> Vehiculo NUNCA vive como campo fijo en Persona o
Vehiculo. Siempre se consulta la asignacion activa en
lib/data/asignaciones.ts (funciones getAsignacionActiva /
getHistorialPorConductor / getHistorialPorVehiculo). Cualquier modulo nuevo
que necesite saber "que vehiculo tiene este conductor hoy" debe usar esas
funciones, nunca un campo directo.

## Pendiente (siguiente etapa natural)

1. Conectar un backend real (Supabase sugerido en el blueprint original) -
   hoy todos los formularios validan pero no persisten, y DocUploadSlot no
   sube archivos de verdad todavia.
2. Autenticacion real (hoy Administracion y Portal Conductor usan ids fijos
   de ejemplo, sin sesion).
3. Reemplazar los 5 contratistas de ejemplo por los reales.
4. Verificar la redaccion oficial exacta de SG-SST (Res. 0312/2019) y PESV
   (Res. 40595/2022) contra el texto normativo.
