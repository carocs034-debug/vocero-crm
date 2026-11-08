"use client";

import { useActionState, useRef, useState } from "react";
import { calcularPesos, type CriterioVacante, type RequisitoVacante } from "@/lib/vacantes";
import { generarRubrica, guardar } from "./actions";

type Vacante = { codigo: string; nombre: string; descripcion: string; activa: boolean; rubricas: CriterioVacante[][] };

export function FormularioVacante({ vacante }: { vacante?: Vacante }) {
  const [mensaje, accion, guardando] = useActionState((_previo: string, form: FormData) => guardar(form), "");
  const [generando, setGenerando] = useState(false);
  const [aviso, setAviso] = useState("");
  const formulario = useRef<HTMLFormElement>(null);
  const nombre = useRef<HTMLInputElement>(null);
  const [requisitos, setRequisitos] = useState<RequisitoVacante[]>(
    () => vacante?.rubricas.at(-1)?.map(({ id, esencial, requisito }) => ({ id, esencial, requisito })) ?? [],
  );
  const rubrica = calcularPesos(requisitos, vacante?.rubricas.at(-1));
  const campo = "rounded border bg-background p-2";

  async function generar() {
    if (!formulario.current || generando || guardando) return;
    const datos = new FormData(formulario.current);
    setGenerando(true);
    setAviso("");
    try {
      const resultado = await generarRubrica({ nombre: datos.get("nombre"), descripcion: datos.get("descripcion") });
      if ("error" in resultado) {
        setAviso(resultado.error);
        return;
      }
      if (!formulario.current) return;
      const actuales = new FormData(formulario.current);
      if (actuales.get("nombre") !== datos.get("nombre") ||
          actuales.get("descripcion") !== datos.get("descripcion")) {
        setAviso("El formulario cambió durante la generación. Puedes generar una nueva propuesta.");
        return;
      }
      setRequisitos(resultado.rubrica);
      if (nombre.current && !nombre.current.value.trim()) nombre.current.value = resultado.nombre;
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
    <label className="grid gap-1">Nombre<input ref={nombre} className={campo} name="nombre" required maxLength={120} defaultValue={vacante?.nombre} /></label>
    <label className="grid gap-1">Descripción<textarea className={campo} name="descripcion" required maxLength={3000} defaultValue={vacante?.descripcion} /></label>
    <label><input name="activa" type="checkbox" defaultChecked={vacante?.activa ?? true} /> Abierta</label>
    <button type="button" className="w-fit rounded border px-3 py-2" onClick={generar} disabled={generando || guardando}>
      {generando ? "Generando…" : "Generar rúbrica"}
    </button>
    <p role="status">{aviso}</p>
    <input type="hidden" name="rubrica" value={JSON.stringify(requisitos)} />
    <fieldset disabled={generando || guardando} className="grid gap-3">
      <legend className="font-medium">Requisitos</legend>
      {rubrica.map(({ id, requisito, esencial, peso }, indice) => (
        <div key={id} className="grid gap-2 rounded border p-3">
          <label className="grid gap-1">Requisito {indice + 1}
            <textarea className={campo} required maxLength={1000} value={requisito}
              onChange={e => setRequisitos(requisitos.map(r => r.id === id ? { ...r, requisito: e.target.value } : r))} />
          </label>
          <label>Importancia
            <select className={campo + " ml-2"} value={esencial ? "indispensable" : "deseable"}
              onChange={e => setRequisitos(requisitos.map(r => r.id === id ? { ...r, esencial: e.target.value === "indispensable" } : r))}>
              <option value="indispensable">Indispensable</option>
              <option value="deseable">Deseable</option>
            </select>
          </label>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">{Math.round(peso * 100)} %</span>
            <button type="button" className="underline" onClick={() => setRequisitos(requisitos.filter(r => r.id !== id))}>
              Quitar requisito {indice + 1}
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="w-fit rounded border px-3 py-2" disabled={requisitos.length >= 20}
        onClick={() => setRequisitos([...requisitos, { id: "requisito_" + crypto.randomUUID().replaceAll("-", ""), requisito: "", esencial: false }])}>
        Agregar requisito
      </button>
    </fieldset>
    <button className="w-fit rounded border px-3 py-2" disabled={guardando || generando || !requisitos.length}>Guardar vacante</button>
    <p role="status">{mensaje}</p>
  </form>;
}
