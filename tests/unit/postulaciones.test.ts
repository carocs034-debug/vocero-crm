import { afterEach, describe, expect, it, vi } from "vitest";
import { appNavGroups } from "@/lib/nav";
import { analisisPostulacionSchema, crearPostulacionSchema, filtroPostulacionesSchema, revisionPostulacionSchema } from "@/lib/postulaciones";
import { reclutamientoEnabled } from "@/server/postulaciones/flag";
import { leerCuerpoLimitado, nombreCvSeguro, validarPdf, MAX_CV_BYTES } from "@/server/postulaciones/validacion";

afterEach(() => vi.unstubAllEnvs());
describe("Postulaciones: entrada y aislamiento de superficie", () => {
  it("no aparece sin la bandera explicita", () => {
    vi.stubEnv("RECLUTAMIENTO", ""); expect(reclutamientoEnabled()).toBe(false);
    expect(appNavGroups({}).flatMap(g => g.items).some(i => i.href === "/postulaciones")).toBe(false);
    vi.stubEnv("RECLUTAMIENTO", "on"); expect(reclutamientoEnabled()).toBe(true);
    expect(appNavGroups({ reclutamiento: true }).flatMap(g => g.items).some(i => i.href === "/postulaciones")).toBe(true);
  });
  it("valida campos y no acepta organizacion ni etapas impuestas al crear", () => {
    expect(crearPostulacionSchema.parse({ nombre: "Persona sintética", vacante: "Almacén" }).canal).toBe("manual");
    expect(crearPostulacionSchema.safeParse({ nombre: "Persona", vacante: "Almacén", organizationId: "otro" }).success).toBe(false);
    expect(crearPostulacionSchema.safeParse({ nombre: "Persona", vacante: "Almacén", etapa: "cerrada" }).success).toBe(false);
    expect(crearPostulacionSchema.safeParse({ nombre: "Persona", vacante: "Almacén", correo: "invalido" }).success).toBe(false);
    expect(filtroPostulacionesSchema.safeParse({ pagina: -1 }).success).toBe(false);
    expect(revisionPostulacionSchema.safeParse({ version: 1, etapa: "rechazo_automatico", notas: "" }).success).toBe(false);
  });
  it("no admite calificacion con cobertura insuficiente ni falsos desconocidos con citas", () => {
    const base = { resumen_profesional: "Experiencia declarada", criterios: [], cobertura: 0.5, score: null, requisitos_pendientes: ["horario"], alertas_documentales: [] };
    expect(analisisPostulacionSchema.safeParse(base).success).toBe(true);
    expect(analisisPostulacionSchema.safeParse({ ...base, score: 9 }).success).toBe(false);
    expect(analisisPostulacionSchema.safeParse({ ...base, criterios: [{ id: "horario", estado: "desconocido", evidencia: ["cita"], explicacion: "" }] }).success).toBe(false);
  });
});
describe("CV privado", () => {
  it("exige un envoltorio PDF y limita bytes sin prometer analisis antimalware", () => {
    expect(() => validarPdf(Buffer.from("%PDF-1.4\nDocumento sintetico\n%%EOF"), "application/pdf")).not.toThrow();
    expect(() => validarPdf(Buffer.from("<html>"), "application/pdf")).toThrow();
    expect(() => validarPdf(Buffer.from("%PDF-1.4\nincompleto"), "application/pdf")).toThrow();
    expect(() => validarPdf(Buffer.alloc(MAX_CV_BYTES + 1), "application/pdf")).toThrow();
    expect(nombreCvSeguro('../candidato\r\n".pdf')).not.toMatch(/[\r\n"/]/);
  });
  it("acota cuerpos sin content-length antes de parsear multipart", async () => {
    let cancelado = false;
    const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(100)); }, cancel() { cancelado = true; } });
    const req = new Request("http://localhost/", { method: "POST", body, duplex: "half" } as RequestInit);
    await expect(leerCuerpoLimitado(req, 50)).rejects.toMatchObject({ status: 413 });
    expect(cancelado).toBe(true);
  });
});
