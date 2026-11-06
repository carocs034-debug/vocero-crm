"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { GripVertical, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ETAPAS_POSTULACION, ETIQUETAS_ETAPA, type EtapaPostulacion, type PostulacionFicha } from "@/lib/postulaciones";

type Lista = { postulaciones: PostulacionFicha[]; total: number; pagina: number };
const vacia: Lista = { postulaciones: [], total: 0, pagina: 1 };
async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? "No se pudo completar la operación. Actualiza el tablero.");
  return body as T;
}

export function PipelinePostulaciones() {
  const [columnas, setColumnas] = useState<Partial<Record<EtapaPostulacion, Lista>>>({});
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [cargandoEtapa, setCargandoEtapa] = useState<EtapaPostulacion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [activa, setActiva] = useState<PostulacionFicha | null>(null);
  const ocupado = useRef(false);
  const generacion = useRef(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  useEffect(() => { const t = setTimeout(() => setQ(busqueda.trim()), 250); return () => clearTimeout(t); }, [busqueda]);
  useEffect(() => {
    const controller = new AbortController();
    generacion.current++;
    setCargando(true); setError(""); setActiva(null);
    Promise.all(ETAPAS_POSTULACION.map(async etapa => {
      const datos = await pedir<Lista>(`/api/postulaciones?${new URLSearchParams({ etapa, q, pagina: "1" })}`, { signal: controller.signal });
      return [etapa, datos] as const;
    })).then(entries => { if (!controller.signal.aborted) setColumnas(Object.fromEntries(entries)); })
      .catch(e => { if (!controller.signal.aborted) { setColumnas({}); setError(e.message); } })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, [q, recarga]);
  const bloqueado = cargando || guardando || cargandoEtapa !== null;
  async function mas(etapa: EtapaPostulacion) {
    if (ocupado.current || bloqueado) return;
    const previa = columnas[etapa] ?? vacia;
    const turno = generacion.current;
    ocupado.current = true; setCargandoEtapa(etapa); setError("");
    try {
      const datos = await pedir<Lista>(`/api/postulaciones?${new URLSearchParams({ etapa, q, pagina: String(previa.pagina + 1) })}`);
      if (turno === generacion.current) setColumnas(prev => ({ ...prev, [etapa]: { ...datos, postulaciones: [...new Map([...previa.postulaciones, ...datos.postulaciones].map(p => [p.id, p])).values()] } }));
    } catch (e) { if (turno === generacion.current) setError((e as Error).message); }
    finally { ocupado.current = false; setCargandoEtapa(null); }
  }
  const mover = useCallback(async (p: PostulacionFicha, etapa: EtapaPostulacion) => {
    if (ocupado.current || cargando || p.etapa === etapa) return;
    ocupado.current = true; setGuardando(true); setError(""); setAviso("");
    try {
      await pedir(`/api/postulaciones/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: p.version, etapa, notas: p.notas }) });
      setAviso(`Etapa de ${p.nombre} guardada: ${ETIQUETAS_ETAPA[etapa]}.`);
      setRecarga(n => n + 1);
    } catch (e) {
      setError((e as Error).message);
      // Mantiene el error visible; el usuario decide cuando volver a consultar.
    } finally { ocupado.current = false; setGuardando(false); }
  }, [cargando]);
  function soltar(event: DragEndEvent) {
    setActiva(null);
    const destino = String(event.over?.id ?? "");
    if (!ETAPAS_POSTULACION.includes(destino as EtapaPostulacion)) return;
    const p = Object.values(columnas).flatMap(c => c.postulaciones).find(p => p.id === event.active.id);
    if (p) void mover(p, destino as EtapaPostulacion);
  }
  return <div className="flex h-full min-h-0 flex-col text-foreground">
    <header className="shrink-0 space-y-4 border-b p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reclutamiento</p><h1 className="mt-1 text-2xl font-semibold">Pipeline de selección</h1><p className="mt-1 text-sm text-muted-foreground">Las mismas postulaciones, organizadas por su siguiente paso.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={bloqueado} onClick={() => setRecarga(n => n + 1)}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button><Link className="rounded-md border px-3 py-2 text-sm hover:bg-accent" href="/postulaciones">Ver postulaciones</Link></div></div>
      <label className="block max-w-md text-sm font-medium">Buscar candidato o vacante<Input className="mt-2" value={busqueda} maxLength={120} onChange={e => setBusqueda(e.target.value)} disabled={guardando} placeholder="Nombre o vacante" /></label>
      <p className="text-xs text-muted-foreground">Arrastra desde el asa o elige una etapa en la tarjeta. Cada cambio guarda tu revisión humana.</p>
      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error} <button className="underline" disabled={bloqueado} onClick={() => setRecarga(n => n + 1)}>Recargar tablero</button></p>}
      <p role="status" className="text-sm text-muted-foreground">{guardando ? "Guardando etapa…" : cargando ? "Cargando postulaciones…" : aviso}</p>
    </header>
    <DndContext sensors={sensors} onDragStart={e => setActiva(Object.values(columnas).flatMap(c => c.postulaciones).find(p => p.id === e.active.id) ?? null)} onDragEnd={soltar} onDragCancel={() => setActiva(null)}>
      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto p-4 sm:p-6" aria-label="Tablero de selección" aria-busy={cargando}>
        {ETAPAS_POSTULACION.map(etapa => <Columna key={etapa} etapa={etapa} lista={columnas[etapa] ?? vacia} cargando={cargando} bloqueado={bloqueado} alMover={mover} alCargar={() => void mas(etapa)} />)}
      </div>
      <DragOverlay>{activa && <div className="w-64 rounded-lg border bg-background p-4 shadow-lg"><p className="font-semibold">{activa.nombre}</p><p className="text-sm text-muted-foreground">{activa.vacante}</p></div>}</DragOverlay>
    </DndContext>
  </div>;
}
function Columna({ etapa, lista, cargando, bloqueado, alMover, alCargar }: { etapa: EtapaPostulacion; lista: Lista; cargando: boolean; bloqueado: boolean; alMover: (p: PostulacionFicha, e: EtapaPostulacion) => Promise<void>; alCargar: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa, disabled: bloqueado });
  return <section ref={setNodeRef} aria-label={ETIQUETAS_ETAPA[etapa]} className={`flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 ${isOver ? 'ring-2 ring-ring' : ''}`}>
    <header className="flex items-center justify-between gap-2 border-b p-3"><h2 className="font-semibold">{ETIQUETAS_ETAPA[etapa]}</h2><span className="text-sm tabular-nums text-muted-foreground">{cargando ? '—' : lista.total}</span></header>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">{cargando ? <p className="text-sm text-muted-foreground">Cargando…</p> : lista.postulaciones.length ? lista.postulaciones.map(p => <Tarjeta key={p.id} p={p} bloqueado={bloqueado} alMover={alMover} />) : <p className="py-6 text-center text-sm text-muted-foreground">Sin postulaciones en esta etapa.</p>}</div>
    <footer className="space-y-2 border-t p-3"><p className="text-xs text-muted-foreground">{lista.postulaciones.length} de {lista.total} visibles</p>{lista.pagina * 30 < lista.total && <Button variant="outline" size="sm" disabled={bloqueado} onClick={alCargar}>Cargar más</Button>}</footer>
  </section>;
}
function Tarjeta({ p, bloqueado, alMover }: { p: PostulacionFicha; bloqueado: boolean; alMover: (p: PostulacionFicha, e: EtapaPostulacion) => Promise<void> }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: p.id, disabled: bloqueado });
  return <article ref={setNodeRef} className={`rounded-lg border bg-background p-3 shadow-sm ${isDragging ? 'opacity-40' : ''}`}>
    <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><Link href={`/postulaciones?id=${encodeURIComponent(p.id)}`} className="break-words font-semibold hover:underline">{p.nombre}</Link><p className="mt-1 break-words text-sm text-muted-foreground">{p.vacante}</p></div><button {...attributes} {...listeners} aria-label={`Arrastrar a ${p.nombre}`} disabled={bloqueado} className="touch-none rounded p-1 text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"><GripVertical className="h-5 w-5" /></button></div>
    <div className="my-3 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{p.cv ? 'CV adjunto' : 'Sin CV'}</span><span>{p.revisionHumana === 'revisada' ? 'Revisión guardada' : 'Revisión pendiente'}</span></div>
    <label className="block text-xs font-medium">Etapa de {p.nombre}<select value={p.etapa} disabled={bloqueado} onChange={e => void alMover(p, e.target.value as EtapaPostulacion)} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">{ETAPAS_POSTULACION.map(e => <option key={e} value={e}>{ETIQUETAS_ETAPA[e]}</option>)}</select></label>
  </article>;
}
