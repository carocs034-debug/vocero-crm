"use client";

import { useActionState } from "react";
import type { CriterioVacante } from "@/lib/vacantes";
import { guardar } from "./actions";

type Vacante = { codigo: string; nombre: string; descripcion: string; activa: boolean; rubricas: CriterioVacante[][] };

export function FormularioVacante({ vacante }: { vacante?: Vacante }) {
  const [mensaje, accion, guardando] = useActionState((_previo: string, form: FormData) => guardar(form), "");
  const campo = "rounded border bg-background p-2";
  return <form action={accion} className="grid gap-3 rounded-lg border p-4">
    <input type="hidden" name="version" value={vacante?.rubricas.length ?? 0} />
    <label className="grid gap-1">Código<input className={campo} name="codigo" required maxLength={24} defaultValue={vacante?.codigo} readOnly={!!vacante} /></label>
    <label className="grid gap-1">Nombre<input className={campo} name="nombre" required maxLength={120} defaultValue={vacante?.nombre} /></label>
    <label className="grid gap-1">Descripción<textarea className={campo} name="descripcion" required maxLength={3000} defaultValue={vacante?.descripcion} /></label>
    <label><input name="activa" type="checkbox" defaultChecked={vacante?.activa ?? true} /> Abierta</label>
    <label className="grid gap-1">Rúbrica (JSON, pesos que suman 1)
      <textarea className={campo + " font-mono text-xs"} name="rubrica" required rows={8}
        defaultValue={JSON.stringify(vacante?.rubricas.at(-1) ?? [{ id: "experiencia", peso: 1, esencial: true, requisito: "" }], null, 2)} />
    </label>
    <button className="w-fit rounded border px-3 py-2" disabled={guardando}>Guardar vacante</button>
    <p role="status">{mensaje}</p>
  </form>;
}
