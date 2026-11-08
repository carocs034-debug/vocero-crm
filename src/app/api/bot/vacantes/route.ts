import { apiError } from "@/lib/api";
import { requireBotKey, resolveInstanceOrg } from "@/server/bot/auth";
import { reclutamientoEnabled } from "@/server/postulaciones/flag";
import { consultarVacantes } from "@/server/vacantes/servicio";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  if (!reclutamientoEnabled()) return new Response(null, { status: 404 });
  const error = requireBotKey(req);
  if (error) return error;
  const org = await resolveInstanceOrg();
  if (!org) return apiError(404, "organizacion_no_disponible", "Organización no disponible");
  return consultarVacantes(org, req, false);
}
