import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { datosIngestaSchema, validarAlcanceYCitas } from "@/server/postulaciones/ingesta-contrato";
import { configuracionIngesta, autorizarIngesta } from "@/server/postulaciones/ingesta-auth";
import { resetRateLimit } from "@/lib/rate-limit";
const servicio = vi.hoisted(() => vi.fn());
vi.mock("@/server/postulaciones/ingesta-servicio", () => ({ ingerirPostulacion: servicio }));
import { recibirIngesta } from "@/server/postulaciones/ingesta-http";
const key = "clave-sintetica-de-32-caracteres-o-mas";
const alcance = { org: "org_demo", cuenta: "cuenta_demo", conversacion: "hilo_demo", vacante: "Almacenista demo" };
const datos = () => ({ version: 1, cuenta_id: alcance.cuenta, conversacion_id: alcance.conversacion, mensaje_id: "mensaje_demo", nombre: "Persona sintetica", texto_extraido: "Experiencia en carga. ".repeat(20), analisis: { resumen_profesional: "Experiencia declarada", criterios: [{ id: "carga", estado: "cumple", evidencia: ["Experiencia en carga."], explicacion: "Declarado" }], cobertura: 0.5, score: null, requisitos_pendientes: ["horario"], alertas_documentales: [] } });
beforeEach(() => {
  resetRateLimit(); vi.clearAllMocks();
  Object.entries({ RECLUTAMIENTO: "on", RECLUTAMIENTO_INGESTA: "on", RECLUTAMIENTO_INGESTA_KEY: key, RECLUTAMIENTO_INGESTA_ORG: alcance.org, RECLUTAMIENTO_INGESTA_CUENTA: alcance.cuenta, RECLUTAMIENTO_INGESTA_CONVERSACION: alcance.conversacion, RECLUTAMIENTO_INGESTA_VACANTE: alcance.vacante }).forEach(([k,v]) => vi.stubEnv(k,v));
});
afterEach(() => vi.unstubAllEnvs());
function solicitud(raw: unknown = datos(), extras = false) {
  const form = new FormData(); form.set("datos", JSON.stringify(raw)); form.set("archivo", new File(["%PDF-1.4\n%%EOF"], "cv.pdf", { type: "application/pdf" }));
  if (extras) form.append("archivo", new File(["otro"], "otro.pdf"));
  return new Request("http://localhost/api/integraciones/reclutamiento/ingesta", { method: "POST", headers: { "X-Reclutamiento-Key": key }, body: form });
}
it("requiere doble bandera y todo el alcance; apagado no autentica ni persiste", async () => {
  expect(configuracionIngesta()).toMatchObject(alcance);
  vi.stubEnv("RECLUTAMIENTO", ""); expect((await recibirIngesta(solicitud())).status).toBe(404);
  vi.stubEnv("RECLUTAMIENTO", "on"); vi.stubEnv("RECLUTAMIENTO_INGESTA_ORG", ""); expect(configuracionIngesta()).toBeNull();
  expect(servicio).not.toHaveBeenCalled();
});
it("clave incorrecta no consume presupuesto de la clave correcta", () => {
  const sinKey = new Request("http://localhost");
  for (let i=0;i<25;i++) autorizarIngesta(sinKey, key);
  expect(autorizarIngesta(sinKey,key)?.status).toBe(429);
  expect(autorizarIngesta(new Request("http://localhost", { headers: { "X-Reclutamiento-Key": key } }), key)).toBeNull();
});
it("rechaza otra conversacion, organizacion inyectada, citas inventadas y score sin cobertura", () => {
  const entrada = datosIngestaSchema.parse(datos()); validarAlcanceYCitas(entrada, alcance);
  expect(() => validarAlcanceYCitas({ ...entrada, conversacion_id: "ajena" }, alcance)).toThrow("fuera del piloto");
  expect(() => datosIngestaSchema.parse({ ...datos(), organization_id: "otra" })).toThrow();
  entrada.analisis.criterios[0]!.evidencia = ["Cita que no existe"];
  expect(() => validarAlcanceYCitas(entrada, alcance)).toThrow("evidencia ausente");
  expect(() => datosIngestaSchema.parse({ ...datos(), analisis: { ...datos().analisis, score: 8 } })).toThrow();
});
it("la API no permite acceso sin clave ni campos duplicados", async () => {
  expect((await recibirIngesta(new Request("http://localhost", { method: "POST" }))).status).toBe(401);
  expect((await recibirIngesta(solicitud(datos(), true))).status).toBe(422);
  expect(servicio).not.toHaveBeenCalled();
});
it("la API devuelve solo confirmacion minima y distingue creacion de repeticion", async () => {
  servicio.mockResolvedValue({ creada: true, id: "post_demo", url_ficha: "/postulaciones?id=post_demo" });
  const res = await recibirIngesta(solicitud()); expect(res.status).toBe(201);
  expect(await res.json()).toEqual({ creada: true, id: "post_demo", url_ficha: "/postulaciones?id=post_demo" });
  expect(servicio).toHaveBeenCalledWith(expect.objectContaining(alcance), expect.objectContaining({ mensaje_id: "mensaje_demo" }), expect.objectContaining({ mime: "application/pdf" }));
  servicio.mockResolvedValue({ creada: false, id: "post_demo", url_ficha: "/postulaciones?id=post_demo" });
  expect((await recibirIngesta(solicitud())).status).toBe(200);
});
it("errores de BD no filtran consultas o valores al llamador", async () => {
  servicio.mockRejectedValue(new Error("SQL secreto"));
  const res = await recibirIngesta(solicitud()); expect(res.status).toBe(500); expect(await res.text()).not.toContain("SQL secreto");
});
