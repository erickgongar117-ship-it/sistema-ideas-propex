# Modelo Dataverse para la transferencia de PROpEx

**Estado:** diseño base para construcción y migración

**Fuente inventariada:** `prisma/schema.prisma` (SQLite) y `prisma/schema.production.prisma` (PostgreSQL)

**Fecha de corte del diseño:** 2026-08-11

**Prefijo de publicador:** `pbx_`

## 1. Alcance y decisiones no negociables

El esquema Prisma vigente contiene **20 enumeraciones y 31 modelos**. Los dos archivos Prisma son equivalentes salvo por el proveedor de base de datos; por tanto, este documento toma `schema.prisma` como definición lógica y `schema.production.prisma` como confirmación de compatibilidad productiva.

La transferencia propuesta preserva las relaciones, los valores históricos y la capacidad de regresar al sistema anterior. No se migrará `User.passwordHash` a Dataverse: la autenticación nueva será Microsoft Entra ID. El hash sólo permanecerá dentro del respaldo cifrado y de acceso restringido del sistema anterior durante la ventana de reversión.

Principios obligatorios:

1. El identificador GUID de Dataverse será nuevo. Todo registro migrado conservará el CUID original en `pbx_legacyid`.
2. Las cargas se harán por **upsert contra claves alternas**, nunca por comparación de nombres visibles.
3. Ningún proceso de migración borrará ni modificará el origen.
4. Los saldos de ProbocaCoins se derivan del libro mayor; no se migrará un saldo calculado como si fuera la fuente de verdad.
5. Los folios existentes se preservan y se reconcilian antes de activar la numeración nueva.
6. Las bajas funcionales se implementan mediante desactivación/archivo. El borrado físico se restringe en producción.
7. Los arreglos JSON y las rutas de archivos se normalizan, pero también se conserva su representación original para reversibilidad.
8. Power Automate no asignará folios, no calculará saldos ni hará escrituras financieras sin una operación transaccional e idempotente en Dataverse.

## 2. Convenciones de Dataverse

### 2.1 Columnas comunes

Todas las tablas personalizadas que reciben datos históricos tendrán estas columnas:

| Columna | Tipo | Regla |
|---|---|---|
| `pbx_legacyid` | Texto, 64 | CUID de Prisma. Obligatorio para registros con origen `LEGACY`; clave alterna individual. Nulo para registros nativos. |
| `pbx_origin` | Choice `pbx_recordorigin` | `LEGACY`, `NATIVE`, `INTEGRATION`. |
| `pbx_sourcecreatedat` | Fecha y hora, User Local | Copia exacta en UTC de `createdAt`. |
| `pbx_sourceupdatedat` | Fecha y hora, User Local | Copia exacta en UTC de `updatedAt`, cuando exista. |
| `pbx_sourcechecksum` | Texto, 64 | SHA-256 de los escalares canónicos del registro fuente. |
| `pbx_migrationrun` | Lookup a `pbx_migrationrun` | Lote que creó o actualizó el registro. |

`Created On` puede poblarse con `overriddencreatedon` durante la importación cuando la API lo permita, pero **no sustituye** a `pbx_sourcecreatedat`. Dataverse no permite reconstruir de forma fiable todos los metadatos del sistema (`Modified On`, `Created By`) como si hubieran ocurrido originalmente allí.

### 2.2 Criterios de tipo

- Los CUID y referencias históricas son texto; no se intentará convertirlos en GUID.
- Los instantes (`occurredAt`, `closedAt`, `decidedAt`) son Fecha y hora, User Local, enviados como UTC.
- Las fechas de planeación (`startDate`, `endDate`, `dueDate`, `visitDate`, `sessionDate`) serán Date Only únicamente si la validación previa confirma hora `00:00:00` en el 100 % de los registros. Si existe una hora significativa, se conservarán como Fecha y hora.
- Los puntos y monedas son Whole Number con signo.
- Los indicadores de Kaizen son Decimal; los ahorros son Currency con moneda MXN explícita. Antes de cargar se validará precisión y rango.
- Los textos largos (`problem`, `proposal`, comentarios, cuerpo de notificación y JSON histórico) son Texto multilínea.
- Los correos se almacenan normalizados en minúsculas, conservando el texto fuente en una columna `pbx_legacy...` cuando haya cambio.

### 2.3 Identidad y actores históricos

Los registros Prisma `User` no se transforman directamente en `systemuser`. Se crea `pbx_userprofile`, y todas las relaciones históricas apuntan a ese perfil. `pbx_userprofile.pbx_systemuser` enlaza opcionalmente con el usuario de Entra/Dataverse activo.

Esto evita perder responsables históricos que ya no existan en Entra y permite distinguir:

- identidad histórica: `pbx_userprofile`;
- identidad autenticada y propietario de filas: `systemuser`;
- personas sin acceso al sistema: `pbx_participant`.

## 3. Inventario Prisma y destino

| Modelo Prisma | Tabla Dataverse | Propiedad | Clave de negocio principal |
|---|---|---|---|
| `User` | `pbx_userprofile` + lookup a `systemuser` | Organización | `pbx_legacyid`; correo y empleado se validan como únicos |
| `Area` | `pbx_area` | Organización | `pbx_code` |
| `Plant` | `pbx_plant` | Organización | `pbx_code` |
| `OrgUnit` | `pbx_orgunit` | Organización | `pbx_code` |
| `Idea` | `pbx_idea` | Usuario/equipo | `pbx_folio` y `pbx_number` |
| `OrgMembership` | `pbx_orgmembership` | Organización | perfil + unidad organizacional |
| `OrgEscalationRule` | `pbx_orgescalationrule` | Organización | `pbx_legacyid`; nombre dentro de unidad no se supone único |
| `IdeaSupportRequest` | `pbx_ideasupportrequest` | Usuario/equipo | idea + unidad organizacional |
| `IdeaFollower` | `pbx_ideafollower` | Usuario/equipo | idea + perfil |
| `Participant` | `pbx_participant` | Organización | `pbx_legacyid`; empleado normalizado |
| `TrainingProgram` | `pbx_trainingprogram` | Organización | `pbx_name` |
| `TrainingSession` | `pbx_trainingsession` | Usuario/equipo | `pbx_legacyid` |
| `TrainingEnrollment` | `pbx_trainingenrollment` | Usuario/equipo | sesión + participante |
| `CoinTransaction` | `pbx_cointransaction` | Usuario/equipo | `pbx_reference` |
| `Approval` | `pbx_approval` | Usuario/equipo | idea + tipo |
| `Attachment` | `pbx_ideaattachment` | Usuario/equipo | `pbx_legacyid` |
| `Comment` | `pbx_ideacomment` | Usuario/equipo | `pbx_legacyid` |
| `PointRule` | `pbx_pointrule` | Organización | `pbx_legacyid`; nombre no es único en Prisma |
| `IdeaPointRule` | `pbx_ideapointrule` | Usuario/equipo | idea + regla |
| `NotificationOutbox` | `pbx_notificationoutbox` | Organización | `pbx_legacyid`; `pbx_eventkey` para registros nuevos |
| `AuditLog` | `pbx_legacyauditlog` | Organización | `pbx_legacyid` |
| `Setting` | `pbx_setting` | Organización | `pbx_key` |
| `KaizenProject` | `pbx_kaizenproject` | Usuario/equipo | `pbx_number`, `pbx_folio`, idea origen |
| `KaizenTeamMember` | `pbx_kaizenteammember` | Usuario/equipo | proyecto + perfil |
| `KaizenActivity` | `pbx_kaizenactivity` | Usuario/equipo | proyecto + número; actividad GENBA origen |
| `KaizenAttachment` | `pbx_kaizenattachment` | Usuario/equipo | `pbx_legacyid` |
| `KaizenUpdate` | `pbx_kaizenupdate` | Usuario/equipo | `pbx_legacyid` |
| `GenbaWalk` | `pbx_genbawalk` | Usuario/equipo | `pbx_number`, `pbx_folio` |
| `GenbaActivity` | `pbx_genbaactivity` | Usuario/equipo | recorrido + número |
| `GenbaAttachment` | `pbx_genbaattachment` | Usuario/equipo | `pbx_legacyid` |
| `GenbaUpdate` | `pbx_genbaupdate` | Usuario/equipo | `pbx_legacyid` |

Tablas nuevas necesarias para operar y migrar con seguridad:

