# Auditoría de flujo y diseño — PROpEx

**Autor:** Claude · **Fecha:** 2026-08-15 · **Commit auditado:** `e433df6`
**Alcance:** solo lectura. No se modificó código, Prisma, configuración ni producción.
**Destinatario:** Codex, para ejecutar. Cada hallazgo lleva `archivo:linea`.

---

## 0. Cómo leer este informe y qué NO se alcanzó a verificar

Este documento es **honesto sobre su propia cobertura**. Reparto de la auditoría:

| Área | Cobertura | Cómo se verificó |
|---|---|---|
| Navegación, shell, permisos por rol | Completa | Lectura directa |
| Kaizen y GENBA (páginas, expedientes, kanban, gantt, acciones) | Completa | Lectura directa exhaustiva |
| Organización, personas, escalamientos, configuración, borrado | Completa | Lectura directa exhaustiva |
| Modelo de datos (Prisma) | Completa | Lectura directa |
| Captura QR | Completa | Lectura directa |
| Estados de carga/error/vacío, inventario de rutas | Completa | Inventario mecánico |
| Entrenamientos y ProbocaCoins | **Parcial** | Estructura y consultas, no la lógica de cada formulario |
| Capa visual: color, contraste y estado | Completa | Métricas y cálculo de contraste reproducible (§4.7) |
| Capa visual: `globals.css` pantalla por pantalla | **Parcial** | Métricas cuantitativas, no revisión de cada vista |
| Benchmark de gestión visual | Completa | 9 fuentes abiertas y verificadas (§4.6) |

**La única área que queda parcial es Entrenamientos/ProbocaCoins y el repaso visual pantalla
por pantalla**, porque el límite de sesión cortó dos procesos de análisis. Lo escrito sobre
ellas es verificable con los comandos que se citan; lo que no pude comprobar, se dice
explícitamente. No hay nada inferido presentado como observado.

El **§4 es el capítulo de gestión visual**: seis reglas derivadas del benchmark, el diagnóstico
medido de PROpEx contra ellas y la paleta de estado propuesta.

---

## 1. Auditoría del flujo completo por rol

### 1.1 El recorrido real de una idea

```
QR (/captura/P1..P9)
  └─ El colaborador elige "¿cuál es tu puesto o circunstancia?" → esto elige al revisor
     (captura/[code]/page.tsx:259-274 → actions.ts:217-241)
  └─ Se congela Idea.supervisorId + escalationRuleId y nace Approval(SUPERVISOR)
     (actions.ts:302-310)
        └─ REGISTRADA / EN_REVISION_SUPERVISOR
             ├─ Rechaza → RECHAZADA_SUPERVISOR (terminal)
             ├─ Pide info → SOLICITUD_INFORMACION
             └─ Aprueba (workflow.ts:167-188)
                  └─ Se crean validaciones solo de las áreas marcadas en la captura
                     (workflow.ts:60-109, orden fijo Calidad → Seguridad → Mantenimiento)
                       └─ APROBADA_PARA_IMPLEMENTAR (workflow.ts:132-155)
                            └─ CLASIFICACION_MEJORA_CONTINUA
                               · aquí se asigna dueDate, responsable y clasificación
                               · si clasifica KAIZEN → nace o se reutiliza el proyecto
                                 (lib/kaizen-from-idea.ts)
                                 └─ EN_IMPLEMENTACION → IMPLEMENTADA
                                    → EN_VALIDACION_FINAL → CERRADA (+ ProbocaCoins)
```

**17 estados** (`domain.ts:64-82`) y **7 columnas** de Kanban (`domain.ts:253-264`).

### 1.2 Quién ve y hace qué

| Rol | Entra en | Puede hacer | Hueco detectado |
|---|---|---|---|
| **COLABORADOR** | `/seguimientos` | Capturar por QR; cerrar la actividad que le asignen | Ve el enlace a Kanban de Kaizen en la barra lateral (`app-shell.tsx:100`) y el guardia lo rebota sin mensaje |
| **SUPERVISOR** | `/seguimientos` | Aprobar/rechazar/pedir info de su ruta y su equipo | **El rol por sí solo no otorga nada.** Sin `OrgMembership` ve el menú y una bandeja vacía |
| **CALIDAD / SEGURIDAD / MANTENIMIENTO** | `/seguimientos` + su bandeja | Solo validar lo que tenga `assignedToId` propio (`idea-access.ts:180`) | Si el asignado se ausenta, nadie más puede validar salvo ADMIN |
| **MEJORA_CONTINUA** | `/dashboard` | Ve todo, clasifica, asigna, cierra, otorga coins | **Ve todo pero no puede aprobar.** `hasGlobalIdeaAccess` la incluye (`idea-access.ts:19-21`) pero `buildInitialReviewWhere:124` solo exime a ADMIN → recibe `?error=sin_permiso` al enviar |
| **ADMIN** | `/dashboard` | Todo, incluido decidir cualquier validación de cualquier tipo (`idea-access.ts:179`) | Es el único camino de desbloqueo cuando algo se atora |

### 1.3 Cómo se decide realmente quién aprueba

Hay **cuatro sistemas de autorización en paralelo** sin resolvedor común:

1. **Rol global** (`Role`, `schema.prisma:10-18`), en cookie firmada (`auth.ts:14-19`).
2. **Membresía organizacional** con tres banderas: `canReviewTeam`, `canReceiveIdeas`,
   `canManageActivities`, más `managerMembershipId` y `level` (`schema.prisma:322-346`).
3. **Banderas por usuario**: `kaizenAccess` / `genbaAccess` (`schema.prisma:174-175`).
4. **Asignación directa por registro**: `Idea.supervisorId`, `Area.supervisorId`,
   `Approval.assignedToId`, `OrgUnit.routingUserId`, `IdeaFollower`.

`buildInitialReviewWhere` (`idea-access.ts:120-158`) admite **siete** caminos distintos para
decidir una idea. El *scope* de `canReviewTeam` (`idea-access.ts:25-92`) es transitivo en dos
ejes a la vez: baja por la cadena `managerMembershipId` **y además** baja por el árbol
`OrgUnit.parentId`. Marcar esa casilla a un gerente de macroproceso le da poder de aprobación
sobre toda la rama de la planta aunque nadie le reporte formalmente. Nadie en la interfaz
puede responder *"¿por qué veo esta idea?"*.

---

## 2. Problemas de UX, saturación, navegación, permisos y duplicidad

### 2.1 Navegación: rutas que existen y nadie puede alcanzar

`app-shell.tsx` conserva **tres arreglos de navegación muertos** — `ideaNav:69`,
`kaizenNav:95`, `genbaNav:103` — porque `visibleNav:273` solo filtra `unifiedNav`. Pero los
tres siguen alimentando `searchableNav:282`, así que **el buscador ofrece destinos que no
están en el menú y con otro nombre**: "Panorama PROpEx" vs "Panel ejecutivo", "Hoy" vs "Ideas
de mejora", "Todas las ideas" vs nada.

Rutas existentes sin entrada en la barra lateral:

| Ruta | ¿Alcanzable? |
|---|---|
| `/kaizen/kanban`, `/genba/kanban` | **No.** Ni un solo `Link` en toda la app. Solo escribiendo la URL o desde el buscador |
| `/ideas`, `/kanban` | Solo desde el detalle de una idea (`ideas/[id]/page.tsx:184-185`) — circular |
| `/ideas/repositorio`, `/kaizen/repositorio`, `/genba/repositorio` | Solo como botón secundario dentro del módulo |
| `/kaizen/gantt` | Solo botón secundario en `kaizen/page.tsx:64` |
| **`/configuracion/datos`** | **No.** La pantalla de borrado destructivo no está enlazada desde ningún sitio |
| `/configuracion/migracion-2026` | **No.** Igual |

El Gantt anual y los dos Kanban son requisitos explícitos de `CLAUDE.md` y hoy son
prácticamente inaccesibles.

**Otros defectos del shell:**
- `mobileItems:290` corta a `.slice(0, 3)`: para ADMIN quedan Ideas, Mi trabajo y Kaizen.
  **GENBA desaparece de la barra inferior** aunque el rol tenga acceso.
- Los grupos del menú son un acordeón **exclusivo** (`toggleGroup:364`): abrir uno cierra los
  otros dos. Nunca se ven "Trabajo" y "Bandejas" a la vez.
- `roleTheme:136`: `COLABORADOR` usa `#ea0029` y `CALIDAD` `#d32236`. **Dos roles con casi el
  mismo rojo**, y `#ea0029` es además el acento de GENBA (`:271`). `CLAUDE.md` asigna rojo a
  Calidad; Colaborador no tiene color asignado.
- Al entrar a Kaizen/GENBA el acento de módulo **pisa** el de rol (`:268-272`): el supervisor
  pierde su verde dentro de Kaizen. Hay que decidir cuál manda — ver §6.

### 2.2 Saturación: cuatro pantallas dentro de una ruta

