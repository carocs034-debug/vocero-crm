/** Integracion real de servicios, solo en desarrollo y sin cuentas de canal. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getDb, schema, getSql } from "@/lib/db";
import { crearPostulacionSchema } from "@/lib/postulaciones";
import { adjuntarCv, crearPostulacion, descargarCv, listarPostulaciones, obtenerPostulacion, revisarPostulacion } from "@/server/postulaciones/servicio";

const host = new URL(process.env.APP_BASE_URL ?? "http://invalid").hostname;
if (process.env.POSTULACIONES_SELFTEST !== "1" || !(host.startsWith("dev-") || host === "localhost")) {
  throw new Error("Self-test exclusivo de una copia dev con POSTULACIONES_SELFTEST=1");
}
function pdfSintetico() {
  const stream = "BT /F1 16 Tf 50 740 Td (CV SINTETICO - SIN DATOS REALES) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((o, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
async function main() {
  const db = getDb(); const run = randomUUID().replaceAll("-", "");
  const orgA = `org_selftest_a_${run}`, orgB = `org_selftest_b_${run}`, user = `selftest_${run}`;
  // Estas fixtures no tienen membresias, passwords ni acceso por login.
  await db.insert(schema.organization).values([orgA, orgB].map((id, i) => ({ id, name: `Prueba sintetica Postulaciones ${i + 1}`, metadata: JSON.stringify({ selftest: "postulaciones", run }) })));
  await db.insert(schema.user).values({ id: user, name: "Revisor sintetico sin acceso", email: `${run}@example.invalid` });
  const entrada = crearPostulacionSchema.parse({ nombre: "Persona sintetica", vacante: "Almacenista demo", clave_externa: run,
    analisis: { resumen_profesional: "Experiencia declarada de prueba. Confirmar disponibilidad.", criterios: [{ id: "horario", estado: "desconocido", evidencia: [], explicacion: "Falta confirmacion" }], cobertura: 0.5, score: null, requisitos_pendientes: ["horario"], alertas_documentales: [] } });
  const creada = await crearPostulacion(orgA, entrada);
  assert(creada.creada);
  assert.equal((await crearPostulacion(orgA, entrada)).postulacion.id, creada.postulacion.id);
  assert.equal((await listarPostulaciones(orgA, { q: "Almacenista", pagina: 1 })).total, 1);
  assert.equal((await listarPostulaciones(orgB, { q: "", pagina: 1 })).total, 0);
  await assert.rejects(() => obtenerPostulacion(orgB, creada.postulacion.id), { status: 404 });
  const bytes = pdfSintetico();
  const conCv = await adjuntarCv(orgA, creada.postulacion.id, creada.postulacion.version, bytes, "application/pdf", "cv-sintetico.pdf");
  assert.equal((await descargarCv(orgA, conCv.id)).bytes.compare(bytes), 0);
  await assert.rejects(() => descargarCv(orgB, conCv.id), { status: 404 });
  await assert.rejects(() => adjuntarCv(orgA, conCv.id, conCv.version, bytes, "application/pdf", "otro.pdf"), { status: 409 });
  const revisada = await revisarPostulacion({ organizationId: orgA, userId: user, role: "owner" }, conCv.id, { version: conCv.version, etapa: "por_completar", notas: "Pendiente confirmar horario. Nota sintetica." });
  assert.equal(revisada.revisionHumana, "revisada");
  assert.equal((await obtenerPostulacion(orgA, conCv.id)).notas, revisada.notas);
  await assert.rejects(() => revisarPostulacion({ organizationId: orgA, userId: user, role: "owner" }, conCv.id, { version: conCv.version, etapa: "cerrada", notas: "No debe sobrescribir" }), { status: 409 });
  const invalida = await crearPostulacion(orgA, crearPostulacionSchema.parse({ nombre: "PDF invalido demo", vacante: "Prueba" }));
  await assert.rejects(() => adjuntarCv(orgA, invalida.postulacion.id, 1, Buffer.from("no pdf"), "application/pdf", "falso.pdf"), { status: 422 });
  assert.equal((await obtenerPostulacion(orgA, invalida.postulacion.id)).cvStorageId, null);
  console.log("OK SELFTEST: persistencia, filtros, idempotencia, aislamiento, CV privado, conflicto y revision humana.");
  console.log("Fixtures sinteticas conservadas sin membresias en organizaciones de prueba:", orgA, orgB);
}
main().then(() => getSql().end()).catch(async error => { console.error("Self-test fallo:", error instanceof Error ? error.message : "error"); await getSql().end(); process.exitCode = 1; });
