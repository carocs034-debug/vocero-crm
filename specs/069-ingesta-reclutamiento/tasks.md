# Tareas

- [x] Contrato, configuracion y auth dedicada apagada por defecto.
- [x] Servicio transaccional, CV privado e idempotencia por mensaje.
- [x] Nodo de adaptacion y copia aislada del workflow, sin publicar. 16 nodos con notas visibles y tres guias, persistencia comprobada al recargar.
- [x] Pruebas unitarias (10 del conector), tipos/lint/build y suite (1476).
- [x] Ensayo real de concurrencia/rollback en Postgres y archivos: exit 0. Multipart real, 201/200 mismo id, un registro, bytes identicos, revision conservada, PDF distinto 409 y FK invalida sin archivo huerfano.
- [x] Despliegue apagado y manual; respaldo en GitHub. Commit de imagen 7048218 verificado, app/base healthy, POST interno 404, puerta HTTPS 401/TLS valido e INGESTA_ACTIVA=false.
- [ ] Confirmacion de acceso nuevo: unica ruta HTTPS y clave limitada para n8n.
- [ ] Clave ingresada por usuario, ensayo integrado y PDF nuevo por WhatsApp; pausa final.

Notas n8n: al abrir el nodo nuevo se detecto sugerencia automatica de credencial Zernio. Se cambio Authentication=None y se desactivo el nodo. Tras guardar/recargar se verifico inactivo y sin esa seleccion visible. No se ejecuto el nodo ni se envio esa credencial al CRM. Plantilla publica tambien restaura inactivo y sin auth seleccionada.
