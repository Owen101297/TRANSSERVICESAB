export interface ModuleNavItem {
  id: string;
  label: string;
  href: string;
  icon: string; // clave simple; se reemplaza por set de íconos real más adelante
  children?: ModuleNavItem[];
}

export interface ModuleGroup {
  id: string;
  label: string;
  items: ModuleNavItem[];
}

// Estructura calcada del mapa de módulos del blueprint (CORE, PERSONAS, CONTRATISTAS,
// FLOTA, OPERACIÓN, SG-SST, PESV, HSEQ, DOCUMENTOS, REPORTES, INTELLIGENCE, ADMINISTRACIÓN)
// Estructura consolidada Apple Pro: 4 Hubs lógicos de alta densidad
export const NAV_GROUPS: ModuleGroup[] = [
  {
    id: "general",
    label: "",
    items: [{ id: "inicio", label: "Inicio", href: "/dashboard", icon: "home" }],
  },
  {
    id: "core-operativo",
    label: "Operación & Flota",
    items: [
      { id: "flota", label: "Flota de Vehículos", href: "/flota", icon: "truck" },
      { id: "asignaciones", label: "Asignaciones", href: "/asignaciones", icon: "link" },
      { id: "gps", label: "Telemetría GPS", href: "/gps", icon: "radio" },
      { id: "operacion", label: "Viajes & Despacho", href: "/operacion", icon: "route" },
      { id: "personas", label: "Personal & Conductores", href: "/personas", icon: "users" },
      { id: "contratistas", label: "Contratistas", href: "/contratistas", icon: "building" },
    ],
  },
  {
    id: "seguridad",
    label: "HSEQ & Seguridad Vial",
    items: [
      {
        id: "inspecciones",
        label: "Inspecciones",
        href: "/lavado",
        icon: "clipboard",
        children: [
          { id: "preoperacionales", label: "Preoperacionales", href: "/hseq/preoperacionales", icon: "check" },
          { id: "lavado", label: "Lavado de flota", href: "/lavado", icon: "droplets" },
          { id: "aseo", label: "Aseo y desinfección", href: "/aseo", icon: "sparkles" },
          { id: "extintores", label: "Extintores", href: "/extintores", icon: "shield-alert" },
          { id: "botiquines", label: "Botiquines", href: "/botiquines", icon: "heart" },
        ],
      },
      {
        id: "formacion-eventos",
        label: "Formación y eventos",
        href: "/asistencia/eventos",
        icon: "graduation",
        children: [
          { id: "eventos-asistencia", label: "Eventos y asistencia", href: "/asistencia/eventos", icon: "calendar-check" },
          { id: "capacitaciones", label: "Capacitaciones y charlas", href: "/capacitaciones", icon: "graduation" },
          { id: "novedades-personal", label: "Novedades y justificaciones", href: "/asistencia/novedades", icon: "calendar-off" },
          { id: "asistencia-historica", label: "Registros anteriores", href: "/asistencia", icon: "history" },
        ],
      },
      { id: "encuestas", label: "Encuestas y caracterización", href: "/encuestas", icon: "file-spreadsheet" },
      { id: "pesv", label: "PESV Seguridad Vial", href: "/pesv", icon: "road" },
      { id: "sgsst", label: "SG-SST Laboral", href: "/sgsst", icon: "shield" },
      { id: "hseq", label: "Hallazgos y acciones HSEQ", href: "/hseq", icon: "leaf" },
    ],
  },
  {
    id: "gestion",
    label: "Gestión & Sistema",
    items: [
      { id: "documentos", label: "Documentos", href: "/documentos", icon: "file" },
      { id: "reportes", label: "Reportes", href: "/reportes", icon: "chart" },
      { id: "intelligence", label: "Intelligence IA", href: "/intelligence", icon: "cpu" },
      { id: "portal-conductor", label: "Portal del Conductor", href: "/portal-conductor", icon: "smartphone" },
      { id: "auditoria", label: "Auditoría", href: "/auditoria", icon: "history" },
      { id: "administracion", label: "Configuración", href: "/administracion", icon: "settings" },
    ],
  },
];
