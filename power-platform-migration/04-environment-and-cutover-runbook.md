# Ambientes, despliegue y corte

## 1. Prerrequisitos del tenant

- Tenant corporativo de Microsoft con Power Platform habilitado.
- Licencias confirmadas para Power Apps/Dataverse, Power Automate, Power Pages y Power BI segun usuarios y capacidad.
- Tres ambientes: `PROpEx-DEV`, `PROpEx-TEST` y `PROpEx-PROD`.
- Dataverse creado en los tres ambientes con idioma principal y moneda corporativa definidos antes de cargar datos.
- Grupo de seguridad de Microsoft Entra por ambiente.
- Cuenta de servicio no personal para conexiones y propiedad de flujos.
- Politica DLP que permita Dataverse, Outlook, Teams y SharePoint; y bloquee conectores de consumo no aprobados.
- Sitio SharePoint de evidencias con bibliotecas separadas por modulo y politica de retencion.

## 2. Gobierno de la solucion

- Nombre: `PROpEx`.
- Publicador: `Proboca`.
- Prefijo: `pbx`.
- DEV contiene solucion no administrada.
- TEST y PROD reciben soluciones administradas.
- Todas las URL, identificadores de sitio, buzones, equipos y destinatarios son variables de entorno.
- Todas las conexiones son referencias de conexion; ninguna debe depender de la cuenta personal del creador.

## 3. Orden de construccion

1. Choices globales y tablas base.
2. Claves alternas, relaciones, ownership y auditoria.
3. Roles de seguridad y equipos por planta/unidad.
4. Aplicacion model-driven y vistas operativas basicas.
5. Paginas personalizadas para `Hoy`, Kaizen, GENBA y ProbocaCoins.
6. Power Pages con captura anonima de solo escritura.
7. SharePoint y referencias de evidencia.
8. Flujos Power Automate desactivados durante carga historica.
9. Reportes Power BI.
10. Carga de datos y conciliacion.
11. Activacion gradual de flujos.

## 4. Preparacion de datos

- Generar exportacion de la fuente con `pnpm migration:export:power-platform`.
- Conservar el manifiesto SHA-256 sin modificar.
- Normalizar numeros de empleado a cinco digitos y rechazar `00000`.
- Resolver duplicados de participantes por numero de empleado; correo solo como criterio secundario.
- Validar folios unicos de Ideas, Kaizen y GENBA.
- Validar referencias unicas y reversos de ProbocaCoins.
- No exportar `passwordHash`.
- Copiar evidencias conservando nombre, tipo, expediente, actividad, autor y fecha.

## 5. Orden de carga

1. Plantas, areas y unidades organizacionales.
2. Perfiles de usuario y participantes.
3. Membresias, jerarquias y reglas de escalacion.
4. Reglas de puntos y programas de entrenamiento.
5. Sesiones y asistencias.
6. Ideas.
7. Validaciones, apoyos, seguidores, comentarios y evidencias.
8. Kaizen, equipo, actividades, evidencias y bitacora.
9. GENBA, actividades, evidencias y bitacora.
10. Movimientos de ProbocaCoins.
11. Auditoria historica y configuraciones.

Cada archivo usa `legacyId` como clave alterna temporal para resolver lookups. Despues de conciliar, la columna se conserva como identificador historico y no se reutiliza.

## 6. Pruebas obligatorias

- Conteo por tabla y por estatus contra el manifiesto.
- Cero lookups huerfanos.
- Cero folios duplicados.
- Saldo por participante y saldo total iguales a la fuente.
- Prueba de alta desde cada QR.
- Flujo completo de Idea para cada combinacion de validaciones.
- Creacion idempotente de Kaizen desde Idea.
- Cierre formal de Kaizen con equipo y recompensas.
- Creacion, ampliacion, cierre y promocion de GENBA.
- Alta y correccion financiera con movimiento inverso.
- Finalizacion de entrenamiento sin premio duplicado.
- Acceso positivo y negativo de cada rol, planta y unidad.
- Notificaciones, reintentos y cola de errores.
- Desktop y movil, datos vacios, carga, error, texto largo y alto volumen.

## 7. Corte a produccion

1. Anunciar ventana y congelar altas en el sistema anterior.
2. Crear respaldo verificable de base y evidencias.
3. Ejecutar exportacion final y comparar con la exportacion de ensayo.
4. Cargar diferencias en PROD con automatizaciones desactivadas.
5. Ejecutar conciliaciones y obtener firma de Mejora Continua, Finanzas y TI.
6. Activar flujos por grupos: notificaciones, aprobaciones, recordatorios y finanzas.
7. Cambiar QR y enlaces internos solo despues de las pruebas de humo.
8. Mantener la aplicacion anterior en solo lectura durante el periodo acordado.

## 8. Reversa

Se revierte si aparece cualquiera de estas condiciones: saldos distintos, registros huerfanos, fuga de permisos, perdida de evidencias, folios duplicados o incapacidad de registrar una Idea.

La reversa consiste en restaurar enlaces/QR anteriores, desactivar flujos de Power Platform, reabrir la aplicacion vigente y conservar la nueva solucion sin nuevas escrituras para diagnostico. No se eliminan datos de Dataverse durante la reversa.

