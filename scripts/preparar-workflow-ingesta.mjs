/** Prepara una copia importable y una plantilla publica saneada, sin tocar n8n por API. */
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) throw new Error("Uso: node scripts/preparar-workflow-ingesta.mjs exportacion.json salida-privada.json");
const flujo = JSON.parse(await readFile(entrada, "utf8"));
const notas = {
  'Zernio - entrada autenticada': 'RECIBE: evento nuevo de Zernio por webhook de prueba. AUTENTICA la cabecera del piloto. No envía respuestas al candidato.',
  'Filtrar conversacion y normalizar': 'FILTRA: solo WhatsApp entrante de la cuenta y conversación autorizadas. ORDENA: mensaje, adjuntos e identificadores. Los demás hilos se omiten.',
  'Confirmar recepcion - sin enviar WhatsApp': 'CONFIRMA HTTP 200 a Zernio para cerrar la recepción. Este 200 no significa que el CV ya esté guardado. Continúa el procesamiento; no manda WhatsApp.',
  'Prueba manual - CV ya recibido': 'INICIA una prueba manual usando la referencia del PDF ficticio ya recibido. Sirve para ensayar sin pedir otro envío por WhatsApp.',
  'Referencia al CV ficticio recibido': 'ENTREGA metadatos del PDF ficticio de referencia: cuenta, conversación, mensaje y adjunto. No contiene el PDF ni una clave de API.',
  'Preparar descarga PDF de prueba': 'VALIDA cuenta, conversación, nombre del documento y origen HTTPS de Zernio. PREPARA una URL de descarga limitada a ese archivo.',
  'Descargar PDF - Zernio solo lectura': 'DESCARGA el PDF de Zernio con credencial de solo lectura. ENTREGA binario data. No sigue redirecciones ni envía mensajes.',
  'Validar contenido PDF descargado': 'VERIFICA bytes reales: no vacío, máximo 10 MB, cabecera PDF y cierre completo. Conserva el binario; no sustituye un análisis antimalware.',
  'Extraer texto desde WhatsApp': 'EXTRAE texto del PDF digital recibido. Un documento escaneado sin texto requiere otra ruta de OCR; este piloto no la incluye.',
  'Resultado de lectura desde WhatsApp': 'COMPRUEBA que haya texto legible y lo entrega para analizar. Si la extracción no sirve, detiene el recorrido para revisión.',
  'Preparar CV y rubrica': 'PREPARA texto y seis criterios de Almacenista. Retira el encabezado de este CV ficticio, fija pesos y solicita citas exactas. No es anonimización universal.',
  'Analizar evidencia con IA': 'CONSULTA la IA para resumir experiencia declarada y encontrar evidencia por criterio. No decide contratación ni calcula el score final.',
  'OpenRouter - configurar credencial': 'PROVEE el modelo de IA a Analizar evidencia. Usa la credencial OpenRouter del piloto. Es una conexión de modelo, no un paso secuencial.',
  'Validar evidencias y calcular score': 'VALIDA JSON, criterios y citas contra el texto. CALCULA cobertura y score fuera de la IA; si falta información devuelve null. Deja la decisión humana pendiente.',
  'Preparar ingesta CRM': 'UNE identidad estable del mensaje, PDF binario y análisis ya validado. Adapta los campos al CRM; no agrega secretos ni decide la etapa.',
  'Guardar postulacion en CRM dev': 'ENVÍA PDF y resultado al CRM de desarrollo con clave dedicada. 201 crea; 200 reutiliza el mismo mensaje. Un error deja el paso fallido para revisar/reintentar.',
};
const preparar = { id: randomUUID(), name: 'Preparar ingesta CRM', type: 'n8n-nodes-base.code', typeVersion: 2, position: [3408,912], parameters: { jsCode: await readFile('automation/reclutamiento/nodos/preparar-ingesta.js','utf8') } };
const guardar = { id: randomUUID(), name: 'Guardar postulacion en CRM dev', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [3664,912], parameters: {
  method: 'POST', url: 'https://dev-crm.talentedmx.com/api/integraciones/reclutamiento/ingesta', authentication: 'none', genericAuthType: 'httpHeaderAuth', sendBody: true, contentType: 'multipart-form-data', bodyParameters: { parameters: [ { name: 'datos', value: '={{ $json.datos }}' }, { parameterType: 'formBinaryData', name: 'archivo', inputDataFieldName: 'data' } ] }, options: { timeout: 30000, redirect: { redirect: { followRedirects: false } } },
}, disabled: true, retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 };
flujo.nodes.push(preparar, guardar, { id: randomUUID(), name: 'Guia de ingesta CRM', type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: [3328,560], parameters: { width: 680, height: 260, content: '## Guardado en Postulaciones · DESARROLLO\n1. Preparar ingesta une PDF, identidad del mensaje y análisis.\n2. Guardar envía al CRM con clave exclusiva (falta seleccionarla).\n3. 201 = ficha nueva; 200 = mismo mensaje, sin duplicar ni sobrescribir revisión.\nSiempre etapa Nueva y revisión humana pendiente.\nSIN PUBLICAR. Solo CV ficticio y conversación autorizada. HTTP 200 de Zernio confirma recepción, no guardado. La puerta de acceso nueva se habilita únicamente tras confirmación.' } });
for (const nodo of flujo.nodes) {
  if (notas[nodo.name]) { nodo.notes = notas[nodo.name]; nodo.notesInFlow = true; }
  if (nodo.type === 'n8n-nodes-base.webhook') { nodo.parameters.path = 'talented-crm-piloto-reclutamiento-v1'; nodo.webhookId = randomUUID(); }
  if (nodo.name === 'Alcance de recepcion') nodo.parameters.content = '## Recepción supervisada de prueba\nZernio → filtro de una conversación → confirmación HTTP.\nLas notas de cada nodo explican entrada, operación y salida.\nSolo CV ficticio. Mantener SIN PUBLICAR. No modificar Nea ni los workflows existentes.';
  if (nodo.name === 'Limites de descarga de prueba') nodo.parameters.content = '## PDF → evidencia → revisión humana\nDescarga solo desde Zernio y valida el envoltorio del PDF. Extrae texto, analiza con OpenRouter y verifica citas.\nSin OCR ni análisis antimalware. Sin mensajes salientes.\nLa salida se prepara para guardarla en el CRM de desarrollo; el guardado requiere clave dedicada y habilitación explícita.';
}
flujo.connections['Validar evidencias y calcular score'] = { main: [[{ node: preparar.name, type: 'main', index: 0 }]] };
flujo.connections[preparar.name] = { main: [[{ node: guardar.name, type: 'main', index: 0 }]] };
const importable = { name: 'Talented - PILOTO CRM - Ingesta Postulaciones', nodes: flujo.nodes, connections: flujo.connections, settings: flujo.settings ?? {}, active: false, pinData: {} };
await writeFile(salida, JSON.stringify(importable, null, 2));
// La plantilla de Git nunca contiene ids de cuentas/hilos/medios ni referencias a credenciales.
const publicable = structuredClone(importable);
for (const n of publicable.nodes) {
  delete n.credentials; delete n.webhookId;
  if (n.type === 'n8n-nodes-base.webhook') n.parameters.path = 'REEMPLAZA_RUTA_WEBHOOK_CRM';
}
let texto = JSON.stringify(publicable, null, 2);
const referencia = flujo.nodes.find(n => n.name === 'Referencia al CV ficticio recibido')?.parameters.jsCode ?? '';
const extraer = campo => new RegExp('"'+campo+'"\\s*:\\s*"([^"]+)"').exec(referencia)?.[1];
const cuenta = extraer('cuenta_id'), hilo = extraer('conversacion_id');
if (!cuenta || !hilo) throw new Error('No se pudo sanear el alcance del piloto');
texto = texto.replaceAll(cuenta,'000000000000000000000001').replaceAll(hilo,'000000000000000000000002').replaceAll(/\/media\/\d+/g,'/media/000000000000001');
await writeFile('automation/reclutamiento/whatsapp-crm-ingesta.json',texto);
console.log('Preparadas copia privada importable y plantilla saneada; nodos:', flujo.nodes.length, 'con explicación:', Object.keys(notas).length);
