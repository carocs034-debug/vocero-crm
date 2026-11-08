import { beforeEach, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
const sim = vi.hoisted(() => ({ guardar: vi.fn(), leer: vi.fn(), borrar: vi.fn(), insertar: vi.fn(), ejecutar: vi.fn(), filas: [] as Record<string,unknown>[], commitFalla: false }));
vi.mock("@/lib/storage/medios", () => ({ guardarMedia: sim.guardar, leerMedia: sim.leer, borrarMedia: sim.borrar }));
vi.mock("@/lib/db", async original => ({ ...await original<typeof import("@/lib/db")>(), getDb: () => ({ transaction: async (cb: (t: unknown) => Promise<unknown>) => {
  const resultado = await cb({ execute: sim.ejecutar, insert: () => ({ values: sim.insertar }), select: () => ({ from: () => ({ where: (cond: SQL) => ({ limit: async () => { const {params}=new PgDialect().sqlToQuery(cond); return sim.filas.filter(f=>f.organizationId===params[0] && f.claveExterna===params[1]); } }) }) }) });
  if (sim.commitFalla) throw new Error("Respuesta COMMIT perdida"); return resultado;
} }) }));
import { ingerirPostulacion } from "@/server/postulaciones/ingesta-servicio";
import { datosIngestaSchema } from "@/server/postulaciones/ingesta-contrato";
const alcance = { org: "org_a", cuenta: "cuenta", conversacion: "hilo", vacante: "Almacenista" };
const datos = datosIngestaSchema.parse({ version:1,cuenta_id:"cuenta",conversacion_id:"hilo",mensaje_id:"mensaje",nombre:"Persona sintetica",texto_extraido:"Texto sintetico sin datos reales. ".repeat(20),analisis:{resumen_profesional:"Sin evidencia suficiente",criterios:[],cobertura:0,score:null,requisitos_pendientes:[],alertas_documentales:[]} });
const archivo = { bytes: Buffer.from("%PDF-1.4\n%%EOF"), mime:"application/pdf", nombre:"cv.pdf" };
beforeEach(()=> { vi.clearAllMocks(); sim.filas=[];sim.commitFalla=false;sim.guardar.mockResolvedValue(undefined);sim.insertar.mockResolvedValue(undefined);sim.borrar.mockResolvedValue(undefined); });
it("un fallo de insercion revierte solo el archivo nuevo", async()=> {
  sim.insertar.mockRejectedValue(new Error("FK invalida"));
  await expect(ingerirPostulacion(alcance,datos,archivo)).rejects.toThrow("FK invalida");
  expect(sim.borrar).toHaveBeenCalledWith("org_a",expect.stringMatching(/^ma_/));
});
it("una confirmacion ambigua de COMMIT nunca borra el CV potencialmente vinculado", async()=> {
  sim.commitFalla=true;
  await expect(ingerirPostulacion(alcance,datos,archivo)).rejects.toThrow("COMMIT perdida");
  expect(sim.guardar).toHaveBeenCalledTimes(1);expect(sim.borrar).not.toHaveBeenCalled();
});
it("rechaza otro alcance antes de tocar almacenamiento o SQL", async()=> {
  const ajena = datosIngestaSchema.parse({...datos,conversacion_id:"ajena"});
  await expect(ingerirPostulacion(alcance,ajena,archivo)).rejects.toMatchObject({status:403});
  expect(sim.ejecutar).not.toHaveBeenCalled();expect(sim.guardar).not.toHaveBeenCalled();
});
it("limita correo al buzón autorizado y reutiliza la ficha al repetir", async () => {
  const correo = datosIngestaSchema.parse({
    version: 1, canal: "correo", buzon: "pruebas@example.test", mensaje_id: "<prueba@example.test>",
    nombre: "Persona sintética", vacante_indicada: false,
  });
  await expect(ingerirPostulacion(alcance, correo, archivo)).rejects.toMatchObject({status: 403});
  expect(sim.guardar).not.toHaveBeenCalled();
  const autorizado = {...alcance, buzon: "Pruebas@example.test"};
  const primera = await ingerirPostulacion(autorizado, correo, archivo);
  const fila = sim.insertar.mock.calls[0]?.[0];
  expect(fila).toMatchObject({canal: "correo", etapa: "por_completar", claveExterna: expect.stringMatching(/^ingesta:correo:/)});
  sim.filas = [fila];
  sim.leer.mockResolvedValue(archivo.bytes);
  await expect(ingerirPostulacion(autorizado, correo, archivo)).resolves.toMatchObject({creada: false, id: primera.id});
  expect(sim.guardar).toHaveBeenCalledTimes(1);
});
it("guarda un PDF sin vacante en Por completar y sin análisis de Almacenista", async () => {
  const pendiente = datosIngestaSchema.parse({
    version: 1, cuenta_id: alcance.cuenta, conversacion_id: alcance.conversacion,
    mensaje_id: "cv-sin-vacante", nombre: "Persona sintética", vacante_indicada: false,
  });
  await ingerirPostulacion(alcance, pendiente, archivo);
  expect(sim.insertar).toHaveBeenCalledWith(expect.objectContaining({
    vacante: "Por confirmar", etapa: "por_completar", analisis: null,
  }));
});
it("la insercion fija la organizacion, vacante y etapa pendiente, sin aceptar datos de otro tenant", async()=> {
  const resultado = await ingerirPostulacion(alcance,datos,archivo);
  expect(resultado.creada).toBe(true);
  expect(sim.insertar).toHaveBeenCalledWith(expect.objectContaining({organizationId:"org_a",vacante:"Almacenista",canal:"whatsapp",cvStorageId:expect.stringMatching(/^ma_/)}));
  const locks=sim.ejecutar.mock.calls.map(c=>new PgDialect().sqlToQuery(c[0]));
  expect(locks[1]?.params[0]).toContain("org_a");
});
