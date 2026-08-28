import { Vehiculo } from "@/lib/types/vehiculo";

// Datos de ejemplo (seed), NO datos reales de la empresa.
// Refleja el contexto real confirmado: 30 vehiculos, 5 contratistas,
// y el Contratista 2 como el que opera con rotacion de turnos 12h/24h.
// Los nombres de contratistas son genericos - reemplazar por los reales.

export const SEED_VEHICULOS: Vehiculo[] = [
  {
    "id": "v1",
    "placa": "JOU466",
    "tipo": "bus",
    "marca": "Chevrolet",
    "modelo": "NPR",
    "anio": 2016,
    "capacidad": 40,
    "contratistaId": "c1",
    "contratistaNombre": "Contratista 1",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-08-08",
      "rtmVencimiento": "2026-10-23",
      "polizaVencimiento": "2026-10-15"
    }
  },
  {
    "id": "v2",
    "placa": "LWL919",
    "tipo": "buseta",
    "marca": "Hino",
    "modelo": "AK8",
    "anio": 2017,
    "capacidad": 19,
    "contratistaId": "c2",
    "contratistaNombre": "Contratista 2 (rotación 12h/24h)",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-09-06",
      "rtmVencimiento": "2026-08-15",
      "polizaVencimiento": "2026-11-02"
    }
  },
  {
    "id": "v3",
    "placa": "MZP304",
    "tipo": "microbus",
    "marca": "Toyota",
    "modelo": "Coaster",
    "anio": 2018,
    "capacidad": 14,
    "contratistaId": "c3",
    "contratistaNombre": "Contratista 3",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2027-01-26",
      "rtmVencimiento": "2026-08-29",
      "polizaVencimiento": "2027-04-05"
    }
  },
  {
    "id": "v4",
    "placa": "DEZ949",
    "tipo": "camioneta",
    "marca": "Mercedes-Benz",
    "modelo": "Sprinter",
    "anio": 2019,
    "capacidad": 5,
    "contratistaId": "c1",
    "contratistaNombre": "Contratista 1",
    "servicio": "escolar",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2027-02-19",
      "rtmVencimiento": "2026-10-19",
      "polizaVencimiento": "2026-12-11"
    }
  },
  {
    "id": "v5",
    "placa": "CSG323",
    "tipo": "automovil",
    "marca": "Nissan",
    "modelo": "Urvan",
    "anio": 2020,
    "capacidad": 4,
    "contratistaId": "c1",
    "contratistaNombre": "Contratista 1",
    "servicio": "turismo",
    "estado": "mantenimiento",
    "documentos": {
      "soatVencimiento": "2026-12-24",
      "rtmVencimiento": "2027-05-19",
      "polizaVencimiento": "2027-04-28"
    }
  },
  {
    "id": "v6",
    "placa": "GJB637",
    "tipo": "van",
    "marca": "Kia",
    "modelo": "Bongo",
    "anio": 2021,
    "capacidad": 12,
    "contratistaId": "c1",
    "contratistaNombre": "Contratista 1",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-08-10",
      "rtmVencimiento": "2026-12-03",
      "polizaVencimiento": "2027-04-29"
    }
  },
  {
    "id": "v7",
    "placa": "YGJ450",
    "tipo": "bus",
    "marca": "Chevrolet",
    "modelo": "NPR",
    "anio": 2022,
    "capacidad": 40,
    "contratistaId": "c2",
    "contratistaNombre": "Contratista 2 (rotación 12h/24h)",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-09-05",
      "rtmVencimiento": "2026-08-06",
      "polizaVencimiento": "2027-04-27"
    }
  },
  {
    "id": "v8",
    "placa": "PKM230",
    "tipo": "buseta",
    "marca": "Hino",
    "modelo": "AK8",
    "anio": 2023,
    "capacidad": 19,
    "contratistaId": "c2",
    "contratistaNombre": "Contratista 2 (rotación 12h/24h)",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2027-05-11",
      "rtmVencimiento": "2026-08-26",
      "polizaVencimiento": "2026-10-26"
    }
  },
  {
    "id": "v9",
    "placa": "UNB973",
    "tipo": "microbus",
    "marca": "Toyota",
    "modelo": "Coaster",
    "anio": 2024,
    "capacidad": 14,
    "contratistaId": "c2",
    "contratistaNombre": "Contratista 2 (rotación 12h/24h)",
    "servicio": "escolar",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2027-01-26",
      "rtmVencimiento": "2027-04-16",
      "polizaVencimiento": "2026-11-30"
    }
  },
  {
    "id": "v10",
    "placa": "FLS300",
    "tipo": "camioneta",
    "marca": "Mercedes-Benz",
    "modelo": "Sprinter",
    "anio": 2016,
    "capacidad": 5,
    "contratistaId": "c2",
    "contratistaNombre": "Contratista 2 (rotación 12h/24h)",
    "servicio": "turismo",
    "estado": "mantenimiento",
    "documentos": {
      "soatVencimiento": "2027-02-19",
      "rtmVencimiento": "2026-11-09",
      "polizaVencimiento": "2026-09-29"
    }
  },
  {
    "id": "v11",
    "placa": "WBR923",
    "tipo": "automovil",
    "marca": "Nissan",
    "modelo": "Urvan",
    "anio": 2017,
    "capacidad": 4,
    "contratistaId": "c2",
    "contratistaNombre": "Contratista 2 (rotación 12h/24h)",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-08-07",
      "rtmVencimiento": "2026-12-04",
      "polizaVencimiento": "2026-12-19"
    }
  },
  {
    "id": "v12",
    "placa": "ECW599",
    "tipo": "van",
    "marca": "Kia",
    "modelo": "Bongo",
    "anio": 2018,
    "capacidad": 12,
    "contratistaId": "c1",
    "contratistaNombre": "Contratista 1",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-09-06",
      "rtmVencimiento": "2026-08-05",
      "polizaVencimiento": "2026-10-03"
    }
  },
  {
    "id": "v13",
    "placa": "BYJ434",
    "tipo": "bus",
    "marca": "Chevrolet",
    "modelo": "NPR",
    "anio": 2019,
    "capacidad": 40,
    "contratistaId": "c3",
    "contratistaNombre": "Contratista 3",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2027-02-20",
      "rtmVencimiento": "2026-09-02",
      "polizaVencimiento": "2027-04-30"
    }
  },
  {
    "id": "v14",
    "placa": "SLC783",
    "tipo": "buseta",
    "marca": "Hino",
    "modelo": "AK8",
    "anio": 2020,
    "capacidad": 19,
    "contratistaId": "c3",
    "contratistaNombre": "Contratista 3",
    "servicio": "escolar",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2027-05-02",
      "rtmVencimiento": "2027-04-17",
      "polizaVencimiento": "2026-11-13"
    }
  },
  {
    "id": "v15",
    "placa": "BDX775",
    "tipo": "microbus",
    "marca": "Toyota",
    "modelo": "Coaster",
    "anio": 2021,
    "capacidad": 14,
    "contratistaId": "c3",
    "contratistaNombre": "Contratista 3",
    "servicio": "turismo",
    "estado": "mantenimiento",
    "documentos": {
      "soatVencimiento": "2026-11-10",
      "rtmVencimiento": "2027-01-14",
      "polizaVencimiento": "2026-12-26"
    }
  },
  {
    "id": "v16",
    "placa": "ADM772",
    "tipo": "camioneta",
    "marca": "Mercedes-Benz",
    "modelo": "Sprinter",
    "anio": 2022,
    "capacidad": 5,
    "contratistaId": "c3",
    "contratistaNombre": "Contratista 3",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-08-10",
      "rtmVencimiento": "2026-12-16",
      "polizaVencimiento": "2027-01-19"
    }
  },
  {
    "id": "v17",
    "placa": "OWO868",
    "tipo": "automovil",
    "marca": "Nissan",
    "modelo": "Urvan",
    "anio": 2023,
    "capacidad": 4,
    "contratistaId": "c3",
    "contratistaNombre": "Contratista 3",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-09-06",
      "rtmVencimiento": "2026-08-05",
      "polizaVencimiento": "2027-02-10"
    }
  },
  {
    "id": "v18",
    "placa": "XPG629",
    "tipo": "van",
    "marca": "Kia",
    "modelo": "Bongo",
    "anio": 2024,
    "capacidad": 12,
    "contratistaId": "c1",
    "contratistaNombre": "Contratista 1",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-12-11",
      "rtmVencimiento": "2026-08-24",
      "polizaVencimiento": "2027-03-08"
    }
  },
  {
    "id": "v19",
    "placa": "SXZ434",
    "tipo": "bus",
    "marca": "Chevrolet",
    "modelo": "NPR",
    "anio": 2016,
    "capacidad": 40,
    "contratistaId": "c4",
    "contratistaNombre": "Contratista 4",
    "servicio": "escolar",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2027-06-12",
      "rtmVencimiento": "2027-04-18",
      "polizaVencimiento": "2027-02-26"
    }
  },
  {
    "id": "v20",
    "placa": "DWH297",
    "tipo": "buseta",
    "marca": "Hino",
    "modelo": "AK8",
    "anio": 2017,
    "capacidad": 19,
    "contratistaId": "c4",
    "contratistaNombre": "Contratista 4",
    "servicio": "turismo",
    "estado": "mantenimiento",
    "documentos": {
      "soatVencimiento": "2027-03-25",
      "rtmVencimiento": "2026-10-11",
      "polizaVencimiento": "2026-12-09"
    }
  },
  {
    "id": "v21",
    "placa": "PAV885",
    "tipo": "microbus",
    "marca": "Toyota",
    "modelo": "Coaster",
    "anio": 2018,
    "capacidad": 14,
    "contratistaId": "c4",
    "contratistaNombre": "Contratista 4",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-07-31",
      "rtmVencimiento": "2026-10-25",
      "polizaVencimiento": "2026-11-04"
    }
  },
  {
    "id": "v22",
    "placa": "PKA678",
    "tipo": "camioneta",
    "marca": "Mercedes-Benz",
    "modelo": "Sprinter",
    "anio": 2019,
    "capacidad": 5,
    "contratistaId": "c4",
    "contratistaNombre": "Contratista 4",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-09-03",
      "rtmVencimiento": "2026-08-14",
      "polizaVencimiento": "2026-12-07"
    }
  },
  {
    "id": "v23",
    "placa": "LXF698",
    "tipo": "automovil",
    "marca": "Nissan",
    "modelo": "Urvan",
    "anio": 2020,
    "capacidad": 4,
    "contratistaId": "c4",
    "contratistaNombre": "Contratista 4",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-12-02",
      "rtmVencimiento": "2026-09-03",
      "polizaVencimiento": "2026-12-16"
    }
  },
  {
    "id": "v24",
    "placa": "WXT599",
    "tipo": "van",
    "marca": "Kia",
    "modelo": "Bongo",
    "anio": 2021,
    "capacidad": 12,
    "contratistaId": "c4",
    "contratistaNombre": "Contratista 4",
    "servicio": "escolar",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2027-03-13",
      "rtmVencimiento": "2027-01-12",
      "polizaVencimiento": "2026-10-11"
    }
  },
  {
    "id": "v25",
    "placa": "AQG846",
    "tipo": "bus",
    "marca": "Chevrolet",
    "modelo": "NPR",
    "anio": 2022,
    "capacidad": 40,
    "contratistaId": "c5",
    "contratistaNombre": "Contratista 5",
    "servicio": "turismo",
    "estado": "mantenimiento",
    "documentos": {
      "soatVencimiento": "2026-10-23",
      "rtmVencimiento": "2026-10-05",
      "polizaVencimiento": "2027-01-24"
    }
  },
  {
    "id": "v26",
    "placa": "PND169",
    "tipo": "buseta",
    "marca": "Hino",
    "modelo": "AK8",
    "anio": 2023,
    "capacidad": 19,
    "contratistaId": "c5",
    "contratistaNombre": "Contratista 5",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-07-31",
      "rtmVencimiento": "2027-02-26",
      "polizaVencimiento": "2026-11-16"
    }
  },
  {
    "id": "v27",
    "placa": "QKC384",
    "tipo": "microbus",
    "marca": "Toyota",
    "modelo": "Coaster",
    "anio": 2024,
    "capacidad": 14,
    "contratistaId": "c5",
    "contratistaNombre": "Contratista 5",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-09-01",
      "rtmVencimiento": "2026-08-10",
      "polizaVencimiento": "2026-12-26"
    }
  },
  {
    "id": "v28",
    "placa": "LLI354",
    "tipo": "camioneta",
    "marca": "Mercedes-Benz",
    "modelo": "Sprinter",
    "anio": 2016,
    "capacidad": 5,
    "contratistaId": "c5",
    "contratistaNombre": "Contratista 5",
    "servicio": "especial",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2027-05-11",
      "rtmVencimiento": "2026-08-26",
      "polizaVencimiento": "2027-01-13"
    }
  },
  {
    "id": "v29",
    "placa": "AXJ120",
    "tipo": "automovil",
    "marca": "Nissan",
    "modelo": "Urvan",
    "anio": 2017,
    "capacidad": 4,
    "contratistaId": "c5",
    "contratistaNombre": "Contratista 5",
    "servicio": "escolar",
    "estado": "activo",
    "documentos": {
      "soatVencimiento": "2026-10-31",
      "rtmVencimiento": "2026-10-14",
      "polizaVencimiento": "2027-03-09"
    }
  },
  {
    "id": "v30",
    "placa": "OSY103",
    "tipo": "van",
    "marca": "Kia",
    "modelo": "Bongo",
    "anio": 2018,
    "capacidad": 12,
    "contratistaId": "c5",
    "contratistaNombre": "Contratista 5",
    "servicio": "turismo",
    "estado": "mantenimiento",
    "documentos": {
      "soatVencimiento": "2027-03-26",
      "rtmVencimiento": "2027-04-07",
      "polizaVencimiento": "2026-10-15"
    }
  }
];

export function getVehiculoById(id: string): Vehiculo | undefined {
  return SEED_VEHICULOS.find((v) => v.id === id);
}
