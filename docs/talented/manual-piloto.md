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

No incluye CVs, historiales de mensajes, ejecuciones, contrasenas, tokens, sesiones ni base de datos. La restauracion requiere credenciales nuevas y datos configurados por el operador.

## Postulaciones: primera version

La especificacion, plan, tareas y contrato estan en specs/067-postulaciones. El modulo requiere RECLUTAMIENTO=on; apagado, sus rutas responden 404 y su menu no aparece. La migracion 0027 es aditiva y fue generada con Drizzle.

1. Entrar a Postulaciones y pulsar Nueva postulacion.
2. Capturar nombre y vacante; contacto y canal son opcionales. Guardar la ficha antes de adjuntar el archivo.
3. Adjuntar un PDF ficticio de hasta 10 MB. La descarga requiere la sesion de la misma organizacion. Esta version conserva un unico CV por ficha y no reemplaza adjuntos.
4. Buscar por nombre o vacante, filtrar por etapa y abrir la ficha.
5. Revisar el documento, elegir etapa y escribir notas. Guardar revision registra la intervencion humana. Una edicion concurrente devuelve conflicto en lugar de sobrescribir.
6. Sin analisis, la ficha indica Sin analisis. No se invoca IA desde esta pantalla. Cuando existe un resultado estructurado se muestran resumen, cobertura, evidencias y pendientes; el score puede ser null.

La recepcion automatica desde n8n/Zernio todavia no esta conectada a esta pantalla. No se habilito una API publica ni se cambiaron los pilotos o workflows existentes. El conector autenticado e idempotente sera el siguiente paso.

Validacion local: typecheck, lint, 1466 pruebas y build. El ensayo scripts/e2e-postulaciones.ts prueba servicios contra Postgres y almacenamiento reales exclusivamente en un host dev con POSTULACIONES_SELFTEST=1. Crea organizaciones sinteticas sin membresias y un usuario sin cuenta ni password; estas fixtures quedan aisladas para inspeccion. El recorrido visual y el resultado del despliegue se registran en specs/067-postulaciones/tasks.md.

## Pipeline de seleccion

Con RECLUTAMIENTO=on, el menu Pipeline muestra las mismas postulaciones por etapa; con la bandera apagada conserva el tablero comercial de Vocero. No se crean leads ni se copian candidatos.

1. Abrir Pipeline. Cada columna muestra total y tarjetas visibles; usar Cargar mas cuando haya mas de 30.
2. Buscar por nombre o vacante. Actualizar consulta los cambios recientes de otros usuarios.
3. Arrastrar desde el asa o elegir la etapa en el selector de la tarjeta (tambien funciona en celular).
4. Esperar la confirmacion. El movimiento conserva las notas y registra revision humana. Un conflicto no sobrescribe: Recargar tablero y revisar la ficha antes de reintentar.
5. Pulsar el nombre abre directamente el CV, analisis y notas de esa misma postulacion.

El recorrido UI feliz y de errores se verifico con el arnes sintetico scripts/e2e-pipeline-reclutamiento.mjs; detalle en tests/e2e/us-pipeline-reclutamiento.md. Incluyo escritorio y ancho 390 px, paginacion, arrastre, selector, busqueda y conflictos. No agrega integraciones ni cambia n8n.

Desplegado en dev-crm.talentedmx.com/pipeline con commit bcf0ce3: salud y HTTPS comprobados, app/base healthy y puerta temporal conservada. Imagen anterior conservada como talented-crm:antes-pipeline. El recorrido autenticado del VPS sigue pendiente del acceso del navegador; el recorrido funcional de las componentes se completo en el arnes local.

## Conexion opcional de n8n a Postulaciones

La especificacion 069 define una unica ruta de escritura multipart, apagada por defecto. Su clave es exclusiva para el conector y no permite consultar CVs, editar revisiones ni usar el bot. Organizacion, cuenta, conversacion y vacante se fijan en el servidor. El piloto usa una etiqueta sintetica de candidato y no infiere su nombre con IA.

El borrador de n8n se creo como copia nueva; conserva los filtros, descarga, extraccion y validador del piloto. Agrega Preparar ingesta CRM y Guardar postulacion en CRM dev. Tiene explicaciones visibles de cada nodo y guias de las tres etapas; se verificaron al recargar. Sigue sin publicar y sin seleccionar credencial de escritura.

Pasos para habilitar: ver tests/e2e/us-ingesta-reclutamiento.md. Primero pruebas y despliegue con ingesta apagada. Despues confirmacion de acceso nuevo, clave ingresada por el usuario y prueba manual/nuevo PDF. El override deploy/talented/ingesta.yml se agrega solo en ese ultimo paso; no cambia la puerta del resto del CRM.

No usar CVs reales aun: quedan pendientes HMAC/cola del ingreso Zernio, retencion y antimalware/OCR. El endpoint valida forma del PDF y citas contra texto, no la interpretacion de la IA.

Resultado de preparacion: 1476 pruebas, tipos/lint/build y ensayo real de ingesta concurrente/rollback aprobados. Imagen 7048218 instalada con ingesta deshabilitada: salud/commit y app/base healthy, POST 404 y puerta temporal HTTPS conservada. No se genero clave ni se agrego el override de acceso externo. El nodo nuevo de n8n permanece inactivo y con Authentication=None para evitar la seleccion automatica de una credencial ajena. Falta habilitacion autorizada y prueba del recorrido completo con n8n/WhatsApp.

La continuacion del piloto fue autorizada. Los detalles de operacion se conservan exclusivamente en la bitacora privada. Sigue pendiente completar el recorrido integrado.

El ensayo manual integrado posterior paso con datos ficticios: guardado inicial y repeticion del mismo mensaje, sin duplicar el registro. Se comprobaron adjunto, analisis y revision pendiente. El evento nuevo de WhatsApp sigue pendiente de la prueba supervisada.
