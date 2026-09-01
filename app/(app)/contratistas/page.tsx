import { getContratistasDb } from "@/lib/services/contratistas.service";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getPersonasDb } from "@/lib/services/personas.service";
import { ContratistasClientView } from "@/components/contratistas/ContratistasClientView";

export const dynamic = "force-dynamic";

export default async function ContratistasPage() {
  const contratistas = await getContratistasDb();
  const vehiculos = await getVehiculosDb();
  const personas = await getPersonasDb();

  return (
    <ContratistasClientView
      initialContratistas={contratistas}
      vehiculos={vehiculos}
      personas={personas}
    />
  );
}