| Tabla | Propósito |
|---|---|
| `pbx_ideasubmission` | Bandeja de captura anónima de Power Pages. Sólo permite Create al público; un proceso síncrono valida y promueve a `pbx_idea`. |
| `pbx_departmentcatalog` | Catálogo estable de departamentos GENBA. |
| `pbx_genbaattendance` | Normaliza los arreglos `expectedDepartments` y `attendedDepartments`. |
| `pbx_migrationrun` | Manifiesto, estado, conteos y huellas de cada ejecución. |
| `pbx_migrationexception` | Cuarentena trazable de filas que no pueden cargarse sin decisión. |

## 4. Definición de tablas y columnas

Las columnas comunes de la sección 2.1 se omiten en las listas siguientes para evitar repetición.

### 4.1 Identidad y organización

#### `pbx_userprofile` — origen `User`

| Origen | Destino | Tipo / transformación |
|---|---|---|
| `id` | `pbx_legacyid` | Texto 64, clave alterna |
| `name` | `pbx_name` | Texto 200, primary name |
| `email` | `pbx_email` | Email 320, minúsculas |
| `email` original | `pbx_legacyemail` | Texto 320 si cambió al normalizar |
| `role` | `pbx_role` | Choice `pbx_role` |
| `passwordHash` | — | No migrar; conservar sólo en respaldo cifrado del origen |
| `active` | `pbx_active` | Yes/No |
| `kaizenAccess` | `pbx_kaizenaccess` | Yes/No |
| `genbaAccess` | `pbx_genbaaccess` | Yes/No |
| `jobTitle` | `pbx_jobtitle` | Texto 200 |
| `employeeNumber` | `pbx_employeenumber` | Texto 5, normalizado |
| valor original | `pbx_legacyemployeenumber` | Texto 100, siempre que difiera o sea inválido |
| enlace nuevo | `pbx_systemuser` | Lookup opcional a `systemuser`; unicidad mediante plug-in síncrono |

No se crea automáticamente un usuario de Entra por cada fila. La coincidencia será: Object ID aprobado por RR. HH./TI, después correo exacto normalizado, y nunca sólo nombre.

Si un correo histórico no es sintácticamente utilizable, se conserva en `pbx_legacyemail`, `pbx_email` queda nulo y el perfil no se enlaza automáticamente. Una identidad histórica no se descarta por carecer de cuenta activa.

#### `pbx_plant` — origen `Plant`

`pbx_code` Texto 50 (clave alterna), `pbx_name` Texto 200, `pbx_active` Yes/No.

#### `pbx_area` — origen `Area`

`pbx_code` Texto 50 (clave alterna), `pbx_name` Texto 200, `pbx_supervisor` Lookup a `pbx_userprofile`, `pbx_active` Yes/No.

#### `pbx_orgunit` — origen `OrgUnit`

| Columna | Tipo |
|---|---|
| `pbx_code` | Texto 100, clave alterna |
| `pbx_name` | Texto 200, primary name |
| `pbx_plant` | Lookup obligatorio a `pbx_plant` |
| `pbx_parent` | Lookup jerárquico opcional a `pbx_orgunit` |
| `pbx_type` | Choice `pbx_orgunittype` |
| `pbx_responsiblename` | Texto 200; preserva `responsible` |
| `pbx_managername` | Texto 200; preserva `manager` |
| `pbx_routinguser` | Lookup opcional a `pbx_userprofile` |
| `pbx_capturearea` | Lookup opcional a `pbx_area`, único cuando no es nulo |
| `pbx_qrenabled` | Yes/No |
| `pbx_issupportarea` | Yes/No |
| `pbx_active` | Yes/No |
| `pbx_sortorder` | Whole Number |

#### `pbx_orgmembership` — origen `OrgMembership`

`pbx_name` se genera como perfil + unidad; `pbx_userprofile` y `pbx_orgunit` son lookups obligatorios; `pbx_title` Texto 200; `pbx_level` Whole Number; `pbx_managermembership` lookup propio opcional; `pbx_canreviewteam`, `pbx_canreceiveideas`, `pbx_canmanageactivities`, `pbx_active` Yes/No; `pbx_sortorder` Whole Number. Clave alterna compuesta: `pbx_userprofile + pbx_orgunit`.

#### `pbx_orgescalationrule` — origen `OrgEscalationRule`

`pbx_name` Texto 200; `pbx_orgunit` Lookup obligatorio; `pbx_submitterlabel` Texto 200; `pbx_circumstance` Texto multilínea; `pbx_submitterlevel` Whole Number; `pbx_reviewermembership` Lookup obligatorio a `pbx_orgmembership`; `pbx_isdefault`, `pbx_active` Yes/No; `pbx_sortorder` Whole Number.

Regla síncrona: sólo puede existir una regla activa marcada como predeterminada por unidad y nivel, aunque Prisma no lo impone. Los datos históricos que violen esto se cargan inactivos y se envían a excepción; no se elige arbitrariamente un revisor.

#### `pbx_participant` — origen `Participant`

`pbx_name` Texto 200; `pbx_userprofile` Lookup opcional y único; `pbx_orgunit` Lookup opcional; `pbx_employeenumber` Texto 5; `pbx_legacyemployeenumber` Texto 100; `pbx_email` Email 320; `pbx_legacyemail` Texto 320; `pbx_jobtitle` Texto 200; `pbx_active` Yes/No; `pbx_currentcoinbalance` Whole Number de sólo lectura como caché derivada; `pbx_balancereconciledat` Fecha y hora.

El libro mayor `pbx_cointransaction`, no `pbx_currentcoinbalance`, es la fuente de verdad.

### 4.2 Ideas de Mejora

#### `pbx_idea` — origen `Idea`

| Origen | Destino | Tipo / regla |
|---|---|---|
| `folio` | `pbx_folio` | Texto 50 canónico, primary name y clave alterna |
| `folio` original | `pbx_legacyfolio` | Texto 100 si difiere de la forma canónica |
| sufijo numérico | `pbx_number` | Whole Number, clave alterna para folios estándar `IM-######` |
| `collaboratorName` | `pbx_collaboratorname` | Texto 200 |
| `collaboratorEmail` | `pbx_collaboratoremail` | Email 320 normalizado |
| `employeeNumber` | `pbx_employeenumber` | Texto 5 normalizado |
| valor empleado original | `pbx_legacyemployeenumber` | Texto 100 |
| `areaId` | `pbx_area` | Lookup obligatorio a `pbx_area` |
| `shift` | `pbx_shift` | Choice `pbx_shift`; valor desconocido va a excepción |
| `problem` | `pbx_problem` | Texto multilínea, obligatorio |
| `proposal` | `pbx_proposal` | Texto multilínea, obligatorio |
| `expectedBenefit` | `pbx_expectedbenefit` | Texto multilínea, obligatorio |
| `impactTypes` | `pbx_impacttypes` | Choice multiselección `pbx_impacttype` |
| `impactTypes` raw | `pbx_legacyimpactjson` | Texto multilínea para reconstrucción exacta |
| `category` | `pbx_category` | Choice `pbx_ideacategory` |
| `impactsQuality` | `pbx_impactsquality` | Yes/No |
| `impactsSafety` | `pbx_impactssafety` | Yes/No |
| `requiresMaintenance` | `pbx_requiresmaintenance` | Yes/No |
| `requiresExternalSupport` | `pbx_requiresexternalsupport` | Yes/No |
| `externalSupportDetails` | `pbx_externalsupportdetails` | Texto multilínea |
| `priority` | `pbx_priority` | Choice `pbx_priority` |
| `classification` | `pbx_classification` | Choice `pbx_classification` |
| `status` | `pbx_status` | Choice `pbx_ideastatus` |
| `supervisorId` | `pbx_supervisor` | Lookup opcional a `pbx_userprofile` |
| `implementationOwnerId` | `pbx_implementationowner` | Lookup opcional a `pbx_userprofile` |
| `dueDate` | `pbx_duedate` | Date Only condicionado por validación previa |
| `requiresEvidence` | `pbx_requiresevidence` | Yes/No |
| `implementedAt` | `pbx_implementedat` | Fecha y hora |
| `closedAt` | `pbx_closedat` | Fecha y hora |
| `pointsAssigned` | `pbx_pointsassigned` | Whole Number, mínimo 0 |
| `rejectionReason` | `pbx_rejectionreason` | Texto multilínea |
| `moreInfoRequest` | `pbx_moreinforequest` | Texto multilínea |
| `mcComments` | `pbx_mccomments` | Texto multilínea |
| `escalationRuleId` | `pbx_escalationrule` | Lookup opcional a `pbx_orgescalationrule` |
| `submitterPosition` | `pbx_submitterposition` | Texto 200 |
| `participantId` | `pbx_participant` | Lookup opcional a `pbx_participant` |

