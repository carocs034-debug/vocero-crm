# Pipeline de seleccion

Arnes local: pnpm build y node scripts/e2e-pipeline-reclutamiento.mjs. No conecta a Postgres ni canales. Estado sintetico en memoria. La persistencia real del PATCH se verifica por separado con scripts/e2e-postulaciones.ts en desarrollo.

1. Abrir http://127.0.0.1:3199/pipeline. Nueva tiene 33 registros, 30 visibles; Cargar mas muestra los 33.
2. Persona Demo: cambiar selector a En revision. Debe aparecer alli y desaparecer de Nueva; el total cambia. Abrir su nombre: ficha seleccionada, etapa En revision y nota conservada. Recargar navegador conserva el estado mientras el arnes siga encendido.
3. Volver al tablero. Arrastrar Persona Demo usando su asa a Entrevista. Abrir ficha y confirmar etapa.
4. Conflicto Demo: intentar mover a Cerrada. Error visible; no debe anunciar exito ni mover la tarjeta. Recargar tablero y abrir ficha: nota del otro revisor intacta. Reintentar con version actual funciona.
5. Buscar zzz: columnas vacias. Buscar Persona Demo: un unico candidato. Actualizar vuelve a consultar.
6. Abrir /fallar-lista: error de carga, no queda colgado. Recargar tablero recupera los datos.
7. Repetir selector y apertura a 390 px de ancho, con desplazamiento horizontal del tablero. En escritorio comprobar cinco columnas y scroll. No requiere arrastre tactil para operar.
8. En la app real: bandera apagada conserva Pipeline comercial; encendida usa postulaciones. No se crea ni modifica ningun lead comercial.

## Resultado

6 de noviembre de 2026: recorrido UI ejecutado por el implementador en navegador contra el arnes. Aprobados: 30/33 -> 33/33 visibles; selector a En revision; apertura y recarga de la misma ficha con nota intacta; arrastre a Entrevista; conflicto 409 sin movimiento ni exito falso; recarga con nota de otro revisor intacta y reintento exitoso; busqueda sin coincidencias; error 503 recuperable; selector y apertura a 390 px. Se restauro el viewport al terminar.

La prueba UI usa las mismas componentes y contratos con un servidor sintetico en memoria; no sustituye la prueba de Postgres/archivos ya ejecutada en desarrollo para Postulaciones. Tipos, lint, build y 1466 pruebas aprobados.

Desarrollo actualizado al commit bcf0ce3: imagen compilada exit 0, salud con commit verificado, app/Postgres healthy, HTTPS /api/health 200 y /pipeline redirige al login sin sesion. Puerta temporal sin credenciales devuelve 401 y TLS verificado. Durante el arranque el proxy devolvio 404 transitorio hasta que el contenedor estuvo healthy; se espero y la comprobacion posterior paso. No se alteraron produccion ni workflows de n8n. El navegador integrado no permite completar el acceso BasicAuth de desarrollo; el recorrido UI se verifico en local, no en una sesion autenticada del VPS.
