# Modelo temporal de datos PROpEx sobre SharePoint

**Objetivo:** operar PROpEx temporalmente sin crear tablas Dataverse, sin privilegios de administrador de Power Platform y sin conectores premium.

**Alcance:** cubrir los 31 modelos Prisma vigentes con listas genéricas y bibliotecas de documentos de SharePoint Online, Power Apps Canvas y Power Automate con el conector estándar de SharePoint.

**Carácter de la solución:** puente reversible. No sustituye la arquitectura Dataverse definida en `01-dataverse-model.md`.

## 1. Dictamen ejecutivo

La alternativa SharePoint es viable para un piloto y para el volumen productivo exportado al 2026-08-11: **31 conjuntos y 391 filas**. La exportación local de prueba contiene 3,552 filas. Ambos volúmenes son pequeños frente a los límites físicos de SharePoint, pero el diseño debe prepararse desde el primer día para el umbral de vistas, la delegación de Power Apps y la ausencia de transacciones.

El conector de SharePoint está clasificado por Microsoft como **Standard** para Power Apps y Power Automate. Esto evita un conector premium, aunque la disponibilidad de Power Apps/Power Automate continúa dependiendo de los planes y políticas del tenant. [Referencia oficial del conector](https://learn.microsoft.com/en-us/connectors/sharepointonline/).

Esta solución requiere únicamente:

- un sitio de SharePoint Online existente y privado;
- permisos de **Site Owner** o equivalentes dentro de ese sitio para crear listas, columnas, índices y grupos;
- una cuenta funcional con licencia Microsoft 365 para ejecutar los flujos;
- Power Apps Canvas y Power Automate con conectores estándar.

No requiere ser administrador del tenant, administrador de Power Platform ni `System Customizer` de Dataverse. Si la cuenta actual no es Site Owner, el propietario del sitio debe realizar una provisión inicial; permitir que un usuario sin `Manage Lists` o `Manage Permissions` improvise el esquema no es una opción segura.

**Gate de inicio:** si ningún Site Owner puede crear las listas, romper la herencia a nivel de lista y asignar los grupos indicados, este reemplazo no debe desplegarse. Una lista personal o una lista heredada por todo el sitio expondría PII, evidencias o ProbocaCoins.

### 1.1 Lo que sí cubre

- Ideas, aprobaciones, soporte, comentarios, seguidores y puntuación.
- Proyectos y actividades Kaizen.
- Recorridos y actividades GENBA.
- Personas, estructura organizacional y rutas de escalación.
- Capacitación e inscripciones.
- Libro mayor y consulta administrativa de ProbocaCoins.
- Evidencias en bibliotecas.
- Outbox de notificaciones, auditoría histórica y configuración no secreta.
- Importación idempotente de los 31 CSV ya exportados.

### 1.2 Lo que no iguala a Dataverse

- seguridad nativa por registro, columna, Business Unit y equipo;
- relaciones con integridad referencial;
- transacciones atómicas entre tablas/listas;
- plug-ins síncronos, Custom APIs y claves alternas compuestas reales;
- aplicación model-driven, Business Process Flows y auditoría de nivel Dataverse;
- consultas relacionales y agregaciones delegables amplias;
- captura anónima directa y segura en una lista.

Cuando cualquiera de estas brechas sea un requisito obligatorio, la decisión correcta es esperar Dataverse o mantener el sistema PROpEx actual para esa función.

## 2. Arquitectura temporal

```text
Usuarios internos
      |
      v
Power Apps Canvas -----> Listas SharePoint privadas
      |                         |
      |                         +----> Bibliotecas de evidencias
      v                         |
Listas de comandos ------------+
      |
      v
Power Automate estándar -------> Outlook / Teams / conciliaciones

QR externo -> Microsoft Forms o aplicación PROpEx actual
             -> bandeja de envíos -> Ideas
```

Decisiones estructurales:

1. **No usar columnas Lookup de SharePoint como claves foráneas.** Las relaciones se guardan mediante claves de texto estables e indexadas.
2. **No usar el `ID` nativo de SharePoint como identificador de negocio.** Cambia al recrear o mover una lista.
3. **No conceder permisos únicos por cada elemento.** La seguridad se aplica por sitio, lista/biblioteca y grupos.
4. **No usar adjuntos de elementos.** Toda evidencia vive en bibliotecas con metadatos.
5. **No escribir directamente ProbocaCoins ni folios desde Canvas.** Las operaciones críticas entran por una cola de comandos persistente y un procesador secuencial.
6. **No depender de fórmulas no delegables.** Las pantallas parten de filtros delegables sobre columnas indexadas.

## 3. Convenciones comunes

### 3.1 Nombres

- Sitio propuesto: `PROpEx-Temporal` dentro del tenant existente.
- Listas: `PROpEx_<Entidad>`.
- Bibliotecas: `PROpEx_Evidencias_<Modulo>`.
- Columnas internas: prefijo `Pbx`, sin espacios ni acentos.
- Los nombres internos se fijan al crear la columna y no se renombran después.
- Todas las listas deben ser de tipo **Generic List** y las bibliotecas de tipo **Generic Document Library**, porque son las plantillas soportadas por el conector.

### 3.2 Columnas comunes en los 31 repositorios

| Columna interna | Tipo SharePoint | Regla |
|---|---|---|
| `Title` | Una línea de texto | Nombre legible; nunca se usa como FK |
| `PbxKey` | Una línea de texto, 80 | Obligatorio, `Enforce unique values`, indexado |
| `PbxLegacyId` | Una línea de texto, 64 | CUID de Prisma; indexado; puede ser vacío en altas nativas |
| `PbxOrigin` | Choice único | `LEGACY`, `NATIVE`, `INTEGRATION` |
| `PbxLifecycle` | Choice único | `ACTIVE`, `ARCHIVED`, `MIGRATION_ERROR` |
| `PbxSourceCreatedUtc` | Fecha y hora | Copia de `createdAt` |
| `PbxSourceUpdatedUtc` | Fecha y hora | Copia de `updatedAt`, cuando exista |
| `PbxChecksum` | Una línea de texto, 64 | SHA-256 de escalares canónicos |
| `PbxMigrationRunKey` | Una línea de texto, 64 | Lote de importación; indexado |
| `PbxSchemaVersion` | Número entero | Comienza en `1` |
| `PbxPartitionKey` | Una línea de texto, 80 | Sólo en listas de alto crecimiento; indexado |

`Created`, `Modified`, `Created By`, `Modified By`, versión y ETag nativos quedan habilitados, pero no sustituyen los timestamps del origen.

### 3.3 Formato de claves

- Legado: `L:<modelo>:<cuid>`.
- Nativo: `N:<guid-en-minusculas>`.
- Integración: `I:<sistema>:<id-canonico>`.
- Relación: copia exacta del `PbxKey` del padre.
- Clave compuesta: concatenación canónica con `|`, por ejemplo `IdeaKey|CALIDAD`.

Toda `PbxKey` se construye antes de la carga. Para un CUID dado, el resultado es determinista. Esto permite reintentar sin duplicar.

Las columnas que representan claves de negocio simples —folio, código, referencia de moneda, key de Setting— también usan `Enforce unique values`. Las claves compuestas se materializan en `PbxCompositeKey`, una línea de texto única e indexada, porque SharePoint no ofrece una restricción única multicolumna.

### 3.4 Relaciones sin Lookup

Una FK se representa así:

| Columna | Ejemplo |
|---|---|
| clave estable | `PbxAreaKey = L:Area:cl...` |
| etiqueta de lectura | `PbxAreaName = Empaque` |
| código de lectura | `PbxAreaCode = EMP` |

La clave mantiene la relación; nombre/código son instantáneas para evitar joins en galerías. Un flujo nocturno detecta claves huérfanas y divergencias de etiqueta. No se actualizan claves cuando cambia el nombre visible.

### 3.5 Catálogo de Choice

SharePoint no tiene Choices globales transportables como Dataverse. Cada lista repite los códigos exactos y un manifiesto de provisión controla que no haya drift. Se guarda el **código lógico**, no la etiqueta traducida; Power Apps presenta las etiquetas en español.

| Enum/Choice | Códigos permitidos |
|---|---|
| `Role` | `ADMIN`, `MEJORA_CONTINUA`, `SUPERVISOR`, `CALIDAD`, `SEGURIDAD`, `MANTENIMIENTO`, `COLABORADOR` |
| `IdeaStatus` | `REGISTRADA`, `EN_REVISION_SUPERVISOR`, `RECHAZADA_SUPERVISOR`, `SOLICITUD_INFORMACION`, `APROBADA_SUPERVISOR`, `EN_VALIDACION_CALIDAD`, `EN_VALIDACION_SEGURIDAD`, `EN_VALIDACION_MANTENIMIENTO`, `RECHAZADA_VALIDACION`, `APROBADA_PARA_IMPLEMENTAR`, `CLASIFICACION_MEJORA_CONTINUA`, `EN_IMPLEMENTACION`, `IMPLEMENTADA`, `EN_VALIDACION_FINAL`, `CERRADA`, `CANCELADA`, `VENCIDA` |
| `Priority` | `BAJA`, `MEDIA`, `ALTA`, `CRITICA` |
| `IdeaCategory` | `A`, `B`, `C` |
| `Classification` | `IDEA_RAPIDA`, `ACCION_MANTENIMIENTO`, `KAIZEN`, `PROYECTO_DMAIC`, `PLAN_ACCION`, `CINCO_S_GESTION_VISUAL`, `SEGURIDAD`, `CALIDAD_INOCUIDAD`, `NO_VIABLE` |
| `ApprovalType` | `SUPERVISOR`, `CALIDAD`, `SEGURIDAD`, `MANTENIMIENTO`, `MEJORA_CONTINUA_FINAL` |
| `ApprovalStatus` | `PENDING`, `APPROVED`, `REJECTED`, `MORE_INFO` |
| `ApprovalDecision` | `APROBAR`, `RECHAZAR`, `SOLICITAR_INFORMACION` |
| `AttachmentType` | `BEFORE`, `AFTER`, `OTHER` |
| `NotificationChannel` | `EMAIL`, `TEAMS`, `LOCAL` |
| `NotificationStatus` | `PENDING`, `SENT`, `ERROR`, `DISMISSED` |
| `KaizenStatus` | `PENDIENTE_CHARTER`, `PLANIFICACION`, `EN_CURSO`, `EN_PAUSA`, `COMPLETADO`, `CANCELADO` |
| `WorkItemStatus` | `PENDIENTE`, `EN_PROCESO`, `BLOQUEADA`, `COMPLETADA`, `CANCELADA`, `COMBINADA` |
| `GenbaStatus` | `ABIERTO`, `CERRADO`, `CANCELADO` |
| `KaizenAttachmentType` | `CHARTER`, `EVIDENCE`, `OTHER` |
| `GenbaAttachmentType` | `EVIDENCE`, `OTHER` |
| `OrgUnitType` | `MACROPROCESO`, `DEPARTAMENTO`, `AREA`, `PROCESO` |
| `TrainingEnrollmentStatus` | `REGISTERED`, `COMPLETED`, `CANCELLED` |
| `CoinTransactionType` | `AWARD`, `ADJUSTMENT`, `REDEMPTION` |
| `CoinSourceType` | `IDEA`, `KAIZEN`, `GENBA`, `TRAINING`, `MANUAL` |

Choices auxiliares: turno (`MATUTINO`, `VESPERTINO`, `NOCTURNO`, `MIXTO`, `ADMINISTRATIVO`), impactos (`SEGURIDAD`, `CALIDAD_INOCUIDAD`, `ENTREGA`, `COSTO`, `MORAL`, `PRODUCTIVIDAD`, `CINCO_S`, `ERGONOMIA`, `MEDIO_AMBIENTE`) y los estados técnicos descritos para comandos, migración y archivos.

## 4. Repositorios que cubren los 31 modelos Prisma

Se crean **28 listas y 3 bibliotecas**. Cada fila indica el modelo fuente exacto.

| # | Modelo Prisma | Repositorio SharePoint | Tipo |
|---:|---|---|---|
| 1 | `User` | `PROpEx_UserProfiles` | Lista |
| 2 | `Area` | `PROpEx_Areas` | Lista |
| 3 | `Plant` | `PROpEx_Plants` | Lista |
| 4 | `OrgUnit` | `PROpEx_OrgUnits` | Lista |
| 5 | `Idea` | `PROpEx_Ideas` | Lista |
| 6 | `OrgMembership` | `PROpEx_OrgMemberships` | Lista |
| 7 | `OrgEscalationRule` | `PROpEx_OrgEscalationRules` | Lista |
| 8 | `IdeaSupportRequest` | `PROpEx_IdeaSupportRequests` | Lista |
| 9 | `IdeaFollower` | `PROpEx_IdeaFollowers` | Lista |
| 10 | `Participant` | `PROpEx_Participants` | Lista |
| 11 | `TrainingProgram` | `PROpEx_TrainingPrograms` | Lista |
| 12 | `TrainingSession` | `PROpEx_TrainingSessions` | Lista |
| 13 | `TrainingEnrollment` | `PROpEx_TrainingEnrollments` | Lista |
| 14 | `CoinTransaction` | `PROpEx_CoinTransactions` | Lista append-only |
| 15 | `Approval` | `PROpEx_Approvals` | Lista |
| 16 | `Attachment` | `PROpEx_Evidencias_Ideas` | Biblioteca |
| 17 | `Comment` | `PROpEx_IdeaComments` | Lista |
| 18 | `PointRule` | `PROpEx_PointRules` | Lista |
| 19 | `IdeaPointRule` | `PROpEx_IdeaPointRules` | Lista |
| 20 | `NotificationOutbox` | `PROpEx_NotificationOutbox` | Lista |
| 21 | `AuditLog` | `PROpEx_LegacyAuditLog` | Lista append-only |
| 22 | `Setting` | `PROpEx_Settings` | Lista |
| 23 | `KaizenProject` | `PROpEx_KaizenProjects` | Lista |
| 24 | `KaizenTeamMember` | `PROpEx_KaizenTeamMembers` | Lista |
| 25 | `KaizenActivity` | `PROpEx_KaizenActivities` | Lista |
| 26 | `KaizenAttachment` | `PROpEx_Evidencias_Kaizen` | Biblioteca |
| 27 | `KaizenUpdate` | `PROpEx_KaizenUpdates` | Lista |
| 28 | `GenbaWalk` | `PROpEx_GenbaWalks` | Lista |
| 29 | `GenbaActivity` | `PROpEx_GenbaActivities` | Lista |
| 30 | `GenbaAttachment` | `PROpEx_Evidencias_Genba` | Biblioteca |
| 31 | `GenbaUpdate` | `PROpEx_GenbaUpdates` | Lista |

## 5. Columnas específicas por dominio

Las columnas comunes de la sección 3.2 se omiten en las siguientes tablas.

### 5.1 Identidad y organización

#### `PROpEx_UserProfiles`

| Columna | Tipo | Origen/regla |
|---|---|---|
| `Title` | Texto | `name` |
| `PbxEmail` | Texto | `email` en minúsculas; único si no hay conflictos |
| `PbxRole` | Choice | valores de `Role` |
| `PbxActive` | Sí/No | `active` |
| `PbxKaizenAccess` | Sí/No | `kaizenAccess` |
| `PbxGenbaAccess` | Sí/No | `genbaAccess` |
| `PbxJobTitle` | Texto | `jobTitle` |
| `PbxEmployeeNumber` | Texto 5 | número normalizado |
| `PbxLegacyEmployeeNumber` | Texto | valor original cuando difiera/no sea válido |
| `PbxM365User` | Persona, uno | enlace opcional a cuenta activa |
| `PbxM365EmailKey` | Texto | email canónico de la cuenta; indexado |

`passwordHash` no se importa. Los perfiles históricos sin cuenta de Microsoft se conservan sin `PbxM365User`.

#### `PROpEx_Plants`

`PbxCode` Texto único/indexado, `Title` nombre, `PbxActive` Sí/No.

#### `PROpEx_Areas`

`PbxCode` Texto único/indexado, `Title` nombre, `PbxSupervisorUserKey` Texto indexado, `PbxSupervisorName` Texto, `PbxActive` Sí/No.

#### `PROpEx_OrgUnits`

`PbxPlantKey`, `PbxParentOrgUnitKey`, `PbxRoutingUserKey`, `PbxCaptureAreaKey` como claves de texto; `PbxType` Choice; `PbxCode` Texto único/indexado; `Title` nombre; `PbxResponsible`, `PbxManager` Texto; `PbxQrEnabled`, `PbxIsSupportArea`, `PbxActive` Sí/No; `PbxSortOrder` Número. La unicidad opcional de `captureArea` se verifica por flujo porque SharePoint no tiene índice único condicional.

#### `PROpEx_OrgMemberships`

`PbxUserKey`, `PbxOrgUnitKey`, `PbxManagerMembershipKey` Texto indexado; `PbxMembershipTitle` Texto; `PbxLevel`, `PbxSortOrder` Número; `PbxCanReviewTeam`, `PbxCanReceiveIdeas`, `PbxCanManageActivities`, `PbxActive` Sí/No; `PbxCompositeKey = UserKey|OrgUnitKey`, único.

#### `PROpEx_OrgEscalationRules`

`PbxOrgUnitKey` y `PbxReviewerMembershipKey` Texto indexado; `Title` nombre; `PbxSubmitterLabel` Texto; `PbxCircumstance` Varias líneas; `PbxSubmitterLevel`, `PbxSortOrder` Número; `PbxIsDefault`, `PbxActive` Sí/No.

#### `PROpEx_Participants`

`Title` nombre; `PbxUserKey`, `PbxOrgUnitKey` Texto indexado; `PbxEmployeeNumber` Texto 5 indexado; `PbxLegacyEmployeeNumber`, `PbxEmail`, `PbxJobTitle` Texto; `PbxActive` Sí/No. Empleado y email son PII; la lista es restringida. Si la política interna prohíbe que supervisores los vean, esos campos se mueven a la lista auxiliar `PROpEx_ParticipantPrivate`.

### 5.2 Ideas

#### `PROpEx_Ideas`

| Grupo | Columnas |
|---|---|
| Identificación | `PbxFolio` Texto único/indexado, `PbxNumber` Número, `PbxLegacyFolio` Texto |
| Capturista | `PbxCollaboratorName`, `PbxSubmitterPosition`; correo y empleado se guardan por defecto en `PROpEx_IdeaSubmitterPrivate` |
| Organización | `PbxAreaKey`, `PbxAreaCode`, `PbxAreaName`, `PbxParticipantKey`, `PbxEscalationRuleKey` |
| Captura | `PbxShift` Choice; `PbxProblem`, `PbxProposal`, `PbxExpectedBenefit` Varias líneas |
| Impactos | `PbxImpactJson` Varias líneas; `PbxImpactCodes` Texto; nueve Sí/No: `PbxImpactSafety`, `PbxImpactQuality`, `PbxImpactDelivery`, `PbxImpactCost`, `PbxImpactMorale`, `PbxImpactProductivity`, `PbxImpact5S`, `PbxImpactErgonomics`, `PbxImpactEnvironment` |
| Rutas | `PbxCategory`, `PbxPriority`, `PbxClassification`, `PbxStatus` Choice; `PbxImpactsQuality`, `PbxImpactsSafety`, `PbxRequiresMaintenance`, `PbxRequiresExternalSupport` Sí/No; `PbxExternalSupportDetails` Varias líneas |
| Responsables | `PbxSupervisorUserKey`, `PbxSupervisorName`, `PbxImplementationOwnerKey`, `PbxImplementationOwnerName` |
| Fechas | `PbxDueDate`, `PbxImplementedAt`, `PbxClosedAt` |
| Cierre | `PbxRequiresEvidence` Sí/No; `PbxPointsAssigned` Número; `PbxRejectionReason`, `PbxMoreInfoRequest`, `PbxMcComments` Varias líneas |

Los impactos se conservan como JSON raw para reversibilidad y como booleanos para filtros delegables. No se usa Choice multivalor porque no es un buen campo de filtro/indexación.

#### `PROpEx_Approvals`

`PbxIdeaKey` y `PbxAssignedUserKey` Texto indexado; `PbxIdeaFolio`, `PbxAssignedName` Texto; `PbxType`, `PbxStatus`, `PbxDecision` Choice; `PbxComments` Varias líneas; `PbxDecidedAt` Fecha/hora; `PbxCompositeKey = IdeaKey|Type`, único.

#### `PROpEx_IdeaSupportRequests`

`PbxIdeaKey`, `PbxOrgUnitKey`, `PbxAssignedUserKey` Texto indexado; etiquetas desnormalizadas; `PbxStatus`, `PbxDecision` Choice; `PbxComments` Varias líneas; `PbxDecidedAt`, `PbxActivatedAt`; `PbxCompositeKey = IdeaKey|OrgUnitKey`, único.

#### `PROpEx_IdeaFollowers`

`PbxIdeaKey`, `PbxUserKey`, `PbxCreatedByUserKey` Texto indexado; `PbxLabel` Texto; `PbxCompositeKey = IdeaKey|UserKey`, único.

#### `PROpEx_IdeaComments`

`PbxIdeaKey`, `PbxUserKey` Texto indexado; `PbxUserName` Texto; `PbxComment` Varias líneas. Versionado habilitado; comentarios migrados de sólo lectura.

#### `PROpEx_PointRules`

`Title` nombre; `PbxDescription` Varias líneas; `PbxPoints` Número; `PbxActive` Sí/No. No se declara nombre único porque Prisma no lo exige.

#### `PROpEx_IdeaPointRules`

`PbxIdeaKey`, `PbxPointRuleKey` Texto indexado; etiquetas desnormalizadas; `PbxPoints` Número; `PbxCompositeKey = IdeaKey|PointRuleKey`, único.

### 5.3 Capacitación y ProbocaCoins

#### `PROpEx_TrainingPrograms`

`Title` nombre, único/indexado; `PbxDescription` Varias líneas; `PbxCoinValue` Número; `PbxActive` Sí/No; `PbxCreatedByUserKey` Texto.

#### `PROpEx_TrainingSessions`

`PbxProgramKey`, `PbxPlantKey`, `PbxOrgUnitKey`, `PbxCreatedByUserKey` Texto indexado según uso; `PbxProgramName`, `PbxTrainerName` Texto; `PbxSessionDate` Fecha/hora; `PbxNotes` Varias líneas.

#### `PROpEx_TrainingEnrollments`

`PbxSessionKey`, `PbxParticipantKey` Texto indexado; etiquetas desnormalizadas; `PbxStatus` Choice; `PbxCoinsAwarded` Número; `PbxCompletedAt` Fecha/hora; `PbxCompositeKey = SessionKey|ParticipantKey`, único.

#### `PROpEx_CoinTransactions`

| Columna | Tipo/regla |
|---|---|
| `PbxReference` | Texto único/indexado, título visible |
| `PbxParticipantKey` | Texto indexado |
| `PbxParticipantName` | Texto desnormalizado |
| `PbxType` | Choice: `AWARD`, `ADJUSTMENT`, `REDEMPTION` |
| `PbxSourceType` | Choice: `IDEA`, `KAIZEN`, `GENBA`, `TRAINING`, `MANUAL` |
| `PbxSourceKey` | Texto indexado; clave normalizada cuando el origen existe |
| `PbxLegacySourceId` | Texto; preserva `sourceId` aunque el expediente ya no exista |
| `PbxSourceOrphaned` | Sí/No |
| `PbxAmount` | Número entero firmado y distinto de cero |
| `PbxDescription`, `PbxCorrectionReason` | Varias líneas |
| `PbxReversalOfKey` | Texto indexado; unicidad validada por procesador |
| `PbxCreatedByUserKey` | Texto |
| `PbxOccurredAt` | Fecha/hora indexada |

La lista es append-only: los usuarios no reciben Edit ni Delete. El procesador de comandos es el único escritor. `AWARD > 0`, `REDEMPTION < 0`, `ADJUSTMENT != 0`. Una corrección crea otra fila.

### 5.4 Kaizen

#### `PROpEx_KaizenProjects`

`PbxNumber` Número único; `PbxFolio` Texto único/indexado; `PbxLegacyFolio`, `Title`, `PbxPlantText`, `PbxAreaText`, `PbxUnit` Texto; `PbxPlantKey`, `PbxOrgUnitKey`, `PbxLeaderUserKey`, `PbxCreatedByUserKey`, `PbxClosedByUserKey`, `PbxSourceIdeaKey` Texto indexado; `PbxObjective`, `PbxScope`, `PbxClosureNote` Varias líneas; `PbxBaselineValue`, `PbxTargetValue`, `PbxCurrentValue` Número; `PbxStatus` Choice; `PbxStartDate`, `PbxEndDate`, `PbxClosedAt` Fecha/hora.

`estimatedSavings` y `realSavings` se guardan en la lista restringida `PROpEx_KaizenFinancial`; SharePoint no ofrece seguridad por columna.

#### `PROpEx_KaizenTeamMembers`

`PbxProjectKey`, `PbxUserKey` Texto indexado; nombres desnormalizados; `PbxRoleText` Texto; `PbxRewardAmount` Número; `PbxRewardReason` Varias líneas; `PbxRewardDecidedAt`; `PbxCompositeKey = ProjectKey|UserKey`, único.

#### `PROpEx_KaizenActivities`

`PbxProjectKey` Texto indexado; `PbxNumber` Número; `PbxCompositeKey = ProjectKey|Number`, único; `PbxProblem`, `PbxAction`, `PbxCompletionNote`, `PbxCancellationReason`, `PbxMergeReason` Varias líneas; `PbxOwnerUserKey`, `PbxMergedIntoKey`, `PbxSourceGenbaActivityKey` Texto indexado; `PbxOwnerName`; `PbxStartDate`, `PbxDueDate`, `PbxClosedAt`; `PbxStatus` Choice.

#### `PROpEx_KaizenUpdates`

`PbxProjectKey`, `PbxActivityKey`, `PbxUserKey` Texto indexado; etiquetas desnormalizadas; `PbxComment` Varias líneas. Migrados de sólo lectura.

### 5.5 GENBA

#### `PROpEx_GenbaWalks`

`PbxNumber` Número único; `PbxFolio` Texto único/indexado; `PbxLegacyFolio`, `PbxAreaName` Texto; `PbxVisitDate`, `PbxClosedAt`; `PbxLegacyExpectedJson`, `PbxLegacyAttendedJson`, `PbxNotes` Varias líneas; `PbxStatus` Choice; `PbxCoordinatorUserKey`, `PbxCreatedByUserKey`, `PbxOrgUnitKey` Texto indexado; nombres desnormalizados.

Los arreglos de asistencia se normalizan en `PROpEx_GenbaAttendance` y se conserva el JSON original.

#### `PROpEx_GenbaActivities`

`PbxWalkKey` Texto indexado; `PbxNumber` Número; `PbxCompositeKey = WalkKey|Number`, único; `PbxProblem`, `PbxAction`, `PbxCompletionNote`, `PbxCancellationReason`, `PbxMergeReason` Varias líneas; `PbxOwnerUserKey`, `PbxMergedIntoKey` Texto indexado; `PbxDueDate`, `PbxClosedAt`; `PbxStatus` Choice.

La promoción se representa en `PROpEx_KaizenActivities.PbxSourceGenbaActivityKey`; no se mantiene una segunda relación editable.

#### `PROpEx_GenbaUpdates`

`PbxWalkKey`, `PbxActivityKey`, `PbxUserKey` Texto indexado; etiquetas desnormalizadas; `PbxComment` Varias líneas. Migrados de sólo lectura.

### 5.6 Evidencias

Las tres bibliotecas comparten estos metadatos, además de las columnas comunes:

| Columna | Uso |
|---|---|
| `PbxParentKey` | Idea, proyecto o recorrido; indexado |
| `PbxActivityKey` | Actividad opcional; indexado |
| `PbxEvidenceType` | Choice permitido según módulo |
| `PbxOriginalFilename` | Nombre de origen |
| `PbxLegacyPath` | Ruta histórica |
| `PbxUploadedByText` | Texto histórico |
| `PbxUploadedByUserKey` | Perfil resuelto opcional |
| `PbxContentHash` | SHA-256 |
| `PbxFileSize` | Número |
| `PbxMimeType` | Texto |
| `PbxCopyStatus` | `PENDING`, `COPIED`, `VERIFIED`, `ERROR` |

Tipos admitidos: Ideas `BEFORE`, `AFTER`, `OTHER`; Kaizen `CHARTER`, `EVIDENCE`, `OTHER`; GENBA `EVIDENCE`, `OTHER`.

Ruta física determinista:

```text
/{Año}/{Planta}/{Folio}/{PbxKey}/{NombreSanitizado}
```

Las carpetas organizan, pero no son una barrera de seguridad. Los permisos se heredan de cada biblioteca.

### 5.7 Operación técnica

#### `PROpEx_NotificationOutbox`

`PbxIdeaKey` Texto; `PbxChannel`, `PbxStatus` Choice; `PbxRecipient`, `PbxSubject`, `PbxEventKey` Texto; `PbxBody`, `PbxErrorMessage` Varias líneas; `PbxSentAt`; `PbxDispatchSuppressed` Sí/No. `PbxEventKey` es único en altas nuevas. Todo histórico se importa con supresión activa.

#### `PROpEx_LegacyAuditLog`

`PbxEntityName`, `PbxEntityKey`, `PbxEntityLegacyId`, `PbxAction`, `PbxUserKey` Texto indexado según búsqueda; `PbxDetailsJson` Varias líneas; `PbxDetailsValidJson` Sí/No. Append-only y sólo lectura para negocio.

#### `PROpEx_Settings`

`PbxSettingKey` Texto único/indexado; `PbxValue` Varias líneas; `PbxIsSecretReference` Sí/No. No se copian contraseñas, tokens ni connection strings. Los secretos permanecen en conexiones administradas por el propietario del flujo o en el mecanismo corporativo autorizado.

## 6. Listas auxiliares necesarias

Estas listas no sustituyen modelos Prisma; compensan limitaciones de SharePoint.

| Lista | Propósito y clave |
|---|---|
| `PROpEx_IdeaSubmissions` | Entrada interna/Forms; `PbxSubmissionKey` único, estado y `PbxIdeaKey` resultante |
| `PROpEx_Commands` | Cola persistente; `PbxCommandKey` único, tipo, payload JSON, solicitante, estado, intentos y resultado |
| `PROpEx_Sequences` | Una fila por `IDEA`, `KAIZEN`, `GENBA`; prefijo, ancho y siguiente número |
| `PROpEx_CoinBalances` | Caché por participante; `PbxParticipantKey` único, saldo, última conciliación y versión |
| `PROpEx_KaizenFinancial` | Proyecto único, ahorro estimado/real y moneda; restringida a MC/Finanzas |
| `PROpEx_GenbaAttendance` | `WalkKey|DepartmentCode` único; esperado/asistió Sí/No |
| `PROpEx_AssignablePeople` | Directorio sin PII sensible para selectores de Power Apps |
| `PROpEx_ParticipantPrivate` | Opcional; empleado/email separados cuando la política exige mayor aislamiento |
| `PROpEx_IdeaSubmitterPrivate` | `PbxIdeaKey` único, correo, empleado normalizado/raw; acceso restringido a Admins/MC |
| `PROpEx_MigrationRuns` | Manifiesto, hashes, conteos, watermark y estado de cada carga |
| `PROpEx_MigrationExceptions` | Entidad, key, regla, severidad, payload redactado y resolución |

`PROpEx_Commands` evita que el estado crítico dependa de una cola efímera del trigger. Un flujo de recurrencia toma comandos `PENDING` por `ID` ascendente, en lotes pequeños y con una sola ejecución activa.

## 7. Relaciones e integridad compensatoria

### 7.1 Mapa de relaciones

| Padre | Hijos / referencias |
|---|---|
| UserProfile | áreas supervisadas, ideas, aprobaciones, membresías, actividades, auditoría y creadores |
| Plant | OrgUnits, TrainingSessions |
| Area | Ideas; OrgUnit de captura 0..1 |
| OrgUnit | árbol propio, membresías, escalaciones, participantes, soporte, Kaizen, GENBA |
| Idea | Approvals, SupportRequests, Followers, Comments, PointRules, evidencias, Kaizen 0..1 |
| Participant | TrainingEnrollments, CoinTransactions, CoinBalance |
| TrainingProgram | TrainingSessions |
| TrainingSession | TrainingEnrollments |
| KaizenProject | TeamMembers, Activities, Updates, evidencias y finanzas |
| KaizenActivity | merge propio, updates/evidencias y origen GENBA 0..1 |
| GenbaWalk | Activities, Updates, Attendance y evidencias |
| GenbaActivity | merge propio y promoción Kaizen 0..1 |
| CoinTransaction | reversal propia 0..1; fuente polimórfica mediante tipo/key |

### 7.2 Controles

- La aplicación comprueba que el padre exista antes de crear un hijo.
- El procesador vuelve a comprobarlo; no confía en valores enviados por Canvas.
- Las claves compuestas únicas evitan hijos duplicados.
- Los merges validan mismo proyecto/recorrido, no autorreferencia y ausencia de ciclos.
- La evidencia valida que `ActivityKey` pertenezca al `ParentKey`.
- La promoción GENBA->Kaizen busca cualquier actividad con el mismo `SourceGenbaActivityKey` antes de crear.
- El flujo nocturno recorre deltas modificados, no listas completas, y registra huérfanos.
- Ninguna reparación elimina datos automáticamente; marca `MIGRATION_ERROR` o crea excepción.

No existe una transacción multi-lista. Las operaciones de varios pasos usan una saga idempotente:

1. comando `PENDING`;
2. validación;
3. creación/actualización principal;
4. hijos/outbox;
5. verificación;
6. comando `COMPLETED`.

Si falla un paso, el comando queda `RETRY` con checkpoint. El reintento consulta claves únicas y continúa; no empieza duplicando.

## 8. Seguridad y permisos por lista

### 8.1 Grupos del sitio

- `PROpEx Owners`: administra esquema y permisos.
- `PROpEx Automation`: cuenta funcional de flujos.
- `PROpEx Admins`.
- `PROpEx Mejora Continua`.
- `PROpEx Supervisores`.
- `PROpEx Calidad`, `PROpEx Seguridad`, `PROpEx Mantenimiento`.
- `PROpEx Kaizen Leaders`.
- `PROpEx GENBA Coordinators`.
- `PROpEx Training`.
- `PROpEx Coin Finance`.
- `PROpEx Auditors`.
- `PROpEx Collaborators`.

Permisos personalizados de sitio:

- `PROpEx Contribute No Delete`: View/Add/Edit, sin Delete ni Manage Lists.
- `PROpEx Append Only`: View/Add, sin Edit/Delete.
- `PROpEx Submit`: Add y lectura/edición de elementos propios en la lista de envíos.
- `PROpEx Submit Command`: Add sin View Items/Edit/Delete; debe probarse desde Canvas antes del piloto.

### 8.2 Matriz

| Repositorio | Lectura | Escritura | Observación |
|---|---|---|---|
| Plants, Areas, OrgUnits, AssignablePeople | todos los usuarios internos PROpEx | Owners/Admins | Catálogos seguros |
| UserProfiles, Participants, ParticipantPrivate, IdeaSubmitterPrivate | Admins, MC; lectura adicional sólo aprobada | Admins/MC/Automation | PII; sin acceso de colaboradores |
| OrgMemberships, EscalationRules | Admins, MC, Supervisores lectura | Admins/MC | Jerarquía |
| Ideas | Admins, MC, Supervisores y áreas de soporte | MC/Supervisores con No Delete | La app filtra, pero el permiso de lista permite ver toda la lista |
| Approvals, SupportRequests | Admins, MC, Supervisores y áreas de soporte | esos grupos con No Delete | No hay seguridad por tipo/fila |
| Followers, Comments, IdeaPointRules | mismos lectores de Ideas | grupos operativos autorizados | Hijos heredan política de la lista, no del padre |
| PointRules | usuarios internos lectura | Admins/MC | Catálogo |
| IdeaSubmissions | creador ve sólo lo propio; MC/Automation todo | Collaborators Submit; Automation procesa | No usar permisos únicos manuales |
| KaizenProjects/Activities/Team/Updates | Admins, MC, líderes | Admins/MC/líderes No Delete | Acceso amplio dentro del módulo |
| KaizenFinancial | Admins, MC, Coin Finance/Auditors | MC autorizado | Aislamiento por lista |
| GenbaWalks/Activities/Updates/Attendance | Admins, MC, coordinadores | Admins/MC/coordinadores No Delete | Acceso amplio dentro del módulo |
| Training* | Admins, MC, Training | Training/MC No Delete | Participantes por key |
| CoinTransactions | Admins, MC, Coin Finance, Auditors | sólo Automation Append Only | Sin Edit/Delete para negocio |
| CoinBalances | Admins, MC, Coin Finance; consulta personal vía proceso controlado | sólo Automation | Caché, no fuente de verdad |
| Evidencias Ideas | lectores operativos de Ideas | grupos autorizados/Automation | Sin acceso anónimo |
| Evidencias Kaizen | lectores Kaizen | grupos Kaizen autorizados | Sin item-level ACL |
| Evidencias GENBA | lectores GENBA | grupos GENBA autorizados | Sin item-level ACL |
| NotificationOutbox | Admins/Automation | sólo Automation | Histórico suprimido |
| LegacyAuditLog | Admins/Auditors | sólo Automation durante carga | Append-only |
| Settings | Admins/Automation | Owners/Admins | Sin secretos |
| Commands | Owners/Automation; solicitantes sin View Items | grupos operadores con Submit Command; Automation procesa | `Created By` identifica al solicitante real |
| Sequences | Owners/Automation | sólo Automation | No exponer ni editar manualmente |
| MigrationRuns/Exceptions | Owners/Admins/Auditors | equipo de migración/Automation | Retirar acceso al concluir |

### 8.3 Límite de este modelo de seguridad

Ocultar elementos en Power Apps no es seguridad. Un usuario con Read en `PROpEx_Ideas` puede abrir la lista directamente y leer otros elementos. SharePoint no reemplaza el row-level security de Dataverse.

No se crearán permisos únicos por idea/actividad. SharePoint admite hasta 50,000 ámbitos únicos por lista o biblioteca, pero Microsoft recomienda mantenerse generalmente por debajo de 5,000; además, al superar 100,000 elementos ya no se puede romper/reheredar permisos en la lista o biblioteca. [Límites oficiales](https://learn.microsoft.com/en-us/office365/servicedescriptions/sharepoint-online-service-description/sharepoint-online-limits) y [guía de permission scopes](https://learn.microsoft.com/en-us/sharepoint/manage-permission-scope).

Si es obligatorio que un supervisor vea únicamente su área o que Calidad no vea decisiones de Seguridad, las alternativas son:

1. particionar físicamente por sitio/lista y rol/planta, lo cual aumenta operación; o
2. detener este puente y usar Dataverse.

## 9. Índices, umbral de vistas y partición

Una lista puede almacenar hasta 30 millones de elementos, pero las operaciones/vistas que intentan procesar más de 5,000 pueden ser bloqueadas. El número físico no vuelve segura una consulta. [Límites de SharePoint](https://learn.microsoft.com/en-us/office365/servicedescriptions/sharepoint-online-service-description/sharepoint-online-limits) y [umbral de 5,000](https://learn.microsoft.com/en-us/troubleshoot/sharepoint/lists-and-libraries/items-exceeds-list-view-threshold).

SharePoint permite hasta 20 índices por lista/biblioteca. Deben crearse **antes de cargar** y sólo sobre columnas usadas como primer filtro. Texto multilínea, Choice multivalor y columnas calculadas no son buenos candidatos. [Guía de índices de Microsoft](https://support.microsoft.com/es-es/office/agregar-un-%C3%ADndice-a-una-columna-de-lista-o-biblioteca-f3f00554-b7dc-44d1-a2ed-d477eac463b0).

| Límite publicado | Valor | Consecuencia de diseño |
|---|---:|---|
| Elementos por lista / archivos por biblioteca | 30 millones | No elimina el umbral de consulta |
| Umbral de vista/operación | 5,000 | Primera condición sobre índice y partición < 5,000 |
| Listas + bibliotecas por sitio | 2,000 | El diseño usa 31 repositorios de modelo más auxiliares |
| Permisos únicos por lista/biblioteca | 50,000; recomendado 5,000 | No crear ACL por expediente |
| Cambio de herencia en lista/biblioteca | restringido después de 100,000 elementos | Definir permisos antes de cargar |
| Archivo en biblioteca | 250 GB | Para archivos grandes validar además el límite de la acción/conector usada |
| Ruta decodificada completa | 400 caracteres | Carpeta corta y nombre físico sanitizado |
| Versiones | 50,000 mayores / 511 menores | Retención y limpieza gobernadas; no versionar payloads masivos sin límite |
| Adjuntos de elemento | la plataforma admite más, pero el conector documenta hasta 90 MB | PROpEx no usa adjuntos de lista; usa bibliotecas |

### 9.1 Índices mínimos

| Lista | Índices además de `PbxKey` |
|---|---|
| Ideas | `PbxFolio`, `PbxPartitionKey`, `PbxStatus`, `PbxAreaKey`, `PbxSupervisorUserKey`, `PbxImplementationOwnerKey`, `PbxParticipantKey`, `PbxDueDate`, `Created` |
| Approvals | `PbxCompositeKey`, `PbxIdeaKey`, `PbxAssignedUserKey`, `PbxStatus`, `PbxType`, `Created` |
| SupportRequests | `PbxCompositeKey`, `PbxIdeaKey`, `PbxOrgUnitKey`, `PbxAssignedUserKey`, `PbxStatus` |
| Comments/Followers/IdeaPointRules | clave compuesta cuando exista, padre, usuario/regla, `Created` |
| Participants | `PbxEmployeeNumber`, `PbxUserKey`, `PbxOrgUnitKey`, `PbxActive` |
| TrainingEnrollments | `PbxCompositeKey`, `PbxSessionKey`, `PbxParticipantKey`, `PbxStatus` |
| CoinTransactions | `PbxReference`, `PbxPartitionKey`, `PbxParticipantKey`, `PbxSourceKey`, `PbxType`, `PbxOccurredAt`, `PbxReversalOfKey` |
| KaizenProjects | `PbxFolio`, `PbxNumber`, `PbxStatus`, `PbxLeaderUserKey`, `PbxSourceIdeaKey`, `PbxOrgUnitKey` |
| KaizenActivities | `PbxCompositeKey`, `PbxProjectKey`, `PbxOwnerUserKey`, `PbxStatus`, `PbxDueDate`, `PbxSourceGenbaActivityKey` |
| GenbaWalks | `PbxFolio`, `PbxNumber`, `PbxStatus`, `PbxCoordinatorUserKey`, `PbxOrgUnitKey`, `PbxVisitDate` |
| GenbaActivities | `PbxCompositeKey`, `PbxWalkKey`, `PbxOwnerUserKey`, `PbxStatus`, `PbxDueDate` |
| Outbox | `PbxEventKey`, `PbxStatus`, `PbxDispatchSuppressed`, `PbxChannel`, `Created` |
| AuditLog | `PbxPartitionKey`, `PbxEntityName`, `PbxEntityKey`, `PbxAction`, `PbxSourceCreatedUtc` |
| Bibliotecas | `PbxKey`, `PbxParentKey`, `PbxActivityKey`, `PbxCopyStatus`, `PbxPartitionKey` |

### 9.2 Partición lógica

`PbxPartitionKey` se calcula como:

```text
<PLANTA>|<AÑO>
```

Para listas globales sin planta, `<MÓDULO>|<AÑO>`. La vista predeterminada filtra primero una partición indexada y después estado/fecha. Se crea alerta operativa cuando una partición llega a 4,000 elementos; si se acerca a 5,000 se cambia a granularidad mensual o se archiva a otra lista.

La papelera también puede influir en el umbral; archivar no significa borrar sin control. Las vistas de “todo el histórico” se resuelven con exportación/reportes programados, no cargando todo en una galería.

## 10. Delegación en Power Apps Canvas

Cuando una fórmula no se delega, Power Apps procesa sólo 500 filas por defecto y como máximo 2,000 si se eleva el límite. El resultado puede ser silenciosamente incompleto. [Guía oficial de delegación](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/delegation-overview).

Para SharePoint son delegables, con matices, `Filter`, `LookUp`, igualdad, comparaciones de número/fecha y `StartsWith` en texto. `Not`, `IsBlank` sobre texto, clasificación de tipos complejos y varias operaciones de texto no lo son; sobre `ID`, SharePoint delega sólo `=`. [Matriz oficial SharePoint/Power Apps](https://learn.microsoft.com/es-es/power-apps/maker/canvas-apps/connections/connection-sharepoint-online).

Reglas de construcción:

- La propiedad `Items` de una galería conecta directamente a una lista con `Filter` delegable.
- El primer filtro usa `PbxPartitionKey`, estado, responsable, planta/área o padre, todos indexados.
- Búsqueda por texto usa `StartsWith(PbxFolio, txt.Text)` o `StartsWith(Title, txt.Text)`; no `Search`, `in`, `Lower`, `Upper`, `Distinct`, `GroupBy`, `CountRows` ni colecciones sobre listas grandes.
- No filtrar mediante `Not(...)`; usar un estado/booleano positivo explícito.
- Para nulos frecuentes se agrega un booleano (`PbxHasDueDate`, `PbxHasOwner`) si la pantalla lo requiere.
- No ordenar por Person, Choice complejo ni campos no indexados.
- Los nombres de padres se leen de columnas desnormalizadas; no se encadenan lookups.
- Las agregaciones vienen de listas de resumen actualizadas por flujo, nunca de `CountRows` sobre el histórico.
- Cada galería devuelve idealmente 100–200 filas por contexto.
- En QA se fija `Data row limit = 1`; cualquier pantalla que deje de funcionar contiene una fórmula no delegable y no pasa a producción.
- Se usa selección explícita de columnas y Monitor para comprobar las consultas enviadas.

## 11. Concurrencia, folios y operaciones críticas

### 11.1 ETag y actualizaciones ordinarias

SharePoint REST permite concurrencia optimista con ETag e `If-Match`; si la versión cambió, devuelve HTTP 412. Enviar `*` fuerza la sobrescritura y queda prohibido para PROpEx. [Documentación oficial de ETag](https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/working-with-lists-and-list-items-with-rest#using-etag-values-to-determine-document-and-list-item-versioning).

Para cambios de estado, responsable, fechas, cierres y saldos:

1. leer elemento y ETag;
2. validar transición;
3. actualizar mediante `Send an HTTP request to SharePoint` del conector estándar con `If-Match` exacto;
4. ante 412, no reintentar a ciegas: refrescar, reevaluar y mostrar conflicto.

Las ediciones de texto no críticas pueden usar formulario/Patch, aceptando versionado; toda transición crítica usa flujo/REST.

### 11.2 Procesador de comandos

`PROpEx_Commands` contiene:

- `PbxCommandKey` único;
- `PbxCommandType` Choice;
- `PbxTargetKey`;
- `PbxPayloadJson`;
- `PbxRequestedByEmail` y `PbxRequestedAt` como snapshots;
- `PbxExpectedETag`;
- `PbxStatus`: `PENDING`, `PROCESSING`, `RETRY`, `COMPLETED`, `REJECTED`, `DEADLETTER`;
- `PbxAttemptCount`, `PbxCheckpoint`, `PbxResultKey`, `PbxErrorCode`, `PbxErrorDetail`.

El solicitante autorizado se obtiene de `Created By` del elemento SharePoint, no del correo incluido en el payload. Un flujo de recurrencia procesa por `ID` ascendente, lote máximo 50 y de forma secuencial. Se evita depender de miles de triggers en espera. Microsoft documenta que el control de concurrencia de trigger está apagado por defecto y, al activarlo, las ejecuciones concurrentes y en espera tienen límites; por eso la cola persistente es más segura. [Límites de Power Automate](https://learn.microsoft.com/en-us/power-automate/limits-and-config).

### 11.3 Folios

Comandos: `CREATE_IDEA`, `CREATE_KAIZEN`, `CREATE_GENBA`.

1. El procesador busca el `CommandKey`; si ya está completo devuelve el resultado.
2. Lee la fila de secuencia del módulo.
3. Reserva/incrementa usando ETag.
4. Construye `IM-######`, `KZN-###` o `GENBA-###`.
5. Crea el registro con folio único.
6. Si falla después de reservar, puede quedar un hueco; no se reutiliza.

La unicidad del folio es más importante que una secuencia sin huecos. Ningún flujo calcula `MAX + 1` recorriendo la lista.

### 11.4 ProbocaCoins

Comandos: `AWARD_COINS`, `REDEEM_COINS`, `ADJUST_COINS`, `REVERSE_COIN_TRANSACTION`.

El mismo procesador secuencial:

1. valida solicitante/rol y referencia determinista;
2. consulta `CoinBalances` por ParticipantKey único;
3. rechaza canje que produciría saldo negativo;
4. crea la transacción append-only con referencia única;
5. actualiza la caché de saldo con ETag;
6. marca comando completo.

Si la transacción se creó y falló la caché, el reintento encuentra la referencia existente, verifica contenido y actualiza el saldo sin crear otra fila. Una conciliación programada recalcula el saldo como suma del ledger y corrige únicamente la caché.

Esto reduce el riesgo, pero SharePoint sigue sin ofrecer una transacción real entre listas. ProbocaCoins con valor económico, canjes de alto volumen o requisito contable estricto son un criterio de salida inmediata a Dataverse/SQL.

## 12. Flujos estándar mínimos

| Flujo | Trigger | Función |
|---|---|---|
| `SP-01 Command Processor` | Recurrence, una ejecución | Folios, transiciones críticas, monedas y sagas |
| `SP-02 Submission Intake` | nuevo Submission/Forms | Validar y crear comando de Idea |
| `SP-03 Outbox Dispatcher` | Recurrence | Enviar PENDING no suprimidos por EventKey |
| `SP-04 Reminders` | diario | Consultas por fecha/estado indexados |
| `SP-05 Integrity Reconcile` | nocturno | FKs huérfanas, composites, saldo, evidencia |
| `SP-06 Import Worker` | manual/recurrence | Upserts por PbxKey en orden |
| `SP-07 Summary Refresh` | programado | Conteos y KPIs para Canvas |

Todos usan conectores estándar de SharePoint, Outlook/Teams o Forms cuando estén habilitados. No se utiliza HTTP genérico premium, SQL, Dataverse, Azure Functions ni conectores personalizados.

## 13. Captura desde QR

No se expone una lista SharePoint anónimamente. Opciones temporales:

1. mantener la captura pública en la aplicación PROpEx actual y transferir al corte;
2. Microsoft Forms con “cualquiera puede responder”, sólo si el tenant lo permite, y flujo hacia `PROpEx_IdeaSubmissions`;
3. Forms interno con autenticación para colaboradores con cuenta Microsoft 365.

La respuesta externa recibe un acuse, no acceso de lectura a listas. Archivos de Forms se revisan por ubicación, permisos y tamaño antes de integrarlos. Si se necesita portal anónimo con consulta de estatus, validación robusta y archivos, SharePoint/Forms no reemplaza Power Pages.

## 14. Estrategia de importación

### 14.1 Fuente

Se usan los 31 CSV y `manifest.json` generados por `scripts/export-power-platform.ts`. La carpeta contiene PII y permanece fuera de Git. Antes de cualquier carga se genera un nuevo export productivo consistente y se valida SHA-256.

### 14.2 Medio sin premium

Opción preferida:

- transformar localmente CSV -> archivos `.xlsx` por tabla con una tabla de Excel;
- guardar staging en una biblioteca restringida;
- leer con Excel Online (Business) y escribir con SharePoint mediante `SP-06 Import Worker`;
- dividir archivos grandes en lotes de 1,000–5,000 filas.

Excel Online (Business) también está clasificado como conector Standard y documenta un máximo de 25 MB por archivo para el conector. Por eso el staging se divide y no se usa como base de datos. [Referencia oficial](https://learn.microsoft.com/en-us/connectors/excelonlinebusiness/).

Opción técnica si el tenant permite autenticación delegada:

- script PnP PowerShell/CLI ejecutado por un Site Owner;
- upserts por `PbxKey` contra las mismas listas;
- sin app-only de tenant ni permisos globales.

No usar “Create list from Excel” para producción: crea tipos/índices inconsistentes y no implementa la política de claves.

### 14.3 Orden

1. `MigrationRuns` y catálogos de Choices/configuración de listas.
2. UserProfiles, Plants y Areas sin supervisor.
3. OrgUnits sin parent/routing/captureArea; segunda pasada para enlaces.
4. OrgMemberships sin manager; segunda pasada; EscalationRules.
5. Participants, PointRules, TrainingPrograms, Settings no secretos.
6. Ideas.
7. IdeaSubmitterPrivate, Approvals, SupportRequests, Followers, Comments e IdeaPointRules.
8. KaizenProjects y GenbaWalks sin referencias cruzadas.
9. KaizenActivities y GenbaActivities sin merges/promoción; segunda pasada.
10. TeamMembers, Updates, GenbaAttendance y KaizenFinancial.
11. TrainingSessions y TrainingEnrollments.
12. CoinTransactions sin reversión; segunda pasada para reversal/source; recalcular CoinBalances.
13. NotificationOutbox con `PbxDispatchSuppressed = true`; LegacyAuditLog.
14. Bibliotecas y archivos; metadatos sólo pasan a `VERIFIED` después de hash/tamaño.

### 14.4 Upsert idempotente

Por fila:

1. construir `PbxKey` determinista;
2. consultar `PbxKey eq '<valor>'` sobre índice único;
3. cero resultados -> Create;
4. uno -> comparar `PbxChecksum`; igual = no-op, distinto = Update con ETag durante migración;
5. más de uno -> abortar lote y crear MigrationException;
6. registrar checkpoint y conteos.

Las relaciones se resuelven por clave antes de cargar hijos. No se usa el `ID` de la fila creada como FK.

### 14.5 Transformaciones y conciliaciones

- empleado: 1–5 dígitos, `padStart(5, '0')`, `00000` inválido; detectar colisiones tras normalizar;
- correo: trim/minúsculas, conservar raw si cambia o es inválido;
- folio: trim/mayúsculas, detectar colisiones y validar número/prefijo;
- Choice: valores lógicos exactos de Prisma;
- fechas: ISO UTC en columnas de fuente; fechas de negocio probadas contra cambio de zona;
- JSON: conservar raw y proyectar impactos/asistencia;
- monedas: signos, referencias, reversiones, fuentes y saldo por participante con tolerancia cero;
- archivos: ruta permitida, nombre sanitizado, tamaño y SHA-256.

SharePoint no permitirá establecer de forma fiable `Created By`/`Modified By`/`Modified` históricos mediante los conectores estándar; por eso las columnas `PbxSource*` son obligatorias.

## 15. Validación y operación

### 15.1 Antes de cargar

- listas, columnas internas, Choices, índices, unique values y versionado creados;
- permisos probados con una cuenta real por rol;
- flujos de notificación desactivados o outbox suprimido;
- conteos y hashes del manifiesto correctos;
- colisiones de PbxKey, folio, referencia, empleado y composites en cero;
- archivos inventariados y staging restringido;
- procesador de comandos probado con reintentos y 412.

### 15.2 Después de cargar

- fuente = destino + excepciones aprobadas por cada uno de los 31 modelos;
- checksums de escalares;
- FKs por key y etiquetas desnormalizadas;
- distribución por Choice/estado;
- conjunto exacto de folios;
- saldo por participante, fuente, tipo y global: diferencia cero;
- archivos: conteo, tamaño y hash;
- ninguna notificación histórica enviada;
- pruebas de delegación con `Data row limit = 1`;
- pruebas negativas: colaborador sin acceso a listas operativas, usuario sin acceso a ledger/configuración y writer sin Delete.

### 15.3 Monitoreo

- vista/lista de excepciones y comandos `RETRY/DEADLETTER`;
- particiones con 4,000 elementos;
- índices faltantes o consultas throttled;
- saldo caché vs ledger;
- outbox pendiente/error;
- bibliotecas con archivos `PENDING/ERROR`;
- crecimiento de versiones y papelera;
- cambios manuales directos detectados por Modified By fuera de cuentas autorizadas.

## 16. Brechas frente a Dataverse y criterio de salida

| Capacidad | SharePoint temporal | Dataverse objetivo |
|---|---|---|
| Integridad referencial | Flujo nocturno y claves de texto | Relaciones nativas |
| Claves compuestas | Columna concatenada única | Alternate keys |
| Transacciones | Saga/reintentos; no atómico | Operación transaccional/plug-in |
| Concurrencia | ETag por elemento | Optimistic concurrency + lógica servidor |
| Seguridad por fila | No escalable sin scopes únicos | Ownership, BU, teams, sharing |
| Seguridad por campo | Separar en otra lista | Field Security Profiles |
| Auditoría | Version history + lista legacy | Auditoría nativa por tabla/campo |
| Choices | Locales por lista; drift posible | Choices globales en solución |
| Consultas | Delegación limitada, sin joins | FetchXML/OData y lookups amplios |
| Agregados | Resumen programado | Rollups/calculated/Power BI directo |
| ALM | Esquema de listas fuera de Solution | Componentes administrados |
| Lógica síncrona | List validation/flujo diferido | Plug-ins, Custom API, business rules |
| Aplicación | Canvas | Model-driven + Canvas personalizado |
| Captura anónima | Forms/app actual | Power Pages con table permissions |
| Libro mayor | Append-only compensatorio | Restricciones y transacción robusta |

Migrar a Dataverse en cuanto ocurra uno de estos eventos:

- se exige que cada supervisor/área vea sólo sus filas;
- ProbocaCoins adquiere valor económico formal o aumenta la concurrencia de canjes;
- se requieren aprobaciones atómicas o trazabilidad regulatoria;
- una partición activa rebasa sistemáticamente 4,000 elementos;
- aparecen consultas no delegables necesarias para operar;
- el número de listas particionadas y flujos de compensación vuelve costosa la operación;
- se necesita portal anónimo con consulta/actualización segura;
- los conflictos ETag o comandos en retry afectan tiempos de respuesta.

## 17. Rollback y transición futura

La aplicación PROpEx actual permanece operativa o en sólo lectura hasta validar el puente. Para volver al origen:

1. detener Canvas y procesador de comandos;
2. exportar del watermark todas las altas/modificaciones SharePoint usando `PbxKey`;
3. reconstruir los 31 CSV con relaciones por key, no por SharePoint ID;
4. incluir ledger, comandos y archivos con hashes;
5. aplicar delta en un clon del origen;
6. reconciliar folios y monedas con tolerancia cero;
7. cambiar tráfico sólo después de pruebas.

Para avanzar después a Dataverse, `PbxKey`, `PbxLegacyId`, timestamps y checksums se mapean directamente a las columnas de migración definidas en `01-dataverse-model.md`. La capa SharePoint no debe introducir IDs irreversibles ni borrar los CUID.

## 18. Riesgos residuales aceptados

1. Usuarios con permiso de lista pueden abrir SharePoint fuera de Canvas.
2. Una saga puede quedar parcialmente aplicada hasta el siguiente reintento.
3. La caché de saldo puede retrasarse, aunque el ledger permanezca autoritativo.
4. Las reglas entre listas no son instantáneas salvo que pasen por el procesador.
5. Los Choices duplicados entre listas pueden divergir si se editan manualmente.
6. Los flujos dependen de una cuenta funcional, conexiones y límites de servicio.
7. El esquema de listas no viaja dentro de la Solution Power Platform como Dataverse.
8. El reporteo histórico completo necesita extracción programada.

Estos riesgos son aceptables únicamente como solución temporal, con pocos escritores, volumen moderado, conciliación diaria y Dataverse como destino final.

## 19. Referencias oficiales vigentes

- [Conector SharePoint: clase Standard, operaciones y limitaciones](https://learn.microsoft.com/en-us/connectors/sharepointonline/)
- [Excel Online (Business): clase Standard y limitaciones](https://learn.microsoft.com/en-us/connectors/excelonlinebusiness/)
- [Microsoft Forms: conector Standard para Power Automate](https://learn.microsoft.com/en-us/connectors/microsoftforms/)
- [Límites de SharePoint Online](https://learn.microsoft.com/en-us/office365/servicedescriptions/sharepoint-online-service-description/sharepoint-online-limits)
- [Umbral de vista de 5,000 elementos](https://learn.microsoft.com/en-us/troubleshoot/sharepoint/lists-and-libraries/items-exceeds-list-view-threshold)
- [Índices en listas y bibliotecas](https://support.microsoft.com/es-es/office/agregar-un-%C3%ADndice-a-una-columna-de-lista-o-biblioteca-f3f00554-b7dc-44d1-a2ed-d477eac463b0)
- [Delegación de Power Apps](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/delegation-overview)
- [Funciones delegables para SharePoint](https://learn.microsoft.com/es-es/power-apps/maker/canvas-apps/connections/connection-sharepoint-online)
- [Concurrencia optimista con ETag](https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/working-with-lists-and-list-items-with-rest#using-etag-values-to-determine-document-and-list-item-versioning)
- [Límites y concurrencia de Power Automate](https://learn.microsoft.com/en-us/power-automate/limits-and-config)
- [Administración de permission scopes](https://learn.microsoft.com/en-us/sharepoint/manage-permission-scope)