La combinación de nombre/correo/empleado capturada en la idea se conserva aunque exista lookup a participante; representa la fotografía al momento del envío y no debe sobrescribirse con datos maestros posteriores.

#### `pbx_approval` — origen `Approval`

`pbx_name` calculado como folio + tipo; `pbx_idea` Lookup obligatorio; `pbx_type` Choice `pbx_approvaltype`; `pbx_assignedto` Lookup opcional a `pbx_userprofile`; `pbx_status` Choice `pbx_approvalstatus`; `pbx_decision` Choice `pbx_approvaldecision`; `pbx_comments` Texto multilínea; `pbx_decidedat` Fecha y hora. Clave alterna: idea + tipo.

`status` y `decision` se validan como pareja: `PENDING` no puede tener decisión o fecha; una decisión final debe tener `decidedAt`. Las excepciones históricas se preservan, se marcan y no se “corrigen” sin acta.

#### `pbx_ideasupportrequest` — origen `IdeaSupportRequest`

`pbx_idea` Lookup obligatorio; `pbx_orgunit` Lookup obligatorio; `pbx_assignedto` Lookup opcional a perfil; `pbx_status` Choice `pbx_approvalstatus`; `pbx_decision` Choice `pbx_approvaldecision`; `pbx_comments` Texto multilínea; `pbx_decidedat`, `pbx_activatedat` Fecha y hora. Clave alterna: idea + unidad.

#### `pbx_ideafollower` — origen `IdeaFollower`

`pbx_idea` y `pbx_userprofile` son lookups obligatorios; `pbx_createdbyprofile` lookup opcional; `pbx_label` Texto 100, predeterminado “Seguimiento”. Clave alterna: idea + perfil.

#### `pbx_ideaattachment` — origen `Attachment`

`pbx_idea` Lookup obligatorio; `pbx_type` Choice `pbx_evidencetype` limitado a `BEFORE`, `AFTER`, `OTHER`; `pbx_filename` Texto 255; `pbx_legacyfilepath` Texto 1,000; `pbx_uploadedbytext` Texto 200; `pbx_uploadedbyprofile` Lookup opcional; `pbx_sharepointurl` URL; `pbx_contenthash` Texto 64; `pbx_filesize` Big Integer; `pbx_mimetype` Texto 150; `pbx_copystatus` Choice (`PENDING`, `COPIED`, `VERIFIED`, `ERROR`).

#### `pbx_ideacomment` — origen `Comment`

`pbx_idea` Lookup obligatorio; `pbx_userprofile` Lookup opcional; `pbx_comment` Texto multilínea. Los comentarios históricos se vuelven de sólo lectura después de la carga.

#### `pbx_pointrule` — origen `PointRule`

`pbx_name` Texto 200; `pbx_description` Texto multilínea; `pbx_points` Whole Number; `pbx_active` Yes/No. No se crea clave por nombre porque Prisma no declara unicidad y podría haber reglas homónimas históricas.

#### `pbx_ideapointrule` — origen `IdeaPointRule`

`pbx_idea` Lookup obligatorio; `pbx_pointrule` Lookup obligatorio; `pbx_points` Whole Number; clave alterna idea + regla. El valor de puntos se conserva en la unión como fotografía histórica aunque cambie la regla maestra.

#### `pbx_ideasubmission` — tabla nueva de Power Pages

`pbx_submissionid` Texto 64 generado en cliente/servidor, clave alterna; `pbx_receivedat` Fecha y hora; campos de captura equivalentes a colaborador, área, turno, problema, propuesta, beneficio e impactos; `pbx_consent` Yes/No; `pbx_validationstatus` Choice; `pbx_promotedidea` Lookup opcional; `pbx_errorcode` y `pbx_errordetail` restringidos.

La cuenta anónima sólo recibe permiso **Create** y nunca Read/Update/Delete. Un plug-in o Custom API valida, elimina contenido peligroso, resuelve el área, crea la idea y devuelve únicamente un acuse opaco. Power Automate puede notificar después, pero no es la barrera de seguridad.

### 4.3 Capacitación y ProbocaCoins

#### `pbx_trainingprogram` — origen `TrainingProgram`

`pbx_name` Texto 200 y clave alterna; `pbx_description` Texto multilínea; `pbx_coinvalue` Whole Number mínimo 0; `pbx_active` Yes/No; `pbx_createdbyprofile` Lookup obligatorio a perfil.

#### `pbx_trainingsession` — origen `TrainingSession`

`pbx_name` generado con programa + fecha; `pbx_program` Lookup obligatorio; `pbx_plant` y `pbx_orgunit` lookups opcionales; `pbx_sessiondate` Date Only/Fecha y hora según validación; `pbx_trainername` Texto 200; `pbx_notes` Texto multilínea; `pbx_createdbyprofile` Lookup obligatorio.

#### `pbx_trainingenrollment` — origen `TrainingEnrollment`

`pbx_session` y `pbx_participant` lookups obligatorios; `pbx_status` Choice `pbx_trainingenrollmentstatus`; `pbx_coinsawarded` Whole Number mínimo 0; `pbx_completedat` Fecha y hora. Clave alterna sesión + participante.

#### `pbx_cointransaction` — origen `CoinTransaction`

| Origen | Destino | Tipo / regla |
|---|---|---|
| `reference` | `pbx_reference` | Texto 200, primary name y clave alterna |
| `participantId` | `pbx_participant` | Lookup obligatorio; Delete = Restrict |
| `type` | `pbx_type` | Choice `pbx_cointransactiontype` |
| `sourceType` | `pbx_sourcetype` | Choice `pbx_coinsourcetype` |
| `sourceId` | `pbx_legacysourceid` | Texto 64, siempre preservado |
| `sourceId` resuelto | `pbx_sourceidea`, `pbx_sourcekaizen`, `pbx_sourcegenba`, `pbx_sourcetrainingenrollment` | Lookups opcionales, exactamente uno para fuente no manual cuando el origen exista |
| origen eliminado | `pbx_sourceorphaned` | Yes/No; permite conservar movimientos cuyo expediente fue eliminado legítimamente |
| `amount` | `pbx_amount` | Whole Number firmado, distinto de 0 |
| `description` | `pbx_description` | Texto multilínea, obligatorio |
| `correctionReason` | `pbx_correctionreason` | Texto multilínea |
| `reversalOfId` | `pbx_reversalof` | Lookup propio opcional, único cuando no es nulo |
| `createdById` | `pbx_createdbyprofile` | Lookup opcional |
| `occurredAt` | `pbx_occurredat` | Fecha y hora, obligatorio |

Reglas síncronas, dentro de la misma transacción:

- `AWARD` > 0; `REDEMPTION` < 0; `ADJUSTMENT` puede ser positivo o negativo, nunca 0.
- Un movimiento creado no se edita ni se borra. Una corrección crea un `ADJUSTMENT` con nueva referencia.
- Una reversión sólo puede apuntar a un movimiento, debe ser por el importe opuesto y la referencia origen sólo puede tener una reversión.
- El saldo disponible se valida antes del canje y se actualiza la caché del participante bajo control de concurrencia.
- La referencia de una operación externa debe ser determinista. Un reintento con la misma referencia y mismo contenido devuelve el movimiento existente; con contenido distinto falla.
- Para `MANUAL`, el origen tipado es nulo. Para fuentes eliminadas, se conserva `pbx_legacysourceid` y se marca `pbx_sourceorphaned`; no se inventa un expediente.

### 4.4 Kaizen

#### `pbx_kaizenproject` — origen `KaizenProject`