- **`/entrenamientos`** — 1200 líneas, **18 consultas Prisma**, y cuatro secciones que son
  cuatro pantallas distintas: "Sesiones" (`:535`), "Operación de sesión" (`:631`),
  "Preparación" (`:798`), "Programas y personas" (`:1012`).
- **`/probocacoins`** — 575 líneas, **16 consultas**, cinco secciones.
- **`/kaizen/[id]`** — sin pestañas, scroll único de 6-8 pantallas: banda de estado, ficha
  ejecutiva, equipo, N actividades con hasta 2 formularios anidados cada una, bitácora de
  hasta 60 comentarios, y un `aside` con cierre + edición de ~20 campos + combinación. Por
  debajo de 1280px el `aside` cae **después** de toda la bitácora: para cerrar el proyecto hay
  que atravesar el expediente entero.

### 2.3 Duplicidad

**El Kanban dedicado es una versión inferior de una vista que ya existe.** El panel
`/kaizen` ya incluye su propio Kanban dentro de `OperationsWorkboard:383-390`, con filtros,
buscador, orden y paginación. Las rutas `/kaizen/kanban` y `/genba/kanban` no tienen ninguna
de las cuatro cosas — y sus archivos son calcos literales entre sí (mismas columnas en
`:11-16` de ambos, misma función de clasificación en `:20-30`, mismo `.slice(0,3)`).

| | Panel `/kaizen` | `/kaizen/kanban` | `/kaizen/gantt` | `/kaizen/repositorio` |
|---|---|---|---|---|
| Alcance | todos | solo abiertos | por año | solo cerrados |
| Paginación | sí (50/12) | **no** | **no** | sí (30) |
| Filtros | 4 + buscador | **ninguno** | año | 2 |

**El cálculo de avance está implementado cuatro veces**: `domain.ts:184-193` (canónica),
`kaizen-command-center.tsx:62-66`, `genba-command-center.tsx:44-48` y `kaizen-closure.ts:11-15`.
Las dos de los command-center existen solo porque el componente es `"use client"` y recibe
strings en vez de `Date` — duplicación por frontera de serialización, evitable.

**El invariante `endDate ≥ startDate` vive en cinco lugares con dos comportamientos
distintos**: rechaza en `actions.ts:1120`, `:1170` y `:1214`; **auto-corrige** a +30 días en
`kaizen-from-idea.ts:14` y en `actions.ts:1826-1828`.

**`Area.supervisorId`, `OrgUnit.routingUserId` y `OrgEscalationRule.reviewerMembership`
designan lo mismo** ("quién recibe las ideas de este QR") y el código los sincroniza a mano en
cinco lugares (`estructura/actions.ts:153-163`, `:346-349`, `:414-417`, `:443-446`, y otra vez
en `actions.ts:1890-1899`).

### 2.4 Permisos: los cuatro problemas reales

1. **`canManageActivities` no hace lo que dice su etiqueta.** Se presenta como "Puede
   gestionar actividades" (`organization-hierarchy-editor.tsx:111`) pero **no da acceso a
   Kaizen ni GENBA** — `module-access.ts:14-24` no la consulta. Sus únicos usos reales son
   el avance de implementación de una *idea* (`actions.ts:760-770`) y un filtro de
   `/seguimientos`. Un administrador que la marque se equivocará en silencio.
2. **MEJORA_CONTINUA ve todo y no puede aprobar** (§1.2). Es la contradicción más difícil de
   explicar.
3. **`level` (0-99) y `EscalationRule.submitterLevel` nunca se usan para decidir permisos**,
   solo para ordenar listas. Parecen jerarquía y no lo son.
4. **Cinco casillas presentadas como iguales** (`organization-hierarchy-editor.tsx:109-113`)
   sin decir que `canReviewTeam` es la única transitiva, que `canReceiveIdeas` es requisito
   para ser ruta, y que `setAsRoute` escribe en **otras dos tablas**.

### 2.5 Datos que se pueden perder

- **La captura pierde todo lo escrito ante un error de validación.** Todos los campos usan
  `placeholder`, ninguno `defaultValue` (`captura/[code]/page.tsx:238-296`). Un operador en el
  piso, con el celular, que olvide un campo obligatorio **reescribe los tres textos largos**.
  El mismo patrón mata los expedientes: si "Editar proyecto" falla, los `<details>` colapsan y
  se pierden los 15 campos (`kaizen/[id]/page.tsx:247`).
- **La idea no se crea si el área no tiene ruta.** `actions.ts:240-242` redirige a
  `?error=sin_responsable`. El colaborador escribió todo, recibe un error de configuración que
  no puede resolver, y **no queda registro de que hubo un intento**.
- **Ideas huérfanas sin que nadie se entere**, por tres vías:
  (a) si el aprobador se desactiva después de la captura, nada reasigna — y `auth.ts:81-83`
  filtra por `active`, así que esa persona ya no puede entrar;
  (b) `deleteMembershipAction` (`estructura/actions.ts:436-451`) **no valida rutas activas**
  (su gemela `saveMembershipAction:311-316` sí) y `OrgEscalationRule.reviewerMembership` es
  `onDelete: Cascade` (`schema.prisma:363`) → borrar una membresía **borra en silencio todas
  sus rutas**;
  (c) `markOverdueIdeas` (`workflow.ts:223-259`) solo actúa sobre `dueDate`, que se asigna en
  la clasificación — **después** de la aprobación. Una idea atorada en revisión inicial nunca
  se marca VENCIDA ni genera aviso. `scripts/reminders.ts` es manual: no hay cron ni ruta que
  lo invoque.
- **`hard-delete.ts` destruye el AuditLog en lugar de registrarse en él.**
  `deleteAuditReferences:63-80` borra entradas por *substring* de folio, y en el purgado total
  borra por entidad completa. Después de un reinicio **no queda evidencia de que ocurrió**. La
  propia UI lo admite (`datos/page.tsx:215`). Es grave en un sistema cuyo propósito es la
  trazabilidad. `deleteOrganizationUnitAction:468-486` y `deletePlantAction:488-504` tampoco
  escriben AuditLog, a diferencia del resto del archivo.
- **`deleteMembershipAction` y `deleteEscalationRuleAction` no piden confirmación de ningún
  tipo**: botón que ejecuta al primer clic (`organization-hierarchy-editor.tsx:119-122`, `:178`).
- **`auth.ts:12,26`**: el secreto de sesión tiene un default `"dev-secret-change-me"`. En
  producción lanza si falta (`:23-25`), pero cualquier despliegue con `NODE_ENV !==
  "production"` firma cookies con un secreto público y permite forjar una sesión ADMIN.

### 2.6 Escala: consultas sin límite

`take:` aparece en solo **13 de 34 páginas**. No tienen ninguno: `/seguimientos`, `/dashboard`,
`/panorama`, `/kaizen`, `/genba`, ambos kanban, `/kanban`, `/mejora`, `/implementacion`,
`/vencidas`, `/kaizen/gantt`, `/configuracion/estructura`.

Los tres peores casos:

- **`/seguimientos`** (`:101-170`) es la bandeja de **todos los roles** y trae *todas* las
  ideas + *todos* los Kaizen + *todos* los GENBA con `include` profundos y sin `take`. Para
  ADMIN/MC es la base completa en cada render. La paginación de `OperationsWorkboard:166-167`
  es **solo de cliente**: ya se trajo todo a memoria.
- **`/probocacoins:180`**: `participant.findMany` sin `where` ni `take` — carga los 1000+
  participantes solo para poblar un selector.
- **`/configuracion/estructura`**: `getOrganizationStructure` (`organization.ts:235-256`) trae
  plantas → unidades → membresías → usuario → manager sin paginar y lo serializa completo al
  cliente. Cada `<select>` de "jefe directo" se pinta con 1000+ `<option>` sin búsqueda
  (`organization-hierarchy-editor.tsx:106`, `:173`). Y `saveMembershipAction`
  (`estructura/actions.ts:282`) carga **toda** la tabla de membresías en cada guardado solo
  para detectar ciclos.

**Estructura organizacional no sirve para 1000 personas:** es un editor de *nodos*, no de
*personas*. Sin carga masiva (ni CSV ni pegar-desde-Excel), sin búsqueda de personas —
`matchesNode` (`organization-builder.tsx:103-114`) indexa el nodo, no sus membresías, así que
buscar "Juan Pérez" no lo encuentra — y sin ninguna vista de "todas las membresías de X".
La misma persona en 20 áreas está permitida y sin advertencia; combinado con `canReviewTeam`
transitivo, es fácil crear superpoderes por accidente.

---

## 3. Crítica franca del diseño actual

### 3.1 Lo que funciona y hay que conservar

