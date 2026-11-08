# Catálogo de vacantes

1. Con reclutamiento activo, entrar al CRM como administrador y abrir Vacantes desde el menú. Cargar las vacantes del piloto dos veces y comprobar que aparecen dos códigos únicos, ALM y COORD-ALM.
2. Cambiar un criterio de Almacenista y comprobar que aumenta la versión. Desde una sesión con rol de miembro, comprobar que la lista se puede leer y que los formularios de edición no aparecen.
3. Con la credencial del agente, consultar `/api/bot/vacantes?q=COORD-ALM` y esperar una coincidencia confirmada. Consultar `q=almacen` y esperar opciones que requieren aclaración. Consultar sin credencial y esperar 401.
4. Con la credencial de ingesta, consultar `/api/integraciones/reclutamiento/vacantes?q=ALM` y verificar que incluye la rúbrica y la versión vigentes.
5. Cerrar ALM en el CRM y repetir la consulta por código. Debe responder sin coincidencia. Con reclutamiento apagado, ambas consultas devuelven 404.