`pbx_number` Whole Number (clave alterna), `pbx_folio` Texto 50 (primary name y clave alterna), `pbx_legacyfolio` Texto 100, `pbx_title` Texto 300, `pbx_planttext` Texto 200, `pbx_plant` Lookup opcional resuelto, `pbx_areatext` Texto 300, `pbx_objective` Texto multilínea, `pbx_scope` Texto multilínea, `pbx_baselinevalue`, `pbx_targetvalue`, `pbx_currentvalue` Decimal, `pbx_unit` Texto 50, `pbx_estimatedsavings`, `pbx_realsavings` Currency, `pbx_status` Choice `pbx_kaizenstatus`, `pbx_startdate`, `pbx_enddate` Date Only condicionado, `pbx_closedat` Fecha y hora, `pbx_closurenote` Texto multilínea, `pbx_closedbyprofile`, `pbx_leader`, `pbx_createdbyprofile` lookups a perfil, `pbx_sourceidea` Lookup opcional y único, `pbx_orgunit` Lookup opcional.

Reglas: fin >= inicio; cierre y nota coherentes con estado; `sourceIdea` máximo en un proyecto. Los textos `plant` y `area` se conservan aunque se resuelvan lookups, porque son fotografía histórica.

#### `pbx_kaizenteammember` — origen `KaizenTeamMember`

`pbx_project` y `pbx_userprofile` lookups obligatorios; `pbx_roletext` Texto 100; `pbx_rewardamount` Whole Number; `pbx_rewardreason` Texto multilínea; `pbx_rewarddecidedat` Fecha y hora. Clave alterna proyecto + perfil.

#### `pbx_kaizenactivity` — origen `KaizenActivity`

`pbx_project` Lookup obligatorio; `pbx_number` Whole Number; `pbx_problem` Texto multilínea; `pbx_action` Texto multilínea obligatorio; `pbx_ownerprofile` Lookup opcional; `pbx_startdate`, `pbx_duedate` Date Only condicionado; `pbx_status` Choice `pbx_workitemstatus`; `pbx_completionnote`, `pbx_cancellationreason` Texto multilínea; `pbx_closedat` Fecha y hora; `pbx_mergedinto` lookup propio opcional; `pbx_mergereason` Texto multilínea; `pbx_sourcegenbaactivity` Lookup opcional y único. Clave alterna proyecto + número.

Se valida que `mergedInto` pertenezca al mismo proyecto, no apunte a sí misma y no forme ciclos. La actividad GENBA origen sólo puede promoverse una vez.

#### `pbx_kaizenattachment` — origen `KaizenAttachment`

`pbx_project` Lookup obligatorio; `pbx_activity` Lookup opcional; `pbx_type` Choice `pbx_evidencetype` limitado a `CHARTER`, `EVIDENCE`, `OTHER`; y las mismas columnas documentales de `pbx_ideaattachment`. Se valida que la actividad pertenezca al proyecto.

#### `pbx_kaizenupdate` — origen `KaizenUpdate`

`pbx_project` Lookup obligatorio; `pbx_activity` Lookup opcional; `pbx_userprofile` Lookup opcional; `pbx_comment` Texto multilínea. Se valida pertenencia de actividad a proyecto. Histórico de sólo lectura.

### 4.5 GENBA

#### `pbx_genbawalk` — origen `GenbaWalk`

`pbx_number` Whole Number (clave alterna); `pbx_folio` Texto 50 (primary name y clave alterna); `pbx_legacyfolio` Texto 100; `pbx_areaname` Texto 300; `pbx_visitdate` Date Only condicionado; `pbx_legacyexpectedjson`, `pbx_legacyattendedjson` Texto multilínea; `pbx_notes` Texto multilínea; `pbx_status` Choice `pbx_genbastatus`; `pbx_coordinator`, `pbx_createdbyprofile` lookups obligatorios a perfil; `pbx_orgunit` Lookup opcional; `pbx_closedat` Fecha y hora.

Los arreglos de departamentos no permanecen como texto operativo: se descomponen en `pbx_genbaattendance` y el JSON se conserva sólo como respaldo reversible.

#### `pbx_departmentcatalog` — tabla nueva

`pbx_code` Texto 100, clave alterna; `pbx_name` Texto 200; `pbx_active` Yes/No; `pbx_sortorder` Whole Number. Valores iniciales: Calidad/Inocuidad, Mantenimiento, Producción, Seguridad, Mejora Continua, Almacén y Supervisión. Los valores mojibake detectados se corrigen sólo después de comparar bytes/Unicode y se conserva el JSON original.

#### `pbx_genbaattendance` — tabla nueva

`pbx_walk` Lookup obligatorio; `pbx_department` Lookup obligatorio; `pbx_expected` Yes/No; `pbx_attended` Yes/No. Clave alterna recorrido + departamento. Regla: `attended = true` exige `expected = true`.

#### `pbx_genbaactivity` — origen `GenbaActivity`

`pbx_walk` Lookup obligatorio; `pbx_number` Whole Number; `pbx_problem` Texto multilínea obligatorio; `pbx_action` Texto multilínea; `pbx_ownerprofile` Lookup opcional; `pbx_duedate` Date Only condicionado; `pbx_status` Choice `pbx_workitemstatus`; `pbx_completionnote`, `pbx_cancellationreason` Texto multilínea; `pbx_closedat` Fecha y hora; `pbx_mergedinto` lookup propio opcional; `pbx_mergereason` Texto multilínea. Clave alterna recorrido + número.

Se valida que `mergedInto` pertenezca al mismo recorrido, no sea autorreferencia y no forme ciclos. La relación inversa con Kaizen se obtiene desde `pbx_kaizenactivity.pbx_sourcegenbaactivity`; no se duplica una segunda fuente de verdad.

#### `pbx_genbaattachment` — origen `GenbaAttachment`

`pbx_walk` Lookup obligatorio; `pbx_activity` Lookup opcional; `pbx_type` Choice `pbx_evidencetype` limitado a `EVIDENCE`, `OTHER`; y las columnas documentales comunes. Se valida que la actividad pertenezca al recorrido.

#### `pbx_genbaupdate` — origen `GenbaUpdate`

`pbx_walk` Lookup obligatorio; `pbx_activity` Lookup opcional; `pbx_userprofile` Lookup opcional; `pbx_comment` Texto multilínea. Se valida pertenencia y queda de sólo lectura al migrarse.

### 4.6 Operación técnica e historial

#### `pbx_notificationoutbox` — origen `NotificationOutbox`

`pbx_idea` Lookup opcional; `pbx_channel` Choice `pbx_notificationchannel`; `pbx_recipient` Texto 500; `pbx_subject` Texto 500; `pbx_body` Texto multilínea; `pbx_status` Choice `pbx_notificationstatus`; `pbx_errormessage` Texto multilínea; `pbx_sentat` Fecha y hora; `pbx_eventkey` Texto 200 y clave alterna para eventos nuevos; `pbx_dispatchsuppressed` Yes/No.

Todas las filas históricas se importan con `pbx_dispatchsuppressed = true`, incluso si su estado era `PENDING` o `ERROR`. Sólo una decisión de negocio puede reencolarlas. Los flujos nuevos disparan únicamente cuando `dispatchsuppressed = false`, `status = PENDING` y existe `eventkey`.

#### `pbx_legacyauditlog` — origen `AuditLog`

`pbx_entityname` Texto 100; `pbx_entitylegacyid` Texto 100; `pbx_action` Texto 150; `pbx_userprofile` Lookup opcional; `pbx_detailsjson` Texto multilínea; `pbx_detailsvalidjson` Yes/No. Esta tabla preserva el historial anterior y es inmutable. En paralelo se habilita auditoría nativa de Dataverse para cambios posteriores.

#### `pbx_setting` — origen `Setting`

`pbx_key` Texto 200, primary name y clave alterna; `pbx_value` Texto multilínea. Los secretos no se guardan aquí: se reemplazan por referencias a variables de entorno/connection references o Azure Key Vault, y el valor fuente queda sólo en el respaldo seguro si contiene credenciales.

#### `pbx_migrationrun`

`pbx_runid` Texto 64, clave alterna; `pbx_name`; `pbx_sourceenvironment`; `pbx_startedat`, `pbx_completedat`; `pbx_status`; `pbx_sourcebackuphash`; `pbx_filemanifesthash`; `pbx_solutionversion`; `pbx_totalread`, `pbx_totalupserted`, `pbx_totalfailed`; `pbx_cutoverwatermark`; `pbx_notes`. Organización-owned y sólo visible al equipo de migración.

#### `pbx_migrationexception`

`pbx_run` Lookup; `pbx_entityname`; `pbx_legacyid`; `pbx_rulecode`; `pbx_severity`; `pbx_payloadhash`; `pbx_payloadredacted`; `pbx_resolutionstatus`; `pbx_resolutionnote`; `pbx_resolvedby`; `pbx_resolvedat`. Clave alterna `run + entity + legacyid + rulecode`. Nunca almacenar contraseñas, tokens ni el contenido binario del archivo.

