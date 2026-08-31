import Link from "next/link";
import { Plus } from "lucide-react";
import { getPersonasDb } from "@/lib/services/personas.service";
import { getRolesDb } from "@/lib/services/admin.service";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function AdministracionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab ?? "usuarios";

  const personas = await getPersonasDb();
  const roles = await getRolesDb();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Administración y Control de Acceso (RBAC)
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Gestión de usuarios, roles dinámicos y permisos por módulo del sistema.
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

      {activeTab === "usuarios" && (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-line-600">
            {personas.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar initials={p.fotoIniciales} size="sm" />
                  <div>
                    <Link href={`/personas/${p.id}`} className="text-sm text-paper-50 font-medium hover:text-radar-cyan">
                      {p.nombres} {p.apellidos}
                    </Link>
                    <p className="text-xs text-fog-400 font-mono">{p.email || p.numeroDocumento} · {p.perfiles.join(", ")}</p>
                  </div>
                </div>
                <StatusBadge status={p.estado === "activo" ? "activo" : "pendiente"}>
                  {p.estado === "activo" ? "Activo" : "Inactivo"}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {activeTab === "roles" && (
        <>
          <div className="flex justify-end">
            <Link href="/administracion/roles/nuevo">
              <Button variant="primary">
                <Plus size={16} /> Nuevo rol
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {roles.map((r) => (
              <Card key={r.id}>
                <div className="flex items-center justify-between">
                  <span className="font-[family-name:var(--font-mono)] text-sm font-medium text-paper-50">
                    {r.nombre}
                  </span>
                  {!r.esConfigurable && (
                    <span className="rounded border border-line-600 bg-asphalt-800 px-1.5 py-0.5 text-[10px] text-fog-400">
                      Fijo
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-fog-400">{r.descripcion}</p>
                {r.permisos && r.permisos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {r.permisos.map((p) => (
                      <span key={p} className="rounded bg-asphalt-800 border border-line-600 px-1.5 py-0.5 text-[10px] text-radar-cyan font-mono">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      <p className="text-xs text-fog-400">
        Control de acceso basado en roles (RBAC).
      </p>
    </div>
  );
}

