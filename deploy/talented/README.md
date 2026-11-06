# Entorno separado de Talented

Estado: copia funcionando en /opt/talented-desarrollo del VPS y disponible por HTTPS en dev-crm.talentedmx.com, protegida por autenticacion temporal adicional. Aplicacion y PostgreSQL saludables. Credenciales exclusivas creadas con autorizacion. Carril exento: herramientas de despliegue; no modifica comportamiento, contratos ni datos de la aplicacion.

Base: etiqueta v2.7.0, commit 806fea1. Coincide con la version y commit verificados por https://crm.talentedmx.com/api/health el 6 de noviembre de 2026. main del fork remoto conserva 2.5.1; la rama chore/talented-entorno-desarrollo parte de la etiqueta oficial 2.7.0 y esta respaldada en GitHub.

## Aislamiento

- Proyecto Compose talented-desarrollo, volumen PostgreSQL y volumen de archivos propios; sin nombres externos de volumen.
- Base talented_dev, usuario talented_dev y credenciales nuevas. No restaurar la base de produccion.
- Sin Nea ni claves de Meta, Zernio u OpenRouter. API del bot sin clave; despacho deshabilitado.
- PostgreSQL solo en red interna. Aplicacion accesible inicialmente solo en loopback del VPS, puerto 3100. No levanta Caddy ni ocupa 80/443.
- Compila el codigo local; no descarga la imagen oficial en lugar de los cambios propios.

## Preparacion y verificacion en el VPS

1. Confirmar que la carpeta contiene esta rama y revisar la disponibilidad de puerto 3100, memoria y disco.
2. Copiar .env.example a .env en esta carpeta. Generar password en hex, secreto de sesion, token y clave AES nueva (32 bytes en base64). Guardarlos fuera del repositorio. Usar el hash completo de git rev-parse HEAD en SOURCE_COMMIT.
3. Validar desde la raiz del repositorio: `docker compose --env-file deploy/talented/.env -f deploy/talented/compose.yml config --quiet`.
4. Construir y arrancar: `docker compose --env-file deploy/talented/.env -f deploy/talented/compose.yml up -d --build`.
5. Verificar desde el VPS: `curl --fail http://127.0.0.1:3100/api/health`. Comprobar version, commit, base y mediaWritable.
6. Registrar el primer usuario mediante acceso protegido. El registro inicial nunca queda accesible sin la puerta temporal.
7. Traefik corre con red host, proveedor Docker, entrypoint websecure y resolver letsencrypt, comprobados en el contenedor real. No necesita unirse a una red externa: alcanza la IP bridge del servicio. El override proxy.yml selecciona explicitamente talented-desarrollo_salida y exige TALENTED_SETUP_AUTH (usuario:hash bcrypt). Validar Compose agregando `-f deploy/talented/proxy.yml` y usar ambos archivos para el despliegue. El middleware bloquea todo acceso publico hasta presentar la clave y retira Authorization antes de reenviar al CRM. No modificar el proxy existente.
8. Crear el DNS del subdominio y verificar HTTPS y autenticacion. Mantener crm.talentedmx.com apuntando al CRM actual.

No ejecutar `down -v`: eliminaria los datos de este proyecto. Para detenerlo basta `stop` con los mismos parametros.

## Pendientes reales

Docker no esta disponible en el equipo local. Se instalo PyYAML en una carpeta temporal excluida del repositorio y validar-despliegue.py aprobo YAML, aislamiento, loopback y proxy optativo. En el VPS Docker Compose 5.6.1 aprobo ambos archivos con config --no-interpolate --quiet. La imagen talented-crm:desarrollo se construyo desde v2.7.0 con el commit completo; BUILD_EXIT=0.

Las credenciales nuevas se generaron directamente en el VPS mediante secrets de Python; .env se creo de forma exclusiva con permisos 600, sin mostrar valores. Esta excluido de Git y del contexto Docker. Se arranco solo con compose.yml, sin proxy.yml. /api/health devolvio ok=true, version 2.7.0, commit 806fea1 verificado, mediaWritable=true y cero webhooks pendientes/agotados. docker ps confirmo ambos contenedores healthy y puerto 127.0.0.1:3100. Los servicios anteriores mantuvieron sus tiempos de ejecucion (sin reinicio).

El registro A dev-crm.talentedmx.com -> 179.197.83.216 se creo en cPanel con TTL 300 y se confirmo consultando por TCP ambos servidores autoritativos (dns1.netmarketingweb1.net y dns2.netmarketingweb1.net). La resolucion del VPS ya apunta a la IP correcta.

El usuario autorizo HTTPS con acceso temporal protegido. Se genero una clave aleatoria exclusiva; usuario y clave solo en /root/talented-acceso-inicial.txt, permisos 600, fuera del repositorio. Hash bcrypt costo 12 en .env; ningun valor secreto en estas notas. Se habilito proxy.yml sin reiniciar Traefik ni servicios de produccion. Certificado TLS verificado por curl sin omitir validacion: ssl_verify_result=0. Sin autenticacion: HTTP 401. Con autenticacion leida en el VPS sin mostrarla: /register HTTP 200 y /api/health HTTP 200, ok=true, mediaWritable=true.

El usuario completo el registro en Chrome. La base de desarrollo confirma una organizacion, un miembro con rol owner y una sesion. Se probo POST /api/auth/sign-up/email con cuerpo vacio y autenticacion temporal: devolvio HTTP 403 con el mensaje de registro cerrado. ALLOW_SIGNUP_TRUE=false. El administrador esta creado y el registro publico cerrado; no se crearon cuentas de prueba adicionales. Mantener la proteccion temporal mientras se desarrolla; retirarla requiere una decision explicita. El codigo, las plantillas saneadas y el manual publico estan respaldados en la rama chore/talented-entorno-desarrollo. Las bases y secretos se respaldan por separado fuera de Git.

La clave de la puerta temporal no tiene vencimiento automatico: temporal describe su uso durante el desarrollo. Su rotacion o retirada debe registrarse cuando se decida. No compartirla por el chat ni incluirla en exportaciones del proyecto. Esta puerta tambien se aplica a la API publica del entorno; cualquier futura integracion de n8n con esta copia debera considerar ambas capas de autenticacion antes de probarse.
