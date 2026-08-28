import { Contratista } from "@/lib/types/contratista";

// Datos de ejemplo (seed), NO datos reales de la empresa.
// Los IDs (c1-c5) son los mismos que ya usan Flota y Personas — al
// reemplazar esto por los contratistas reales, actualiza aquí y los
// vehículos/conductores ya vinculados seguirán funcionando sin tocar nada más.

export const SEED_CONTRATISTAS: Contratista[] = [
  {
    id: "c1",
    nombre: "Contratista 1",
    nit: "900000001-1",
    tipoOperacion: "fija",
    contactoNombre: "Pendiente",
    contactoTelefono: "Pendiente",
    contactoEmail: "pendiente@ejemplo.com",
    fechaVinculacion: "2021-01-01",
    estado: "activo",
    notas: "Datos de contacto pendientes de completar.",
  },
  {
    id: "c2",
    nombre: "Contratista 2",
    nit: "900000002-2",
    tipoOperacion: "rotativa",
    contactoNombre: "Pendiente",
    contactoTelefono: "Pendiente",
    contactoEmail: "pendiente@ejemplo.com",
    fechaVinculacion: "2021-01-01",
    estado: "activo",
    notas:
      "Único contratista con rotación de turnos 12h/24h y ciclo de 4 días de descanso — 6 vehículos.",
  },
  {
    id: "c3",
    nombre: "Contratista 3",
    nit: "900000003-3",
    tipoOperacion: "fija",
    contactoNombre: "Pendiente",
    contactoTelefono: "Pendiente",
    contactoEmail: "pendiente@ejemplo.com",
    fechaVinculacion: "2021-01-01",
    estado: "activo",
    notas: "Datos de contacto pendientes de completar.",
  },
  {
    id: "c4",
    nombre: "Contratista 4",
    nit: "900000004-4",
    tipoOperacion: "fija",
    contactoNombre: "Pendiente",
    contactoTelefono: "Pendiente",
    contactoEmail: "pendiente@ejemplo.com",
    fechaVinculacion: "2021-01-01",
    estado: "activo",
    notas: "Datos de contacto pendientes de completar.",
  },
  {
    id: "c5",
    nombre: "Contratista 5",
    nit: "900000005-5",
    tipoOperacion: "fija",
    contactoNombre: "Pendiente",
    contactoTelefono: "Pendiente",
    contactoEmail: "pendiente@ejemplo.com",
    fechaVinculacion: "2021-01-01",
    estado: "activo",
    notas: "Datos de contacto pendientes de completar.",
  },
];

export function getContratistaById(id: string): Contratista | undefined {
  return SEED_CONTRATISTAS.find((c) => c.id === id);
}