- **La captura por QR es la mejor pantalla del sistema.** Tres pasos, lenguaje llano,
  ejemplos en los `placeholder`, `capture="environment"` para la cámara,
  `inputMode="numeric"`, error por campo con texto humano ("Puedes usar frases cortas; no
  tiene que quedar perfecto", `:213`), y botón deshabilitado si el área no tiene ruta
  (`:347`). Es el estándar al que deben subir las demás.
- **`OperationsWorkboard`** es una buena base: tabla agrupada + kanban + panel, filtros,
  densidad, selección múltiple, cajón de detalle con foco atrapado, preferencias en
  `localStorage`. Es lo correcto sobre lo que construir.
- **Los mensajes de error de `estructura/actions.ts`** son ejemplares: lenguaje natural y
  accionable. *"Esta persona es la ruta directa de su area. Asigna primero otro responsable
  que este activo y pueda recibir ideas."* (`:326`). Ese es el tono para todo el sistema.
- El motor de flujo (`workflow.ts`) y el modelo de visibilidad (`idea-access.ts`) son
  correctos. El problema no es la lógica, es que **no se explica en ninguna pantalla**.

### 3.2 Lo que sigue siendo decorativo

- **`ProbocaCoinsCelebration`** (`kaizen/[id]/page.tsx:105`): 115 líneas, 17 monedas cayendo
  con `delay`/`drift`/`scale` a mano y un botón de volumen. Confeti.
- **El indicador de pasos de la captura** (`captura/[code]/page.tsx:179-198`): tres tarjetas
  que dicen "Paso 1 / Paso 2 / Paso 3", no son interactivas, no marcan progreso — y
  `FormSectionTitle:76` **vuelve a escribir "Paso N"** cinco líneas más abajo. La misma
  etiqueta dos veces en pantalla.
- **La "Ficha ejecutiva"** de Kaizen (`[id]/page.tsx:119-127`) repite datos que ya están en la
  banda superior y en el `aside`: el líder aparece **tres veces** (ficha `:122`, lista de
  equipo `:135`, selector de edición).
- **El resumen del recorrido GENBA** (`genba/[id]/page.tsx:241`): `dl` de 6 filas donde
  **cinco** ya aparecen textualmente arriba.
- **`SectionHeading count=`** (`kaizen/[id]:130`, `:157`, `:184`) duplica el conteo que la
  propia sección ya muestra.
- **La columna "Cerrados" del Kanban GENBA está muerta**: la consulta filtra
  `status: "ABIERTO"` (`genba/kanban/page.tsx:36`) y `walkColumn:26` devuelve `CERRADAS` solo
  si `status !== "ABIERTO"`. Renderiza permanentemente "Sin recorridos". En Kaizen esa misma
  columna sí se llena, pero **solo porque falta el auto-cierre** — es una columna que existe
  para tapar un bug.
- **El Gantt renderiza ~3200 divs vacíos** con 60 proyectos (53 celdas × N,
  `gantt/page.tsx:96`), sin virtualización, y **nunca muestra las actividades** aunque tengan
  `startDate`/`dueDate`. Es un Gantt que no grafica el trabajo.
- **`completionNote` se rellena con texto de relleno**: si se completa sin nota se escribe
  `"Actividad completada con evidencia."` (`actions.ts:1339`, `:1752`) y el expediente lo
  muestra como si fuera un resultado real (`kaizen/[id]/page.tsx:170`).

### 3.3 El sistema de diseño no existe todavía

Medido sobre `e433df6`:

| Métrica | Valor | Lectura |
|---|---|---|
| Líneas de `globals.css` | 2 463 | Ha crecido mucho |
| **Colores hex distintos en `globals.css`** | **105** | Una paleta de producto usa 12-20 |
| **Colores hex distintos en `.tsx`** | **62** | Deberían ser 0: todos vía token |
| Variables CSS declaradas | **27** | Insuficientes para 105 colores |
| `@media` en `globals.css` | 10 | Poco para 34 pantallas |
| `<Suspense>` en todo `src/` | **0** | — |

Hay hex incrustados en TypeScript en al menos: `app-shell.tsx:136-144` (paleta de roles),
`follow-up-table.tsx:45-52`, `dashboard-command-center.tsx:45-51`,
`kaizen-command-center.tsx:44-60`, `genba-command-center.tsx`. **La paleta de roles —
justamente lo que `CLAUDE.md` manda conservar — vive hardcodeada en un componente cliente**,
no en tokens.

Las consecuencias medibles de esto —**6 de 11 colores de estado fallan el contraste WCAG AA**,
el mismo significado cambia de color entre pantallas, y hay **dos componentes de estado
distintos** conviviendo— están cuantificadas en **§4.7**, y la paleta de reemplazo en **§4.8**.

### 3.4 La inversión está invertida

`/seguimientos` es la bandeja de **todos los roles** y sí usa `OperationsWorkboard` vía
`FollowUpTable:133` — eso está bien. Pero el trabajo fino de los últimos turnos (BI
interactivo, panorama ejecutivo, filtros persistentes) se concentró en `/panorama` y
`/dashboard`, **rutas restringidas a ADMIN y MEJORA_CONTINUA** (`app-shell.tsx:111,117`), es
decir, un puñado de personas. Mientras tanto el operador que cierra una actividad sigue
perdiendo lo que escribe si falla una validación, y el supervisor sigue sin poder decidir en
lote. **Antes de más BI, hay que arreglar el trabajo diario de los mil.**

---

## 4. Benchmark de gestión visual

Esta sección no compara funciones ni precios. Compara **cómo cada herramienta comunica estado
de un vistazo**, porque eso es lo que PROpEx necesita: que un tablero se lea como un tablero de
piso — sin interpretar, sin abrir nada, a distancia.

**Todas las URLs de §4.6 fueron abiertas y verificadas en esta sesión.** Donde no pude
confirmar el contenido, se dice.

### 4.1 Las seis reglas que salen del benchmark

| # | Regla | De dónde sale |
|---|---|---|
| **VM-1** | **El color nunca va solo.** Siempre acompañado de texto, icono, forma o peso tipográfico | WCAG 1.4.1 (Nivel A). Asana lo aplica poniendo las fechas vencidas **en negritas**, no solo en rojo |
| **VM-2** | **Las categorías de estado son fijas; los nombres y colores dentro de cada categoría, no** | Linear: las categorías (Backlog → Todo → In Progress → Done → Canceled) son inamovibles; el equipo solo reordena y renombra dentro de ellas |
| **VM-3** | **Un color = un significado, en todo el sistema.** Una sola definición, no una por pantalla | Atlassian resuelve estado con un componente único (Lozenge) con variantes cerradas, no con hex sueltos |
| **VM-4** | **Lo urgente se señala por redundancia, no por saturación**: color + posición + peso. Nunca "más rojo" | Asana (negritas en vencidos); NN/g sobre tablas |
| **VM-5** | **El volumen se controla con estructura, no con scroll**: encabezados fijos, agrupación colapsable, techo por grupo, primera columna anclada en móvil | NN/g, *Data Tables: Four Major User Tasks* |
| **VM-6** | **Tres a cinco destinos** en la navegación inferior. Menos, usa pestañas; más, usa cajón | Material Design 3, navigation bar |

### 4.2 Monday.com — el modelo de datos visible
**Su aporte visual:** la columna de estado como *tipo de dato*. El color no lo elige quien
escribe la fila; está atado al valor del catálogo. Un tablero Monday se lee como un mosaico de
bloques saturados porque cada celda de estado es un rectángulo lleno, no una etiqueta suelta.

- **Copiable:** el catálogo cerrado de estados con color asignado una sola vez. Sustituye los
  105 hex de `globals.css` por una tabla de verdad.
- **Copiable:** `Board → Group → Item → Subitem` como jerarquía visual — da el nivel de
  subactividad que hoy no existe (§7).
- **No copiar:** que el usuario final configure sus tableros. En PROpEx el flujo lo fija
  `CLAUDE.md`; si cada área inventa su tablero se pierde la comparación entre plantas.
- **Cuidado — esto ya pasó.** Los hex de estado de PROpEx (`#fdab3d`, `#579bfc`, `#e2445c`,
  `#a25ddc`, `#784bd1`, `#676879`, `#c4c4c4`) **son la paleta de Monday copiada literalmente**,
  repartida a mano en cuatro componentes. Se copiaron los valores sin el sistema que los
  sostiene: sin catálogo, sin tokens y sin la verificación de contraste. Es exactamente el
  "copiar superficialmente" que hay que evitar. Ver el diagnóstico en §4.7.

### 4.3 Asana — la redundancia de codificación

**Su aporte visual, y el más valioso de todo el benchmark:** su modo para daltonismo no se
limita a cambiar colores. Al activarlo, Asana **remapea la paleta** para protanopia y
deuteranopia **y además pone las fechas vencidas en negritas**. Es decir, añade un segundo
canal de información que no depende del color en absoluto. Es un ajuste por persona, que no
altera lo que ven los compañeros.

- **Copiable, y es la regla VM-1:** lo vencido no se marca solo en rojo. Se marca en rojo **y**
  en negritas **y** con icono. Rojo y verde son justamente el par que confunde la deuteranopía,
  y en PROpEx `#e2445c` (vencido) y `#00a878` (completado) son ese par exacto.
- **Copiable:** "Mi trabajo" agrupado por *cuándo* (hoy / próximos / después), no por *por qué*.
  `/seguimientos` ya agrupa por urgencia en `follow-up-table.tsx:56-67` — va bien encaminado.
- **No copiar:** Portfolios y Goals. `/panorama` ya existe; otra capa de agregación sobre 60
  proyectos es peso muerto.

### 4.4 Linear — categorías fijas, apariencia libre

**Su aporte visual:** el estado se dibuja como un **icono de progreso circular** que se llena,
no como una etiqueta de color. La forma comunica el avance aunque el color no se distinga. Y
estructuralmente: las categorías de flujo (Backlog → Todo → In Progress → Done → Canceled) son
**fijas**; un equipo puede renombrar y recolorear estados *dentro* de una categoría y
reordenarlos, pero no puede mover las categorías.

- **Copiable, regla VM-2:** PROpEx tiene 17 estados de Idea (`domain.ts:64-82`) y 6 de
  actividad. Agrupar en **cinco categorías fijas** — Entrada, Validación, Ejecución, Cierre,
  Detenida — y que el color viva en la categoría, no en el estado. `dashboard-command-center.tsx:45-51`
  ya tiene esos cinco grupos: hay que subirlos a `domain.ts` y usarlos en todas las pantallas.
- **Copiable:** la forma como portador de significado (anillo de progreso), que cumple VM-1
  sin gastar color.
- **No copiar:** la densidad extrema ni el teclado como interfaz primaria. Sirve para Mejora
  Continua en escritorio; el operador usa celular con guantes.

### 4.5 ClickUp y Jira — las dos advertencias

**ClickUp** es la lección negativa: jerarquía de cinco niveles (Space → Folder → List → Task →
Subtask) y decenas de vistas conmutables. Su crítica recurrente es la sobrecarga por
acumulación — que es exactamente hacia donde va `/entrenamientos` con cuatro pantallas en una
ruta. **Tope para PROpEx: tres niveles.**

**Jira** aporta un patrón visual sólido y uno peligroso.
- **Copiable:** el **Lozenge** del Atlassian Design System — un componente único con variantes
  cerradas para estado, en vez de color libre por pantalla. Su documentación lo define como una
  etiqueta compacta para comunicar un atributo que afecta cómo se prioriza un objeto. Es la
  regla VM-3 hecha componente. PROpEx **ya tiene** ese componente: `StatusPill`.
- **Copiable:** las **colas por filtro guardado** de Service Management — el molde para
  convertir las cinco rutas de bandeja en filtros de "Mi trabajo" (§5.4).
- **No copiar:** el editor de flujos configurable por proyecto. Es lo que vuelve a Jira
  inaccesible para personal operativo.

### 4.6 Referencias verificadas

Todas abiertas y comprobadas en esta sesión (2026-08-15):

| Referencia | URL | Qué aporta |
|---|---|---|
| WCAG 2.1 SC **1.4.1 Uso del color** (Nivel A) | `https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html` | Texto exacto: el color no debe ser el único medio visual para transmitir información o distinguir un elemento |
| WCAG 2.1 SC **1.4.11 Contraste no textual** (Nivel AA) | `https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html` | **3:1** para componentes de interfaz y objetos gráficos necesarios para entender el contenido |
| WCAG 2.1 SC **2.5.5 Tamaño del objetivo** (**Nivel AAA**) | `https://www.w3.org/WAI/WCAG21/Understanding/target-size.html` | 44×44 px CSS. *Ojo: es AAA, no AA.* Se adopta como estándar interno por ser planta con guantes |
| NN/g, **Progressive Disclosure** (Jakob Nielsen, 2006) | `https://www.nngroup.com/articles/progressive-disclosure/` | Mostrar pocas opciones principales; las secundarias solo si se piden |
| NN/g, **Data Tables: Four Major User Tasks** | `https://www.nngroup.com/articles/data-tables/` | Encabezados congelados, zebra striping, resaltado al pasar el cursor; en móvil **anclar la primera columna** en vez de scroll horizontal ciego |
| **Material Design 3**, navigation bar | `https://m3.material.io/components/navigation-bar/guidelines` | **3 a 5 destinos**. Menos de 3 → pestañas; más de 6 → cajón. Destinos de igual importancia |
| **Asana**, modo para daltonismo | `https://asana.com/inside-asana/new-accessibility-feature-colorblind-friendly` · ajuste en `https://help.asana.com/s/article/display-settings` | Remapea la paleta (protanopia y deuteranopia) **y pone las fechas vencidas en negritas** |
| **Linear**, configuración de flujos | `https://linear.app/docs/configuring-workflows` | Categorías fijas, estados renombrables y recoloreables dentro de cada una |
| **Atlassian Design System**, Lozenge | `https://atlassian.design/components/lozenge/examples` | Componente único de estado con variantes cerradas |

**Verificación parcial, no citar como fuente sin volver a abrir:** `https://vibe.monday.com/`
(el sistema de diseño Vibe existe y el título responde, pero la página se arma con JavaScript y
no pude leer su documentación de color) y la documentación de ClickUp.

### 4.7 Diagnóstico de PROpEx contra las seis reglas

| Regla | Estado | Evidencia |
|---|---|---|
| **VM-1** color nunca solo | **Parcial** | `StatusPill` cumple (color + punto + texto). `WorkStatus` cumple por el texto. **Pero las barras de avance no**: `operations-workboard.tsx:353` y `:387` tiñen la barra con `statusColor` sin etiqueta — ahí el color es el único portador |
| **VM-2** categorías fijas | **No** | 17 estados planos (`domain.ts:64-82`). Los cinco grupos existen pero solo dentro de un componente cliente (`dashboard-command-center.tsx:45-51`) |
| **VM-3** un color, un significado | **No** | Ver tabla de deriva abajo |
| **VM-4** urgencia por redundancia | **No** | Lo vencido se marca solo con color y una clase `is-risk`. No hay negritas ni icono. Y rojo/verde son el par que confunde la deuteranopía |
| **VM-5** volumen por estructura | **Parcial** | El workboard agrupa y colapsa bien. Los Kanban dedicados no tienen techo ni paginación (§8) |
| **VM-6** 3-5 destinos móviles | **No** | `.slice(0, 3)` deja 3 y tira GENBA (`app-shell.tsx:292`) |

**Dos defectos medibles y verificables:**

**a) Seis de once colores de estado fallan el contraste**, con el color de texto que el propio
componente elige. La causa está en `operations-workboard.tsx:86-92`: usa la fórmula de brillo
YIQ con umbral `0.58` en lugar de la luminancia relativa de WCAG, y por eso pone texto blanco
sobre colores medios donde el blanco no alcanza.

