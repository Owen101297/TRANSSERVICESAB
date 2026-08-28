export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  esConfigurable: boolean;
}

// Roles iniciales del blueprint — el administrador puede crear/modificar
// roles desde esta pantalla; estos no deben quedar codificados rígidamente
// en el backend real, solo sirven como punto de partida.
export const SEED_ROLES: Rol[] = [
  { id: "r1", nombre: "SUPER_ADMIN", descripcion: "Acceso total al sistema, incluida configuración de roles.", esConfigurable: false },
  { id: "r2", nombre: "ADMINISTRADOR", descripcion: "Gestión operativa completa, sin configuración del sistema.", esConfigurable: true },
  { id: "r3", nombre: "DIRECCIÓN", descripcion: "Visibilidad ejecutiva de todos los módulos, edición limitada.", esConfigurable: true },
  { id: "r4", nombre: "HSEQ", descripcion: "Gestión de hallazgos, inspecciones y acciones correctivas.", esConfigurable: true },
  { id: "r5", nombre: "SG_SST", descripcion: "Gestión de la matriz de estándares mínimos SG-SST.", esConfigurable: true },
  { id: "r6", nombre: "PESV", descripcion: "Gestión del PESV e indicadores VIGIA2.", esConfigurable: true },
  { id: "r7", nombre: "SUPERVISOR", descripcion: "Seguimiento operativo de conductores y vehículos.", esConfigurable: true },
  { id: "r8", nombre: "MANTENIMIENTO", descripcion: "Gestión de mantenimiento de flota.", esConfigurable: true },
  { id: "r9", nombre: "OPERACIÓN", descripcion: "Gestión de viajes y asignaciones.", esConfigurable: true },
  { id: "r10", nombre: "CONDUCTOR", descripcion: "Acceso al Portal Conductor únicamente.", esConfigurable: true },
  { id: "r11", nombre: "CONSULTA", descripcion: "Solo lectura, sin permisos de edición.", esConfigurable: true },
];