## 5. Choices globales y códigos estables

Los códigos numéricos se fijan en la solución administrada y no se regeneran entre ambientes. Se propone el rango desde `100000000` en el orden mostrado para cada Choice.

| Choice | Valores lógicos, en orden |
|---|---|
| `pbx_role` | `ADMIN`, `MEJORA_CONTINUA`, `SUPERVISOR`, `CALIDAD`, `SEGURIDAD`, `MANTENIMIENTO`, `COLABORADOR` |
| `pbx_ideastatus` | `REGISTRADA`, `EN_REVISION_SUPERVISOR`, `RECHAZADA_SUPERVISOR`, `SOLICITUD_INFORMACION`, `APROBADA_SUPERVISOR`, `EN_VALIDACION_CALIDAD`, `EN_VALIDACION_SEGURIDAD`, `EN_VALIDACION_MANTENIMIENTO`, `RECHAZADA_VALIDACION`, `APROBADA_PARA_IMPLEMENTAR`, `CLASIFICACION_MEJORA_CONTINUA`, `EN_IMPLEMENTACION`, `IMPLEMENTADA`, `EN_VALIDACION_FINAL`, `CERRADA`, `CANCELADA`, `VENCIDA` |
| `pbx_priority` | `BAJA`, `MEDIA`, `ALTA`, `CRITICA` |
| `pbx_ideacategory` | `A`, `B`, `C` |
| `pbx_classification` | `IDEA_RAPIDA`, `ACCION_MANTENIMIENTO`, `KAIZEN`, `PROYECTO_DMAIC`, `PLAN_ACCION`, `CINCO_S_GESTION_VISUAL`, `SEGURIDAD`, `CALIDAD_INOCUIDAD`, `NO_VIABLE` |
| `pbx_approvaltype` | `SUPERVISOR`, `CALIDAD`, `SEGURIDAD`, `MANTENIMIENTO`, `MEJORA_CONTINUA_FINAL` |
| `pbx_approvalstatus` | `PENDING`, `APPROVED`, `REJECTED`, `MORE_INFO` |
| `pbx_approvaldecision` | `APROBAR`, `RECHAZAR`, `SOLICITAR_INFORMACION` |
| `pbx_notificationchannel` | `EMAIL`, `TEAMS`, `LOCAL` |
| `pbx_notificationstatus` | `PENDING`, `SENT`, `ERROR`, `DISMISSED` |
| `pbx_kaizenstatus` | `PENDIENTE_CHARTER`, `PLANIFICACION`, `EN_CURSO`, `EN_PAUSA`, `COMPLETADO`, `CANCELADO` |
| `pbx_workitemstatus` | `PENDIENTE`, `EN_PROCESO`, `BLOQUEADA`, `COMPLETADA`, `CANCELADA`, `COMBINADA` |
| `pbx_genbastatus` | `ABIERTO`, `CERRADO`, `CANCELADO` |
| `pbx_orgunittype` | `MACROPROCESO`, `DEPARTAMENTO`, `AREA`, `PROCESO` |
| `pbx_trainingenrollmentstatus` | `REGISTERED`, `COMPLETED`, `CANCELLED` |
| `pbx_cointransactiontype` | `AWARD`, `ADJUSTMENT`, `REDEMPTION` |
| `pbx_coinsourcetype` | `IDEA`, `KAIZEN`, `GENBA`, `TRAINING`, `MANUAL` |
| `pbx_evidencetype` | `BEFORE`, `AFTER`, `CHARTER`, `EVIDENCE`, `OTHER` |
| `pbx_shift` | `MATUTINO`, `VESPERTINO`, `NOCTURNO`, `MIXTO`, `ADMINISTRATIVO` |
| `pbx_impacttype` | `SEGURIDAD`, `CALIDAD_INOCUIDAD`, `ENTREGA`, `COSTO`, `MORAL`, `PRODUCTIVIDAD`, `CINCO_S`, `ERGONOMIA`, `MEDIO_AMBIENTE` |
| `pbx_recordorigin` | `LEGACY`, `NATIVE`, `INTEGRATION` |

No se reutilizarán choices de estados distintos aunque compartan etiquetas; mezclar `ApprovalStatus`, `IdeaStatus` y `WorkItemStatus` permitiría combinaciones inválidas.

### 5.1 Valores predeterminados para registros nativos

La migración siempre enviará valores explícitos; estos defaults aplican sólo a registros creados después del corte:

| Tabla/campo | Predeterminado |
|---|---|
| perfiles, áreas, plantas, unidades, membresías, participantes, programas y reglas: `pbx_active` | `true` |
| perfil: `pbx_kaizenaccess`, `pbx_genbaaccess` | `false` |
| unidad: `pbx_qrenabled`, `pbx_issupportarea` | `false` |
| unidad/membresía/regla: `pbx_sortorder`, nivel y flags de capacidad | `0` / `false` |
| idea: categoría, estado, evidencia y puntos | `A`, `EN_REVISION_SUPERVISOR`, `true`, `0` |
| idea: impactos/soportes booleanos | `false` |
| aprobación y solicitud de soporte: estado | `PENDING` |
| seguidor: etiqueta | `Seguimiento` |
| inscripción: estado y monedas | `REGISTERED`, `0` |
| notificación: estado | `PENDING` |
| proyecto Kaizen: estado | `PENDIENTE_CHARTER` |
| miembro Kaizen: rol | `Miembro` |
| actividad Kaizen/GENBA: estado | `PENDIENTE` |
| recorrido GENBA: estado | `ABIERTO` |
| evidencia GENBA: tipo | `EVIDENCE` |
| origen del registro | `NATIVE` |

## 6. Relaciones, comportamiento de borrado y claves

### 6.1 Relaciones principales

| Padre | Hijo | Cardinalidad | Comportamiento destino |
|---|---|---|---|
| `pbx_plant` | `pbx_orgunit` | 1:N | Restrict al eliminar; desactivar en lugar de borrar |
| `pbx_orgunit` | `pbx_orgunit` | 1:N jerárquica | Quitar vínculo sólo mediante validación de ciclos |
| `pbx_area` | `pbx_idea` | 1:N | Restrict |
| `pbx_userprofile` | áreas, ideas, aprobaciones, actividades y auditoría | 1:N por rol de relación | Restrict o Set Null según obligatoriedad; nunca Cascade Delete |
| `pbx_orgunit` | membresías, reglas, solicitudes y participantes | 1:N | Restrict |
| `pbx_orgmembership` | `pbx_orgmembership` | 1:N jerárquica | Set Null controlado al desactivar manager |
| `pbx_idea` | aprobaciones, soporte, seguidores, comentarios, evidencias y reglas de puntos | 1:N | Restrict en producción; archivado conjunto |
| `pbx_idea` | `pbx_kaizenproject` | 1:0..1 | Set Null bloqueado salvo operación administrativa auditada |
| `pbx_participant` | inscripciones y movimientos de moneda | 1:N | Restrict absoluto si hay libro mayor |
| `pbx_trainingprogram` | `pbx_trainingsession` | 1:N | Restrict |
| `pbx_trainingsession` | `pbx_trainingenrollment` | 1:N | Restrict después de entregar monedas |
| `pbx_kaizenproject` | equipo, actividades, evidencias y actualizaciones | 1:N | Restrict; archivar conjunto |
| `pbx_kaizenactivity` | sí misma (`mergedInto`) | N:1 | Restrict y detección de ciclos |
| `pbx_genbawalk` | actividades, asistencia, evidencias y actualizaciones | 1:N | Restrict; archivar conjunto |
| `pbx_genbaactivity` | sí misma (`mergedInto`) | N:1 | Restrict y detección de ciclos |
| `pbx_genbaactivity` | `pbx_kaizenactivity` | 1:0..1 | Restrict; única promoción |
| `pbx_cointransaction` | sí misma (`reversalOf`) | 1:0..1 | Restrict, inmutable |

Aunque Prisma usa varios `onDelete: Cascade`, no se replica el borrado en cascada porque la aplicación actual conserva el libro mayor aun cuando se elimina un módulo. Dataverse utilizará estados activo/inactivo y un proceso administrativo de retención. Esto reduce el riesgo de que una acción de mantenimiento borre evidencia, auditoría o monedas.

