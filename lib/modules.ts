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
      { id: "inspecciones", label: "Inspecciones Diarias", href: "/lavado", icon: "clipboard" },
      { id: "capacitaciones", label: "Capacitaciones", href: "/capacitaciones", icon: "graduation" },
      { id: "pesv", label: "PESV Seguridad Vial", href: "/pesv", icon: "road" },
      { id: "sgsst", label: "SG-SST Laboral", href: "/sgsst", icon: "shield" },
      { id: "hseq", label: "Auditoría HSEQ", href: "/hseq", icon: "leaf" },
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
      { id: "administracion", label: "Configuración", href: "/administracion", icon: "settings" },
    ],
  },
];
