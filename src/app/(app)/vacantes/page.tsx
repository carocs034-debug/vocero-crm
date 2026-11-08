import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { reclutamientoEnabled } from "@/server/postulaciones/flag";
import { listarVacantes } from "@/server/vacantes/servicio";
import { cargarPiloto } from "./actions";
import { FormularioVacante } from "./formulario";

export const dynamic = "force-dynamic";

export default async function VacantesPage() {
  if (!reclutamientoEnabled()) notFound();
  const session = await requireSession();
  const editar = ["owner", "admin"].includes(session.role);
  const vacantes = await listarVacantes(session.organizationId);
  return <main className="h-full overflow-auto p-6">
    <div className="mx-auto grid max-w-3xl gap-4">
      <h1 className="text-2xl font-semibold">Vacantes</h1>
      {editar && <form action={cargarPiloto}>
        <button className="rounded border px-3 py-2">Cargar vacantes del piloto</button>
      </form>}
      {!vacantes.length && <p>Aún no hay vacantes.</p>}
      {vacantes.map(v => <details key={v.codigo} className="rounded-lg border p-4">
        <summary className="cursor-pointer">{v.nombre} · {v.codigo} · {v.activa ? "Abierta" : "Cerrada"} · Rúbrica v{v.rubricas.length}</summary>
        <p className="my-3">{v.descripcion}</p>
        {editar && <FormularioVacante key={JSON.stringify(v)} vacante={v} />}
      </details>)}
      {editar && <details className="rounded-lg border p-4">
        <summary className="cursor-pointer">Nueva vacante</summary>
        <FormularioVacante />
      </details>}
    </div>
  </main>;
}