### 6.2 Claves alternas obligatorias

Además de `pbx_legacyid` en cada tabla migrada:

- `pbx_userprofile(pbx_email)`, `(pbx_employeenumber)` cuando no sea nulo, y unicidad de `pbx_systemuser`
- `pbx_area(pbx_code)`
- `pbx_plant(pbx_code)`
- `pbx_orgunit(pbx_code)` y unicidad de `pbx_capturearea` cuando no sea nulo
- `pbx_orgmembership(pbx_userprofile, pbx_orgunit)`
- `pbx_idea(pbx_folio)` y, para estándar, `pbx_idea(pbx_number)`
- `pbx_ideasupportrequest(pbx_idea, pbx_orgunit)`
- `pbx_ideafollower(pbx_idea, pbx_userprofile)`
- `pbx_participant(pbx_employeenumber)` cuando no sea nulo y unicidad de `pbx_userprofile`
- `pbx_trainingprogram(pbx_name)`
- `pbx_trainingenrollment(pbx_session, pbx_participant)`
- `pbx_cointransaction(pbx_reference)` y unicidad de `pbx_reversalof` cuando no sea nulo
- `pbx_approval(pbx_idea, pbx_type)`
- `pbx_ideapointrule(pbx_idea, pbx_pointrule)`
- `pbx_setting(pbx_key)`
- `pbx_kaizenproject(pbx_number)`, `(pbx_folio)` y unicidad de `pbx_sourceidea` cuando no sea nulo
- `pbx_kaizenteammember(pbx_project, pbx_userprofile)`
- `pbx_kaizenactivity(pbx_project, pbx_number)` y unicidad de `pbx_sourcegenbaactivity`
- `pbx_genbawalk(pbx_number)` y `(pbx_folio)`
- `pbx_genbaactivity(pbx_walk, pbx_number)`
- `pbx_genbaattendance(pbx_walk, pbx_department)`

La unicidad de lookups opcionales (`reversalOf`, `sourceIdea`, `sourceGenbaActivity`, `captureArea`, perfil-sistema) debe probarse en un sandbox. Si una clave alterna de Dataverse no aplica la restricción deseada sobre nulos/lookups, un plug-in PreOperation síncrono la impondrá y se respaldará con pruebas concurrentes.

### 6.3 Consultas de rendimiento que deben probarse

Dataverse indexa claves alternas y lookups, pero no se asumirá que reproduce todos los `@@index` de Prisma. Las pruebas de carga deben cubrir:

- ideas por estado/fecha, área/fecha y supervisor/estado;
- membresías por unidad/nivel/activo y por manager;
- solicitudes por asignado/estado;
- proyectos por estado/cierre;
- actividades por proyecto o recorrido y número;
- movimientos por participante/fecha, fuente/id y tipo/fecha;
- inscripciones por sesión/estado y participante/estado;
- participantes por empleado, correo, unidad/activo y nombre.

Se crearán vistas y FetchXML con columnas mínimas. Cualquier índice adicional se solicitará sólo después de medir telemetría; no se diseñará alrededor de consultas con comodín inicial ni de cargar miles de filas en Canvas Apps.

## 7. Folios: preservación, reconciliación y numeración futura

Formatos actuales observados en código:

- Ideas: `IM-` + 6 dígitos (`IM-000001`).
- Kaizen: `KZN-` + 3 dígitos (`KZN-001`) y campo `number` único.
- GENBA: `GENBA-` + 3 dígitos (`GENBA-001`) y campo `number` único.

Procedimiento:

1. Extraer `folio` exactamente, además de una forma canónica `trim + uppercase`.
2. Detectar colisiones canónicas antes de cargar. No anexar sufijos automáticamente.
3. Para folios estándar, extraer el número y comparar con `KaizenProject.number` o `GenbaWalk.number`. Toda diferencia requiere resolución registrada.
4. Los folios no estándar, demo o QA se clasifican por ambiente y regla de inclusión; nunca se mezclan silenciosamente con producción.
5. Cargar el folio histórico y su número explícitamente.
6. Configurar una secuencia distinta por módulo con siguiente valor `max(número válido incluido) + 1`.
7. Congelar escrituras en el origen antes de fijar la semilla y volver a calcular el máximo justo antes del corte.
8. Crear folio y registro en una operación transaccional. Power Automate sólo recibe el folio ya asignado.

Implementación preferida: campo Autonumber de plataforma con formato por módulo, siempre que una prueba de sandbox confirme carga explícita de folios históricos y ajuste de semilla sin sobrescritura. Alternativa: Custom API/plug-in síncrono con tabla de secuencia, control de concurrencia y reintento ante clave duplicada. Un flujo basado en `MAX + 1` queda prohibido.

No se exige continuidad sin huecos; sí unicidad, inmutabilidad y trazabilidad.

## 8. Normalización de número de empleado

La regla vigente en `src/lib/employee-number.ts` se replica exactamente:

1. `trim`.
2. Vacío -> nulo.
3. Sólo 1 a 5 dígitos.
4. Relleno a la izquierda hasta 5 posiciones.
5. `00000` es inválido.

Ejemplos: `123 -> 00123`, `00123 -> 00123`, `00000 -> excepción`, `A123 -> excepción`, `123456 -> excepción`.

La migración debe buscar colisiones **después** de normalizar. Prisma puede considerar distintos `123` y `00123`, pero ambos se convierten en `00123`. Se aplica a `User.employeeNumber`, `Participant.employeeNumber` e `Idea.employeeNumber`.

Resolución de identidad:

- un User y un Participant con el mismo empleado normalizado pueden ser la misma persona y se enlazan sólo si no existe contradicción de correo/nombre;
- múltiples Users o múltiples Participants con el mismo número normalizado bloquean la carga de esas filas;
- el correo normalizado sirve como evidencia secundaria;
- el nombre nunca es criterio automático suficiente;
- una idea con empleado inválido puede cargarse conservando `pbx_legacyemployeenumber`, pero no se enlaza automáticamente a participante;
- un participante con movimientos de ProbocaCoins no puede quedar en cuarentena al corte: debe resolverse o abortarse la migración financiera.

## 9. Reconciliación de ProbocaCoins

### 9.1 Fuente de verdad

Saldo por participante:

```text
saldo = SUM(CoinTransaction.amount)
```

`Idea.pointsAssigned`, `TrainingEnrollment.coinsAwarded` y `KaizenTeamMember.rewardAmount` son cantidades de negocio, no saldos. Se comparan contra el neto del libro mayor por `sourceType + sourceId + participant`, pero no reemplazan movimientos existentes.

### 9.2 Controles previos

Para cada movimiento:

- referencia no vacía y única;
- participante existente;
- importe entero y distinto de cero;
- signo coherente con tipo;
- `occurredAt` válido;
- reversión existente, no autorreferente, única y de importe opuesto;
- fuente tipada coherente con `sourceType`;
- origen faltante clasificado como eliminado legítimamente o como huérfano no explicado.

Para cada participante:

- saldo fuente por suma de movimientos;
- total `AWARD`, `ADJUSTMENT`, `REDEMPTION` y saldo neto;
- alerta por saldo negativo;
- comparación de identidad y empleado normalizado.

Para fuentes:

- `IDEA`: comparar neto del movimiento con `pointsAssigned` para el participante enlazado, teniendo en cuenta estado de cierre;
- `TRAINING`: comparar neto con `coinsAwarded` por inscripción completada;
- `KAIZEN`: comparar por miembro con `rewardAmount` cuando exista;
- `GENBA`: validar referencia y expediente, ya que el esquema no tiene un campo de recompensa equivalente;
- `MANUAL`: exigir descripción y autor; `sourceId` debe ser nulo salvo legado documentado.

El código actual conserva movimientos aunque se elimine una Idea, Kaizen o GENBA. Por ello, una fuente ausente no se elimina: se carga con lookup nulo, `pbx_legacysourceid` intacto y `pbx_sourceorphaned = true`, respaldada por evidencia del borrado si existe.

### 9.3 Resolución de diferencias

1. Generar reporte por participante y fuente.
2. Congelar el libro mayor del origen.
3. Resolver identidad antes de ajustar importes.
4. Si el libro mayor es correcto y el campo descriptivo está equivocado, corregir el campo mediante acta, no reescribir movimientos.
5. Si falta un movimiento, registrar un nuevo `ADJUSTMENT` de migración con referencia determinista `MIGRATION-RECON:{entidad}:{legacyId}:{versión}` y motivo aprobado.
6. Nunca editar ni borrar el movimiento original.
7. Recalcular saldo tras cada resolución y obtener aprobación de Mejora Continua/Finanzas.

