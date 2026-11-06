# Postulaciones: prueba de comportamiento en entorno aislado

Solo datos sinteticos y RECLUTAMIENTO=on. Sin cuentas de canal ni cerebro.

1. Iniciar sesion. Abrir Postulaciones: estado vacio y nueva ficha.
2. Crear Persona Demo — Almacenista. Buscar por nombre y por vacante; comprobar filtro y recarga persistente.
3. Adjuntar un PDF ficticio. Descargarlo: comparar bytes; no debe abrirse como HTML en el origen de la app.
4. Cambiar a Por completar, escribir nota y guardar revision. Recargar: etapa, nota y revision humana persisten.
5. Repetir PATCH con version anterior: 409 y datos actuales intactos. Repetir clave externa: misma ficha y un unico registro.
6. MIME falso, PDF truncado y >10 MB: rechazo sin adjunto guardado. Segundo PDF: 409, primero intacto.
7. Otra organizacion: id ajeno no aparece y GET/PATCH/CV responden 404. Sin sesion: 401. Bandera apagada: 404 y menu ausente.
8. Movil 390 px y escritorio: lista/ficha, volver, etiquetas de formulario, estados cargando/error. Una ficha sin analisis muestra ese estado y nunca inventa calificacion.

Anotar el resultado real en specs/067-postulaciones/tasks.md; una prueba pendiente no cuenta como aprobada.

## Ensayo de persistencia real

El script scripts/e2e-postulaciones.ts usa los servicios y el almacenamiento reales. Se compila con esbuild en la etapa builder de la misma imagen, con alias @=./src, formato ESM, plataforma node y banner createRequire igual al migrador. Se copia el bundle al contenedor de desarrollo y se ejecuta con POSTULACIONES_SELFTEST=1, como usuario vocero. No ejecutar sobre produccion.

El script exige APP_BASE_URL con host dev-* o localhost. Crea dos organizaciones sinteticas sin membresias, dos fichas y un usuario sin cuenta/password. No habilita login, canales ni permisos. Conserva las fixtures para inspeccion. Verifica busqueda, persistencia, deduplicacion, denegacion entre organizaciones, bytes del CV descargado, segundo adjunto rechazado, revision humana, version vieja rechazada y PDF invalido sin metadata. El ensayo no sustituye el recorrido UI de arriba.
