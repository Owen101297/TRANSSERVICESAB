import { getPreoperacionalesDb } from "@/lib/services/preoperacional.service";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { PreoperacionalAdminClientView } from "@/components/preoperacional/PreoperacionalAdminClientView";

export default async function PreoperacionalesAdminPage() {
  const [{ items, totalCount }, vehiculos] = await Promise.all([
    getPreoperacionalesDb({ limit: 100 }),
    getVehiculosDb(),
  ]);

  return (
    <PreoperacionalAdminClientView
      initialPreoperacionales={items}
      totalCount={totalCount}
      vehiculos={vehiculos}
    />
  );
}