Postcarga, la suma por participante, por fuente y global debe ser idéntica al origen aprobado. Diferencia tolerada: **cero monedas**.

## 10. Estrategia de archivos y evidencias

Los binarios se almacenarán en SharePoint; Dataverse conservará metadatos y relaciones. Ruta determinista propuesta:

```text
/PROpEx/{Planta}/{Módulo}/{Folio}/{LegacyAttachmentId}/{NombreSanitizado}
```

Proceso:

1. Inventariar cada `path` de `Attachment`, `KaizenAttachment` y `GenbaAttachment`.
2. Resolver la ruta bajo raíces permitidas; rechazar traversal (`..`) o destinos externos.
3. Calcular SHA-256 y tamaño antes de copiar.
4. Copiar, sin mover ni borrar, usando el `legacyId` para que el reintento sea idempotente.
5. Verificar existencia, tamaño y hash en destino.
6. Crear/actualizar la fila de metadatos sólo con estado `VERIFIED` después de la comprobación.
7. Conservar nombre original y MIME; sanitizar únicamente el nombre físico de SharePoint.
8. Poner faltantes, hash distinto y archivos ilegibles en `pbx_migrationexception`.
9. Ejecutar antivirus/DLP y definir retención antes del go-live.

Los permisos de Dataverse no protegen automáticamente SharePoint. Los sitios/bibliotecas deben segmentarse por planta o sensibilidad y alinearse con los equipos propietarios. Los usuarios anónimos de Power Pages nunca reciben acceso directo a la biblioteca.

## 11. Ownership, seguridad y auditoría

### 11.1 Unidades de negocio y equipos

- Business Unit raíz: PROpEx.
- Business Unit por planta si la organización exige aislamiento legal/operativo.
- Equipos propietarios: Mejora Continua por planta, Supervisores por área, Calidad, Seguridad, Mantenimiento y Administración PROpEx.
- El propietario de una Idea/Kaizen/GENBA y de sus hijos será el mismo equipo operativo. Un plug-in o proceso controlado alinea hijos; no se confía en compartir filas manualmente.
- Participantes, catálogos, perfiles y configuración son Organization-owned; los campos sensibles se protegen con Field Security Profiles.

### 11.2 Roles mínimos

| Rol | Alcance resumido |
|---|---|
| PROpEx Admin | Configuración y datos de PROpEx; no otorgar System Administrator salvo personal de plataforma |
| Mejora Continua | Lectura organizacional de operación; creación/cierre de proyectos y monedas según privilegio |
| Supervisor | Lectura/escritura de ideas y actividades de su equipo/área |
| Calidad / Seguridad / Mantenimiento | Lectura de contexto y escritura sólo en aprobaciones/solicitudes asignadas |
| Colaborador | Crear y leer sus propios envíos/actividades; sin acceso general al libro mayor |
| Finanzas ProbocaCoins | Leer libro mayor, canjear/ajustar mediante Custom API; sin Update/Delete directo |
| Migración | Temporal, mínimo requerido; se retira al finalizar |
| Aplicación/Flows | Application User con permisos específicos a outbox y procesos autorizados |

Campos con seguridad reforzada: empleado, correo personal, saldo/cantidades de monedas, ahorros, razones de corrección y detalles de excepción.

### 11.3 Auditoría

Habilitar auditoría de ambiente y de tabla en: Idea, Approval, solicitudes de soporte, proyectos/actividades Kaizen, recorridos/actividades GENBA, entrenamientos, participantes y CoinTransaction. Auditar especialmente estado, propietario, responsable, fechas, puntos, importes, reversión, fuente, permisos y campos de cierre.

`pbx_legacyauditlog` no sustituye la auditoría nativa; conserva el pasado. Los flujos y Custom APIs deben propagar correlation ID/event key para ligar auditoría, notificación y operación de negocio.

## 12. Orden de carga e idempotencia

Cada fase termina con conteo, checksum y reporte de excepciones antes de continuar.

1. **Preparación:** respaldo consistente de DB y archivos; manifiesto con hashes; exportación de choices; creación de `pbx_migrationrun`; desactivar flows, plug-ins de notificación y reglas que generen monedas durante carga.
2. **Identidades:** sincronizar `systemuser`; cargar `pbx_userprofile` sin lookup cuando no haya coincidencia; revisar mapeos.
3. **Organización, paso 1:** plantas y áreas sin supervisor; unidades sin parent/routing/captureArea.
4. **Organización, paso 2:** actualizar supervisor, parent, routingUser y captureArea; cargar membresías sin manager y luego enlazar jerarquía; cargar reglas de escalación.
5. **Personas y catálogos:** participantes y enlaces a perfil; reglas de puntos; programas de capacitación; catálogo de departamentos; settings no secretos.
6. **Ideas base:** Ideas sin hijos y con sus lookups resueltos.
7. **Hijos de Ideas:** aprobaciones, soporte, seguidores, comentarios, reglas de puntos y metadatos de evidencia.
8. **Padres operativos:** proyectos Kaizen y recorridos GENBA, inicialmente sin referencias cruzadas opcionales.
9. **Actividades, paso 1:** actividades Kaizen y GENBA sin `mergedInto` ni promoción.
10. **Actividades, paso 2:** resolver merges, GENBA->Kaizen, equipos, actualizaciones, asistencias y metadatos de evidencias.
11. **Capacitación:** sesiones e inscripciones.
12. **Libro mayor:** CoinTransaction sin reversión en primera pasada; resolver lookups de fuente y reversión en segunda; recalcular caché de saldo.
13. **Histórico técnico:** AuditLog y NotificationOutbox con despacho suprimido.
14. **Archivos:** copiar y verificar binarios; actualizar estado documental.
15. **Validación integral:** reconciliación, pruebas de seguridad, rendimiento y negocio.
16. **Corte:** congelar origen, extraer delta desde watermark, repetir upserts, recalcular máximos/semillas, validar cero diferencias y recién entonces activar automatizaciones.

Reglas de ejecución:

- Upsert por `pbx_legacyid`; para filas nuevas/integraciones, por su clave de negocio/event key.
- El payload canónico y `pbx_sourcechecksum` determinan si el reintento es no-op o actualización.
- Toda llamada externa usa correlation ID y política de reintento limitada.
- Los lotes guardan checkpoint por tabla y página.
- Una fila fallida no se “salta” sin registrarse. Las tablas financieras y sus participantes exigen cero excepciones abiertas.
- Los plug-ins de negocio distinguen `pbx_origin = LEGACY` y sólo omiten efectos secundarios autorizados; no omiten integridad referencial.
- Al finalizar se retira el privilegio de migración y se reactiva lógica en orden controlado.

## 13. Validaciones previas y posteriores

### 13.1 Antes de cargar

- Conteo por cada uno de los 31 modelos y distribución por estado/tipo.
- PK no nula y única; comprobación de todas las `@unique` y `@@unique`.
- Reporte de FKs huérfanas, separado de `CoinTransaction.sourceId` huérfano permitido por borrado histórico.
- Ciclos en OrgUnit, OrgMembership, KaizenActivity y GenbaActivity.
- Actividad de evidencia/actualización perteneciente al mismo proyecto o recorrido indicado.
- JSON de impactos y departamentos parseable, arreglos de strings, sin duplicados y con valores conocidos.
- `attendedDepartments` subconjunto de `expectedDepartments`.
- Números de empleado válidos, normalizados y sin colisión.
- Correos normalizados y colisiones por identidad.
- Folios exactos, canónicos, formato, número asociado y máximos por módulo.
- Fechas válidas: fin >= inicio, cierres/decisiones coherentes y prueba de componentes de hora.
- Archivos existentes, legibles, dentro de raíz permitida, con tamaño y SHA-256.
- Libro mayor completo: referencias, signos, fuentes, reversiones, saldos y comparaciones por fuente.
- Valores Decimal/Currency dentro del rango de Dataverse.
- Detección de secretos en `Setting`, notificaciones, auditoría y comentarios antes de exportarlos.

### 13.2 Después de cada fase

