# Decisiones de producto y arquitectura

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
