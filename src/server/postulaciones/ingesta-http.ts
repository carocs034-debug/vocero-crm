import { z } from "zod";
import { apiError } from "@/lib/api";
import { configuracionIngesta, autorizarIngesta } from "./ingesta-auth";
import { datosIngestaSchema } from "./ingesta-contrato";
import { ingerirPostulacion } from "./ingesta-servicio";
import { ErrorPostulacion, leerCuerpoLimitado, MAX_CV_BYTES } from "./validacion";
export async function recibirIngesta(req: Request) {
  const config = configuracionIngesta();
  if (!config) return new Response(null, { status: 404 });
  const denegada = autorizarIngesta(req, config.key);
  if (denegada) return denegada;
  try {
    if (!req.headers.get("content-type")?.startsWith("multipart/form-data;")) throw new ErrorPostulacion(422, "formulario_invalido", "Se requiere formulario multipart");
    const bytes = await leerCuerpoLimitado(req, MAX_CV_BYTES + 192 * 1024);
    let form: FormData;
    try { form = await new Request(req.url, { method: "POST", headers: req.headers, body: new Uint8Array(bytes) }).formData(); }
    catch { throw new ErrorPostulacion(422, "formulario_invalido", "No se pudo leer el formulario"); }
    const raw = form.get("datos"), archivo = form.get("archivo");
    if ([...form.keys()].some(k => k !== "datos" && k !== "archivo") ||
        form.getAll("datos").length !== 1 || form.getAll("archivo").length > 1 ||
        typeof raw !== "string" || Buffer.byteLength(raw) > 120 * 1024 ||
        (archivo !== null && !(archivo instanceof File))) throw new ErrorPostulacion(422, "campos_invalidos", "Datos o archivo inválidos");
    let json: unknown;
    try { json = JSON.parse(raw); } catch { throw new ErrorPostulacion(422, "json_invalido", "JSON inválido"); }
    const datos = datosIngestaSchema.parse(json);
    const result = await ingerirPostulacion(config, datos, archivo instanceof File
      ? { bytes: Buffer.from(await archivo.arrayBuffer()), mime: archivo.type, nombre: archivo.name } : undefined);
    return Response.json(result, { status: result.creada ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ErrorPostulacion) return apiError(error.status, error.code, error.message);
    if (error instanceof z.ZodError) return apiError(422, "datos_invalidos", "Revisa los datos y el análisis de la postulación");
    return apiError(500, "fallo_ingesta", "No se pudo guardar la postulación. Reintenta el mismo mensaje");
  }
}
