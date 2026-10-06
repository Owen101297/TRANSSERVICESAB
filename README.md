# ERP de TRANSSERVICES A&B

A&B OS gestiona personal, contratistas, flota, asignaciones, viajes, inspecciones, HSEQ, formación, asistencia y documentos. El portal del conductor y la administración comparten PostgreSQL. La persistencia y la autenticación están implementadas; los pendientes funcionales se detallan en el diagnóstico.

## Documentación vigente

Este README es la entrada al proyecto. Cada documento tiene una función distinta:

- Diagnóstico técnico local (`docs/diagnostico.json`, excluido del repositorio público): hallazgos, evidencias y verificaciones del 5 de octubre de 2026. Es una evaluación fechada, no una comprobación permanente.
- [Conector de Google Forms](docs/google-forms-asistencia.md): configuración y uso de la integración de asistencia.
- [Proceso común de desarrollo](/home/owen/Projects/README.md): ubicaciones de trabajo, ramas, validación y entrega.
- [Operación de Coolify](/home/owen/centro/plataforma/migraciones/servicios-coolify/OPERACION.md): despliegues, monitoreo, respaldo y recuperación.

El plan maestro se localizó en `/run/media/owen/EXTERNO/B - DASHBOARD-TRANSSERVICES/transservices/docs/MASTER_IMPLEMENTATION_PLAN.md`. Corresponde a la arquitectura histórica Vite/Supabase y está pendiente de reconciliar con Next.js/Prisma. La especificación `docs/matriz-laboral-asistencia.md` de la copia actual del disco, `ERP-TRANSSERVICES`, ya fue incorporada al repositorio. Los originales se conservaron intactos; la comparación con GitHub está registrada en el diagnóstico.

La especificación de [matriz laboral](docs/matriz-laboral-asistencia.md) está pendiente de aprobación; no equivale a una funcionalidad implementada.

## Arquitectura y entornos

Next.js 16.3.8 y React 19.2.8 contienen la interfaz, las API y las acciones del servidor. Prisma 6 accede a PostgreSQL. Las migraciones versionadas están en `prisma/migrations/`.

- Producción: https://erp.owenai.uk
- Pruebas: https://erp-staging.owenai.uk
- Administración de recursos: https://deploy.owenai.uk

Ambos entornos están gestionados en Coolify y tienen bases separadas. `deploy/Dockerfile.selfhost` construye la imagen y aplica las migraciones al iniciar. Los secretos se configuran en Coolify o en el gestor cifrado; nunca se guardan en la documentación.

Los documentos generales usan almacenamiento S3 privado. Las evidencias de asistencia dependen de Google Drive y la validación de formularios usa un conector de Google Apps Script. La presencia de variables de integración no demuestra que la conexión funcione.

## Flujo de negocio

La relación conductor y vehículo se mantiene en asignaciones con historial. Un cambio debe cerrar la anterior y abrir la nueva sin perder datos. Los viajes integran el análisis de riesgo, las autorizaciones y el cierre. Las inspecciones pueden originar hallazgos HSEQ. Formación y asistencia conservan actividad, participantes, firma, validación y evidencia.

### Fase 1: autorización de viajes y acciones del servidor

La política compartida de API y acciones calcula el riesgo con los siete factores del catálogo existente. Hasta 15 puntos admite autorización automática; de 16 a 23 exige HSEQ o administración; desde 24 exige el perfil administrativo, que actualmente representa la autorización gerencial. El conductor solo consulta y modifica sus propios viajes y no firma como HSEQ o gerencia.

La identidad y fecha del autorizador se registran en el servidor. Si cambian los factores, la firma anterior se conserva, pero deja de autorizar el viaje. Las firmas históricas sin identidad verificada requieren una nueva autorización. Los viajes cerrados no se sobrescriben. Programar desde Operación sin evaluar riesgo crea un viaje `programado`; la evaluación y autorización se completan antes de activarlo o cerrarlo.

Las lecturas y mutaciones de GPS requieren personal autorizado dentro de cada acción. La recepción GPS por webhook conserva su clave independiente y utiliza un módulo interno sin exponerlo como acción pública. Los preoperacionales vinculan identidad, vehículo asignado y jornada abierta en el servicio, además de los controles de la API. Los perfiles se vuelven a consultar en la base al validar la sesión.

El diagnóstico local registra la versión comprobada por entorno. Esta fase no implementa permisos configurables, envío real de notificaciones ni carga documental SG-SST/PESV.

## Prioridades actuales

1. Corregir autorizaciones de viajes y acciones del servidor.
2. Implementar la carga real de evidencias SG-SST y PESV.
3. Completar Google Drive en producción y distinguir notificación preparada, enviada y confirmada.
4. Aplicar permisos configurables, transacciones de asignación y fechas de Colombia de forma consistente.
5. Verificar el flujo completo en pruebas antes de entregar cambios a producción.

La interfaz actual tiene diferencias respecto de las reglas visuales documentadas. Su unificación requiere una decisión de diseño; esta limpieza no rediseña pantallas.

## Desarrollo y validación

Usar Node.js 22 y npm 10. Instalar dependencias con `npm ci`, configurar una base de desarrollo separada siguiendo `.env.example` y ejecutar `npm run dev`. No usar la base productiva para pruebas de escritura.

```sh
npm test
npx tsc --noEmit --incremental false
npm run lint
npm run build
```

Ejecutar estos controles en un entorno de desarrollo con recursos suficientes. Las pruebas de origen público deben aislar `PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_URL` y `RAILWAY_PUBLIC_DOMAIN` de los valores del despliegue. Las pruebas existentes no sustituyen las pruebas de permisos, persistencia y recorridos completos.

`tests/staging-trip-flow.mjs` verifica el recorrido autenticado con personas, vehículo y viajes sintéticos. Solo se habilita explícitamente con `ERP_PHASE1_STAGING_TEST=1` dentro del contenedor cuyo `PUBLIC_APP_URL` es el de staging. Elimina únicamente sus propias filas de prueba al terminar; no se ejecuta como parte de `npm test`.

## Organización del código

- `app/`: páginas, layouts y API.
- `components/`: interfaz compartida y componentes por módulo.
- `lib/`: autenticación, servicios, validaciones y almacenamiento.
- `prisma/`: esquema y migraciones.
- `public/apps/`: aplicaciones web de campo y sus recursos públicos. Nunca contiene diagnósticos, planes internos ni credenciales.
- `tests/`: comprobaciones automatizadas.
- `scripts/`: utilidades de migración y conectores; revisar sus efectos antes de ejecutarlas.
- `docs/`: documentación vigente del proyecto.

Las instrucciones para agentes están en `AGENTS.md`. La política de diseño se mantiene en `.agents/rules/design-system-integrity.md`; `CLAUDE.md` y `GEMINI.md` actúan como referencias para sus herramientas.
