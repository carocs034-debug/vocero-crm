# Plan

1. Adaptador inbound dedicado en server/postulaciones/ingesta-*; Zod para datos y validacion existente PDF/cuerpo limitado. Header X-Reclutamiento-Key, comparacion de hashes en tiempo constante, rate limit tras autenticar. No reutilizar BOT_API_KEY ni la sesion del administrador.
2. Configuracion de organizacion, cuenta, conversacion y vacante exclusivamente en servidor. Preservar puerta BasicAuth del resto de desarrollo. Override de proxy separado, sin activar hasta confirmacion, para una unica ruta HTTPS con auth propia.
3. Clave externa SHA256 de cuenta+mensaje; transaccion y advisory lock para serializar cada mensaje. Reutilizar tabla postulacion y almacenamiento privado; no crear leads, usuarios ni permisos.
4. Crear codigo de nodo que combina PDF validado, texto y analisis del piloto. Preparar una copia nueva del workflow, sin publicar; credencial Header Auth dedicada, introducida por el usuario sin pasar por el chat. Exportaciones publicas saneadas.
5. Pruebas de flag/auth/scope/citas/limites, persistencia/reintentos concurrentes/conflictos/rollback, gates. Desplegar inicialmente apagado, habilitar solo con confirmacion y probar por n8n con datos sinteticos.

Constitution check: sin dependencia externa en el nucleo; inbound generico para un conector opcional. Sin nuevas credenciales de Meta, acceso al cerebro ni consultas sin scope. Fallo del conector no bloquea captura manual. No cambia contratos bot/webhook/SSE previos.

Ventana de confirmacion ambigua: si la insercion termina pero se pierde la respuesta del COMMIT, no borrar el archivo potencialmente vinculado. Reintentar el mismo mensaje; un archivo huerfano eventual requiere inspeccion del operador. El rollback de fallo de insercion si limpia su archivo nuevo. No se promete una transaccion distribuida entre disco y Postgres.
