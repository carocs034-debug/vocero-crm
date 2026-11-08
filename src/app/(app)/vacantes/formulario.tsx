"use client";

import { useActionState, useRef, useState } from "react";
import type { CriterioVacante } from "@/lib/vacantes";
import { generarRubrica, guardar } from "./actions";

type Vacante = { codigo: string; nombre: string; descripcion: string; activa: boolean; rubricas: CriterioVacante[][] };

export function FormularioVacante({ vacante }: { vacante?: Vacante }) {
  const [mensaje, accion, guardando] = useActionState((_previo: string, form: FormData) => guardar(form), "");
  const [generando, setGenerando] = useState(false);
  const [aviso, setAviso] = useState("");
  const formulario = useRef<HTMLFormElement>(null);
  const rubrica = useRef<HTMLTextAreaElement>(null);
  const campo = "rounded border bg-background p-2";

  async function generar() {
    if (!formulario.current || generando || guardando) return;
    const datos = new FormData(formulario.current);
    const inicial = rubrica.current?.value;
    setGenerando(true);
    setAviso("");
    try {
      const resultado = await generarRubrica({ nombre: datos.get("nombre"), descripcion: datos.get("descripcion") });
      if (!resultado.rubrica) {
        setAviso(resultado.error);
        return;
      }
      if (!formulario.current || !rubrica.current) return;
      const actuales = new FormData(formulario.current);
      if (rubrica.current.value !== inicial || actuales.get("nombre") !== datos.get("nombre") ||
          actuales.get("descripcion") !== datos.get("descripcion")) {
        setAviso("El formulario cambió durante la generación. Puedes generar una nueva propuesta.");
        return;
      }
      rubrica.current.value = JSON.stringify(resultado.rubrica, null, 2);
      setAviso("Revisa y ajusta la propuesta antes de guardar.");
    } catch {
      setAviso("No se pudo generar la rúbrica. Intenta de nuevo.");
    } finally {
      setGenerando(false);
    }
  }

  return <form ref={formulario} action={accion} className="grid gap-3 rounded-lg border p-4">
    <input type="hidden" name="version" value={vacante?.rubricas.length ?? 0} />
    <label className="grid gap-1">Código<input className={campo} name="codigo" required maxLength={24} defaultValue={vacante?.codigo} readOnly={!!vacante} /></label>
    <label className="grid gap-1">Nombre<input className={campo} name="nombre" required maxLength={120} defaultValue={vacante?.nombre} /></label>
    <label className="grid gap-1">Descripción<textarea className={campo} name="descripcion" required maxLength={3000} defaultValue={vacante?.descripcion} /></label>
    <label><input name="activa" type="checkbox" defaultChecked={vacante?.activa ?? true} /> Abierta</label>
    <button type="button" className="w-fit rounded border px-3 py-2" onClick={generar} disabled={generando || guardando}>
      {generando ? "Generando…" : "Generar rúbrica"}
    </button>
    <p role="status">{aviso}</p>
    <label className="grid gap-1">Rúbrica (JSON, pesos que suman 1)
      <textarea ref={rubrica} className={campo + " font-mono text-xs"} name="rubrica" required rows={8}
        defaultValue={JSON.stringify(vacante?.rubricas.at(-1) ?? [{ id: "experiencia", peso: 1, esencial: true, requisito: "" }], null, 2)} />
    </label>
    <button className="w-fit rounded border px-3 py-2" disabled={guardando || generando}>Guardar vacante</button>
    <p role="status">{mensaje}</p>
  </form>;
}
