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
