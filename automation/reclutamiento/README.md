# Pilotos de reclutamiento

Exportaciones saneadas de los pilotos de n8n comprobados el 6 de noviembre de 2026. No incluyen credenciales, datos fijados, historial, CV, datos de candidatos ni identificadores reales de cuentas, conversaciones o archivos.

- whatsapp-pdf-ia.json: recepcion autenticada, filtro de una conversacion, descarga PDF, extraccion, IA y validacion. Tambien conserva la entrada manual alternativa.
- formulario-pdf-ia.json: carga manual de un PDF ficticio y analisis.
- nodos/: codigo extraido del piloto integrado exportado; es la referencia de la configuracion de esa fecha.
- verificar.mjs: pruebas con texto y bytes sinteticos, sin API ni documentos privados. Ejecutar `node automation/reclutamiento/verificar.mjs` desde la raiz.

## Restaurar en un entorno de prueba

1. Crear un workflow NUEVO, sin publicar. Importar agrega nodos al canvas: evitar duplicar los de una configuracion existente.
2. Sustituir los ids de demostracion 000000000000000000000001 (cuenta), 000000000000000000000002 (conversacion) y 000000000000001 (archivo) de forma consistente en los nodos que los usan. La restriccion de nombre admite solo Curriculum_Vitae_-_Almacenista.pdf; usar un documento sintetico con ese nombre.
3. Asignar ruta nueva al webhook y credenciales exclusivas: Header Auth de recepcion, Header Auth Bearer de Zernio (solo Messages/lectura) y OpenRouter. Revisar cada nodo: n8n puede sugerir una credencial existente automaticamente. Nunca ejecutar sin comprobar la seleccion.
4. Configurar las mismas cabeceras en el webhook del proveedor y limitarlo a la cuenta de prueba. Mantenerlo pausado excepto durante la prueba supervisada.
5. Revisar presupuesto, vigencia de la clave y modelo antes de usar IA. El modelo empleado fue anthropic/claude-haiku-4.5; su disponibilidad no se garantiza por esta exportacion.
6. Probar con una sola conversacion y PDF sintetico. Pausar el webhook al terminar. No conectar estos pilotos a canales de produccion.

Estas plantillas requieren configuracion; los ids ficticios no corresponden a archivos descargables. No son un respaldo de los secretos ni de las bases de datos y no permiten acceder a la instalacion original.

## Limites

La preparacion del texto retira el encabezado de un formato especifico, no anonimiza todos los CVs. Las citas se verifican literalmente pero la interpretacion, resumen y alertas necesitan revision humana. Desconocido es null, no incumplimiento. El score se calcula fuera del modelo y solo con cobertura suficiente; no decide contratacion.

El piloto no tiene HMAC, cola/idempotencia persistentes, retencion documental ni analisis antimalware. Verifica formato y tamano despues de descargar; los PDFs escaneados requieren otra ruta con OCR. Antes de uso real deben completarse esos controles y probar manejo de errores y aislamiento.
