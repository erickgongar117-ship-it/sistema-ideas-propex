# Guia maestra para replicar el sistema PROpEx

## 1. Proposito de este documento

Este documento consolida la informacion funcional necesaria para crear otro sistema igual al actual y dejarlo funcionando primero en una computadora local. Describe que hace, como se organiza, que datos guarda, que roles participan, como se instala localmente y que condiciones debe cumplir antes de usar informacion real.

La forma mas exacta de obtener otro sistema identico es copiar este repositorio y cambiar su configuracion y marca. La seccion 13 explica tambien como reconstruirlo desde cero.

## 2. Objetivo del sistema

PROpEx es una aplicacion web interna de mejora operativa para:

- Capturar ideas de mejora desde codigos QR sin iniciar sesion.
- Enviar cada idea al supervisor correcto segun el area.
- Aprobar, rechazar o solicitar mas informacion.
- Solicitar validaciones paralelas a Calidad/Inocuidad, Seguridad Industrial y Mantenimiento.
- Clasificar, priorizar, asignar e implementar ideas.
- Cargar evidencia antes y despues.
- Cerrar ideas y asignar ProbocaCoins.
- Administrar proyectos Kaizen relacionados o independientes.
- Administrar recorridos GENBA, hallazgos y actividades.
- Convertir actividades GENBA en actividades Kaizen.
- Consultar paneles, Kanban, Gantt, vencimientos, reportes, notificaciones y auditoria.
- Configurar usuarios, areas, estructura organizacional y reglas de puntos.

## 3. Condiciones de la primera entrega

La primera entrega debe funcionar completamente de manera local, sin depender de servicios externos, cuentas de nube, correo empresarial, mensajeria externa ni infraestructura de red.

Debe incluir:

- Aplicacion accesible desde el navegador de la misma computadora.
- Base de datos local incluida y lista para inicializarse.
- Evidencias guardadas en una carpeta local controlada por la aplicacion.
- Usuarios y datos de demostracion para probar cada rol.
- Codigos QR que apunten a la direccion local configurada.
- Notificaciones almacenadas dentro del propio sistema.
- Reportes descargables como archivos Excel.
- Instrucciones simples para instalar, iniciar, detener, respaldar y restaurar.

La persona que construya el sistema puede elegir los componentes internos que considere adecuados, siempre que todo pueda ejecutarse localmente, el codigo sea entregado completo y se respete exactamente el comportamiento descrito en esta guia.

## 4. Arquitectura del sistema

```text
Navegador de colaborador o usuario interno
                 |
                 v
          Aplicacion web local
        paginas + logica del sistema
                 |
        +--------+---------+
        |                  |
        v                  v
 Base de datos       Archivos/evidencias
     local                  locales
        v
        Datos del sistema
        |
        +--> Outbox local
        +--> Avisos internos
```

La aplicacion debe usar una sola base de codigo. Las paginas de captura por QR no requieren sesion; todas las paginas internas deben exigir una sesion valida.

## 5. Roles y permisos

| Rol | Funcion principal | Inicio |
| --- | --- | --- |
| `ADMIN` | Control completo, configuracion y todos los modulos | `/dashboard` |
| `MEJORA_CONTINUA` | Seguimiento global, clasificacion, asignacion y cierre | `/dashboard` |
| `SUPERVISOR` | Revisar ideas de sus areas y dar seguimiento | `/supervisor` |
| `CALIDAD` | Validar impacto de calidad e inocuidad | `/validaciones/calidad` |
| `SEGURIDAD` | Validar riesgos de seguridad industrial | `/validaciones/seguridad` |
| `MANTENIMIENTO` | Validar factibilidad tecnica y apoyar implementacion | `/validaciones/mantenimiento` |
| `COLABORADOR` | Acceso asignado a Kaizen o GENBA cuando corresponda | Segun asignacion |

Los usuarios `ADMIN` y `MEJORA_CONTINUA` administran Kaizen y GENBA. Los demas usuarios pueden ver esos modulos si tienen la bandera de acceso correspondiente o si son lideres/responsables de algun proyecto o actividad.

## 6. Modulos y rutas

### Publicas

- `/login`: inicio de sesion.
- `/captura/[code]`: formulario QR por area, por ejemplo `/captura/P1`.
- `/captura/gracias`: confirmacion con folio.
- `/api/qr/[code]`: genera el QR PNG del area.
- `/calculadora-pollos`: herramienta independiente incluida en el repositorio actual.

### Ideas de mejora

