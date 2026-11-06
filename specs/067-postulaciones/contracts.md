# API interna de Postulaciones

Solo sesion de la organizacion actual y RECLUTAMIENTO=on. Sin permisos publicos o token de integracion.

- GET /api/postulaciones?q=&etapa=&pagina=1: hasta 30 fichas, total y conteo de etapas del negocio. q maximo 120 caracteres, pagina 1..10000.
- POST /api/postulaciones: nombre/vacante obligatorios, correo/telefono opcionales, canal, clave_externa opcional y analisis estructurado opcional. 201 creada; 200 idempotente por clave externa, sin sobrescribir datos previos.
- GET /api/postulaciones/:id: ficha de la organizacion; 404 fuera de alcance.
- PATCH /api/postulaciones/:id: version requerida, etapa y notas; actualiza revision_humana y fecha del revisor. 409 si version no coincide.
- POST /api/postulaciones/:id/cv: multipart archivo y version; PDF de hasta 10 MB. 409 si ya existe o hubo edicion concurrente. No reemplaza archivos.
- GET /api/postulaciones/:id/cv: descarga privada autorizada, Content-Disposition attachment, application/pdf y no-store. 404 si no hay CV o pertenece a otra organizacion.

Errores: 401 sin sesion; 404 modulo apagado o id ajeno; 413 cuerpo/archivo excedido; 422 entrada invalida; 409 conflicto. El id de organizacion y la ruta fisica nunca se toman del cliente. No se devuelven rutas de almacenamiento, credenciales ni texto extraido completo.
