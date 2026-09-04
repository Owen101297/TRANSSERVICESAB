# Regla Permanente de Integridad del Sistema de Diseño (UI/UX)

Toda modificación, expansión funcional o nueva característica debe acatar estrictamente:

1. **Preservación Visual Total**: El diseño, estructura de tarjetas (`<Card>`, `<StatCard>`), tablas (`<DataTable>`), badges, formularios y layouts existentes deben mantenerse intactos y homogéneos en cualquier módulo nuevo o existente.
2. **Paleta de Colores de Marca (`globals.css`)**:
   - Fondos: `asphalt-950`, `asphalt-900`, `asphalt-800`, `asphalt-700`
   - Líneas/Bordes: `line-600`, `line-500`
   - Textos: `paper-50` (principal), `mist-200` (secundario), `fog-400` (muted)
   - Estados: `signal-amber`, `radar-cyan`, `alert-red`, `ok-green`
3. **Tipografía Obligatoria**:
   - `font-display` (*Big Shoulders Display*) para encabezados y números grandes.
   - `font-body` (*IBM Plex Sans*) para textos generales.
   - `font-mono` (*IBM Plex Mono*) para placas, documentos, fechas y códigos.
4. **Modificación de Diseño**: Únicamente permitida cuando el usuario dé una instrucción explícita de cambio estético.
5. **Regla Obligatoria de Estados de Interfaz (Carga, Error y Vacío)**:
   - **A. Estado de Carga (*Loading / Skeleton State*)**: Emplear esqueletos visuales con pulso suave (`<TableSkeleton />`, `<CardSkeleton />` o `animate-pulse`) que preserven la altura y columnas del layout, evitando saltos bruscos (*Cumulative Layout Shift - CLS*).
   - **B. Estado de Error (*Error & Retry State*)**: Mostrar mensajes de error claros, contextualizados y amigables con un botón de acción rápida **"Reintentar"** (`onRetry`) que vuelva a ejecutar la consulta sin requerir refrescar la página.
   - **C. Estado de Contenido Vacío (*Empty State*)**: Cuando no existan registros o los filtros no devuelvan resultados, mostrar un componente `<EmptyState />` con ícono representativo, texto explicativo y un botón de acción principal (*Call to Action*, ej: "Limpiar filtros", "Registrar nueva inspección", etc.).