- `/dashboard`: indicadores y panel ejecutivo.
- `/supervisor`: bandeja de revision inicial.
- `/validaciones/calidad`: bandeja de Calidad/Inocuidad.
- `/validaciones/seguridad`: bandeja de Seguridad Industrial.
- `/validaciones/mantenimiento`: bandeja de Mantenimiento.
- `/mejora`: clasificacion y asignacion por Mejora Continua.
- `/implementacion`: avances y evidencia de implementacion.
- `/ideas`: tabla maestra con filtros.
- `/ideas/[id]`: expediente completo y acciones permitidas.
- `/kanban`: flujo visual por estatus.
- `/vencidas`: compromisos vencidos.
- `/qr`: consulta, impresion y descarga de QR.
- `/reportes`: exportacion y ejecucion de recordatorios.
- `/notificaciones`: bandeja e historial de avisos locales.
- `/auditoria`: historial de cambios.

### Kaizen

- `/kaizen`: panel de proyectos.
- `/kaizen/nuevo`: alta de proyecto.
- `/kaizen/[id]`: detalle, charter, actividades, evidencias y actualizaciones.
- `/kaizen/gantt`: calendario de proyectos y actividades.
- `/kaizen/kanban`: actividades agrupadas por proyecto y estatus.
- `/api/export/kaizen`: exportacion Excel.

### GENBA

- `/genba`: panel de recorridos.
- `/genba/nuevo`: alta de recorrido.
- `/genba/[id]`: detalle, asistentes, hallazgos, acciones y evidencias.
- `/genba/kanban`: actividades agrupadas por recorrido y estatus.
- `/api/export/genba`: exportacion Excel.

### Administracion

- `/configuracion`: usuarios, areas, correos de soporte y reglas de puntos.
- `/configuracion/estructura`: plantas y arbol organizacional.
- `/api/export`: exportacion general de ideas.

## 7. Flujo exacto de una idea

1. El colaborador escanea el QR del area.
2. El sistema abre `/captura/Px` y obtiene el area activa y su supervisor.
3. El colaborador captura nombre, empleado opcional, correo opcional, turno, problema, propuesta, beneficio, categoria, apoyo requerido, impactos y evidencia antes opcional.
4. El servidor valida los campos con Zod.
5. Se crea un folio `IM-000001`, `IM-000002`, etc.
6. La idea inicia en `EN_REVISION_SUPERVISOR` y se crea una aprobacion `SUPERVISOR` pendiente.
7. Se guarda evidencia, auditoria y notificacion al supervisor.
8. El supervisor elige aprobar, rechazar o solicitar informacion.
9. Al aprobar, se crean solo las validaciones requeridas:
   - Calidad si `impactsQuality` es verdadero.
   - Seguridad si `impactsSafety` es verdadero.
   - Mantenimiento si `requiresMaintenance` es verdadero.
10. Las validaciones se procesan sin perder las demas pendientes. Un rechazo lleva a `RECHAZADA_VALIDACION`; una solicitud lleva a `SOLICITUD_INFORMACION`.
11. Cuando todas las obligatorias aprueban, la idea pasa a `APROBADA_PARA_IMPLEMENTAR`.
12. Mejora Continua asigna clasificacion, prioridad, responsable y fecha compromiso.
13. La idea pasa a `EN_IMPLEMENTACION`.
14. El responsable registra avances y carga evidencia despues.
15. La idea pasa a `IMPLEMENTADA` y despues a `EN_VALIDACION_FINAL`.
16. Mejora Continua valida el cierre, asigna reglas de ProbocaCoins y cierra.
17. La idea queda `CERRADA`, registra fecha, puntos, auditoria y notificaciones.
18. Si una fecha compromiso vence sin cierre, el proceso de recordatorios la marca `VENCIDA`.

### Estatus de ideas

`REGISTRADA`, `EN_REVISION_SUPERVISOR`, `RECHAZADA_SUPERVISOR`, `SOLICITUD_INFORMACION`, `APROBADA_SUPERVISOR`, `EN_VALIDACION_CALIDAD`, `EN_VALIDACION_SEGURIDAD`, `EN_VALIDACION_MANTENIMIENTO`, `RECHAZADA_VALIDACION`, `APROBADA_PARA_IMPLEMENTAR`, `CLASIFICACION_MEJORA_CONTINUA`, `EN_IMPLEMENTACION`, `IMPLEMENTADA`, `EN_VALIDACION_FINAL`, `CERRADA`, `CANCELADA` y `VENCIDA`.

### Clasificaciones

