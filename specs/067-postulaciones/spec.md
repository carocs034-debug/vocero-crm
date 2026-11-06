# Postulaciones — primera version Talented

Fecha: 6 de noviembre de 2026. Carril completo, escrito antes de implementar: agrega persistencia. Rama feat/talented-postulaciones, basada en la copia 2.7.0 ya respaldada.

## Problema y comportamiento

El reclutador necesita reunir candidatos, vacante, CV y revision en una ficha. Hoy la lectura del CV se comprueba en n8n, pero no hay una pantalla de postulaciones persistentes.

Con RECLUTAMIENTO=on, el menu muestra Postulaciones. Permite registrar nombre, vacante, contacto opcional y canal, buscar y filtrar por etapa, abrir una ficha, adjuntar y descargar un PDF privado, ver analisis de apoyo cuando exista y guardar notas y revision humana. Etapas: nueva, por_completar, en_revision, entrevista, cerrada. Ninguna etapa representa un rechazo o contratacion automatizados.

Una ficha nueva no presenta resultados inventados: muestra «Sin analisis». El modelo de persistencia admite el resultado estructurado del piloto para la integracion posterior; esta primera pantalla no llama a IA ni activa n8n. La revision siempre empieza pendiente. La aplicacion no recalcula una elegibilidad ni toma decisiones de seleccion.

## Criterios verificables

1. Bandera apagada: menu ausente, pagina y API 404, migracion aditiva disponible.
2. Sesion obligatoria. Una organizacion no lista, consulta, cambia ni descarga documentos de otra, aunque conozca el id.
3. Registro valido persiste tras recargar; errores de campos son visibles y conservan el formulario. Una clave externa repetida en la misma organizacion no duplica la ficha.
4. Busqueda por nombre o vacante, filtro de etapa y paginacion. Estados vacio, cargando y error con recuperacion. En movil lista y ficha se pueden recorrer sin perder controles.
5. Resumen, evidencias, alertas y faltantes se distinguen de las notas del reclutador. Ausencia de informacion no se convierte en incumplimiento; score null se presenta sin calificacion.
6. PDF de hasta 10 MB, con MIME, cabecera y cierre coherentes; lectura multipart acotada. Almacenamiento por organizacion, nombre de archivo seguro y descarga autenticada como adjunto, privada y sin cache. Un segundo PDF no sobrescribe silenciosamente el primero.
7. Guardar revision cambia notas/etapa y marca revision humana. Una version desactualizada devuelve 409; no pisa trabajo concurrente.
8. Pruebas de esquema, tamano, aislamiento, idempotencia y conflicto. Tipos, lint, tests y build aprobados, mas flujo en vivo con datos sinteticos antes de declarar terminado.

## Alcance y limites

No se implementan envios, convocatorias, agendas, rechazo automatico, OCR, antimalware, retencion ni borrado definitivo. El PDF se sirve como descarga; validar su envoltorio no garantiza inocuidad. Solo documentos ficticios durante el piloto. No se conectan workflows existentes ni credenciales reales adicionales. Integracion automatica n8n -> ficha queda para la etapa siguiente, con contrato y autenticacion propios.

Supuestos: vacante se captura como texto en esta version; no hay catalogo independiente. Los miembros autenticados del negocio pueden operar sus fichas. El modulo es opcional y no modifica las etapas del pipeline comercial existente.