| Color | Significado | Texto que elige | Contraste | AA 4.5:1 |
|---|---|---|---|---|
| `#579bfc` | En proceso / validación | blanco | **2.80** | **falla** |
| `#00a878` | Completado | blanco | **3.06** | **falla** |
| `#00a86b` | Completado *(otra pantalla)* | blanco | **3.08** | **falla** |
| `#7f8c8d` | Neutro | blanco | **3.48** | **falla** |
| `#e2445c` | Vencido / bloqueado | blanco | **4.03** | **falla** |
| `#a25ddc` | Validación final | blanco | **4.09** | **falla** |
| `#a16207` | Charter pendiente | blanco | 4.92 | pasa |
| `#676879` | Cancelado | blanco | 5.48 | pasa |
| `#784bd1` | En pausa | blanco | 5.64 | pasa |
| `#fdab3d` | Ámbar / atención | oscuro | 9.45 | pasa |
| `#c4c4c4` | Pendiente | oscuro | 10.28 | pasa |

Los cuatro que más se ven — en proceso, completado, vencido y neutro — están entre los que
fallan. La píldora usa `0.79rem` en negrita (`globals.css:977`), que **no** califica como texto
grande, así que el umbral aplicable es 4.5:1.

**b) El mismo significado cambia de color según la pantalla** — rompe VM-3:

| Significado | Mi trabajo | Panel de Ideas | Kaizen / GENBA |
|---|---|---|---|
| Completado | `#00a86b` | `#00a878` | `#00a878` |
| Neutro / cancelado | `#7f8c8d` | `#676879` | `#676879` |
| Validación final | `#a25ddc` | `#a25ddc` | `#784bd1` |

Un supervisor que pasa de "Mi trabajo" a Kaizen ve dos verdes distintos para lo mismo. En
gestión visual eso no es un detalle estético: es ruido que obliga a interpretar.

**c) Hay dos vocabularios de estado conviviendo.** `StatusPill` (pastel, borde, punto y texto,
14 archivos — las pantallas operativas) y `WorkStatus` (relleno saturado, texto calculado, sin
punto, `globals.css:976` — el workboard nuevo). Son dos idiomas para lo mismo.

### 4.8 La paleta de estado propuesta

Una sola definición, en `domain.ts`, expuesta como tokens CSS. Cinco categorías (VM-2), color
con contraste verificado sobre texto oscuro (VM-1 y 1.4.11), y un segundo canal por categoría:

