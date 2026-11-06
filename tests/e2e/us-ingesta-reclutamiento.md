# Ingesta CRM desde n8n

## Servicio real, sin abrir acceso externo

Compilar scripts/e2e-ingesta-reclutamiento.ts con esbuild (plataforma node, formato ESM, alias @=./src, banner createRequire del migrador). Ejecutar dentro del contenedor de desarrollo con POSTULACIONES_SELFTEST=1 y usuario vocero. El host debe ser dev-* o localhost. Las banderas y clave sintetica solo cambian en ese proceso; no habilitan el endpoint del servidor web.

El ensayo crea una organizacion sin membresias y un usuario sin cuenta/password. Comprueba multipart, 401/403, dos solicitudes simultaneas -> 201/200 mismo id, una ficha, PDF descargado identico, etapa Nueva, revision pendiente, reintento conservando nombre/etapa/notas humanas, PDF distinto -> 409, PDF invalido -> 422 y FK invalida -> 500 con archivo nuevo eliminado. Conserva fixtures de inspeccion. No usa IA, Zernio ni credenciales de canal.

## Recorrido supervisado completo

1. Confirmar habilitacion de una ruta HTTPS exacta con clave dedicada de escritura y alcance fijado en servidor. Mantener BasicAuth/login para el resto.
2. Usuario ingresa la clave en una credencial Header Auth nueva de n8n: nombre de cabecera X-Reclutamiento-Key. No enviarla al chat ni incluirla en JSON de workflow.
3. Elegir esa credencial en Guardar postulacion en CRM dev de la copia del piloto. Confirmar URL dev, dos campos multipart, timeout/reintentos y sin redirecciones.
4. Ejecutar la referencia manual: PDF -> texto -> IA -> validador -> preparar ingesta -> guardar. Debe responder 201. Reintentar guardado: 200 y mismo id.
5. Abrir Postulaciones y Pipeline con la cuenta del usuario: una ficha Nueva, PDF descargable, resumen/citas/pendientes, revision pendiente. Cambiar etapa y nota; reintentar evento no las sobrescribe.
6. Activar escucha TEST de la copia y cambiar temporalmente destino del webhook de prueba de Zernio. Usuario envia PDF ficticio nuevo desde el hilo autorizado. Verificar ejecucion y ficha, sin mensajes salientes.
7. Pausar webhook Zernio, terminar escucha y mantener workflow sin publicar. Registrar resultados y limitaciones reales; no declarar aprobado un paso pendiente.

## Documentacion en canvas

16 nodos operativos tienen notes y notesInFlow=true. Tres notas generales describen recepcion, PDF/IA y guardado. Se verifico su persistencia recargando n8n. Los workflows anteriores se conservaron.