`IDEA_RAPIDA`, `ACCION_MANTENIMIENTO`, `KAIZEN`, `PROYECTO_DMAIC`, `CINCO_S_GESTION_VISUAL`, `SEGURIDAD`, `CALIDAD_INOCUIDAD` y `NO_VIABLE`.

### Categorias e impactos

- Categoria A: la persona puede ejecutar con recursos disponibles.
- Categoria B: necesita apoyo interno.
- Categoria C: requiere compra, cotizacion o soporte externo.
- Impactos: Seguridad, Calidad/Inocuidad, Entrega, Costo, Moral, Productividad, 5S, Ergonomia y Medio ambiente.

## 8. Flujo Kaizen y GENBA

### Kaizen

Un proyecto guarda folio, titulo, planta, area, objetivo, alcance, linea base, meta, valor actual, unidad, ahorro estimado, ahorro real, fechas, lider y origen opcional en una idea. Sus estatus son `PENDIENTE_CHARTER`, `PLANIFICACION`, `EN_CURSO`, `EN_PAUSA`, `COMPLETADO` y `CANCELADO`.

Cada actividad Kaizen puede tener problema, accion, responsable, fechas, estatus, nota de cierre, cancelacion, evidencia, comentarios y relacion de combinacion con otra actividad. Al completarse o cancelarse todas las actividades relevantes, el proyecto se completa automaticamente. Si provino de una idea, esa idea se marca implementada.

### GENBA

Un recorrido guarda folio, area, fecha, departamentos esperados, departamentos asistentes, notas, coordinador y estado. Sus estatus son `ABIERTO`, `CERRADO` y `CANCELADO`.

Cada hallazgo puede crear una actividad con problema, accion, responsable, vencimiento, evidencia y actualizaciones. Las actividades se pueden completar, cancelar, combinar o promover a un proyecto/actividad Kaizen. Cuando todas las actividades relevantes terminan, el recorrido se cierra automaticamente.

### Estatus comunes de actividades

`PENDIENTE`, `EN_PROCESO`, `BLOQUEADA`, `COMPLETADA`, `CANCELADA` y `COMBINADA`.

## 9. Modelo de datos

La replica debe conservar las siguientes entidades, relaciones y datos historicos. La implementacion interna puede variar, pero el comportamiento y la trazabilidad no deben cambiar.

| Modelo | Proposito |
| --- | --- |
| `User` | Usuarios, rol, contrasena, activo y accesos de modulos |
| `Area` | Codigo QR, nombre y supervisor |
| `Plant` | Plantas APO y CAR |
| `OrgUnit` | Arbol de macroproceso, departamento, area y proceso |
| `Idea` | Expediente principal de una idea |
| `Approval` | Aprobaciones de supervisor y areas soporte |
| `Attachment` | Evidencias antes, despues u otras |
| `Comment` | Comentarios del expediente |
| `PointRule` | Reglas editables de ProbocaCoins |
| `IdeaPointRule` | Reglas aplicadas a una idea y puntos otorgados |
| `NotificationOutbox` | Historial y cola de notificaciones |
| `AuditLog` | Bitacora de cambios |
| `Setting` | Configuracion clave-valor |
| `KaizenProject` | Proyecto Kaizen |
| `KaizenActivity` | Actividad de un Kaizen |
| `KaizenAttachment` | Charter y evidencias Kaizen |
| `KaizenUpdate` | Comentarios y avances Kaizen |
| `GenbaWalk` | Recorrido GENBA |
| `GenbaActivity` | Hallazgo/actividad GENBA |
| `GenbaAttachment` | Evidencias GENBA |
| `GenbaUpdate` | Comentarios y avances GENBA |

No se deben eliminar ni simplificar estas relaciones si se busca una replica fiel.

## 10. ProbocaCoins

El seed incluye reglas automaticas por registro, aprobacion, validacion, implementacion, evidencia, replicabilidad, seguridad, inocuidad y ahorro. Tambien incluye una evaluacion gerencial por efecto, velocidad de implementacion, esfuerzo y originalidad.

Las reglas son editables por el administrador. El cierre guarda tanto la seleccion de reglas como los puntos historicos aplicados, de modo que cambiar una regla futura no modifica automaticamente cierres anteriores.

## 11. Notificaciones, QR, archivos y reportes

### Notificaciones

