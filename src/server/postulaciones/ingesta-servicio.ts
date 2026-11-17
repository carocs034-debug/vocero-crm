import { createHash } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { newId } from "@/lib/db/ids";
import type { AnalisisPostulacion } from "@/lib/postulaciones";
import { guardarMedia, leerMedia, borrarMedia } from "@/lib/storage/medios";
import { ErrorPostulacion, nombreCvSeguro, validarCvCorreo, validarPdf } from "./validacion";
import { validarAlcanceYCitas, type AlcanceIngesta, type DatosIngesta } from "./ingesta-contrato";
export async function ingerirPostulacion(alcance: AlcanceIngesta, datos: DatosIngesta, archivo?: { bytes: Buffer; mime: string; nombre: string }) {
  const esCorreo = "buzon" in datos;
  validarAlcanceYCitas(datos, alcance);
  const esMessenger = "canal" in datos && datos.canal === "messenger";
  if (esMessenger) {
    if (archivo) throw new ErrorPostulacion(422, "archivo_inesperado", "Se usa el PDF guardado en Messenger");
    const { message, conversation, mediaAsset } = schema;
    const [pdf] = await getDb().select({ id: mediaAsset.id, nombre: mediaAsset.fileName })
      .from(message)
      .innerJoin(conversation, eq(message.conversationId, conversation.id))
      .innerJoin(mediaAsset, eq(message.mediaAssetId, mediaAsset.id))
      .where(scoped(message.organizationId, alcance.org,
        eq(message.id, datos.mensaje_id), eq(message.direction, "in"), eq(message.type, "document"),
        scoped(conversation.organizationId, alcance.org, eq(conversation.id, datos.conversacion_id), eq(conversation.channel, "messenger")),
        scoped(mediaAsset.organizationId, alcance.org, eq(mediaAsset.id, datos.media_id.slice("archivo.".length)),
          eq(mediaAsset.mimeType, "application/pdf"), eq(mediaAsset.fetchStatus, "available"))))
      .limit(1);
    if (!pdf) throw new ErrorPostulacion(404, "pdf_no_disponible", "El chat no tiene ese PDF disponible");
    archivo = {
      bytes: await leerMedia(alcance.org, pdf.id),
      mime: "application/pdf",
      nombre: pdf.nombre ?? "CV de Messenger.pdf",
    };
  }
  const fallo = "fallo_procesamiento" in datos ? datos.fallo_procesamiento : undefined;
  const sinAdjunto = fallo === "falta_cv" || fallo === "varios_adjuntos";
  if (Boolean(archivo) === sinAdjunto) throw new ErrorPostulacion(422, "campos_invalidos", "El archivo debe corresponder al motivo de revisión");
  if (archivo) (esCorreo ? validarCvCorreo : validarPdf)(archivo.bytes, archivo.mime);
  const origen = esCorreo ? "correo" : esMessenger ? "messenger" : "zernio";
  const cuenta = esCorreo ? datos.buzon.toLowerCase()
    : "cuenta_id" in datos ? datos.cuenta_id : datos.conversacion_id;
  const clave = `ingesta:${origen}:${createHash("sha256").update(JSON.stringify([cuenta, datos.mensaje_id])).digest("hex")}`;
  const tabla = schema.postulacion;
  let nuevoArchivo: string | null = null;
  let insercionTerminada = false;
  try {
    return await getDb().transaction(async tx => {
      await tx.execute(sql`set local lock_timeout = '5s'`);
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${JSON.stringify([alcance.org, clave])}, 0))`);
      const [previa] = await tx.select().from(tabla).where(scoped(tabla.organizationId, alcance.org, eq(tabla.claveExterna, clave))).limit(1);
      const vacantePendiente = datos.vacante_indicada === false;
      const perfil = "perfil" in datos ? datos.perfil : undefined;
      const puedeCompletar = previa?.canal === "correo" && previa.vacante === "Por confirmar" &&
        previa.etapa === "por_completar" && previa.revisionHumana === "pendiente";
      if (previa) {
        if (!archivo) return { creada: false, id: previa.id, url_ficha: `/postulaciones?id=${previa.id}` };
        if (!previa.cvStorageId && !puedeCompletar) throw new ErrorPostulacion(409, "ingesta_incompleta", "El mensaje requiere revisión del operador");
        if (previa.cvStorageId) {
          const guardado = await leerMedia(alcance.org, previa.cvStorageId);
          if (!guardado.equals(archivo.bytes)) throw new ErrorPostulacion(409, "mensaje_con_otro_pdf", "El mensaje ya fue recibido con otro PDF");
        }
        const anterior = previa.analisis;
        const sinAnalisis = anterior === null || Boolean(anterior.fallo_procesamiento);
        const agregarPerfil = perfil && (sinAnalisis ||
          (anterior?.vacantes_sugeridas?.length === 0 && perfil.sugerencias.length > 0));
        const registrarFallo = fallo && sinAnalisis && anterior?.fallo_procesamiento !== fallo;
        const confirmarVacante = esCorreo && (sinAnalisis || Boolean(anterior?.vacantes_sugeridas));
        if (!puedeCompletar || !(vacantePendiente ? agregarPerfil || registrarFallo : confirmarVacante)) {
          return { creada: false, id: previa.id, url_ficha: `/postulaciones?id=${previa.id}` };
        }
      }
      let vacante = vacantePendiente ? "Por confirmar" : alcance.vacante;
      let analisis: AnalisisPostulacion | null = vacantePendiente ? null : datos.analisis;
      if (fallo) {
        analisis = {
          fallo_procesamiento: fallo, resumen_profesional: "", criterios: [], cobertura: 0,
          score: null, requisitos_pendientes: [], alertas_documentales: [],
        };
      }
      if (perfil) {
        const normalizar = (texto: string) => texto.normalize("NFC").replace(/\s+/g, " ").trim();
        const texto = normalizar(perfil.texto_extraido);
        const citas = new Map(perfil.sugerencias
          .filter(s => texto.includes(normalizar(s.evidencia)))
          .map(s => [s.codigo, s.evidencia]));
        const catalogo = schema.vacanteReclutamiento;
        const vigentes = citas.size ? await tx.select({ codigo: catalogo.codigo, nombre: catalogo.nombre })
          .from(catalogo).where(scoped(catalogo.organizationId, alcance.org,
            eq(catalogo.activa, true), inArray(catalogo.codigo, [...citas.keys()]))) : [];
        analisis = {
          resumen_profesional: perfil.resumen_profesional,
          criterios: [], cobertura: 0, score: null, requisitos_pendientes: [], alertas_documentales: [],
          vacantes_sugeridas: vigentes.flatMap(v => {
            const evidencia = citas.get(v.codigo);
            return evidencia ? [{ ...v, evidencia }] : [];
          }),
        };
        if (previa?.analisis?.vacantes_sugeridas && !analisis.vacantes_sugeridas?.length) {
          return { creada: false, id: previa.id, url_ficha: `/postulaciones?id=${previa.id}` };
        }
      }
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
      if (previa) {
        const adjuntar = previa.cvStorageId ? undefined : archivo;
        if (adjuntar) {
          nuevoArchivo = newId("mediaAsset");
          await guardarMedia(alcance.org, nuevoArchivo, adjuntar.bytes, adjuntar.mime);
        }
        await tx.update(tabla).set({
          vacante, analisis, etapa: vacantePendiente ? previa.etapa : "nueva", actualizadaEn: new Date(),
          ...(adjuntar && { cvStorageId: nuevoArchivo, cvNombre: nombreCvSeguro(adjuntar.nombre, adjuntar.mime), cvBytes: adjuntar.bytes.length }),
          version: sql`${tabla.version} + 1`,
        }).where(scoped(tabla.organizationId, alcance.org, eq(tabla.id, previa.id), eq(tabla.version, previa.version)));
        insercionTerminada = true;
        return { creada: false, id: previa.id, url_ficha: `/postulaciones?id=${previa.id}` };
      }
      const id = newId("postulacion"), storageId = newId("mediaAsset");
      // Limpiar tambien un archivo parcialmente escrito si falla la operacion.
      if (archivo) {
        nuevoArchivo = storageId;
        await guardarMedia(alcance.org, storageId, archivo.bytes, archivo.mime);
      }
      await tx.insert(tabla).values({ id, organizationId: alcance.org, nombre: datos.nombre,
        vacante,
        etapa: vacantePendiente ? "por_completar" : "nueva",
        canal: esCorreo ? "correo" : esMessenger ? "messenger" : "whatsapp", claveExterna: clave, analisis,
        ...(archivo && { cvStorageId: storageId, cvNombre: nombreCvSeguro(archivo.nombre, archivo.mime), cvBytes: archivo.bytes.length }) });
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
