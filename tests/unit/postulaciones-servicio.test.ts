import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
const mocks = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], updateRows: [] as Record<string, unknown>[], guardar: vi.fn(), leer: vi.fn(), borrar: vi.fn(), insert: vi.fn() }));
vi.mock("@/lib/storage/medios", () => ({ guardarMedia: mocks.guardar, leerMedia: mocks.leer, borrarMedia: mocks.borrar }));
vi.mock("@/lib/db", async importOriginal => {
  const original = await importOriginal<typeof import("@/lib/db")>();
  return { ...original, getDb: () => ({
    select: () => ({ from: () => ({ where: (sql: SQL) => ({ limit: async () => {
      const { params, sql: query } = new PgDialect().sqlToQuery(sql);
      const key = query.includes('"clave_externa"') ? "claveExterna" : "id";
      return mocks.rows.filter(r => r.organizationId === params[0] && r[key] === params[1]);
    } }) }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: async () => mocks.updateRows }) }) }),
    insert: () => ({ values: (v: unknown) => { mocks.insert(v); return { onConflictDoNothing: () => ({ returning: async () => [] }) }; } }),
  }) };
});
import { adjuntarCv, crearPostulacion, descargarCv, fichaDe, obtenerPostulacion, revisarPostulacion } from "@/server/postulaciones/servicio";
import { crearPostulacionSchema } from "@/lib/postulaciones";
import { schema } from "@/lib/db";
const fila = () => ({ id: "post_00000000000000000001", organizationId: "org_a", nombre: "Persona sintética", vacante: "Almacén", correo: null, telefono: null, canal: "manual" as const, etapa: "nueva" as const, notas: "", analisis: null, claveExterna: "evento-1", cvStorageId: "ma_prueba", cvNombre: "prueba.pdf", cvBytes: 40, revisionHumana: "pendiente" as const, revisadaPor: null, revisadaEn: null, version: 1, creadaEn: new Date(), actualizadaEn: new Date() });
beforeEach(() => { vi.clearAllMocks(); mocks.rows = [fila()]; mocks.updateRows = []; mocks.guardar.mockResolvedValue("org_a/archivo"); mocks.borrar.mockResolvedValue(undefined); mocks.leer.mockResolvedValue(Buffer.from("PDF")); });
describe("Persistencia por organizacion", () => {
  it("un id conocido de otra organizacion no permite leer ni descargar", async () => {
    await expect(obtenerPostulacion("org_a", fila().id)).resolves.toMatchObject({ organizationId: "org_a" });
    await expect(descargarCv("org_b", fila().id)).rejects.toMatchObject({ status: 404 });
    expect(mocks.leer).not.toHaveBeenCalled();
    await descargarCv("org_a", fila().id);
    expect(mocks.leer).toHaveBeenCalledWith("org_a", "ma_prueba");
    const dto = fichaDe(fila() as typeof schema.postulacion.$inferSelect);
    expect(dto).not.toHaveProperty("cvStorageId"); expect(dto).not.toHaveProperty("organizationId");
  });
  it("no escribe un CV fuera del scope ni reemplaza el existente", async () => {
    await expect(adjuntarCv("org_b", fila().id, 1, Buffer.from("PDF"), "application/pdf", "cv.pdf")).rejects.toMatchObject({ status: 404 });
    await expect(adjuntarCv("org_a", fila().id, 1, Buffer.from("PDF"), "application/pdf", "cv.pdf")).rejects.toMatchObject({ status: 409 });
    expect(mocks.guardar).not.toHaveBeenCalled();
  });
  it("rechaza revision concurrente y revierte solo el archivo nuevo si pierde la carrera", async () => {
    await expect(revisarPostulacion({ organizationId: "org_a", userId: "usuario", role: "owner" }, fila().id, { version: 1, etapa: "en_revision", notas: "" })).rejects.toMatchObject({ status: 409 });
    mocks.rows = [{ ...fila(), cvStorageId: null }];
    await expect(adjuntarCv("org_a", fila().id, 1, Buffer.from("%PDF-1.4\n%%EOF"), "application/pdf", "cv.pdf")).rejects.toMatchObject({ status: 409 });
    expect(mocks.guardar).toHaveBeenCalledTimes(1);
    expect(mocks.borrar).toHaveBeenCalledWith("org_a", expect.stringMatching(/^ma_/));
    expect(mocks.borrar).not.toHaveBeenCalledWith("org_a", "ma_prueba");
  });
  it("una clave externa repetida recupera la misma ficha sin sobrescribir", async () => {
    const entrada = crearPostulacionSchema.parse({ nombre: "Otro nombre", vacante: "Otra vacante", clave_externa: "evento-1" });
    const r = await crearPostulacion("org_a", entrada);
    expect(r.creada).toBe(false); expect(r.postulacion.nombre).toBe("Persona sintética");
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org_a", claveExterna: "evento-1" }));
    await expect(crearPostulacion("org_b", entrada)).rejects.toMatchObject({ status: 409 });
  });
});
