# Regla Inquebrantable: Preservación Estricta del Sistema de Diseño (UI/UX)

## 1. Mandato Principal
Al implementar nuevas funcionalidades, lógica de negocio, módulos, apartados, formularios, componentes o endpoints, **ESTÁ ESTRICTAMENTE PROHIBIDO MODIFICAR, REDISEÑAR O ALTERAR EL LENGUAJE VISUAL EXISTENTE**, a menos que el usuario lo solicite de manera explícita e inequívoca.

---

## 2. Pautas Obligatorias de Diseño

### A. Paleta de Colores y Tokens (globals.css)
* Usar **únicamente** los tokens y clases temáticas definidas en `app/globals.css`:
  - **Fondos y Superficies**: `asphalt-950` (#0b0e12), `asphalt-900` (#11151b), `asphalt-800` (#191f27), `asphalt-700` (#232b36).
  - **Bordes y Divisores**: `line-600` (#384357), `line-500` (#4a5872).
  - **Textos**: `paper-50` (#eef2f6 - títulos/primario), `mist-200` (#c3ccd8 - secundario), `fog-400` (#7c8a9e - metadatos/muted).
  - **Acentos y Semáforos**:
    - `signal-amber` / `signal-amber-dim` (alertas, primario, acento de navegación).
    - `radar-cyan` / `radar-cyan-dim` (datos en vivo, activos, telemetría).
    - `alert-red` / `alert-red-dim` (crítico, vencido, peligro).
    - `ok-green` / `ok-green-dim` (al día, éxito, conforme).
* Prohibido introducir colores Tailwind genéricos (como `bg-blue-500`, `bg-gray-100`, etc.) o alterar las variables CSS raíz.

### B. Tipografía y Jerarquía
* **Títulos y Números/KPIs**: `font-[family-name:var(--font-display)]` (*Big Shoulders Display*).
* **Cuerpo y Textos Generales**: `font-[family-name:var(--font-body)]` (*IBM Plex Sans*).
* **Códigos, Placas, Cédulas y Fechas**: `font-[family-name:var(--font-mono)]` (*IBM Plex Mono*).

### C. Estructura de Componentes y Tarjetas
* Toda nueva sección, módulo o vista debe construir su interfaz reutilizando el ecosistema en `components/ui/` y `components/layout/`:
  - Contenedores y secciones: `<Card>`, `<StatCard>`.
  - Tablas: `<DataTable>` con las mismas clases de encabezado y fila.
  - Indicadores y Tags: `<StatusBadge>`, `<PlateTag>`, `<ProfileTag>`, `<TurnoTag>`, `<DocExpiryBadge>`.
  - Formularios: `<FormField>`, `<TextField>`, `<SelectField>`, `<FormSection>`, `<Button>`.
  - Motivo de firma: Línea punteada `.route-line` / `.route-line-h`.

### D. Filosofía de Evolución
* El desarrollo se enfoca en **persistencia, backend, validaciones, flujos de datos y lógica de negocio**, manteniendo la coherencia visual al 100%.
* Cualquier cambio estructural de interfaz o cambio de paleta requerirá la autorización y petición directa del usuario.
