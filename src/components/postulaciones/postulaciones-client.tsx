"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, FileDown, FileText, Plus, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CANALES_POSTULACION, ETAPAS_POSTULACION, ETIQUETAS_ETAPA, type EtapaPostulacion, type PostulacionFicha } from "@/lib/postulaciones";

type Lista = { postulaciones: PostulacionFicha[]; total: number; pagina: number; conteo: Partial<Record<EtapaPostulacion, number>> };
const selectClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const fecha = (value: string) => new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value));
async function solicitar<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? (res.status === 401 ? "Tu sesión terminó. Vuelve a iniciar sesión" : "No se pudo completar la operación"));
  return body as T;
}
function Aviso({ children }: { children: React.ReactNode }) { return <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{children}</p>; }
function Estado({ etapa }: { etapa: EtapaPostulacion }) { return <span className="inline-flex rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">{ETIQUETAS_ETAPA[etapa]}</span>; }

export function PostulacionesClient() {
  const [lista, setLista] = useState<Lista | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [etapa, setEtapa] = useState("");
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState<PostulacionFicha | null>(null);
  const [nueva, setNueva] = useState(false);
  const [cambio, setCambio] = useState(0);
  const [sucia, setSucia] = useState(false);
  useEffect(() => { const t = setTimeout(() => { setQ(busqueda); setPagina(1); }, 250); return () => clearTimeout(t); }, [busqueda]);
  useEffect(() => {
    const controller = new AbortController();
    setCargando(true); setError("");
    const params = new URLSearchParams({ q, pagina: String(pagina) });
    if (etapa) params.set("etapa", etapa);
    solicitar<Lista>(`/api/postulaciones?${params}`, { signal: controller.signal })
      .then(setLista).catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, [q, etapa, pagina, cambio]);
  const puedeCambiar = () => !sucia || window.confirm("Tienes notas o una etapa sin guardar. ¿Salir de esta ficha?");
  const abrir = async (id: string) => {
    if (!puedeCambiar()) return;
    setError("");
    try {
      const result = await solicitar<{ postulacion: PostulacionFicha }>(`/api/postulaciones/${id}`);
      setSeleccion(result.postulacion); setNueva(false); setSucia(false);
    } catch (e) { setError((e as Error).message); }
  };
  const actualizar = (ficha: PostulacionFicha) => { setSeleccion(ficha); setSucia(false); setCambio(n => n + 1); };
  const cambioSucio = useCallback((value: boolean) => setSucia(value), []);
  const fichaAbierta = nueva || !!seleccion;
  const totalGlobal = Object.values(lista?.conteo ?? {}).reduce((s, n) => s + n, 0);
  return <div className="flex h-full min-h-0 flex-col text-foreground">
    <header className="shrink-0 border-b px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reclutamiento</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Postulaciones</h1><p className="mt-1 text-sm text-muted-foreground">Cada CV, sus pendientes y tu revisión en un mismo lugar.</p></div>
        <Button onClick={() => { if (puedeCambiar()) { setNueva(true); setSeleccion(null); setSucia(false); } }}><Plus className="mr-2 h-4 w-4" />Nueva postulación</Button>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[['Postulaciones', totalGlobal], ['Por completar', lista?.conteo.por_completar ?? 0], ['En revisión', lista?.conteo.en_revision ?? 0]].map(([label, value]) => <div key={label} className="rounded-lg border bg-muted/40 px-3 py-3"><p className="text-xl font-semibold tabular-nums">{lista ? value : '—'}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}
      </div>
    </header>
    {error && <div className="shrink-0 px-4 pt-3"><Aviso>{error} <button className="underline" onClick={() => setCambio(n => n + 1)}>Reintentar</button></Aviso></div>}
    <div className="flex min-h-0 flex-1">
      <section aria-label="Lista de postulaciones" className={`${fichaAbierta ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col border-r lg:w-[360px] xl:w-[400px]`}>
        <div className="space-y-3 border-b p-4">
          <label className="relative block"><span className="sr-only">Buscar candidato o vacante</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar candidato o vacante" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label>
          <label className="block text-xs font-medium">Etapa<select className={`${selectClass} mt-1`} value={etapa} onChange={e => { setEtapa(e.target.value); setPagina(1); }}><option value="">Todas las etapas</option>{ETAPAS_POSTULACION.map(e => <option key={e} value={e}>{ETIQUETAS_ETAPA[e]}</option>)}</select></label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={cargando}>
          {cargando ? <p role="status" className="p-6 text-sm text-muted-foreground">Cargando postulaciones…</p> : lista?.postulaciones.length ? <ul className="divide-y">{lista.postulaciones.map(p => <li key={p.id}><button onClick={() => void abrir(p.id)} aria-pressed={seleccion?.id === p.id} className={`w-full px-4 py-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${seleccion?.id === p.id ? 'bg-accent' : ''}`}>
            <div className="flex items-start justify-between gap-2"><span className="font-semibold">{p.nombre}</span><span className="shrink-0 text-xs text-muted-foreground">{fecha(p.creadaEn)}</span></div><p className="mt-1 text-sm text-muted-foreground">{p.vacante}</p><div className="mt-3 flex flex-wrap items-center gap-2"><Estado etapa={p.etapa} /><span className="text-xs capitalize text-muted-foreground">{p.canal}</span>{p.cv && <FileText aria-label="Tiene CV" className="ml-auto h-4 w-4 text-muted-foreground" />}</div>
          </button></li>)}</ul> : <div className="px-6 py-12 text-center"><ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h2 className="font-medium">{q || etapa ? 'Sin coincidencias' : 'Tu primera postulación empieza aquí'}</h2><p className="mt-2 text-sm text-muted-foreground">{q || etapa ? 'Prueba otra búsqueda o cambia la etapa.' : 'Registra un candidato y adjunta su CV para comenzar la revisión.'}</p></div>}
        </div>
        <div className="flex items-center justify-between gap-2 border-t p-3 text-xs text-muted-foreground"><span>{lista?.total ?? 0} resultados · Página {pagina}</span><div className="flex gap-1"><Button variant="outline" size="sm" disabled={pagina <= 1 || cargando} onClick={() => setPagina(p => p - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={cargando || pagina * 30 >= (lista?.total ?? 0)} onClick={() => setPagina(p => p + 1)}>Siguiente</Button></div></div>
      </section>
      <section aria-label="Ficha de postulación" className={`${fichaAbierta ? 'flex' : 'hidden lg:flex'} min-w-0 flex-1 flex-col overflow-y-auto`}>
        {fichaAbierta && <div className="border-b px-4 py-2 lg:hidden"><Button variant="ghost" size="sm" onClick={() => { if (puedeCambiar()) { setNueva(false); setSeleccion(null); setSucia(false); } }}><ArrowLeft className="mr-2 h-4 w-4" />Volver a la lista</Button></div>}
        {nueva ? <AltaPostulacion alCrear={p => { actualizar(p); setNueva(false); }} alCancelar={() => setNueva(false)} /> : seleccion ? <DetallePostulacion key={`${seleccion.id}-${seleccion.version}`} ficha={seleccion} alActualizar={actualizar} alCambiar={cambioSucio} alRecargar={() => void abrir(seleccion.id)} /> : <div className="m-auto max-w-sm p-8 text-center"><ClipboardList className="mx-auto mb-4 h-10 w-10 text-muted-foreground" /><h2 className="text-lg font-semibold">Un espacio para revisar con calma</h2><p className="mt-2 text-sm text-muted-foreground">Selecciona una postulación para consultar su CV, revisar evidencias y registrar el siguiente paso.</p></div>}
      </section>
    </div>
  </div>;
}

function AltaPostulacion({ alCrear, alCancelar }: { alCrear: (p: PostulacionFicha) => void; alCancelar: () => void }) {
  const [error, setError] = useState(""); const [guardando, setGuardando] = useState(false);
  const clave = useRef("");
  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); setGuardando(true); setError("");
    if (!clave.current) clave.current = `ui-${crypto.randomUUID()}`;
    try {
      const { postulacion } = await solicitar<{ postulacion: PostulacionFicha }>("/api/postulaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: form.get("nombre"), vacante: form.get("vacante"), correo: form.get("correo"), telefono: form.get("telefono"), canal: form.get("canal"), clave_externa: clave.current }) });
      alCrear(postulacion);
    } catch (e) { setError((e as Error).message); } finally { setGuardando(false); }
  }
  return <div className="mx-auto w-full max-w-2xl p-5 sm:p-8"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registro manual</p><h2 className="mt-2 text-xl font-semibold">Nueva postulación</h2><p className="mt-2 text-sm text-muted-foreground">Guarda los datos básicos. Podrás adjuntar el CV en la ficha.</p>
    <form className="mt-7 space-y-5" onSubmit={guardar}>
      {error && <Aviso>{error}</Aviso>}
      <label className="block text-sm font-medium">Nombre del candidato<Input name="nombre" required minLength={2} maxLength={120} className="mt-2" autoComplete="off" /></label>
      <label className="block text-sm font-medium">Vacante<Input name="vacante" required minLength={2} maxLength={120} className="mt-2" placeholder="Por ejemplo, Almacenista" /></label>
      <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium">Correo <span className="font-normal text-muted-foreground">(opcional)</span><Input type="email" name="correo" maxLength={254} className="mt-2" /></label><label className="block text-sm font-medium">Teléfono <span className="font-normal text-muted-foreground">(opcional)</span><Input type="tel" name="telefono" maxLength={40} className="mt-2" /></label></div>
      <label className="block text-sm font-medium">Canal de origen<select name="canal" className={`${selectClass} mt-2`}>{CANALES_POSTULACION.map(c => <option key={c} value={c}>{c === 'manual' ? 'Registro manual' : c[0]!.toUpperCase() + c.slice(1)}</option>)}</select></label>
      <div className="flex flex-wrap gap-3 border-t pt-5"><Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Crear postulación'}</Button><Button type="button" variant="outline" disabled={guardando} onClick={alCancelar}>Cancelar</Button></div>
    </form></div>;
}

function DetallePostulacion({ ficha: p, alActualizar, alCambiar, alRecargar }: { ficha: PostulacionFicha; alActualizar: (p: PostulacionFicha) => void; alCambiar: (value: boolean) => void; alRecargar: () => void }) {
  const [etapa, setEtapa] = useState(p.etapa); const [notas, setNotas] = useState(p.notas);
  const [error, setError] = useState(""); const [guardando, setGuardando] = useState(false); const [subiendo, setSubiendo] = useState(false);
  const sucia = etapa !== p.etapa || notas !== p.notas;
  useEffect(() => { alCambiar(sucia); }, [sucia, alCambiar]);
  const analisis = p.analisis;
  async function revisar(e: React.FormEvent) {
    e.preventDefault(); setGuardando(true); setError("");
    try { const result = await solicitar<{ postulacion: PostulacionFicha }>(`/api/postulaciones/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: p.version, etapa, notas }) }); alActualizar(result.postulacion); }
    catch (e) { setError((e as Error).message); } finally { setGuardando(false); }
  }
  async function subir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSubiendo(true); setError(""); const form = new FormData(e.currentTarget); form.set("version", String(p.version));
    try { const result = await solicitar<{ postulacion: PostulacionFicha }>(`/api/postulaciones/${p.id}/cv`, { method: "POST", body: form }); alActualizar(result.postulacion); }
    catch (e) { setError((e as Error).message); } finally { setSubiendo(false); }
  }
  return <article className="mx-auto w-full max-w-3xl space-y-7 p-5 sm:p-8">
    <header><div className="flex flex-wrap items-center gap-2"><Estado etapa={p.etapa} /><span className="text-xs text-muted-foreground">Recibida el {fecha(p.creadaEn)}</span></div><h2 className="mt-4 break-words text-2xl font-semibold">{p.nombre}</h2><p className="mt-1 text-base text-muted-foreground">{p.vacante}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"><span className="capitalize">Origen: {p.canal}</span>{p.telefono && <span>{p.telefono}</span>}{p.correo && <span className="break-all">{p.correo}</span>}</div></header>
    {error && <Aviso>{error} <button className="underline" onClick={alRecargar}>Recargar ficha</button></Aviso>}
    <section className="rounded-lg border p-4"><h3 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4" />Currículum</h3>{p.cv ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div><p className="break-all text-sm">{p.cv.nombre}</p><p className="mt-1 text-xs text-muted-foreground">PDF · {Math.ceil(p.cv.bytes / 1024)} KB · Archivo privado</p></div><a href={p.cv.url} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><FileDown className="h-4 w-4" />Descargar CV</a></div> : <form className="mt-3 space-y-3" onSubmit={subir}><label className="block text-sm text-muted-foreground">Adjuntar PDF de hasta 10 MB<Input name="archivo" type="file" accept="application/pdf,.pdf" required className="mt-2" disabled={subiendo || sucia} /></label>{sucia && <p className="text-xs text-muted-foreground">Guarda tus cambios antes de adjuntar el archivo.</p>}<Button type="submit" variant="outline" size="sm" disabled={subiendo || sucia}><Upload className="mr-2 h-4 w-4" />{subiendo ? 'Subiendo…' : 'Guardar CV'}</Button></form>}</section>
    <section><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Análisis de apoyo</h3><span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{analisis ? 'Requiere criterio humano' : 'Sin análisis'}</span></div>{analisis ? <div className="mt-3 space-y-4"><p className="whitespace-pre-wrap text-sm leading-relaxed">{analisis.resumen_profesional}</p><div className="rounded-md bg-muted p-3 text-sm">Información documentada: {Math.round(analisis.cobertura * 100)} % · {analisis.score === null ? 'Calificación pendiente' : `Referencia del análisis: ${analisis.score}/10`}</div>{analisis.criterios.map(c => <div key={c.id} className="rounded-md border p-3"><div className="flex flex-wrap justify-between gap-2 text-sm"><h4 className="font-medium">{c.id.replaceAll('_', ' ')}</h4><span className="text-xs text-muted-foreground">{{ cumple: 'Evidencia encontrada', parcial: 'Evidencia parcial', no_cumple: 'Brecha declarada', desconocido: 'Por confirmar' }[c.estado]}</span></div><p className="mt-2 text-sm text-muted-foreground">{c.explicacion}</p>{c.evidencia.map((cita, i) => <blockquote key={i} className="mt-2 border-l-2 pl-3 text-sm italic">{cita}</blockquote>)}</div>)}{!!analisis.requisitos_pendientes.length && <div><h4 className="text-sm font-medium">Por confirmar con el candidato</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{analisis.requisitos_pendientes.map((r, i) => <li key={i}>{r.replaceAll('_', ' ')}</li>)}</ul></div>}{!!analisis.alertas_documentales.length && <div><h4 className="text-sm font-medium">Observaciones para revisar</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{analisis.alertas_documentales.map((a, i) => <li key={i}>{a}</li>)}</ul></div>}<p className="text-xs text-muted-foreground">El análisis es orientativo. Verifica la información y las evidencias antes de decidir el siguiente paso.</p></div> : <p className="mt-3 rounded-md bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">Esta ficha todavía no tiene un análisis. Puedes consultar el CV y registrar tu revisión. La recepción automática de resultados se conectará en el siguiente paso.</p>}</section>
    <form onSubmit={revisar} className="space-y-4 border-t pt-6"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Tu revisión</h3>{p.revisionHumana === 'revisada' ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" />Revisión guardada{p.revisadaEn ? ` · ${fecha(p.revisadaEn)}` : ''}</span> : <span className="text-xs text-muted-foreground">Pendiente de revisión humana</span>}</div><label className="block text-sm font-medium">Etapa<select className={`${selectClass} mt-2`} value={etapa} onChange={e => setEtapa(e.target.value as EtapaPostulacion)}>{ETAPAS_POSTULACION.map(et => <option key={et} value={et}>{ETIQUETAS_ETAPA[et]}</option>)}</select></label><label className="block text-sm font-medium">Notas del reclutador<Textarea className="mt-2 min-h-28" value={notas} maxLength={6000} onChange={e => setNotas(e.target.value)} placeholder="Registra lo que confirmaste y el siguiente paso." /></label><Button type="submit" disabled={guardando || subiendo}>{guardando ? 'Guardando…' : 'Guardar revisión'}</Button><p className="text-xs text-muted-foreground">La etapa la eliges tú. Esta pantalla no envía mensajes ni toma decisiones automáticas de selección.</p></form>
  </article>;
}
