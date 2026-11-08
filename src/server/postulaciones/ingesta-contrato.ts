import { z } from "zod";
import { analisisPostulacionSchema } from "@/lib/postulaciones";
import { ErrorPostulacion } from "./validacion";
const datosMensajeSchema = z.object({
  version: z.literal(1), cuenta_id: z.string().min(1).max(200), conversacion_id: z.string().min(1).max(200),
  mensaje_id: z.string().min(1).max(200), nombre: z.string().trim().min(2).max(120),
});
const referenciaRubrica = z.object({
  codigo: z.string().regex(/^[A-Z0-9-]{2,24}$/),
  version: z.number().int().positive(),
}).strict();
const datosCorreoSchema = z.object({
  version: z.literal(1), canal: z.literal("correo"),
  buzon: z.email().max(254),
  mensaje_id: z.string().trim().min(1).max(998),
  nombre: z.string().trim().min(2).max(120),
});
export const datosIngestaSchema = z.union([
  datosMensajeSchema.extend({
    vacante_indicada: z.literal(false),
  }).strict(),
  datosMensajeSchema.extend({
    vacante_indicada: z.literal(true).optional(),
    rubrica_catalogo: referenciaRubrica.optional(),
    texto_extraido: z.string().min(300).max(60000), analisis: analisisPostulacionSchema,
  }).strict(),
  datosCorreoSchema.extend({ vacante_indicada: z.literal(false) }).strict(),
  datosCorreoSchema.extend({
    vacante_indicada: z.literal(true),
    rubrica_catalogo: referenciaRubrica,
    texto_extraido: z.string().min(300).max(60000), analisis: analisisPostulacionSchema,
  }).strict(),
]);
export type DatosIngesta = z.infer<typeof datosIngestaSchema>;
export type AlcanceIngesta = { org: string; cuenta: string; conversacion: string; vacante: string; buzon?: string };
export function validarAlcanceYCitas(datos: DatosIngesta, alcance: AlcanceIngesta) {
  const autorizado = "buzon" in datos
    ? datos.buzon.toLowerCase() === alcance.buzon?.toLowerCase()
    : datos.cuenta_id === alcance.cuenta && datos.conversacion_id === alcance.conversacion;
  if (!autorizado) throw new ErrorPostulacion(403, "fuera_de_alcance", "Mensaje fuera del piloto autorizado");
  if (datos.vacante_indicada === false) return;
  const normalizar = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();
  const texto = normalizar(datos.texto_extraido);
  if (datos.analisis.criterios.some(c => c.evidencia.some(cita => !texto.includes(normalizar(cita))))) throw new ErrorPostulacion(422, "cita_no_sustentada", "El análisis contiene evidencia ausente del texto extraído");
}
