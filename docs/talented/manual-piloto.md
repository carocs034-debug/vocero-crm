# Manual de referencia de Talented

Estado al 6 de noviembre de 2026. Este documento es la version publicable del proceso; el manual operativo detallado se conserva fuera del repositorio.

## Recorrido comprobado

1. Se conecto un numero provisional de WhatsApp mediante coexistencia en Zernio. Se comprobaron recepcion en celular y proveedor y sincronizacion de respuestas desde el celular.
2. Se crearon pilotos separados en n8n, sin modificar los workflows anteriores.
3. Se recibio un evento autenticado, limitado a una cuenta y conversacion. Otro hilo se omitio.
4. Se descargo un PDF sintetico con una credencial de lectura, se valido su envoltorio y se extrajo el texto.
5. OpenRouter produjo resumen y evidencias. El validador rechazo citas no presentes, y el formato se ajusto a fragmentos continuos separados.
6. Se conectaron descarga, IA y validacion. Un PDF nuevo enviado desde WhatsApp completo todo el recorrido. Los pilotos quedaron sin publicar y el webhook pausado.

Resultado del documento ficticio: cobertura ponderada 50 %, score null y completar_datos. Los requisitos de disponibilidad y traslado quedaron pendientes. Ninguna contratacion o exclusion fue automatizada. Las alertas temporales del modelo tuvieron imprecisiones; la verificacion de citas no valida su interpretacion.

## Entorno de desarrollo

El fork remoto estaba en 2.5.1 y la instalacion existente en 2.7.0. Se preparo una rama desde la etiqueta oficial v2.7.0 para conservar la misma base. La copia usa proyecto Compose, PostgreSQL, volumenes y credenciales propios; no se restauraron datos de produccion.

Se valido Compose en el VPS, se construyo la imagen y se verificaron salud, version, commit y escritura de archivos. Despues se configuro DNS y HTTPS con una puerta temporal adicional antes del primer registro. El usuario creo su administrador directamente. Se verificaron una organizacion, un owner, una sesion y HTTP 403 para el registro publico posterior.

La configuracion esta en deploy/talented. Las claves se gestionan fuera de Git y del contexto Docker. El archivo de ejemplo contiene solo placeholders. La copia conserva la proteccion adicional durante el desarrollo.

## Que incluye este respaldo

- Configuracion de despliegue y notas para reconstruir el entorno.
- Exportaciones saneadas de los pilotos y codigo de sus nodos.
- Pruebas reproducibles con entradas sinteticas.
- Este manual publico.

No incluye CVs, historiales de mensajes, ejecuciones, contrasenas, tokens, sesiones ni base de datos. La restauracion requiere credenciales nuevas y datos configurados por el operador. Los cambios son preparacion del entorno y respaldo; todavia no implementan la pantalla de postulaciones.

## Siguiente etapa

Especificar el modulo de postulaciones: candidato, vacante, adjunto privado, resumen, evidencias, informacion pendiente, etapa y revision humana. Cualquier cambio del modelo de datos o contrato seguira el ciclo de especificacion del repositorio antes de implementarse.