| Categoría | Estados que agrupa | Fondo | Texto | Segundo canal |
|---|---|---|---|---|
| **Entrada** | Registrada, En revisión, Solicitud de información | azul claro | oscuro | icono de bandeja |
| **Validación** | Aprobada por responsable, las tres validaciones | violeta claro | oscuro | icono de escudo |
| **Ejecución** | Aprobada para implementar, Clasificación, En implementación | ámbar claro | oscuro | anillo de progreso |
| **Cierre** | Implementada, Validación final, Cerrada | verde claro | oscuro | palomita |
| **Detenida** | Rechazadas, Cancelada, Vencida | rojo claro | oscuro | icono de alto + **negritas** |

Reglas de aplicación:
1. **`StatusPill` es el único componente de estado.** `WorkStatus` se retira y el workboard lo
   consume. Un idioma, no dos.
2. **Fondo claro y texto oscuro**, como ya hace `StatusPill`. Resuelve el contraste de un golpe
   y evita depender del cálculo de luminancia.
3. **Lo vencido siempre lleva negritas e icono**, además de rojo (Asana, VM-4).
4. **Las barras de avance llevan porcentaje escrito** — ya lo hace en la tabla
   (`operations-workboard.tsx:353`), falta en la tarjeta Kanban.
5. **El acento de módulo (ámbar Kaizen, rojo GENBA) no toca las píldoras de estado.** Tiñe
   cabecera y bordes. Si el acento de GENBA (`#ea0029`) y el rojo de "vencido" (`#e2445c`)
   comparten superficie, se pierden los dos.

---

## 5. Rediseño propuesto, pantalla por pantalla

Principio rector: **tres niveles de profundidad y nunca más.**
`Módulo → Lista de trabajo → Expediente`. Todo lo demás es una vista o un filtro de esos tres,
nunca una ruta nueva.

### 5.1 Barra lateral — de 21 destinos a 7

```
TRABAJO
  Mi trabajo            /seguimientos      (todos)
  Ideas de mejora       /ideas             (según visibilidad)
  Proyectos Kaizen      /kaizen            (según acceso)
  Recorridos GENBA      /genba             (según acceso)
  Entrenamientos        /entrenamientos    (ADMIN, MC)
CONTROL
  Panel ejecutivo       /panorama          (ADMIN, MC)
  Administración        /configuracion     (ADMIN)
```

- Las bandejas (`/supervisor`, `/validaciones/*`, `/mejora`, `/implementacion`, `/vencidas`)
  **dejan de ser rutas** y pasan a ser *filtros guardados* dentro de "Mi trabajo", con su
  contador. Es el patrón de colas de Jira.
- `/kanban`, `/kaizen/kanban`, `/genba/kanban`, `/kaizen/gantt`, los tres repositorios y
  `/ideas` **desaparecen como rutas** y se vuelven vistas del tablero del módulo:
  `Tabla · Kanban · Gantt · Panel`, más un conmutador `Activos / Histórico`.
  `OperationsWorkboard` ya tiene tres de esas cuatro vistas.
- `/probocacoins` pasa a ser una pestaña de Entrenamientos (mismo dominio: personas y saldos).
- `/auditoria`, `/configuracion/datos` y `/configuracion/migracion-2026` pasan a ser pestañas
  dentro de `/configuracion`. **Hoy dos de ellas no tienen ningún enlace entrante.**
- **Borrar `ideaNav`, `kaizenNav` y `genbaNav`** (`app-shell.tsx:69,95,103`). El buscador debe
  alimentarse solo de `visibleNav`.

### 5.2 Móvil — barra inferior de 4 destinos fijos

`Mi trabajo · Ideas · Kaizen/GENBA · Menú`. Quitar el `.slice(0, 3)` (`app-shell.tsx:292`) y
fijar los destinos por rol en vez de derivarlos de `preferred`, para que GENBA no se caiga.
Material 3 admite de 3 a 5; cuatro es el punto correcto.

### 5.3 Captura por QR — conservar y arreglar dos cosas

No tocar la estructura. Dos cambios:

1. **Preservar lo escrito ante un error.** Devolver los valores y pintarlos con `defaultValue`.
   Es el cambio de mayor impacto de todo el informe: hoy un error de validación borra tres
   textos largos escritos con el pulgar.
2. **Quitar el indicador de pasos duplicado** (`:179-198`); `FormSectionTitle` ya lo dice.

Pendiente de decisión del usuario: la captura pide al colaborador su **categoría A/B/C**
(`CaptureClassification`, `:304`) y su **circunstancia de escalamiento** (`:259-274`). Ambos
son conceptos de configuración interna. Clasificar es tarea de Mejora Continua según
`CLAUDE.md`. Recomiendo mover la categoría a la clasificación y dejar la circunstancia solo si
el área tiene más de una ruta activa.

### 5.4 Mi trabajo (`/seguimientos`) — la pantalla más importante

- Encabezado con **filtros guardados como fichas con contador**: `Por aprobar (3) · Mis
  actividades (7) · Vencidos (2) · Mi equipo (14)`. Sustituye a las cinco rutas de bandeja.
- Vista por defecto: **tabla agrupada por urgencia** (ya existe en `follow-up-table.tsx:56-67`).
- **Acciones en lote** sobre la selección que ya existe (`operations-workboard.tsx:293-300`):
  Aprobar · Rechazar con motivo · Reasignar · Nueva fecha. Hoy solo se pueden copiar folios.
- **Paginación en servidor**, no en cliente (§2.6).

### 5.5 Expediente Kaizen / GENBA — pestañas

Esto coincide con el siguiente paso que dejó anotado Codex, y lo confirma la auditoría:

```
[ Resumen ]  [ Actividades (12) ]  [ Evidencias (8) ]  [ Bitácora (60) ]  [ Cierre ]
```

- **Resumen**: estado, avance, objetivo, meta vs real, líder, periodo. Una sola vez cada dato.
  Eliminar la "Ficha ejecutiva" y el `dl` de GENBA (§3.2).
- **Actividades**: tabla con subactividades plegables (§7). Sin formularios anidados.
- **Cierre**: checklist + formulario. **Deja de estar al final de la bitácora** en pantallas
  menores a 1280px, que es el defecto de layout más molesto hoy.
- Los formularios largos pasan a **cajón lateral con estado controlado**, no `<details>`
  nativo, para que un error de validación no colapse y borre 15 campos.

### 5.6 Panel ejecutivo (`/panorama`)

Reducir a **cinco preguntas accionables**, cada cifra enlazada al tablero ya filtrado:
1. ¿Qué está vencido y de quién es? 2. ¿Qué lleva más de N días sin moverse?
3. ¿Qué áreas no capturan ideas? 4. ¿Cuánto ahorro comprobado llevamos?
5. ¿Qué se va a cerrar este mes?

Toda cifra que no lleve a una lista de trabajo, se elimina.

---

## 6. Identidad y color

Se conserva sin cambios: identidad Proboca, Supervisor **verde**, Calidad **rojo**, Seguridad
**gris**, Mantenimiento **azul**, Mejora Continua y Admin **oscuro**, Ideas identidad PROpEx,
Kaizen **ámbar**, GENBA **rojo**.

Dos decisiones que hay que tomar explícitamente porque hoy están resueltas por accidente:

1. **Colaborador no puede seguir en `#ea0029`** (`app-shell.tsx:143`): choca con el rojo de
   Calidad (`#d32236`) y con el acento de GENBA. Propongo el oscuro neutro de la marca.
2. **Rol vs módulo.** Hoy el módulo pisa al rol (`:268-272`). Propongo separarlos por función:
   **el módulo tiñe la cabecera y el acento de la página** (dónde estoy) y **el rol tiñe solo
   el chip de identidad y el avatar** (quién soy). Así ninguno borra al otro.

Y una tarea mecánica: **mover los 62 hex de los `.tsx` y la paleta de roles a tokens CSS**.
El objetivo es que `roleTheme` lea variables, no literales.

---

## 7. Actividades, subactividades, validaciones, responsables, evidencias y cierres

### 7.1 Lo que hoy falta en el modelo (`prisma/schema.prisma`)

- **No existen subactividades.** `KaizenActivity:652` y `GenbaActivity:730` son planas: no hay
  `parentId`. Las únicas auto-relaciones son `mergedInto` (combinar) y `sourceGenbaActivity`.
  **Ojo con la terminología:** el panel ya llama "Subelemento" a las actividades
  (`operations-workboard.tsx:366`) — es jerarquía visual fingida, no estructural. Un usuario
  que busque "subelemento" en el expediente no lo encuentra.
- **No existe validación de cierre.** Hay `closedAt`, `completionNote` y `cancellationReason`,
  pero ningún `validatedById` / `validatedAt`. **Quien cierra su propia actividad la da por
  buena; nadie la revisa.**
- **La evidencia no está forzada por el esquema** (`KaizenAttachment.activityId` es opcional);
  la regla vive solo en las acciones. Y es **un solo archivo, solo en el instante del cierre**:
  el `<input type="file">` no tiene `multiple` (`kaizen/[id]/page.tsx:175`). No se puede
  adjuntar evidencia parcial durante la ejecución, ni un segundo archivo, ni borrar uno mal
  subido.
- **Asimetría Kaizen/GENBA**: `KaizenActivity` tiene `startDate` + `dueDate`; `GenbaActivity`
  **solo** `dueDate`. Por eso GENBA no puede tener Gantt.
