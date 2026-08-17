# Decisiones de producto y arquitectura

## 2026-08-16 - Decisiones en lote y paginacion de Mi trabajo

- El lote nunca llama `redirect`. Devuelve `WorkboardBulkResult` con resultado por elemento,
  porque un `redirect` dentro de un lote pierde el reporte parcial y el usuario no sabe que
  se aplico. El camino individual (`supervisorDecisionAction`) conserva su `redirect`.
- Resultados parciales son la norma, no la excepcion: cada elemento se resuelve en su propia
  transaccion serializable y un fallo no revierte a los demas.
- La seleccion viaja como destino serializado (`src/lib/follow-up-bulk.ts`) con tipo, id y las
  versiones esperadas de idea, destino y Kaizen relacionado. Si algo cambio, el elemento
  responde conflicto en vez de sobrescribir.
- La elegibilidad por elemento se calcula en el servidor (`bulkActions[]`) y se revalida en la
  accion. La interfaz nunca ofrece una accion que el servidor vaya a rechazar.
- Paginacion real de 50 por servidor, repartida entre Ideas, Kaizen y GENBA segun cuantos hay
  de cada uno. Consecuencia aceptada: la pagina no son los 50 mas urgentes en conjunto, sino
  los mas urgentes de cada fuente. Unificar el orden global exige una vista de trabajo unica
  y queda para una entrega posterior.
- Toda escritura del lote registra `via: "bulk"` y un identificador de lote en `AuditLog`.

Pendiente conocido y aceptado a proposito: la comprobacion de permisos sigue ejecutandose por
elemento dentro del bucle (`canDecideInitialIdea`, `canDecideDepartmentApproval`), lo que
repite el escaneo de membresias. Funciona y es correcto; no escala. Ver el handoff del turno.

## 2026-08-16 - Movimiento de Kaizen en el tablero

- El cambio con cursor es un acelerador; la accion de servidor sigue siendo la fuente de verdad.
- En el tablero principal solo se mueven proyectos entre etapas activas y adyacentes: planificacion, en curso y pausa. Completar o cancelar nunca ocurre por arrastre.
- El Project Charter y la existencia de actividades se validan en el servidor antes de aceptar el cambio.
- Solo Administracion y Mejora Continua reciben controles de movimiento. Los demas roles conservan vista y seguimiento.
- Cada cambio incluye estado de origen para detectar concurrencia y registra `from`, `to` y `via` en `AuditLog`.
- El menu `Cambiar etapa` es el camino primario de un solo puntero y funciona en movil. El arrastre es adicional y se habilita solo desde 768 px.
- Ideas de Mejora no usara arrastre para aprobar: una aprobacion es una decision con responsable, comentario y trazabilidad. Su acelerador sera la accion en lote.
- Las actividades Kaizen y GENBA podran reutilizar este contrato en una entrega posterior, sin permitir cierres que requieran evidencia o justificacion al soltar.

Se eligio `@hello-pangea/dnd@18.0.1` por su compatibilidad declarada con React 19, su modelo de columnas y su soporte integrado de teclado y lector de pantalla. No se implemento un motor de arrastre propio.
