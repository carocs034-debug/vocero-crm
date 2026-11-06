# Contrato v1

POST /api/integraciones/reclutamiento/ingesta, X-Reclutamiento-Key, multipart/form-data.

Campos exactos: datos (JSON de hasta 120 KB), archivo (File application/pdf <=10 MB). JSON estricto: version:1, cuenta_id, conversacion_id, mensaje_id (1..200), nombre (2..120), texto_extraido (300..60000), analisis (esquema de Postulaciones). Sin organizacion, URL externa, correo o telefono. Vacante/canal los fija el servidor. Solo CV sintetico en este piloto.

201 {creada:true,id,url_ficha}; 200 mismo PDF/mensaje ya aceptado, sin alterar datos. 401 clave incorrecta, 403 cuenta/conversacion ajena, 404 apagado/config incompleta, 409 PDF diferente para el mismo mensaje, 413 exceso, 422 formato/cita/PDF invalido, 429 tasa, 500 fallo generico reintentable. Cache-Control no-store. No GET/PATCH ni lectura con esta clave.

Configuracion: RECLUTAMIENTO_INGESTA, RECLUTAMIENTO_INGESTA_KEY (>=32 caracteres), RECLUTAMIENTO_INGESTA_ORG, RECLUTAMIENTO_INGESTA_CUENTA, RECLUTAMIENTO_INGESTA_CONVERSACION, RECLUTAMIENTO_INGESTA_VACANTE. Se exige todo y RECLUTAMIENTO=on. Rotar key detiene el conector hasta actualizar la credencial de n8n; no afecta cuentas humanas.