- **Doble fuente de ubicación**: `KaizenProject.plant` y `.area` son texto libre y además
  existe `orgUnitId`. El parche ya está en el código (`seguimientos/page.tsx:292`).
- **`GenbaWalk.expectedDepartments` / `attendedDepartments` son texto JSON con nombres de
  departamento**, no relaciones a personas. La asistencia GENBA no es por persona, así que no
  se puede cruzar con Entrenamientos ni con la plantilla de 1000+.

### 7.2 Diseño recomendado

**Modelo** (los dos esquemas Prisma, migración local primero):

```
Activity
  parentId          → self-relation, UN solo nivel de subactividad. Nunca dos.
  ownerId           → responsable único (se conserva)
  startDate/dueDate → en ambos módulos, para que GENBA también tenga Gantt
  status            → PENDIENTE · EN_PROCESO · BLOQUEADA · EN_VALIDACION ·
                      COMPLETADA · CANCELADA · COMBINADA
  requiresValidation, validatedById, validatedAt, validationNote   ← nuevos
Evidence  (N por actividad, no 1)
  activityId, type (ANTES|DESPUES|SOPORTE), uploadedById, createdAt
```

**Reglas:**
- El avance del padre se **deriva** de sus hijas; no se edita a mano. Si no tiene hijas,
  cuenta ella misma. `workProgress` (`domain.ts:184`) sigue siendo la única implementación —
  hay que **borrar las tres copias** (§2.3).
- **Completar sin evidencia sigue prohibido**, pero se puede adjuntar evidencia *durante* la
  ejecución, no solo al cerrar.
- **`EN_VALIDACION` es el estado nuevo que hoy falta**: quien ejecuta marca "lista"; quien
  validó la actividad (líder, coordinador o Mejora Continua) confirma. Solo entonces
  `COMPLETADA`. Aplicar `requiresValidation` solo a actividades de seguridad, calidad o con
  ahorro declarado, para no burocratizar las triviales.
- Cancelar sigue exigiendo justificación; combinar sigue exigiendo justificación.
- **Eliminar el texto de relleno** `"Actividad completada con evidencia."`
  (`actions.ts:1339`, `:1752`): si no hay nota, el campo queda vacío.

### 7.3 Dos bugs de flujo que hay que arreglar antes de rediseñar nada

1. **El Kaizen no se cierra solo.** `refreshKaizenProject` (`actions.ts:135-146`) solo hace
   `PLANIFICACION → EN_CURSO`. Su gemela GENBA justo abajo (`:148-157`) **sí** cierra. Es un
   incumplimiento directo de `CLAUDE.md`. La UI ya detecta el estado ("Listo para cerrar",
   `kaizen/[id]/page.tsx:193`) pero no actúa. Y la columna "Cerrados" del Kanban Kaizen existe
   solo para tapar este hueco.
2. **Folio Kaizen: tres implementaciones, dos sin protección de carrera.**
   `actions.ts:1123-1128` y `:1824-1832` no reintentan ante colisión; `number` y `folio` son
   `@unique` (`schema.prisma:598-599`), así que dos altas simultáneas revientan con un 500 sin
   manejar. Solo `kaizen-from-idea.ts:44-69` reintenta ante `P2002`. Unificar en esa.

---

## 8. Cómo no saturar los Kanban

El diagnóstico es que **hay dos Kanban compitiendo**: el bueno vive dentro de
`OperationsWorkboard:383-390` (con filtros, buscador, orden y paginación) y el pobre vive en
`/kaizen/kanban` y `/genba/kanban` (sin ninguno de los cuatro, y sin límite de tarjetas por
columna: con 80 proyectos activos, una columna es una lista vertical de 80).

**Propuesta:**

1. **Eliminar las rutas dedicadas.** El Kanban es la vista `kanban` del tablero del módulo. Se
   recupera de un golpe filtros, buscador, orden, paginación y el cajón de detalle.
2. **Columna = estado real, no estado derivado.** Hoy `projectColumn`
   (`kaizen/kanban/page.tsx:20-30`) inventa la columna a partir de las actividades, por eso
   "Cerrados" está muerta en GENBA y llena de mentiras en Kaizen.
3. **Techo duro de 20 tarjetas por columna** + "Ver las 63 restantes" que abre la vista tabla
   ya filtrada por esa columna. Es el mecanismo que ya usa `WorkboardInsights` al hacer drill
   (`operations-workboard.tsx:397-398`).
4. **Tarjeta de tres líneas**: folio + título (`line-clamp-2`), responsable + fecha, barra de
   avance. **Quitar las tres actividades embebidas** (`.slice(0,3)`): triplican la altura y
   para eso está el cajón de detalle.
5. **Agrupación conmutable**: por estado (defecto), por responsable, por planta. Un mismo
   tablero, tres lecturas — en vez de tres rutas.
6. **Colapsar columnas vacías** a una banda delgada, en vez de pintar cinco mensajes de
   "sin registros" a la vez (que es lo que pasa hoy con la base vacía).

---

## 9. Arquitectura visual desktop y móvil

### Desktop (≥1280px)
Tres zonas fijas: **barra lateral 240px** (7 destinos, §5.1) · **contenido** · **cajón lateral
420px** que se abre sobre el contenido para detalle y formularios largos, y que sustituye a los
`<details>` anidados. `OperationsWorkboard:414-438` ya tiene ese cajón con foco atrapado: hay
que reutilizarlo, no escribir otro.

### Tablet (768-1279px)
Barra lateral colapsada a iconos (ya existe, `app-shell.tsx:356-362`). **El `aside` del
expediente deja de caer al final del documento** — pasa a ser el cajón. Es el arreglo con más
impacto en este rango.

### Móvil (<768px)
- Barra inferior de **4 destinos fijos** (§5.2).
- **Las tablas no se muestran como tablas.** Cada fila es una tarjeta de tres líneas con la
  acción principal a la derecha. `operations-workboard.tsx` ya emite `data-label` en cada celda
  (`:349-353`) — la base está puesta, falta la regla `@media` que la use.
- Gantt y Kanban: en móvil se sustituyen por **lista agrupada**, no por scroll horizontal.
- Si alguna tabla conserva scroll horizontal, **anclar la primera columna** — es la
  recomendación de NN/g y hoy no se hace en ninguna.
- Objetivo táctil mínimo **44×44 px** en todo control. Es WCAG 2.5.5, que es **Nivel AAA**, no
  AA: lo adoptamos como estándar interno porque es planta y se opera con guantes. Hoy hay
  controles de `text-[9px]` con `min-w-5` en las fichas de `/seguimientos` (`:421`).
- Formularios de una sola columna, teclado correcto por campo (la captura ya lo hace bien:
  `inputMode="numeric"`, `:243`).

---

## 10. Estados de carga, vacío, error, bloqueo y permisos

**Inventario mecánico sobre 34 páginas:**

| Estado | Hoy |
|---|---|
| `loading.tsx` | **0 archivos** |
| `error.tsx` | **0 archivos** |
| `not-found.tsx` | **0 archivos** |
| `<Suspense>` | **0 usos** |
| `aria-live` / `role="alert"` | 14 usos |

Consecuencias reales:
- Cada `findUniqueOrThrow` sin captura (13 en `actions.ts`) lanza `P2025` → **pantalla de
  error genérica de Next.js**, sin marca y sin ruta de vuelta.
- Todas las páginas son `force-dynamic` con cascadas de 3+ consultas profundas. Hasta que
  resuelven, el navegador **se queda en la página anterior sin ninguna señal**.
- El manejo de errores real es por *query string*: `?error=xxx` mapeado a texto (13 casos en
  `kaizen/[id]:85-97`, 6 en `genba/[id]:87-101`). El mensaje **persiste en la URL** al recargar
  o compartir, **no se ancla al campo culpable**, y hay un `else` genérico que traga códigos
  no previstos. Hay códigos huérfanos: `actions.ts:1362` y `:1775` redirigen a
  `?error=combinacion` pero **ni `kaizen/page.tsx` ni `genba/page.tsx` leen `searchParams`**.
- **Sin-permiso es el peor de los cinco.** `requireKaizenAccess` redirige a
  `/dashboard?error=acceso-kaizen` (`module-access.ts:29`), pero (a) `dashboard/page.tsx:16`
  **no recibe `searchParams`** y descarta el código, y (b) `/dashboard` exige ADMIN/MC, así que
  a un SUPERVISOR lo vuelve a redirigir. **Doble redirección silenciosa**: clic en Kaizen →
  aterrizas en tu home sin una palabra. **No hay ninguna página de "sin acceso" en el
  proyecto.** Y `requireUser(roles)` (`auth.ts:89`) redirige sin parámetro alguno.

**Diseño recomendado**

