import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { newId } from "@/lib/db/ids";
import type { AnalisisPostulacion } from "@/lib/postulaciones";
import { guardarMedia, leerMedia, borrarMedia } from "@/lib/storage/medios";
import { ErrorPostulacion, nombreCvSeguro, validarPdf } from "./validacion";
import { validarAlcanceYCitas, type AlcanceIngesta, type DatosIngesta } from "./ingesta-contrato";
export async function ingerirPostulacion(alcance: AlcanceIngesta, datos: DatosIngesta, archivo: { bytes: Buffer; mime: string; nombre: string }) {
  validarAlcanceYCitas(datos, alcance); validarPdf(archivo.bytes, archivo.mime);
  const clave = `ingesta:zernio:${createHash("sha256").update(JSON.stringify([datos.cuenta_id, datos.mensaje_id])).digest("hex")}`;
  const tabla = schema.postulacion;
  let nuevoArchivo: string | null = null;
  let insercionTerminada = false;
  try {
    return await getDb().transaction(async tx => {
      await tx.execute(sql`set local lock_timeout = '5s'`);
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${JSON.stringify([alcance.org, clave])}, 0))`);
      const [previa] = await tx.select().from(tabla).where(scoped(tabla.organizationId, alcance.org, eq(tabla.claveExterna, clave))).limit(1);
      if (previa) {
        if (!previa.cvStorageId) throw new ErrorPostulacion(409, "ingesta_incompleta", "El mensaje requiere revisión del operador");
        const guardado = await leerMedia(alcance.org, previa.cvStorageId);
        if (!guardado.equals(archivo.bytes)) throw new ErrorPostulacion(409, "mensaje_con_otro_pdf", "El mensaje ya fue recibido con otro PDF");
        return { creada: false, id: previa.id, url_ficha: `/postulaciones?id=${previa.id}` };
      }
      const vacantePendiente = datos.vacante_indicada === false;
      let vacante = vacantePendiente ? "Por confirmar" : alcance.vacante;
      let analisis: AnalisisPostulacion | null = vacantePendiente ? null : datos.analisis;
      if (!vacantePendiente && datos.rubrica_catalogo) {
        const referencia = datos.rubrica_catalogo;
        const catalogo = schema.vacanteReclutamiento;
        const [puesto] = await tx.select().from(catalogo)
          .where(scoped(catalogo.organizationId, alcance.org, eq(catalogo.codigo, referencia.codigo), eq(catalogo.activa, true)))
          .limit(1);
        const rubrica = puesto?.rubricas[referencia.version - 1];
        if (!puesto || !rubrica || rubrica.length !== datos.analisis.criterios.length ||
            rubrica.some(c => !datos.analisis.criterios.some(resultado => resultado.id === c.id))) {
          throw new ErrorPostulacion(422, "rubrica_invalida", "La evaluación no corresponde a una rúbrica de la vacante abierta");
        }
        vacante = puesto.nombre;
        analisis = { ...datos.analisis, rubrica_catalogo: referencia };
      }
      const id = newId("postulacion"), storageId = newId("mediaAsset");
      // Limpiar tambien un archivo parcialmente escrito si falla la operacion.
      nuevoArchivo = storageId;
      await guardarMedia(alcance.org, storageId, archivo.bytes, "application/pdf");
      await tx.insert(tabla).values({ id, organizationId: alcance.org, nombre: datos.nombre,
        vacante,
        etapa: vacantePendiente ? "por_completar" : "nueva",
        canal: "whatsapp", claveExterna: clave, analisis,
        cvStorageId: storageId, cvNombre: nombreCvSeguro(archivo.nombre), cvBytes: archivo.bytes.length });
      insercionTerminada = true;
      return { creada: true, id, url_ficha: `/postulaciones?id=${id}` };
    });
  } catch (error) {
    // Si se pierde la confirmacion del COMMIT, conservar el archivo: podria
    // estar vinculado a una fila ya confirmada. Un reintento resuelve el estado.
    if (nuevoArchivo && !insercionTerminada) await borrarMedia(alcance.org, nuevoArchivo).catch(() => undefined);
    throw error;
  }
}
