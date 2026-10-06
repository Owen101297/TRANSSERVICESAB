import Link from "next/link";
import GoogleAccessPanel from "@/components/administracion/GoogleAccessPanel";
import { getPersonasDb } from "@/lib/services/personas.service";


import { Card } from "@/components/ui/Card";
import AccountAccessPanel from "@/components/administracion/AccountAccessPanel";
import { requireStaffSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdministracionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireStaffSession(["administrativo"]);
  const { tab } = await searchParams;
  const activeTab = tab ?? "usuarios";

  const personas = await getPersonasDb();
  const roles = [{ id: "administrativo", nombre: "Administrador", descripcion: "Administra el ERP, HSEQ, gerencia, logística y accesos." }, { id: "conductor", nombre: "Conductor", descripcion: "Opera su jornada y apps desde el portal; consulta solo sus registros." }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
          Administración y accesos
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Dos roles de acceso, autorización Google y control de cuentas.
        </p>
      </div>

      <div className="flex gap-1 border-b border-line-600">
        <Link
          href="/administracion?tab=usuarios"
          className={`border-b-2 px-4 py-2 text-sm transition-colors ${
            activeTab === "usuarios"
              ? "border-signal-amber text-paper-50 font-medium"
              : "border-transparent text-fog-400 hover:text-mist-200"
          }`}
        >
          Usuarios ({personas.length})
        </Link>
        <Link
          href="/administracion?tab=roles"
          className={`border-b-2 px-4 py-2 text-sm transition-colors ${
            activeTab === "roles"
              ? "border-signal-amber text-paper-50 font-medium"
              : "border-transparent text-fog-400 hover:text-mist-200"
          }`}
        >
          Roles ({roles.length})
        </Link>
      </div>

      <Card><GoogleAccessPanel /></Card>

      {activeTab === "usuarios" && (
        <Card>
          <AccountAccessPanel />
        </Card>
      )}

      {activeTab === "roles" && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {roles.map((r) => (
              <Card key={r.id}>
                <div className="flex items-center justify-between">
                  <span className="font-[family-name:var(--font-mono)] text-sm font-medium text-paper-50">
                    {r.nombre}
                  </span>
                </div>
                <p className="mt-2 text-xs text-fog-400">{r.descripcion}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      <p className="text-xs text-fog-400">
        Los perfiles laborales históricos se conservan; el rol de acceso determina los permisos.
      </p>
    </div>
  );
}