| Estado | Qué hacer |
|---|---|
| **Carga** | `loading.tsx` por segmento con el esqueleto de la tabla (misma rejilla, sin datos). `<Suspense>` para envolver las secciones caras del expediente |
| **Vacío** | Un solo `EmptyState` por pantalla, con **una** acción sugerida. Nunca cinco mensajes de vacío a la vez. Cubrir el hueco de `OperationsWorkboard`: hoy en vista kanban/panel con cero registros se pinta **un contenedor en blanco** (`:383-401`), y como la vista se persiste en `localStorage` (`:196-199`) un usuario nuevo puede caer directo ahí |
| **Error** | `error.tsx` por módulo con marca, causa en lenguaje llano y "Reintentar". Los errores de formulario dejan de viajar por URL: se devuelven con los valores y **se anclan al campo** |
| **Bloqueo** | Estado explícito `BLOQUEADA` visible en el tablero con motivo y responsable de desbloquear. El modelo ya lo tiene; falta exponerlo |
| **Sin permiso** | **Página `/sin-acceso`** que diga qué módulo, qué permiso falta y **a quién pedírselo**, en vez de redirigir en silencio. Y que la barra lateral no muestre destinos que el guardia va a rebotar (hoy `app-shell.tsx:100` ofrece Kanban de Kaizen a COLABORADOR) |

---

## 11. Priorización

**P0 — Corrige pérdida de datos, incumplimientos de `CLAUDE.md` o riesgo real**

| # | Qué | Impacto | Esfuerzo | Criterio de aceptación |
|---|---|---|---|---|
| P0-1 | Preservar lo escrito en la captura ante error de validación | Muy alto | Bajo | Envío con campo faltante: los demás campos conservan su valor y el foco va al primero con error |
| P0-2 | Auto-cierre del Kaizen en `refreshKaizenProject` (`actions.ts:135-146`) | Alto | Bajo | Al cerrar la última actividad vigente, el proyecto pasa a COMPLETADO con `closedAt`, igual que GENBA |
| P0-3 | `hard-delete.ts` deja de borrar `AuditLog` y **escribe** una entrada de purga | Alto | Bajo | Tras un reinicio existe un registro con usuario, fecha, alcance y conteo de lo borrado |
| P0-4 | Página `/sin-acceso` + arreglar la doble redirección de `module-access.ts:29` | Alto | Bajo | Un SUPERVISOR que abre `/kaizen` ve qué permiso le falta y a quién pedirlo |
| P0-5 | `loading.tsx` y `error.tsx` por módulo | Alto | Medio | Ninguna navegación deja la pantalla anterior congelada; ningún `P2025` llega a la pantalla de Next.js |
| P0-6 | Confirmación en `deleteMembershipAction` y `deleteEscalationRuleAction`; validar rutas activas antes de borrar la membresía | Alto | Bajo | No se puede borrar una membresía que es ruta activa sin reasignar primero |
| P0-7 | Paginación en servidor en `/seguimientos`, `/dashboard`, `/panorama`, `/kaizen`, `/genba` | Alto | Medio | Ninguna página trae más de 50 registros por request; verificado con 1000 ideas |
| P0-8 | Rescatar las rutas huérfanas: enlazar `/configuracion/datos` y `/configuracion/migracion-2026`, y borrar `ideaNav`/`kaizenNav`/`genbaNav` | Medio | Bajo | Toda ruta viva tiene al menos un enlace entrante; el buscador no ofrece destinos inexistentes |
| P0-9 | **Contraste de los estados**: sustituir el cálculo YIQ de `operations-workboard.tsx:86-92` por fondo claro + texto oscuro (§4.8) | Alto | Bajo | Los 11 colores de estado alcanzan 4.5:1; se verifica con el cálculo de §4.7 |
| P0-10 | **Lo vencido deja de depender del color**: negritas + icono además del rojo (regla VM-4) | Alto | Bajo | Un usuario con deuteranopía distingue vencido de completado sin ver el color |

**P1 — Cambia la experiencia diaria**

| # | Qué | Impacto | Esfuerzo | Criterio de aceptación |
|---|---|---|---|---|
| P1-1 | Barra lateral de 7 destinos; bandejas como filtros guardados de "Mi trabajo" | Muy alto | Alto | Ningún rol ve más de 7 entradas; los contadores coinciden con las bandejas actuales |
| P1-2 | Expedientes Kaizen/GENBA con pestañas y cajón lateral *(pendiente que dejó Codex)* | Muy alto | Alto | Cerrar un proyecto no exige atravesar la bitácora en ningún ancho; un error no borra el formulario |
| P1-3 | Eliminar `/kaizen/kanban` y `/genba/kanban`; Kanban como vista del tablero con techo de 20 tarjetas | Alto | Medio | Con 80 proyectos ninguna columna pasa de 20 tarjetas y existe "ver las restantes" |
| P1-4 | Acciones en lote en "Mi trabajo" (aprobar, rechazar con motivo, reasignar, nueva fecha) | Alto | Medio | Un supervisor aprueba 10 ideas en una operación |
| P1-5 | **Un solo idioma de estado**: retirar `WorkStatus`, dejar `StatusPill` como único componente, y las cinco categorías fijas en `domain.ts` (§4.8) | Muy alto | Medio | Un mismo estado se ve idéntico en Mi trabajo, Ideas, Kaizen y GENBA |
| P1-5b | Tokens de color: mover los 62 hex de `.tsx` y la paleta de roles a variables CSS; resolver Colaborador vs Calidad y rol vs módulo | Alto | Medio | Cero literales hex en `.tsx`; la paleta de `CLAUDE.md` se lee de tokens |
| P1-6 | Móvil: 4 destinos fijos, tablas como tarjetas, objetivos táctiles de 44px | Alto | Medio | En 390×844 ninguna tabla se desborda y ningún control mide menos de 44px |
| P1-7 | ProbocaCoins: unificar libro mayor y conciliación de duplicados *(pendiente que dejó Codex)* | Medio | Medio | Se detecta y corrige un movimiento duplicado dejando rastro en auditoría |
| P1-8 | Partir `/entrenamientos` (1200 líneas, 4 pantallas) y arreglar `participant.findMany` sin `take` en `probocacoins:180` | Medio | Medio | Ninguna ruta supera 400 líneas; ninguna consulta trae los 1000+ participantes completos |

**P2 — Profundidad, cuando lo anterior esté firme**

| # | Qué | Impacto | Esfuerzo | Criterio de aceptación |
|---|---|---|---|---|
| P2-1 | Subactividades (`parentId`, un nivel) + estado `EN_VALIDACION` + `validatedById` + N evidencias | Alto | Alto | Una actividad se marca lista, otra persona la valida, y admite varias evidencias durante la ejecución |
| P2-2 | Unificar folios Kaizen en la implementación con reintento `P2002` | Medio | Bajo | Dos altas simultáneas producen dos folios consecutivos, sin 500 |
| P2-3 | Unificar `endDate ≥ startDate` en una sola función; eliminar las 5 copias y los 2 comportamientos | Medio | Bajo | Un único validador; nada auto-corrige a +30 días en silencio |
| P2-4 | Carga masiva de personas y búsqueda por persona en Estructura | Alto | Alto | Alta de 200 personas por CSV con reporte de errores por fila; buscar "Juan Pérez" lo encuentra |
| P2-5 | Reasignación automática al desactivar un aprobador + vigilancia de ideas atoradas en revisión inicial | Alto | Medio | Desactivar a un revisor con ideas pendientes las reasigna y avisa; una idea sin mover N días genera alerta |
| P2-6 | Gantt con actividades y `startDate` en GENBA; virtualizar | Medio | Alto | El Gantt grafica actividades y no renderiza miles de divs vacíos |
| P2-7 | Panel ejecutivo reducido a 5 preguntas accionables | Medio | Medio | Toda cifra enlaza a la lista de trabajo ya filtrada |

---

## 12. Archivos y componentes que Codex debería modificar