- Conteo fuente = destino + excepciones aprobadas, por tabla.
- Unicidad de `pbx_legacyid` y claves de negocio.
- Checksum de todos los escalares mapeados.
- Conteo de relaciones por FK y de nulos por columna.
- Distribución de Choices idéntica al origen.
- Para textos, comparación Unicode y muestreo específico de acentos/mojibake.
- Para archivos, conteo, tamaño total y hash individual.
- Para folios, conjunto exacto y siguiente número probado bajo concurrencia.
- Para monedas, suma por movimiento, participante, fuente, tipo y global; tolerancia cero.
- Prueba de reversión y canje concurrente sin sobregiro.
- Pruebas de permisos positivas y negativas para cada rol.
- Confirmación de que ninguna notificación histórica fue enviada.
- Prueba de exportación de regreso al formato Prisma/CSV sobre una muestra y comparación con el origen.

### 13.3 Criterios de no-go

No se autoriza el corte con cualquiera de estas condiciones:

- participante con saldo y sin identidad resuelta;
- diferencia distinta de cero en ProbocaCoins;
- colisión de folio o empleado normalizado;
- archivo obligatorio faltante sin dispensa firmada;
- FK crítica huérfana no explicada;
- flujo histórico capaz de reenviar notificaciones;
- permiso anónimo con Read/Update/Delete;
- prueba de concurrencia de folios, canjes o reversiones fallida;
- rollback no ensayado en un ambiente aislado.

## 14. Rollback y reversibilidad

### 14.1 Antes del go-live

1. Crear respaldo inmutable de PostgreSQL/SQLite y del repositorio de archivos.
2. Registrar hashes, cantidad de filas, versión de esquema y watermark.
3. Mantener el sistema fuente en sólo lectura; no eliminarlo ni rotar todavía sus secretos de recuperación.
4. Etiquetar cada fila y archivo destino con `migrationrun`.

Si una carga de ensayo falla, se elimina únicamente el conjunto identificado por ese run, en orden inverso de dependencias y dentro del ambiente de migración. Antes de eliminar se verifica el ID exacto del ambiente y del run. Los archivos se mueven a una cuarentena recuperable, no se destruyen.

### 14.2 Después del go-live

No se restaura simplemente el respaldo, porque perdería operaciones creadas en Power Platform. El rollback operativo requiere:

1. Detener captura y automatizaciones en Dataverse.
2. Exportar desde el watermark todos los cambios nativos, auditoría y movimientos financieros.
3. Transformar el delta a un esquema staging compatible con Prisma, incluyendo el mapa GUID <-> `legacyId`/external ID.
4. Aplicar el delta en un clon del origen, nunca sobre el respaldo maestro.
5. Reconciliar folios, archivos y ProbocaCoins con los mismos controles de tolerancia cero.
6. Ejecutar pruebas funcionales y de permisos.
7. Cambiar tráfico sólo con aprobación de negocio/TI y conservar Dataverse en sólo lectura para auditoría.

El mapa de IDs, los JSON originales, rutas, hashes, timestamps de fuente y folios originales hacen posible esta reversión. `passwordHash` se recupera únicamente desde el respaldo original, no desde Dataverse.

## 15. Segunda pasada de autocrítica: riesgos y resoluciones

| Riesgo identificado | Por qué importa | Resolución / gate |
|---|---|---|
| Mapear `User` directamente a `systemuser` perdería usuarios dados de baja o no presentes en Entra | Rompe responsables y auditoría histórica | `pbx_userprofile` es la identidad histórica; `systemuser` es lookup opcional |
| No migrar `passwordHash` reduce la simetría del esquema | El rollback podría requerir autenticación antigua | Respaldo cifrado e inmutable del origen; jamás copiar hashes a Dataverse |
| Normalizar empleado puede convertir `123` y `00123` en duplicados | Fusión incorrecta de personas y saldos | Reporte de colisiones y bloqueo; no fusionar por nombre |
| Folios creados con `MAX + 1` son vulnerables a concurrencia | Duplicados y transferencias mal enlazadas | Autonumber probado o Custom API transaccional; clave alterna; prueba concurrente obligatoria |
| Autonumber podría no aceptar la carga histórica como se espera en el ambiente objetivo | Puede reescribir o consumir secuencias | Spike en sandbox como gate; fallback a secuencia transaccional sin Power Automate |
| Dataverse no garantiza toda unicidad opcional con null/lookups igual que PostgreSQL | Reversiones o promociones duplicadas | Prueba de claves alternas y plug-in PreOperation de respaldo |
| Copiar `impactTypes` y asistencia como texto conservaría datos pero degradaría reporteo | Filtros y Power BI frágiles | Multi-select para impactos; tabla de asistencia; conservar JSON raw para reversión |
| Los arreglos contienen posible mojibake (`Producción`, `Almacén`, `Supervisión`) | Duplicación de choices/departamentos | Comparar Unicode/bytes, normalizar con tabla aprobada y conservar raw |
| Date Only puede perder horas existentes | Pérdida irreversible de precisión | Perfil de horas al 100 %; si existe hora significativa usar DateTime y conservar fuente |
| Currency/Decimal puede redondear `Float` | Afecta metas/ahorros | Validación de rango/escala y columna raw si un valor no cabe; cero redondeo silencioso |
| Replicar Cascade Delete de Prisma borraría evidencia y trazabilidad | Riesgo operacional y financiero alto | Restrict + desactivación/archivo; borrado físico administrativo excepcional |
| `sourceId` de monedas no es FK y puede señalar registros ya borrados | Una “limpieza” podría eliminar saldo válido | Preservar ID raw, marcar huérfano legítimo y mantener movimiento inmutable |
| `pointsAssigned`, `coinsAwarded` y `rewardAmount` pueden diferir del libro mayor | Doble conteo o saldos erróneos | Libro mayor autoritativo; ajustes sólo por acta y nueva transacción |
| Mantener saldo sólo como rollup introduce retraso | Un canje concurrente podría sobregirar | Custom API/plug-in transaccional, control de concurrencia y caché reconciliada |
| Importar outbox `PENDING` puede reenviar correos antiguos | Impacto a usuarios y reputación | `dispatchsuppressed = true` por defecto; activación explícita por evento nuevo |
| SharePoint y Dataverse no comparten automáticamente seguridad | Evidencias podrían quedar expuestas | Bibliotecas/equipos alineados, pruebas negativas y sin acceso anónimo |
| Los lookups de evidencia no garantizan por sí solos que la actividad pertenezca al mismo padre | Archivos asociados al expediente incorrecto | Validación síncrona y precheck masivo |
| AuditLog histórico no puede convertirse en auditoría nativa retroactiva | Apariencia engañosa de autoría/fecha | Tabla legacy inmutable + auditoría nativa desde el corte |
| Organization-owned en perfiles/participantes puede ampliar lectura | Datos personales visibles | Roles sin lectura indiscriminada y Field Security Profiles para PII |
| Power Automate con permisos amplios podría saltar controles | Mutaciones no trazables | Application User mínimo; operaciones críticas sólo mediante Custom API |
| Reintentos pueden duplicar efectos aunque no dupliquen filas | Correos/monedas duplicados | `legacyId`, `eventkey`, referencia determinista, checksum y correlation ID |
| Los datos QA/demo pueden elevar máximos de folio | Semilla productiva incorrecta | Clasificar ambiente/prefijo y aprobar conjunto incluido antes de calcular máximo |
| `Setting`/AuditLog/Notification puede contener secretos o PII libre | Exposición en un ambiente más amplio | Escaneo/redacción previa; secretos a connection references/Key Vault |
| Rollback posterior al corte puede perder altas nuevas | Pérdida de cambios si se restaura el backup directamente | Delta desde watermark, staging en clon y reconciliación antes de volver |

### Dictamen de la segunda pasada

El modelo es apto para construir una solución PROpEx en Dataverse **si y sólo si** se implementan primero las claves, la identidad histórica separada de Entra, la operación financiera transaccional, la supresión del outbox y el manifiesto reversible. Los elementos que requieren una prueba técnica temprana son: claves alternas con lookups opcionales, carga/semilla de Autonumber, precisión Decimal/Currency, migración de fechas y alineación de seguridad SharePoint-Dataverse.

No se recomienda comenzar por pantallas o flujos. El primer entregable ejecutable debe ser una solución Dataverse no administrada en desarrollo con choices, tablas, relaciones, claves y pruebas de concurrencia; después se promueve como solución administrada a pruebas y producción.
