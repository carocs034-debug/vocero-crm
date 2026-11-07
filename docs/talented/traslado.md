# Continuar el CRM de Talented en otra computadora

Usa la rama `feat/talented-postulaciones` del fork `carocs034-debug/vocero-crm`. Contiene el módulo de Postulaciones, el Pipeline de selección y la ingesta opcional del piloto de n8n. La aplicación desplegada para pruebas corre en el VPS. Cambiar de computadora permite editar el mismo proyecto o levantar una copia local con una base independiente.

## Obtener el código

```powershell
git clone --branch feat/talented-postulaciones https://github.com/carocs034-debug/vocero-crm.git
cd vocero-crm
git status -sb
```

Para editar y verificar el código, instala Node.js 22 y activa Corepack. El manifiesto fija la versión de pnpm. La verificación del adaptador funciona con datos sintéticos.

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm exec vitest run --minWorkers=1 --maxWorkers=2
pnpm build
node automation/reclutamiento/verificar.mjs
```

## Levantar una copia local

Abre Docker Desktop en modo de contenedores Linux. Desde la raíz del clon, crea un `.env` propio para la copia de Talented con Node.js 22. El comando falla si el archivo ya existe. Usa el puerto local 3100 y deja la ingesta apagada.

```powershell
node -e "const fs=require('node:fs'),c=require('node:crypto'),cp=require('node:child_process'); const env={APP_BASE_URL:'http://localhost:3100',SOURCE_COMMIT:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),POSTGRES_PASSWORD:c.randomBytes(24).toString('hex'),BETTER_AUTH_SECRET:c.randomBytes(32).toString('hex'),ENCRYPTION_KEY:c.randomBytes(32).toString('base64'),META_WEBHOOK_VERIFY_TOKEN:c.randomBytes(24).toString('hex'),RECLUTAMIENTO:'on',RECLUTAMIENTO_INGESTA:''}; fs.writeFileSync('deploy/talented/.env',Object.entries(env).map(([k,v])=>k+'='+v).join('\n')+'\n',{flag:'wx',mode:0o600})"
docker compose --env-file deploy/talented/.env -f deploy/talented/compose.yml config --quiet
docker compose --env-file deploy/talented/.env -f deploy/talented/compose.yml up -d --build
curl.exe --fail http://localhost:3100/api/health
```

Cuando responda salud, abre `http://localhost:3100/register` y registra al dueño de la base local nueva. Entra a `/postulaciones` y `/pipeline`. Crea una ficha ficticia, adjunta un PDF y mueve su etapa. Usa `docker compose --env-file deploy/talented/.env -f deploy/talented/compose.yml stop` para detener la copia conservando los volúmenes. `down -v` borra los volúmenes del proyecto.

## Ubicar el trabajo

| Recurso | Contenido |
|---|---|
| [Manual del piloto](manual-piloto.md) | Uso y pruebas del proyecto |
| [Postulaciones](../../specs/067-postulaciones/spec.md) | Fichas, PDF privado, análisis y revisión |
| [Pipeline](../../specs/068-pipeline-reclutamiento/spec.md) | Tablero sobre las mismas fichas |
| [Ingesta](../../specs/069-ingesta-reclutamiento/contracts.md) | Contrato entre n8n y CRM |
| [Plantillas de n8n](../../automation/reclutamiento/README.md) | Exportaciones saneadas y verificador |
| [Ensayo de ingesta](../../tests/e2e/us-ingesta-reclutamiento.md) | Secuencia supervisada y resultado |
| [Despliegue de Talented](../../deploy/talented/README.md) | Compose y preparación del VPS |

Git transporta el código, migraciones y plantillas. Los datos de una instalación residen en PostgreSQL y el volumen de archivos. Si también cambia el servidor, respalda y restaura ambos juntos y conserva por un canal privado la configuración necesaria para leerlos. El historial, las credenciales y la configuración de n8n requieren su propio respaldo. La plantilla pública se importa en un workflow nuevo, se configura con credenciales del entorno y se conserva sin publicar durante las pruebas.

La prueba supervisada del 6 de noviembre de 2026 completó WhatsApp, Zernio, n8n, análisis y guardado en el CRM. El mismo mensaje produjo una sola ficha y el PDF almacenado coincidió con el original sintético. Al cierre quedó pausado el webhook y el workflow siguió sin publicar. Antes de recibir CV reales quedan por definir la operación continua, la selección de vacantes y el tratamiento de errores, accesos y retención.
