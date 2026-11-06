# Ingesta del piloto de reclutamiento

Ciclo completo: nuevo contrato consumido por n8n; sin migracion. Especificacion anterior a implementar.

Objetivo: un PDF ficticio recibido por el piloto Zernio/n8n crea una sola postulacion con adjunto privado y analisis validado, visible en lista y Pipeline. No modifica workflows existentes ni toma decisiones de seleccion.

## Aceptacion

- Doble bandera RECLUTAMIENTO=on y RECLUTAMIENTO_INGESTA=on; apagada, 404. Clave dedicada al conector, organizacion/cuenta/conversacion fijadas por configuracion del servidor; nunca se elige organizacion desde el cuerpo.
- Solo POST multipart con datos JSON y PDF de hasta 10 MB. No descarga URLs, no expone lectura ni edicion. Rechaza otra cuenta/conversacion y citas ausentes del texto extraido.
- Clave unica por cuenta y mensaje (no por ejecucion ni delivery de webhook). Dos reintentos concurrentes producen una ficha/archivo; mismo mensaje con PDF diferente devuelve conflicto. Repeticion con mismo PDF conserva el primer analisis, etapa y notas, incluso despues de revision humana.
- Archivo y ficha se guardan juntos bajo transaccion/lock de Postgres. Fallo de insercion revierte solo el archivo nuevo; fallo de escritura no deja ficha parcial.
- Siempre etapa Nueva, revision pendiente. El nombre del piloto es una etiqueta sintetica explicita, no inferencia de IA. El analisis conserva incertidumbre y nunca decide contratacion.
- Respuesta minima: id, creada, url_ficha; nunca devuelve CV, texto o analisis al llamador. Errores genericos sin logs de datos personales/secretos.
- Prueba manual integrada y despues un PDF nuevo desde la conversacion de prueba. Reenvio/reintento sin duplicado. El webhook se pausa al terminar.

## Alcance y limites

Piloto de una organizacion, cuenta, conversacion y vacante. Sin OCR, respuestas al candidato, retencion automatica ni ampliacion a CVs reales. Persistencia del resultado aceptado no equivale a cola durable en n8n antes de aceptarlo. Conserva el filtro del piloto y sus validadores. La exposicion externa del endpoint y asignacion de clave a n8n requieren confirmacion al habilitar el acceso.
