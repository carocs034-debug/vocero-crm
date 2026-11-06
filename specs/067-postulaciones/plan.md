# Plan y comprobacion constitucional

1. Agregar tabla postulacion con organization_id obligatorio, indices org-first y clave externa unica opcional. Crear migracion mediante Drizzle y revisar que solo agregue la tabla.
2. Tipos/validaciones compartidos en lib/postulaciones.ts. Servicios en server/postulaciones y handlers delgados autenticados. Bandera RECLUTAMIENTO apagada por defecto, 404 antes de auth cuando no existe el modulo.
3. Reutilizar guardarMedia/leerMedia/borrarMedia para el CV: id aleatorio generado en servidor, alcance comprobado antes del acceso. Rollback del archivo nuevo si falla la escritura de metadata; ningun documento existente se reemplaza.
4. Pantalla integrada al marco y tokens de temas. Lista paginada y ficha con formulario accesible, resumen, evidencias, pendientes, archivo y revision. Captura manual inicial; el analisis es opcional y no produce cambios de etapa.
5. Pruebas unitarias y de servicios con repositorio mock, casos de aislamiento y competencia. Build y comprobaciones completas. Guion en vivo de la copia de desarrollo y verificacion de persistencia.

## Constitucion: antes del diseño

- I/III: datos por organizacion, consultas scoped, archivos privados; sin claves nuevas ni logs de CVs.
- II: no se agrega proveedor o dependencia de runtime; se reutilizan Postgres y el almacen existente. La pantalla funciona sin IA ni Zernio.
- IV: clave externa unica org-first y recuperacion de conflicto, sin efectos externos duplicados.
- V/IX: gates y prueba en vivo obligatorios; no se afirma verificacion que no haya ocurrido.
- VI: carril completo por migracion; spec, plan y tareas preceden al codigo.
- VIII: modulo opcional para organizar postulaciones del negocio que atiende conversaciones; conserva el CRM base y no introduce marketing masivo.

## Revision tras el diseño

Una tabla nueva; archivo ligado por storage id privado, no URL externa. No se cambia contrato bot/webhooks/SSE existente. El DTO interno es propio de la pantalla; cualquier futuro consumidor externo requerira su contrato. Revision optimista por version protege ediciones y adjunto. La integracion automatica no se simula. Sin excepciones constitucionales.
