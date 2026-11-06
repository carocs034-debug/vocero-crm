import { z } from "zod";

export const ETAPAS_POSTULACION = ["nueva", "por_completar", "en_revision", "entrevista", "cerrada"] as const;
export type EtapaPostulacion = typeof ETAPAS_POSTULACION[number];
export const ETIQUETAS_ETAPA: Record<EtapaPostulacion, string> = {
  nueva: "Nueva", por_completar: "Por completar", en_revision: "En revisión", entrevista: "Entrevista", cerrada: "Cerrada",
};
export const CANALES_POSTULACION = ["manual", "whatsapp", "messenger", "instagram", "correo"] as const;
export const analisisPostulacionSchema = z.object({
  resumen_profesional: z.string().trim().min(1).max(6000),
  criterios: z.array(z.object({
    id: z.string().trim().min(1).max(80),
    estado: z.enum(["cumple", "parcial", "no_cumple", "desconocido"]),
    evidencia: z.array(z.string().trim().min(1).max(350)).max(4),
    explicacion: z.string().max(1500),
  }).strict()).max(30),
  cobertura: z.number().min(0).max(1),
  score: z.number().min(1).max(10).nullable(),
  requisitos_pendientes: z.array(z.string().max(300)).max(30),
  alertas_documentales: z.array(z.string().max(1500)).max(20),
}).strict().superRefine((value, ctx) => {
  const ids = new Set<string>();
  for (const c of value.criterios) {
    if (ids.has(c.id)) ctx.addIssue({ code: "custom", message: "Criterio repetido" });
    ids.add(c.id);
    if ((c.estado === "desconocido") !== (c.evidencia.length === 0)) {
      ctx.addIssue({ code: "custom", message: "Desconocidos sin citas; criterios conocidos con evidencia" });
    }
  }
  if (value.cobertura < 0.7 && value.score !== null) ctx.addIssue({ code: "custom", message: "Cobertura insuficiente para una calificación" });
});
export type AnalisisPostulacion = z.infer<typeof analisisPostulacionSchema>;
const opcional = (max: number) => z.string().trim().max(max).optional().transform(v => v || null);
export const crearPostulacionSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre").max(120),
  vacante: z.string().trim().min(2, "Escribe la vacante").max(120),
  correo: z.union([z.email().max(254), z.literal("")]).optional().transform(v => v || null),
  telefono: opcional(40),
  canal: z.enum(CANALES_POSTULACION).default("manual"),
  clave_externa: opcional(200),
  analisis: analisisPostulacionSchema.nullable().optional(),
}).strict();
export const revisionPostulacionSchema = z.object({
  version: z.number().int().positive(), etapa: z.enum(ETAPAS_POSTULACION), notas: z.string().trim().max(6000),
}).strict();
export const filtroPostulacionesSchema = z.object({
  q: z.string().trim().max(120).default(""),
  etapa: z.enum(ETAPAS_POSTULACION).optional(),
  pagina: z.coerce.number().int().min(1).max(10000).default(1),
});
export type PostulacionFicha = {
  id: string; nombre: string; vacante: string; correo: string | null; telefono: string | null;
  canal: typeof CANALES_POSTULACION[number]; etapa: EtapaPostulacion; notas: string;
  analisis: AnalisisPostulacion | null; revisionHumana: "pendiente" | "revisada";
  revisadaEn: string | null; creadaEn: string; actualizadaEn: string; version: number;
  cv: { nombre: string; bytes: number; url: string } | null;
};
