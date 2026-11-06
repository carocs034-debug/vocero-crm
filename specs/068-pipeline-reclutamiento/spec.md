# Pipeline de reclutamiento

Carril ligero: no cambia tablas ni contratos. Reutiliza GET/PATCH de Postulaciones y RECLUTAMIENTO=on. Decision previa a implementar: con esta bandera, /pipeline muestra el tablero de reclutamiento. Sin ella conserva el tablero comercial.

Problema: el reclutador necesita seguir el avance visual de los mismos candidatos que revisa en Postulaciones, sin duplicarlos como leads comerciales.

## Aceptacion

- Cinco columnas: Nueva, Por completar, En revision, Entrevista y Cerrada. Las tarjetas son las mismas postulaciones de la organizacion.
- Buscar por nombre/vacante; paginar cada columna, mostrando total y cuantos registros estan visibles. No ocultar candidatos por un limite global de 30.
- Arrastrar una tarjeta a otra etapa o elegirla con un selector accesible guarda la misma ficha con version y notas previas intactas. La accion registra revision humana.
- Mientras guarda no se admiten otros movimientos. Error visible y recarga ante conflictos; no anunciar exito ni mover visualmente si la escritura falla.
- Abrir ficha lleva al candidato seleccionado en Postulaciones. La recarga confirma la etapa persistida. Refrescar vuelve a consultar los cambios de otros usuarios.
- Carga, error, columnas vacias y movilidad por selector funcionan sin depender de arrastre ni del color.

No incluye orden manual dentro de columnas, SSE, nuevas integraciones, clasificacion automatica ni modificaciones de leads comerciales. Solo desarrollo, datos ficticios y revision humana.

## Verificacion

Tipos, lint, suite, build; ensayo real de cambio de etapa y conservacion de notas; recorrido UI feliz, conflicto y escritorio/movil documentado en tests/e2e/us-pipeline-reclutamiento.md. Si el navegador no puede controlarse, registrar el bloqueo y no declarar el recorrido aprobado.
