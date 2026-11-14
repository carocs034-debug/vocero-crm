# Pruebas de CV por correo

Usar el CRM de desarrollo, un buzón de prueba habilitado mediante `RECLUTAMIENTO_INGESTA_BUZON` y CV ficticios. Ejecutar n8n manualmente con un solo mensaje seleccionado de **Prueba n8n**. Mantener el flujo sin publicar.

## Resultados comprobados el 8 de noviembre de 2026

| Caso | Resultado observado |
| --- | --- |
| Código de vacante activa en el asunto | El CRM mostró la vacante, origen **Correo**, evaluación, cobertura y versión de la rúbrica. |
| Repetición del mismo mensaje y PDF | El CRM devolvió el mismo ID sin crear otra ficha. |
| Descarga desde la ficha de Valeria | El archivo descargado coincidió byte por byte con el original. |
| Correo sin código ni puesto identificable | Quedó en **Por completar** con el PDF, origen **Correo** y sin calificación. |
| Correo sin asunto con el nombre abreviado del puesto en el cuerpo | El borrador identificó `EJEC-ATEN-CLI`. El reintento devolvió la ficha creada inicialmente en **Por completar** y su análisis siguió vacío. La actualización de la ficha sigue pendiente. |

## Pruebas pendientes y criterios de aceptación

| Caso | Resultado esperado |
| --- | --- |
| Reprocesar la ficha pendiente del correo sin asunto | Mismo ID y mismo PDF. La ficha guarda la vacante, la rúbrica y su versión, evidencia y cobertura, y pasa a **Nueva** si sigue pendiente de evaluación. Conserva las notas y las decisiones de revisión ya guardadas. Un reintento posterior no duplica ni reemplaza el resultado. |
| PDF legible sin puesto, con encaje claro para una sola vacante vigente | La ficha guarda el resumen y muestra **Vacante sugerida**, puntaje orientativo, cobertura y razones verificables. Al confirmar el puesto, se actualiza la misma ficha. |
| Varias vacantes plausibles o evidencia insuficiente | La ficha queda en **Por completar** con resumen y opciones pertinentes. La vacante sigue por confirmar. |
| PDF escaneado sin texto extraíble | El adjunto original queda disponible en **Por completar** y se indica que requiere lectura. Al añadir lectura de imágenes, repetir con un PDF escaneado y con fotos o capturas ficticias. |
| Falla el análisis o se interrumpe el guardado | Con recepción continua implementada, el CV queda registrado antes del análisis. Si falla el guardado, el reintento recupera el mensaje o el equipo recibe un aviso para intervenir. |
| Buzón distinto o deshabilitado | La ingesta responde 403 y no guarda el PDF. |
