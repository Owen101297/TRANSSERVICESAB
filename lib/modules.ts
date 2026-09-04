export interface ModuleNavItem {
  id: string;
  label: string;
  href: string;
  icon: string; // clave simple; se reemplaza por set de íconos real más adelante
}

export interface ModuleGroup {
  id: string;
  label: string;
  items: ModuleNavItem[];
}

// Estructura calcada del mapa de módulos del blueprint (CORE, PERSONAS, CONTRATISTAS,
// FLOTA, OPERACIÓN, SG-SST, PESV, HSEQ, DOCUMENTOS, REPORTES, INTELLIGENCE, ADMINISTRACIÓN)
export const NAV_GROUPS: ModuleGroup[] = [
  {
    id: "general",
    label: "",
    items: [{ id: "inicio", label: "Inicio", href: "/dashboard", icon: "home" }],
  },
  {
    id: "core-operativo",
    label: "Operación",
    items: [
      { id: "personas", label: "Personas", href: "/personas", icon: "users" },
      { id: "contratistas", label: "Contratistas", href: "/contratistas", icon: "building" },
      { id: "flota", label: "Flota", href: "/flota", icon: "truck" },
      { id: "gps", label: "Telemetría GPS", href: "/gps", icon: "radio" },
      { id: "asignaciones", label: "Asignaciones", href: "/asignaciones", icon: "link" },
      { id: "operacion", label: "Viajes", href: "/operacion", icon: "route" },
    ],
  },
  {
    id: "seguridad",
    label: "Seguridad y cumplimiento",
    items: [
      { id: "sgsst", label: "SG-SST", href: "/sgsst", icon: "shield" },
      { id: "pesv", label: "PESV", href: "/pesv", icon: "road" },
      { id: "hseq", label: "HSEQ", href: "/hseq", icon: "leaf" },
    ],
  },
  {
    id: "digitalizacion",
    label: "Formularios digitalizados",
    items: [
      { id: "preoperacionales", label: "Preoperacionales", href: "/hseq/preoperacionales", icon: "clipboard" },
      { id: "capacitaciones", label: "Capacitaciones", href: "/capacitaciones", icon: "graduation" },
      { id: "encuestas", label: "Encuestas PESV", href: "/encuestas", icon: "clipboard" },
      { id: "asistencia", label: "Asistencia Diaria", href: "/asistencia", icon: "check" },
      { id: "lavado", label: "Control de Lavado", href: "/lavado", icon: "droplets" },
      { id: "aseo", label: "Aseo y Desinfección", href: "/aseo", icon: "sparkles" },
      { id: "extintores", label: "Extintores", href: "/extintores", icon: "shield" },
      { id: "botiquines", label: "Botiquines", href: "/botiquines", icon: "heart" },
    ],
  },
  {
    id: "gestion",
    label: "Gestión",
    items: [
      { id: "documentos", label: "Documentos", href: "/documentos", icon: "file" },
      { id: "reportes", label: "Reportes", href: "/reportes", icon: "chart" },
      { id: "intelligence", label: "Intelligence", href: "/intelligence", icon: "cpu" },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      { id: "administracion", label: "Administración", href: "/administracion", icon: "settings" },
      { id: "portal-conductor", label: "Portal Conductor", href: "/portal-conductor", icon: "smartphone" },
    ],
  },
];
