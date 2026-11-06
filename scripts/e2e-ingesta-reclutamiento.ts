/** Ensayo real de ingesta en una organizacion sintetica sin membresias. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { getDb, schema, getSql } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { recibirIngesta } from "@/server/postulaciones/ingesta-http";
import { listarPostulaciones, obtenerPostulacion, revisarPostulacion, descargarCv } from "@/server/postulaciones/servicio";

const host = new URL(process.env.APP_BASE_URL ?? "http://invalid").hostname;
if (process.env.POSTULACIONES_SELFTEST !== "1" || !(host.startsWith("dev-") || host === "localhost")) throw new Error("Ensayo exclusivo de desarrollo");
async function main() {
  const run = randomUUID().replaceAll("-", ""), org = `org_ingesta_${run}`, user = `usr_ingesta_${run}`;
  await getDb().insert(schema.organization).values({ id: org, name: "Ensayo sintetico ingesta CRM", metadata: JSON.stringify({ selftest: "ingesta", run }) });
  await getDb().insert(schema.user).values({ id: user, name: "Revisor sintetico sin acceso", email: `${run}@example.invalid` });
  const key = randomUUID()+randomUUID();
  Object.assign(process.env, { RECLUTAMIENTO: "on", RECLUTAMIENTO_INGESTA: "on", RECLUTAMIENTO_INGESTA_KEY: key, RECLUTAMIENTO_INGESTA_ORG: org, RECLUTAMIENTO_INGESTA_CUENTA: "cuenta_demo", RECLUTAMIENTO_INGESTA_CONVERSACION: "hilo_demo", RECLUTAMIENTO_INGESTA_VACANTE: "Almacenista demo" });
  // Este secreto existe solo en el proceso del ensayo, no en el servidor web.
  const contenido = "%PDF-1.4\n% Documento sintetico para validar transporte privado\n%%EOF";
  const datos = { version: 1, cuenta_id: "cuenta_demo", conversacion_id: "hilo_demo", mensaje_id: run, nombre: "Persona sintetica de ingesta", texto_extraido: "Experiencia declarada en almacen. ".repeat(20), analisis: { resumen_profesional: "Experiencia declarada de prueba", criterios: [{ id: "horario", estado: "desconocido", evidencia: [], explicacion: "Falta confirmar" }], cobertura: 0.5, score: null, requisitos_pendientes: ["horario"], alertas_documentales: [] } };
  const request = (pdf = contenido, cambios = {}, clave = key) => {
    const form = new FormData(); form.set("datos", JSON.stringify({ ...datos, ...cambios })); form.set("archivo", new File([pdf], "cv-sintetico.pdf", { type: "application/pdf" }));
    return new Request("http://localhost/api/integraciones/reclutamiento/ingesta", { method: "POST", headers: { "X-Reclutamiento-Key": clave }, body: form });
  };
  assert.equal((await recibirIngesta(request(contenido, {}, "incorrecta"))).status, 401);
  assert.equal((await recibirIngesta(request(contenido, { conversacion_id: "ajena" }))).status, 403);
  const concurrentes = await Promise.all([recibirIngesta(request()), recibirIngesta(request())]);
  assert.deepEqual(concurrentes.map(r => r.status).sort(), [200,201]);
  const respuestas = await Promise.all(concurrentes.map(r => r.json())); assert.equal(respuestas[0].id, respuestas[1].id);
  const id: string = respuestas[0].id;
  assert.equal((await listarPostulaciones(org, { q: "", pagina: 1 })).total, 1);
  const ficha = await obtenerPostulacion(org, id); assert.equal(ficha.etapa,"nueva"); assert.equal(ficha.revisionHumana,"pendiente");
  assert.equal((await descargarCv(org,id)).bytes.toString(), contenido);
  await revisarPostulacion({ organizationId: org, userId: user, role: "owner" }, id, { version: ficha.version, etapa: "en_revision", notas: "Revision humana a conservar" });
  assert.equal((await recibirIngesta(request(contenido, { nombre: "Nombre distinto ignorado" }))).status,200);
  const despues = await obtenerPostulacion(org,id); assert.equal(despues.notas,"Revision humana a conservar"); assert.equal(despues.etapa,"en_revision"); assert.equal(despues.nombre,datos.nombre);
  assert.equal((await recibirIngesta(request(contenido+"\n% distinto"))).status,409);
  assert.equal((await recibirIngesta(request("no pdf", { mensaje_id: "invalido" }))).status,422);
  // Fuerza FK invalida despues de escribir el archivo: debe revertir solo ese archivo.
  const sinOrg = `org_inexistente_${run}`;
  process.env.RECLUTAMIENTO_INGESTA_ORG = sinOrg;
  assert.equal((await recibirIngesta(request())).status,500);
  const archivos = await readdir(path.join(getEnv().MEDIA_DIR,sinOrg)).catch(() => []);
  assert.equal(archivos.length,0);
  process.env.RECLUTAMIENTO_INGESTA_ORG = org;
  assert.equal((await listarPostulaciones(org, { q: "", pagina: 1 })).total,1);
  process.env.RECLUTAMIENTO_INGESTA = "";
  assert.equal((await recibirIngesta(request())).status,404);
  console.log("OK INGESTA: auth, scope, multipart real, concurrencia 201/200, PDF privado, revision conservada, conflicto y rollback sin huerfanos. Fixture sin membresias:",org);
}
main().then(() => getSql().end()).catch(async e => { console.error("Ensayo fallo:",e instanceof Error ? e.message : "error"); await getSql().end(); process.exitCode=1; });
