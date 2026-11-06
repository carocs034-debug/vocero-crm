// Adaptador del piloto integrado: no contiene claves ni ids privados.
const analisis = $input.first().json;
const origen = $('Preparar descarga PDF de prueba').first().json;
const preparado = $('Preparar CV y rubrica').first().json;
const pdf = $('Validar contenido PDF descargado').first();
if (!analisis.prueba || analisis.decision_humana !== 'pendiente' || !pdf.binary?.data) throw new Error('Solo resultado validado del piloto con PDF');
if (!origen.mensaje_id || !origen.cuenta_id || !origen.conversacion_id) throw new Error('Falta identidad estable del mensaje');
const datos = {
  version: 1, cuenta_id: origen.cuenta_id, conversacion_id: origen.conversacion_id, mensaje_id: String(origen.mensaje_id),
  nombre: 'Candidato ficticio - prueba WhatsApp', texto_extraido: preparado.texto_analisis,
  analisis: { resumen_profesional: analisis.resumen_profesional,
    criterios: analisis.criterios.map(c => ({ id: c.id, estado: c.estado, evidencia: c.evidencia, explicacion: c.explicacion })),
    cobertura: analisis.cobertura, score: analisis.score, requisitos_pendientes: analisis.requisitos_pendientes, alertas_documentales: analisis.alertas_documentales },
};
return [{ json: { datos: JSON.stringify(datos) }, binary: { data: pdf.binary.data } }];
