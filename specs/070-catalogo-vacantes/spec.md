# Catálogo de vacantes de Talented

Carril de ciclo completo. El catálogo modifica el modelo de datos y añade una consulta para integraciones.

El equipo abre Vacantes desde el CRM de reclutamiento. Puede registrar un puesto con nombre, código único y rúbrica, actualizarlo y cerrarlo. Los códigos iniciales propuestos son ALM para Almacenista y COORD-ALM para Coordinador de almacén.

La ficha admite vincular una vacante del catálogo. Las fichas anteriores conservan el nombre registrado y pueden vincularse cuando el equipo confirme el puesto. Las evaluaciones muestran la versión de rúbrica que utilizaron aunque el equipo cambie los criterios después.

El agente consulta las vacantes abiertas de su organización por código o nombre. Una coincidencia única permite confirmar el puesto. Si hay varias, pide al candidato que elija entre ellas. Si falta el dato o el puesto está cerrado, pide aclaración o deriva al equipo. El CV puede permanecer en Por completar hasta identificar la vacante.

El flujo de n8n usa la rúbrica vigente de la vacante confirmada y conserva la revisión humana. Reintentar la entrega del mismo mensaje conserva la ficha y su evaluación original.
