import { createHash, timingSafeEqual } from "node:crypto";
import { apiError } from "@/lib/api";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { reclutamientoEnabled } from "./flag";
import type { AlcanceIngesta } from "./ingesta-contrato";
export function configuracionIngesta(): (AlcanceIngesta & { key: string }) | null {
  const e = process.env;
  if (!reclutamientoEnabled() || e.RECLUTAMIENTO_INGESTA !== "on") return null;
  const key = e.RECLUTAMIENTO_INGESTA_KEY, org = e.RECLUTAMIENTO_INGESTA_ORG, cuenta = e.RECLUTAMIENTO_INGESTA_CUENTA, conversacion = e.RECLUTAMIENTO_INGESTA_CONVERSACION, vacante = e.RECLUTAMIENTO_INGESTA_VACANTE;
  return key && key.length >= 32 && key.length <= 512 && org && /^[\w.-]{1,200}$/.test(org) && cuenta && conversacion && vacante && vacante.trim().length >= 2 && vacante.length <= 120
    ? { key, org, cuenta, conversacion, vacante, buzon: e.RECLUTAMIENTO_INGESTA_BUZON?.trim() || undefined }
    : null;
}
export function autorizarIngesta(req: Request, key: string): Response | null {
  const dada = req.headers.get("x-reclutamiento-key") ?? "";
  const hash = (s: string) => createHash("sha256").update(s).digest();
  if (!dada || dada.length > 512 || !timingSafeEqual(hash(dada), hash(key))) {
    const r = checkRateLimit(`ingesta-fallo:${clientIp(req.headers)}`, { max: 20, windowMs: 60000 });
    return apiError(r.allowed ? 401 : 429, "no_autorizado", "No autorizado");
  }
  return checkRateLimit("ingesta-autenticada", { max: 20, windowMs: 60000 }).allowed ? null : apiError(429, "limite_ingesta", "Espera antes de reintentar");
}
