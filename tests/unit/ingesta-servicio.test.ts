import { beforeEach, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
const sim = vi.hoisted(() => ({ guardar: vi.fn(), leer: vi.fn(), borrar: vi.fn(), insertar: vi.fn(), actualizar: vi.fn(), ejecutar: vi.fn(), filas: [] as Record<string,unknown>[], puestos: [] as Record<string,unknown>[], commitFalla: false }));
vi.mock("@/lib/storage/medios", () => ({ guardarMedia: sim.guardar, leerMedia: sim.leer, borrarMedia: sim.borrar }));
vi.mock("@/lib/db", async original => ({ ...await original<typeof import("@/lib/db")>(), getDb: () => ({ transaction: async (cb: (t: unknown) => Promise<unknown>) => {
  const resultado = await cb({
    execute: sim.ejecutar,
    insert: () => ({ values: sim.insertar }),
    update: () => ({ set: (valores: unknown) => ({ where: (cond: SQL) => sim.actualizar(valores, new PgDialect().sqlToQuery(cond).params) }) }),
    select: (campos?: unknown) => ({ from: () => ({ where: (cond: SQL) => {
      const { sql, params } = new PgDialect().sqlToQuery(cond);
      if (campos) return Promise.resolve(sim.puestos.filter(v =>
        v.organizationId === params[0] && v.activa === params[1] && params.slice(2).includes(v.codigo))
        .map(({codigo, nombre}) => ({codigo, nombre})));
      return { limit: async () => sql.includes('"clave_externa"')
        ? sim.filas.filter(f => f.organizationId === params[0] && f.claveExterna === params[1])
        : sim.puestos.filter(v => v.organizationId === params[0] && v.codigo === params[1] && v.activa === params[2]) };
    } }) }),
  });
  if (sim.commitFalla) throw new Error("Respuesta COMMIT perdida"); return resultado;
} }) }));
import { ingerirPostulacion } from "@/server/postulaciones/ingesta-servicio";
import { datosIngestaSchema } from "@/server/postulaciones/ingesta-contrato";
const alcance = { org: "org_a", cuenta: "cuenta", conversacion: "hilo", vacante: "Almacenista" };
const datos = datosIngestaSchema.parse({ version:1,cuenta_id:"cuenta",conversacion_id:"hilo",mensaje_id:"mensaje",nombre:"Persona sintetica",texto_extraido:"Texto sintetico sin datos reales. ".repeat(20),analisis:{resumen_profesional:"Sin evidencia suficiente",criterios:[],cobertura:0,score:null,requisitos_pendientes:[],alertas_documentales:[]} });
const archivo = { bytes: Buffer.from("%PDF-1.4\n%%EOF"), mime:"application/pdf", nombre:"cv.pdf" };
it.each(["falta_cv", "varios_adjuntos"])("registra %s sin almacenar ni duplicar un archivo", async motivo => {
  const buzon = "pruebas@example.test";
  const entrada = datosIngestaSchema.parse({version: 1, canal: "correo", buzon, mensaje_id: "prueba",
    nombre: "Persona sintética", vacante_indicada: false, fallo_procesamiento: motivo});
  const primera = await ingerirPostulacion({...alcance, buzon}, entrada);
  expect(sim.insertar.mock.calls[0]?.[0]).toMatchObject({
    etapa: "por_completar", analisis: {fallo_procesamiento: motivo},
  });
  sim.filas = [sim.insertar.mock.calls[0]?.[0]];
  await expect(ingerirPostulacion({...alcance, buzon}, entrada)).resolves.toMatchObject({creada: false, id: primera.id});
  expect(sim.insertar).toHaveBeenCalledTimes(1);
  expect(sim.guardar).not.toHaveBeenCalled();
});
beforeEach(()=> { vi.clearAllMocks(); sim.filas=[];sim.puestos=[];sim.commitFalla=false;sim.guardar.mockResolvedValue(undefined);sim.insertar.mockResolvedValue(undefined);sim.borrar.mockResolvedValue(undefined); });
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
it("recupera una ficha tras un fallo de IA y guarda sugerencias vigentes sustentadas", async () => {
  const buzon = "pruebas@example.test";
  const autorizado = {...alcance, buzon};
  const base = {version: 1, canal: "correo", buzon, mensaje_id: "perfil-por-confirmar",
    nombre: "Persona sintética", vacante_indicada: false};
  const fallo = datosIngestaSchema.parse({...base, fallo_procesamiento: "analisis_ia"});
  const primera = await ingerirPostulacion(autorizado, fallo, archivo);
  expect(sim.insertar.mock.calls[0]?.[0].analisis).toMatchObject({fallo_procesamiento: "analisis_ia"});
  sim.filas = [{...sim.insertar.mock.calls[0]?.[0], cvStorageId: "ma_1", revisionHumana: "pendiente", version: 1}];
  sim.leer.mockResolvedValue(archivo.bytes);
  await expect(ingerirPostulacion(autorizado, fallo, archivo)).resolves.toMatchObject({creada: false, id: primera.id});
  expect(sim.actualizar).not.toHaveBeenCalled();
  const evidencia = "Preparé pedidos e hice inventarios semanales.";
  sim.puestos = [
    {organizationId: alcance.org, codigo: "ALM", nombre: "Almacén", activa: true},
    {organizationId: alcance.org, codigo: "BAJA", nombre: "Cerrada", activa: false},
    {organizationId: alcance.org, codigo: "CAJA", nombre: "Caja", activa: true},
  ];
  const perfil = {resumen_profesional: "Experiencia declarada en inventarios.",
    texto_extraido: evidencia.repeat(10), sugerencias: [
      {codigo: "ALM", evidencia}, {codigo: "BAJA", evidencia},
      {codigo: "CAJA", evidencia: "Atendí clientes en ventanilla."},
    ]};
  await expect(ingerirPostulacion(autorizado, datosIngestaSchema.parse({...base, perfil}), archivo))
    .resolves.toMatchObject({creada: false, id: primera.id});
  expect(sim.actualizar).toHaveBeenCalledWith(expect.objectContaining({
    etapa: "por_completar", vacante: "Por confirmar", analisis: expect.objectContaining({
      resumen_profesional: perfil.resumen_profesional, score: null,
      vacantes_sugeridas: [{codigo: "ALM", nombre: "Almacén", evidencia}],
    }),
  }), [alcance.org, primera.id, 1]);
  expect(sim.actualizar.mock.calls[0]?.[0].analisis).not.toHaveProperty("fallo_procesamiento");
  expect(sim.guardar).toHaveBeenCalledTimes(1);
});
it.each([
  ["image/png", "png", "89504e470d0a1a0a"],
  ["image/jpeg", "jpg", "ffd8ffe00010"],
])("conserva el adjunto %s al recibirlo por correo", async (mime, extension, firma) => {
  const buzon = "pruebas@example.test";
  const correo = datosIngestaSchema.parse({
    version: 1, canal: "correo", buzon, mensaje_id: "<imagen@example.test>",
    nombre: "Persona sintética", vacante_indicada: false,
  });
  const bytes = Buffer.from(firma, "hex");
  const imagen = { bytes, mime, nombre: "CV.txt" };
  await expect(ingerirPostulacion(alcance, datos, imagen)).rejects.toMatchObject({code: "pdf_invalido"});
  await expect(ingerirPostulacion({...alcance, buzon}, correo, {...imagen, bytes: Buffer.from("<html>")}))
    .rejects.toMatchObject({code: "imagen_invalida"});
  await ingerirPostulacion({...alcance, buzon}, correo, imagen);
  expect(sim.guardar).toHaveBeenCalledWith(alcance.org, expect.any(String), bytes, mime);
  expect(sim.insertar).toHaveBeenCalledWith(expect.objectContaining({cvNombre: `CV.txt.${extension}`, etapa: "por_completar"}));
});
it.each(["pendiente", "revisada"])("reprocesa el mismo correo con ficha %s", async revisionHumana => {
  const base = {version: 1, canal: "correo", buzon: "pruebas@example.test",
    mensaje_id: "<prueba@example.test>", nombre: "Persona sintética"};
  const autorizado = {...alcance, buzon: base.buzon};
  const primera = await ingerirPostulacion(autorizado, datosIngestaSchema.parse({...base, vacante_indicada: false}), archivo);
  const fila = {...sim.insertar.mock.calls[0]?.[0], revisionHumana, version: 1};
  sim.filas = [fila];
  sim.puestos = [{organizationId: alcance.org, codigo: "ALM", nombre: "Auxiliar", activa: true, rubricas: [[{id: "inventario"}]]}];
  sim.leer.mockResolvedValue(archivo.bytes);
  const referencia = {codigo: "ALM", version: 1};
  const analisis = {resumen_profesional: "Por validar", criterios: [{id: "inventario", estado: "desconocido", evidencia: [], explicacion: ""}],
    cobertura: 0, score: null, requisitos_pendientes: [], alertas_documentales: []};
  const confirmado = datosIngestaSchema.parse({...base, vacante_indicada: true, rubrica_catalogo: referencia,
    texto_extraido: "Texto del CV sintético. ".repeat(20), analisis});
  await expect(ingerirPostulacion(autorizado, confirmado, archivo)).resolves.toMatchObject({creada: false, id: primera.id});
  if (revisionHumana === "pendiente") {
    expect(sim.actualizar).toHaveBeenCalledWith(expect.objectContaining({
      vacante: "Auxiliar", etapa: "nueva", analisis: {...analisis, rubrica_catalogo: referencia},
    }), [alcance.org, primera.id, 1]);
  } else {
    expect(sim.actualizar).not.toHaveBeenCalled();
  }
  expect(sim.guardar).toHaveBeenCalledTimes(1);
  expect(sim.insertar).toHaveBeenCalledTimes(1);
});
it("la insercion fija la organizacion, vacante y etapa pendiente, sin aceptar datos de otro tenant", async()=> {
  const resultado = await ingerirPostulacion(alcance,datos,archivo);
  expect(resultado.creada).toBe(true);
  expect(sim.insertar).toHaveBeenCalledWith(expect.objectContaining({organizationId:"org_a",vacante:"Almacenista",canal:"whatsapp",cvStorageId:expect.stringMatching(/^ma_/)}));
  const locks=sim.ejecutar.mock.calls.map(c=>new PgDialect().sqlToQuery(c[0]));
  expect(locks[1]?.params[0]).toContain("org_a");
});
