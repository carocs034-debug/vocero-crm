import { describe, expect, it } from "vitest";
import { mensajeWhatsAppZernio } from "@/server/whatsapp/zernio-inbound";
import type { ZernioEvent } from "@/server/zernio";

const evento: ZernioEvent = {
  event: "message.received",
  account: { id: "cuenta-prueba", platform: "whatsapp" },
  message: {
    id: "evento-prueba",
    platformMessageId: "wamid.prueba",
    conversationId: "hilo-opaco",
    direction: "incoming",
    text: "Prueba de WhatsApp",
    sentAt: "2026-11-16T12:00:00Z",
    sender: { phoneNumber: "+5219990000000", name: "Prueba" },
  },
};

describe("mensajes WhatsApp de Zernio", () => {
  it("usa la identidad de WhatsApp y conserva el hilo y el identificador de plataforma", () => {
    expect(mensajeWhatsAppZernio(evento)).toMatchObject({
      identity: { identity: "529990000000", phone: "529990000000", channel: "whatsapp" },
      waMessageId: "wamid.prueba",
      threadRef: "hilo-opaco",
      type: "text",
    });
  });

  it("ignora envíos y usa el identificador empresarial si no hay teléfono", () => {
    expect(mensajeWhatsAppZernio({ ...evento, message: { ...evento.message, direction: "outgoing" } })).toBeNull();
    expect(mensajeWhatsAppZernio({
      ...evento,
      message: { ...evento.message, sender: { businessScopedUserId: "contacto-prueba" } },
    })).toMatchObject({ identity: { identity: "bsuid:contacto-prueba", phone: null } });
  });
});