- En la primera entrega, todas las notificaciones deben guardarse dentro del sistema.
- Cada aviso debe registrar destinatario, asunto, contenido, fecha, canal y estado.
- Los estados deben permitir identificar avisos pendientes, atendidos y con error.
- Los administradores deben poder consultar, descartar y reintentar avisos.
- No se requiere enviar correo ni mensajes externos en esta etapa local.

### QR

Cada QR debe abrir la captura del area correspondiente. En la primera entrega debe utilizar la direccion local de la aplicacion y poder descargarse como PNG para realizar pruebas.

### Evidencias

- Todas las evidencias deben guardarse localmente.
- La aplicacion debe crear y administrar automaticamente la carpeta de evidencias.
- Debe aceptar imagenes y PDF de hasta 8 MB.
- Debe renombrar los archivos para evitar duplicados y nombres peligrosos.
- La ruta guardada debe quedar vinculada al folio, proyecto, recorrido o actividad correcta.

### Excel

- General: `/api/export`.
- Kaizen: `/api/export/kaizen`.
- GENBA: `/api/export/genba`.

## 12. Entrega local del sistema

El responsable de construir la replica debe entregar una carpeta completa que pueda instalarse y ejecutarse en una computadora local.

### 12.1 Contenido obligatorio de la entrega

1. Codigo fuente completo y editable.
2. Base de datos local o procedimiento automatico para crearla.
3. Carpeta local para evidencias.
4. Datos de demostracion para todos los roles.
5. Imagenes, logotipos y estilos incluidos dentro del proyecto.
6. Instructivo de instalacion local.
7. Un comando o acceso sencillo para iniciar la aplicacion.
8. Un procedimiento para detenerla sin perder informacion.
9. Instrucciones de respaldo y restauracion.
10. Lista de usuarios demo y sus permisos.

### 12.2 Comportamiento al instalar

1. El instalador o instructivo debe comprobar los requisitos de la computadora.
2. Debe crear la configuracion local sin solicitar cuentas externas.
3. Debe crear la base de datos y sus tablas.
4. Debe cargar datos demo cuando el usuario lo indique.
5. Debe iniciar la aplicacion y mostrar la direccion local que se debe abrir.
6. Si la direccion habitual esta ocupada, debe informar otra direccion disponible.
7. Al reiniciar la computadora, los datos capturados deben continuar disponibles.

### 12.3 Datos demo actuales

La demostracion debe crear areas P1 a P9, cinco usuarios de soporte/administracion, nueve supervisores, reglas de puntos e ideas de ejemplo. Puede utilizarse temporalmente `admin123` para las pruebas locales, mostrando claramente que es una clave de demostracion.

### 12.4 Personalizar la instancia local

1. Reemplazar imagenes en `public/brand` conservando nombres o actualizar sus referencias.
2. Cambiar nombre visible en `prisma/seed.ts`, clave `appName`.
3. Sustituir P1-P9 por las areas reales y asignar supervisores.
4. Cargar plantas y estructura mediante `/configuracion/estructura` o los scripts de organizacion.
5. Crear usuarios reales desde `/configuracion`.
6. Revisar reglas ProbocaCoins.
7. Generar los QR usando la direccion local actual.
8. Incluir una opcion clara para borrar los datos demo e iniciar una base limpia.

## 13. Reconstruccion desde cero

Si no se puede copiar este repositorio, seguir este orden:

1. Crear la estructura general de la aplicacion y su navegacion.
2. Crear la base de datos local con todas las entidades de la seccion 9.
3. Implementar usuarios, contrasenas, sesiones y permisos por rol.
4. Crear el layout protegido y el menu filtrado por rol.
5. Crear la captura publica por codigo de area y la generacion de QR.
6. Implementar el flujo de Ideas exactamente en el orden de la seccion 7.
7. Crear auditoria para cada cambio importante.
8. Crear la bandeja local de notificaciones.
9. Implementar almacenamiento local de evidencias.
10. Crear panel, bandejas por rol, detalle, tabla, Kanban y vencimientos.
11. Implementar Kaizen, despues GENBA y al final la promocion GENBA a Kaizen.
12. Implementar exportaciones Excel.
13. Crear configuracion de usuarios, areas, puntos y estructura organizacional.
14. Crear datos de demostracion y una forma de iniciar una base limpia.
15. Documentar instalacion, inicio, detencion, respaldo y restauracion local.
16. Ejecutar todas las pruebas funcionales y de permisos de la seccion 17.

## 14. Alcance reservado para una instruccion posterior

Esta entrega no debe configurar ni decidir todavia:

- Publicacion en internet.
- Red interna empresarial.
- Dominio definitivo.
- Servidor dedicado.
- Base de datos remota.
- Correo real.
- Mensajes externos.
- Inicio de sesion corporativo.
- Almacenamiento en nube.

El codigo debe quedar ordenado para que estas capacidades puedan agregarse posteriormente sin reconstruir los modulos funcionales. La decision entre red interna o publicacion se dara en una instruccion separada.

## 15. Seguridad minima de la entrega local

Estas condiciones deben cumplirse incluso en la version local:

1. Eliminar usuarios demo y la contrasena comun `admin123`.
2. Utilizar un secreto de sesion aleatorio y no permitir un valor inseguro predeterminado.
3. Agregar limite de intentos al inicio de sesion y bloqueo temporal.
4. Guardar contrasenas mediante hash seguro; nunca guardarlas como texto visible.
5. Evitar que una persona cambie manualmente el codigo de area para acceder a informacion protegida.
6. Validar archivos por contenido real, extension, MIME y tamano; renombrarlos; escanearlos con antivirus.
7. Guardar evidencias fuera de una carpeta publica y entregarlas solo despues de autorizar al usuario.
8. Aplicar autorizacion en cada accion del servidor por rol, area, propiedad y asignacion; ocultar un boton no es seguridad suficiente.
9. Proteger la sesion y evitar que pueda modificarse desde el navegador.
10. Invalidar la sesion al cerrar sesion o desactivar al usuario.
11. Validar en el servidor todos los formularios y acciones sensibles.
12. Evitar consultas, nombres de archivo o entradas que permitan inyeccion o acceso a rutas no autorizadas.
13. Separar claramente los datos demo de una base local limpia.
14. Proteger los respaldos y secretos locales.
15. Definir retencion de evidencias, auditoria, datos personales y notificaciones.
16. Evitar que secretos, tokens o cuerpos sensibles aparezcan en logs.
17. Revisar periodicamente los componentes internos y sus vulnerabilidades conocidas.
18. Registrar errores importantes sin mostrar detalles sensibles al usuario.
19. Hacer la bitacora de auditoria inmutable para usuarios normales y definir retencion.
20. No realizar conexiones ni envios externos durante la etapa local.

## 16. Organizacion interna que debe conservarse

```text
Sistema local PROpEx/
  aplicacion/                    pantallas y navegacion
  reglas/                       flujo, permisos y ProbocaCoins
  datos/                        base local y estructura
  evidencias/                   archivos cargados
  reportes/                     exportaciones generadas
  identidad/                    logotipos e imagenes
  datos-demo/                   usuarios, areas y ejemplos
  respaldos/                    copias locales controladas
  instrucciones/               instalacion y operacion
```

Los nombres internos pueden cambiar. Lo importante es separar claramente interfaz, reglas, datos, evidencias, reportes, identidad, demostracion y respaldos.

## 17. Pruebas de aceptacion

Antes de declarar lista una replica, comprobar:

1. Login correcto, incorrecto, usuario inactivo y cierre de sesion.
2. Cada rol solo ve sus rutas y solo puede ejecutar sus acciones.
3. QR de cada area abre el area correcta y asigna al supervisor correcto.
4. Captura incompleta no crea idea.
5. Captura valida genera folio unico, aprobacion, auditoria y notificacion.
6. Supervisor puede aprobar, rechazar y solicitar informacion.
7. Se crean exactamente las validaciones marcadas por impactos.
8. Las validaciones paralelas no se pisan entre si.
9. La idea solo pasa a implementacion despues de todas las aprobaciones requeridas.
10. Clasificacion y asignacion guardan responsable y fecha.
11. Evidencia antes y despues se guarda y se puede consultar con autorizacion.
12. Cierre calcula puntos y conserva las reglas aplicadas.
13. Recordatorios marcan vencimientos y notifican.
14. Excel general, Kaizen y GENBA abre sin errores.
15. Kaizen completa automaticamente al terminar actividades.
16. GENBA cierra automaticamente al terminar actividades.
17. Promocion GENBA a Kaizen conserva trazabilidad.
18. Auditoria registra usuario, entidad, accion, detalle y fecha.
19. Vista movil no tiene texto cortado ni controles sobrepuestos.
20. Restaurar un respaldo en un entorno de prueba funciona.

La entrega debe incluir una prueba automatizada o repetible de las reglas principales y un reporte indicando cuales de los 20 puntos anteriores fueron comprobados. Tambien debe probarse la interfaz en computadora y telefono.

## 18. Prompt maestro para pedir otro sistema igual

