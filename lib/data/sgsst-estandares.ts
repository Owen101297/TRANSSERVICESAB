import { EstandarSGSST } from "@/lib/types/sgsst";

export const ESTANDARES_SGSST: EstandarSGSST[] = [
  { id: "e1", numero: "1", nombre: "Recursos", ciclo: "planear", pesoPorcentual: 10 },
  {
    id: "e2",
    numero: "2",
    nombre: "Gestión integral del SG-SST",
    ciclo: "planear",
    pesoPorcentual: 15,
  },
  { id: "e3", numero: "3", nombre: "Gestión de la salud", ciclo: "hacer", pesoPorcentual: 20 },
  {
    id: "e4",
    numero: "4",
    nombre: "Gestión de peligros y riesgos",
    ciclo: "hacer",
    pesoPorcentual: 30,
  },
  { id: "e5", numero: "5", nombre: "Gestión de amenazas", ciclo: "hacer", pesoPorcentual: 10 },
  {
    id: "e6",
    numero: "6",
    nombre: "Verificación del SG-SST",
    ciclo: "verificar",
    pesoPorcentual: 5,
  },
  { id: "e7", numero: "7", nombre: "Mejoramiento", ciclo: "actuar", pesoPorcentual: 10 },
];

export function getEstandarById(id: string) {
  return ESTANDARES_SGSST.find((e) => e.id === id);
}
