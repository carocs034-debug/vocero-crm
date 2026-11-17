import { normalizeMx } from "@/lib/meta/client";
import { isChannelEnabled } from "@/server/channels/enabled";
import type { ResolvedIdentity } from "@/server/inbox/identity";
import { ingestInboundMessage } from "@/server/inbox/ingest";
import { zernioSentAtSeconds, type ZernioEvent } from "@/server/zernio";

export function configuracionWhatsAppZernio() {
  const cuenta = process.env.ZERNIO_WHATSAPP_ACCOUNT_ID?.trim();
  const organizacion = process.env.ZERNIO_WHATSAPP_ORGANIZATION_ID?.trim();
  return cuenta && organizacion && isChannelEnabled("whatsapp") ? { cuenta, organizacion } : null;
}

const tiposAdjuntos: Readonly<Record<string, string>> = {
  image: "image", audio: "audio", video: "video", file: "document", document: "document",
};

export function mensajeWhatsAppZernio(evt: ZernioEvent) {
  const m = evt.message;
  if (evt.event !== "message.received" || m?.direction !== "incoming" || !m.id) return null;
  const threadRef = m.conversationId ?? evt.conversation?.id;
  if (!threadRef) return null;

  const remitente = m.sender;
  const n = remitente?.phoneNumber ?? remitente?.id;
  const phone = typeof n === "string" && /^\+?[1-9]\d{7,14}$/.test(n)
    ? normalizeMx(n.replace(/^\+/, ""))
    : null;
  const waUserId = remitente?.businessScopedUserId || null;
  if (!phone && !waUserId) return null;
  const identity: ResolvedIdentity = {
    identity: phone ?? "bsuid:" + waUserId,
    channel: "whatsapp",
    phone,
    waUserId,
    profileName: remitente?.name ?? null,
  };
  const adjunto = m.attachments?.[0];
  const text = m.text || null;
  if (!adjunto && !text) return null;
  return {
    identity,
    waMessageId: m.platformMessageId || "zernio_wa_" + m.id,
    type: adjunto ? (tiposAdjuntos[adjunto.type ?? ""] ?? "unsupported") : "text",
    text,
    timestamp: zernioSentAtSeconds(m.sentAt),
    threadRef,
  };
}

export async function ingerirWhatsAppZernio(evt: ZernioEvent, organizationId: string) {
  const mensaje = mensajeWhatsAppZernio(evt);
  if (mensaje) await ingestInboundMessage({ organizationId, ...mensaje });
}