| Prioridad | Archivo | Qué hacer |
|---|---|---|
| P0-1 | `src/app/captura/[code]/page.tsx:238-296` + `src/app/actions.ts` (`submitIdeaAction`) | Devolver valores y pintarlos con `defaultValue` |
| P0-2 | `src/app/actions.ts:135-146` | Copiar la lógica de cierre de `:148-157` |
| P0-3 | `src/lib/hard-delete.ts:63-119` | Quitar el borrado de `AuditLog`/`NotificationOutbox`; añadir entrada de purga |
| P0-4 | `src/lib/module-access.ts:29,36`, `src/lib/auth.ts:89`, nueva `src/app/(app)/sin-acceso/page.tsx` | Redirigir a una página que explique |
| P0-5 | `src/app/(app)/{kaizen,genba,ideas,seguimientos,entrenamientos}/loading.tsx` y `error.tsx` | Crear |
| P0-6 | `src/app/(app)/configuracion/estructura/actions.ts:425-451`, `src/components/organization-hierarchy-editor.tsx:119-122,178` | Confirmación + validar rutas activas |
| P0-7 | `src/app/(app)/seguimientos/page.tsx:101-170`, `dashboard/page.tsx`, `panorama/page.tsx`, `kaizen/page.tsx`, `genba/page.tsx` | `take` + `skip` en servidor |
| P0-8 | `src/components/app-shell.tsx:69,95,103,282` | Borrar los tres arreglos muertos y sanear el buscador |
| P1-1 | `src/components/app-shell.tsx:110-134` | `unifiedNav` a 7 destinos; bandejas como filtros |
| P1-2 | `src/app/(app)/kaizen/[id]/page.tsx`, `src/app/(app)/genba/[id]/page.tsx` | Pestañas + cajón lateral |
| P1-3 | Borrar `src/app/(app)/kaizen/kanban/`, `src/app/(app)/genba/kanban/`, `src/app/(app)/kanban/`; ampliar `src/components/operations-workboard.tsx:383-390` | Kanban como vista |
| P1-4 | `src/components/operations-workboard.tsx:293-300` + nuevas acciones en `src/app/actions.ts` | Lote |
| P0-9 | `src/components/operations-workboard.tsx:84-94` y `src/app/globals.css:976-977` | Fondo claro + texto oscuro; borrar el cálculo YIQ |
| P0-10 | `src/components/status-pill.tsx`, `src/components/operations-workboard.tsx:352` | Negritas + icono en vencido |
| P1-5 | `src/lib/domain.ts` (cinco categorías + colores), `src/components/status-pill.tsx`, `src/components/operations-workboard.tsx:84-94` | Un solo componente de estado |
| P1-5b | `src/app/globals.css`, `src/components/app-shell.tsx:136-144`, `follow-up-table.tsx:45-52`, los tres `*-command-center.tsx` | Tokens |
| P1-6 | `src/app/globals.css` (`@media`), `src/components/app-shell.tsx:290-293` | Móvil |
| P1-7 | `src/app/(app)/probocacoins/page.tsx:180` y `actions.ts` | Conciliación + `take` |
| P1-8 | `src/app/(app)/entrenamientos/page.tsx` | Partir en 4 rutas |
| P2-1 | `prisma/schema.prisma` **y** `prisma/schema.production.prisma` (`:652`, `:730`) | `parentId`, validación, evidencias N |
| P2-3 | `src/lib/domain.ts` (nueva función) y sus 5 llamadores | Unificar invariante de fechas |
| — | `src/lib/domain.ts:184-193` | Única `workProgress`; borrar las 3 copias |

---

## 13. Diez pruebas de usuario y QA

1. **Captura con error** — En un celular 390×844, llena la idea completa, omite el turno y
   envía. *Éxito:* vuelve con todo lo escrito intacto y el foco en el turno. *Hoy falla.*
2. **Captura de punta a punta con guantes** — Un operador real captura sin ayuda desde el QR.
   *Métrica:* menos de 3 minutos y sin preguntar qué significa "circunstancia".
3. **Supervisor decide 10 ideas** — *Métrica:* menos de 2 minutos. *Hoy* son 10 navegaciones
   completas: no existe el lote.
4. **Rebote sin permiso** — Un SUPERVISOR abre `/kaizen` sin acceso. *Éxito:* ve qué permiso
   falta y a quién pedirlo. *Hoy* aterriza en su home sin explicación.
5. **Cierre completo de un Kaizen** — Cierra la última actividad con evidencia. *Éxito:* el
   proyecto pasa a COMPLETADO **solo**. *Hoy no ocurre.*
6. **Volumen de 1000** — Carga 1000 ideas, 80 Kaizen y 1000 participantes. Mide `/seguimientos`,
   `/kaizen` y `/probocacoins`. *Éxito:* primera pintura útil bajo 2s y ninguna consulta sin
   límite. Reutilizar `pnpm run qa:scale`.
7. **Editar y fallar** — Abre "Editar proyecto", cambia 15 campos, mete una fecha inválida.
   *Éxito:* el formulario sigue abierto con los valores y el error anclado al campo.
8. **Kanban saturado** — 80 proyectos activos. *Éxito:* ninguna columna pasa de 20 tarjetas y
   existe salida a la lista completa.
9. **Aprobador que se va de vacaciones** — Desactiva a un revisor con 5 ideas pendientes.
   *Éxito:* se reasignan o alguien recibe alerta. *Hoy quedan huérfanas en silencio.*
10. **Gestión visual y accesibilidad** — Tres comprobaciones sobre el mismo tablero:
    (a) *prueba de escala de grises* — captura "Mi trabajo" y conviértela a blanco y negro;
    *éxito:* vencido, en proceso y completado siguen distinguiéndose (regla VM-1);
    (b) *contraste* — pasar los 11 colores de estado por el cálculo de §4.7; *éxito:* todos
    ≥4.5:1; *hoy fallan seis*;
    (c) *teclado y lector de pantalla* en la captura y en "Mi trabajo"; *éxito:* foco siempre
    visible y ningún objetivo bajo 44×44 px.

---

## 14. Recomendaciones que NO conviene implementar en PROpEx

1. **Tableros configurables por el usuario final** (Monday, ClickUp). El flujo lo fija
   `CLAUDE.md`; si cada área inventa su tablero, se pierde la comparación entre plantas.
2. **Flujos de trabajo configurables por proyecto** (Jira). Los 17 estados de Ideas son un
   proceso de negocio acordado, no una preferencia.
3. **Densidad y atajos de teclado como interfaz primaria** (Linear). Sirve para Mejora
   Continua en escritorio; para el operador con guantes es inservible. Que el
   *command palette* sea atajo, nunca camino único — hoy lo es de facto para 8 rutas.
4. **Otra capa de agregación tipo Portfolios/Goals** (Asana). `/panorama` ya existe; el
   problema es que muestra de más, no de menos.
5. **Arrastrar y soltar en el Kanban.** Suena bien y aquí es contraproducente: el estado se
   deriva de reglas (evidencia obligatoria, validación) que un arrastre saltaría. Cambiar
   estado debe seguir pidiendo su justificación.
6. **Gamificación adicional sobre ProbocaCoins.** Ya hay confeti
   (`proboca-coins-celebration.tsx`); más rachas o insignias desplazan la atención del trabajo
   real. Recomiendo **quitar** la celebración, no ampliarla.
7. **Chat o comentarios en tiempo real.** La bitácora ya existe. Un chat crea un canal donde
   se pierden decisiones que deberían quedar en el expediente.
8. **Notificaciones push agresivas.** El outbox y el correo bastan. Sin roles de silencio,
   notificar cada cambio a 1000 personas garantiza que nadie lea ninguna.
9. **Modo sin conexión.** Tentador para el piso, pero exige resolución de conflictos que
   multiplica la complejidad. Los QR son online por decisión de producto.
10. **Reescribir `OperationsWorkboard` desde cero.** Es lo mejor que hay hoy. Se amplía; no se
    reemplaza.
11. **Importar los históricos de Excel automáticamente.** `CLAUDE.md` ya lo advierte: hay hojas
    y versiones duplicadas. Confirmar la fuente vigente con el usuario primero.
12. **Migrar a un motor de BI externo.** El problema del panel no es la capacidad de
    graficación, es que las cifras no llevan a ninguna acción.
13. **Añadir colores.** Ya hay 105 hex en `globals.css` y 62 en `.tsx` para cinco categorías de
    estado. Cualquier necesidad nueva de distinción se resuelve con forma, icono, peso o
    posición — nunca con un color más.
14. **Copiar la paleta de Monday tal cual.** Ya se hizo (§4.2) y produjo los seis fallos de
    contraste de §4.7. Se copia el *sistema* — catálogo cerrado, un color por significado,
    contraste verificado — no los valores.

---

## 15. Coherencia con lo que dejó Codex

Esta auditoría **no contradice** ninguna decisión vigente de `.copiloto/DECISIONES.md`
(D-001 a D-006, todas de proceso, ninguna de producto).

**Confirma y refuerza los dos pendientes que Codex dejó anotados** en su estado de cierre:

> *"En `src/app/(app)/probocacoins/page.tsx`, unificar visualmente el libro mayor, añadir
> conciliación/eliminación controlada de duplicados y aplicar el mismo patrón de tablero;
> después revisar expedientes `src/app/(app)/kaizen/[id]` y `src/app/(app)/genba/[id]` con
> pestañas compactas."*

Ambos entran en este informe: el de expedientes como **P1-2** y el de ProbocaCoins como
**P1-7**. La auditoría añade evidencia de por qué el de expedientes importa tanto (el `aside`
cae después de la bitácora por debajo de 1280px) y una precisión sobre ProbocaCoins: el libro
mayor **ya está paginado y con trazabilidad** por `sourceType`
(`probocacoins/page.tsx:190-213`), así que el trabajo real es la conciliación de duplicados y
arreglar `participant.findMany` sin `take` de la línea 180.

**Su rediseño de tableros (`b9852ef`) es la base correcta y se conserva.** `OperationsWorkboard`
debe crecer, no reemplazarse. La única corrección que esta auditoría pide sobre ese trabajo es
que **la simplificación de la navegación dejó ocho rutas sin enlace entrante** (§2.1): al pasar
de `ideaNav`/`kaizenNav`/`genbaNav` a `unifiedNav`, los arreglos viejos quedaron vivos
alimentando el buscador, que hoy es lo único que sostiene esas rutas.
