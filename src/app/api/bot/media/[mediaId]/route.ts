import { apiError } from "@/lib/api";
import { eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { requireBotKey, resolveInstanceOrg } from "@/server/bot/auth";
import { getCredentialsByOrg } from "@/server/whatsapp/credentials";
import { downloadGraphMedia, leerAdjunto, MediaFetchError } from "@/server/whatsapp/media";

export const dynamic = "force-dynamic";

/** Límite para el bot (transcribe audio/imagen; nunca documentos de 100 MB). */
const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

/**
 * 006 (amendment 002) — Descarga de un adjunto de Meta para el bot.
 * GET /api/bot/media/{mediaId} → binario + content-type.
 *
 * El token de WhatsApp NO sale del CRM: el bot pide aquí, jamás a Meta.
 * Flujo Graph delegado al helper compartido (008): src/server/whatsapp/media.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ mediaId: string }> }
) {
  const denied = requireBotKey(req);
  if (denied) return denied;

  const organizationId = await resolveInstanceOrg();
  if (!organizationId) {
    return apiError(409, "no_org", "La instancia aún no tiene organización");
  }
  const { mediaId } = await ctx.params;
  if (!/^[\w.-]{1,64}$/.test(mediaId)) {
    return apiError(422, "invalid", "mediaId inválido");
  }

  if (mediaId.startsWith("archivo.")) {
    const tabla = schema.mediaAsset;
    const [asset] = await getDb().select().from(tabla).where(scoped(
      tabla.organizationId, organizationId,
      eq(tabla.id, mediaId.slice("archivo.".length)),
      eq(tabla.kind, "document"),
      eq(tabla.mimeType, "application/pdf"),
      isNull(tabla.waMediaId)
    )).limit(1);
    if (asset?.fetchStatus === "pending") {
      return apiError(503, "media_pending", "El PDF todavía se está descargando");
    }
    const archivo = asset?.fetchStatus === "available"
      ? await leerAdjunto(organizationId, asset)
      : null;
    if (!archivo) return apiError(404, "not_found", "PDF no disponible");
    if (archivo.data.length > MAX_MEDIA_BYTES) {
      return apiError(413, "too_large", "El adjunto excede el límite de 16 MB");
    }
    return new Response(new Uint8Array(archivo.data), {
      headers: { "content-type": "application/pdf", "cache-control": "no-store" },
    });
  }

  const creds = await getCredentialsByOrg(organizationId);
  if (!creds) {
    return apiError(409, "no_connection", "WhatsApp no está conectado");
  }

  try {
    const { data, mimeType } = await downloadGraphMedia(
      creds.token,
      mediaId,
      MAX_MEDIA_BYTES
    );
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": mimeType ?? "application/octet-stream",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof MediaFetchError) {
      if (err.message.includes("límite")) {
        return apiError(413, "too_large", "El adjunto excede el límite de 16 MB");
      }
      return apiError(
        err.gone ? 404 : 502,
        "media_download_failed",
        err.message
      );
    }
    return apiError(502, "media_download_failed", "No se pudo descargar el adjunto");
  }
}
