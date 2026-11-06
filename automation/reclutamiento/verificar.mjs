// Pruebas sin red ni CVs: entradas sinteticas para los nodos exportados.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = name => fs.readFileSync(path.join(__dirname, 'nodos', name), 'utf8');
const prep = new Function('$input', read('preparar-ia.js'));
const validator = new Function('$input', '$', read('validar-ia.js'));
const quotes = [
  'Carga y descarga de transporte de consolidado asegurando la integridad del producto.',
  'Recepcion, inspeccion y verificacion de mercancia entrante contra orden de compra y factura.',
  'Clasificacion, etiquetado y ubicacion de productos aplicando metodologia FIFO.',
  'Surtido y preparacion de pedidos para rutas de entrega locales y foraneas.',
];
const text = 'Nombre: Persona sintetica\nEdad: 99\nPERFIL PROFESIONAL\nExperiencia declarada para pruebas de validacion, sin referencias a una persona real.\nEXPERIENCIA\n' + quotes.join('\n');
const source = prep({ all: () => [{ json: { estado: 'texto_extraido_para_revision', texto_cv: text } }] })[0].json;
assert(!source.texto_analisis.includes('Edad:'));
const result = {
  resumen_profesional: 'Texto sintetico para probar el validador, sin modelo ni red.',
  criterios: source.rubrica.map(r => ({ id: r.id, estado: 'desconocido', cumplimiento: null, evidencia: [], explicacion: 'Falta confirmacion' })),
  alertas_documentales: [], preguntas_aclaratorias: [],
};
result.criterios[0] = { ...result.criterios[0], estado: 'cumple', cumplimiento: 1, evidencia: [quotes[0]] };
result.criterios[1] = { ...result.criterios[1], estado: 'cumple', cumplimiento: 1, evidencia: quotes.slice(1) };
const run = (r, fence = false) => validator({ first: () => ({ json: { text: fence ? '```json\n' + JSON.stringify(r) + '\n```' : JSON.stringify(r) } }) }, () => ({ first: () => ({ json: source }) }))[0].json;
const good = run(result, true);
const adaptar = new Function('$input', '$', read('preparar-ingesta.js'));
const nodoOrigen = { cuenta_id: 'cuenta_demo', conversacion_id: 'hilo_demo', mensaje_id: 'mensaje_demo' };
const binarioDemo = { data: { mimeType: 'application/pdf', fileName: 'cv-demo.pdf' } };
const nodosDemo = { 'Preparar descarga PDF de prueba': { json: nodoOrigen }, 'Preparar CV y rubrica': { json: source }, 'Validar contenido PDF descargado': { binary: binarioDemo } };
const adaptado = adaptar({ first: () => ({ json: good }) }, nombre => ({ first: () => nodosDemo[nombre] }))[0];
const datosAdaptados = JSON.parse(adaptado.json.datos);
assert.equal(datosAdaptados.mensaje_id, 'mensaje_demo');
assert.equal(datosAdaptados.analisis.score, null);
assert(!Object.hasOwn(datosAdaptados.analisis.criterios[0], 'peso'));
assert.equal(adaptado.binary.data, binarioDemo.data);
const plantillaCrm = JSON.parse(fs.readFileSync(path.join(__dirname, 'whatsapp-crm-ingesta.json'), 'utf8'));
assert.equal(plantillaCrm.active, false);
assert.equal(Object.keys(plantillaCrm.pinData ?? {}).length, 0);
assert(plantillaCrm.nodes.every(n => !n.credentials));
assert.equal(plantillaCrm.nodes.filter(n => n.type !== 'n8n-nodes-base.stickyNote').length, 16);
assert(plantillaCrm.nodes.filter(n => n.type !== 'n8n-nodes-base.stickyNote').every(n => n.notes && n.notesInFlow));
assert.equal(good.cobertura, 0.5);
assert.equal(good.score, null);
assert.equal(good.estado, 'completar_datos');
assert.equal(good.decision_humana, 'pendiente');
const badQuote = structuredClone(result);
badQuote.criterios[0].evidencia = ['Una funcion inventada que no aparece en el texto'];
assert.throws(() => run(badQuote), /cita/);
const stitched = structuredClone(result);
stitched.criterios[1].evidencia = [quotes[3] + ' ' + quotes[1]];
assert.throws(() => run(stitched), /cita/);
const duplicate = structuredClone(result);
duplicate.criterios[1].id = duplicate.criterios[0].id;
assert.throws(() => run(duplicate), /repetido/);
const wrongUnknown = structuredClone(result);
wrongUnknown.criterios[2].cumplimiento = 0;
assert.throws(() => run(wrongUnknown), /Desconocido/);
const wrongWeight = structuredClone(result);
wrongWeight.criterios[0].peso = 1;
assert.equal(run(wrongWeight).criterios[0].peso, 0.3);

const download = new Function('$input', read('preparar-descarga.js'));
const fixture = { estado: 'adjunto_detectado_pendiente_descarga', cuenta_id: '000000000000000000000001', conversacion_id: '000000000000000000000002', adjuntos: [{ tipo: 'file', nombre: 'Curriculum_Vitae_-_Almacenista.pdf', url: 'https://zernio.com/api/v1/whatsapp/media/000000000000001?accountId=000000000000000000000001' }] };
const prepare = x => download({ all: () => [{ json: x }] });
assert.equal(prepare(fixture).length, 1);
const otherHost = structuredClone(fixture);
otherHost.adjuntos[0].url = 'https://example.invalid/archivo.pdf';
assert.throws(() => prepare(otherHost), /Origen|origen/);
const otherConversation = structuredClone(fixture);
otherConversation.conversacion_id = 'otra';
assert.throws(() => prepare(otherConversation), /alcance/);

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const pdf = new AsyncFunction('$input', read('validar-pdf.js'));
const binary = { all: () => [{ binary: { data: {} } }] };
const checkPdf = bytes => pdf.call({ helpers: { getBinaryDataBuffer: async () => bytes } }, binary);
(async () => {
  await checkPdf(Buffer.from('%PDF-1.4\nEnvoltorio sintetico, no documento real.\n%%EOF'));
  await assert.rejects(() => checkPdf(Buffer.from('no es PDF')), /PDF/);
  await assert.rejects(() => checkPdf(Buffer.from('%PDF-1.4\ntruncado')), /incompleto/);
  await assert.rejects(() => checkPdf(Buffer.alloc(10 * 1024 * 1024 + 1)), /10 MB/);
  for (const name of ['whatsapp-pdf-ia.json', 'formulario-pdf-ia.json']) {
    const wf = JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
    assert.equal(wf.active, false);
    assert(!wf.pinData && !wf.meta && !wf.id);
    assert(wf.nodes.every(n => !n.credentials));
  }
  console.log('OK: citas, cobertura, desconocidos, pesos, alcance de descarga, PDF y exportaciones saneadas. Sin red ni datos personales.');
})().catch(e => { console.error(e); process.exitCode = 1; });
