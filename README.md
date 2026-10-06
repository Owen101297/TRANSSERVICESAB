# ERP de TRANSSERVICES A&B

A&B OS gestiona personal, contratistas, flota, asignaciones, viajes, inspecciones, HSEQ, formación, asistencia y documentos. El portal del conductor y la administración comparten PostgreSQL. La persistencia y la autenticación están implementadas; los pendientes funcionales se detallan en el diagnóstico.

## Documentación vigente

Este README es la entrada al proyecto. Cada documento tiene una función distinta:

- Diagnóstico técnico local (`docs/diagnostico.json`, excluido del repositorio público): hallazgos, evidencias y verificaciones del 5 de octubre de 2026. Es una evaluación fechada, no una comprobación permanente.
- [Conector de Google Forms](docs/google-forms-asistencia.md): configuración y uso de la integración de asistencia.
- [Proceso común de desarrollo](/home/owen/Projects/README.md): ubicaciones de trabajo, ramas, validación y entrega.
- [Operación de Coolify](/home/owen/centro/plataforma/migraciones/servicios-coolify/OPERACION.md): despliegues, monitoreo, respaldo y recuperación.

El plan maestro se localizó en `/run/media/owen/EXTERNO/B - DASHBOARD-TRANSSERVICES/transservices/docs/MASTER_IMPLEMENTATION_PLAN.md`. Corresponde a la arquitectura histórica Vite/Supabase y está pendiente de reconciliar con Next.js/Prisma. La copia actual del disco, `ERP-TRANSSERVICES`, contiene además `docs/matriz-laboral-asistencia.md`, una especificación pendiente de aprobación y fuera de Git. Los originales se conservaron intactos; la comparación con GitHub está registrada en el diagnóstico.

La especificación de [matriz laboral](docs/matriz-laboral-asistencia.md) está pendiente de aprobación; no equivale a una funcionalidad implementada.

## Arquitectura y entornos

Next.js 16.3.8 y React 19.2.8 contienen la interfaz, las API y las acciones del servidor. Prisma 6 accede a PostgreSQL. Las migraciones versionadas están en `prisma/migrations/`.

- Producción: https://erp.owenai.uk
- Pruebas: https://erp-staging.owenai.uk
- Administración de recursos: https://deploy.owenai.uk

Ambos entornos están gestionados en Coolify y tienen bases separadas. `deploy/Dockerfile.selfhost` construye la imagen y aplica las migraciones al iniciar. Los secretos se configuran en Coolify o en el gestor cifrado; nunca se guardan en la documentación.

Los documentos generales usan almacenamiento S3 privado. Las evidencias de asistencia dependen de Google Drive y la validación de formularios usa un conector de Google Apps Script. La presencia de variables de integración no demuestra que la conexión funcione.

## Flujo de negocio

La relación conductor y vehículo se mantiene en asignaciones con historial. Un cambio debe cerrar la anterior y abrir la nueva sin perder datos. Los viajes integran el análisis de riesgo, las autorizaciones y el cierre; la implementación actual necesita reforzar las validaciones del servidor. Las inspecciones pueden originar hallazgos HSEQ. Formación y asistencia conservan actividad, participantes, firma, validación y evidencia.

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
