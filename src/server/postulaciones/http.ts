import { z } from "zod";
import { apiError, withAuth } from "@/lib/api";
import type { SessionContext } from "@/lib/auth/session";
import { crearPostulacionSchema, filtroPostulacionesSchema, revisionPostulacionSchema } from "@/lib/postulaciones";
import { reclutamientoEnabled } from "./flag";
import { ErrorPostulacion, leerCuerpoLimitado, MAX_CV_BYTES } from "./validacion";
import { adjuntarCv, crearPostulacion, descargarCv, fichaDe, listarPostulaciones, obtenerPostulacion, revisarPostulacion } from "./servicio";

export function rutaPostulaciones<Args extends unknown[]>(handler: (s: SessionContext, ...args: Args) => Promise<Response>) {
  const protegido = withAuth(async (s, ...args: Args) => {
    try { return await handler(s, ...args); }
    catch (error) {
      if (error instanceof ErrorPostulacion) return apiError(error.status, error.code, error.message);
      if (error instanceof z.ZodError) return apiError(422, "datos_invalidos", error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; "));
      // No registrar consultas SQL, CVs o datos personales en errores.
      return apiError(500, "error_postulaciones", "No se pudo completar la operación. Intenta de nuevo");
    }
  });
  return (...args: Args) => reclutamientoEnabled() ? protegido(...args) : Promise.resolve(new Response(null, { status: 404 }));
}
async function jsonValidado<T>(req: Request, esquema: z.ZodType<T>): Promise<T> {
  const bytes = await leerCuerpoLimitado(req, 128 * 1024);
  let data: unknown;
  try { data = JSON.parse(bytes.toString("utf8")); }
  catch { throw new ErrorPostulacion(422, "json_invalido", "La solicitud debe contener JSON válido"); }
  return esquema.parse(data);
}
const privado = { "Cache-Control": "private, no-store" };
export const listar = rutaPostulaciones(async (s, req: Request) => {
  const filtro = filtroPostulacionesSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return Response.json(await listarPostulaciones(s.organizationId, filtro), { headers: privado });
});
export const crear = rutaPostulaciones(async (s, req: Request) => {
  const result = await crearPostulacion(s.organizationId, await jsonValidado(req, crearPostulacionSchema));
  return Response.json(result, { status: result.creada ? 201 : 200, headers: privado });
});
type Contexto = { params: Promise<{ id: string }> };
const idValido = z.string().regex(/^post_[a-z0-9]{20}$/);
async function idDe(ctx: Contexto) { return idValido.parse((await ctx.params).id); }
export const obtener = rutaPostulaciones(async (s, _req: Request, ctx: Contexto) => Response.json({ postulacion: fichaDe(await obtenerPostulacion(s.organizationId, await idDe(ctx))) }, { headers: privado }));
export const revisar = rutaPostulaciones(async (s, req: Request, ctx: Contexto) => Response.json({ postulacion: await revisarPostulacion(s, await idDe(ctx), await jsonValidado(req, revisionPostulacionSchema)) }, { headers: privado }));
export const adjuntar = rutaPostulaciones(async (s, req: Request, ctx: Contexto) => {
  const id = await idDe(ctx);
  await obtenerPostulacion(s.organizationId, id);
  if (!req.headers.get("content-type")?.startsWith("multipart/form-data;")) throw new ErrorPostulacion(422, "formulario_invalido", "Adjunta el archivo desde el formulario");
  const bytes = await leerCuerpoLimitado(req, MAX_CV_BYTES + 64 * 1024);
  let form: FormData;
  try { form = await new Request(req.url, { method: "POST", headers: req.headers, body: new Uint8Array(bytes) }).formData(); }
  catch { throw new ErrorPostulacion(422, "formulario_invalido", "No se pudo leer el formulario"); }
  const archivo = form.get("archivo");
  const version = z.coerce.number().int().positive().parse(form.get("version"));
  if (!(archivo instanceof File)) throw new ErrorPostulacion(422, "sin_archivo", "Selecciona un PDF");
  const postulacion = await adjuntarCv(s.organizationId, id, version, Buffer.from(await archivo.arrayBuffer()), archivo.type, archivo.name);
  return Response.json({ postulacion }, { headers: privado });
});
export const descargar = rutaPostulaciones(async (s, _req: Request, ctx: Contexto) => {
  const { bytes, nombre } = await descargarCv(s.organizationId, await idDe(ctx));
  return new Response(new Uint8Array(bytes), { headers: { ...privado, "Content-Type": "application/pdf", "Content-Length": String(bytes.length),
    "Content-Disposition": `attachment; filename="curriculum.pdf"; filename*=UTF-8''${encodeURIComponent(nombre).replace(/'/g, "%27")}`,
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" } });
});
