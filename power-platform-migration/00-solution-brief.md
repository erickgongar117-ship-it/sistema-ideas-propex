# Brief de solucion: PROpEx

## Objetivo

Crear una solucion administrada de Microsoft Power Platform llamada **PROpEx** para capturar, evaluar, implementar y cerrar mejoras industriales; administrar Proyectos Kaizen y Recorridos GENBA; reconocer participacion con ProbocaCoins; conservar evidencias, trazabilidad y auditoria; y presentar trabajo accionable y resultados a cada rol.

La aplicacion debe responder siempre: que paso, que requiere atencion, quien es responsable y cual es el siguiente paso.

## Identidad

- Color primario Proboca: `#EA0029`.
- Base visual: blanco, grafito, negro y grises neutros.
- Colores departamentales: Supervisor verde, Calidad rojo, Seguridad gris, Mantenimiento azul, Mejora Continua y Administracion negro.
- Nunca comunicar un estado solo mediante color; usar etiqueta e icono.
- Experiencia industrial compacta, accesible y profesional; evitar apariencia generica de plantilla.

## Roles internos

- Administrador.
- Mejora Continua.
- Supervisor.
- Calidad e Inocuidad.
- Seguridad Industrial.
- Mantenimiento.
- Colaborador.

Cada usuario debe ver exclusivamente modulos, registros y acciones permitidos por rol, planta, unidad organizacional, asignacion y estado.

## Modulos

### Organizacion

Plantas, macroprocesos, departamentos, areas, procesos, responsables, gerentes, rutas de asignacion, jerarquia de puestos y reglas de escalacion. Cada area habilitada tiene un enlace y QR de captura.

### Ideas de Mejora

Captura publica desde QR con folio unico `IM-######`, colaborador, numero de empleado normalizado a cinco digitos, area, turno, problema, propuesta, beneficio, impactos SQDCM, categoria A/B/C, evidencia antes y apoyos requeridos.

Flujo: revision del supervisor, solicitud de informacion o rechazo, validaciones de Calidad/Seguridad/Mantenimiento segun impacto, apoyos organizacionales, clasificacion de Mejora Continua, asignacion, implementacion, evidencia despues, validacion final, ProbocaCoins y cierre. Conservar comentarios, seguidores, responsables, fechas, motivos y auditoria.

Clasificaciones: Idea rapida, Accion de mantenimiento, Kaizen, DMAIC, Plan de accion, 5S/Gestion visual, Seguridad, Calidad/Inocuidad y No viable.

### Kaizen

Folio `KZN-###`, idea de origen, Charter, objetivo, alcance, linea base, meta, valor actual, unidad, ahorro estimado/real, lider, equipo y roles, fechas, actividades, bloqueos, evidencia, bitacora, Gantt, cierre formal y ProbocaCoins por integrante. Completar actividades no equivale a cerrar el proyecto.

### GENBA

Folio `GENBA-###`, area, fecha, coordinador, departamentos esperados/asistentes, notas, actividades ilimitadas, responsables, fechas, evidencia, combinacion de duplicados, cierre y conversion trazable de una actividad a Kaizen.

### ProbocaCoins

Participante identificado preferentemente por numero de empleado. Ledger inmutable de premios, ajustes y canjes, con referencia unica, fuente, importe, descripcion, autor y fecha. Los duplicados se corrigen con movimiento inverso auditable, nunca borrando el historial. El saldo se deriva de movimientos confirmados.

### Entrenamientos

Programas, valor en monedas, sesiones, planta/unidad, participantes, asistencia, finalizacion y acreditacion idempotente de ProbocaCoins.

### Repositorios

Vistas historicas de Ideas, Kaizen y GENBA cerrados o cancelados. El repositorio consulta el mismo expediente y no copia datos. Debe filtrar por periodo, planta, area, responsable, estatus y folio.

### Tableros

Vista `Hoy` por rol con pendientes ordenados por urgencia, vencimiento e impacto. Panel ejecutivo con metas, variacion, tendencias, embudo de Ideas, antiguedad por etapa, SLA, participacion, impacto SQDCM, linea base/meta/actual de Kaizen, ahorro estimado/real, Gantt, asistencia GENBA, hallazgos, recurrencia y conversiones a Kaizen.

## Reglas de arquitectura

- Dataverse conserva el estado y las reglas de integridad.
- Power Automate reacciona a cambios; no es la unica fuente de verdad.
- Usar claves alternas para folio, numero de empleado, referencia financiera y legado.
- Todos los flujos deben ser idempotentes, con concurrencia controlada, reintentos, registro de errores y cuenta propietaria de servicio.
- No migrar hashes de contrasena. Los usuarios internos se autentican con Microsoft Entra ID.
- Evidencias en SharePoint o columnas File de Dataverse segun volumen y gobierno.
- Captura publica en Power Pages sin exponer registros existentes al usuario anonimo.
- Construir dentro de una Solution con variables de entorno y referencias de conexion.
- Separar ambientes DEV, TEST y PROD.

## Criterios de aceptacion

- Ningun folio, movimiento financiero, evidencia o relacion queda huerfano.
- Saldos de ProbocaCoins coinciden antes y despues de la migracion.
- Los siete roles pasan pruebas de acceso positivo y negativo.
- Las aprobaciones superiores a 30 dias no dependen de una ejecucion de flujo abierta.
- Desktop y movil funcionan con datos vacios, un registro, volumen alto, errores y texto extenso.
- El sistema actual permanece disponible hasta firmar la conciliacion final.

