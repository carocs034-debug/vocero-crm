import { autorizarIngesta, configuracionIngesta } from "@/server/postulaciones/ingesta-auth";
import { consultarVacantes } from "@/server/vacantes/servicio";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const config = configuracionIngesta();
  if (!config) return new Response(null, { status: 404 });
  return autorizarIngesta(req, config.key) ?? consultarVacantes(config.org, req, true);
}
