import { count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { newId } from "@/lib/db/ids";
import { guardarMedia, leerMedia, borrarMedia } from "@/lib/storage/medios";
import type { SessionContext } from "@/lib/auth/session";
import { crearPostulacionSchema, filtroPostulacionesSchema, revisionPostulacionSchema, type PostulacionFicha } from "@/lib/postulaciones";
import type { z } from "zod";
import { ErrorPostulacion, nombreCvSeguro, validarPdf } from "./validacion";

const tabla = schema.postulacion;
export function fichaDe(fila: typeof tabla.$inferSelect): PostulacionFicha {
  return {
    id: fila.id, nombre: fila.nombre, vacante: fila.vacante, correo: fila.correo, telefono: fila.telefono,
    canal: fila.canal, etapa: fila.etapa, notas: fila.notas, analisis: fila.analisis,
    revisionHumana: fila.revisionHumana, revisadaEn: fila.revisadaEn?.toISOString() ?? null,
    creadaEn: fila.creadaEn.toISOString(), actualizadaEn: fila.actualizadaEn.toISOString(), version: fila.version,
    cv: fila.cvStorageId ? { nombre: fila.cvNombre ?? "curriculum.pdf", bytes: fila.cvBytes ?? 0, url: `/api/postulaciones/${fila.id}/cv` } : null,
  };
}
export async function obtenerPostulacion(org: string, id: string) {
  const [fila] = await getDb().select().from(tabla).where(scoped(tabla.organizationId, org, eq(tabla.id, id))).limit(1);
  if (!fila) throw new ErrorPostulacion(404, "no_encontrada", "No se encontró la postulación");
  return fila;
}
export async function listarPostulaciones(org: string, filtro: z.infer<typeof filtroPostulacionesSchema>) {
  const patron = `%${filtro.q.replace(/[\\%_]/g, "\\$&")}%`;
  const where = scoped(tabla.organizationId, org,
    filtro.q ? or(ilike(tabla.nombre, patron), ilike(tabla.vacante, patron)) : undefined,
    filtro.etapa ? eq(tabla.etapa, filtro.etapa) : undefined);
  const db = getDb();
  const [filas, totales, grupos] = await Promise.all([
    db.select().from(tabla).where(where).orderBy(desc(tabla.creadaEn), desc(tabla.id)).limit(30).offset((filtro.pagina - 1) * 30),
    db.select({ total: count() }).from(tabla).where(where),
    db.select({ etapa: tabla.etapa, total: count() }).from(tabla).where(scoped(tabla.organizationId, org)).groupBy(tabla.etapa),
  ]);
  return { postulaciones: filas.map(fichaDe), total: totales[0]?.total ?? 0, pagina: filtro.pagina, conteo: Object.fromEntries(grupos.map(g => [g.etapa, g.total])) };
}
export async function crearPostulacion(org: string, entrada: z.infer<typeof crearPostulacionSchema>) {
  const db = getDb();
  const [fila] = await db.insert(tabla).values({
    id: newId("postulacion"), organizationId: org, nombre: entrada.nombre, vacante: entrada.vacante,
    correo: entrada.correo, telefono: entrada.telefono, canal: entrada.canal,
    claveExterna: entrada.clave_externa, analisis: entrada.analisis ?? null,
  }).onConflictDoNothing({ target: [tabla.organizationId, tabla.claveExterna] }).returning();
  if (fila) return { creada: true, postulacion: fichaDe(fila) };
  if (entrada.clave_externa) {
    const [previa] = await db.select().from(tabla).where(scoped(tabla.organizationId, org, eq(tabla.claveExterna, entrada.clave_externa))).limit(1);
    if (previa) return { creada: false, postulacion: fichaDe(previa) };
  }
  throw new ErrorPostulacion(409, "conflicto", "No se pudo guardar. Actualiza la lista y vuelve a intentar");
}
export async function revisarPostulacion(sesion: SessionContext, id: string, datos: z.infer<typeof revisionPostulacionSchema>) {
  await obtenerPostulacion(sesion.organizationId, id);
  const [fila] = await getDb().update(tabla).set({
    etapa: datos.etapa, notas: datos.notas, revisionHumana: "revisada", revisadaPor: sesion.userId,
    revisadaEn: new Date(), actualizadaEn: new Date(), version: sql`${tabla.version} + 1`,
  }).where(scoped(tabla.organizationId, sesion.organizationId, eq(tabla.id, id), eq(tabla.version, datos.version))).returning();
  if (!fila) throw new ErrorPostulacion(409, "version_desactualizada", "La ficha cambió. Recárgala antes de guardar tu revisión");
  return fichaDe(fila);
}
export async function adjuntarCv(org: string, id: string, version: number, bytes: Buffer, mime: string, nombre: string) {
  const previa = await obtenerPostulacion(org, id);
  if (previa.cvStorageId) throw new ErrorPostulacion(409, "cv_existente", "Esta ficha ya tiene un CV. No se reemplazó el archivo");
  if (previa.version !== version) throw new ErrorPostulacion(409, "version_desactualizada", "La ficha cambió. Recárgala antes de adjuntar");
  validarPdf(bytes, mime);
  const storageId = newId("mediaAsset");
  try {
    await guardarMedia(org, storageId, bytes, "application/pdf");
    const [fila] = await getDb().update(tabla).set({ cvStorageId: storageId, cvNombre: nombreCvSeguro(nombre), cvBytes: bytes.length,
      revisionHumana: "pendiente", revisadaPor: null, revisadaEn: null,
      actualizadaEn: new Date(), version: sql`${tabla.version} + 1` })
      .where(scoped(tabla.organizationId, org, eq(tabla.id, id), eq(tabla.version, version), isNull(tabla.cvStorageId))).returning();
    if (!fila) throw new ErrorPostulacion(409, "version_desactualizada", "La ficha cambió. Recárgala antes de adjuntar");
    return fichaDe(fila);
  } catch (error) {
    // Solo revierte el archivo nuevo que no llego a ligarse a la ficha.
    await borrarMedia(org, storageId).catch(() => undefined);
    throw error;
  }
}
export async function descargarCv(org: string, id: string) {
  const fila = await obtenerPostulacion(org, id);
  if (!fila.cvStorageId) throw new ErrorPostulacion(404, "sin_cv", "Esta postulación no tiene CV");
  const bytes = await leerMedia(org, fila.cvStorageId);
  return { bytes, nombre: nombreCvSeguro(fila.cvNombre ?? "curriculum.pdf") };
}
