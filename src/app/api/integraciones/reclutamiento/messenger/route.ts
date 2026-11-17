import { desc, eq, lte } from "drizzle-orm";
import { apiError } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { autorizarIngesta, configuracionIngesta } from "@/server/postulaciones/ingesta-auth";
import { resolverVacanteMessenger } from "@/server/postulaciones/vacante-messenger";
import { listarVacantes } from "@/server/vacantes/servicio";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const config = configuracionIngesta();
  if (!config?.conversacionMessenger) return new Response(null, { status: 404 });
  const denegada = autorizarIngesta(req, config.key);
  if (denegada) return denegada;

  const id = new URL(req.url).searchParams.get("mensaje_id");
  if (!id || !/^msg_[\w-]{1,60}$/.test(id)) {
    return apiError(422, "mensaje_invalido", "Indica el identificador del mensaje del CRM");
  }

  const db = getDb();
  const { message, conversation, mediaAsset } = schema;
  const [documento] = await db.select({ fecha: message.waTimestamp, creado: message.createdAt, mediaId: mediaAsset.id })
    .from(message)
    .innerJoin(conversation, eq(message.conversationId, conversation.id))
    .innerJoin(mediaAsset, eq(message.mediaAssetId, mediaAsset.id))
    .where(scoped(message.organizationId, config.org,
      eq(message.id, id), eq(message.direction, "in"), eq(message.type, "document"),
      scoped(conversation.organizationId, config.org, eq(conversation.id, config.conversacionMessenger), eq(conversation.channel, "messenger")),
      scoped(mediaAsset.organizationId, config.org, eq(mediaAsset.mimeType, "application/pdf"), eq(mediaAsset.fetchStatus, "available"))))
    .limit(1);
  if (!documento) return apiError(404, "pdf_no_disponible", "El chat de prueba no tiene ese PDF disponible");

  const [historial, vacantes] = await Promise.all([
    db.select({ texto: message.text }).from(message)
      .where(scoped(message.organizationId, config.org, eq(message.conversationId, config.conversacionMessenger),
        eq(message.direction, "in"), eq(message.type, "text"),
        lte(message.createdAt, documento.creado),
        ...(documento.fecha ? [lte(message.waTimestamp, documento.fecha)] : [])))
      .orderBy(desc(message.createdAt), desc(message.id)).limit(20),
    listarVacantes(config.org, true),
  ]);
  const codigo = resolverVacanteMessenger(historial.flatMap(({ texto }) => texto ? [texto] : []), vacantes);
  return Response.json({
    estado: codigo ? "confirmada" : "por_confirmar",
    vacante_codigo: codigo,
    conversacion_id: config.conversacionMessenger,
    mensaje_id: id,
    media_id: "archivo." + documento.mediaId,
  }, { headers: { "Cache-Control": "no-store" } });
}