El siguiente texto se puede entregar a otro desarrollador o asistente de codigo:

```text
Construye una aplicacion web interna llamada PROpEx para administrar Ideas de Mejora, proyectos Kaizen y recorridos GENBA.

En esta primera etapa debes construirla y dejarla funcionando completamente de forma local en mi computadora. No configures nube, servidor empresarial, red interna, publicacion en internet, correo real, mensajeria externa ni inicio de sesion corporativo. Yo dare despues una instruccion separada para decidir si se publica en una red interna o de forma publica.

Puedes elegir la implementacion interna que consideres adecuada, pero debe ejecutarse localmente, entregarse con todo su codigo fuente y no depender de cuentas o servicios externos. Incluye base de datos local, evidencias locales, notificaciones internas, reportes Excel y codigos QR de prueba que usen la direccion local.

Implementa los roles ADMIN, MEJORA_CONTINUA, SUPERVISOR, CALIDAD, SEGURIDAD, MANTENIMIENTO y COLABORADOR. Toda pagina y toda accion del servidor deben validar rol, area, asignacion y propiedad. ADMIN y MEJORA_CONTINUA administran los modulos; los demas acceden a Kaizen o GENBA por permiso o asignacion.

La captura de ideas debe ser publica por /captura/[codigo-area], mostrar el area y supervisor, aceptar nombre, numero de empleado, correo, turno, problema, propuesta, beneficio, categoria A/B/C, soporte externo, impactos y evidencia antes. Debe generar folio IM-000001, asignar supervisor, crear aprobacion, auditoria y notificacion.

Implementa el flujo completo: revision del supervisor; validaciones paralelas de Calidad, Seguridad y Mantenimiento segun impacto; clasificacion y prioridad por Mejora Continua; asignacion de responsable y fecha; avances y evidencia despues; validacion final; ProbocaCoins; cierre; rechazo; solicitud de informacion; cancelacion y vencimiento automatico.

Incluye dashboard, bandejas por rol, tabla maestra, detalle, Kanban, vencidas, QR, reportes Excel, notificaciones, auditoria, configuracion de usuarios/areas/puntos y estructura organizacional por plantas, macroprocesos, departamentos, areas y procesos.

Incluye Kaizen con proyecto, charter, lider, objetivo, alcance, indicadores, ahorro, fechas, actividades, responsables, evidencias, actualizaciones, Gantt y Kanban. Incluye GENBA con recorrido, departamentos esperados/asistentes, coordinador, hallazgos, actividades, evidencias, Kanban y promocion de actividad GENBA a Kaizen.

Respeta el modelo de datos, relaciones, estatus y reglas descritos en GUIA_REPLICA_SISTEMA_PROPEX.md. La interfaz debe ser responsiva, sobria y operativa, usar la identidad Proboca y filtrar la navegacion por rol. Registra auditoria en toda modificacion importante.

Entrega una carpeta completa con codigo fuente, base local, datos demo, evidencias, identidad visual e instrucciones exactas para instalar, iniciar, detener, respaldar y restaurar. Deja un acceso sencillo para abrir la aplicacion en el navegador. Ejecuta la lista de aceptacion y entrega el resultado de cada prueba. No des por terminada la tarea hasta demostrar que funciona localmente y que los datos permanecen despues de reiniciar la aplicacion.
```

## 19. Fuentes de verdad del sistema actual

Para comprobar cualquier detalle exacto, usar este orden:

1. Modelo de datos: entidades, relaciones y campos.
2. Flujo de trabajo: transiciones de Ideas, Kaizen y GENBA.
3. Reglas de dominio: estatus, etiquetas, puntos y vencimientos.
4. Permisos: acciones y pantallas disponibles para cada rol.
5. Navegacion: modulos, rutas y accesos visibles.
6. Pantallas: campos, filtros, botones, estados y mensajes.
7. Datos demo: usuarios, areas, reglas y ejemplos.
8. Identidad visual: logotipos, colores y estilos Proboca.
9. Pruebas de aceptacion de la seccion 17.
10. El codigo actual, cuando sea necesario resolver un detalle no descrito.

## 20. Resultado esperado

Una replica terminada debe permitir que un colaborador capture una idea desde un QR local, que la organizacion la procese con trazabilidad completa y que Mejora Continua administre Ideas, Kaizen y GENBA desde una sola aplicacion responsiva. En esta etapa debe funcionar totalmente en una computadora local, conservar la informacion entre sesiones y no realizar conexiones externas. La configuracion para red interna o publicacion se definira posteriormente.
