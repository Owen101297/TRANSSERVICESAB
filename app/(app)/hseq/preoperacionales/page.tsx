import { getPreoperacionalesDb } from "@/lib/services/preoperacional.service";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { PreoperacionalAdminClientView } from "@/components/preoperacional/PreoperacionalAdminClientView";

export const dynamic = "force-dynamic";

export default async function PreoperacionalesAdminPage() {
  let items: any[] = [];
  let totalCount = 0;
  let vehiculos: any[] = [];

  try {
    const [resPreop, resVehiculos] = await Promise.all([
      getPreoperacionalesDb({ limit: 100 }),
      getVehiculosDb(),
    ]);
    if (resPreop) {
      items = resPreop.items || [];
      totalCount = resPreop.totalCount || 0;
    }
    if (Array.isArray(resVehiculos)) {
      vehiculos = resVehiculos;
    }
  } catch (error) {
    console.error("Error al cargar datos en PreoperacionalesAdminPage:", error);
  }

  return (
    <PreoperacionalAdminClientView
      initialPreoperacionales={items}
      totalCount={totalCount}
      vehiculos={vehiculos}
    />
  );
}
