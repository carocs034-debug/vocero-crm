# Ingesta de un CV ficticio por correo

1. Habilitar el buzón piloto con `RECLUTAMIENTO_INGESTA_BUZON` en desarrollo. Mantener el disparador sin publicar y apuntar a la carpeta de pruebas.
2. Ejecutar con un mensaje ficticio cuyo asunto contiene el código de una vacante activa. Confirmar que Postulaciones muestra Correo, la vacante, la versión de su rúbrica y un PDF descargable.
3. Repetir el mismo mensaje. Debe devolver el mismo ID con HTTP 200 y dejar una sola ficha.
4. Ejecutar con otro Message-ID y sin código. Debe guardar el PDF en Por completar con origen Correo y sin calificación.
5. Repetir con un buzón distinto o deshabilitado. Debe devolver 403 y no guardar el PDF.
