import { configuracionIngesta } from "./ingesta-auth";

export async function dispararEvaluacionMessenger(
  organizationId: string,
  conversationId: string,
  messageId: string
): Promise<void> {
  const config = configuracionIngesta();
  if (!config || config.org !== organizationId || config.conversacionMessenger !== conversationId) return;

  const destino = process.env.RECLUTAMIENTO_MESSENGER_N8N_URL?.trim();
  const clave = process.env.RECLUTAMIENTO_MESSENGER_N8N_KEY?.trim();
  if (!destino || !clave) return;

  try {
    const url = new URL(destino);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    const respuesta = await fetch(url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(4000),
      headers: {
        "Content-Type": "application/json",
        "X-Talented-Messenger-Key": clave,
      },
      body: JSON.stringify({ mensaje_id: messageId }),
    });
    if (!respuesta.ok) console.warn("[reclutamiento] n8n no aceptó el CV de Messenger", messageId, respuesta.status);
  } catch {
    console.warn("[reclutamiento] no se pudo avisar a n8n del CV de Messenger", messageId);
  }
}
