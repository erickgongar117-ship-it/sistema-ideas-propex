# Extracción técnica completa de PROpEx

Fecha de extracción: 2026-07-20. Fuente de verdad: los 114 archivos versionados por Git en la raíz del repositorio. No se leyeron ni se incorporaron valores de `.env` o `.env.local`.

El ZIP `PROPEX_SOURCE_SNAPSHOT.zip` acompaña este documento y contiene exactamente el árbol versionado, incluidos los recursos binarios. El contenido textual completo también está transcrito en la sección 5.

## 1. Stack tecnológico

- Aplicación principal: Next.js App Router. La versión declarada es `^15.4.5`; la versión resuelta por `pnpm-lock.yaml` es **15.5.20**.
- React y React DOM: declarados `^19.1.0`; resueltos **19.2.7**.
- Lenguaje: TypeScript. Declarado `^5.7.2`; resuelto **5.9.3**. `strict: true`, objetivo `ES2022`, resolución `bundler`, alias `@/* -> src/*`.
- ORM: Prisma. Declarado `^6.13.0`; cliente y CLI resueltos **6.19.3**.
- Base local: SQLite. Base de producción: PostgreSQL, alojada actualmente en Neon.
- Estilos: Tailwind CSS declarado `^3.4.17`, resuelto **3.4.19**, PostCSS y Autoprefixer. No se usa shadcn/ui.
- UI y visualización: `lucide-react`, `next-themes`, Apache ECharts mediante `echarts` y `echarts-for-react`.
- Archivos y reportes: `@vercel/blob`, `exceljs`, `qrcode`.
- Autenticación: implementación propia con `bcryptjs`, cookies de Next.js y firma HMAC-SHA256; no usa NextAuth/Auth.js, Clerk ni Vercel Auth.
- Validación: Zod.
- Gestor de paquetes: PNPM con lockfile v9. El repositorio no declara `packageManager` en `package.json`; el entorno inspeccionado tiene PNPM 11.9.0.
- Node.js: **no existe** `.nvmrc`, `.node-version`, campo `engines` ni configuración de runtime de Vercel. Por tanto, el proyecto no fija una versión exacta de Node. El entorno usado para esta extracción ejecuta Node **v24.18.0**; el lock resuelve `@types/node` 22.20.0. La versión histórica de Vercel no puede deducirse del repositorio.

Versiones resueltas directas:

| Paquete | Declarado | Resuelto |
|---|---:|---:|
| `@prisma/client` | `^6.13.0` | `6.19.3` |
| `@vercel/blob` | `^2.5.0` | `2.5.0` |
| `bcryptjs` | `^2.4.3` | `2.4.3` |
| `echarts` | `^6.1.0` | `6.1.0` |
| `echarts-for-react` | `^3.0.6` | `3.0.6` |
| `exceljs` | `^4.4.0` | `4.4.0` |
| `lucide-react` | `^0.468.0` | `0.468.0` |
| `next` | `^15.4.5` | `15.5.20` |
| `next-themes` | `^0.4.6` | `0.4.6` |
| `qrcode` | `^1.5.4` | `1.5.4` |
| `react` | `^19.1.0` | `19.2.7` |
| `react-dom` | `^19.1.0` | `19.2.7` |
| `zod` | `^3.24.1` | `3.25.76` |
| `prisma` | `^6.13.0` | `6.19.3` |
| `tailwindcss` | `^3.4.17` | `3.4.19` |
| `tsx` | `^4.19.2` | `4.23.0` |
| `typescript` | `^5.7.2` | `5.9.3` |

Contenido completo de `package.json`:

~~~~~~json
{
  "name": "sistema-ideas-mejora-propex",
  "version": "1.0.0",
  "private": true,
  "description": "Sistema de Ideas de Mejora PROpEx para captura, validacion, implementacion y cierre de mejoras.",
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "build:vercel": "prisma generate --schema prisma/schema.production.prisma && next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "tsx scripts/db-push.ts",
    "db:push:production": "tsx scripts/db-push.ts --schema prisma/schema.production.prisma",
    "db:seed": "prisma db seed",
    "db:seed:production": "prisma db seed --schema prisma/schema.production.prisma",
    "db:seed:organization": "tsx scripts/seed-organization.ts",
    "db:seed:dashboards": "tsx scripts/seed-dashboard-examples.ts",
    "db:seed:managerial-points": "tsx scripts/seed-managerial-point-rules.ts",
    "db:backfill:kaizen-ideas": "tsx scripts/backfill-kaizen-ideas.ts",
    "reminders": "tsx scripts/reminders.ts",
    "export-demo": "tsx scripts/export-demo.ts"
  },
  "dependencies": {
    "@prisma/client": "^6.13.0",
    "@vercel/blob": "^2.5.0",
    "bcryptjs": "^2.4.3",
    "echarts": "^6.1.0",
    "echarts-for-react": "^3.0.6",
    "exceljs": "^4.4.0",
    "lucide-react": "^0.468.0",
    "next": "^15.4.5",
    "next-themes": "^0.4.6",
    "qrcode": "^1.5.4",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^22.10.2",
    "@types/qrcode": "^1.5.5",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.17.0",
    "eslint-config-next": "^15.4.5",
    "postcss": "^8.4.49",
    "prisma": "^6.13.0",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
~~~~~~

Configuración de UI/estilos específica:

- `tailwind.config.ts:4` escanea `./src/**/*.{ts,tsx}`.
- `tailwind.config.ts:7-28` define los tokens `ink`, `line`, `panel`, paleta `brand`, colores por departamento `dept`, y colores `warn`, `danger`, `info`, `grape`.
- `tailwind.config.ts:30-32` define la sombra `soft`; no hay plugins Tailwind.
- `postcss.config.mjs:2-4` activa `tailwindcss` y `autoprefixer`.
- `src/app/globals.css` contiene 1,741 líneas de estilos globales, temas claro/oscuro, navegación responsive, dashboards, Gantt, Kanban y animación de ProbocaCoins.
- `src/components/theme-provider.tsx` y `theme-selector.tsx` implementan el selector con `next-themes`.

## 2. Servicios de Vercel usados

| Servicio/dependencia | Estado real | Archivos y líneas | Sustitución on-premise |
|---|---|---|---|
| Plataforma Vercel para build/hosting | Usada en el despliegue actual. `vercel.json` declara framework Next.js y `pnpm build:vercel`. | `vercel.json:1-4`; `package.json:8`; `DEPLOYMENT.md:32-43`. | Ejecutar el servidor Node persistente con `pnpm start` detrás de IIS/ARR. No es un sitio estático porque usa Server Actions, Prisma y Route Handlers. |
| Neon PostgreSQL | Es la base actual de producción, conectada desde Vercel Marketplace. **No es Vercel Postgres.** Prisma solo recibe una URL PostgreSQL estándar. | `prisma/schema.production.prisma:5-8`; `DEPLOYMENT.md:45-50`; `src/lib/prisma.ts:5-12`. | PostgreSQL local o corporativo mediante `DATABASE_URL`; el código no contiene SDK de Neon. |
| Vercel Blob | Dependencia directa y usada cuando existe `BLOB_READ_WRITE_TOKEN`. Guarda evidencias públicas bajo `evidencias/<archivo>`. | `package.json:20`; `src/lib/files.ts:3,19-29`; cargas desde `src/app/actions.ts:224,594,944,1027,1236`. | Sin token y fuera de Vercel, `saveUpload` escribe en `public/uploads` (`src/lib/files.ts:8,35-42`). Para IIS, la identidad del proceso Node necesita escritura en esa carpeta. |
| Vercel KV / Redis | **No usado.** No hay dependencia, importación ni variable de entorno de KV/Redis. | No aplica. | No se requiere reemplazo. |
| Autenticación de Vercel | **No usada.** | Autenticación propia en `src/lib/auth.ts`; login en `src/app/actions.ts:132-152`. | Se mantiene sin Vercel, aunque conviene endurecerla antes de producción interna. |
| Variables automáticas de URL de Vercel | Fallback para construir enlaces de notificación si falta `APP_BASE_URL`. | `src/lib/url.ts:2-5`: `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`. | Definir `APP_BASE_URL` con la URL interna. |
| Indicador automático `VERCEL` | Impide escribir al filesystem efímero si falta Blob. | `src/lib/files.ts:31-33`. | No definir `VERCEL`; se usa almacenamiento local. |
| CDN de Vercel | Solo aparece un header específico para impedir caché del QR. | `src/app/api/qr/[code]/route.ts:34-38`, en especial `Vercel-CDN-Cache-Control`. | El header es inocuo en IIS; se puede conservar o retirar. |
| Serverless/Edge | Las Server Actions y rutas API se ejecutan como funciones en Vercel por el hosting, pero no contienen APIs propietarias de Functions. **No hay Edge Runtime**, `middleware.ts`, `middleware.js` ni `export const runtime = "edge"`. | `src/app/actions.ts`; `src/app/api/**/route.ts`; búsqueda completa sin middleware/runtime Edge. | Next.js las ejecuta en el proceso Node de `next start`. |

Servicios externos que no pertenecen a Vercel:

- Microsoft Graph OAuth `client_credentials` y `sendMail`: `src/lib/notifications.ts:13-68`.
- Teams incoming webhook: `src/lib/notifications.ts:70-78`.
- Ambos requieren conectividad saliente. En una red sin internet, la app conserva los avisos en `NotificationOutbox`; no existe adaptador SMTP interno.

Variables específicas de Vercel: `BLOB_READ_WRITE_TOKEN`, `VERCEL`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`. `APP_BASE_URL` es genérica aunque el ejemplo de producción contiene un dominio Vercel. `DATABASE_URL` es genérica y apunta actualmente a Neon.

## 3. Modelo de datos completo

Hay dos esquemas completos. Son idénticos salvo el proveedor del datasource: SQLite local frente a PostgreSQL de producción. No existe la carpeta `prisma/migrations`; el proyecto usa `prisma db push` y un fallback de `migrate diff + db execute` en `scripts/db-push.ts`.

### Esquema local completo: `prisma/schema.prisma`

~~~~~~prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  MEJORA_CONTINUA
  SUPERVISOR
  CALIDAD
  SEGURIDAD
  MANTENIMIENTO
  COLABORADOR
}

enum IdeaStatus {
  REGISTRADA
  EN_REVISION_SUPERVISOR
  RECHAZADA_SUPERVISOR
  SOLICITUD_INFORMACION
  APROBADA_SUPERVISOR
  EN_VALIDACION_CALIDAD
  EN_VALIDACION_SEGURIDAD
  EN_VALIDACION_MANTENIMIENTO
  RECHAZADA_VALIDACION
  APROBADA_PARA_IMPLEMENTAR
  CLASIFICACION_MEJORA_CONTINUA
  EN_IMPLEMENTACION
  IMPLEMENTADA
  EN_VALIDACION_FINAL
  CERRADA
  CANCELADA
  VENCIDA
}

enum Priority {
  BAJA
  MEDIA
  ALTA
  CRITICA
}

enum IdeaCategory {
  A
  B
  C
}

enum Classification {
  IDEA_RAPIDA
  ACCION_MANTENIMIENTO
  KAIZEN
  PROYECTO_DMAIC
  PLAN_ACCION
  CINCO_S_GESTION_VISUAL
  SEGURIDAD
  CALIDAD_INOCUIDAD
  NO_VIABLE
}

enum ApprovalType {
  SUPERVISOR
  CALIDAD
  SEGURIDAD
  MANTENIMIENTO
  MEJORA_CONTINUA_FINAL
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  MORE_INFO
}

enum ApprovalDecision {
  APROBAR
  RECHAZAR
  SOLICITAR_INFORMACION
}

enum AttachmentType {
  BEFORE
  AFTER
  OTHER
}

enum NotificationChannel {
  EMAIL
  TEAMS
  LOCAL
}

enum NotificationStatus {
  PENDING
  SENT
  ERROR
  DISMISSED
}

enum KaizenStatus {
  PENDIENTE_CHARTER
  PLANIFICACION
  EN_CURSO
  EN_PAUSA
  COMPLETADO
  CANCELADO
}

enum WorkItemStatus {
  PENDIENTE
  EN_PROCESO
  BLOQUEADA
  COMPLETADA
  CANCELADA
  COMBINADA
}

enum GenbaStatus {
  ABIERTO
  CERRADO
  CANCELADO
}

enum KaizenAttachmentType {
  CHARTER
  EVIDENCE
  OTHER
}

enum GenbaAttachmentType {
  EVIDENCE
  OTHER
}

enum PlantCode {
  APO
  CAR
}

enum OrgUnitType {
  MACROPROCESO
  DEPARTAMENTO
  AREA
  PROCESO
}

model User {
  id                    String           @id @default(cuid())
  name                  String
  email                 String           @unique
  role                  Role
  passwordHash          String
  active                Boolean          @default(true)
  kaizenAccess          Boolean          @default(false)
  genbaAccess           Boolean          @default(false)
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
  supervisedAreas       Area[]           @relation("AreaSupervisor")
  supervisedIdeas       Idea[]           @relation("IdeaSupervisor")
  ownedImplementations  Idea[]           @relation("ImplementationOwner")
  approvals             Approval[]
  comments              Comment[]
  auditLogs             AuditLog[]
  ledKaizenProjects     KaizenProject[]  @relation("KaizenLeader")
  createdKaizenProjects KaizenProject[]  @relation("KaizenCreator")
  ownedKaizenActivities KaizenActivity[] @relation("KaizenActivityOwner")
  kaizenUpdates         KaizenUpdate[]
  coordinatedGenbaWalks GenbaWalk[]      @relation("GenbaCoordinator")
  createdGenbaWalks     GenbaWalk[]      @relation("GenbaCreator")
  ownedGenbaActivities  GenbaActivity[]  @relation("GenbaActivityOwner")
  genbaUpdates          GenbaUpdate[]
  routedOrgUnits        OrgUnit[]        @relation("OrgUnitRoutingUser")
}

model Area {
  id               String   @id @default(cuid())
  code             String   @unique
  name             String
  supervisorId     String?
  active           Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  supervisor       User?    @relation("AreaSupervisor", fields: [supervisorId], references: [id])
  ideas            Idea[]
  organizationUnit OrgUnit? @relation("OrgUnitCaptureArea")
}

model Plant {
  id        String    @id @default(cuid())
  code      PlantCode @unique
  name      String
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  orgUnits  OrgUnit[]
}

model OrgUnit {
  id            String      @id @default(cuid())
  plantId       String
  parentId      String?
  type          OrgUnitType
  code          String      @unique
  name          String
  responsible   String
  manager       String
  routingUserId String?
  captureAreaId String?     @unique
  qrEnabled     Boolean     @default(false)
  active        Boolean     @default(true)
  sortOrder     Int         @default(0)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  plant         Plant       @relation(fields: [plantId], references: [id], onDelete: Cascade)
  parent        OrgUnit?    @relation("OrgUnitTree", fields: [parentId], references: [id], onDelete: SetNull)
  children      OrgUnit[]   @relation("OrgUnitTree")
  routingUser   User?       @relation("OrgUnitRoutingUser", fields: [routingUserId], references: [id], onDelete: SetNull)
  captureArea   Area?       @relation("OrgUnitCaptureArea", fields: [captureAreaId], references: [id], onDelete: SetNull)

  @@index([plantId, parentId, sortOrder])
}

model Idea {
  id                      String               @id @default(cuid())
  folio                   String               @unique
  collaboratorName        String
  collaboratorEmail       String?
  employeeNumber          String?
  areaId                  String
  shift                   String
  problem                 String
  proposal                String
  expectedBenefit         String
  impactTypes             String
  category                IdeaCategory         @default(A)
  impactsQuality          Boolean              @default(false)
  impactsSafety           Boolean              @default(false)
  requiresMaintenance     Boolean              @default(false)
  requiresExternalSupport Boolean              @default(false)
  externalSupportDetails  String?
  priority                Priority?
  classification          Classification?
  status                  IdeaStatus           @default(EN_REVISION_SUPERVISOR)
  supervisorId            String?
  implementationOwnerId   String?
  dueDate                 DateTime?
  requiresEvidence        Boolean              @default(true)
  implementedAt           DateTime?
  closedAt                DateTime?
  pointsAssigned          Int                  @default(0)
  rejectionReason         String?
  moreInfoRequest         String?
  mcComments              String?
  createdAt               DateTime             @default(now())
  updatedAt               DateTime             @updatedAt
  area                    Area                 @relation(fields: [areaId], references: [id])
  supervisor              User?                @relation("IdeaSupervisor", fields: [supervisorId], references: [id])
  implementationOwner     User?                @relation("ImplementationOwner", fields: [implementationOwnerId], references: [id])
  approvals               Approval[]
  attachments             Attachment[]
  comments                Comment[]
  pointRuleSelections     IdeaPointRule[]
  notifications           NotificationOutbox[]
  kaizenProject           KaizenProject?
}

model Approval {
  id           String            @id @default(cuid())
  ideaId       String
  type         ApprovalType
  assignedToId String?
  status       ApprovalStatus    @default(PENDING)
  decision     ApprovalDecision?
  comments     String?
  decidedAt    DateTime?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
  idea         Idea              @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  assignedTo   User?             @relation(fields: [assignedToId], references: [id])

  @@unique([ideaId, type])
}

model Attachment {
  id         String         @id @default(cuid())
  ideaId     String
  type       AttachmentType
  filename   String
  path       String
  uploadedBy String?
  createdAt  DateTime       @default(now())
  idea       Idea           @relation(fields: [ideaId], references: [id], onDelete: Cascade)
}

model Comment {
  id        String   @id @default(cuid())
  ideaId    String
  userId    String?
  comment   String
  createdAt DateTime @default(now())
  idea      Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  user      User?    @relation(fields: [userId], references: [id])
}

model PointRule {
  id          String          @id @default(cuid())
  name        String
  description String
  points      Int
  active      Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  ideas       IdeaPointRule[]
}

model IdeaPointRule {
  id          String    @id @default(cuid())
  ideaId      String
  pointRuleId String
  points      Int
  createdAt   DateTime  @default(now())
  idea        Idea      @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  pointRule   PointRule @relation(fields: [pointRuleId], references: [id])

  @@unique([ideaId, pointRuleId])
}

model NotificationOutbox {
  id           String              @id @default(cuid())
  ideaId       String?
  channel      NotificationChannel
  to           String
  subject      String
  body         String
  status       NotificationStatus  @default(PENDING)
  errorMessage String?
  sentAt       DateTime?
  createdAt    DateTime            @default(now())
  idea         Idea?               @relation(fields: [ideaId], references: [id], onDelete: SetNull)
}

model AuditLog {
  id        String   @id @default(cuid())
  entity    String
  entityId  String
  action    String
  userId    String?
  details   String
  createdAt DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id])
}

model Setting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}

model KaizenProject {
  id               String             @id @default(cuid())
  number           Int                @unique
  folio            String             @unique
  title            String
  plant            String?
  area             String
  objective        String
  scope            String?
  baselineValue    Float?
  targetValue      Float?
  currentValue     Float?
  unit             String?
  estimatedSavings Float?
  realSavings      Float?
  status           KaizenStatus       @default(PENDIENTE_CHARTER)
  startDate        DateTime
  endDate          DateTime
  closedAt         DateTime?
  leaderId         String
  createdById      String
  sourceIdeaId     String?            @unique
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  leader           User               @relation("KaizenLeader", fields: [leaderId], references: [id])
  createdBy        User               @relation("KaizenCreator", fields: [createdById], references: [id])
  sourceIdea       Idea?              @relation(fields: [sourceIdeaId], references: [id], onDelete: SetNull)
  activities       KaizenActivity[]
  attachments      KaizenAttachment[]
  updates          KaizenUpdate[]
}

model KaizenActivity {
  id                    String             @id @default(cuid())
  projectId             String
  number                Int
  problem               String?
  action                String
  ownerId               String?
  startDate             DateTime?
  dueDate               DateTime?
  status                WorkItemStatus     @default(PENDIENTE)
  completionNote        String?
  cancellationReason    String?
  closedAt              DateTime?
  mergedIntoId          String?
  mergeReason           String?
  sourceGenbaActivityId String?            @unique
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
  project               KaizenProject      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  owner                 User?              @relation("KaizenActivityOwner", fields: [ownerId], references: [id])
  mergedInto            KaizenActivity?    @relation("KaizenActivityMerge", fields: [mergedIntoId], references: [id])
  mergedActivities      KaizenActivity[]   @relation("KaizenActivityMerge")
  sourceGenbaActivity   GenbaActivity?     @relation("GenbaPromotion", fields: [sourceGenbaActivityId], references: [id], onDelete: SetNull)
  attachments           KaizenAttachment[]
  updates               KaizenUpdate[]

  @@unique([projectId, number])
}

model KaizenAttachment {
  id         String               @id @default(cuid())
  projectId  String
  activityId String?
  type       KaizenAttachmentType
  filename   String
  path       String
  uploadedBy String
  createdAt  DateTime             @default(now())
  project    KaizenProject        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  activity   KaizenActivity?      @relation(fields: [activityId], references: [id], onDelete: Cascade)
}

model KaizenUpdate {
  id         String          @id @default(cuid())
  projectId  String
  activityId String?
  userId     String?
  comment    String
  createdAt  DateTime        @default(now())
  project    KaizenProject   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  activity   KaizenActivity? @relation(fields: [activityId], references: [id], onDelete: Cascade)
  user       User?           @relation(fields: [userId], references: [id])
}

model GenbaWalk {
  id                  String            @id @default(cuid())
  number              Int               @unique
  folio               String            @unique
  areaName            String
  visitDate           DateTime
  expectedDepartments String
  attendedDepartments String
  notes               String?
  status              GenbaStatus       @default(ABIERTO)
  coordinatorId       String
  createdById         String
  closedAt            DateTime?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  coordinator         User              @relation("GenbaCoordinator", fields: [coordinatorId], references: [id])
  createdBy           User              @relation("GenbaCreator", fields: [createdById], references: [id])
  activities          GenbaActivity[]
  attachments         GenbaAttachment[]
  updates             GenbaUpdate[]
}

model GenbaActivity {
  id                     String            @id @default(cuid())
  walkId                 String
  number                 Int
  problem                String
  action                 String?
  ownerId                String?
  dueDate                DateTime?
  status                 WorkItemStatus    @default(PENDIENTE)
  completionNote         String?
  cancellationReason     String?
  closedAt               DateTime?
  mergedIntoId           String?
  mergeReason            String?
  createdAt              DateTime          @default(now())
  updatedAt              DateTime          @updatedAt
  walk                   GenbaWalk         @relation(fields: [walkId], references: [id], onDelete: Cascade)
  owner                  User?             @relation("GenbaActivityOwner", fields: [ownerId], references: [id])
  mergedInto             GenbaActivity?    @relation("GenbaActivityMerge", fields: [mergedIntoId], references: [id])
  mergedActivities       GenbaActivity[]   @relation("GenbaActivityMerge")
  promotedKaizenActivity KaizenActivity?   @relation("GenbaPromotion")
  attachments            GenbaAttachment[]
  updates                GenbaUpdate[]

  @@unique([walkId, number])
}

model GenbaAttachment {
  id         String              @id @default(cuid())
  walkId     String
  activityId String?
  type       GenbaAttachmentType @default(EVIDENCE)
  filename   String
  path       String
  uploadedBy String
  createdAt  DateTime            @default(now())
  walk       GenbaWalk           @relation(fields: [walkId], references: [id], onDelete: Cascade)
  activity   GenbaActivity?      @relation(fields: [activityId], references: [id], onDelete: Cascade)
}

model GenbaUpdate {
  id         String         @id @default(cuid())
  walkId     String
  activityId String?
  userId     String?
  comment    String
  createdAt  DateTime       @default(now())
  walk       GenbaWalk      @relation(fields: [walkId], references: [id], onDelete: Cascade)
  activity   GenbaActivity? @relation(fields: [activityId], references: [id], onDelete: Cascade)
  user       User?          @relation(fields: [userId], references: [id])
}
~~~~~~

### Esquema de producción completo: `prisma/schema.production.prisma`

~~~~~~prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  MEJORA_CONTINUA
  SUPERVISOR
  CALIDAD
  SEGURIDAD
  MANTENIMIENTO
  COLABORADOR
}

enum IdeaStatus {
  REGISTRADA
  EN_REVISION_SUPERVISOR
  RECHAZADA_SUPERVISOR
  SOLICITUD_INFORMACION
  APROBADA_SUPERVISOR
  EN_VALIDACION_CALIDAD
  EN_VALIDACION_SEGURIDAD
  EN_VALIDACION_MANTENIMIENTO
  RECHAZADA_VALIDACION
  APROBADA_PARA_IMPLEMENTAR
  CLASIFICACION_MEJORA_CONTINUA
  EN_IMPLEMENTACION
  IMPLEMENTADA
  EN_VALIDACION_FINAL
  CERRADA
  CANCELADA
  VENCIDA
}

enum Priority {
  BAJA
  MEDIA
  ALTA
  CRITICA
}

enum IdeaCategory {
  A
  B
  C
}

enum Classification {
  IDEA_RAPIDA
  ACCION_MANTENIMIENTO
  KAIZEN
  PROYECTO_DMAIC
  PLAN_ACCION
  CINCO_S_GESTION_VISUAL
  SEGURIDAD
  CALIDAD_INOCUIDAD
  NO_VIABLE
}

enum ApprovalType {
  SUPERVISOR
  CALIDAD
  SEGURIDAD
  MANTENIMIENTO
  MEJORA_CONTINUA_FINAL
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  MORE_INFO
}

enum ApprovalDecision {
  APROBAR
  RECHAZAR
  SOLICITAR_INFORMACION
}

enum AttachmentType {
  BEFORE
  AFTER
  OTHER
}

enum NotificationChannel {
  EMAIL
  TEAMS
  LOCAL
}

enum NotificationStatus {
  PENDING
  SENT
  ERROR
  DISMISSED
}

enum KaizenStatus {
  PENDIENTE_CHARTER
  PLANIFICACION
  EN_CURSO
  EN_PAUSA
  COMPLETADO
  CANCELADO
}

enum WorkItemStatus {
  PENDIENTE
  EN_PROCESO
  BLOQUEADA
  COMPLETADA
  CANCELADA
  COMBINADA
}

enum GenbaStatus {
  ABIERTO
  CERRADO
  CANCELADO
}

enum KaizenAttachmentType {
  CHARTER
  EVIDENCE
  OTHER
}

enum GenbaAttachmentType {
  EVIDENCE
  OTHER
}

enum PlantCode {
  APO
  CAR
}

enum OrgUnitType {
  MACROPROCESO
  DEPARTAMENTO
  AREA
  PROCESO
}

model User {
  id                    String           @id @default(cuid())
  name                  String
  email                 String           @unique
  role                  Role
  passwordHash          String
  active                Boolean          @default(true)
  kaizenAccess          Boolean          @default(false)
  genbaAccess           Boolean          @default(false)
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
  supervisedAreas       Area[]           @relation("AreaSupervisor")
  supervisedIdeas       Idea[]           @relation("IdeaSupervisor")
  ownedImplementations  Idea[]           @relation("ImplementationOwner")
  approvals             Approval[]
  comments              Comment[]
  auditLogs             AuditLog[]
  ledKaizenProjects     KaizenProject[]  @relation("KaizenLeader")
  createdKaizenProjects KaizenProject[]  @relation("KaizenCreator")
  ownedKaizenActivities KaizenActivity[] @relation("KaizenActivityOwner")
  kaizenUpdates         KaizenUpdate[]
  coordinatedGenbaWalks GenbaWalk[]      @relation("GenbaCoordinator")
  createdGenbaWalks     GenbaWalk[]      @relation("GenbaCreator")
  ownedGenbaActivities  GenbaActivity[]  @relation("GenbaActivityOwner")
  genbaUpdates          GenbaUpdate[]
  routedOrgUnits        OrgUnit[]        @relation("OrgUnitRoutingUser")
}

model Area {
  id               String   @id @default(cuid())
  code             String   @unique
  name             String
  supervisorId     String?
  active           Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  supervisor       User?    @relation("AreaSupervisor", fields: [supervisorId], references: [id])
  ideas            Idea[]
  organizationUnit OrgUnit? @relation("OrgUnitCaptureArea")
}

model Plant {
  id        String    @id @default(cuid())
  code      PlantCode @unique
  name      String
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  orgUnits  OrgUnit[]
}

model OrgUnit {
  id            String      @id @default(cuid())
  plantId       String
  parentId      String?
  type          OrgUnitType
  code          String      @unique
  name          String
  responsible   String
  manager       String
  routingUserId String?
  captureAreaId String?     @unique
  qrEnabled     Boolean     @default(false)
  active        Boolean     @default(true)
  sortOrder     Int         @default(0)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  plant         Plant       @relation(fields: [plantId], references: [id], onDelete: Cascade)
  parent        OrgUnit?    @relation("OrgUnitTree", fields: [parentId], references: [id], onDelete: SetNull)
  children      OrgUnit[]   @relation("OrgUnitTree")
  routingUser   User?       @relation("OrgUnitRoutingUser", fields: [routingUserId], references: [id], onDelete: SetNull)
  captureArea   Area?       @relation("OrgUnitCaptureArea", fields: [captureAreaId], references: [id], onDelete: SetNull)

  @@index([plantId, parentId, sortOrder])
}

model Idea {
  id                      String               @id @default(cuid())
  folio                   String               @unique
  collaboratorName        String
  collaboratorEmail       String?
  employeeNumber          String?
  areaId                  String
  shift                   String
  problem                 String
  proposal                String
  expectedBenefit         String
  impactTypes             String
  category                IdeaCategory         @default(A)
  impactsQuality          Boolean              @default(false)
  impactsSafety           Boolean              @default(false)
  requiresMaintenance     Boolean              @default(false)
  requiresExternalSupport Boolean              @default(false)
  externalSupportDetails  String?
  priority                Priority?
  classification          Classification?
  status                  IdeaStatus           @default(EN_REVISION_SUPERVISOR)
  supervisorId            String?
  implementationOwnerId   String?
  dueDate                 DateTime?
  requiresEvidence        Boolean              @default(true)
  implementedAt           DateTime?
  closedAt                DateTime?
  pointsAssigned          Int                  @default(0)
  rejectionReason         String?
  moreInfoRequest         String?
  mcComments              String?
  createdAt               DateTime             @default(now())
  updatedAt               DateTime             @updatedAt
  area                    Area                 @relation(fields: [areaId], references: [id])
  supervisor              User?                @relation("IdeaSupervisor", fields: [supervisorId], references: [id])
  implementationOwner     User?                @relation("ImplementationOwner", fields: [implementationOwnerId], references: [id])
  approvals               Approval[]
  attachments             Attachment[]
  comments                Comment[]
  pointRuleSelections     IdeaPointRule[]
  notifications           NotificationOutbox[]
  kaizenProject           KaizenProject?
}

model Approval {
  id           String            @id @default(cuid())
  ideaId       String
  type         ApprovalType
  assignedToId String?
  status       ApprovalStatus    @default(PENDING)
  decision     ApprovalDecision?
  comments     String?
  decidedAt    DateTime?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
  idea         Idea              @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  assignedTo   User?             @relation(fields: [assignedToId], references: [id])

  @@unique([ideaId, type])
}

model Attachment {
  id         String         @id @default(cuid())
  ideaId     String
  type       AttachmentType
  filename   String
  path       String
  uploadedBy String?
  createdAt  DateTime       @default(now())
  idea       Idea           @relation(fields: [ideaId], references: [id], onDelete: Cascade)
}

model Comment {
  id        String   @id @default(cuid())
  ideaId    String
  userId    String?
  comment   String
  createdAt DateTime @default(now())
  idea      Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  user      User?    @relation(fields: [userId], references: [id])
}

model PointRule {
  id          String          @id @default(cuid())
  name        String
  description String
  points      Int
  active      Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  ideas       IdeaPointRule[]
}

model IdeaPointRule {
  id          String    @id @default(cuid())
  ideaId      String
  pointRuleId String
  points      Int
  createdAt   DateTime  @default(now())
  idea        Idea      @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  pointRule   PointRule @relation(fields: [pointRuleId], references: [id])

  @@unique([ideaId, pointRuleId])
}

model NotificationOutbox {
  id           String              @id @default(cuid())
  ideaId       String?
  channel      NotificationChannel
  to           String
  subject      String
  body         String
  status       NotificationStatus  @default(PENDING)
  errorMessage String?
  sentAt       DateTime?
  createdAt    DateTime            @default(now())
  idea         Idea?               @relation(fields: [ideaId], references: [id], onDelete: SetNull)
}

model AuditLog {
  id        String   @id @default(cuid())
  entity    String
  entityId  String
  action    String
  userId    String?
  details   String
  createdAt DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id])
}

model Setting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}

model KaizenProject {
  id               String             @id @default(cuid())
  number           Int                @unique
  folio            String             @unique
  title            String
  plant            String?
  area             String
  objective        String
  scope            String?
  baselineValue    Float?
  targetValue      Float?
  currentValue     Float?
  unit             String?
  estimatedSavings Float?
  realSavings      Float?
  status           KaizenStatus       @default(PENDIENTE_CHARTER)
  startDate        DateTime
  endDate          DateTime
  closedAt         DateTime?
  leaderId         String
  createdById      String
  sourceIdeaId     String?            @unique
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  leader           User               @relation("KaizenLeader", fields: [leaderId], references: [id])
  createdBy        User               @relation("KaizenCreator", fields: [createdById], references: [id])
  sourceIdea       Idea?              @relation(fields: [sourceIdeaId], references: [id], onDelete: SetNull)
  activities       KaizenActivity[]
  attachments      KaizenAttachment[]
  updates          KaizenUpdate[]
}

model KaizenActivity {
  id                    String             @id @default(cuid())
  projectId             String
  number                Int
  problem               String?
  action                String
  ownerId               String?
  startDate             DateTime?
  dueDate               DateTime?
  status                WorkItemStatus     @default(PENDIENTE)
  completionNote        String?
  cancellationReason    String?
  closedAt              DateTime?
  mergedIntoId          String?
  mergeReason           String?
  sourceGenbaActivityId String?            @unique
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
  project               KaizenProject      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  owner                 User?              @relation("KaizenActivityOwner", fields: [ownerId], references: [id])
  mergedInto            KaizenActivity?    @relation("KaizenActivityMerge", fields: [mergedIntoId], references: [id])
  mergedActivities      KaizenActivity[]   @relation("KaizenActivityMerge")
  sourceGenbaActivity   GenbaActivity?     @relation("GenbaPromotion", fields: [sourceGenbaActivityId], references: [id], onDelete: SetNull)
  attachments           KaizenAttachment[]
  updates               KaizenUpdate[]

  @@unique([projectId, number])
}

model KaizenAttachment {
  id         String               @id @default(cuid())
  projectId  String
  activityId String?
  type       KaizenAttachmentType
  filename   String
  path       String
  uploadedBy String
  createdAt  DateTime             @default(now())
  project    KaizenProject        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  activity   KaizenActivity?      @relation(fields: [activityId], references: [id], onDelete: Cascade)
}

model KaizenUpdate {
  id         String          @id @default(cuid())
  projectId  String
  activityId String?
  userId     String?
  comment    String
  createdAt  DateTime        @default(now())
  project    KaizenProject   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  activity   KaizenActivity? @relation(fields: [activityId], references: [id], onDelete: Cascade)
  user       User?           @relation(fields: [userId], references: [id])
}

model GenbaWalk {
  id                  String            @id @default(cuid())
  number              Int               @unique
  folio               String            @unique
  areaName            String
  visitDate           DateTime
  expectedDepartments String
  attendedDepartments String
  notes               String?
  status              GenbaStatus       @default(ABIERTO)
  coordinatorId       String
  createdById         String
  closedAt            DateTime?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  coordinator         User              @relation("GenbaCoordinator", fields: [coordinatorId], references: [id])
  createdBy           User              @relation("GenbaCreator", fields: [createdById], references: [id])
  activities          GenbaActivity[]
  attachments         GenbaAttachment[]
  updates             GenbaUpdate[]
}

model GenbaActivity {
  id                     String            @id @default(cuid())
  walkId                 String
  number                 Int
  problem                String
  action                 String?
  ownerId                String?
  dueDate                DateTime?
  status                 WorkItemStatus    @default(PENDIENTE)
  completionNote         String?
  cancellationReason     String?
  closedAt               DateTime?
  mergedIntoId           String?
  mergeReason            String?
  createdAt              DateTime          @default(now())
  updatedAt              DateTime          @updatedAt
  walk                   GenbaWalk         @relation(fields: [walkId], references: [id], onDelete: Cascade)
  owner                  User?             @relation("GenbaActivityOwner", fields: [ownerId], references: [id])
  mergedInto             GenbaActivity?    @relation("GenbaActivityMerge", fields: [mergedIntoId], references: [id])
  mergedActivities       GenbaActivity[]   @relation("GenbaActivityMerge")
  promotedKaizenActivity KaizenActivity?   @relation("GenbaPromotion")
  attachments            GenbaAttachment[]
  updates                GenbaUpdate[]

  @@unique([walkId, number])
}

model GenbaAttachment {
  id         String              @id @default(cuid())
  walkId     String
  activityId String?
  type       GenbaAttachmentType @default(EVIDENCE)
  filename   String
  path       String
  uploadedBy String
  createdAt  DateTime            @default(now())
  walk       GenbaWalk           @relation(fields: [walkId], references: [id], onDelete: Cascade)
  activity   GenbaActivity?      @relation(fields: [activityId], references: [id], onDelete: Cascade)
}

model GenbaUpdate {
  id         String         @id @default(cuid())
  walkId     String
  activityId String?
  userId     String?
  comment    String
  createdAt  DateTime       @default(now())
  walk       GenbaWalk      @relation(fields: [walkId], references: [id], onDelete: Cascade)
  activity   GenbaActivity? @relation(fields: [activityId], references: [id], onDelete: Cascade)
  user       User?          @relation(fields: [userId], references: [id])
}
~~~~~~

Relaciones y constraints, sin sustituir el schema literal anterior:

- `User` se relaciona con áreas supervisadas, ideas supervisadas, implementaciones, aprobaciones, comentarios, auditoría, liderazgo/creación/actividades/actualizaciones de Kaizen y GENBA, y ruteo organizacional. `email` es único.
- `Plant 1:N OrgUnit`. `OrgUnit` forma un árbol autorreferente `parent/children`; `plantId` elimina en cascada, `parentId`, `routingUserId` y `captureAreaId` usan `SetNull`. `OrgUnit.code` y `captureAreaId` son únicos. Índice compuesto `[plantId,parentId,sortOrder]`.
- `Area` tiene supervisor opcional y muchas ideas. `Area.code` es único. La relación opcional 1:1 con `OrgUnit` se materializa por `OrgUnit.captureAreaId @unique`.
- `Idea N:1 Area`; supervisor e implementation owner son opcionales. Tiene `Approval[]`, `Attachment[]`, `Comment[]`, `IdeaPointRule[]`, `NotificationOutbox[]` y un `KaizenProject?`. `folio` es único.
- `Approval N:1 Idea` con cascada; asignación opcional a `User`. Constraint único `[ideaId,type]`, así que una idea solo tiene una aprobación por tipo.
- `Attachment` y `Comment` pertenecen a `Idea` y se eliminan en cascada. `Comment.userId` es opcional.
- `PointRule N:M Idea` mediante `IdeaPointRule`; constraint único `[ideaId,pointRuleId]`. La selección conserva los puntos efectivamente otorgados.
- `NotificationOutbox.ideaId` es opcional y usa `SetNull`; no pierde el aviso al borrar/desvincular la idea.
- `AuditLog.userId` es opcional; `Setting.key` es único.
- `KaizenProject` tiene `number`, `folio` y `sourceIdeaId` únicos. Pertenece a líder y creador; la idea fuente es opcional y usa `SetNull`. Tiene actividades, adjuntos y actualizaciones.
- `KaizenActivity N:1 KaizenProject` con cascada; owner opcional; autorrelación para combinaciones; `sourceGenbaActivityId` único para trazabilidad GENBA→Kaizen. Constraint único `[projectId,number]`.
- Adjuntos y actualizaciones Kaizen pertenecen al proyecto; pueden apuntar a actividad. Las relaciones de proyecto/actividad usan cascada.
- `GenbaWalk` tiene `number` y `folio` únicos; pertenece a coordinador y creador; tiene actividades, adjuntos y actualizaciones.
- `GenbaActivity N:1 GenbaWalk` con cascada; owner opcional; autorrelación para combinaciones; relación inversa opcional con la actividad Kaizen promovida. Constraint único `[walkId,number]`.
- Adjuntos y actualizaciones GENBA pertenecen al recorrido y opcionalmente a una actividad; usan cascada.
- Los campos `Idea.impactTypes`, `GenbaWalk.expectedDepartments` y `GenbaWalk.attendedDepartments` almacenan arreglos serializados como texto JSON, no tipos JSON nativos.
- Los folios consecutivos (`IM-*`, `KZN-*`, `GENBA-*`) se calculan en código. La unicidad en base evita duplicados, pero Kaizen/GENBA no implementan el ciclo de reintento que sí tiene Ideas.

Enums completos declarados: `Role`, `IdeaStatus`, `Priority`, `IdeaCategory`, `Classification`, `ApprovalType`, `ApprovalStatus`, `ApprovalDecision`, `AttachmentType`, `NotificationChannel`, `NotificationStatus`, `KaizenStatus`, `WorkItemStatus`, `GenbaStatus`, `KaizenAttachmentType`, `GenbaAttachmentType`, `PlantCode`, `OrgUnitType`.

No hay SQL DDL versionado ni migraciones históricas. El único mecanismo versionado de creación/actualización es el schema Prisma más los scripts `db:push`.

## 4. Estructura del proyecto

Árbol completo de los 114 archivos versionados que constituyen la aplicación principal y el snapshot ZIP:

~~~~~~text
.
├── .env.example
├── .env.production.example
├── .gitignore
├── DEPLOYMENT.md
├── next.config.mjs
├── next-env.d.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── prisma
│   ├── schema.prisma
│   ├── schema.production.prisma
│   └── seed.ts
├── public
│   ├── brand
│   │   ├── mejora-continua-icon.png
│   │   ├── mejora-continua-logo-rojo.png
│   │   ├── proboca-logo.png
│   │   └── proboca-servicios.jpg
│   └── uploads
│       └── .gitkeep
├── README.md
├── scripts
│   ├── backfill-kaizen-ideas.ts
│   ├── db-push.ts
│   ├── export-demo.ts
│   ├── reminders.ts
│   ├── seed-dashboard-examples.ts
│   ├── seed-managerial-point-rules.ts
│   └── seed-organization.ts
├── src
│   ├── app
│   │   ├── (app)
│   │   │   ├── auditoria
│   │   │   │   └── page.tsx
│   │   │   ├── configuracion
│   │   │   │   ├── estructura
│   │   │   │   │   ├── actions.ts
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard
│   │   │   │   └── page.tsx
│   │   │   ├── genba
│   │   │   │   ├── [id]
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── kanban
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── nuevo
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── ideas
│   │   │   │   ├── [id]
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── implementacion
│   │   │   │   └── page.tsx
│   │   │   ├── kaizen
│   │   │   │   ├── [id]
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── gantt
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── kanban
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── nuevo
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── kanban
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── mejora
│   │   │   │   └── page.tsx
│   │   │   ├── notificaciones
│   │   │   │   └── page.tsx
│   │   │   ├── qr
│   │   │   │   └── page.tsx
│   │   │   ├── reportes
│   │   │   │   └── page.tsx
│   │   │   ├── supervisor
│   │   │   │   └── page.tsx
│   │   │   ├── validaciones
│   │   │   │   ├── calidad
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── mantenimiento
│   │   │   │   │   └── page.tsx
│   │   │   │   └── seguridad
│   │   │   │       └── page.tsx
│   │   │   └── vencidas
│   │   │       └── page.tsx
│   │   ├── actions.ts
│   │   ├── api
│   │   │   ├── export
│   │   │   │   ├── genba
│   │   │   │   │   └── route.ts
│   │   │   │   ├── kaizen
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   └── qr
│   │   │       └── [code]
│   │   │           └── route.ts
│   │   ├── captura
│   │   │   ├── [code]
│   │   │   │   └── page.tsx
│   │   │   └── gracias
│   │   │       └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── login
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── app-shell.tsx
│   │   ├── capture-area-explorer.tsx
│   │   ├── capture-classification.tsx
│   │   ├── dashboard-command-center.tsx
│   │   ├── empty-state.tsx
│   │   ├── genba-activity-entry-table.tsx
│   │   ├── genba-command-center.tsx
│   │   ├── idea-card.tsx
│   │   ├── idea-progress.tsx
│   │   ├── kaizen-command-center.tsx
│   │   ├── mini-charts.tsx
│   │   ├── module-status.tsx
│   │   ├── organization-builder.tsx
│   │   ├── page-header.tsx
│   │   ├── portfolio-command-ui.tsx
│   │   ├── premium-chart.tsx
│   │   ├── print-button.tsx
│   │   ├── proboca-coin.tsx
│   │   ├── proboca-coins-award-form.tsx
│   │   ├── proboca-coins-celebration.tsx
│   │   ├── progress-meter.tsx
│   │   ├── qr-explorer.tsx
│   │   ├── section-heading.tsx
│   │   ├── status-pill.tsx
│   │   ├── theme-provider.tsx
│   │   ├── theme-selector.tsx
│   │   ├── validation-inbox.tsx
│   │   ├── work-item-disclosure.tsx
│   │   └── workspace-controls.tsx
│   └── lib
│       ├── audit.ts
│       ├── auth.ts
│       ├── domain.ts
│       ├── export.ts
│       ├── files.ts
│       ├── kaizen-from-idea.ts
│       ├── managerial-evaluation.ts
│       ├── module-access.ts
│       ├── notifications.ts
│       ├── organization.ts
│       ├── organization-types.ts
│       ├── points.ts
│       ├── portfolio-export.ts
│       ├── prisma.ts
│       ├── url.ts
│       ├── workbook-style.ts
│       └── workflow.ts
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
~~~~~~

Carpetas principales:

- `src/app/`: App Router. Contiene páginas públicas, layout protegido, pantallas por módulo, Server Actions y cuatro Route Handlers API.
- `src/app/(app)/`: grupo de rutas autenticadas. El layout obliga sesión y monta navegación, notificaciones y acceso por módulo.
- `src/app/api/`: QR PNG y tres exportaciones Excel.
- `src/components/`: componentes de UI, dashboards interactivos, formularios, shell, gráficos, QR, organización y ProbocaCoins.
- `src/lib/`: autenticación, Prisma, workflow, permisos, archivos, notificaciones, auditoría, organización, puntos y generación de workbooks.
- `prisma/`: schemas SQLite/PostgreSQL y seed principal.
- `scripts/`: push de schema, seeds adicionales, recordatorios, exportación local y conciliación de ideas Kaizen.
- `public/brand/`: recursos de marca binarios.
- `public/uploads/`: destino local de evidencias; Git solo conserva `.gitkeep`.

Delimitación de alcance:

- `.env`, `.env.local`, `.vercel/`, `.next/`, `node_modules/`, bases `*.db`, `exports/` y archivos de log están ignorados y no forman parte del snapshot.
- `tmp/` contiene copias antiguas de despliegue y multimedia generada, pero está sin versionar y no es la fuente vigente. No se incluyó.
- `propex-interno-sites/` es un prototipo separado y sin versionar; `tsconfig.json:27` lo excluye explícitamente. No se incluyó como código de la aplicación principal.
- `src/app/calculadora-pollos/`, manuales, presentaciones y scripts audiovisuales también están sin versionar y no pertenecen al deploy Git actual.
- Esta decisión no oculta código vigente: `git status` no muestra modificaciones en los 114 archivos rastreados; solo elementos sin versionar.

## 5. Código fuente completo

Esta sección transcribe literalmente todos los archivos textuales versionados, incluido `pnpm-lock.yaml`. Los cuatro binarios de marca se identifican al final mediante tamaño y SHA-256 y están incluidos byte por byte en `PROPEX_SOURCE_SNAPSHOT.zip`.

## 5.1 Configuración, manifiestos y documentación operativa

### `.env.example`

~~~~~~dotenv
DATABASE_URL="file:./dev.db"
APP_BASE_URL="http://localhost:3000"
AUTH_SECRET="cambia-este-secreto-en-produccion"
BLOB_READ_WRITE_TOKEN=""

MICROSOFT_TENANT_ID=""
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
MICROSOFT_SENDER_EMAIL=""
TEAMS_WEBHOOK_URL=""
~~~~~~

### `.env.production.example`

~~~~~~dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
APP_BASE_URL="https://tu-dominio.vercel.app"
AUTH_SECRET="genera-una-clave-larga-y-segura"
BLOB_READ_WRITE_TOKEN=""

MICROSOFT_TENANT_ID=""
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
MICROSOFT_SENDER_EMAIL=""
TEAMS_WEBHOOK_URL=""
~~~~~~

### `.gitignore`

~~~~~~gitignore
node_modules
.next
.env
*.db
*.db-journal
public/uploads/*
!public/uploads/.gitkeep
exports
*.log
*.tsbuildinfo

.vercel
.env*
~~~~~~

### `DEPLOYMENT.md`

~~~~~~markdown
# Despliegue online PROpEx

Esta guia deja la app online con Vercel, Neon Postgres y Vercel Blob.

## Modos del proyecto

- Local: `prisma/schema.prisma` con SQLite.
- Produccion: `prisma/schema.production.prisma` con PostgreSQL.

Comandos locales:

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

Comandos de produccion:

```bash
pnpm build:vercel
pnpm db:push:production
pnpm db:seed:production
```

## 1. Subir a GitHub

1. Crea un repositorio en GitHub.
2. Sube esta carpeta completa.
3. No subas `.env`.
4. Si quieres conservar datos locales, respalda `prisma/dev.db`; produccion usara Postgres.

## 2. Crear proyecto en Vercel

1. Entra a Vercel.
2. Importa el repositorio desde GitHub.
3. Vercel leera `vercel.json`.
4. El build command configurado es:

```bash
pnpm build:vercel
```

## 3. Crear base Postgres con Neon

1. En Vercel Marketplace instala Neon.
2. Conecta Neon al proyecto.
3. Copia la cadena `DATABASE_URL`.
4. Agregala en Vercel > Project Settings > Environment Variables.

## 4. Crear Blob para evidencias

1. En Vercel Storage crea un Blob Store.
2. Conectalo al proyecto.
3. Vercel agregara `BLOB_READ_WRITE_TOKEN`.
4. Sin esta variable, Vercel no puede guardar evidencias persistentes.

## 5. Variables de entorno en Vercel

Configura:

```env
DATABASE_URL="postgresql://..."
APP_BASE_URL="https://tu-dominio.vercel.app"
AUTH_SECRET="genera-una-clave-larga-y-segura"
BLOB_READ_WRITE_TOKEN="..."

MICROSOFT_TENANT_ID=""
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
MICROSOFT_SENDER_EMAIL=""
TEAMS_WEBHOOK_URL=""
```

## 6. Crear tablas y datos demo en Postgres

Despues de configurar `DATABASE_URL`, ejecuta:

```bash
pnpm db:push:production
pnpm db:seed:production
```

Si lo haces localmente, primero pon la `DATABASE_URL` de Neon en tu terminal o en un `.env` temporal.

## 7. Deploy

En Vercel presiona Deploy. Al terminar tendras una URL parecida a:

```text
https://sistema-ideas-propex.vercel.app
```

Actualiza `APP_BASE_URL` con esa URL final y redeploy.

## 8. QR online

Los QR quedaran apuntando a:

```text
https://tu-dominio.vercel.app/captura/P1
https://tu-dominio.vercel.app/captura/P2
...
https://tu-dominio.vercel.app/captura/P9
```

Desde `/qr` descarga los PNG nuevos para imprimirlos.

## 9. Notificaciones

Si no configuras Microsoft Graph o Teams, el sistema seguira funcionando con fallback local en `/notificaciones`.

Para correo real configura:

```env
MICROSOFT_TENANT_ID
MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET
MICROSOFT_SENDER_EMAIL
```

Para Teams configura:

```env
TEAMS_WEBHOOK_URL
```

## 10. Usuarios iniciales

Despues de `pnpm db:seed:production`, todos usan `admin123`:

- `admin@propEx.local`
- `mc@propEx.local`
- `calidad@propEx.local`
- `seguridad@propEx.local`
- `mantenimiento@propEx.local`
- `supervisor.p1@propEx.local` a `supervisor.p9@propEx.local`

En produccion cambia las contrasenas iniciales o reemplaza usuarios demo por usuarios reales.
~~~~~~

### `next.config.mjs`

~~~~~~javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    }
  }
};

export default nextConfig;
~~~~~~

### `next-env.d.ts`

~~~~~~typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />
/// <reference path="./.next/types/routes.d.ts" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
~~~~~~

### `package.json`

~~~~~~json
{
  "name": "sistema-ideas-mejora-propex",
  "version": "1.0.0",
  "private": true,
  "description": "Sistema de Ideas de Mejora PROpEx para captura, validacion, implementacion y cierre de mejoras.",
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "build:vercel": "prisma generate --schema prisma/schema.production.prisma && next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "tsx scripts/db-push.ts",
    "db:push:production": "tsx scripts/db-push.ts --schema prisma/schema.production.prisma",
    "db:seed": "prisma db seed",
    "db:seed:production": "prisma db seed --schema prisma/schema.production.prisma",
    "db:seed:organization": "tsx scripts/seed-organization.ts",
    "db:seed:dashboards": "tsx scripts/seed-dashboard-examples.ts",
    "db:seed:managerial-points": "tsx scripts/seed-managerial-point-rules.ts",
    "db:backfill:kaizen-ideas": "tsx scripts/backfill-kaizen-ideas.ts",
    "reminders": "tsx scripts/reminders.ts",
    "export-demo": "tsx scripts/export-demo.ts"
  },
  "dependencies": {
    "@prisma/client": "^6.13.0",
    "@vercel/blob": "^2.5.0",
    "bcryptjs": "^2.4.3",
    "echarts": "^6.1.0",
    "echarts-for-react": "^3.0.6",
    "exceljs": "^4.4.0",
    "lucide-react": "^0.468.0",
    "next": "^15.4.5",
    "next-themes": "^0.4.6",
    "qrcode": "^1.5.4",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^22.10.2",
    "@types/qrcode": "^1.5.5",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.17.0",
    "eslint-config-next": "^15.4.5",
    "postcss": "^8.4.49",
    "prisma": "^6.13.0",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
~~~~~~

### `pnpm-lock.yaml`

~~~~~~yaml
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    dependencies:
      '@prisma/client':
        specifier: ^6.13.0
        version: 6.19.3(prisma@6.19.3(typescript@5.9.3))(typescript@5.9.3)
      '@vercel/blob':
        specifier: ^2.5.0
        version: 2.5.0
      bcryptjs:
        specifier: ^2.4.3
        version: 2.4.3
      echarts:
        specifier: ^6.1.0
        version: 6.1.0
      echarts-for-react:
        specifier: ^3.0.6
        version: 3.0.6(echarts@6.1.0)(react@19.2.7)
      exceljs:
        specifier: ^4.4.0
        version: 4.4.0
      lucide-react:
        specifier: ^0.468.0
        version: 0.468.0(react@19.2.7)
      next:
        specifier: ^15.4.5
        version: 15.5.20(react-dom@19.2.7(react@19.2.7))(react@19.2.7)
      next-themes:
        specifier: ^0.4.6
        version: 0.4.6(react-dom@19.2.7(react@19.2.7))(react@19.2.7)
      qrcode:
        specifier: ^1.5.4
        version: 1.5.4
      react:
        specifier: ^19.1.0
        version: 19.2.7
      react-dom:
        specifier: ^19.1.0
        version: 19.2.7(react@19.2.7)
      zod:
        specifier: ^3.24.1
        version: 3.25.76
    devDependencies:
      '@types/bcryptjs':
        specifier: ^2.4.6
        version: 2.4.6
      '@types/node':
        specifier: ^22.10.2
        version: 22.20.0
      '@types/qrcode':
        specifier: ^1.5.5
        version: 1.5.6
      '@types/react':
        specifier: ^19.0.2
        version: 19.2.17
      '@types/react-dom':
        specifier: ^19.0.2
        version: 19.2.3(@types/react@19.2.17)
      autoprefixer:
        specifier: ^10.4.20
        version: 10.5.2(postcss@8.5.16)
      eslint:
        specifier: ^9.17.0
        version: 9.39.4(jiti@1.21.7)
      eslint-config-next:
        specifier: ^15.4.5
        version: 15.5.20(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3)
      postcss:
        specifier: ^8.4.49
        version: 8.5.16
      prisma:
        specifier: ^6.13.0
        version: 6.19.3(typescript@5.9.3)
      tailwindcss:
        specifier: ^3.4.17
        version: 3.4.19(tsx@4.23.0)
      tsx:
        specifier: ^4.19.2
        version: 4.23.0
      typescript:
        specifier: ^5.7.2
        version: 5.9.3

packages:

  '@alloc/quick-lru@5.2.0':
    resolution: {integrity: sha512-UrcABB+4bUrFABwbluTIBErXwvbsU/V7TZWfmbgJfbkwiBuziS9gxdODUyuiecfdGQ85jglMW6juS3+z5TsKLw==}
    engines: {node: '>=10'}

  '@emnapi/core@1.10.0':
    resolution: {integrity: sha512-yq6OkJ4p82CAfPl0u9mQebQHKPJkY7WrIuk205cTYnYe+k2Z8YBh11FrbRG/H6ihirqcacOgl2BIO8oyMQLeXw==}

  '@emnapi/runtime@1.10.0':
    resolution: {integrity: sha512-ewvYlk86xUoGI0zQRNq/mC+16R1QeDlKQy21Ki3oSYXNgLb45GV1P6A0M+/s6nyCuNDqe5VpaY84BzXGwVbwFA==}

  '@emnapi/runtime@1.11.2':
    resolution: {integrity: sha512-kyOl3X0DuTiT1h2ft8r2fYO8JYtU9a9Xis/zBSiGArNaagCOWx90N1k2wxp18czFDH+OgcWGb5ZP/XMt3dcyPA==}

  '@emnapi/wasi-threads@1.2.1':
    resolution: {integrity: sha512-uTII7OYF+/Mes/MrcIOYp5yOtSMLBWSIoLPpcgwipoiKbli6k322tcoFsxoIIxPDqW01SQGAgko4EzZi2BNv2w==}

  '@esbuild/aix-ppc64@0.28.1':
    resolution: {integrity: sha512-Svl7tq8k/08+p6CXPpRjQ1fKX+1odH/BQbb48fV6fj3CWHhsoIOoY87w1oHXm0qEpkIK3ZfVgp0hed3XBXzXMQ==}
    engines: {node: '>=18'}
    cpu: [ppc64]
    os: [aix]

  '@esbuild/android-arm64@0.28.1':
    resolution: {integrity: sha512-34EGEbCIAgosYz6goLcopX6Mo7NyGv9tfwEM2/7Ce2VcVRk568iSvniGWcUXIy7wEDR1wzolcxcriFVrWYcwBg==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [android]

  '@esbuild/android-arm@0.28.1':
    resolution: {integrity: sha512-0k2F129Xdio1TdJfzJ8sy1Q47vUD2NnwdhiAf7drUN1EBTfPf4hsFCtmMgu/6m8JSzsBrlmVjudMBQqOfG8usQ==}
    engines: {node: '>=18'}
    cpu: [arm]
    os: [android]

  '@esbuild/android-x64@0.28.1':
    resolution: {integrity: sha512-dbwY7ltSMDWsRatcRpCnES4F+im88OCUgGZjy52shC7GqHRE/cYlxNbB4Z4UpJswpcc4Qxd2oE/ufM0p61IKng==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [android]

  '@esbuild/darwin-arm64@0.28.1':
    resolution: {integrity: sha512-TZbWkQY7kvTAXbXUT7uVACR5cMHsDiSz9z7ZKAX/RTq/WJEk3QyRr0wZpNhBDX+/0CtdqUIJlOiodQcta6tY3Q==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [darwin]

  '@esbuild/darwin-x64@0.28.1':
    resolution: {integrity: sha512-zfdzgK9ACBNZLI/CyHTOx81SyNbM6YXn7rxSgX97VjyiPl9W1i4Ka4fgKECEoFCKGpvBj5qArWIGgQjOwkgskQ==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [darwin]

  '@esbuild/freebsd-arm64@0.28.1':
    resolution: {integrity: sha512-wG2EA8ENdEI0qhkSZMjfqrdY+ziCYCPMmtZjjIwOmXFjmyzEHn+UUxk5of+SYsjtfs3VpnlC7QLzSI5hY/rOAw==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [freebsd]

  '@esbuild/freebsd-x64@0.28.1':
    resolution: {integrity: sha512-i7dZ9vQgnvSCzi/rYCXNgtF/U+eKZNJBzu3eTQbRgHnM7tNSizLOkRFAl3qzVc/Op/u5YkHHa4pf/3DOYHthLQ==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [freebsd]

  '@esbuild/linux-arm64@0.28.1':
    resolution: {integrity: sha512-yHs+0uc8+nvEAfAfxrWQKK5peSNzBc4PegcMO0EJ2hT71uA7vB8Ihg2e77R2P7SG5uYjPbHlLLmve4LLLRCf0g==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [linux]

  '@esbuild/linux-arm@0.28.1':
    resolution: {integrity: sha512-qVXBOHQS+d5Y722GwJzJUtOLlX7km3CraOaGormF1pDtPd2C/l1SHRPgjLunLGe51Sh5YYWKMFDyV4SxgMQYTQ==}
    engines: {node: '>=18'}
    cpu: [arm]
    os: [linux]

  '@esbuild/linux-ia32@0.28.1':
    resolution: {integrity: sha512-d1z4ZuP0ajrfz/FhGT4vv278rX8KnPPJx8i5+AtK7TYbx9Le9F1hyzurZpkEyjkGa9dUGhQow4C1NmeGvqxN2w==}
    engines: {node: '>=18'}
    cpu: [ia32]
    os: [linux]

  '@esbuild/linux-loong64@0.28.1':
    resolution: {integrity: sha512-M5sRjUVZrkm1OAPR3dlOYzNmN+loZKGVi1VUQGrwuqLcbR6qeAz+famMhjASeH3YVKvZz+zT1jlh/keC3Rj/lg==}
    engines: {node: '>=18'}
    cpu: [loong64]
    os: [linux]

  '@esbuild/linux-mips64el@0.28.1':
    resolution: {integrity: sha512-mRObBZeHh2OxcBFPWE/FjylkRgZdYuiTR3vaTozquCGOH14iP9oN4x4Ge81CoIDYQrXmIxpFumJBu5MtZpnQJQ==}
    engines: {node: '>=18'}
    cpu: [mips64el]
    os: [linux]

  '@esbuild/linux-ppc64@0.28.1':
    resolution: {integrity: sha512-slScBsMAb3GFDcdrCgLwZtPYRoH2H/youv10QiZyRjmsP48fznoveWytSgCI/R0ZcUgpc0ZhIUEx6LHts8yrfQ==}
    engines: {node: '>=18'}
    cpu: [ppc64]
    os: [linux]

  '@esbuild/linux-riscv64@0.28.1':
    resolution: {integrity: sha512-kw0owk1o0GFETUJyW0jc0G4Yzs0BHZn0JDZ8JRT088vjJYX777BAs1fDGxAC+q831qOs2DTC96mNsG2opdfyyQ==}
    engines: {node: '>=18'}
    cpu: [riscv64]
    os: [linux]

  '@esbuild/linux-s390x@0.28.1':
    resolution: {integrity: sha512-/lAIjX8aYFRByhh6L5rYtPEDRqa9de/4V/juOXcta5frjvzXO4/sqEtyytse0g3zZFuWu5cDN0MkLz2qRDD2Ag==}
    engines: {node: '>=18'}
    cpu: [s390x]
    os: [linux]

  '@esbuild/linux-x64@0.28.1':
    resolution: {integrity: sha512-u/anNYF2mmVOEDwLtnQ1wOr3EZ9sTNGLWrsYGYwHWzGA3Si84IOkHXlbWTD1NB+9/1lcnweYKO54uhxZydNzfA==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [linux]

  '@esbuild/netbsd-arm64@0.28.1':
    resolution: {integrity: sha512-oks0DYbLwWMmaakTsCb+zL4E+aHRVLom9IJZOAthMQEPiQmydXHkziYEsGYRx0uNV/IjEKGAV941JzH02pflqw==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [netbsd]

  '@esbuild/netbsd-x64@0.28.1':
    resolution: {integrity: sha512-aeL6lAnN89Hz43Mlh1G8ARasbuoYvSITDEx0tHh5b7jJnHcssqgjy9Yx430GDpmCa6OyrKoS0aNRjKundRizGg==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [netbsd]

  '@esbuild/openbsd-arm64@0.28.1':
    resolution: {integrity: sha512-MEFJe5C3R8pwXdZ5Y21oo6m7ePiS0d9pWucn99O/wvyJZChoIQKrQDxKrGeW8F5+T0okTHesAmDeiHDTIq0V/Q==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [openbsd]

  '@esbuild/openbsd-x64@0.28.1':
    resolution: {integrity: sha512-i/ZLIOafE0Z8cI/XANJAixoJL/uRAoS2xOA3rb0xN+KK0K177cMAsQYkzHtBrtMXAKuAc7HGgcWiZ/sRC1Nxgw==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [openbsd]

  '@esbuild/openharmony-arm64@0.28.1':
    resolution: {integrity: sha512-ge+Z7EXFNt2BO1oAMsVpiQ8EwndV9i1xXerAeTIK7AtPs3bKFXQM7nlRxDSIUIMeueR1CNXxqztLzdNeReKBJg==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [openharmony]

  '@esbuild/sunos-x64@0.28.1':
    resolution: {integrity: sha512-BEjgtECkL3vY+SaSQ6nzVfiALUeFxpawyp8Jmf5PtYhf1Ug40N1h/hxlhts+f1FvSvarEigdxS3BlSMI2PJLcQ==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [sunos]

  '@esbuild/win32-arm64@0.28.1':
    resolution: {integrity: sha512-lCv9eK/H6ZJWbE7bh2nw54CZ9M2nupBxJcTsdk/QQnWkdSjKGuxmmH8/GWrlT1eMmZfn4dGcCjRte397WqfQXA==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [win32]

  '@esbuild/win32-ia32@0.28.1':
    resolution: {integrity: sha512-zvb/mB2bSCoJOpoCBgYKKpX6YM6mJBlBUVUtVj41DlZJVEB6/0CKlRYxP5wWl1C1ILiCoAU5wZZ4q1P3qeS6Eg==}
    engines: {node: '>=18'}
    cpu: [ia32]
    os: [win32]

  '@esbuild/win32-x64@0.28.1':
    resolution: {integrity: sha512-bm4Mowrv+GXMlpWX++EcXw/iLyd1o3+bJkC2DkWXYVvgZCqD/bSj9ctZeAMC3cIxgjRVR2Dufaiu4YPxr5gW1A==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [win32]

  '@eslint-community/eslint-utils@4.9.1':
    resolution: {integrity: sha512-phrYmNiYppR7znFEdqgfWHXR6NCkZEK7hwWDHZUjit/2/U0r6XvkDl0SYnoM51Hq7FhCGdLDT6zxCCOY1hexsQ==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}
    peerDependencies:
      eslint: ^6.0.0 || ^7.0.0 || >=8.0.0

  '@eslint-community/regexpp@4.12.2':
    resolution: {integrity: sha512-EriSTlt5OC9/7SXkRSCAhfSxxoSUgBm33OH+IkwbdpgoqsSsUg7y3uh+IICI/Qg4BBWr3U2i39RpmycbxMq4ew==}
    engines: {node: ^12.0.0 || ^14.0.0 || >=16.0.0}

  '@eslint/config-array@0.21.2':
    resolution: {integrity: sha512-nJl2KGTlrf9GjLimgIru+V/mzgSK0ABCDQRvxw5BjURL7WfH5uoWmizbH7QB6MmnMBd8cIC9uceWnezL1VZWWw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@eslint/config-helpers@0.4.2':
    resolution: {integrity: sha512-gBrxN88gOIf3R7ja5K9slwNayVcZgK6SOUORm2uBzTeIEfeVaIhOpCtTox3P6R7o2jLFwLFTLnC7kU/RGcYEgw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@eslint/core@0.17.0':
    resolution: {integrity: sha512-yL/sLrpmtDaFEiUj1osRP4TI2MDz1AddJL+jZ7KSqvBuliN4xqYY54IfdN8qD8Toa6g1iloph1fxQNkjOxrrpQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@eslint/eslintrc@3.3.5':
    resolution: {integrity: sha512-4IlJx0X0qftVsN5E+/vGujTRIFtwuLbNsVUe7TO6zYPDR1O6nFwvwhIKEKSrl6dZchmYBITazxKoUYOjdtjlRg==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@eslint/js@9.39.4':
    resolution: {integrity: sha512-nE7DEIchvtiFTwBw4Lfbu59PG+kCofhjsKaCWzxTpt4lfRjRMqG6uMBzKXuEcyXhOHoUp9riAm7/aWYGhXZ9cw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@eslint/object-schema@2.1.7':
    resolution: {integrity: sha512-VtAOaymWVfZcmZbp6E2mympDIHvyjXs/12LqWYjVw6qjrfF+VK+fyG33kChz3nnK+SU5/NeHOqrTEHS8sXO3OA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@eslint/plugin-kit@0.4.1':
    resolution: {integrity: sha512-43/qtrDUokr7LJqoF2c3+RInu/t4zfrpYdoSDfYyhg52rwLV6TnOvdG4fXm7IkSB3wErkcmJS9iEhjVtOSEjjA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@fast-csv/format@4.3.5':
    resolution: {integrity: sha512-8iRn6QF3I8Ak78lNAa+Gdl5MJJBM5vRHivFtMRUWINdevNo00K7OXxS2PshawLKTejVwieIlPmK5YlLu6w4u8A==}

  '@fast-csv/parse@4.3.6':
    resolution: {integrity: sha512-uRsLYksqpbDmWaSmzvJcuApSEe38+6NQZBUsuAyMZKqHxH0g1wcJgsKUvN3WC8tewaqFjBMMGrkHmC+T7k8LvA==}

  '@humanfs/core@0.19.2':
    resolution: {integrity: sha512-UhXNm+CFMWcbChXywFwkmhqjs3PRCmcSa/hfBgLIb7oQ5HNb1wS0icWsGtSAUNgefHeI+eBrA8I1fxmbHsGdvA==}
    engines: {node: '>=18.18.0'}

  '@humanfs/node@0.16.8':
    resolution: {integrity: sha512-gE1eQNZ3R++kTzFUpdGlpmy8kDZD/MLyHqDwqjkVQI0JMdI1D51sy1H958PNXYkM2rAac7e5/CnIKZrHtPh3BQ==}
    engines: {node: '>=18.18.0'}

  '@humanfs/types@0.15.0':
    resolution: {integrity: sha512-ZZ1w0aoQkwuUuC7Yf+7sdeaNfqQiiLcSRbfI08oAxqLtpXQr9AIVX7Ay7HLDuiLYAaFPu8oBYNq/QIi9URHJ3Q==}
    engines: {node: '>=18.18.0'}

  '@humanwhocodes/module-importer@1.0.1':
    resolution: {integrity: sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA==}
    engines: {node: '>=12.22'}

  '@humanwhocodes/retry@0.4.3':
    resolution: {integrity: sha512-bV0Tgo9K4hfPCek+aMAn81RppFKv2ySDQeMoSZuvTASywNTnVJCArCZE2FWqpvIatKu7VMRLWlR1EazvVhDyhQ==}
    engines: {node: '>=18.18'}

  '@img/colour@1.1.0':
    resolution: {integrity: sha512-Td76q7j57o/tLVdgS746cYARfSyxk8iEfRxewL9h4OMzYhbW4TAcppl0mT4eyqXddh6L/jwoM75mo7ixa/pCeQ==}
    engines: {node: '>=18'}

  '@img/sharp-darwin-arm64@0.34.5':
    resolution: {integrity: sha512-imtQ3WMJXbMY4fxb/Ndp6HBTNVtWCUI0WdobyheGf5+ad6xX8VIDO8u2xE4qc/fr08CKG/7dDseFtn6M6g/r3w==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [arm64]
    os: [darwin]

  '@img/sharp-darwin-x64@0.34.5':
    resolution: {integrity: sha512-YNEFAF/4KQ/PeW0N+r+aVVsoIY0/qxxikF2SWdp+NRkmMB7y9LBZAVqQ4yhGCm/H3H270OSykqmQMKLBhBJDEw==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [x64]
    os: [darwin]

  '@img/sharp-libvips-darwin-arm64@1.2.4':
    resolution: {integrity: sha512-zqjjo7RatFfFoP0MkQ51jfuFZBnVE2pRiaydKJ1G/rHZvnsrHAOcQALIi9sA5co5xenQdTugCvtb1cuf78Vf4g==}
    cpu: [arm64]
    os: [darwin]

  '@img/sharp-libvips-darwin-x64@1.2.4':
    resolution: {integrity: sha512-1IOd5xfVhlGwX+zXv2N93k0yMONvUlANylbJw1eTah8K/Jtpi15KC+WSiaX/nBmbm2HxRM1gZ0nSdjSsrZbGKg==}
    cpu: [x64]
    os: [darwin]

  '@img/sharp-libvips-linux-arm64@1.2.4':
    resolution: {integrity: sha512-excjX8DfsIcJ10x1Kzr4RcWe1edC9PquDRRPx3YVCvQv+U5p7Yin2s32ftzikXojb1PIFc/9Mt28/y+iRklkrw==}
    cpu: [arm64]
    os: [linux]
    libc: [glibc]

  '@img/sharp-libvips-linux-arm@1.2.4':
    resolution: {integrity: sha512-bFI7xcKFELdiNCVov8e44Ia4u2byA+l3XtsAj+Q8tfCwO6BQ8iDojYdvoPMqsKDkuoOo+X6HZA0s0q11ANMQ8A==}
    cpu: [arm]
    os: [linux]
    libc: [glibc]

  '@img/sharp-libvips-linux-ppc64@1.2.4':
    resolution: {integrity: sha512-FMuvGijLDYG6lW+b/UvyilUWu5Ayu+3r2d1S8notiGCIyYU/76eig1UfMmkZ7vwgOrzKzlQbFSuQfgm7GYUPpA==}
    cpu: [ppc64]
    os: [linux]
    libc: [glibc]

  '@img/sharp-libvips-linux-riscv64@1.2.4':
    resolution: {integrity: sha512-oVDbcR4zUC0ce82teubSm+x6ETixtKZBh/qbREIOcI3cULzDyb18Sr/Wcyx7NRQeQzOiHTNbZFF1UwPS2scyGA==}
    cpu: [riscv64]
    os: [linux]
    libc: [glibc]

  '@img/sharp-libvips-linux-s390x@1.2.4':
    resolution: {integrity: sha512-qmp9VrzgPgMoGZyPvrQHqk02uyjA0/QrTO26Tqk6l4ZV0MPWIW6LTkqOIov+J1yEu7MbFQaDpwdwJKhbJvuRxQ==}
    cpu: [s390x]
    os: [linux]
    libc: [glibc]

  '@img/sharp-libvips-linux-x64@1.2.4':
    resolution: {integrity: sha512-tJxiiLsmHc9Ax1bz3oaOYBURTXGIRDODBqhveVHonrHJ9/+k89qbLl0bcJns+e4t4rvaNBxaEZsFtSfAdquPrw==}
    cpu: [x64]
    os: [linux]
    libc: [glibc]

  '@img/sharp-libvips-linuxmusl-arm64@1.2.4':
    resolution: {integrity: sha512-FVQHuwx1IIuNow9QAbYUzJ+En8KcVm9Lk5+uGUQJHaZmMECZmOlix9HnH7n1TRkXMS0pGxIJokIVB9SuqZGGXw==}
    cpu: [arm64]
    os: [linux]
    libc: [musl]

  '@img/sharp-libvips-linuxmusl-x64@1.2.4':
    resolution: {integrity: sha512-+LpyBk7L44ZIXwz/VYfglaX/okxezESc6UxDSoyo2Ks6Jxc4Y7sGjpgU9s4PMgqgjj1gZCylTieNamqA1MF7Dg==}
    cpu: [x64]
    os: [linux]
    libc: [musl]

  '@img/sharp-linux-arm64@0.34.5':
    resolution: {integrity: sha512-bKQzaJRY/bkPOXyKx5EVup7qkaojECG6NLYswgktOZjaXecSAeCWiZwwiFf3/Y+O1HrauiE3FVsGxFg8c24rZg==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [arm64]
    os: [linux]
    libc: [glibc]

  '@img/sharp-linux-arm@0.34.5':
    resolution: {integrity: sha512-9dLqsvwtg1uuXBGZKsxem9595+ujv0sJ6Vi8wcTANSFpwV/GONat5eCkzQo/1O6zRIkh0m/8+5BjrRr7jDUSZw==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [arm]
    os: [linux]
    libc: [glibc]

  '@img/sharp-linux-ppc64@0.34.5':
    resolution: {integrity: sha512-7zznwNaqW6YtsfrGGDA6BRkISKAAE1Jo0QdpNYXNMHu2+0dTrPflTLNkpc8l7MUP5M16ZJcUvysVWWrMefZquA==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [ppc64]
    os: [linux]
    libc: [glibc]

  '@img/sharp-linux-riscv64@0.34.5':
    resolution: {integrity: sha512-51gJuLPTKa7piYPaVs8GmByo7/U7/7TZOq+cnXJIHZKavIRHAP77e3N2HEl3dgiqdD/w0yUfiJnII77PuDDFdw==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [riscv64]
    os: [linux]
    libc: [glibc]

  '@img/sharp-linux-s390x@0.34.5':
    resolution: {integrity: sha512-nQtCk0PdKfho3eC5MrbQoigJ2gd1CgddUMkabUj+rBevs8tZ2cULOx46E7oyX+04WGfABgIwmMC0VqieTiR4jg==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [s390x]
    os: [linux]
    libc: [glibc]

  '@img/sharp-linux-x64@0.34.5':
    resolution: {integrity: sha512-MEzd8HPKxVxVenwAa+JRPwEC7QFjoPWuS5NZnBt6B3pu7EG2Ge0id1oLHZpPJdn3OQK+BQDiw9zStiHBTJQQQQ==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [x64]
    os: [linux]
    libc: [glibc]

  '@img/sharp-linuxmusl-arm64@0.34.5':
    resolution: {integrity: sha512-fprJR6GtRsMt6Kyfq44IsChVZeGN97gTD331weR1ex1c1rypDEABN6Tm2xa1wE6lYb5DdEnk03NZPqA7Id21yg==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [arm64]
    os: [linux]
    libc: [musl]

  '@img/sharp-linuxmusl-x64@0.34.5':
    resolution: {integrity: sha512-Jg8wNT1MUzIvhBFxViqrEhWDGzqymo3sV7z7ZsaWbZNDLXRJZoRGrjulp60YYtV4wfY8VIKcWidjojlLcWrd8Q==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [x64]
    os: [linux]
    libc: [musl]

  '@img/sharp-wasm32@0.34.5':
    resolution: {integrity: sha512-OdWTEiVkY2PHwqkbBI8frFxQQFekHaSSkUIJkwzclWZe64O1X4UlUjqqqLaPbUpMOQk6FBu/HtlGXNblIs0huw==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [wasm32]

  '@img/sharp-win32-arm64@0.34.5':
    resolution: {integrity: sha512-WQ3AgWCWYSb2yt+IG8mnC6Jdk9Whs7O0gxphblsLvdhSpSTtmu69ZG1Gkb6NuvxsNACwiPV6cNSZNzt0KPsw7g==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [arm64]
    os: [win32]

  '@img/sharp-win32-ia32@0.34.5':
    resolution: {integrity: sha512-FV9m/7NmeCmSHDD5j4+4pNI8Cp3aW+JvLoXcTUo0IqyjSfAZJ8dIUmijx1qaJsIiU+Hosw6xM5KijAWRJCSgNg==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [ia32]
    os: [win32]

  '@img/sharp-win32-x64@0.34.5':
    resolution: {integrity: sha512-+29YMsqY2/9eFEiW93eqWnuLcWcufowXewwSNIT6UwZdUUCrM3oFjMWH/Z6/TMmb4hlFenmfAVbpWeup2jryCw==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [x64]
    os: [win32]

  '@jridgewell/gen-mapping@0.3.13':
    resolution: {integrity: sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==}

  '@jridgewell/resolve-uri@3.1.2':
    resolution: {integrity: sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==}
    engines: {node: '>=6.0.0'}

  '@jridgewell/sourcemap-codec@1.5.5':
    resolution: {integrity: sha512-cYQ9310grqxueWbl+WuIUIaiUaDcj7WOq5fVhEljNVgRfOUhY9fy2zTvfoqWsnebh8Sl70VScFbICvJnLKB0Og==}

  '@jridgewell/trace-mapping@0.3.31':
    resolution: {integrity: sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw==}

  '@napi-rs/wasm-runtime@1.1.6':
    resolution: {integrity: sha512-ZLv/JdUfkvOy9eCnnBaGfiO+XimbjebAeO+MRQqD/B+FR1tnRN0tpKSJHRbE8sFfS6aqsXZ67TQjfwfsxULVbg==}
    peerDependencies:
      '@emnapi/core': ^1.7.1
      '@emnapi/runtime': ^1.7.1

  '@next/env@15.5.20':
    resolution: {integrity: sha512-dXh51Wvddf8daEyBXryZZEe1FdVxEWx9lgaTseLZUtC1XP/W8Wri+Z+VPOElHlByk23CyqHdc2oVByX7wsTWsw==}

  '@next/eslint-plugin-next@15.5.20':
    resolution: {integrity: sha512-MZUgFpVd9rGSZpb8bNceUWvkAZe6aQw/6h2SSqHQuYzKfaiEUEVPIO6mXqaBmiBEBSN1f1sOc1uV8GCM90oegg==}

  '@next/swc-darwin-arm64@15.5.20':
    resolution: {integrity: sha512-in0yXG7/pRBVjWeEl7f7ZZETpletSMFKXVS4GJgHENTPVrJFNJKPrYewa9rpZcvdjwFece5fZP0CK34G4PxowA==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [darwin]

  '@next/swc-darwin-x64@15.5.20':
    resolution: {integrity: sha512-0hsFshdPnTzGJdDTHeHJ+XPUShOpnyp9pUFDwDhqctsA0Cd8NcIVGRPtptYhgYY9DjkKgCDRkXxmgRc+CgT5Wg==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [darwin]

  '@next/swc-linux-arm64-gnu@15.5.20':
    resolution: {integrity: sha512-DMvkoBtAABOzE6pMZRW/xNm7sKqql3wzzzZJ1R/d/rp4BCxv6LykouD3tHjGY8WdQqGpZs11t+R9AtjPxvvljw==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [linux]
    libc: [glibc]

  '@next/swc-linux-arm64-musl@15.5.20':
    resolution: {integrity: sha512-RQmDfeYBtXV2FSId7dfA1hE6M/T6+g7wdbYnFQ47tw/gUBwV+CccLVejNmCGa9yLDitk83foeg8hl/3DjfYQ5g==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [linux]
    libc: [musl]

  '@next/swc-linux-x64-gnu@15.5.20':
    resolution: {integrity: sha512-DkWLEdKajJwdGt27M3i1VEO2kelTvZrK6Pcb7JvW2BY+nofWm7FBsBNDj7g7Pr1NuQ5PLJvqEqYa20GTsBDnKQ==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [linux]
    libc: [glibc]

  '@next/swc-linux-x64-musl@15.5.20':
    resolution: {integrity: sha512-rAO5b7pKHvX+ExdmJskusDXTNbiNZfptifIPZItbUx+AOXxxTydVBsPt7Oz84DRd5mY8e0DcE8kvLj3AIfjE6w==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [linux]
    libc: [musl]

  '@next/swc-win32-arm64-msvc@15.5.20':
    resolution: {integrity: sha512-Hp3zFsN8N8Kj9+vY6L4vnZ9EtA9eXyATu0q4EfGbZTiocgPUNSfz8NWhym6xvaOmHpJ8EuoypuU1WejCPsTFtg==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [win32]

  '@next/swc-win32-x64-msvc@15.5.20':
    resolution: {integrity: sha512-T/L7CXpR1M0wij/xbF3rT1+7KvSkfOLr7C+ToHHWZTG2eKmb52C5WvsyGCBNtkVvDEUESWkRUbbqSH4rSbOCYQ==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [win32]

  '@nodelib/fs.scandir@2.1.5':
    resolution: {integrity: sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==}
    engines: {node: '>= 8'}

  '@nodelib/fs.stat@2.0.5':
    resolution: {integrity: sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A==}
    engines: {node: '>= 8'}

  '@nodelib/fs.walk@1.2.8':
    resolution: {integrity: sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==}
    engines: {node: '>= 8'}

  '@nolyfill/is-core-module@1.0.39':
    resolution: {integrity: sha512-nn5ozdjYQpUCZlWGuxcJY/KpxkWQs4DcbMCmKojjyrYDEAGy4Ce19NN4v5MduafTwJlbKc99UA8YhSVqq9yPZA==}
    engines: {node: '>=12.4.0'}

  '@prisma/client@6.19.3':
    resolution: {integrity: sha512-mKq3jQFhjvko5LTJFHGilsuQs+W+T3Gm451NzuTDGQxwCzwXHYnIu2zGkRoW+Exq3Rob7yp2MfzSrdIiZVhrBg==}
    engines: {node: '>=18.18'}
    peerDependencies:
      prisma: '*'
      typescript: '>=5.1.0'
    peerDependenciesMeta:
      prisma:
        optional: true
      typescript:
        optional: true

  '@prisma/config@6.19.3':
    resolution: {integrity: sha512-CBPT44BjlQxEt8kiMEauji2WHTDoVBOKl7UlewXmUgBPnr/oPRZC3psci5chJnYmH0ivEIog2OU9PGWoki3DLQ==}

  '@prisma/debug@6.19.3':
    resolution: {integrity: sha512-ljkJ+SgpXNktLG0Q/n4JGYCkKf0f8oYLyjImS2I8e2q2WCfdRRtWER062ZV/ixaNP2M2VKlWXVJiGzZaUgbKZw==}

  '@prisma/engines-version@7.1.1-3.c2990dca591cba766e3b7ef5d9e8a84796e47ab7':
    resolution: {integrity: sha512-03bgb1VD5gvuumNf+7fVGBzfpJPjmqV423l/WxsWk2cNQ42JD0/SsFBPhN6z8iAvdHs07/7ei77SKu7aZfq8bA==}

  '@prisma/engines@6.19.3':
    resolution: {integrity: sha512-RSYxtlYFl5pJ8ZePgMv0lZ9IzVCOdTPOegrs2qcbAEFrBI1G33h6wyC9kjQvo0DnYEhEVY0X4LsuFHXLKQk88g==}

  '@prisma/fetch-engine@6.19.3':
    resolution: {integrity: sha512-tKtl/qco9Nt7LU5iKhpultD8O4vMCZcU2CHjNTnRrL1QvSUr5W/GcyFPjNL87GtRrwBc7ubXXD9xy4EvLvt8JA==}

  '@prisma/get-platform@6.19.3':
    resolution: {integrity: sha512-xFj1VcJ1N3MKooOQAGO0W5tsd0W2QzIvW7DD7c/8H14Zmp4jseeWAITm+w2LLoLrlhoHdPPh0NMZ8mfL6puoHA==}

  '@rtsao/scc@1.1.0':
    resolution: {integrity: sha512-zt6OdqaDoOnJ1ZYsCYGt9YmWzDXl4vQdKTyJev62gFhRGKdx7mcT54V9KIjg+d2wi9EXsPvAPKe7i7WjfVWB8g==}

  '@rushstack/eslint-patch@1.16.1':
    resolution: {integrity: sha512-TvZbIpeKqGQQ7X0zSCvPH9riMSFQFSggnfBjFZ1mEoILW+UuXCKwOoPcgjMwiUtRqFZ8jWhPJc4um14vC6I4ag==}

  '@standard-schema/spec@1.1.0':
    resolution: {integrity: sha512-l2aFy5jALhniG5HgqrD6jXLi/rUWrKvqN/qJx6yoJsgKhblVd+iqqU4RCXavm/jPityDo5TCvKMnpjKnOriy0w==}

  '@swc/helpers@0.5.15':
    resolution: {integrity: sha512-JQ5TuMi45Owi4/BIMAJBoSQoOJu12oOk/gADqlcUL9JEdHB8vyjUSsxqeNXnmXHjYKMi2WcYtezGEEhqUI/E2g==}

  '@tybys/wasm-util@0.10.3':
    resolution: {integrity: sha512-F3fo1MYrRJYL3zER0OUOmkutjr1Vp23m7OsSgp7nq4SP6OqX6C/56XFIPAl5bt3zaBRjmW7SGz3u/6LwFpYcOg==}

  '@types/bcryptjs@2.4.6':
    resolution: {integrity: sha512-9xlo6R2qDs5uixm0bcIqCeMCE6HiQsIyel9KQySStiyqNl2tnj2mP3DX1Nf56MD6KMenNNlBBsy3LJ7gUEQPXQ==}

  '@types/estree@1.0.9':
    resolution: {integrity: sha512-GhdPgy1el4/ImP05X05Uw4cw2/M93BCUmnEvWZNStlCzEKME4Fkk+YpoA5OiHNQmoS7Cafb8Xa3Pya8m1Qrzeg==}

  '@types/json-schema@7.0.15':
    resolution: {integrity: sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==}

  '@types/json5@0.0.29':
    resolution: {integrity: sha512-dRLjCWHYg4oaA77cxO64oO+7JwCwnIzkZPdrrC71jQmQtlhM556pwKo5bUzqvZndkVbeFLIIi+9TC40JNF5hNQ==}

  '@types/node@14.18.63':
    resolution: {integrity: sha512-fAtCfv4jJg+ExtXhvCkCqUKZ+4ok/JQk01qDKhL5BDDoS3AxKXhV5/MAVUZyQnSEd2GT92fkgZl0pz0Q0AzcIQ==}

  '@types/node@22.20.0':
    resolution: {integrity: sha512-QWlFW2wf3nTjC13/DqRnBpR4ZO36VJH/JVBkA/vcnmbTBNQIlnObqyqZE1tUR7+Ni23Lda8R1BxMfbXRpCUx5g==}

  '@types/qrcode@1.5.6':
    resolution: {integrity: sha512-te7NQcV2BOvdj2b1hCAHzAoMNuj65kNBMz0KBaxM6c3VGBOhU0dURQKOtH8CFNI/dsKkwlv32p26qYQTWoB5bw==}

  '@types/react-dom@19.2.3':
    resolution: {integrity: sha512-jp2L/eY6fn+KgVVQAOqYItbF0VY/YApe5Mz2F0aykSO8gx31bYCZyvSeYxCHKvzHG5eZjc+zyaS5BrBWya2+kQ==}
    peerDependencies:
      '@types/react': ^19.2.0

  '@types/react@19.2.17':
    resolution: {integrity: sha512-MXfmqaVPEVgkBT/aY0aGCkRWWtByiYQXo3xdQ8r5RzuFrPiRn8Gar2tQdXSUQ2GKV3bkXckek89V8wQBY2Q/Aw==}

  '@typescript-eslint/eslint-plugin@8.63.0':
    resolution: {integrity: sha512-rvwSgqT+DHpWdzfSzPatRLm02a0GlESt++9iy3hLCDY4BgkaLcl8LBi9Yh7XGFBpwcBE/K3024QuXWTpbz4FfQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      '@typescript-eslint/parser': ^8.63.0
      eslint: ^8.57.0 || ^9.0.0 || ^10.0.0
      typescript: '>=4.8.4 <6.1.0'

  '@typescript-eslint/parser@8.63.0':
    resolution: {integrity: sha512-gwh4gvvlaVDKKxyfxMG+Gnu1u9X0OQBwyGLkbwB65dIzBKnxeRiJlNFqlI3zwVhNXJIs6qV7mlFCn/BIajlVig==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      eslint: ^8.57.0 || ^9.0.0 || ^10.0.0
      typescript: '>=4.8.4 <6.1.0'

  '@typescript-eslint/project-service@8.63.0':
    resolution: {integrity: sha512-e5dh0/UI0ok53AlZ5wRkXCB32z/f2jUZqPR/ygAw5WYaSw8j9EoJWlS7wQjr/dmOaqWjnPIn2m+HhVPCMWGZVQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      typescript: '>=4.8.4 <6.1.0'

  '@typescript-eslint/scope-manager@8.63.0':
    resolution: {integrity: sha512-uUyfMWCnDSN8bCpcrY8nGP2BLkQ9Xn0GsipcONcpIDWhwhO4ZSyHvyS14U3X75mzxWxL3I2UZIrenTzdzcJO8A==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@typescript-eslint/tsconfig-utils@8.63.0':
    resolution: {integrity: sha512-sUAbkulqBAsncKnbRP3+7CtQFRKicexnj7ZwNC6ddCR7EmrXvjvdCYMJbUIqMd6lwoEriZjwLo08aS5tSjVMHg==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      typescript: '>=4.8.4 <6.1.0'

  '@typescript-eslint/type-utils@8.63.0':
    resolution: {integrity: sha512-Nzzh/OGxVCOjObjaj1CQF2RUasyYy2Jfuh+zZ3PjLzG2fYRriAiZLib9UKtO+CpQAS3YHiAS+ckZDclwqI1TPA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      eslint: ^8.57.0 || ^9.0.0 || ^10.0.0
      typescript: '>=4.8.4 <6.1.0'

  '@typescript-eslint/types@8.63.0':
    resolution: {integrity: sha512-xyLtl9DUBBFrcJS4x2pIqGLH68/tC2uOa4Z7pUteW09D3bXnnXUom4dyPikzWgB7llmIc1zoeI3aoUdC4rPK/Q==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@typescript-eslint/typescript-estree@8.63.0':
    resolution: {integrity: sha512-ygBkU+B7ex5UI/gKhaqexWev79uISfIv7XQCRNYO/jmD8rGLPyWLAb3KMRT6nd8Gt9bmUBi9+iX6tBdYfOY81Q==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      typescript: '>=4.8.4 <6.1.0'

  '@typescript-eslint/utils@8.63.0':
    resolution: {integrity: sha512-fUKaeAvrTuQg/Tgt3nliAUSZHJM6DlCcfyEmxCvlX8kieWSStBX+5O5Fnidtc3i2JrH+9c/GL4RY2iasd/GPTA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      eslint: ^8.57.0 || ^9.0.0 || ^10.0.0
      typescript: '>=4.8.4 <6.1.0'

  '@typescript-eslint/visitor-keys@8.63.0':
    resolution: {integrity: sha512-UexrHGnGTpbuQHct2ExOc2ZcFbGUS9FOesCxxqdBGcpI1BxYu/LZ6U8Aq6/72XtF/qRBk9nhuGHFJIXXMhPMdw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@unrs/resolver-binding-android-arm-eabi@1.12.2':
    resolution: {integrity: sha512-g5T90pqg1bo/7mytQx6F4iBNC0Wsh9cu+z9veDbFjc7HjpesJFWD7QMS0NGStXM075+7dJPPVvBbpZlnrdpi/w==}
    cpu: [arm]
    os: [android]

  '@unrs/resolver-binding-android-arm64@1.12.2':
    resolution: {integrity: sha512-YGCRZv/9GLhwmz6mYDeTsm/92BAyR28l6c2ReweVW5pWgfsitWLY8upvfRlGdoyD8HjeTHSYJWyZGD4KJA/nFQ==}
    cpu: [arm64]
    os: [android]

  '@unrs/resolver-binding-darwin-arm64@1.12.2':
    resolution: {integrity: sha512-u9DiNT1auQMO20A9SyTuG3wUgQWB9Z7KjAg0uFuCDR1FsAY8A0CG2S6JpHS1xwm/w1G08bjXZDcyOCjv1WAm2w==}
    cpu: [arm64]
    os: [darwin]

  '@unrs/resolver-binding-darwin-x64@1.12.2':
    resolution: {integrity: sha512-f7rPLi/T1HVKZu/u6t87lroib16n8vrSzcyxI7lg4BGO9UF26KhQL44sd9eOUgrTYhvRXtWOIZT5PejdPyJfUA==}
    cpu: [x64]
    os: [darwin]

  '@unrs/resolver-binding-freebsd-x64@1.12.2':
    resolution: {integrity: sha512-BpcOjWCJub6nRZUS2zA20pmLvjtqAtGejETaIyRLiZiQf++cbrjltLA5NN/xaXfqeOBOSlMFbemIl5/S5tljmg==}
    cpu: [x64]
    os: [freebsd]

  '@unrs/resolver-binding-linux-arm-gnueabihf@1.12.2':
    resolution: {integrity: sha512-vZTDvdSISZjJx66OzJqtsOhzifbqRjbmI1Mnu49fQDwog5GtDI4QidRiEAYbZCRj9C8YZEW+3ZjqsyS9GR4k2A==}
    cpu: [arm]
    os: [linux]

  '@unrs/resolver-binding-linux-arm-musleabihf@1.12.2':
    resolution: {integrity: sha512-BiPI+IrIlwcW4nLLMM21+B1dFPzd55yAVgVGrdgDjNef+ch03GdxrcyaIz8X9SsQirh/kCQ7mviyWlMxdh2D7g==}
    cpu: [arm]
    os: [linux]

  '@unrs/resolver-binding-linux-arm64-gnu@1.12.2':
    resolution: {integrity: sha512-zJc0H99FEPoFfSrNpa91HYfxzfAJCr502oxNK1cfdC9hlaFI43RT+JFCann9JUgZmLzzntChHyn13Sgn9ljHNg==}
    cpu: [arm64]
    os: [linux]
    libc: [glibc]

  '@unrs/resolver-binding-linux-arm64-musl@1.12.2':
    resolution: {integrity: sha512-KQ3Lki6l+Pz1k/eBipN41ES+YUK30beLGb9YqcB1O542cyLCNE6GaxrfcY3T6EezmGGk84wb5XyO9loTM9tkcA==}
    cpu: [arm64]
    os: [linux]
    libc: [musl]

  '@unrs/resolver-binding-linux-loong64-gnu@1.12.2':
    resolution: {integrity: sha512-3SJGEh1DborhG6pyxvhPzCT4bbSIVihsvgJc13P1bHG7KLdNDaF9T3gsTwFc7Jw/5Y5/iWOjkEx7Zy0NvCGX3Q==}
    cpu: [loong64]
    os: [linux]
    libc: [glibc]

  '@unrs/resolver-binding-linux-loong64-musl@1.12.2':
    resolution: {integrity: sha512-jiuG/Obbel7uw1PwHNFfrkiKhLAF6mnyZ6aWlOAVN9WqKm8v0OFGnciJIHu8+CMvXLQ8AD51LPzAoUfT21D5Ew==}
    cpu: [loong64]
    os: [linux]
    libc: [musl]

  '@unrs/resolver-binding-linux-ppc64-gnu@1.12.2':
    resolution: {integrity: sha512-q7xRvVpmcfeL+LlZg8Pbbo6QaTZwDU5BaGZbwfhkEsXJn3Was8xYfE0RBH266xZt0rM6B7i8xAYIvjthuUIWHg==}
    cpu: [ppc64]
    os: [linux]
    libc: [glibc]

  '@unrs/resolver-binding-linux-riscv64-gnu@1.12.2':
    resolution: {integrity: sha512-0CVdx6lcnT3Q9inOH8tsMIOJ6ImndllMjqJHg8RLVdB7Vq4SfkEXl9mCSsVNuNA4MCYycRicCUxPCabVHJRr6A==}
    cpu: [riscv64]
    os: [linux]
    libc: [glibc]

  '@unrs/resolver-binding-linux-riscv64-musl@1.12.2':
    resolution: {integrity: sha512-iOwlRo9vnp6R6ohHQS11n0NnfdXx/omhkocmIfaPRpQhKZ+3BDMkkdRVh53qjkFkpPddf+FETA28NwGN7l5l+w==}
    cpu: [riscv64]
    os: [linux]
    libc: [musl]

  '@unrs/resolver-binding-linux-s390x-gnu@1.12.2':
    resolution: {integrity: sha512-HYJtLfXq94q8iZNFT1lknx258wlkkWhZeUXJRqzKBBUJ00CvZ+N33zgbCqimLjsyw5Va6uUxhVa12mI+kaveEw==}
    cpu: [s390x]
    os: [linux]
    libc: [glibc]

  '@unrs/resolver-binding-linux-x64-gnu@1.12.2':
    resolution: {integrity: sha512-mPsUhunKKDih5O96Y6enDQyHc1SqBPlY1E/SfMWDM3EdJ95Z9CArPeCVwCCqbP45ljvivdEk8Fxn+SIb1rDAJQ==}
    cpu: [x64]
    os: [linux]
    libc: [glibc]

  '@unrs/resolver-binding-linux-x64-musl@1.12.2':
    resolution: {integrity: sha512-azrt6+5ydLd8Vt210AAFis/lZevSfPw93EJRIJG+xPu4WCJ8K0kppCTpMyLPcKT7H15M4Jnt2tMp5bOvCkRC6A==}
    cpu: [x64]
    os: [linux]
    libc: [musl]

  '@unrs/resolver-binding-openharmony-arm64@1.12.2':
    resolution: {integrity: sha512-YZ9hP4O0X9PQb8eO980qmLNGH4zT3I9+SZTdt0Pr0YyuGQhYKoOZkV02VzrzyOZJ5xIJ3UFIenKkUkGg8GjgWQ==}
    cpu: [arm64]
    os: [openharmony]

  '@unrs/resolver-binding-wasm32-wasi@1.12.2':
    resolution: {integrity: sha512-tYFDIkMxSflfEc/h92ZWNsZlHSwgimbNHSO3PL2JWQHfCuC2q316jMyYU9TIWZsFK2bQwyK5VAdYgn8ygPj69A==}
    engines: {node: '>=14.0.0'}
    cpu: [wasm32]

  '@unrs/resolver-binding-win32-arm64-msvc@1.12.2':
    resolution: {integrity: sha512-qzNyg3xL0VPQmCaUh+N5jSitce6k+uCBfMDesWRnlULOZaqUkaJ0ybdT+UqlAWJoQjuqfIU/0Ptx9bteN4D82g==}
    cpu: [arm64]
    os: [win32]

  '@unrs/resolver-binding-win32-ia32-msvc@1.12.2':
    resolution: {integrity: sha512-WD9sY00OfpHVGfsnHZoA8jVT+esS/Bg8z8jzxp5BnDCjjwsuKsPQrzswwpFy4J1AUJbXPRfkpcX0mXrzeXW79g==}
    cpu: [ia32]
    os: [win32]

  '@unrs/resolver-binding-win32-x64-msvc@1.12.2':
    resolution: {integrity: sha512-nAB74NfSNKknqQ1RrYj6uz8FcXEomu/MATJZxh/x+BArzN2U3JbOYC0APYzUIGhVY3m5hRxA8VPNdPBoG8txlA==}
    cpu: [x64]
    os: [win32]

  '@vercel/blob@2.5.0':
    resolution: {integrity: sha512-ke6WnMMYlUu9nBFmyjwEkC2o03Ku2X7QIeJ3KtlOJzblS/8Xau209zt0ic76rd7IvV5nrKCH/BzP4MkFmoSLuw==}
    engines: {node: '>=20.0.0'}

  '@vercel/cli-config@0.2.0':
    resolution: {integrity: sha512-fJRRRB7734BDuXZ89yBEaA2ncYhH7bWX30mk04W80J6VAfQc+4iB8lyzAdaGpFV3/vNlkt9VZt+/uoQoWX6UsQ==}

  '@vercel/cli-exec@1.0.0':
    resolution: {integrity: sha512-kQF8LGie/Hbdq9/psJxLE7owRTcqMQMhgybU04gCeR7cbQAr5t8OrjefDNColJv1QSSucFt4pLwRiARVmlOnug==}
    engines: {node: '>= 18'}

  '@vercel/oidc@3.8.0':
    resolution: {integrity: sha512-r00laGW6Pv778RoR6M2NxX91ycSj+PBwVo+fOb9Bif+F0IyUKt25zrvBzfEzQpeAzbqOgPZyQibEWDdDFApd+A==}
    engines: {node: '>= 20'}

  acorn-jsx@5.3.2:
    resolution: {integrity: sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ==}
    peerDependencies:
      acorn: ^6.0.0 || ^7.0.0 || ^8.0.0

  acorn@8.17.0:
    resolution: {integrity: sha512-xRQbDb9BnwDafYNn6Vwl839DYVjqXYb1XVGtWAZ1kcDc6iwAL4hg3B1dZlRiuENFeO2H53gFG3in621AdERVAg==}
    engines: {node: '>=0.4.0'}
    hasBin: true

  ajv@6.15.0:
    resolution: {integrity: sha512-fgFx7Hfoq60ytK2c7DhnF8jIvzYgOMxfugjLOSMHjLIPgenqa7S7oaagATUq99mV6IYvN2tRmC0wnTYX6iPbMw==}

  ansi-regex@5.0.1:
    resolution: {integrity: sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==}
    engines: {node: '>=8'}

  ansi-styles@4.3.0:
    resolution: {integrity: sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==}
    engines: {node: '>=8'}

  any-promise@1.3.0:
    resolution: {integrity: sha512-7UvmKalWRt1wgjL1RrGxoSJW/0QZFIegpeGvZG9kjp8vrRu55XTHbwnqq2GpXm9uLbcuhxm3IqX9OB4MZR1b2A==}

  anymatch@3.1.3:
    resolution: {integrity: sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw==}
    engines: {node: '>= 8'}

  archiver-utils@2.1.0:
    resolution: {integrity: sha512-bEL/yUb/fNNiNTuUz979Z0Yg5L+LzLxGJz8x79lYmR54fmTIb6ob/hNQgkQnIUDWIFjZVQwl9Xs356I6BAMHfw==}
    engines: {node: '>= 6'}

  archiver-utils@3.0.4:
    resolution: {integrity: sha512-KVgf4XQVrTjhyWmx6cte4RxonPLR9onExufI1jhvw/MQ4BB6IsZD5gT8Lq+u/+pRkWna/6JoHpiQioaqFP5Rzw==}
    engines: {node: '>= 10'}

  archiver@5.3.2:
    resolution: {integrity: sha512-+25nxyyznAXF7Nef3y0EbBeqmGZgeN/BxHX29Rs39djAfaFalmQ89SE6CWyDCHzGL0yt/ycBtNOmGTW0FyGWNw==}
    engines: {node: '>= 10'}

  arg@5.0.2:
    resolution: {integrity: sha512-PYjyFOLKQ9y57JvQ6QLo8dAgNqswh8M1RMJYdQduT6xbWSgK36P/Z/v+p888pM69jMMfS8Xd8F6I1kQ/I9HUGg==}

  argparse@2.0.1:
    resolution: {integrity: sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==}

  aria-query@5.3.2:
    resolution: {integrity: sha512-COROpnaoap1E2F000S62r6A60uHZnmlvomhfyT2DlTcrY1OrBKn2UhH7qn5wTC9zMvD0AY7csdPSNwKP+7WiQw==}
    engines: {node: '>= 0.4'}

  array-buffer-byte-length@1.0.2:
    resolution: {integrity: sha512-LHE+8BuR7RYGDKvnrmcuSq3tDcKv9OFEXQt/HpbZhY7V6h0zlUXutnAD82GiFx9rdieCMjkvtcsPqBwgUl1Iiw==}
    engines: {node: '>= 0.4'}

  array-includes@3.1.9:
    resolution: {integrity: sha512-FmeCCAenzH0KH381SPT5FZmiA/TmpndpcaShhfgEN9eCVjnFBqq3l1xrI42y8+PPLI6hypzou4GXw00WHmPBLQ==}
    engines: {node: '>= 0.4'}

  array.prototype.findlast@1.2.5:
    resolution: {integrity: sha512-CVvd6FHg1Z3POpBLxO6E6zr+rSKEQ9L6rZHAaY7lLfhKsWYUBBOuMs0e9o24oopj6H+geRCX0YJ+TJLBK2eHyQ==}
    engines: {node: '>= 0.4'}

  array.prototype.findlastindex@1.2.6:
    resolution: {integrity: sha512-F/TKATkzseUExPlfvmwQKGITM3DGTK+vkAsCZoDc5daVygbJBnjEUCbgkAvVFsgfXfX4YIqZ/27G3k3tdXrTxQ==}
    engines: {node: '>= 0.4'}

  array.prototype.flat@1.3.3:
    resolution: {integrity: sha512-rwG/ja1neyLqCuGZ5YYrznA62D4mZXg0i1cIskIUKSiqF3Cje9/wXAls9B9s1Wa2fomMsIv8czB8jZcPmxCXFg==}
    engines: {node: '>= 0.4'}

  array.prototype.flatmap@1.3.3:
    resolution: {integrity: sha512-Y7Wt51eKJSyi80hFrJCePGGNo5ktJCslFuboqJsbf57CCPcm5zztluPlc4/aD8sWsKvlwatezpV4U1efk8kpjg==}
    engines: {node: '>= 0.4'}

  array.prototype.tosorted@1.1.4:
    resolution: {integrity: sha512-p6Fx8B7b7ZhL/gmUsAy0D15WhvDccw3mnGNbZpi3pmeJdxtWsj2jEaI4Y6oo3XiHfzuSgPwKc04MYt6KgvC/wA==}
    engines: {node: '>= 0.4'}

  arraybuffer.prototype.slice@1.0.4:
    resolution: {integrity: sha512-BNoCY6SXXPQ7gF2opIP4GBE+Xw7U+pHMYKuzjgCN3GwiaIR09UUeKfheyIry77QtrCBlC0KK0q5/TER/tYh3PQ==}
    engines: {node: '>= 0.4'}

  ast-types-flow@0.0.8:
    resolution: {integrity: sha512-OH/2E5Fg20h2aPrbe+QL8JZQFko0YZaF+j4mnQ7BGhfavO7OpSLa8a0y9sBwomHdSbkhTS8TQNayBfnW5DwbvQ==}

  async-function@1.0.0:
    resolution: {integrity: sha512-hsU18Ae8CDTR6Kgu9DYf0EbCr/a5iGL0rytQDobUcdpYOKokk8LEjVphnXkDkgpi0wYVsqrXuP0bZxJaTqdgoA==}
    engines: {node: '>= 0.4'}

  async-retry@1.3.3:
    resolution: {integrity: sha512-wfr/jstw9xNi/0teMHrRW7dsz3Lt5ARhYNZ2ewpadnhaIp5mbALhOAP+EAdsC7t4Z6wqsDVv9+W6gm1Dk9mEyw==}

  async@3.2.6:
    resolution: {integrity: sha512-htCUDlxyyCLMgaM3xXg0C0LW2xqfuQ6p05pCEIsXuyQ+a1koYKTuBMzRNwmybfLgvJDMd0r1LTn4+E0Ti6C2AA==}

  autoprefixer@10.5.2:
    resolution: {integrity: sha512-rD5t5DwOjJdmSORcTq64j8MawTC+tbQ+HHqjR4NDumamy/ambn1UJrlKL+KdwujWxMkFjPM3pPHOEA9tl4767Q==}
    engines: {node: ^10 || ^12 || >=14}
    hasBin: true
    peerDependencies:
      postcss: ^8.1.0

  available-typed-arrays@1.0.7:
    resolution: {integrity: sha512-wvUjBtSGN7+7SjNpq/9M2Tg350UZD3q62IFZLbRAR1bSMlCo1ZaeW+BJ+D090e4hIIZLBcTDWe4Mh4jvUDajzQ==}
    engines: {node: '>= 0.4'}

  axe-core@4.12.1:
    resolution: {integrity: sha512-s7iGf5GaVMxEG0ENN9x+xTr7GFZCb1ZP/1uATUpCEK2X78nDB3RwbtFCo9pGAf9ru+VwoQ464DkaLEeRM08wJA==}
    engines: {node: '>=4'}

  axobject-query@4.1.0:
    resolution: {integrity: sha512-qIj0G9wZbMGNLjLmg1PT6v2mE9AH2zlnADJD/2tC6E00hgmhUOfEB6greHPAfLRSufHqROIUTkw6E+M3lH0PTQ==}
    engines: {node: '>= 0.4'}

  balanced-match@1.0.2:
    resolution: {integrity: sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==}

  balanced-match@4.0.4:
    resolution: {integrity: sha512-BLrgEcRTwX2o6gGxGOCNyMvGSp35YofuYzw9h1IMTRmKqttAZZVU67bdb9Pr2vUHA8+j3i2tJfjO6C6+4myGTA==}
    engines: {node: 18 || 20 || >=22}

  base64-js@1.5.1:
    resolution: {integrity: sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==}

  baseline-browser-mapping@2.10.42:
    resolution: {integrity: sha512-c/jurFrDLyui7o1J86yLkRu4LMsTYcBohveus7/I2Hzdn9KIP2bdJPTue/lR1KH46enoPbD77GKeSYNdyPoD3Q==}
    engines: {node: '>=6.0.0'}
    hasBin: true

  bcryptjs@2.4.3:
    resolution: {integrity: sha512-V/Hy/X9Vt7f3BbPJEi8BdVFMByHi+jNXrYkW3huaybV/kQ0KJg0Y6PkEMbn+zeT+i+SiKZ/HMqJGIIt4LZDqNQ==}

  big-integer@1.6.52:
    resolution: {integrity: sha512-QxD8cf2eVqJOOz63z6JIN9BzvVs/dlySa5HGSBH5xtR8dPteIRQnBxxKqkNTiT6jbDTF6jAfrd4oMcND9RGbQg==}
    engines: {node: '>=0.6'}

  binary-extensions@2.3.0:
    resolution: {integrity: sha512-Ceh+7ox5qe7LJuLHoY0feh3pHuUDHAcRUeyL2VYghZwfpkNIy/+8Ocg0a3UuSoYzavmylwuLWQOf3hl0jjMMIw==}
    engines: {node: '>=8'}

  binary@0.3.0:
    resolution: {integrity: sha512-D4H1y5KYwpJgK8wk1Cue5LLPgmwHKYSChkbspQg5JtVuR5ulGckxfR62H3AE9UDkdMC8yyXlqYihuz3Aqg2XZg==}

  bl@4.1.0:
    resolution: {integrity: sha512-1W07cM9gS6DcLperZfFSj+bWLtaPGSOHWhPiGzXmvVJbRLdG82sH/Kn8EtW1VqWVA54AKf2h5k5BbnIbwF3h6w==}

  bluebird@3.4.7:
    resolution: {integrity: sha512-iD3898SR7sWVRHbiQv+sHUtHnMvC1o3nW5rAcqnq3uOn07DSAppZYUkIGslDz6gXC7HfunPe7YVBgoEJASPcHA==}

  brace-expansion@1.1.15:
    resolution: {integrity: sha512-EwOCDEex4quD37XhqM3omwtMoJjr//isUZz1JopUNWms+4Z2ViyM/k1YIRePpoVNnQhENnxtFjLaxNHrT7xIUg==}

  brace-expansion@2.1.1:
    resolution: {integrity: sha512-WR1cURNjuvBLMZBMbqM0UoE+WAfdUcEV1ccD8PVBVOI+Z3ND4+SZbN8RsfT2bMuG1qwz5RFvPukSZm5fF2D5eA==}

  brace-expansion@5.0.7:
    resolution: {integrity: sha512-7oFy703dxfY3/NLxC1fh2SUCQ0H9rmAY+5EpDVfXjUTTs+HEwR2nYaqLv+GWcTsumwxPfiz6CzCNkwXwBUwqCA==}
    engines: {node: 18 || 20 || >=22}

  braces@3.0.3:
    resolution: {integrity: sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==}
    engines: {node: '>=8'}

  browserslist@4.28.5:
    resolution: {integrity: sha512-Cu2E6QejHWzuDMTkuwgpABFgDfZrXLQq5V13YOACZx4mFAG4IwGTbTfHPMr4WtxlHoXSM8FIuRwYYCz5XiabaQ==}
    engines: {node: ^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7}
    hasBin: true

  buffer-crc32@0.2.13:
    resolution: {integrity: sha512-VO9Ht/+p3SN7SKWqcrgEzjGbRSJYTx+Q1pTQC0wrWqHx0vpJraQ6GtHx8tvcg1rlK1byhU5gccxgOgj7B0TDkQ==}

  buffer-indexof-polyfill@1.0.2:
    resolution: {integrity: sha512-I7wzHwA3t1/lwXQh+A5PbNvJxgfo5r3xulgpYDB5zckTu/Z9oUK9biouBKQUjEqzaz3HnAT6TYoovmE+GqSf7A==}
    engines: {node: '>=0.10'}

  buffer@5.7.1:
    resolution: {integrity: sha512-EHcyIPBQ4BSGlvjB16k5KgAJ27CIsHY/2JBmCRReo48y9rQ3MaUzWX3KVlBa4U7MyX02HdVj0K7C3WaB3ju7FQ==}

  buffers@0.1.1:
    resolution: {integrity: sha512-9q/rDEGSb/Qsvv2qvzIzdluL5k7AaJOTrw23z9reQthrbF7is4CtlT0DXyO1oei2DCp4uojjzQ7igaSHp1kAEQ==}
    engines: {node: '>=0.2.0'}

  c12@3.1.0:
    resolution: {integrity: sha512-uWoS8OU1MEIsOv8p/5a82c3H31LsWVR5qiyXVfBNOzfffjUWtPnhAb4BYI2uG2HfGmZmFjCtui5XNWaps+iFuw==}
    peerDependencies:
      magicast: ^0.3.5
    peerDependenciesMeta:
      magicast:
        optional: true

  call-bind-apply-helpers@1.0.2:
    resolution: {integrity: sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==}
    engines: {node: '>= 0.4'}

  call-bind@1.0.9:
    resolution: {integrity: sha512-a/hy+pNsFUTR+Iz8TCJvXudKVLAnz/DyeSUo10I5yvFDQJBFU2s9uqQpoSrJlroHUKoKqzg+epxyP9lqFdzfBQ==}
    engines: {node: '>= 0.4'}

  call-bound@1.0.4:
    resolution: {integrity: sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==}
    engines: {node: '>= 0.4'}

  callsites@3.1.0:
    resolution: {integrity: sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ==}
    engines: {node: '>=6'}

  camelcase-css@2.0.1:
    resolution: {integrity: sha512-QOSvevhslijgYwRx6Rv7zKdMF8lbRmx+uQGx2+vDc+KI/eBnsy9kit5aj23AgGu3pa4t9AgwbnXWqS+iOY+2aA==}
    engines: {node: '>= 6'}

  camelcase@5.3.1:
    resolution: {integrity: sha512-L28STB170nwWS63UjtlEOE3dldQApaJXZkOI1uMFfzf3rRuPegHaHesyee+YxQ+W6SvRDQV6UrdOdRiR153wJg==}
    engines: {node: '>=6'}

  caniuse-lite@1.0.30001802:
    resolution: {integrity: sha512-vmv8ub2xwTNmljSKf82mtCk5JH7hC+YgzLj3P5zotvA0tPQ9016tdNNOG8WRca1IxOnhSsivB+J0z5FeE5LOUw==}

  chainsaw@0.1.0:
    resolution: {integrity: sha512-75kWfWt6MEKNC8xYXIdRpDehRYY/tNSgwKaJq+dbbDcxORuVrrQ+SEHoWsniVn9XPYfP4gmdWIeDk/4YNp1rNQ==}

  chalk@4.1.2:
    resolution: {integrity: sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==}
    engines: {node: '>=10'}

  chokidar@3.6.0:
    resolution: {integrity: sha512-7VT13fmjotKpGipCW9JEQAusEPE+Ei8nl6/g4FBAmIm0GOOLMua9NDDo/DWp0ZAxCr3cPq5ZpBqmPAQgDda2Pw==}
    engines: {node: '>= 8.10.0'}

  chokidar@4.0.3:
    resolution: {integrity: sha512-Qgzu8kfBvo+cA4962jnP1KkS6Dop5NS6g7R5LFYJr4b8Ub94PPQXUksCw9PvXoeXPRRddRNC5C1JQUR2SMGtnA==}
    engines: {node: '>= 14.16.0'}

  citty@0.1.6:
    resolution: {integrity: sha512-tskPPKEs8D2KPafUypv2gxwJP8h/OaJmC82QQGGDQcHvXX43xF2VDACcJVmZ0EuSxkpO9Kc4MlrA3q0+FG58AQ==}

  citty@0.2.2:
    resolution: {integrity: sha512-+6vJA3L98yv+IdfKGZHBNiGW5KHn22e/JwID0Strsz8h4S/csAu/OuICwxrg44k5MRiZHWIo8XXuJgQTriRP4w==}

  client-only@0.0.1:
    resolution: {integrity: sha512-IV3Ou0jSMzZrd3pZ48nLkT9DA7Ag1pnPzaiQhpW7c3RbcqqzvzzVu+L8gfqMp/8IM2MQtSiqaCxrrcfu8I8rMA==}

  cliui@6.0.0:
    resolution: {integrity: sha512-t6wbgtoCXvAzst7QgXxJYqPt0usEfbgQdftEPbLL/cvv6HPE5VgvqCuAIDR0NgU52ds6rFwqrgakNLrHEjCbrQ==}

  color-convert@2.0.1:
    resolution: {integrity: sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==}
    engines: {node: '>=7.0.0'}

  color-name@1.1.4:
    resolution: {integrity: sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==}

  commander@4.1.1:
    resolution: {integrity: sha512-NOKm8xhkzAjzFx8B2v5OAHT+u5pRQc2UCa2Vq9jYL/31o2wi9mxBA7LIFs3sV5VSC49z6pEhfbMULvShKj26WA==}
    engines: {node: '>= 6'}

  compress-commons@4.1.2:
    resolution: {integrity: sha512-D3uMHtGc/fcO1Gt1/L7i1e33VOvD4A9hfQLP+6ewd+BvG/gQ84Yh4oftEhAdjSMgBgwGL+jsppT7JYNpo6MHHg==}
    engines: {node: '>= 10'}

  concat-map@0.0.1:
    resolution: {integrity: sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==}

  confbox@0.2.4:
    resolution: {integrity: sha512-ysOGlgTFbN2/Y6Cg3Iye8YKulHw+R2fNXHrgSmXISQdMnomY6eNDprVdW9R5xBguEqI954+S6709UyiO7B+6OQ==}

  consola@3.4.2:
    resolution: {integrity: sha512-5IKcdX0nnYavi6G7TtOhwkYzyjfJlatbjMjuLSfE2kYT5pMDOilZ4OvMhi637CcDICTmz3wARPoyhqyX1Y+XvA==}
    engines: {node: ^14.18.0 || >=16.10.0}

  core-util-is@1.0.3:
    resolution: {integrity: sha512-ZQBvi1DcpJ4GDqanjucZ2Hj3wEO5pZDS89BWbkcrvdxksJorwUDDZamX9ldFkp9aw2lmBDLgkObEA4DWNJ9FYQ==}

  crc-32@1.2.2:
    resolution: {integrity: sha512-ROmzCKrTnOwybPcJApAA6WBWij23HVfGVNKqqrZpuyZOHqK2CwHSvpGuyt/UNNvaIjEd8X5IFGp4Mh+Ie1IHJQ==}
    engines: {node: '>=0.8'}
    hasBin: true

  crc32-stream@4.0.3:
    resolution: {integrity: sha512-NT7w2JVU7DFroFdYkeq8cywxrgjPHWkdX1wjpRQXPX5Asews3tA+Ght6lddQO5Mkumffp3X7GEqku3epj2toIw==}
    engines: {node: '>= 10'}

  cross-spawn@7.0.6:
    resolution: {integrity: sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==}
    engines: {node: '>= 8'}

  cssesc@3.0.0:
    resolution: {integrity: sha512-/Tb/JcjK111nNScGob5MNtsntNM1aCNUDipB/TkwZFhyDrrE47SOx/18wF2bbjgc3ZzCSKW1T5nt5EbFoAz/Vg==}
    engines: {node: '>=4'}
    hasBin: true

  csstype@3.2.3:
    resolution: {integrity: sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ==}

  damerau-levenshtein@1.0.8:
    resolution: {integrity: sha512-sdQSFB7+llfUcQHUQO3+B8ERRj0Oa4w9POWMI/puGtuf7gFywGmkaLCElnudfTiKZV+NvHqL0ifzdrI8Ro7ESA==}

  data-view-buffer@1.0.2:
    resolution: {integrity: sha512-EmKO5V3OLXh1rtK2wgXRansaK1/mtVdTUEiEI0W8RkvgT05kfxaH29PliLnpLP73yYO6142Q72QNa8Wx/A5CqQ==}
    engines: {node: '>= 0.4'}

  data-view-byte-length@1.0.2:
    resolution: {integrity: sha512-tuhGbE6CfTM9+5ANGf+oQb72Ky/0+s3xKUpHvShfiz2RxMFgFPjsXuRLBVMtvMs15awe45SRb83D6wH4ew6wlQ==}
    engines: {node: '>= 0.4'}

  data-view-byte-offset@1.0.1:
    resolution: {integrity: sha512-BS8PfmtDGnrgYdOonGZQdLZslWIeCGFP9tpan0hi1Co2Zr2NKADsvGYA8XxuG/4UWgJ6Cjtv+YJnB6MM69QGlQ==}
    engines: {node: '>= 0.4'}

  dayjs@1.11.21:
    resolution: {integrity: sha512-98IT+HOahAisibz/yjKbzuOBwYcjJ7BCLPzARyHiyEBmRz4fatF+KPJszEHXsGYjUG234aH/cOjW1wwTbKUZlA==}

  debug@3.2.7:
    resolution: {integrity: sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ==}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  debug@4.4.3:
    resolution: {integrity: sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==}
    engines: {node: '>=6.0'}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  decamelize@1.2.0:
    resolution: {integrity: sha512-z2S+W9X73hAUUki+N+9Za2lBlun89zigOyGrsax+KUQ6wKW4ZoWpEYBkGhQjwAjjDCkWxhY0VKEhk8wzY7F5cA==}
    engines: {node: '>=0.10.0'}

  deep-is@0.1.4:
    resolution: {integrity: sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==}

  deepmerge-ts@7.1.5:
    resolution: {integrity: sha512-HOJkrhaYsweh+W+e74Yn7YStZOilkoPb6fycpwNLKzSPtruFs48nYis0zy5yJz1+ktUhHxoRDJ27RQAWLIJVJw==}
    engines: {node: '>=16.0.0'}

  define-data-property@1.1.4:
    resolution: {integrity: sha512-rBMvIzlpA8v6E+SJZoo++HAYqsLrkg7MSfIinMPFhmkorw7X+dOXVJQs+QT69zGkzMyfDnIMN2Wid1+NbL3T+A==}
    engines: {node: '>= 0.4'}

  define-properties@1.2.1:
    resolution: {integrity: sha512-8QmQKqEASLd5nx0U1B1okLElbUuuttJ/AnYmRXbbbGDWh6uS208EjD4Xqq/I9wK7u0v6O08XhTWnt5XtEbR6Dg==}
    engines: {node: '>= 0.4'}

  defu@6.1.7:
    resolution: {integrity: sha512-7z22QmUWiQ/2d0KkdYmANbRUVABpZ9SNYyH5vx6PZ+nE5bcC0l7uFvEfHlyld/HcGBFTL536ClDt3DEcSlEJAQ==}

  destr@2.0.5:
    resolution: {integrity: sha512-ugFTXCtDZunbzasqBxrK93Ik/DRYsO6S/fedkWEMKqt04xZ4csmnmwGDBAb07QWNaGMAmnTIemsYZCksjATwsA==}

  detect-libc@2.1.2:
    resolution: {integrity: sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==}
    engines: {node: '>=8'}

  didyoumean@1.2.2:
    resolution: {integrity: sha512-gxtyfqMg7GKyhQmb056K7M3xszy/myH8w+B4RT+QXBQsvAOdc3XymqDDPHx1BgPgsdAA5SIifona89YtRATDzw==}

  dijkstrajs@1.0.3:
    resolution: {integrity: sha512-qiSlmBq9+BCdCA/L46dw8Uy93mloxsPSbwnm5yrKn2vMPiy8KyAskTF6zuV/j5BMsmOGZDPs7KjU+mjb670kfA==}

  dlv@1.1.3:
    resolution: {integrity: sha512-+HlytyjlPKnIG8XuRG8WvmBP8xs8P71y+SKKS6ZXWoEgLuePxtDoUEiH7WkdePWrQ5JBpE6aoVqfZfJUQkjXwA==}

  doctrine@2.1.0:
    resolution: {integrity: sha512-35mSku4ZXK0vfCuHEDAwt55dg2jNajHZ1odvF+8SSr82EsZY4QmXfuWso8oEd8zRhVObSN18aM0CjSdoBX7zIw==}
    engines: {node: '>=0.10.0'}

  dotenv@16.6.1:
    resolution: {integrity: sha512-uBq4egWHTcTt33a72vpSG0z3HnPuIl6NqYcTrKEg2azoEyl2hpW0zqlxysq2pK9HlDIHyHyakeYaYnSAwd8bow==}
    engines: {node: '>=12'}

  dunder-proto@1.0.1:
    resolution: {integrity: sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==}
    engines: {node: '>= 0.4'}

  duplexer2@0.1.4:
    resolution: {integrity: sha512-asLFVfWWtJ90ZyOUHMqk7/S2w2guQKxUI2itj3d92ADHhxUSbCMGi1f1cBcJ7xM1To+pE/Khbwo1yuNbMEPKeA==}

  echarts-for-react@3.0.6:
    resolution: {integrity: sha512-4zqLgTGWS3JvkQDXjzkR1k1CHRdpd6by0988TWMJgnvDytegWLbeP/VNZmMa+0VJx2eD7Y632bi2JquXDgiGJg==}
    peerDependencies:
      echarts: ^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0
      react: ^15.0.0 || >=16.0.0

  echarts@6.1.0:
    resolution: {integrity: sha512-q0yaFPggC9FUdsWH4blavRWFmxdrIodbkoKNAjJudAI6CA9gNPxHtV2RcZNEepZVlk4yvBYkOkbk6HIVpIyHZA==}

  effect@3.21.0:
    resolution: {integrity: sha512-PPN80qRokCd1f015IANNhrwOnLO7GrrMQfk4/lnZRE/8j7UPWrNNjPV0uBrZutI/nHzernbW+J0hdqQysHiSnQ==}

  electron-to-chromium@1.5.387:
    resolution: {integrity: sha512-TaxwufTFDufvPEoXdhwVrA3UdFWBeWGkYoJ1K8ldF1xe6gKfth6iRNS5lTQ5JPNOHdGQm8PT1QYKUqFLCiUefQ==}

  emoji-regex@8.0.0:
    resolution: {integrity: sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==}

  emoji-regex@9.2.2:
    resolution: {integrity: sha512-L18DaJsXSUk2+42pv8mLs5jJT2hqFkFE4j21wOmgbUqsZ2hL72NsUU785g9RXgo3s0ZNgVl42TiHp3ZtOv/Vyg==}

  empathic@2.0.0:
    resolution: {integrity: sha512-i6UzDscO/XfAcNYD75CfICkmfLedpyPDdozrLMmQc5ORaQcdMoc21OnlEylMIqI7U8eniKrPMxxtj8k0vhmJhA==}
    engines: {node: '>=14'}

  end-of-stream@1.4.5:
    resolution: {integrity: sha512-ooEGc6HP26xXq/N+GCGOT0JKCLDGrq2bQUZrQ7gyrJiZANJ/8YDTxTpQBXGMn+WbIQXNVpyWymm7KYVICQnyOg==}

  es-abstract-get@1.0.0:
    resolution: {integrity: sha512-6PMWXpdhshVvFp+FoWYs1EvG1Nj0tvk0dZM+XcK0xMEM1czRVcP6ohqPWHy6qPagSpC8j4+p89WXlT+xXJs/fg==}
    engines: {node: '>= 0.4'}

  es-abstract@1.24.2:
    resolution: {integrity: sha512-2FpH9Q5i2RRwyEP1AylXe6nYLR5OhaJTZwmlcP0dL/+JCbgg7yyEo/sEK6HeGZRf3dFpWwThaRHVApXSkW3xeg==}
    engines: {node: '>= 0.4'}

  es-define-property@1.0.1:
    resolution: {integrity: sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==}
    engines: {node: '>= 0.4'}

  es-errors@1.3.0:
    resolution: {integrity: sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==}
    engines: {node: '>= 0.4'}

  es-iterator-helpers@1.3.3:
    resolution: {integrity: sha512-0PuBxFi+4uPanB97iDxCLWuHeYud2FALrw5HFZGtAF38UpJDbDC8frwp2cnDyae692CQ0dou60UwWfhgsa4U/g==}
    engines: {node: '>= 0.4'}

  es-object-atoms@1.1.2:
    resolution: {integrity: sha512-HWcBoN6NileqtSydK2FqHbS/LoDd2pqrnQHLyJzBj4kOp/ky2MWMN694xOfkK8/SnUsW2DH7EfyVlydKCsm1Zw==}
    engines: {node: '>= 0.4'}

  es-set-tostringtag@2.1.0:
    resolution: {integrity: sha512-j6vWzfrGVfyXxge+O0x5sh6cvxAog0a/4Rdd2K36zCMV5eJ+/+tOAngRO8cODMNWbVRdVlmGZQL2YS3yR8bIUA==}
    engines: {node: '>= 0.4'}

  es-shim-unscopables@1.1.0:
    resolution: {integrity: sha512-d9T8ucsEhh8Bi1woXCf+TIKDIROLG5WCkxg8geBCbvk22kzwC5G2OnXVMO6FUsvQlgUUXQ2itephWDLqDzbeCw==}
    engines: {node: '>= 0.4'}

  es-to-primitive@1.3.4:
    resolution: {integrity: sha512-yPDz7wqpg1/mmHLmS3tcfTfbw5f1eryXvyghYBffGdERwe+mV7ZcWzTR8LR17Kvqt3qfPurjlonmnq3MKXIOXw==}
    engines: {node: '>= 0.4'}

  esbuild@0.28.1:
    resolution: {integrity: sha512-HrJrvZv5ayxBzPfwphOoNzkzOIIlifzk0KJrGK2c8R4+LKpMtpYLQeUdjnwjWv/LZlkH2laZk+4w78pi99D4Vw==}
    engines: {node: '>=18'}
    hasBin: true

  escalade@3.2.0:
    resolution: {integrity: sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==}
    engines: {node: '>=6'}

  escape-string-regexp@4.0.0:
    resolution: {integrity: sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==}
    engines: {node: '>=10'}

  eslint-config-next@15.5.20:
    resolution: {integrity: sha512-Pl/I5544gmkcVVWcnaOMfhJSBK8lZ1NCJ+mGBkd2qvbGt2Gi7sEpgHF06OR13a2p6THODlncpvGsZzY2vUqwxw==}
    peerDependencies:
      eslint: ^7.23.0 || ^8.0.0 || ^9.0.0
      typescript: '>=3.3.1'
    peerDependenciesMeta:
      typescript:
        optional: true

  eslint-import-resolver-node@0.3.10:
    resolution: {integrity: sha512-tRrKqFyCaKict5hOd244sL6EQFNycnMQnBe+j8uqGNXYzsImGbGUU4ibtoaBmv5FLwJwcFJNeg1GeVjQfbMrDQ==}

  eslint-import-resolver-typescript@3.10.1:
    resolution: {integrity: sha512-A1rHYb06zjMGAxdLSkN2fXPBwuSaQ0iO5M/hdyS0Ajj1VBaRp0sPD3dn1FhME3c/JluGFbwSxyCfqdSbtQLAHQ==}
    engines: {node: ^14.18.0 || >=16.0.0}
    peerDependencies:
      eslint: '*'
      eslint-plugin-import: '*'
      eslint-plugin-import-x: '*'
    peerDependenciesMeta:
      eslint-plugin-import:
        optional: true
      eslint-plugin-import-x:
        optional: true

  eslint-module-utils@2.14.0:
    resolution: {integrity: sha512-W2WCRZ9Dqntd+2u8jJcVMV2PKulc6RdLgUUoh/yQr3uB6lo/ZOeGx11sv60/8S4QFFKNslAlWhr9u0Ef7ZW6Ig==}
    engines: {node: '>=4'}
    peerDependencies:
      '@typescript-eslint/parser': '*'
      eslint: '*'
      eslint-import-resolver-node: '*'
      eslint-import-resolver-typescript: '*'
      eslint-import-resolver-webpack: '*'
    peerDependenciesMeta:
      '@typescript-eslint/parser':
        optional: true
      eslint:
        optional: true
      eslint-import-resolver-node:
        optional: true
      eslint-import-resolver-typescript:
        optional: true
      eslint-import-resolver-webpack:
        optional: true

  eslint-plugin-import@2.32.0:
    resolution: {integrity: sha512-whOE1HFo/qJDyX4SnXzP4N6zOWn79WhnCUY/iDR0mPfQZO8wcYE4JClzI2oZrhBnnMUCBCHZhO6VQyoBU95mZA==}
    engines: {node: '>=4'}
    peerDependencies:
      '@typescript-eslint/parser': '*'
      eslint: ^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9
    peerDependenciesMeta:
      '@typescript-eslint/parser':
        optional: true

  eslint-plugin-jsx-a11y@6.10.2:
    resolution: {integrity: sha512-scB3nz4WmG75pV8+3eRUQOHZlNSUhFNq37xnpgRkCCELU3XMvXAxLk1eqWWyE22Ki4Q01Fnsw9BA3cJHDPgn2Q==}
    engines: {node: '>=4.0'}
    peerDependencies:
      eslint: ^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9

  eslint-plugin-react-hooks@5.2.0:
    resolution: {integrity: sha512-+f15FfK64YQwZdJNELETdn5ibXEUQmW1DZL6KXhNnc2heoy/sg9VJJeT7n8TlMWouzWqSWavFkIhHyIbIAEapg==}
    engines: {node: '>=10'}
    peerDependencies:
      eslint: ^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0

  eslint-plugin-react@7.37.5:
    resolution: {integrity: sha512-Qteup0SqU15kdocexFNAJMvCJEfa2xUKNV4CC1xsVMrIIqEy3SQ/rqyxCWNzfrd3/ldy6HMlD2e0JDVpDg2qIA==}
    engines: {node: '>=4'}
    peerDependencies:
      eslint: ^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7

  eslint-scope@8.4.0:
    resolution: {integrity: sha512-sNXOfKCn74rt8RICKMvJS7XKV/Xk9kA7DyJr8mJik3S7Cwgy3qlkkmyS2uQB3jiJg6VNdZd/pDBJu0nvG2NlTg==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  eslint-visitor-keys@3.4.3:
    resolution: {integrity: sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}

  eslint-visitor-keys@4.2.1:
    resolution: {integrity: sha512-Uhdk5sfqcee/9H/rCOJikYz67o0a2Tw2hGRPOG2Y1R2dg7brRe1uG0yaNQDHu+TO/uQPF/5eCapvYSmHUjt7JQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  eslint-visitor-keys@5.0.1:
    resolution: {integrity: sha512-tD40eHxA35h0PEIZNeIjkHoDR4YjjJp34biM0mDvplBe//mB+IHCqHDGV7pxF+7MklTvighcCPPZC7ynWyjdTA==}
    engines: {node: ^20.19.0 || ^22.13.0 || >=24}

  eslint@9.39.4:
    resolution: {integrity: sha512-XoMjdBOwe/esVgEvLmNsD3IRHkm7fbKIUGvrleloJXUZgDHig2IPWNniv+GwjyJXzuNqVjlr5+4yVUZjycJwfQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    hasBin: true
    peerDependencies:
      jiti: '*'
    peerDependenciesMeta:
      jiti:
        optional: true

  espree@10.4.0:
    resolution: {integrity: sha512-j6PAQ2uUr79PZhBjP5C5fhl8e39FmRnOjsD5lGnWrFU8i2G776tBK7+nP8KuQUTTyAZUwfQqXAgrVH5MbH9CYQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  esquery@1.7.0:
    resolution: {integrity: sha512-Ap6G0WQwcU/LHsvLwON1fAQX9Zp0A2Y6Y/cJBl9r/JbW90Zyg4/zbG6zzKa2OTALELarYHmKu0GhpM5EO+7T0g==}
    engines: {node: '>=0.10'}

  esrecurse@4.3.0:
    resolution: {integrity: sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag==}
    engines: {node: '>=4.0'}

  estraverse@5.3.0:
    resolution: {integrity: sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA==}
    engines: {node: '>=4.0'}

  esutils@2.0.3:
    resolution: {integrity: sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==}
    engines: {node: '>=0.10.0'}

  exceljs@4.4.0:
    resolution: {integrity: sha512-XctvKaEMaj1Ii9oDOqbW/6e1gXknSY4g/aLCDicOXqBE4M0nRWkUu0PTp++UPNzoFY12BNHMfs/VadKIS6llvg==}
    engines: {node: '>=8.3.0'}

  execa@5.1.1:
    resolution: {integrity: sha512-8uSpZZocAZRBAPIEINJj3Lo9HyGitllczc27Eh5YYojjMFMn8yHMDMaUHE2Jqfq05D/wucwI4JGURyXt1vchyg==}
    engines: {node: '>=10'}

  exsolve@1.1.0:
    resolution: {integrity: sha512-D+42+T12DdIlJM3uepa55qGiL3sYdLBOxIl2ifQCzCHz4c7eiolaHsi3BIqEr7JxBzxv2pYZQX9kw16ziMcEmw==}

  fast-check@3.23.2:
    resolution: {integrity: sha512-h5+1OzzfCC3Ef7VbtKdcv7zsstUQwUDlYpUTvjeUsJAssPgLn7QzbboPtL5ro04Mq0rPOsMzl7q5hIbRs2wD1A==}
    engines: {node: '>=8.0.0'}

  fast-csv@4.3.6:
    resolution: {integrity: sha512-2RNSpuwwsJGP0frGsOmTb9oUF+VkFSM4SyLTDgwf2ciHWTarN0lQTC+F2f/t5J9QjW+c65VFIAAu85GsvMIusw==}
    engines: {node: '>=10.0.0'}

  fast-deep-equal@3.1.3:
    resolution: {integrity: sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==}

  fast-glob@3.3.1:
    resolution: {integrity: sha512-kNFPyjhh5cKjrUltxs+wFx+ZkbRaxxmZ+X0ZU31SOsxCEtP9VPgtq2teZw1DebupL5GmDaNQ6yKMMVcM41iqDg==}
    engines: {node: '>=8.6.0'}

  fast-glob@3.3.3:
    resolution: {integrity: sha512-7MptL8U0cqcFdzIzwOTHoilX9x5BrNqye7Z/LuC7kCMRio1EMSyqRK3BEAUD7sXRq4iT4AzTVuZdhgQ2TCvYLg==}
    engines: {node: '>=8.6.0'}

  fast-json-stable-stringify@2.1.0:
    resolution: {integrity: sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==}

  fast-levenshtein@2.0.6:
    resolution: {integrity: sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==}

  fastq@1.20.1:
    resolution: {integrity: sha512-GGToxJ/w1x32s/D2EKND7kTil4n8OVk/9mycTc4VDza13lOvpUZTGX3mFSCtV9ksdGBVzvsyAVLM6mHFThxXxw==}

  fdir@6.5.0:
    resolution: {integrity: sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==}
    engines: {node: '>=12.0.0'}
    peerDependencies:
      picomatch: ^3 || ^4
    peerDependenciesMeta:
      picomatch:
        optional: true

  file-entry-cache@8.0.0:
    resolution: {integrity: sha512-XXTUwCvisa5oacNGRP9SfNtYBNAMi+RPwBFmblZEF7N7swHYQS6/Zfk7SRwx4D5j3CH211YNRco1DEMNVfZCnQ==}
    engines: {node: '>=16.0.0'}

  fill-range@7.1.1:
    resolution: {integrity: sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==}
    engines: {node: '>=8'}

  find-up@4.1.0:
    resolution: {integrity: sha512-PpOwAdQ/YlXQ2vj8a3h8IipDuYRi3wceVQQGYWxNINccq40Anw7BlsEXCMbt1Zt+OLA6Fq9suIpIWD0OsnISlw==}
    engines: {node: '>=8'}

  find-up@5.0.0:
    resolution: {integrity: sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng==}
    engines: {node: '>=10'}

  flat-cache@4.0.1:
    resolution: {integrity: sha512-f7ccFPK3SXFHpx15UIGyRJ/FJQctuKZ0zVuN3frBo4HnK3cay9VEW0R6yPYFHC0AgqhukPzKjq22t5DmAyqGyw==}
    engines: {node: '>=16'}

  flatted@3.4.2:
    resolution: {integrity: sha512-PjDse7RzhcPkIJwy5t7KPWQSZ9cAbzQXcafsetQoD7sOJRQlGikNbx7yZp2OotDnJyrDcbyRq3Ttb18iYOqkxA==}

  for-each@0.3.5:
    resolution: {integrity: sha512-dKx12eRCVIzqCxFGplyFKJMPvLEWgmNtUrpTiJIR5u97zEhRG8ySrtboPHZXx7daLxQVrl643cTzbab2tkQjxg==}
    engines: {node: '>= 0.4'}

  fraction.js@5.3.4:
    resolution: {integrity: sha512-1X1NTtiJphryn/uLQz3whtY6jK3fTqoE3ohKs0tT+Ujr1W59oopxmoEh7Lu5p6vBaPbgoM0bzveAW4Qi5RyWDQ==}

  fs-constants@1.0.0:
    resolution: {integrity: sha512-y6OAwoSIf7FyjMIv94u+b5rdheZEjzR63GTyZJm5qh4Bi+2YgwLCcI/fPFZkL5PSixOt6ZNKm+w+Hfp/Bciwow==}

  fs.realpath@1.0.0:
    resolution: {integrity: sha512-OO0pH2lK6a0hZnAdau5ItzHPI6pUlvI7jMVnxUQRtw4owF2wk8lOSabtGDCTP4Ggrg2MbGnWO9X8K1t4+fGMDw==}

  fsevents@2.3.3:
    resolution: {integrity: sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==}
    engines: {node: ^8.16.0 || ^10.6.0 || >=11.0.0}
    os: [darwin]

  fstream@1.0.12:
    resolution: {integrity: sha512-WvJ193OHa0GHPEL+AycEJgxvBEwyfRkN1vhjca23OaPVMCaLCXTd5qAu82AjTcgP1UJmytkOKb63Ypde7raDIg==}
    engines: {node: '>=0.6'}
    deprecated: This package is no longer supported.

  function-bind@1.1.2:
    resolution: {integrity: sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==}

  function.prototype.name@1.2.0:
    resolution: {integrity: sha512-jObKIik1P2QjPHP5nz5BaOtUlfgS0fWo8IUByNXkM+o+02sJOi94em77GwJKQSJ3gfPHdgzLNrHc1uokV4P/ew==}
    engines: {node: '>= 0.4'}

  functions-have-names@1.2.3:
    resolution: {integrity: sha512-xckBUXyTIqT97tq2x2AMb+g163b5JFysYk0x4qxNFwbfQkmNZoiRHb6sPzI9/QV33WeuvVYBUIiD4NzNIyqaRQ==}

  generator-function@2.0.1:
    resolution: {integrity: sha512-SFdFmIJi+ybC0vjlHN0ZGVGHc3lgE0DxPAT0djjVg+kjOnSqclqmj0KQ7ykTOLP6YxoqOvuAODGdcHJn+43q3g==}
    engines: {node: '>= 0.4'}

  get-caller-file@2.0.5:
    resolution: {integrity: sha512-DyFP3BM/3YHTQOCUL/w0OZHR0lpKeGrxotcHWcqNEdnltqFwXVfhEBQ94eIo34AfQpo0rGki4cyIiftY06h2Fg==}
    engines: {node: 6.* || 8.* || >= 10.*}

  get-intrinsic@1.3.0:
    resolution: {integrity: sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==}
    engines: {node: '>= 0.4'}

  get-proto@1.0.1:
    resolution: {integrity: sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==}
    engines: {node: '>= 0.4'}

  get-stream@6.0.1:
    resolution: {integrity: sha512-ts6Wi+2j3jQjqi70w5AlN8DFnkSwC+MqmxEzdEALB2qXZYV3X/b1CTfgPLGJNMeAWxdPfU8FO1ms3NUfaHCPYg==}
    engines: {node: '>=10'}

  get-symbol-description@1.1.0:
    resolution: {integrity: sha512-w9UMqWwJxHNOvoNzSJ2oPF5wvYcvP7jUvYzhp67yEhTi17ZDBBC1z9pTdGuzjD+EFIqLSYRweZjqfiPzQ06Ebg==}
    engines: {node: '>= 0.4'}

  get-tsconfig@4.14.0:
    resolution: {integrity: sha512-yTb+8DXzDREzgvYmh6s9vHsSVCHeC0G3PI5bEXNBHtmshPnO+S5O7qgLEOn0I5QvMy6kpZN8K1NKGyilLb93wA==}

  giget@2.0.0:
    resolution: {integrity: sha512-L5bGsVkxJbJgdnwyuheIunkGatUF/zssUoxxjACCseZYAVbaqdh9Tsmmlkl8vYan09H7sbvKt4pS8GqKLBrEzA==}
    hasBin: true

  glob-parent@5.1.2:
    resolution: {integrity: sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==}
    engines: {node: '>= 6'}

  glob-parent@6.0.2:
    resolution: {integrity: sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==}
    engines: {node: '>=10.13.0'}

  glob@7.2.3:
    resolution: {integrity: sha512-nFR0zLpU2YCaRxwoCJvL6UvCH2JFyFVIvwTLsIf21AuHlMskA1hhTdk+LlYJtOlYt9v6dvszD2BGRqBL+iQK9Q==}
    deprecated: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me

  globals@14.0.0:
    resolution: {integrity: sha512-oahGvuMGQlPw/ivIYBjVSrWAfWLBeku5tpPE2fOPLi+WHffIWbuh2tCjhyQhTBPMf5E9jDEH4FOmTYgYwbKwtQ==}
    engines: {node: '>=18'}

  globalthis@1.0.4:
    resolution: {integrity: sha512-DpLKbNU4WylpxJykQujfCcwYWiV/Jhm50Goo0wrVILAv5jOr9d+H+UR3PhSCD2rCCEIg0uc+G+muBTwD54JhDQ==}
    engines: {node: '>= 0.4'}

  gopd@1.2.0:
    resolution: {integrity: sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==}
    engines: {node: '>= 0.4'}

  graceful-fs@4.2.11:
    resolution: {integrity: sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==}

  has-bigints@1.1.0:
    resolution: {integrity: sha512-R3pbpkcIqv2Pm3dUwgjclDRVmWpTJW2DcMzcIhEXEx1oh/CEMObMm3KLmRJOdvhM7o4uQBnwr8pzRK2sJWIqfg==}
    engines: {node: '>= 0.4'}

  has-flag@4.0.0:
    resolution: {integrity: sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==}
    engines: {node: '>=8'}

  has-property-descriptors@1.0.2:
    resolution: {integrity: sha512-55JNKuIW+vq4Ke1BjOTjM2YctQIvCT7GFzHwmfZPGo5wnrgkid0YQtnAleFSqumZm4az3n2BS+erby5ipJdgrg==}

  has-proto@1.2.0:
    resolution: {integrity: sha512-KIL7eQPfHQRC8+XluaIw7BHUwwqL19bQn4hzNgdr+1wXoU0KKj6rufu47lhY7KbJR2C6T6+PfyN0Ea7wkSS+qQ==}
    engines: {node: '>= 0.4'}

  has-symbols@1.1.0:
    resolution: {integrity: sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==}
    engines: {node: '>= 0.4'}

  has-tostringtag@1.0.2:
    resolution: {integrity: sha512-NqADB8VjPFLM2V0VvHUewwwsw0ZWBaIdgo+ieHtK3hasLz4qeCRjYcqfB6AQrBggRKppKF8L52/VqdVsO47Dlw==}
    engines: {node: '>= 0.4'}

  hasown@2.0.4:
    resolution: {integrity: sha512-T2UbfbBEF32wiepXIsMlTW9+dDYC6wMh/t/vYA4tuOMKqWz/n3vr1NFSxQiyP+zk2mXsoMA/i/7qV6LKut1t1A==}
    engines: {node: '>= 0.4'}

  human-signals@2.1.0:
    resolution: {integrity: sha512-B4FFZ6q/T2jhhksgkbEW3HBvWIfDW85snkQgawt07S7J5QXTk6BkNV+0yAeZrM5QpMAdYlocGoljn0sJ/WQkFw==}
    engines: {node: '>=10.17.0'}

  ieee754@1.2.1:
    resolution: {integrity: sha512-dcyqhDvX1C46lXZcVqCpK+FtMRQVdIMN6/Df5js2zouUsqG7I6sFxitIC+7KYK29KdXOLHdu9zL4sFnoVQnqaA==}

  ignore@5.3.2:
    resolution: {integrity: sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==}
    engines: {node: '>= 4'}

  ignore@7.0.5:
    resolution: {integrity: sha512-Hs59xBNfUIunMFgWAbGX5cq6893IbWg4KnrjbYwX3tx0ztorVgTDA6B2sxf8ejHJ4wz8BqGUMYlnzNBer5NvGg==}
    engines: {node: '>= 4'}

  immediate@3.0.6:
    resolution: {integrity: sha512-XXOFtyqDjNDAQxVfYxuF7g9Il/IbWmmlQg2MYKOH8ExIT1qg6xc4zyS3HaEEATgs1btfzxq15ciUiY7gjSXRGQ==}

  import-fresh@3.3.1:
    resolution: {integrity: sha512-TR3KfrTZTYLPB6jUjfx6MF9WcWrHL9su5TObK4ZkYgBdWKPOFoSoQIdEuTuR82pmtxH2spWG9h6etwfr1pLBqQ==}
    engines: {node: '>=6'}

  imurmurhash@0.1.4:
    resolution: {integrity: sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==}
    engines: {node: '>=0.8.19'}

  inflight@1.0.6:
    resolution: {integrity: sha512-k92I/b08q4wvFscXCLvqfsHCrjrF7yiXsQuIVvVE7N82W3+aqpzuUdBbfhWcy/FZR3/4IgflMgKLOsvPDrGCJA==}
    deprecated: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.

  inherits@2.0.4:
    resolution: {integrity: sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==}

  internal-slot@1.1.0:
    resolution: {integrity: sha512-4gd7VpWNQNB4UKKCFFVcp1AVv+FMOgs9NKzjHKusc8jTMhd5eL1NqQqOpE0KzMds804/yHlglp3uxgluOqAPLw==}
    engines: {node: '>= 0.4'}

  is-array-buffer@3.0.5:
    resolution: {integrity: sha512-DDfANUiiG2wC1qawP66qlTugJeL5HyzMpfr8lLK+jMQirGzNod0B12cFB/9q838Ru27sBwfw78/rdoU7RERz6A==}
    engines: {node: '>= 0.4'}

  is-async-function@2.1.1:
    resolution: {integrity: sha512-9dgM/cZBnNvjzaMYHVoxxfPj2QXt22Ev7SuuPrs+xav0ukGB0S6d4ydZdEiM48kLx5kDV+QBPrpVnFyefL8kkQ==}
    engines: {node: '>= 0.4'}

  is-bigint@1.1.0:
    resolution: {integrity: sha512-n4ZT37wG78iz03xPRKJrHTdZbe3IicyucEtdRsV5yglwc3GyUfbAfpSeD0FJ41NbUNSt5wbhqfp1fS+BgnvDFQ==}
    engines: {node: '>= 0.4'}

  is-binary-path@2.1.0:
    resolution: {integrity: sha512-ZMERYes6pDydyuGidse7OsHxtbI7WVeUEozgR/g7rd0xUimYNlvZRE/K2MgZTjWy725IfelLeVcEM97mmtRGXw==}
    engines: {node: '>=8'}

  is-boolean-object@1.2.2:
    resolution: {integrity: sha512-wa56o2/ElJMYqjCjGkXri7it5FbebW5usLw/nPmCMs5DeZ7eziSYZhSmPRn0txqeW4LnAmQQU7FgqLpsEFKM4A==}
    engines: {node: '>= 0.4'}

  is-buffer@2.0.5:
    resolution: {integrity: sha512-i2R6zNFDwgEHJyQUtJEk0XFi1i0dPFn/oqjK3/vPCcDeJvW5NQ83V8QbicfF1SupOaB0h8ntgBC2YiE7dfyctQ==}
    engines: {node: '>=4'}

  is-bun-module@2.0.0:
    resolution: {integrity: sha512-gNCGbnnnnFAUGKeZ9PdbyeGYJqewpmc2aKHUEMO5nQPWU9lOmv7jcmQIv+qHD8fXW6W7qfuCwX4rY9LNRjXrkQ==}

  is-callable@1.2.7:
    resolution: {integrity: sha512-1BC0BVFhS/p0qtw6enp8e+8OD0UrK0oFLztSjNzhcKA3WDuJxxAPXzPuPtKkjEY9UUoEWlX/8fgKeu2S8i9JTA==}
    engines: {node: '>= 0.4'}

  is-core-module@2.16.2:
    resolution: {integrity: sha512-evOr8xfXKxE6qSR0hSXL2r3sd7ALj8+7jQEUvPYcm5sgZFdJ+AYzT6yNmJenvIYQBgIGwfwz08sL8zoL7yq2BA==}
    engines: {node: '>= 0.4'}

  is-data-view@1.0.2:
    resolution: {integrity: sha512-RKtWF8pGmS87i2D6gqQu/l7EYRlVdfzemCJN/P3UOs//x1QE7mfhvzHIApBTRf7axvT6DMGwSwBXYCT0nfB9xw==}
    engines: {node: '>= 0.4'}

  is-date-object@1.1.0:
    resolution: {integrity: sha512-PwwhEakHVKTdRNVOw+/Gyh0+MzlCl4R6qKvkhuvLtPMggI1WAHt9sOwZxQLSGpUaDnrdyDsomoRgNnCfKNSXXg==}
    engines: {node: '>= 0.4'}

  is-document.all@1.0.0:
    resolution: {integrity: sha512-+XSoyS05OdBbhFuELhgTCpFNHkpBOJqtsZfUFFpe5QTw+9Sjbh8zitxhQkYAo6wV7e1Vb8cAPvpCk9jGam/82g==}
    engines: {node: '>= 0.4'}

  is-extglob@2.1.1:
    resolution: {integrity: sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==}
    engines: {node: '>=0.10.0'}

  is-finalizationregistry@1.1.1:
    resolution: {integrity: sha512-1pC6N8qWJbWoPtEjgcL2xyhQOP491EQjeUo3qTKcmV8YSDDJrOepfG8pcC7h/QgnQHYSv0mJ3Z/ZWxmatVrysg==}
    engines: {node: '>= 0.4'}

  is-fullwidth-code-point@3.0.0:
    resolution: {integrity: sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==}
    engines: {node: '>=8'}

  is-generator-function@1.1.2:
    resolution: {integrity: sha512-upqt1SkGkODW9tsGNG5mtXTXtECizwtS2kA161M+gJPc1xdb/Ax629af6YrTwcOeQHbewrPNlE5Dx7kzvXTizA==}
    engines: {node: '>= 0.4'}

  is-glob@4.0.3:
    resolution: {integrity: sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==}
    engines: {node: '>=0.10.0'}

  is-map@2.0.3:
    resolution: {integrity: sha512-1Qed0/Hr2m+YqxnM09CjA2d/i6YZNfF6R2oRAOj36eUdS6qIV/huPJNSEpKbupewFs+ZsJlxsjjPbc0/afW6Lw==}
    engines: {node: '>= 0.4'}

  is-negative-zero@2.0.3:
    resolution: {integrity: sha512-5KoIu2Ngpyek75jXodFvnafB6DJgr3u8uuK0LEZJjrU19DrMD3EVERaR8sjz8CCGgpZvxPl9SuE1GMVPFHx1mw==}
    engines: {node: '>= 0.4'}

  is-node-process@1.2.0:
    resolution: {integrity: sha512-Vg4o6/fqPxIjtxgUH5QLJhwZ7gW5diGCVlXpuUfELC62CuxM1iHcRe51f2W1FDy04Ai4KJkagKjx3XaqyfRKXw==}

  is-number-object@1.1.1:
    resolution: {integrity: sha512-lZhclumE1G6VYD8VHe35wFaIif+CTy5SJIi5+3y4psDgWu4wPDoBhF8NxUOinEc7pHgiTsT6MaBb92rKhhD+Xw==}
    engines: {node: '>= 0.4'}

  is-number@7.0.0:
    resolution: {integrity: sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==}
    engines: {node: '>=0.12.0'}

  is-regex@1.2.1:
    resolution: {integrity: sha512-MjYsKHO5O7mCsmRGxWcLWheFqN9DJ/2TmngvjKXihe6efViPqc274+Fx/4fYj/r03+ESvBdTXK0V6tA3rgez1g==}
    engines: {node: '>= 0.4'}

  is-set@2.0.3:
    resolution: {integrity: sha512-iPAjerrse27/ygGLxw+EBR9agv9Y6uLeYVJMu+QNCoouJ1/1ri0mGrcWpfCqFZuzzx3WjtwxG098X+n4OuRkPg==}
    engines: {node: '>= 0.4'}

  is-shared-array-buffer@1.0.4:
    resolution: {integrity: sha512-ISWac8drv4ZGfwKl5slpHG9OwPNty4jOWPRIhBpxOoD+hqITiwuipOQ2bNthAzwA3B4fIjO4Nln74N0S9byq8A==}
    engines: {node: '>= 0.4'}

  is-stream@2.0.1:
    resolution: {integrity: sha512-hFoiJiTl63nn+kstHGBtewWSKnQLpyb155KHheA1l39uvtO9nWIop1p3udqPcUd/xbF1VLMO4n7OI6p7RbngDg==}
    engines: {node: '>=8'}

  is-string@1.1.1:
    resolution: {integrity: sha512-BtEeSsoaQjlSPBemMQIrY1MY0uM6vnS1g5fmufYOtnxLGUZM2178PKbhsk7Ffv58IX+ZtcvoGwccYsh0PglkAA==}
    engines: {node: '>= 0.4'}

  is-symbol@1.1.1:
    resolution: {integrity: sha512-9gGx6GTtCQM73BgmHQXfDmLtfjjTUDSyoxTCbp5WtoixAhfgsDirWIcVQ/IHpvI5Vgd5i/J5F7B9cN/WlVbC/w==}
    engines: {node: '>= 0.4'}

  is-typed-array@1.1.15:
    resolution: {integrity: sha512-p3EcsicXjit7SaskXHs1hA91QxgTw46Fv6EFKKGS5DRFLD8yKnohjF3hxoju94b/OcMZoQukzpPpBE9uLVKzgQ==}
    engines: {node: '>= 0.4'}

  is-weakmap@2.0.2:
    resolution: {integrity: sha512-K5pXYOm9wqY1RgjpL3YTkF39tni1XajUIkawTLUo9EZEVUFga5gSQJF8nNS7ZwJQ02y+1YCNYcMh+HIf1ZqE+w==}
    engines: {node: '>= 0.4'}

  is-weakref@1.1.1:
    resolution: {integrity: sha512-6i9mGWSlqzNMEqpCp93KwRS1uUOodk2OJ6b+sq7ZPDSy2WuI5NFIxp/254TytR8ftefexkWn5xNiHUNpPOfSew==}
    engines: {node: '>= 0.4'}

  is-weakset@2.0.4:
    resolution: {integrity: sha512-mfcwb6IzQyOKTs84CQMrOwW4gQcaTOAWJ0zzJCl2WSPDrWk/OzDaImWFH3djXhb24g4eudZfLRozAvPGw4d9hQ==}
    engines: {node: '>= 0.4'}

  isarray@1.0.0:
    resolution: {integrity: sha512-VLghIWNM6ELQzo7zwmcg0NmTVyWKYjvIeM83yjp0wRDTmUnrM678fQbcKBo6n2CJEF0szoG//ytg+TKla89ALQ==}

  isarray@2.0.5:
    resolution: {integrity: sha512-xHjhDr3cNBK0BzdUJSPXZntQUx/mwMS5Rw4A7lPJ90XGAO6ISP/ePDNuo0vhqOZU+UD5JoodwCAAoZQd3FeAKw==}

  isexe@2.0.0:
    resolution: {integrity: sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==}

  iterator.prototype@1.1.5:
    resolution: {integrity: sha512-H0dkQoCa3b2VEeKQBOxFph+JAbcrQdE7KC0UkqwpLmv2EC4P41QXP+rqo9wYodACiG5/WM5s9oDApTU8utwj9g==}
    engines: {node: '>= 0.4'}

  jiti@1.21.7:
    resolution: {integrity: sha512-/imKNG4EbWNrVjoNC/1H5/9GFy+tqjGBHCaSsN+P2RnPqjsLmv6UD3Ej+Kj8nBWaRAwyk7kK5ZUc+OEatnTR3A==}
    hasBin: true

  jiti@2.7.0:
    resolution: {integrity: sha512-AC/7JofJvZGrrneWNaEnJeOLUx+JlGt7tNa0wZiRPT4MY1wmfKjt2+6O2p2uz2+skll8OZZmJMNqeke7kKbNgQ==}
    hasBin: true

  jose@5.10.0:
    resolution: {integrity: sha512-s+3Al/p9g32Iq+oqXxkW//7jk2Vig6FF1CFqzVXoTUXt2qz89YWbL+OwS17NFYEvxC35n0FKeGO2LGYSxeM2Gg==}

  js-tokens@4.0.0:
    resolution: {integrity: sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==}

  js-yaml@4.3.0:
    resolution: {integrity: sha512-1td788aAnnZ5qs7V2QIRl1owjtYpbKt749Y3xauqQgwIIGF/xXWz1wMTEBx5O3LK3lXLVuqXPdPxj2BoFHaW9Q==}
    hasBin: true

  json-buffer@3.0.1:
    resolution: {integrity: sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==}

  json-schema-traverse@0.4.1:
    resolution: {integrity: sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg==}

  json-stable-stringify-without-jsonify@1.0.1:
    resolution: {integrity: sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw==}

  json5@1.0.2:
    resolution: {integrity: sha512-g1MWMLBiz8FKi1e4w0UyVL3w+iJceWAFBAaBnnGKOpNa5f8TLktkbre1+s6oICydWAm+HRUGTmI+//xv2hvXYA==}
    hasBin: true

  jsx-ast-utils@3.3.5:
    resolution: {integrity: sha512-ZZow9HBI5O6EPgSJLUb8n2NKgmVWTwCvHGwFuJlMjvLFqlGG6pjirPhtdsseaLZjSibD8eegzmYpUZwoIlj2cQ==}
    engines: {node: '>=4.0'}

  jszip@3.10.1:
    resolution: {integrity: sha512-xXDvecyTpGLrqFrvkrUSoxxfJI5AH7U8zxxtVclpsUtMCq4JQ290LY8AW5c7Ggnr/Y/oK+bQMbqK2qmtk3pN4g==}

  keyv@4.5.4:
    resolution: {integrity: sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==}

  language-subtag-registry@0.3.23:
    resolution: {integrity: sha512-0K65Lea881pHotoGEa5gDlMxt3pctLi2RplBb7Ezh4rRdLEOtgi7n4EwK9lamnUCkKBqaeKRVebTq6BAxSkpXQ==}

  language-tags@1.0.9:
    resolution: {integrity: sha512-MbjN408fEndfiQXbFQ1vnd+1NoLDsnQW41410oQBXiyXDMYH5z505juWa4KUE1LqxRC7DgOgZDbKLxHIwm27hA==}
    engines: {node: '>=0.10'}

  lazystream@1.0.1:
    resolution: {integrity: sha512-b94GiNHQNy6JNTrt5w6zNyffMrNkXZb3KTkCZJb2V1xaEGCk093vkZ2jk3tpaeP33/OiXC+WvK9AxUebnf5nbw==}
    engines: {node: '>= 0.6.3'}

  levn@0.4.1:
    resolution: {integrity: sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ==}
    engines: {node: '>= 0.8.0'}

  lie@3.3.0:
    resolution: {integrity: sha512-UaiMJzeWRlEujzAuw5LokY1L5ecNQYZKfmyZ9L7wDHb/p5etKaxXhohBcrw0EYby+G/NA52vRSN4N39dxHAIwQ==}

  lilconfig@3.1.3:
    resolution: {integrity: sha512-/vlFKAoH5Cgt3Ie+JLhRbwOsCQePABiU3tJ1egGvyQ+33R/vcwM2Zl2QR/LzjsBeItPt3oSVXapn+m4nQDvpzw==}
    engines: {node: '>=14'}

  lines-and-columns@1.2.4:
    resolution: {integrity: sha512-7ylylesZQ/PV29jhEDl3Ufjo6ZX7gCqJr5F7PKrqc93v7fzSymt1BpwEU8nAUXs8qzzvqhbjhK5QZg6Mt/HkBg==}

  listenercount@1.0.1:
    resolution: {integrity: sha512-3mk/Zag0+IJxeDrxSgaDPy4zZ3w05PRZeJNnlWhzFz5OkX49J4krc+A8X2d2M69vGMBEX0uyl8M+W+8gH+kBqQ==}

  locate-path@5.0.0:
    resolution: {integrity: sha512-t7hw9pI+WvuwNJXwk5zVHpyhIqzg2qTlklJOf0mVxGSbe3Fp2VieZcduNYjaLDoy6p9uGpQEGWG87WpMKlNq8g==}
    engines: {node: '>=8'}

  locate-path@6.0.0:
    resolution: {integrity: sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw==}
    engines: {node: '>=10'}

  lodash.defaults@4.2.0:
    resolution: {integrity: sha512-qjxPLHd3r5DnsdGacqOMU6pb/avJzdh9tFX2ymgoZE27BmjXrNy/y4LoaiTeAb+O3gL8AfpJGtqfX/ae2leYYQ==}

  lodash.difference@4.5.0:
    resolution: {integrity: sha512-dS2j+W26TQ7taQBGN8Lbbq04ssV3emRw4NY58WErlTO29pIqS0HmoT5aJ9+TUQ1N3G+JOZSji4eugsWwGp9yPA==}

  lodash.escaperegexp@4.1.2:
    resolution: {integrity: sha512-TM9YBvyC84ZxE3rgfefxUWiQKLilstD6k7PTGt6wfbtXF8ixIJLOL3VYyV/z+ZiPLsVxAsKAFVwWlWeb2Y8Yyw==}

  lodash.flatten@4.4.0:
    resolution: {integrity: sha512-C5N2Z3DgnnKr0LOpv/hKCgKdb7ZZwafIrsesve6lmzvZIRZRGaZ/l6Q8+2W7NaT+ZwO3fFlSCzCzrDCFdJfZ4g==}

  lodash.groupby@4.6.0:
    resolution: {integrity: sha512-5dcWxm23+VAoz+awKmBaiBvzox8+RqMgFhi7UvX9DHZr2HdxHXM/Wrf8cfKpsW37RNrvtPn6hSwNqurSILbmJw==}

  lodash.isboolean@3.0.3:
    resolution: {integrity: sha512-Bz5mupy2SVbPHURB98VAcw+aHh4vRV5IPNhILUCsOzRmsTmSQ17jIuqopAentWoehktxGd9e/hbIXq980/1QJg==}

  lodash.isequal@4.5.0:
    resolution: {integrity: sha512-pDo3lu8Jhfjqls6GkMgpahsF9kCyayhgykjyLMNFTKWrpVdAQtYyB4muAMWozBB4ig/dtWAmsMxLEI8wuz+DYQ==}
    deprecated: This package is deprecated. Use require('node:util').isDeepStrictEqual instead.

  lodash.isfunction@3.0.9:
    resolution: {integrity: sha512-AirXNj15uRIMMPihnkInB4i3NHeb4iBtNg9WRWuK2o31S+ePwwNmDPaTL3o7dTJ+VXNZim7rFs4rxN4YU1oUJw==}

  lodash.isnil@4.0.0:
    resolution: {integrity: sha512-up2Mzq3545mwVnMhTDMdfoG1OurpA/s5t88JmQX809eH3C8491iu2sfKhTfhQtKY78oPNhiaHJUpT/dUDAAtng==}

  lodash.isplainobject@4.0.6:
    resolution: {integrity: sha512-oSXzaWypCMHkPC3NvBEaPHf0KsA5mvPrOPgQWDsbg8n7orZ290M0BmC/jgRZ4vcJ6DTAhjrsSYgdsW/F+MFOBA==}

  lodash.isundefined@3.0.1:
    resolution: {integrity: sha512-MXB1is3s899/cD8jheYYE2V9qTHwKvt+npCwpD+1Sxm3Q3cECXCiYHjeHWXNwr6Q0SOBPrYUDxendrO6goVTEA==}

  lodash.merge@4.6.2:
    resolution: {integrity: sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ==}

  lodash.union@4.6.0:
    resolution: {integrity: sha512-c4pB2CdGrGdjMKYLA+XiRDO7Y0PRQbm/Gzg8qMj+QH+pFVAoTp5sBpO0odL3FjoPCGjK96p6qsP+yQoiLoOBcw==}

  lodash.uniq@4.5.0:
    resolution: {integrity: sha512-xfBaXQd9ryd9dlSDvnvI0lvxfLJlYAZzXomUYzLKtUeOQvOP5piqAWuGtrhWeqaXK9hhoM/iyJc5AV+XfsX3HQ==}

  loose-envify@1.4.0:
    resolution: {integrity: sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q==}
    hasBin: true

  lucide-react@0.468.0:
    resolution: {integrity: sha512-6koYRhnM2N0GGZIdXzSeiNwguv1gt/FAjZOiPl76roBi3xKEXa4WmfpxgQwTTL4KipXjefrnf3oV4IsYhi4JFA==}
    peerDependencies:
      react: ^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0-rc

  math-intrinsics@1.1.0:
    resolution: {integrity: sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==}
    engines: {node: '>= 0.4'}

  merge-stream@2.0.0:
    resolution: {integrity: sha512-abv/qOcuPfk3URPfDzmZU1LKmuw8kT+0nIHvKrKgFrwifol/doWcdA4ZqsWQ8ENrFKkd67Mfpo/LovbIUsbt3w==}

  merge2@1.4.1:
    resolution: {integrity: sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg==}
    engines: {node: '>= 8'}

  micromatch@4.0.8:
    resolution: {integrity: sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA==}
    engines: {node: '>=8.6'}

  mimic-fn@2.1.0:
    resolution: {integrity: sha512-OqbOk5oEQeAZ8WXWydlu9HJjz9WVdEIvamMCcXmuqUYjTknH/sqsWvhQ3vgwKFRR1HpjvNBKQ37nbJgYzGqGcg==}
    engines: {node: '>=6'}

  minimatch@10.2.5:
    resolution: {integrity: sha512-MULkVLfKGYDFYejP07QOurDLLQpcjk7Fw+7jXS2R2czRQzR56yHRveU5NDJEOviH+hETZKSkIk5c+T23GjFUMg==}
    engines: {node: 18 || 20 || >=22}

  minimatch@3.1.5:
    resolution: {integrity: sha512-VgjWUsnnT6n+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8+jVzaeNt94ssEEl4w==}

  minimatch@5.1.9:
    resolution: {integrity: sha512-7o1wEA2RyMP7Iu7GNba9vc0RWWGACJOCZBJX2GJWip0ikV+wcOsgVuY9uE8CPiyQhkGFSlhuSkZPavN7u1c2Fw==}
    engines: {node: '>=10'}

  minimist@1.2.8:
    resolution: {integrity: sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA==}

  mkdirp@0.5.6:
    resolution: {integrity: sha512-FP+p8RB8OWpF3YZBCrP5gtADmtXApB5AMLn+vdyA+PyxCjrCs00mjyUozssO33cwDeT3wNGdLxJ5M//YqtHAJw==}
    hasBin: true

  ms@2.1.3:
    resolution: {integrity: sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==}

  mz@2.7.0:
    resolution: {integrity: sha512-z81GNO7nnYMEhrGh9LeymoE4+Yr0Wn5McHIZMK5cfQCl+NDX08sCZgUc9/6MHni9IWuFLm1Z3HTCXu2z9fN62Q==}

  nanoid@3.3.15:
    resolution: {integrity: sha512-y7Wygv/7mEOvxTuEQDB8StXdMRBWf1kR/tlhAzBRUFkB2jfcLOAxO/SHmOO2zgz1pVgK29/kyupn059/bCHdjA==}
    engines: {node: ^10 || ^12 || ^13.7 || ^14 || >=15.0.1}
    hasBin: true

  napi-postinstall@0.3.4:
    resolution: {integrity: sha512-PHI5f1O0EP5xJ9gQmFGMS6IZcrVvTjpXjz7Na41gTE7eE2hK11lg04CECCYEEjdc17EV4DO+fkGEtt7TpTaTiQ==}
    engines: {node: ^12.20.0 || ^14.18.0 || >=16.0.0}
    hasBin: true

  natural-compare@1.4.0:
    resolution: {integrity: sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==}

  next-themes@0.4.6:
    resolution: {integrity: sha512-pZvgD5L0IEvX5/9GWyHMf3m8BKiVQwsCMHfoFosXtXBMnaS0ZnIJ9ST4b4NqLVKDEm8QBxoNNGNaBv2JNF6XNA==}
    peerDependencies:
      react: ^16.8 || ^17 || ^18 || ^19 || ^19.0.0-rc
      react-dom: ^16.8 || ^17 || ^18 || ^19 || ^19.0.0-rc

  next@15.5.20:
    resolution: {integrity: sha512-cvyS3/geydan1xLtE3FA8VCgdoQ/Gg/dlOldFkFCbB5VcVYJV7090hQLBnvTW2PwT76Z/dHdzDZCsVhZpoOlUA==}
    engines: {node: ^18.18.0 || ^19.8.0 || >= 20.0.0}
    hasBin: true
    peerDependencies:
      '@opentelemetry/api': ^1.1.0
      '@playwright/test': ^1.51.1
      babel-plugin-react-compiler: '*'
      react: ^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0
      react-dom: ^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0
      sass: ^1.3.0
    peerDependenciesMeta:
      '@opentelemetry/api':
        optional: true
      '@playwright/test':
        optional: true
      babel-plugin-react-compiler:
        optional: true
      sass:
        optional: true

  node-exports-info@1.6.2:
    resolution: {integrity: sha512-kXs9Go0cah0qHVV2v389IXQLdLCeE1xfFtjOAF+iobu0OIoG1pje8At2vMHyaPMiPMnG/LWP50twML21eMcAag==}
    engines: {node: '>= 0.4'}

  node-fetch-native@1.6.7:
    resolution: {integrity: sha512-g9yhqoedzIUm0nTnTqAQvueMPVOuIY16bqgAJJC8XOOubYFNwz6IER9qs0Gq2Xd0+CecCKFjtdDTMA4u4xG06Q==}

  node-releases@2.0.50:
    resolution: {integrity: sha512-J6l92tKHX6w8Jy5nO1Vuc01NoIiRGi/d6qBKVxh+IQ8Cr3b6HbVNfKiF8ZpFKufTwpwxMmce2W3iQZ861ZRyTg==}
    engines: {node: '>=18'}

  normalize-path@3.0.0:
    resolution: {integrity: sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA==}
    engines: {node: '>=0.10.0'}

  npm-run-path@4.0.1:
    resolution: {integrity: sha512-S48WzZW777zhNIrn7gxOlISNAqi9ZC/uQFnRdbeIHhZhCA6UqpkOT8T1G7BvfdgP4Er8gF4sUbaS0i7QvIfCWw==}
    engines: {node: '>=8'}

  nypm@0.6.8:
    resolution: {integrity: sha512-Q9K4Diu6l5u6xJQogeFSs/zKtyMSgFKFtRQV+tHP4kL7KPm2grpBU0dFIwFaXwNxN0MtfKWc43VpCugAa+LPsw==}
    engines: {node: '>=18'}
    hasBin: true

  object-assign@4.1.1:
    resolution: {integrity: sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==}
    engines: {node: '>=0.10.0'}

  object-hash@3.0.0:
    resolution: {integrity: sha512-RSn9F68PjH9HqtltsSnqYC1XXoWe9Bju5+213R98cNGttag9q9yAOTzdbsqvIa7aNm5WffBZFpWYr2aWrklWAw==}
    engines: {node: '>= 6'}

  object-inspect@1.13.4:
    resolution: {integrity: sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==}
    engines: {node: '>= 0.4'}

  object-keys@1.1.1:
    resolution: {integrity: sha512-NuAESUOUMrlIXOfHKzD6bpPu3tYt3xvjNdRIQ+FeT0lNb4K8WR70CaDxhuNguS2XG+GjkyMwOzsN5ZktImfhLA==}
    engines: {node: '>= 0.4'}

  object.assign@4.1.7:
    resolution: {integrity: sha512-nK28WOo+QIjBkDduTINE4JkF/UJJKyf2EJxvJKfblDpyg0Q+pkOHNTL0Qwy6NP6FhE/EnzV73BxxqcJaXY9anw==}
    engines: {node: '>= 0.4'}

  object.entries@1.1.9:
    resolution: {integrity: sha512-8u/hfXFRBD1O0hPUjioLhoWFHRmt6tKA4/vZPyckBr18l1KE9uHrFaFaUi8MDRTpi4uak2goyPTSNJLXX2k2Hw==}
    engines: {node: '>= 0.4'}

  object.fromentries@2.0.8:
    resolution: {integrity: sha512-k6E21FzySsSK5a21KRADBd/NGneRegFO5pLHfdQLpRDETUNJueLXs3WCzyQ3tFRDYgbq3KHGXfTbi2bs8WQ6rQ==}
    engines: {node: '>= 0.4'}

  object.groupby@1.0.3:
    resolution: {integrity: sha512-+Lhy3TQTuzXI5hevh8sBGqbmurHbbIjAi0Z4S63nthVLmLxfbj4T54a4CfZrXIrt9iP4mVAPYMo/v99taj3wjQ==}
    engines: {node: '>= 0.4'}

  object.values@1.2.1:
    resolution: {integrity: sha512-gXah6aZrcUxjWg2zR2MwouP2eHlCBzdV4pygudehaKXSGW4v2AsRQUK+lwwXhii6KFZcunEnmSUoYp5CXibxtA==}
    engines: {node: '>= 0.4'}

  ohash@2.0.11:
    resolution: {integrity: sha512-RdR9FQrFwNBNXAr4GixM8YaRZRJ5PUWbKYbE5eOsrwAjJW0q2REGcf79oYPsLyskQCZG1PLN+S/K1V00joZAoQ==}

  once@1.4.0:
    resolution: {integrity: sha512-lNaJgI+2Q5URQBkccEKHTQOPaXdUxnZZElQTZY0MFUAuaEqe1E+Nyvgdz/aIyNi6Z9MzO5dv1H8n58/GELp3+w==}

  onetime@5.1.2:
    resolution: {integrity: sha512-kbpaSSGJTWdAY5KPVeMOKXSrPtr8C8C7wodJbcsd51jRnmD+GZu8Y0VoU6Dm5Z4vWr0Ig/1NKuWRKf7j5aaYSg==}
    engines: {node: '>=6'}

  optionator@0.9.4:
    resolution: {integrity: sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g==}
    engines: {node: '>= 0.8.0'}

  os-paths@4.4.0:
    resolution: {integrity: sha512-wrAwOeXp1RRMFfQY8Sy7VaGVmPocaLwSFOYCGKSyo8qmJ+/yaafCl5BCA1IQZWqFSRBrKDYFeR9d/VyQzfH/jg==}
    engines: {node: '>= 6.0'}

  own-keys@1.0.1:
    resolution: {integrity: sha512-qFOyK5PjiWZd+QQIh+1jhdb9LpxTF0qs7Pm8o5QHYZ0M3vKqSqzsZaEB6oWlxZ+q2sJBMI/Ktgd2N5ZwQoRHfg==}
    engines: {node: '>= 0.4'}

  p-limit@2.3.0:
    resolution: {integrity: sha512-//88mFWSJx8lxCzwdAABTJL2MyWB12+eIY7MDL2SqLmAkeKU9qxRvWuSyTjm3FUmpBEMuFfckAIqEaVGUDxb6w==}
    engines: {node: '>=6'}

  p-limit@3.1.0:
    resolution: {integrity: sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==}
    engines: {node: '>=10'}

  p-locate@4.1.0:
    resolution: {integrity: sha512-R79ZZ/0wAxKGu3oYMlz8jy/kbhsNrS7SKZ7PxEHBgJ5+F2mtFW2fK2cOtBh1cHYkQsbzFV7I+EoRKe6Yt0oK7A==}
    engines: {node: '>=8'}

  p-locate@5.0.0:
    resolution: {integrity: sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw==}
    engines: {node: '>=10'}

  p-try@2.2.0:
    resolution: {integrity: sha512-R4nPAVTAU0B9D35/Gk3uJf/7XYbQcyohSKdvAxIRSNghFl4e71hVoGnBNQz9cWaXxO2I10KTC+3jMdvvoKw6dQ==}
    engines: {node: '>=6'}

  pako@1.0.11:
    resolution: {integrity: sha512-4hLB8Py4zZce5s4yd9XzopqwVv/yGNhV1Bl8NTmCq1763HeK2+EwVTv+leGeL13Dnh2wfbqowVPXCIO0z4taYw==}

  parent-module@1.0.1:
    resolution: {integrity: sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g==}
    engines: {node: '>=6'}

  path-exists@4.0.0:
    resolution: {integrity: sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==}
    engines: {node: '>=8'}

  path-is-absolute@1.0.1:
    resolution: {integrity: sha512-AVbw3UJ2e9bq64vSaS9Am0fje1Pa8pbGqTTsmXfaIiMpnr5DlDhfJOuLj9Sf95ZPVDAUerDfEk88MPmPe7UCQg==}
    engines: {node: '>=0.10.0'}

  path-key@3.1.1:
    resolution: {integrity: sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==}
    engines: {node: '>=8'}

  path-parse@1.0.7:
    resolution: {integrity: sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw==}

  pathe@2.0.3:
    resolution: {integrity: sha512-WUjGcAqP1gQacoQe+OBJsFA7Ld4DyXuUIjZ5cc75cLHvJ7dtNsTugphxIADwspS+AraAUePCKrSVtPLFj/F88w==}

  perfect-debounce@1.0.0:
    resolution: {integrity: sha512-xCy9V055GLEqoFaHoC1SoLIaLmWctgCUaBaWxDZ7/Zx4CTyX7cJQLJOok/orfjZAh9kEYpjJa4d0KcJmCbctZA==}

  picocolors@1.1.1:
    resolution: {integrity: sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==}

  picomatch@2.3.2:
    resolution: {integrity: sha512-V7+vQEJ06Z+c5tSye8S+nHUfI51xoXIXjHQ99cQtKUkQqqO1kO/KCJUfZXuB47h/YBlDhah2H3hdUGXn8ie0oA==}
    engines: {node: '>=8.6'}

  picomatch@4.0.5:
    resolution: {integrity: sha512-RvwwcruNjI1ncT5xRakeyS9Lf8lcItv34KD+aif+VH9kduAyfYBipGh12274xtenIPZ119/R9BdTBa8gAwSh0A==}
    engines: {node: '>=12'}

  pify@2.3.0:
    resolution: {integrity: sha512-udgsAY+fTnvv7kI7aaxbqwWNb0AHiB0qBO89PZKPkoTmGOgdbrHDKD+0B2X4uTfJ/FT1R09r9gTsjUjNJotuog==}
    engines: {node: '>=0.10.0'}

  pirates@4.0.7:
    resolution: {integrity: sha512-TfySrs/5nm8fQJDcBDuUng3VOUKsd7S+zqvbOTiGXHfxX4wK31ard+hoNuvkicM/2YFzlpDgABOevKSsB4G/FA==}
    engines: {node: '>= 6'}

  pkg-types@2.3.1:
    resolution: {integrity: sha512-y+ichcgc2LrADuhLNAx8DFjVfgz91pRxfZdI3UDhxHvcVEZsenLO+7XaU5vOp0u/7V/wZ+plyuQxtrDlZJ+yeg==}

  pngjs@5.0.0:
    resolution: {integrity: sha512-40QW5YalBNfQo5yRYmiw7Yz6TKKVr3h6970B2YE+3fQpsWcrbj1PzJgxeJ19DRQjhMbKPIuMY8rFaXc8moolVw==}
    engines: {node: '>=10.13.0'}

  possible-typed-array-names@1.1.0:
    resolution: {integrity: sha512-/+5VFTchJDoVj3bhoqi6UeymcD00DAwb1nJwamzPvHEszJ4FpF6SNNbUbOS8yI56qHzdV8eK0qEfOSiodkTdxg==}
    engines: {node: '>= 0.4'}

  postcss-import@15.1.0:
    resolution: {integrity: sha512-hpr+J05B2FVYUAXHeK1YyI267J/dDDhMU6B6civm8hSY1jYJnBXxzKDKDswzJmtLHryrjhnDjqqp/49t8FALew==}
    engines: {node: '>=14.0.0'}
    peerDependencies:
      postcss: ^8.0.0

  postcss-js@4.1.0:
    resolution: {integrity: sha512-oIAOTqgIo7q2EOwbhb8UalYePMvYoIeRY2YKntdpFQXNosSu3vLrniGgmH9OKs/qAkfoj5oB3le/7mINW1LCfw==}
    engines: {node: ^12 || ^14 || >= 16}
    peerDependencies:
      postcss: ^8.4.21

  postcss-load-config@6.0.1:
    resolution: {integrity: sha512-oPtTM4oerL+UXmx+93ytZVN82RrlY/wPUV8IeDxFrzIjXOLF1pN+EmKPLbubvKHT2HC20xXsCAH2Z+CKV6Oz/g==}
    engines: {node: '>= 18'}
    peerDependencies:
      jiti: '>=1.21.0'
      postcss: '>=8.0.9'
      tsx: ^4.8.1
      yaml: ^2.4.2
    peerDependenciesMeta:
      jiti:
        optional: true
      postcss:
        optional: true
      tsx:
        optional: true
      yaml:
        optional: true

  postcss-nested@6.2.0:
    resolution: {integrity: sha512-HQbt28KulC5AJzG+cZtj9kvKB93CFCdLvog1WFLf1D+xmMvPGlBstkpTEZfK5+AN9hfJocyBFCNiqyS48bpgzQ==}
    engines: {node: '>=12.0'}
    peerDependencies:
      postcss: ^8.2.14

  postcss-selector-parser@6.1.4:
    resolution: {integrity: sha512-bIoJLOmjCO1S9XdY/DcnR5hJxvrDir1PbGChrzXG3vw0/FOliy/fA3dmdhQ441kah4gKv+TwckGzex6wNS5cnQ==}
    engines: {node: '>=4'}

  postcss-value-parser@4.2.0:
    resolution: {integrity: sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ==}

  postcss@8.4.31:
    resolution: {integrity: sha512-PS08Iboia9mts/2ygV3eLpY5ghnUcfLV/EXTOW1E2qYxJKGGBUtNjN76FYHnMs36RmARn41bC0AZmn+rR0OVpQ==}
    engines: {node: ^10 || ^12 || >=14}

  postcss@8.5.16:
    resolution: {integrity: sha512-vuwillviilfKZsg0VGj5R/YwwcHx4SLsIOI/7K6mQkWx+l5cUHTjj5g0AasTBcyXsbfTgrwsUNmVUb5xVwyPwg==}
    engines: {node: ^10 || ^12 || >=14}

  prelude-ls@1.2.1:
    resolution: {integrity: sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g==}
    engines: {node: '>= 0.8.0'}

  prisma@6.19.3:
    resolution: {integrity: sha512-++ZJ0ijLrDJF6hNB4t4uxg2br3fC4H9Yc9tcbjr2fcNFP3rh/SBNrAgjhsqBU4Ght8JPrVofG/ZkXfnSfnYsFg==}
    engines: {node: '>=18.18'}
    hasBin: true
    peerDependencies:
      typescript: '>=5.1.0'
    peerDependenciesMeta:
      typescript:
        optional: true

  process-nextick-args@2.0.1:
    resolution: {integrity: sha512-3ouUOpQhtgrbOa17J7+uxOTpITYWaGP7/AhoR3+A+/1e9skrzelGi/dXzEYyvbxubEF6Wn2ypscTKiKJFFn1ag==}

  prop-types@15.8.1:
    resolution: {integrity: sha512-oj87CgZICdulUohogVAR7AjlC0327U4el4L6eAvOqCeudMDVU0NThNaV+b9Df4dXgSP1gXMTnPdhfe/2qDH5cg==}

  punycode@2.3.1:
    resolution: {integrity: sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==}
    engines: {node: '>=6'}

  pure-rand@6.1.0:
    resolution: {integrity: sha512-bVWawvoZoBYpp6yIoQtQXHZjmz35RSVHnUOTefl8Vcjr8snTPY1wnpSPMWekcFwbxI6gtmT7rSYPFvz71ldiOA==}

  qrcode@1.5.4:
    resolution: {integrity: sha512-1ca71Zgiu6ORjHqFBDpnSMTR2ReToX4l1Au1VFLyVeBTFavzQnv5JxMFr3ukHVKpSrSA2MCk0lNJSykjUfz7Zg==}
    engines: {node: '>=10.13.0'}
    hasBin: true

  queue-microtask@1.2.3:
    resolution: {integrity: sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A==}

  rc9@2.1.2:
    resolution: {integrity: sha512-btXCnMmRIBINM2LDZoEmOogIZU7Qe7zn4BpomSKZ/ykbLObuBdvG+mFq11DL6fjH1DRwHhrlgtYWG96bJiC7Cg==}

  react-dom@19.2.7:
    resolution: {integrity: sha512-t0BRVXvbiE/o20Hfw669rLbMCDWtYZLvmJigy2f0MxsXF+71pxhR3xOkspmsO8h3ZlNzyibAmtCa3l4lYKk6gQ==}
    peerDependencies:
      react: ^19.2.7

  react-is@16.13.1:
    resolution: {integrity: sha512-24e6ynE2H+OKt4kqsOvNd8kBpV65zoxbA4BVsEOB3ARVWQki/DHzaUoC5KuON/BiccDaCCTZBuOcfZs70kR8bQ==}

  react@19.2.7:
    resolution: {integrity: sha512-HNe9WslTbXmFK8o8cmwgAeJFSBvt1bPdHCVKtaaV+WlAN36mpT4hcRpwbf3fY56ar2oIXzsBpOAiIRHAdY0OlQ==}
    engines: {node: '>=0.10.0'}

  read-cache@1.0.0:
    resolution: {integrity: sha512-Owdv/Ft7IjOgm/i0xvNDZ1LrRANRfew4b2prF3OWMQLxLfu3bS8FVhCsrSCMK4lR56Y9ya+AThoTpDCTxCmpRA==}

  readable-stream@2.3.8:
    resolution: {integrity: sha512-8p0AUk4XODgIewSi0l8Epjs+EVnWiK7NoDIEGU0HhE7+ZyY8D1IMY7odu5lRrFXGg71L15KG8QrPmum45RTtdA==}

  readable-stream@3.6.2:
    resolution: {integrity: sha512-9u/sniCrY3D5WdsERHzHE4G2YCXqoG5FTHUiCC4SIbr6XcLZBY05ya9EKjYek9O5xOAwjGq+1JdGBAS7Q9ScoA==}
    engines: {node: '>= 6'}

  readdir-glob@1.1.3:
    resolution: {integrity: sha512-v05I2k7xN8zXvPD9N+z/uhXPaj0sUFCe2rcWZIpBsqxfP7xXFQ0tipAd/wjj1YxWyWtUS5IDJpOG82JKt2EAVA==}

  readdirp@3.6.0:
    resolution: {integrity: sha512-hOS089on8RduqdbhvQ5Z37A0ESjsqz6qnRcffsMU3495FuTdqSm+7bhJ29JvIOsBDEEnan5DPu9t3To9VRlMzA==}
    engines: {node: '>=8.10.0'}

  readdirp@4.1.2:
    resolution: {integrity: sha512-GDhwkLfywWL2s6vEjyhri+eXmfH6j1L7JE27WhqLeYzoh/A3DBaYGEj2H/HFZCn/kMfim73FXxEJTw06WtxQwg==}
    engines: {node: '>= 14.18.0'}

  reflect.getprototypeof@1.0.10:
    resolution: {integrity: sha512-00o4I+DVrefhv+nX0ulyi3biSHCPDe+yLv5o/p6d/UVlirijB8E16FtfwSAi4g3tcqrQ4lRAqQSoFEZJehYEcw==}
    engines: {node: '>= 0.4'}

  regexp.prototype.flags@1.5.4:
    resolution: {integrity: sha512-dYqgNSZbDwkaJ2ceRd9ojCGjBq+mOm9LmtXnAnEGyHhN/5R7iDW2TRw3h+o/jCFxus3P2LfWIIiwowAjANm7IA==}
    engines: {node: '>= 0.4'}

  require-directory@2.1.1:
    resolution: {integrity: sha512-fGxEI7+wsG9xrvdjsrlmL22OMTTiHRwAMroiEeMgq8gzoLC/PQr7RsRDSTLUg/bZAZtF+TVIkHc6/4RIKrui+Q==}
    engines: {node: '>=0.10.0'}

  require-main-filename@2.0.0:
    resolution: {integrity: sha512-NKN5kMDylKuldxYLSUfrbo5Tuzh4hd+2E8NPPX02mZtn1VuREQToYe/ZdlJy+J3uCpfaiGF05e7B8W0iXbQHmg==}

  resolve-from@4.0.0:
    resolution: {integrity: sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g==}
    engines: {node: '>=4'}

  resolve-pkg-maps@1.0.0:
    resolution: {integrity: sha512-seS2Tj26TBVOC2NIc2rOe2y2ZO7efxITtLZcGSOnHHNOQ7CkiUBfw0Iw2ck6xkIhPwLhKNLS8BO+hEpngQlqzw==}

  resolve@1.22.12:
    resolution: {integrity: sha512-TyeJ1zif53BPfHootBGwPRYT1RUt6oGWsaQr8UyZW/eAm9bKoijtvruSDEmZHm92CwS9nj7/fWttqPCgzep8CA==}
    engines: {node: '>= 0.4'}
    hasBin: true

  resolve@2.0.0-next.7:
    resolution: {integrity: sha512-tqt+NBWwyaMgw3zDsnygx4CByWjQEJHOPMdslYhppaQSJUtL/D4JO9CcBBlhPoI8lz9oJIDXkwXfhF4aWqP8xQ==}
    engines: {node: '>= 0.4'}
    hasBin: true

  retry@0.13.1:
    resolution: {integrity: sha512-XQBQ3I8W1Cge0Seh+6gjj03LbmRFWuoszgK9ooCpwYIrhhoO80pfq4cUkU5DkknwfOfFteRwlZ56PYOGYyFWdg==}
    engines: {node: '>= 4'}

  reusify@1.1.0:
    resolution: {integrity: sha512-g6QUff04oZpHs0eG5p83rFLhHeV00ug/Yf9nZM6fLeUrPguBTkTQOdpAWWspMh55TZfVQDPaN3NQJfbVRAxdIw==}
    engines: {iojs: '>=1.0.0', node: '>=0.10.0'}

  rimraf@2.7.1:
    resolution: {integrity: sha512-uWjbaKIK3T1OSVptzX7Nl6PvQ3qAGtKEtVRjRuazjfL3Bx5eI409VZSqgND+4UNnmzLVdPj9FqFJNPqBZFve4w==}
    deprecated: Rimraf versions prior to v4 are no longer supported
    hasBin: true

  run-parallel@1.2.0:
    resolution: {integrity: sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA==}

  safe-array-concat@1.1.4:
    resolution: {integrity: sha512-wtZlHyOje6OZTGqAoaDKxFkgRtkF9CnHAVnCHKfuj200wAgL+bSJhdsCD2l0Qx/2ekEXjPWcyKkfGb5CPboslg==}
    engines: {node: '>=0.4'}

  safe-buffer@5.1.2:
    resolution: {integrity: sha512-Gd2UZBJDkXlY7GbJxfsE8/nvKkUEU1G38c1siN6QP6a9PT9MmHB8GnpscSmMJSoF8LOIrt8ud/wPtojys4G6+g==}

  safe-buffer@5.2.1:
    resolution: {integrity: sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==}

  safe-push-apply@1.0.0:
    resolution: {integrity: sha512-iKE9w/Z7xCzUMIZqdBsp6pEQvwuEebH4vdpjcDWnyzaI6yl6O9FHvVpmGelvEHNsoY6wGblkxR6Zty/h00WiSA==}
    engines: {node: '>= 0.4'}

  safe-regex-test@1.1.0:
    resolution: {integrity: sha512-x/+Cz4YrimQxQccJf5mKEbIa1NzeCRNI5Ecl/ekmlYaampdNLPalVyIcCZNNH3MvmqBugV5TMYZXv0ljslUlaw==}
    engines: {node: '>= 0.4'}

  saxes@5.0.1:
    resolution: {integrity: sha512-5LBh1Tls8c9xgGjw3QrMwETmTMVk0oFgvrFSvWx62llR2hcEInrKNZ2GZCCuuy2lvWrdl5jhbpeqc5hRYKFOcw==}
    engines: {node: '>=10'}

  scheduler@0.27.0:
    resolution: {integrity: sha512-eNv+WrVbKu1f3vbYJT/xtiF5syA5HPIMtf9IgY/nKg0sWqzAUEvqY/xm7OcZc/qafLx/iO9FgOmeSAp4v5ti/Q==}

  semver@6.3.1:
    resolution: {integrity: sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==}
    hasBin: true

  semver@7.8.5:
    resolution: {integrity: sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==}
    engines: {node: '>=10'}
    hasBin: true

  set-blocking@2.0.0:
    resolution: {integrity: sha512-KiKBS8AnWGEyLzofFfmvKwpdPzqiy16LvQfK3yv/fVH7Bj13/wl3JSR1J+rfgRE9q7xUJK4qvgS8raSOeLUehw==}

  set-function-length@1.2.2:
    resolution: {integrity: sha512-pgRc4hJ4/sNjWCSS9AmnS40x3bNMDTknHgL5UaMBTMyJnU90EgWh1Rz+MC9eFu4BuN/UwZjKQuY/1v3rM7HMfg==}
    engines: {node: '>= 0.4'}

  set-function-name@2.0.2:
    resolution: {integrity: sha512-7PGFlmtwsEADb0WYyvCMa1t+yke6daIG4Wirafur5kcf+MhUnPms1UeR0CKQdTZD81yESwMHbtn+TR+dMviakQ==}
    engines: {node: '>= 0.4'}

  set-proto@1.0.0:
    resolution: {integrity: sha512-RJRdvCo6IAnPdsvP/7m6bsQqNnn1FCBX5ZNtFL98MmFF/4xAIJTIg1YbHW5DC2W5SKZanrC6i4HsJqlajw/dZw==}
    engines: {node: '>= 0.4'}

  setimmediate@1.0.5:
    resolution: {integrity: sha512-MATJdZp8sLqDl/68LfQmbP8zKPLQNV6BIZoIgrscFDQ+RsvK/BxeDQOgyxKKoh0y/8h3BqVFnCqQ/gd+reiIXA==}

  sharp@0.34.5:
    resolution: {integrity: sha512-Ou9I5Ft9WNcCbXrU9cMgPBcCK8LiwLqcbywW3t4oDV37n1pzpuNLsYiAV8eODnjbtQlSDwZ2cUEeQz4E54Hltg==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}

  shebang-command@2.0.0:
    resolution: {integrity: sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==}
    engines: {node: '>=8'}

  shebang-regex@3.0.0:
    resolution: {integrity: sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==}
    engines: {node: '>=8'}

  side-channel-list@1.0.1:
    resolution: {integrity: sha512-mjn/0bi/oUURjc5Xl7IaWi/OJJJumuoJFQJfDDyO46+hBWsfaVM65TBHq2eoZBhzl9EchxOijpkbRC8SVBQU0w==}
    engines: {node: '>= 0.4'}

  side-channel-map@1.0.1:
    resolution: {integrity: sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA==}
    engines: {node: '>= 0.4'}

  side-channel-weakmap@1.0.2:
    resolution: {integrity: sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A==}
    engines: {node: '>= 0.4'}

  side-channel@1.1.1:
    resolution: {integrity: sha512-6x6dK6zJdpTzF4sQeNYxwtvBzf6Eg4GtlesS94HOvTudUeyK2WXAaIfmDgsyslYrRBeFIlsi54AYsFGUuhmvrQ==}
    engines: {node: '>= 0.4'}

  signal-exit@3.0.7:
    resolution: {integrity: sha512-wnD2ZE+l+SPC/uoS0vXeE9L1+0wuaMqKlfz9AMUo38JsyLSBWSFcHR1Rri62LZc12vLr1gb3jl7iwQhgwpAbGQ==}

  size-sensor@1.0.3:
    resolution: {integrity: sha512-+k9mJ2/rQMiRmQUcjn+qznch260leIXY8r4FyYKKyRBO/s5UoeMAHGkCJyE1R/4wrIhTJONfyloY55SkE7ve3A==}

  source-map-js@1.2.1:
    resolution: {integrity: sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==}
    engines: {node: '>=0.10.0'}

  stable-hash@0.0.5:
    resolution: {integrity: sha512-+L3ccpzibovGXFK+Ap/f8LOS0ahMrHTf3xu7mMLSpEGU0EO9ucaysSylKo9eRDFNhWve/y275iPmIZ4z39a9iA==}

  stop-iteration-iterator@1.1.0:
    resolution: {integrity: sha512-eLoXW/DHyl62zxY4SCaIgnRhuMr6ri4juEYARS8E6sCEqzKpOiE521Ucofdx+KnDZl5xmvGYaaKCk5FEOxJCoQ==}
    engines: {node: '>= 0.4'}

  string-width@4.2.3:
    resolution: {integrity: sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==}
    engines: {node: '>=8'}

  string.prototype.includes@2.0.1:
    resolution: {integrity: sha512-o7+c9bW6zpAdJHTtujeePODAhkuicdAryFsfVKwA+wGw89wJ4GTY484WTucM9hLtDEOpOvI+aHnzqnC5lHp4Rg==}
    engines: {node: '>= 0.4'}

  string.prototype.matchall@4.0.12:
    resolution: {integrity: sha512-6CC9uyBL+/48dYizRf7H7VAYCMCNTBeM78x/VTUe9bFEaxBepPJDa1Ow99LqI/1yF7kuy7Q3cQsYMrcjGUcskA==}
    engines: {node: '>= 0.4'}

  string.prototype.repeat@1.0.0:
    resolution: {integrity: sha512-0u/TldDbKD8bFCQ/4f5+mNRrXwZ8hg2w7ZR8wa16e8z9XpePWl3eGEcUD0OXpEH/VJH/2G3gjUtR3ZOiBe2S/w==}

  string.prototype.trim@1.2.11:
    resolution: {integrity: sha512-PwvK7BU+CMTJGYQCTZb5RWXIML92lftJLhQz1tBzgKiqGxJaMlBAa48POXaNAC2s4y8jr3EFqrkF9+44neS46w==}
    engines: {node: '>= 0.4'}

  string.prototype.trimend@1.0.10:
    resolution: {integrity: sha512-2+3aDAOmPTmuFwjDnmJG2ctEkQKVki7vOSqaxkv42Mowj1V6PnvuwFCRrR5lChUux1TBskPjfkeTOhqczDMxTw==}
    engines: {node: '>= 0.4'}

  string.prototype.trimstart@1.0.8:
    resolution: {integrity: sha512-UXSH262CSZY1tfu3G3Secr6uGLCFVPMhIqHjlgCUtCCcgihYc/xKs9djMTMUOb2j1mVSeU8EU6NWc/iQKU6Gfg==}
    engines: {node: '>= 0.4'}

  string_decoder@1.1.1:
    resolution: {integrity: sha512-n/ShnvDi6FHbbVfviro+WojiFzv+s8MPMHBczVePfUpDJLwoLT0ht1l4YwBCbi8pJAveEEdnkHyPyTP/mzRfwg==}

  string_decoder@1.3.0:
    resolution: {integrity: sha512-hkRX8U1WjJFd8LsDJ2yQ/wWWxaopEsABU1XfkM8A+j0+85JAGppt16cr1Whg6KIbb4okU6Mql6BOj+uup/wKeA==}

  strip-ansi@6.0.1:
    resolution: {integrity: sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==}
    engines: {node: '>=8'}

  strip-bom@3.0.0:
    resolution: {integrity: sha512-vavAMRXOgBVNF6nyEEmL3DBK19iRpDcoIwW+swQ+CbGiu7lju6t+JklA1MHweoWtadgt4ISVUsXLyDq34ddcwA==}
    engines: {node: '>=4'}

  strip-final-newline@2.0.0:
    resolution: {integrity: sha512-BrpvfNAE3dcvq7ll3xVumzjKjZQ5tI1sEUIKr3Uoks0XUl45St3FlatVqef9prk4jRDzhW6WZg+3bk93y6pLjA==}
    engines: {node: '>=6'}

  strip-json-comments@3.1.1:
    resolution: {integrity: sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==}
    engines: {node: '>=8'}

  styled-jsx@5.1.6:
    resolution: {integrity: sha512-qSVyDTeMotdvQYoHWLNGwRFJHC+i+ZvdBRYosOFgC+Wg1vx4frN2/RG/NA7SYqqvKNLf39P2LSRA2pu6n0XYZA==}
    engines: {node: '>= 12.0.0'}
    peerDependencies:
      '@babel/core': '*'
      babel-plugin-macros: '*'
      react: '>= 16.8.0 || 17.x.x || ^18.0.0-0 || ^19.0.0-0'
    peerDependenciesMeta:
      '@babel/core':
        optional: true
      babel-plugin-macros:
        optional: true

  sucrase@3.35.1:
    resolution: {integrity: sha512-DhuTmvZWux4H1UOnWMB3sk0sbaCVOoQZjv8u1rDoTV0HTdGem9hkAZtl4JZy8P2z4Bg0nT+YMeOFyVr4zcG5Tw==}
    engines: {node: '>=16 || 14 >=14.17'}
    hasBin: true

  supports-color@7.2.0:
    resolution: {integrity: sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==}
    engines: {node: '>=8'}

  supports-preserve-symlinks-flag@1.0.0:
    resolution: {integrity: sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w==}
    engines: {node: '>= 0.4'}

  tailwindcss@3.4.19:
    resolution: {integrity: sha512-3ofp+LL8E+pK/JuPLPggVAIaEuhvIz4qNcf3nA1Xn2o/7fb7s/TYpHhwGDv1ZU3PkBluUVaF8PyCHcm48cKLWQ==}
    engines: {node: '>=14.0.0'}
    hasBin: true

  tar-stream@2.2.0:
    resolution: {integrity: sha512-ujeqbceABgwMZxEJnk2HDY2DlnUZ+9oEcb1KzTVfYHio0UE6dG71n60d8D2I4qNvleWrrXpmjpt7vZeF1LnMZQ==}
    engines: {node: '>=6'}

  thenify-all@1.6.0:
    resolution: {integrity: sha512-RNxQH/qI8/t3thXJDwcstUO4zeqo64+Uy/+sNVRBx4Xn2OX+OZ9oP+iJnNFqplFra2ZUVeKCSa2oVWi3T4uVmA==}
    engines: {node: '>=0.8'}

  thenify@3.3.1:
    resolution: {integrity: sha512-RVZSIV5IG10Hk3enotrhvz0T9em6cyHBLkH/YAZuKqd8hRkKhSfCGIcP2KUY0EPxndzANBmNllzWPwak+bheSw==}

  throttleit@2.1.0:
    resolution: {integrity: sha512-nt6AMGKW1p/70DF/hGBdJB57B8Tspmbp5gfJ8ilhLnt7kkr2ye7hzD6NVG8GGErk2HWF34igrL2CXmNIkzKqKw==}
    engines: {node: '>=18'}

  tinyexec@1.2.4:
    resolution: {integrity: sha512-SHf/r48b7vOrjve9PxJo3MN5v5yuyjHvdUcrQffT3WXMUfnGmHDVbC4k3sHJaJTgZCwpUplIaAo5ANtMyp3YHg==}
    engines: {node: '>=18'}

  tinyglobby@0.2.17:
    resolution: {integrity: sha512-wXR/dYpcqKmfWpEdZjiKJOwCNFndD0DMnrW/cYjVGttEkBfVgcLFHoNrlj47mjOVic9yyNu65alsgF4NQyTa2g==}
    engines: {node: '>=12.0.0'}

  tmp@0.2.7:
    resolution: {integrity: sha512-e0votIpp4Uo2AJYSzVHV6xCcawuiez3DzqDAbrTc3YxBkplN6e+dM13ZeIcZnDg/QpSuU2zfZ3rzwY8ukEnaXw==}
    engines: {node: '>=14.14'}

  to-regex-range@5.0.1:
    resolution: {integrity: sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==}
    engines: {node: '>=8.0'}

  traverse@0.3.9:
    resolution: {integrity: sha512-iawgk0hLP3SxGKDfnDJf8wTz4p2qImnyihM5Hh/sGvQ3K37dPi/w8sRhdNIxYA1TwFwc5mDhIJq+O0RsvXBKdQ==}

  ts-api-utils@2.5.0:
    resolution: {integrity: sha512-OJ/ibxhPlqrMM0UiNHJ/0CKQkoKF243/AEmplt3qpRgkW8VG7IfOS41h7V8TjITqdByHzrjcS/2si+y4lIh8NA==}
    engines: {node: '>=18.12'}
    peerDependencies:
      typescript: '>=4.8.4'

  ts-interface-checker@0.1.13:
    resolution: {integrity: sha512-Y/arvbn+rrz3JCKl9C4kVNfTfSm2/mEp5FSz5EsZSANGPSlQrpRI5M4PKF+mJnE52jOO90PnPSc3Ur3bTQw0gA==}

  tsconfig-paths@3.15.0:
    resolution: {integrity: sha512-2Ac2RgzDe/cn48GvOe3M+o82pEFewD3UPbyoUHHdKasHwJKjds4fLXWf/Ux5kATBKN20oaFGu+jbElp1pos0mg==}

  tslib@2.3.0:
    resolution: {integrity: sha512-N82ooyxVNm6h1riLCoyS9e3fuJ3AMG2zIZs2Gd1ATcSFjSA23Q0fzjjZeh0jbJvWVDZ0cJT8yaNNaaXHzueNjg==}

  tslib@2.8.1:
    resolution: {integrity: sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==}

  tsx@4.23.0:
    resolution: {integrity: sha512-eUdUIaCr963q2h5u3+QwvYp0+eqPvn+egeqZUm0hwERCqqx1E3kK5ehbGCvqSE5MQAULr67ww0cA3jKc3YkM1w==}
    engines: {node: '>=18.0.0'}
    hasBin: true

  type-check@0.4.0:
    resolution: {integrity: sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==}
    engines: {node: '>= 0.8.0'}

  typed-array-buffer@1.0.3:
    resolution: {integrity: sha512-nAYYwfY3qnzX30IkA6AQZjVbtK6duGontcQm1WSG1MD94YLqK0515GNApXkoxKOWMusVssAHWLh9SeaoefYFGw==}
    engines: {node: '>= 0.4'}

  typed-array-byte-length@1.0.3:
    resolution: {integrity: sha512-BaXgOuIxz8n8pIq3e7Atg/7s+DpiYrxn4vdot3w9KbnBhcRQq6o3xemQdIfynqSeXeDrF32x+WvfzmOjPiY9lg==}
    engines: {node: '>= 0.4'}

  typed-array-byte-offset@1.0.4:
    resolution: {integrity: sha512-bTlAFB/FBYMcuX81gbL4OcpH5PmlFHqlCCpAl8AlEzMz5k53oNDvN8p1PNOWLEmI2x4orp3raOFB51tv9X+MFQ==}
    engines: {node: '>= 0.4'}

  typed-array-length@1.0.8:
    resolution: {integrity: sha512-phPGCwqr2+Qo0fwniCE8e4pKnGu/yFb5nD5Y8bf0EEeiI5GklnACYA9GFy/DrAeRrKHXvHn+1SUsOWgJp6RO+g==}
    engines: {node: '>= 0.4'}

  typescript@5.9.3:
    resolution: {integrity: sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==}
    engines: {node: '>=14.17'}
    hasBin: true

  unbox-primitive@1.1.0:
    resolution: {integrity: sha512-nWJ91DjeOkej/TA8pXQ3myruKpKEYgqvpw9lz4OPHj/NWFNluYrjbz9j01CJ8yKQd2g4jFoOkINCTW2I5LEEyw==}
    engines: {node: '>= 0.4'}

  undici-types@6.21.0:
    resolution: {integrity: sha512-iwDZqg0QAGrg9Rav5H4n0M64c3mkR59cJ6wQp+7C4nI0gsmExaedaYLNO44eT4AtBBwjbTiGPMlt2Md0T9H9JQ==}

  undici@6.27.0:
    resolution: {integrity: sha512-YmfV3YnEDzXRC5lZ2jWtWWHKGUm1zIt8AhesR1tens+HTNv+YZlN/dp6G727LOvMJ8xjP9Be7Y2Sdr96LDm+pg==}
    engines: {node: '>=18.17'}

  unrs-resolver@1.12.2:
    resolution: {integrity: sha512-dmlRxBJJayXjqTwC+JtF1HhJmgf3ftQ3YejFcZrf4+KKtJv0qDsK1pjqaaVjG7wJ5NJ6UVP1OqRMQ71Z4C3rxQ==}

  unzipper@0.10.14:
    resolution: {integrity: sha512-ti4wZj+0bQTiX2KmKWuwj7lhV+2n//uXEotUmGuQqrbVZSEGFMbI68+c6JCQ8aAmUWYvtHEz2A8K6wXvueR/6g==}

  update-browserslist-db@1.2.3:
    resolution: {integrity: sha512-Js0m9cx+qOgDxo0eMiFGEueWztz+d4+M3rGlmKPT+T4IS/jP4ylw3Nwpu6cpTTP8R1MAC1kF4VbdLt3ARf209w==}
    hasBin: true
    peerDependencies:
      browserslist: '>= 4.21.0'

  uri-js@4.4.1:
    resolution: {integrity: sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg==}

  util-deprecate@1.0.2:
    resolution: {integrity: sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==}

  uuid@8.3.2:
    resolution: {integrity: sha512-+NYs2QeMWy+GWFOEm9xnn6HCDp0l7QBD7ml8zLUmJ+93Q5NF0NocErnwkTkXVFNiX3/fpC6afS8Dhb/gz7R7eg==}
    deprecated: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
    hasBin: true

  which-boxed-primitive@1.1.1:
    resolution: {integrity: sha512-TbX3mj8n0odCBFVlY8AxkqcHASw3L60jIuF8jFP78az3C2YhmGvqbHBpAjTRH2/xqYunrJ9g1jSyjCjpoWzIAA==}
    engines: {node: '>= 0.4'}

  which-builtin-type@1.2.1:
    resolution: {integrity: sha512-6iBczoX+kDQ7a3+YJBnh3T+KZRxM/iYNPXicqk66/Qfm1b93iu+yOImkg0zHbj5LNOcNv1TEADiZ0xa34B4q6Q==}
    engines: {node: '>= 0.4'}

  which-collection@1.0.2:
    resolution: {integrity: sha512-K4jVyjnBdgvc86Y6BkaLZEN933SwYOuBFkdmBu9ZfkcAbdVbpITnDmjvZ/aQjRXQrv5EPkTnD1s39GiiqbngCw==}
    engines: {node: '>= 0.4'}

  which-module@2.0.1:
    resolution: {integrity: sha512-iBdZ57RDvnOR9AGBhML2vFZf7h8vmBjhoaZqODJBFWHVtKkDmKuHai3cx5PgVMrX5YDNp27AofYbAwctSS+vhQ==}

  which-typed-array@1.1.22:
    resolution: {integrity: sha512-fvO4ExWMFsqyhG3AiPAObMuY1lxaqgYcxbc49CNdWDDECOJNgQyvsOWVwbZc+qf3rzRtxojBK+CMEv0Ld5CYpw==}
    engines: {node: '>= 0.4'}

  which@2.0.2:
    resolution: {integrity: sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==}
    engines: {node: '>= 8'}
    hasBin: true

  word-wrap@1.2.5:
    resolution: {integrity: sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA==}
    engines: {node: '>=0.10.0'}

  wrap-ansi@6.2.0:
    resolution: {integrity: sha512-r6lPcBGxZXlIcymEu7InxDMhdW0KDxpLgoFLcguasxCaJ/SOIZwINatK9KY/tf+ZrlywOKU0UDj3ATXUBfxJXA==}
    engines: {node: '>=8'}

  wrappy@1.0.2:
    resolution: {integrity: sha512-l4Sp/DRseor9wL6EvV2+TuQn63dMkPjZ/sp9XkghTEbV9KlPS1xUsZ3u7/IQO4wxtcFB4bgpQPRcR3QCvezPcQ==}

  xdg-app-paths@5.5.1:
    resolution: {integrity: sha512-hI3flOB4PLZIy5prbtTpirobtPE2ZtZ52szO+2mM9Efp6ErM398La+C1lIpNWDfNoQk+6Lsi6nMcCwVB7pxeMQ==}
    engines: {node: '>= 6.0'}

  xdg-portable@7.3.0:
    resolution: {integrity: sha512-sqMMuL1rc0FmMBOzCpd0yuy9trqF2yTTVe+E9ogwCSWQCdDEtQUwrZPT6AxqtsFGRNxycgncbP/xmOOSPw5ZUw==}
    engines: {node: '>= 6.0'}

  xmlchars@2.2.0:
    resolution: {integrity: sha512-JZnDKK8B0RCDw84FNdDAIpZK+JuJw+s7Lz8nksI7SIuU3UXJJslUthsi+uWBUYOwPFwW7W7PRLRfUKpxjtjFCw==}

  y18n@4.0.3:
    resolution: {integrity: sha512-JKhqTOwSrqNA1NY5lSztJ1GrBiUodLMmIZuLiDaMRJ+itFd+ABVE8XBjOvIWL+rSqNDC74LCSFmlb/U4UZ4hJQ==}

  yargs-parser@18.1.3:
    resolution: {integrity: sha512-o50j0JeToy/4K6OZcaQmW6lyXXKhq7csREXcDwk2omFPJEwUNOVtJKvmDr9EI1fAJZUyZcRF7kxGBWmRXudrCQ==}
    engines: {node: '>=6'}

  yargs@15.4.1:
    resolution: {integrity: sha512-aePbxDmcYW++PaqBsJ+HYUFwCdv4LVvdnhBy78E57PIor8/OVvhMrADFFEDh8DHDFRv/O9i3lPhsENjO7QX0+A==}
    engines: {node: '>=8'}

  yocto-queue@0.1.0:
    resolution: {integrity: sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==}
    engines: {node: '>=10'}

  zip-stream@4.1.1:
    resolution: {integrity: sha512-9qv4rlDiopXg4E69k+vMHjNN63YFMe9sZMrdlvKnCjlCRWeCBswPPMPUfx+ipsAWq1LXHe70RcbaHdJJpS6hyQ==}
    engines: {node: '>= 10'}

  zod@3.25.76:
    resolution: {integrity: sha512-gzUt/qt81nXsFGKIFcC3YnfEAx5NkunCfnDlvuBSSFS02bcXu4Lmea0AFIUwbLWxWPx3d9p8S5QoaujKcNQxcQ==}

  zod@4.1.11:
    resolution: {integrity: sha512-WPsqwxITS2tzx1bzhIKsEs19ABD5vmCVa4xBo2tq/SrV4RNZtfws1EnCWQXM6yh8bD08a1idvkB5MZSBiZsjwg==}

  zrender@6.1.0:
    resolution: {integrity: sha512-oEGMDB6pOP2S6OwRR4PdVv610zrjnA3Bh+JnSG12fYJlBKjtNAoEb5fSUoCOOINlH96I2fU38/A2UpRKs67xYQ==}

snapshots:

  '@alloc/quick-lru@5.2.0': {}

  '@emnapi/core@1.10.0':
    dependencies:
      '@emnapi/wasi-threads': 1.2.1
      tslib: 2.8.1
    optional: true

  '@emnapi/runtime@1.10.0':
    dependencies:
      tslib: 2.8.1
    optional: true

  '@emnapi/runtime@1.11.2':
    dependencies:
      tslib: 2.8.1
    optional: true

  '@emnapi/wasi-threads@1.2.1':
    dependencies:
      tslib: 2.8.1
    optional: true

  '@esbuild/aix-ppc64@0.28.1':
    optional: true

  '@esbuild/android-arm64@0.28.1':
    optional: true

  '@esbuild/android-arm@0.28.1':
    optional: true

  '@esbuild/android-x64@0.28.1':
    optional: true

  '@esbuild/darwin-arm64@0.28.1':
    optional: true

  '@esbuild/darwin-x64@0.28.1':
    optional: true

  '@esbuild/freebsd-arm64@0.28.1':
    optional: true

  '@esbuild/freebsd-x64@0.28.1':
    optional: true

  '@esbuild/linux-arm64@0.28.1':
    optional: true

  '@esbuild/linux-arm@0.28.1':
    optional: true

  '@esbuild/linux-ia32@0.28.1':
    optional: true

  '@esbuild/linux-loong64@0.28.1':
    optional: true

  '@esbuild/linux-mips64el@0.28.1':
    optional: true

  '@esbuild/linux-ppc64@0.28.1':
    optional: true

  '@esbuild/linux-riscv64@0.28.1':
    optional: true

  '@esbuild/linux-s390x@0.28.1':
    optional: true

  '@esbuild/linux-x64@0.28.1':
    optional: true

  '@esbuild/netbsd-arm64@0.28.1':
    optional: true

  '@esbuild/netbsd-x64@0.28.1':
    optional: true

  '@esbuild/openbsd-arm64@0.28.1':
    optional: true

  '@esbuild/openbsd-x64@0.28.1':
    optional: true

  '@esbuild/openharmony-arm64@0.28.1':
    optional: true

  '@esbuild/sunos-x64@0.28.1':
    optional: true

  '@esbuild/win32-arm64@0.28.1':
    optional: true

  '@esbuild/win32-ia32@0.28.1':
    optional: true

  '@esbuild/win32-x64@0.28.1':
    optional: true

  '@eslint-community/eslint-utils@4.9.1(eslint@9.39.4(jiti@1.21.7))':
    dependencies:
      eslint: 9.39.4(jiti@1.21.7)
      eslint-visitor-keys: 3.4.3

  '@eslint-community/regexpp@4.12.2': {}

  '@eslint/config-array@0.21.2':
    dependencies:
      '@eslint/object-schema': 2.1.7
      debug: 4.4.3
      minimatch: 3.1.5
    transitivePeerDependencies:
      - supports-color

  '@eslint/config-helpers@0.4.2':
    dependencies:
      '@eslint/core': 0.17.0

  '@eslint/core@0.17.0':
    dependencies:
      '@types/json-schema': 7.0.15

  '@eslint/eslintrc@3.3.5':
    dependencies:
      ajv: 6.15.0
      debug: 4.4.3
      espree: 10.4.0
      globals: 14.0.0
      ignore: 5.3.2
      import-fresh: 3.3.1
      js-yaml: 4.3.0
      minimatch: 3.1.5
      strip-json-comments: 3.1.1
    transitivePeerDependencies:
      - supports-color

  '@eslint/js@9.39.4': {}

  '@eslint/object-schema@2.1.7': {}

  '@eslint/plugin-kit@0.4.1':
    dependencies:
      '@eslint/core': 0.17.0
      levn: 0.4.1

  '@fast-csv/format@4.3.5':
    dependencies:
      '@types/node': 14.18.63
      lodash.escaperegexp: 4.1.2
      lodash.isboolean: 3.0.3
      lodash.isequal: 4.5.0
      lodash.isfunction: 3.0.9
      lodash.isnil: 4.0.0

  '@fast-csv/parse@4.3.6':
    dependencies:
      '@types/node': 14.18.63
      lodash.escaperegexp: 4.1.2
      lodash.groupby: 4.6.0
      lodash.isfunction: 3.0.9
      lodash.isnil: 4.0.0
      lodash.isundefined: 3.0.1
      lodash.uniq: 4.5.0

  '@humanfs/core@0.19.2':
    dependencies:
      '@humanfs/types': 0.15.0

  '@humanfs/node@0.16.8':
    dependencies:
      '@humanfs/core': 0.19.2
      '@humanfs/types': 0.15.0
      '@humanwhocodes/retry': 0.4.3

  '@humanfs/types@0.15.0': {}

  '@humanwhocodes/module-importer@1.0.1': {}

  '@humanwhocodes/retry@0.4.3': {}

  '@img/colour@1.1.0':
    optional: true

  '@img/sharp-darwin-arm64@0.34.5':
    optionalDependencies:
      '@img/sharp-libvips-darwin-arm64': 1.2.4
    optional: true

  '@img/sharp-darwin-x64@0.34.5':
    optionalDependencies:
      '@img/sharp-libvips-darwin-x64': 1.2.4
    optional: true

  '@img/sharp-libvips-darwin-arm64@1.2.4':
    optional: true

  '@img/sharp-libvips-darwin-x64@1.2.4':
    optional: true

  '@img/sharp-libvips-linux-arm64@1.2.4':
    optional: true

  '@img/sharp-libvips-linux-arm@1.2.4':
    optional: true

  '@img/sharp-libvips-linux-ppc64@1.2.4':
    optional: true

  '@img/sharp-libvips-linux-riscv64@1.2.4':
    optional: true

  '@img/sharp-libvips-linux-s390x@1.2.4':
    optional: true

  '@img/sharp-libvips-linux-x64@1.2.4':
    optional: true

  '@img/sharp-libvips-linuxmusl-arm64@1.2.4':
    optional: true

  '@img/sharp-libvips-linuxmusl-x64@1.2.4':
    optional: true

  '@img/sharp-linux-arm64@0.34.5':
    optionalDependencies:
      '@img/sharp-libvips-linux-arm64': 1.2.4
    optional: true

  '@img/sharp-linux-arm@0.34.5':
    optionalDependencies:
      '@img/sharp-libvips-linux-arm': 1.2.4
    optional: true

  '@img/sharp-linux-ppc64@0.34.5':
    optionalDependencies:
      '@img/sharp-libvips-linux-ppc64': 1.2.4
    optional: true

  '@img/sharp-linux-riscv64@0.34.5':
    optionalDependencies:
      '@img/sharp-libvips-linux-riscv64': 1.2.4
    optional: true

  '@img/sharp-linux-s390x@0.34.5':
    optionalDependencies:
      '@img/sharp-libvips-linux-s390x': 1.2.4
    optional: true

  '@img/sharp-linux-x64@0.34.5':
    optionalDependencies:
      '@img/sharp-libvips-linux-x64': 1.2.4
    optional: true

  '@img/sharp-linuxmusl-arm64@0.34.5':
    optionalDependencies:
      '@img/sharp-libvips-linuxmusl-arm64': 1.2.4
    optional: true

  '@img/sharp-linuxmusl-x64@0.34.5':
    optionalDependencies:
      '@img/sharp-libvips-linuxmusl-x64': 1.2.4
    optional: true

  '@img/sharp-wasm32@0.34.5':
    dependencies:
      '@emnapi/runtime': 1.11.2
    optional: true

  '@img/sharp-win32-arm64@0.34.5':
    optional: true

  '@img/sharp-win32-ia32@0.34.5':
    optional: true

  '@img/sharp-win32-x64@0.34.5':
    optional: true

  '@jridgewell/gen-mapping@0.3.13':
    dependencies:
      '@jridgewell/sourcemap-codec': 1.5.5
      '@jridgewell/trace-mapping': 0.3.31

  '@jridgewell/resolve-uri@3.1.2': {}

  '@jridgewell/sourcemap-codec@1.5.5': {}

  '@jridgewell/trace-mapping@0.3.31':
    dependencies:
      '@jridgewell/resolve-uri': 3.1.2
      '@jridgewell/sourcemap-codec': 1.5.5

  '@napi-rs/wasm-runtime@1.1.6(@emnapi/core@1.10.0)(@emnapi/runtime@1.10.0)':
    dependencies:
      '@emnapi/core': 1.10.0
      '@emnapi/runtime': 1.10.0
      '@tybys/wasm-util': 0.10.3
    optional: true

  '@next/env@15.5.20': {}

  '@next/eslint-plugin-next@15.5.20':
    dependencies:
      fast-glob: 3.3.1

  '@next/swc-darwin-arm64@15.5.20':
    optional: true

  '@next/swc-darwin-x64@15.5.20':
    optional: true

  '@next/swc-linux-arm64-gnu@15.5.20':
    optional: true

  '@next/swc-linux-arm64-musl@15.5.20':
    optional: true

  '@next/swc-linux-x64-gnu@15.5.20':
    optional: true

  '@next/swc-linux-x64-musl@15.5.20':
    optional: true

  '@next/swc-win32-arm64-msvc@15.5.20':
    optional: true

  '@next/swc-win32-x64-msvc@15.5.20':
    optional: true

  '@nodelib/fs.scandir@2.1.5':
    dependencies:
      '@nodelib/fs.stat': 2.0.5
      run-parallel: 1.2.0

  '@nodelib/fs.stat@2.0.5': {}

  '@nodelib/fs.walk@1.2.8':
    dependencies:
      '@nodelib/fs.scandir': 2.1.5
      fastq: 1.20.1

  '@nolyfill/is-core-module@1.0.39': {}

  '@prisma/client@6.19.3(prisma@6.19.3(typescript@5.9.3))(typescript@5.9.3)':
    optionalDependencies:
      prisma: 6.19.3(typescript@5.9.3)
      typescript: 5.9.3

  '@prisma/config@6.19.3':
    dependencies:
      c12: 3.1.0
      deepmerge-ts: 7.1.5
      effect: 3.21.0
      empathic: 2.0.0
    transitivePeerDependencies:
      - magicast

  '@prisma/debug@6.19.3': {}

  '@prisma/engines-version@7.1.1-3.c2990dca591cba766e3b7ef5d9e8a84796e47ab7': {}

  '@prisma/engines@6.19.3':
    dependencies:
      '@prisma/debug': 6.19.3
      '@prisma/engines-version': 7.1.1-3.c2990dca591cba766e3b7ef5d9e8a84796e47ab7
      '@prisma/fetch-engine': 6.19.3
      '@prisma/get-platform': 6.19.3

  '@prisma/fetch-engine@6.19.3':
    dependencies:
      '@prisma/debug': 6.19.3
      '@prisma/engines-version': 7.1.1-3.c2990dca591cba766e3b7ef5d9e8a84796e47ab7
      '@prisma/get-platform': 6.19.3

  '@prisma/get-platform@6.19.3':
    dependencies:
      '@prisma/debug': 6.19.3

  '@rtsao/scc@1.1.0': {}

  '@rushstack/eslint-patch@1.16.1': {}

  '@standard-schema/spec@1.1.0': {}

  '@swc/helpers@0.5.15':
    dependencies:
      tslib: 2.8.1

  '@tybys/wasm-util@0.10.3':
    dependencies:
      tslib: 2.8.1
    optional: true

  '@types/bcryptjs@2.4.6': {}

  '@types/estree@1.0.9': {}

  '@types/json-schema@7.0.15': {}

  '@types/json5@0.0.29': {}

  '@types/node@14.18.63': {}

  '@types/node@22.20.0':
    dependencies:
      undici-types: 6.21.0

  '@types/qrcode@1.5.6':
    dependencies:
      '@types/node': 22.20.0

  '@types/react-dom@19.2.3(@types/react@19.2.17)':
    dependencies:
      '@types/react': 19.2.17

  '@types/react@19.2.17':
    dependencies:
      csstype: 3.2.3

  '@typescript-eslint/eslint-plugin@8.63.0(@typescript-eslint/parser@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3))(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3)':
    dependencies:
      '@eslint-community/regexpp': 4.12.2
      '@typescript-eslint/parser': 8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3)
      '@typescript-eslint/scope-manager': 8.63.0
      '@typescript-eslint/type-utils': 8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3)
      '@typescript-eslint/utils': 8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3)
      '@typescript-eslint/visitor-keys': 8.63.0
      eslint: 9.39.4(jiti@1.21.7)
      ignore: 7.0.5
      natural-compare: 1.4.0
      ts-api-utils: 2.5.0(typescript@5.9.3)
      typescript: 5.9.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/parser@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3)':
    dependencies:
      '@typescript-eslint/scope-manager': 8.63.0
      '@typescript-eslint/types': 8.63.0
      '@typescript-eslint/typescript-estree': 8.63.0(typescript@5.9.3)
      '@typescript-eslint/visitor-keys': 8.63.0
      debug: 4.4.3
      eslint: 9.39.4(jiti@1.21.7)
      typescript: 5.9.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/project-service@8.63.0(typescript@5.9.3)':
    dependencies:
      '@typescript-eslint/tsconfig-utils': 8.63.0(typescript@5.9.3)
      '@typescript-eslint/types': 8.63.0
      debug: 4.4.3
      typescript: 5.9.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/scope-manager@8.63.0':
    dependencies:
      '@typescript-eslint/types': 8.63.0
      '@typescript-eslint/visitor-keys': 8.63.0

  '@typescript-eslint/tsconfig-utils@8.63.0(typescript@5.9.3)':
    dependencies:
      typescript: 5.9.3

  '@typescript-eslint/type-utils@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3)':
    dependencies:
      '@typescript-eslint/types': 8.63.0
      '@typescript-eslint/typescript-estree': 8.63.0(typescript@5.9.3)
      '@typescript-eslint/utils': 8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3)
      debug: 4.4.3
      eslint: 9.39.4(jiti@1.21.7)
      ts-api-utils: 2.5.0(typescript@5.9.3)
      typescript: 5.9.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/types@8.63.0': {}

  '@typescript-eslint/typescript-estree@8.63.0(typescript@5.9.3)':
    dependencies:
      '@typescript-eslint/project-service': 8.63.0(typescript@5.9.3)
      '@typescript-eslint/tsconfig-utils': 8.63.0(typescript@5.9.3)
      '@typescript-eslint/types': 8.63.0
      '@typescript-eslint/visitor-keys': 8.63.0
      debug: 4.4.3
      minimatch: 10.2.5
      semver: 7.8.5
      tinyglobby: 0.2.17
      ts-api-utils: 2.5.0(typescript@5.9.3)
      typescript: 5.9.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/utils@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3)':
    dependencies:
      '@eslint-community/eslint-utils': 4.9.1(eslint@9.39.4(jiti@1.21.7))
      '@typescript-eslint/scope-manager': 8.63.0
      '@typescript-eslint/types': 8.63.0
      '@typescript-eslint/typescript-estree': 8.63.0(typescript@5.9.3)
      eslint: 9.39.4(jiti@1.21.7)
      typescript: 5.9.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/visitor-keys@8.63.0':
    dependencies:
      '@typescript-eslint/types': 8.63.0
      eslint-visitor-keys: 5.0.1

  '@unrs/resolver-binding-android-arm-eabi@1.12.2':
    optional: true

  '@unrs/resolver-binding-android-arm64@1.12.2':
    optional: true

  '@unrs/resolver-binding-darwin-arm64@1.12.2':
    optional: true

  '@unrs/resolver-binding-darwin-x64@1.12.2':
    optional: true

  '@unrs/resolver-binding-freebsd-x64@1.12.2':
    optional: true

  '@unrs/resolver-binding-linux-arm-gnueabihf@1.12.2':
    optional: true

  '@unrs/resolver-binding-linux-arm-musleabihf@1.12.2':
    optional: true

  '@unrs/resolver-binding-linux-arm64-gnu@1.12.2':
    optional: true

  '@unrs/resolver-binding-linux-arm64-musl@1.12.2':
    optional: true

  '@unrs/resolver-binding-linux-loong64-gnu@1.12.2':
    optional: true

  '@unrs/resolver-binding-linux-loong64-musl@1.12.2':
    optional: true

  '@unrs/resolver-binding-linux-ppc64-gnu@1.12.2':
    optional: true

  '@unrs/resolver-binding-linux-riscv64-gnu@1.12.2':
    optional: true

  '@unrs/resolver-binding-linux-riscv64-musl@1.12.2':
    optional: true

  '@unrs/resolver-binding-linux-s390x-gnu@1.12.2':
    optional: true

  '@unrs/resolver-binding-linux-x64-gnu@1.12.2':
    optional: true

  '@unrs/resolver-binding-linux-x64-musl@1.12.2':
    optional: true

  '@unrs/resolver-binding-openharmony-arm64@1.12.2':
    optional: true

  '@unrs/resolver-binding-wasm32-wasi@1.12.2':
    dependencies:
      '@emnapi/core': 1.10.0
      '@emnapi/runtime': 1.10.0
      '@napi-rs/wasm-runtime': 1.1.6(@emnapi/core@1.10.0)(@emnapi/runtime@1.10.0)
    optional: true

  '@unrs/resolver-binding-win32-arm64-msvc@1.12.2':
    optional: true

  '@unrs/resolver-binding-win32-ia32-msvc@1.12.2':
    optional: true

  '@unrs/resolver-binding-win32-x64-msvc@1.12.2':
    optional: true

  '@vercel/blob@2.5.0':
    dependencies:
      '@vercel/oidc': 3.8.0
      async-retry: 1.3.3
      is-buffer: 2.0.5
      is-node-process: 1.2.0
      throttleit: 2.1.0
      undici: 6.27.0

  '@vercel/cli-config@0.2.0':
    dependencies:
      xdg-app-paths: 5.5.1
      zod: 4.1.11

  '@vercel/cli-exec@1.0.0':
    dependencies:
      execa: 5.1.1

  '@vercel/oidc@3.8.0':
    dependencies:
      '@vercel/cli-config': 0.2.0
      '@vercel/cli-exec': 1.0.0
      jose: 5.10.0

  acorn-jsx@5.3.2(acorn@8.17.0):
    dependencies:
      acorn: 8.17.0

  acorn@8.17.0: {}

  ajv@6.15.0:
    dependencies:
      fast-deep-equal: 3.1.3
      fast-json-stable-stringify: 2.1.0
      json-schema-traverse: 0.4.1
      uri-js: 4.4.1

  ansi-regex@5.0.1: {}

  ansi-styles@4.3.0:
    dependencies:
      color-convert: 2.0.1

  any-promise@1.3.0: {}

  anymatch@3.1.3:
    dependencies:
      normalize-path: 3.0.0
      picomatch: 2.3.2

  archiver-utils@2.1.0:
    dependencies:
      glob: 7.2.3
      graceful-fs: 4.2.11
      lazystream: 1.0.1
      lodash.defaults: 4.2.0
      lodash.difference: 4.5.0
      lodash.flatten: 4.4.0
      lodash.isplainobject: 4.0.6
      lodash.union: 4.6.0
      normalize-path: 3.0.0
      readable-stream: 2.3.8

  archiver-utils@3.0.4:
    dependencies:
      glob: 7.2.3
      graceful-fs: 4.2.11
      lazystream: 1.0.1
      lodash.defaults: 4.2.0
      lodash.difference: 4.5.0
      lodash.flatten: 4.4.0
      lodash.isplainobject: 4.0.6
      lodash.union: 4.6.0
      normalize-path: 3.0.0
      readable-stream: 3.6.2

  archiver@5.3.2:
    dependencies:
      archiver-utils: 2.1.0
      async: 3.2.6
      buffer-crc32: 0.2.13
      readable-stream: 3.6.2
      readdir-glob: 1.1.3
      tar-stream: 2.2.0
      zip-stream: 4.1.1

  arg@5.0.2: {}

  argparse@2.0.1: {}

  aria-query@5.3.2: {}

  array-buffer-byte-length@1.0.2:
    dependencies:
      call-bound: 1.0.4
      is-array-buffer: 3.0.5

  array-includes@3.1.9:
    dependencies:
      call-bind: 1.0.9
      call-bound: 1.0.4
      define-properties: 1.2.1
      es-abstract: 1.24.2
      es-object-atoms: 1.1.2
      get-intrinsic: 1.3.0
      is-string: 1.1.1
      math-intrinsics: 1.1.0

  array.prototype.findlast@1.2.5:
    dependencies:
      call-bind: 1.0.9
      define-properties: 1.2.1
      es-abstract: 1.24.2
      es-errors: 1.3.0
      es-object-atoms: 1.1.2
      es-shim-unscopables: 1.1.0

  array.prototype.findlastindex@1.2.6:
    dependencies:
      call-bind: 1.0.9
      call-bound: 1.0.4
      define-properties: 1.2.1
      es-abstract: 1.24.2
      es-errors: 1.3.0
      es-object-atoms: 1.1.2
      es-shim-unscopables: 1.1.0

  array.prototype.flat@1.3.3:
    dependencies:
      call-bind: 1.0.9
      define-properties: 1.2.1
      es-abstract: 1.24.2
      es-shim-unscopables: 1.1.0

  array.prototype.flatmap@1.3.3:
    dependencies:
      call-bind: 1.0.9
      define-properties: 1.2.1
      es-abstract: 1.24.2
      es-shim-unscopables: 1.1.0

  array.prototype.tosorted@1.1.4:
    dependencies:
      call-bind: 1.0.9
      define-properties: 1.2.1
      es-abstract: 1.24.2
      es-errors: 1.3.0
      es-shim-unscopables: 1.1.0

  arraybuffer.prototype.slice@1.0.4:
    dependencies:
      array-buffer-byte-length: 1.0.2
      call-bind: 1.0.9
      define-properties: 1.2.1
      es-abstract: 1.24.2
      es-errors: 1.3.0
      get-intrinsic: 1.3.0
      is-array-buffer: 3.0.5

  ast-types-flow@0.0.8: {}

  async-function@1.0.0: {}

  async-retry@1.3.3:
    dependencies:
      retry: 0.13.1

  async@3.2.6: {}

  autoprefixer@10.5.2(postcss@8.5.16):
    dependencies:
      browserslist: 4.28.5
      caniuse-lite: 1.0.30001802
      fraction.js: 5.3.4
      picocolors: 1.1.1
      postcss: 8.5.16
      postcss-value-parser: 4.2.0

  available-typed-arrays@1.0.7:
    dependencies:
      possible-typed-array-names: 1.1.0

  axe-core@4.12.1: {}

  axobject-query@4.1.0: {}

  balanced-match@1.0.2: {}

  balanced-match@4.0.4: {}

  base64-js@1.5.1: {}

  baseline-browser-mapping@2.10.42: {}

  bcryptjs@2.4.3: {}

  big-integer@1.6.52: {}

  binary-extensions@2.3.0: {}

  binary@0.3.0:
    dependencies:
      buffers: 0.1.1
      chainsaw: 0.1.0

  bl@4.1.0:
    dependencies:
      buffer: 5.7.1
      inherits: 2.0.4
      readable-stream: 3.6.2

  bluebird@3.4.7: {}

  brace-expansion@1.1.15:
    dependencies:
      balanced-match: 1.0.2
      concat-map: 0.0.1

  brace-expansion@2.1.1:
    dependencies:
      balanced-match: 1.0.2

  brace-expansion@5.0.7:
    dependencies:
      balanced-match: 4.0.4

  braces@3.0.3:
    dependencies:
      fill-range: 7.1.1

  browserslist@4.28.5:
    dependencies:
      baseline-browser-mapping: 2.10.42
      caniuse-lite: 1.0.30001802
      electron-to-chromium: 1.5.387
      node-releases: 2.0.50
      update-browserslist-db: 1.2.3(browserslist@4.28.5)

  buffer-crc32@0.2.13: {}

  buffer-indexof-polyfill@1.0.2: {}

  buffer@5.7.1:
    dependencies:
      base64-js: 1.5.1
      ieee754: 1.2.1

  buffers@0.1.1: {}

  c12@3.1.0:
    dependencies:
      chokidar: 4.0.3
      confbox: 0.2.4
      defu: 6.1.7
      dotenv: 16.6.1
      exsolve: 1.1.0
      giget: 2.0.0
      jiti: 2.7.0
      ohash: 2.0.11
      pathe: 2.0.3
      perfect-debounce: 1.0.0
      pkg-types: 2.3.1
      rc9: 2.1.2

  call-bind-apply-helpers@1.0.2:
    dependencies:
      es-errors: 1.3.0
      function-bind: 1.1.2

  call-bind@1.0.9:
    dependencies:
      call-bind-apply-helpers: 1.0.2
      es-define-property: 1.0.1
      get-intrinsic: 1.3.0
      set-function-length: 1.2.2

  call-bound@1.0.4:
    dependencies:
      call-bind-apply-helpers: 1.0.2
      get-intrinsic: 1.3.0

  callsites@3.1.0: {}

  camelcase-css@2.0.1: {}

  camelcase@5.3.1: {}

  caniuse-lite@1.0.30001802: {}

  chainsaw@0.1.0:
    dependencies:
      traverse: 0.3.9

  chalk@4.1.2:
    dependencies:
      ansi-styles: 4.3.0
      supports-color: 7.2.0

  chokidar@3.6.0:
    dependencies:
      anymatch: 3.1.3
      braces: 3.0.3
      glob-parent: 5.1.2
      is-binary-path: 2.1.0
      is-glob: 4.0.3
      normalize-path: 3.0.0
      readdirp: 3.6.0
    optionalDependencies:
      fsevents: 2.3.3

  chokidar@4.0.3:
    dependencies:
      readdirp: 4.1.2

  citty@0.1.6:
    dependencies:
      consola: 3.4.2

  citty@0.2.2: {}

  client-only@0.0.1: {}

  cliui@6.0.0:
    dependencies:
      string-width: 4.2.3
      strip-ansi: 6.0.1
      wrap-ansi: 6.2.0

  color-convert@2.0.1:
    dependencies:
      color-name: 1.1.4

  color-name@1.1.4: {}

  commander@4.1.1: {}

  compress-commons@4.1.2:
    dependencies:
      buffer-crc32: 0.2.13
      crc32-stream: 4.0.3
      normalize-path: 3.0.0
      readable-stream: 3.6.2

  concat-map@0.0.1: {}

  confbox@0.2.4: {}

  consola@3.4.2: {}

  core-util-is@1.0.3: {}

  crc-32@1.2.2: {}

  crc32-stream@4.0.3:
    dependencies:
      crc-32: 1.2.2
      readable-stream: 3.6.2

  cross-spawn@7.0.6:
    dependencies:
      path-key: 3.1.1
      shebang-command: 2.0.0
      which: 2.0.2

  cssesc@3.0.0: {}

  csstype@3.2.3: {}

  damerau-levenshtein@1.0.8: {}

  data-view-buffer@1.0.2:
    dependencies:
      call-bound: 1.0.4
      es-errors: 1.3.0
      is-data-view: 1.0.2

  data-view-byte-length@1.0.2:
    dependencies:
      call-bound: 1.0.4
      es-errors: 1.3.0
      is-data-view: 1.0.2

  data-view-byte-offset@1.0.1:
    dependencies:
      call-bound: 1.0.4
      es-errors: 1.3.0
      is-data-view: 1.0.2

  dayjs@1.11.21: {}

  debug@3.2.7:
    dependencies:
      ms: 2.1.3

  debug@4.4.3:
    dependencies:
      ms: 2.1.3

  decamelize@1.2.0: {}

  deep-is@0.1.4: {}

  deepmerge-ts@7.1.5: {}

  define-data-property@1.1.4:
    dependencies:
      es-define-property: 1.0.1
      es-errors: 1.3.0
      gopd: 1.2.0

  define-properties@1.2.1:
    dependencies:
      define-data-property: 1.1.4
      has-property-descriptors: 1.0.2
      object-keys: 1.1.1

  defu@6.1.7: {}

  destr@2.0.5: {}

  detect-libc@2.1.2:
    optional: true

  didyoumean@1.2.2: {}

  dijkstrajs@1.0.3: {}

  dlv@1.1.3: {}

  doctrine@2.1.0:
    dependencies:
      esutils: 2.0.3

  dotenv@16.6.1: {}

  dunder-proto@1.0.1:
    dependencies:
      call-bind-apply-helpers: 1.0.2
      es-errors: 1.3.0
      gopd: 1.2.0

  duplexer2@0.1.4:
    dependencies:
      readable-stream: 2.3.8

  echarts-for-react@3.0.6(echarts@6.1.0)(react@19.2.7):
    dependencies:
      echarts: 6.1.0
      fast-deep-equal: 3.1.3
      react: 19.2.7
      size-sensor: 1.0.3

  echarts@6.1.0:
    dependencies:
      tslib: 2.3.0
      zrender: 6.1.0

  effect@3.21.0:
    dependencies:
      '@standard-schema/spec': 1.1.0
      fast-check: 3.23.2

  electron-to-chromium@1.5.387: {}

  emoji-regex@8.0.0: {}

  emoji-regex@9.2.2: {}

  empathic@2.0.0: {}

  end-of-stream@1.4.5:
    dependencies:
      once: 1.4.0

  es-abstract-get@1.0.0:
    dependencies:
      es-errors: 1.3.0
      es-object-atoms: 1.1.2
      is-callable: 1.2.7
      object-inspect: 1.13.4

  es-abstract@1.24.2:
    dependencies:
      array-buffer-byte-length: 1.0.2
      arraybuffer.prototype.slice: 1.0.4
      available-typed-arrays: 1.0.7
      call-bind: 1.0.9
      call-bound: 1.0.4
      data-view-buffer: 1.0.2
      data-view-byte-length: 1.0.2
      data-view-byte-offset: 1.0.1
      es-define-property: 1.0.1
      es-errors: 1.3.0
      es-object-atoms: 1.1.2
      es-set-tostringtag: 2.1.0
      es-to-primitive: 1.3.4
      function.prototype.name: 1.2.0
      get-intrinsic: 1.3.0
      get-proto: 1.0.1
      get-symbol-description: 1.1.0
      globalthis: 1.0.4
      gopd: 1.2.0
      has-property-descriptors: 1.0.2
      has-proto: 1.2.0
      has-symbols: 1.1.0
      hasown: 2.0.4
      internal-slot: 1.1.0
      is-array-buffer: 3.0.5
      is-callable: 1.2.7
      is-data-view: 1.0.2
      is-negative-zero: 2.0.3
      is-regex: 1.2.1
      is-set: 2.0.3
      is-shared-array-buffer: 1.0.4
      is-string: 1.1.1
      is-typed-array: 1.1.15
      is-weakref: 1.1.1
      math-intrinsics: 1.1.0
      object-inspect: 1.13.4
      object-keys: 1.1.1
      object.assign: 4.1.7
      own-keys: 1.0.1
      regexp.prototype.flags: 1.5.4
      safe-array-concat: 1.1.4
      safe-push-apply: 1.0.0
      safe-regex-test: 1.1.0
      set-proto: 1.0.0
      stop-iteration-iterator: 1.1.0
      string.prototype.trim: 1.2.11
      string.prototype.trimend: 1.0.10
      string.prototype.trimstart: 1.0.8
      typed-array-buffer: 1.0.3
      typed-array-byte-length: 1.0.3
      typed-array-byte-offset: 1.0.4
      typed-array-length: 1.0.8
      unbox-primitive: 1.1.0
      which-typed-array: 1.1.22

  es-define-property@1.0.1: {}

  es-errors@1.3.0: {}

  es-iterator-helpers@1.3.3:
    dependencies:
      call-bind: 1.0.9
      call-bound: 1.0.4
      define-properties: 1.2.1
      es-abstract: 1.24.2
      es-errors: 1.3.0
      es-set-tostringtag: 2.1.0
      function-bind: 1.1.2
      get-intrinsic: 1.3.0
      globalthis: 1.0.4
      gopd: 1.2.0
      has-property-descriptors: 1.0.2
      has-proto: 1.2.0
      has-symbols: 1.1.0
      internal-slot: 1.1.0
      iterator.prototype: 1.1.5
      math-intrinsics: 1.1.0

  es-object-atoms@1.1.2:
    dependencies:
      es-errors: 1.3.0

  es-set-tostringtag@2.1.0:
    dependencies:
      es-errors: 1.3.0
      get-intrinsic: 1.3.0
      has-tostringtag: 1.0.2
      hasown: 2.0.4

  es-shim-unscopables@1.1.0:
    dependencies:
      hasown: 2.0.4

  es-to-primitive@1.3.4:
    dependencies:
      es-abstract-get: 1.0.0
      es-define-property: 1.0.1
      es-errors: 1.3.0
      is-callable: 1.2.7
      is-date-object: 1.1.0
      is-symbol: 1.1.1

  esbuild@0.28.1:
    optionalDependencies:
      '@esbuild/aix-ppc64': 0.28.1
      '@esbuild/android-arm': 0.28.1
      '@esbuild/android-arm64': 0.28.1
      '@esbuild/android-x64': 0.28.1
      '@esbuild/darwin-arm64': 0.28.1
      '@esbuild/darwin-x64': 0.28.1
      '@esbuild/freebsd-arm64': 0.28.1
      '@esbuild/freebsd-x64': 0.28.1
      '@esbuild/linux-arm': 0.28.1
      '@esbuild/linux-arm64': 0.28.1
      '@esbuild/linux-ia32': 0.28.1
      '@esbuild/linux-loong64': 0.28.1
      '@esbuild/linux-mips64el': 0.28.1
      '@esbuild/linux-ppc64': 0.28.1
      '@esbuild/linux-riscv64': 0.28.1
      '@esbuild/linux-s390x': 0.28.1
      '@esbuild/linux-x64': 0.28.1
      '@esbuild/netbsd-arm64': 0.28.1
      '@esbuild/netbsd-x64': 0.28.1
      '@esbuild/openbsd-arm64': 0.28.1
      '@esbuild/openbsd-x64': 0.28.1
      '@esbuild/openharmony-arm64': 0.28.1
      '@esbuild/sunos-x64': 0.28.1
      '@esbuild/win32-arm64': 0.28.1
      '@esbuild/win32-ia32': 0.28.1
      '@esbuild/win32-x64': 0.28.1

  escalade@3.2.0: {}

  escape-string-regexp@4.0.0: {}

  eslint-config-next@15.5.20(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3):
    dependencies:
      '@next/eslint-plugin-next': 15.5.20
      '@rushstack/eslint-patch': 1.16.1
      '@typescript-eslint/eslint-plugin': 8.63.0(@typescript-eslint/parser@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3))(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3)
      '@typescript-eslint/parser': 8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3)
      eslint: 9.39.4(jiti@1.21.7)
      eslint-import-resolver-node: 0.3.10
      eslint-import-resolver-typescript: 3.10.1(eslint-plugin-import@2.32.0(@typescript-eslint/parser@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3))(eslint@9.39.4(jiti@1.21.7)))(eslint@9.39.4(jiti@1.21.7))
      eslint-plugin-import: 2.32.0(@typescript-eslint/parser@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3))(eslint-import-resolver-typescript@3.10.1)(eslint@9.39.4(jiti@1.21.7))
      eslint-plugin-jsx-a11y: 6.10.2(eslint@9.39.4(jiti@1.21.7))
      eslint-plugin-react: 7.37.5(eslint@9.39.4(jiti@1.21.7))
      eslint-plugin-react-hooks: 5.2.0(eslint@9.39.4(jiti@1.21.7))
    optionalDependencies:
      typescript: 5.9.3
    transitivePeerDependencies:
      - eslint-import-resolver-webpack
      - eslint-plugin-import-x
      - supports-color

  eslint-import-resolver-node@0.3.10:
    dependencies:
      debug: 3.2.7
      is-core-module: 2.16.2
      resolve: 2.0.0-next.7
    transitivePeerDependencies:
      - supports-color

  eslint-import-resolver-typescript@3.10.1(eslint-plugin-import@2.32.0(@typescript-eslint/parser@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3))(eslint@9.39.4(jiti@1.21.7)))(eslint@9.39.4(jiti@1.21.7)):
    dependencies:
      '@nolyfill/is-core-module': 1.0.39
      debug: 4.4.3
      eslint: 9.39.4(jiti@1.21.7)
      get-tsconfig: 4.14.0
      is-bun-module: 2.0.0
      stable-hash: 0.0.5
      tinyglobby: 0.2.17
      unrs-resolver: 1.12.2
    optionalDependencies:
      eslint-plugin-import: 2.32.0(@typescript-eslint/parser@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3))(eslint-import-resolver-typescript@3.10.1)(eslint@9.39.4(jiti@1.21.7))
    transitivePeerDependencies:
      - supports-color

  eslint-module-utils@2.14.0(@typescript-eslint/parser@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3))(eslint-import-resolver-node@0.3.10)(eslint-import-resolver-typescript@3.10.1(eslint-plugin-import@2.32.0(@typescript-eslint/parser@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3))(eslint@9.39.4(jiti@1.21.7)))(eslint@9.39.4(jiti@1.21.7)))(eslint@9.39.4(jiti@1.21.7)):
    dependencies:
      debug: 3.2.7
    optionalDependencies:
      '@typescript-eslint/parser': 8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3)
      eslint: 9.39.4(jiti@1.21.7)
      eslint-import-resolver-node: 0.3.10
      eslint-import-resolver-typescript: 3.10.1(eslint-plugin-import@2.32.0(@typescript-eslint/parser@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3))(eslint@9.39.4(jiti@1.21.7)))(eslint@9.39.4(jiti@1.21.7))
    transitivePeerDependencies:
      - supports-color

  eslint-plugin-import@2.32.0(@typescript-eslint/parser@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3))(eslint-import-resolver-typescript@3.10.1)(eslint@9.39.4(jiti@1.21.7)):
    dependencies:
      '@rtsao/scc': 1.1.0
      array-includes: 3.1.9
      array.prototype.findlastindex: 1.2.6
      array.prototype.flat: 1.3.3
      array.prototype.flatmap: 1.3.3
      debug: 3.2.7
      doctrine: 2.1.0
      eslint: 9.39.4(jiti@1.21.7)
      eslint-import-resolver-node: 0.3.10
      eslint-module-utils: 2.14.0(@typescript-eslint/parser@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3))(eslint-import-resolver-node@0.3.10)(eslint-import-resolver-typescript@3.10.1(eslint-plugin-import@2.32.0(@typescript-eslint/parser@8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3))(eslint@9.39.4(jiti@1.21.7)))(eslint@9.39.4(jiti@1.21.7)))(eslint@9.39.4(jiti@1.21.7))
      hasown: 2.0.4
      is-core-module: 2.16.2
      is-glob: 4.0.3
      minimatch: 3.1.5
      object.fromentries: 2.0.8
      object.groupby: 1.0.3
      object.values: 1.2.1
      semver: 6.3.1
      string.prototype.trimend: 1.0.10
      tsconfig-paths: 3.15.0
    optionalDependencies:
      '@typescript-eslint/parser': 8.63.0(eslint@9.39.4(jiti@1.21.7))(typescript@5.9.3)
    transitivePeerDependencies:
      - eslint-import-resolver-typescript
      - eslint-import-resolver-webpack
      - supports-color

  eslint-plugin-jsx-a11y@6.10.2(eslint@9.39.4(jiti@1.21.7)):
    dependencies:
      aria-query: 5.3.2
      array-includes: 3.1.9
      array.prototype.flatmap: 1.3.3
      ast-types-flow: 0.0.8
      axe-core: 4.12.1
      axobject-query: 4.1.0
      damerau-levenshtein: 1.0.8
      emoji-regex: 9.2.2
      eslint: 9.39.4(jiti@1.21.7)
      hasown: 2.0.4
      jsx-ast-utils: 3.3.5
      language-tags: 1.0.9
      minimatch: 3.1.5
      object.fromentries: 2.0.8
      safe-regex-test: 1.1.0
      string.prototype.includes: 2.0.1

  eslint-plugin-react-hooks@5.2.0(eslint@9.39.4(jiti@1.21.7)):
    dependencies:
      eslint: 9.39.4(jiti@1.21.7)

  eslint-plugin-react@7.37.5(eslint@9.39.4(jiti@1.21.7)):
    dependencies:
      array-includes: 3.1.9
      array.prototype.findlast: 1.2.5
      array.prototype.flatmap: 1.3.3
      array.prototype.tosorted: 1.1.4
      doctrine: 2.1.0
      es-iterator-helpers: 1.3.3
      eslint: 9.39.4(jiti@1.21.7)
      estraverse: 5.3.0
      hasown: 2.0.4
      jsx-ast-utils: 3.3.5
      minimatch: 3.1.5
      object.entries: 1.1.9
      object.fromentries: 2.0.8
      object.values: 1.2.1
      prop-types: 15.8.1
      resolve: 2.0.0-next.7
      semver: 6.3.1
      string.prototype.matchall: 4.0.12
      string.prototype.repeat: 1.0.0

  eslint-scope@8.4.0:
    dependencies:
      esrecurse: 4.3.0
      estraverse: 5.3.0

  eslint-visitor-keys@3.4.3: {}

  eslint-visitor-keys@4.2.1: {}

  eslint-visitor-keys@5.0.1: {}

  eslint@9.39.4(jiti@1.21.7):
    dependencies:
      '@eslint-community/eslint-utils': 4.9.1(eslint@9.39.4(jiti@1.21.7))
      '@eslint-community/regexpp': 4.12.2
      '@eslint/config-array': 0.21.2
      '@eslint/config-helpers': 0.4.2
      '@eslint/core': 0.17.0
      '@eslint/eslintrc': 3.3.5
      '@eslint/js': 9.39.4
      '@eslint/plugin-kit': 0.4.1
      '@humanfs/node': 0.16.8
      '@humanwhocodes/module-importer': 1.0.1
      '@humanwhocodes/retry': 0.4.3
      '@types/estree': 1.0.9
      ajv: 6.15.0
      chalk: 4.1.2
      cross-spawn: 7.0.6
      debug: 4.4.3
      escape-string-regexp: 4.0.0
      eslint-scope: 8.4.0
      eslint-visitor-keys: 4.2.1
      espree: 10.4.0
      esquery: 1.7.0
      esutils: 2.0.3
      fast-deep-equal: 3.1.3
      file-entry-cache: 8.0.0
      find-up: 5.0.0
      glob-parent: 6.0.2
      ignore: 5.3.2
      imurmurhash: 0.1.4
      is-glob: 4.0.3
      json-stable-stringify-without-jsonify: 1.0.1
      lodash.merge: 4.6.2
      minimatch: 3.1.5
      natural-compare: 1.4.0
      optionator: 0.9.4
    optionalDependencies:
      jiti: 1.21.7
    transitivePeerDependencies:
      - supports-color

  espree@10.4.0:
    dependencies:
      acorn: 8.17.0
      acorn-jsx: 5.3.2(acorn@8.17.0)
      eslint-visitor-keys: 4.2.1

  esquery@1.7.0:
    dependencies:
      estraverse: 5.3.0

  esrecurse@4.3.0:
    dependencies:
      estraverse: 5.3.0

  estraverse@5.3.0: {}

  esutils@2.0.3: {}

  exceljs@4.4.0:
    dependencies:
      archiver: 5.3.2
      dayjs: 1.11.21
      fast-csv: 4.3.6
      jszip: 3.10.1
      readable-stream: 3.6.2
      saxes: 5.0.1
      tmp: 0.2.7
      unzipper: 0.10.14
      uuid: 8.3.2

  execa@5.1.1:
    dependencies:
      cross-spawn: 7.0.6
      get-stream: 6.0.1
      human-signals: 2.1.0
      is-stream: 2.0.1
      merge-stream: 2.0.0
      npm-run-path: 4.0.1
      onetime: 5.1.2
      signal-exit: 3.0.7
      strip-final-newline: 2.0.0

  exsolve@1.1.0: {}

  fast-check@3.23.2:
    dependencies:
      pure-rand: 6.1.0

  fast-csv@4.3.6:
    dependencies:
      '@fast-csv/format': 4.3.5
      '@fast-csv/parse': 4.3.6

  fast-deep-equal@3.1.3: {}

  fast-glob@3.3.1:
    dependencies:
      '@nodelib/fs.stat': 2.0.5
      '@nodelib/fs.walk': 1.2.8
      glob-parent: 5.1.2
      merge2: 1.4.1
      micromatch: 4.0.8

  fast-glob@3.3.3:
    dependencies:
      '@nodelib/fs.stat': 2.0.5
      '@nodelib/fs.walk': 1.2.8
      glob-parent: 5.1.2
      merge2: 1.4.1
      micromatch: 4.0.8

  fast-json-stable-stringify@2.1.0: {}

  fast-levenshtein@2.0.6: {}

  fastq@1.20.1:
    dependencies:
      reusify: 1.1.0

  fdir@6.5.0(picomatch@4.0.5):
    optionalDependencies:
      picomatch: 4.0.5

  file-entry-cache@8.0.0:
    dependencies:
      flat-cache: 4.0.1

  fill-range@7.1.1:
    dependencies:
      to-regex-range: 5.0.1

  find-up@4.1.0:
    dependencies:
      locate-path: 5.0.0
      path-exists: 4.0.0

  find-up@5.0.0:
    dependencies:
      locate-path: 6.0.0
      path-exists: 4.0.0

  flat-cache@4.0.1:
    dependencies:
      flatted: 3.4.2
      keyv: 4.5.4

  flatted@3.4.2: {}

  for-each@0.3.5:
    dependencies:
      is-callable: 1.2.7

  fraction.js@5.3.4: {}

  fs-constants@1.0.0: {}

  fs.realpath@1.0.0: {}

  fsevents@2.3.3:
    optional: true

  fstream@1.0.12:
    dependencies:
      graceful-fs: 4.2.11
      inherits: 2.0.4
      mkdirp: 0.5.6
      rimraf: 2.7.1

  function-bind@1.1.2: {}

  function.prototype.name@1.2.0:
    dependencies:
      call-bind: 1.0.9
      call-bound: 1.0.4
      es-define-property: 1.0.1
      es-errors: 1.3.0
      functions-have-names: 1.2.3
      has-property-descriptors: 1.0.2
      hasown: 2.0.4
      is-callable: 1.2.7
      is-document.all: 1.0.0

  functions-have-names@1.2.3: {}

  generator-function@2.0.1: {}

  get-caller-file@2.0.5: {}

  get-intrinsic@1.3.0:
    dependencies:
      call-bind-apply-helpers: 1.0.2
      es-define-property: 1.0.1
      es-errors: 1.3.0
      es-object-atoms: 1.1.2
      function-bind: 1.1.2
      get-proto: 1.0.1
      gopd: 1.2.0
      has-symbols: 1.1.0
      hasown: 2.0.4
      math-intrinsics: 1.1.0

  get-proto@1.0.1:
    dependencies:
      dunder-proto: 1.0.1
      es-object-atoms: 1.1.2

  get-stream@6.0.1: {}

  get-symbol-description@1.1.0:
    dependencies:
      call-bound: 1.0.4
      es-errors: 1.3.0
      get-intrinsic: 1.3.0

  get-tsconfig@4.14.0:
    dependencies:
      resolve-pkg-maps: 1.0.0

  giget@2.0.0:
    dependencies:
      citty: 0.1.6
      consola: 3.4.2
      defu: 6.1.7
      node-fetch-native: 1.6.7
      nypm: 0.6.8
      pathe: 2.0.3

  glob-parent@5.1.2:
    dependencies:
      is-glob: 4.0.3

  glob-parent@6.0.2:
    dependencies:
      is-glob: 4.0.3

  glob@7.2.3:
    dependencies:
      fs.realpath: 1.0.0
      inflight: 1.0.6
      inherits: 2.0.4
      minimatch: 3.1.5
      once: 1.4.0
      path-is-absolute: 1.0.1

  globals@14.0.0: {}

  globalthis@1.0.4:
    dependencies:
      define-properties: 1.2.1
      gopd: 1.2.0

  gopd@1.2.0: {}

  graceful-fs@4.2.11: {}

  has-bigints@1.1.0: {}

  has-flag@4.0.0: {}

  has-property-descriptors@1.0.2:
    dependencies:
      es-define-property: 1.0.1

  has-proto@1.2.0:
    dependencies:
      dunder-proto: 1.0.1

  has-symbols@1.1.0: {}

  has-tostringtag@1.0.2:
    dependencies:
      has-symbols: 1.1.0

  hasown@2.0.4:
    dependencies:
      function-bind: 1.1.2

  human-signals@2.1.0: {}

  ieee754@1.2.1: {}

  ignore@5.3.2: {}

  ignore@7.0.5: {}

  immediate@3.0.6: {}

  import-fresh@3.3.1:
    dependencies:
      parent-module: 1.0.1
      resolve-from: 4.0.0

  imurmurhash@0.1.4: {}

  inflight@1.0.6:
    dependencies:
      once: 1.4.0
      wrappy: 1.0.2

  inherits@2.0.4: {}

  internal-slot@1.1.0:
    dependencies:
      es-errors: 1.3.0
      hasown: 2.0.4
      side-channel: 1.1.1

  is-array-buffer@3.0.5:
    dependencies:
      call-bind: 1.0.9
      call-bound: 1.0.4
      get-intrinsic: 1.3.0

  is-async-function@2.1.1:
    dependencies:
      async-function: 1.0.0
      call-bound: 1.0.4
      get-proto: 1.0.1
      has-tostringtag: 1.0.2
      safe-regex-test: 1.1.0

  is-bigint@1.1.0:
    dependencies:
      has-bigints: 1.1.0

  is-binary-path@2.1.0:
    dependencies:
      binary-extensions: 2.3.0

  is-boolean-object@1.2.2:
    dependencies:
      call-bound: 1.0.4
      has-tostringtag: 1.0.2

  is-buffer@2.0.5: {}

  is-bun-module@2.0.0:
    dependencies:
      semver: 7.8.5

  is-callable@1.2.7: {}

  is-core-module@2.16.2:
    dependencies:
      hasown: 2.0.4

  is-data-view@1.0.2:
    dependencies:
      call-bound: 1.0.4
      get-intrinsic: 1.3.0
      is-typed-array: 1.1.15

  is-date-object@1.1.0:
    dependencies:
      call-bound: 1.0.4
      has-tostringtag: 1.0.2

  is-document.all@1.0.0:
    dependencies:
      call-bound: 1.0.4

  is-extglob@2.1.1: {}

  is-finalizationregistry@1.1.1:
    dependencies:
      call-bound: 1.0.4

  is-fullwidth-code-point@3.0.0: {}

  is-generator-function@1.1.2:
    dependencies:
      call-bound: 1.0.4
      generator-function: 2.0.1
      get-proto: 1.0.1
      has-tostringtag: 1.0.2
      safe-regex-test: 1.1.0

  is-glob@4.0.3:
    dependencies:
      is-extglob: 2.1.1

  is-map@2.0.3: {}

  is-negative-zero@2.0.3: {}

  is-node-process@1.2.0: {}

  is-number-object@1.1.1:
    dependencies:
      call-bound: 1.0.4
      has-tostringtag: 1.0.2

  is-number@7.0.0: {}

  is-regex@1.2.1:
    dependencies:
      call-bound: 1.0.4
      gopd: 1.2.0
      has-tostringtag: 1.0.2
      hasown: 2.0.4

  is-set@2.0.3: {}

  is-shared-array-buffer@1.0.4:
    dependencies:
      call-bound: 1.0.4

  is-stream@2.0.1: {}

  is-string@1.1.1:
    dependencies:
      call-bound: 1.0.4
      has-tostringtag: 1.0.2

  is-symbol@1.1.1:
    dependencies:
      call-bound: 1.0.4
      has-symbols: 1.1.0
      safe-regex-test: 1.1.0

  is-typed-array@1.1.15:
    dependencies:
      which-typed-array: 1.1.22

  is-weakmap@2.0.2: {}

  is-weakref@1.1.1:
    dependencies:
      call-bound: 1.0.4

  is-weakset@2.0.4:
    dependencies:
      call-bound: 1.0.4
      get-intrinsic: 1.3.0

  isarray@1.0.0: {}

  isarray@2.0.5: {}

  isexe@2.0.0: {}

  iterator.prototype@1.1.5:
    dependencies:
      define-data-property: 1.1.4
      es-object-atoms: 1.1.2
      get-intrinsic: 1.3.0
      get-proto: 1.0.1
      has-symbols: 1.1.0
      set-function-name: 2.0.2

  jiti@1.21.7: {}

  jiti@2.7.0: {}

  jose@5.10.0: {}

  js-tokens@4.0.0: {}

  js-yaml@4.3.0:
    dependencies:
      argparse: 2.0.1

  json-buffer@3.0.1: {}

  json-schema-traverse@0.4.1: {}

  json-stable-stringify-without-jsonify@1.0.1: {}

  json5@1.0.2:
    dependencies:
      minimist: 1.2.8

  jsx-ast-utils@3.3.5:
    dependencies:
      array-includes: 3.1.9
      array.prototype.flat: 1.3.3
      object.assign: 4.1.7
      object.values: 1.2.1

  jszip@3.10.1:
    dependencies:
      lie: 3.3.0
      pako: 1.0.11
      readable-stream: 2.3.8
      setimmediate: 1.0.5

  keyv@4.5.4:
    dependencies:
      json-buffer: 3.0.1

  language-subtag-registry@0.3.23: {}

  language-tags@1.0.9:
    dependencies:
      language-subtag-registry: 0.3.23

  lazystream@1.0.1:
    dependencies:
      readable-stream: 2.3.8

  levn@0.4.1:
    dependencies:
      prelude-ls: 1.2.1
      type-check: 0.4.0

  lie@3.3.0:
    dependencies:
      immediate: 3.0.6

  lilconfig@3.1.3: {}

  lines-and-columns@1.2.4: {}

  listenercount@1.0.1: {}

  locate-path@5.0.0:
    dependencies:
      p-locate: 4.1.0

  locate-path@6.0.0:
    dependencies:
      p-locate: 5.0.0

  lodash.defaults@4.2.0: {}

  lodash.difference@4.5.0: {}

  lodash.escaperegexp@4.1.2: {}

  lodash.flatten@4.4.0: {}

  lodash.groupby@4.6.0: {}

  lodash.isboolean@3.0.3: {}

  lodash.isequal@4.5.0: {}

  lodash.isfunction@3.0.9: {}

  lodash.isnil@4.0.0: {}

  lodash.isplainobject@4.0.6: {}

  lodash.isundefined@3.0.1: {}

  lodash.merge@4.6.2: {}

  lodash.union@4.6.0: {}

  lodash.uniq@4.5.0: {}

  loose-envify@1.4.0:
    dependencies:
      js-tokens: 4.0.0

  lucide-react@0.468.0(react@19.2.7):
    dependencies:
      react: 19.2.7

  math-intrinsics@1.1.0: {}

  merge-stream@2.0.0: {}

  merge2@1.4.1: {}

  micromatch@4.0.8:
    dependencies:
      braces: 3.0.3
      picomatch: 2.3.2

  mimic-fn@2.1.0: {}

  minimatch@10.2.5:
    dependencies:
      brace-expansion: 5.0.7

  minimatch@3.1.5:
    dependencies:
      brace-expansion: 1.1.15

  minimatch@5.1.9:
    dependencies:
      brace-expansion: 2.1.1

  minimist@1.2.8: {}

  mkdirp@0.5.6:
    dependencies:
      minimist: 1.2.8

  ms@2.1.3: {}

  mz@2.7.0:
    dependencies:
      any-promise: 1.3.0
      object-assign: 4.1.1
      thenify-all: 1.6.0

  nanoid@3.3.15: {}

  napi-postinstall@0.3.4: {}

  natural-compare@1.4.0: {}

  next-themes@0.4.6(react-dom@19.2.7(react@19.2.7))(react@19.2.7):
    dependencies:
      react: 19.2.7
      react-dom: 19.2.7(react@19.2.7)

  next@15.5.20(react-dom@19.2.7(react@19.2.7))(react@19.2.7):
    dependencies:
      '@next/env': 15.5.20
      '@swc/helpers': 0.5.15
      caniuse-lite: 1.0.30001802
      postcss: 8.4.31
      react: 19.2.7
      react-dom: 19.2.7(react@19.2.7)
      styled-jsx: 5.1.6(react@19.2.7)
    optionalDependencies:
      '@next/swc-darwin-arm64': 15.5.20
      '@next/swc-darwin-x64': 15.5.20
      '@next/swc-linux-arm64-gnu': 15.5.20
      '@next/swc-linux-arm64-musl': 15.5.20
      '@next/swc-linux-x64-gnu': 15.5.20
      '@next/swc-linux-x64-musl': 15.5.20
      '@next/swc-win32-arm64-msvc': 15.5.20
      '@next/swc-win32-x64-msvc': 15.5.20
      sharp: 0.34.5
    transitivePeerDependencies:
      - '@babel/core'
      - babel-plugin-macros

  node-exports-info@1.6.2:
    dependencies:
      array.prototype.flatmap: 1.3.3
      es-errors: 1.3.0
      object.entries: 1.1.9
      semver: 6.3.1

  node-fetch-native@1.6.7: {}

  node-releases@2.0.50: {}

  normalize-path@3.0.0: {}

  npm-run-path@4.0.1:
    dependencies:
      path-key: 3.1.1

  nypm@0.6.8:
    dependencies:
      citty: 0.2.2
      pathe: 2.0.3
      tinyexec: 1.2.4

  object-assign@4.1.1: {}

  object-hash@3.0.0: {}

  object-inspect@1.13.4: {}

  object-keys@1.1.1: {}

  object.assign@4.1.7:
    dependencies:
      call-bind: 1.0.9
      call-bound: 1.0.4
      define-properties: 1.2.1
      es-object-atoms: 1.1.2
      has-symbols: 1.1.0
      object-keys: 1.1.1

  object.entries@1.1.9:
    dependencies:
      call-bind: 1.0.9
      call-bound: 1.0.4
      define-properties: 1.2.1
      es-object-atoms: 1.1.2

  object.fromentries@2.0.8:
    dependencies:
      call-bind: 1.0.9
      define-properties: 1.2.1
      es-abstract: 1.24.2
      es-object-atoms: 1.1.2

  object.groupby@1.0.3:
    dependencies:
      call-bind: 1.0.9
      define-properties: 1.2.1
      es-abstract: 1.24.2

  object.values@1.2.1:
    dependencies:
      call-bind: 1.0.9
      call-bound: 1.0.4
      define-properties: 1.2.1
      es-object-atoms: 1.1.2

  ohash@2.0.11: {}

  once@1.4.0:
    dependencies:
      wrappy: 1.0.2

  onetime@5.1.2:
    dependencies:
      mimic-fn: 2.1.0

  optionator@0.9.4:
    dependencies:
      deep-is: 0.1.4
      fast-levenshtein: 2.0.6
      levn: 0.4.1
      prelude-ls: 1.2.1
      type-check: 0.4.0
      word-wrap: 1.2.5

  os-paths@4.4.0: {}

  own-keys@1.0.1:
    dependencies:
      get-intrinsic: 1.3.0
      object-keys: 1.1.1
      safe-push-apply: 1.0.0

  p-limit@2.3.0:
    dependencies:
      p-try: 2.2.0

  p-limit@3.1.0:
    dependencies:
      yocto-queue: 0.1.0

  p-locate@4.1.0:
    dependencies:
      p-limit: 2.3.0

  p-locate@5.0.0:
    dependencies:
      p-limit: 3.1.0

  p-try@2.2.0: {}

  pako@1.0.11: {}

  parent-module@1.0.1:
    dependencies:
      callsites: 3.1.0

  path-exists@4.0.0: {}

  path-is-absolute@1.0.1: {}

  path-key@3.1.1: {}

  path-parse@1.0.7: {}

  pathe@2.0.3: {}

  perfect-debounce@1.0.0: {}

  picocolors@1.1.1: {}

  picomatch@2.3.2: {}

  picomatch@4.0.5: {}

  pify@2.3.0: {}

  pirates@4.0.7: {}

  pkg-types@2.3.1:
    dependencies:
      confbox: 0.2.4
      exsolve: 1.1.0
      pathe: 2.0.3

  pngjs@5.0.0: {}

  possible-typed-array-names@1.1.0: {}

  postcss-import@15.1.0(postcss@8.5.16):
    dependencies:
      postcss: 8.5.16
      postcss-value-parser: 4.2.0
      read-cache: 1.0.0
      resolve: 1.22.12

  postcss-js@4.1.0(postcss@8.5.16):
    dependencies:
      camelcase-css: 2.0.1
      postcss: 8.5.16

  postcss-load-config@6.0.1(jiti@1.21.7)(postcss@8.5.16)(tsx@4.23.0):
    dependencies:
      lilconfig: 3.1.3
    optionalDependencies:
      jiti: 1.21.7
      postcss: 8.5.16
      tsx: 4.23.0

  postcss-nested@6.2.0(postcss@8.5.16):
    dependencies:
      postcss: 8.5.16
      postcss-selector-parser: 6.1.4

  postcss-selector-parser@6.1.4:
    dependencies:
      cssesc: 3.0.0
      util-deprecate: 1.0.2

  postcss-value-parser@4.2.0: {}

  postcss@8.4.31:
    dependencies:
      nanoid: 3.3.15
      picocolors: 1.1.1
      source-map-js: 1.2.1

  postcss@8.5.16:
    dependencies:
      nanoid: 3.3.15
      picocolors: 1.1.1
      source-map-js: 1.2.1

  prelude-ls@1.2.1: {}

  prisma@6.19.3(typescript@5.9.3):
    dependencies:
      '@prisma/config': 6.19.3
      '@prisma/engines': 6.19.3
    optionalDependencies:
      typescript: 5.9.3
    transitivePeerDependencies:
      - magicast

  process-nextick-args@2.0.1: {}

  prop-types@15.8.1:
    dependencies:
      loose-envify: 1.4.0
      object-assign: 4.1.1
      react-is: 16.13.1

  punycode@2.3.1: {}

  pure-rand@6.1.0: {}

  qrcode@1.5.4:
    dependencies:
      dijkstrajs: 1.0.3
      pngjs: 5.0.0
      yargs: 15.4.1

  queue-microtask@1.2.3: {}

  rc9@2.1.2:
    dependencies:
      defu: 6.1.7
      destr: 2.0.5

  react-dom@19.2.7(react@19.2.7):
    dependencies:
      react: 19.2.7
      scheduler: 0.27.0

  react-is@16.13.1: {}

  react@19.2.7: {}

  read-cache@1.0.0:
    dependencies:
      pify: 2.3.0

  readable-stream@2.3.8:
    dependencies:
      core-util-is: 1.0.3
      inherits: 2.0.4
      isarray: 1.0.0
      process-nextick-args: 2.0.1
      safe-buffer: 5.1.2
      string_decoder: 1.1.1
      util-deprecate: 1.0.2

  readable-stream@3.6.2:
    dependencies:
      inherits: 2.0.4
      string_decoder: 1.3.0
      util-deprecate: 1.0.2

  readdir-glob@1.1.3:
    dependencies:
      minimatch: 5.1.9

  readdirp@3.6.0:
    dependencies:
      picomatch: 2.3.2

  readdirp@4.1.2: {}

  reflect.getprototypeof@1.0.10:
    dependencies:
      call-bind: 1.0.9
      define-properties: 1.2.1
      es-abstract: 1.24.2
      es-errors: 1.3.0
      es-object-atoms: 1.1.2
      get-intrinsic: 1.3.0
      get-proto: 1.0.1
      which-builtin-type: 1.2.1

  regexp.prototype.flags@1.5.4:
    dependencies:
      call-bind: 1.0.9
      define-properties: 1.2.1
      es-errors: 1.3.0
      get-proto: 1.0.1
      gopd: 1.2.0
      set-function-name: 2.0.2

  require-directory@2.1.1: {}

  require-main-filename@2.0.0: {}

  resolve-from@4.0.0: {}

  resolve-pkg-maps@1.0.0: {}

  resolve@1.22.12:
    dependencies:
      es-errors: 1.3.0
      is-core-module: 2.16.2
      path-parse: 1.0.7
      supports-preserve-symlinks-flag: 1.0.0

  resolve@2.0.0-next.7:
    dependencies:
      es-errors: 1.3.0
      is-core-module: 2.16.2
      node-exports-info: 1.6.2
      object-keys: 1.1.1
      path-parse: 1.0.7
      supports-preserve-symlinks-flag: 1.0.0

  retry@0.13.1: {}

  reusify@1.1.0: {}

  rimraf@2.7.1:
    dependencies:
      glob: 7.2.3

  run-parallel@1.2.0:
    dependencies:
      queue-microtask: 1.2.3

  safe-array-concat@1.1.4:
    dependencies:
      call-bind: 1.0.9
      call-bound: 1.0.4
      get-intrinsic: 1.3.0
      has-symbols: 1.1.0
      isarray: 2.0.5

  safe-buffer@5.1.2: {}

  safe-buffer@5.2.1: {}

  safe-push-apply@1.0.0:
    dependencies:
      es-errors: 1.3.0
      isarray: 2.0.5

  safe-regex-test@1.1.0:
    dependencies:
      call-bound: 1.0.4
      es-errors: 1.3.0
      is-regex: 1.2.1

  saxes@5.0.1:
    dependencies:
      xmlchars: 2.2.0

  scheduler@0.27.0: {}

  semver@6.3.1: {}

  semver@7.8.5: {}

  set-blocking@2.0.0: {}

  set-function-length@1.2.2:
    dependencies:
      define-data-property: 1.1.4
      es-errors: 1.3.0
      function-bind: 1.1.2
      get-intrinsic: 1.3.0
      gopd: 1.2.0
      has-property-descriptors: 1.0.2

  set-function-name@2.0.2:
    dependencies:
      define-data-property: 1.1.4
      es-errors: 1.3.0
      functions-have-names: 1.2.3
      has-property-descriptors: 1.0.2

  set-proto@1.0.0:
    dependencies:
      dunder-proto: 1.0.1
      es-errors: 1.3.0
      es-object-atoms: 1.1.2

  setimmediate@1.0.5: {}

  sharp@0.34.5:
    dependencies:
      '@img/colour': 1.1.0
      detect-libc: 2.1.2
      semver: 7.8.5
    optionalDependencies:
      '@img/sharp-darwin-arm64': 0.34.5
      '@img/sharp-darwin-x64': 0.34.5
      '@img/sharp-libvips-darwin-arm64': 1.2.4
      '@img/sharp-libvips-darwin-x64': 1.2.4
      '@img/sharp-libvips-linux-arm': 1.2.4
      '@img/sharp-libvips-linux-arm64': 1.2.4
      '@img/sharp-libvips-linux-ppc64': 1.2.4
      '@img/sharp-libvips-linux-riscv64': 1.2.4
      '@img/sharp-libvips-linux-s390x': 1.2.4
      '@img/sharp-libvips-linux-x64': 1.2.4
      '@img/sharp-libvips-linuxmusl-arm64': 1.2.4
      '@img/sharp-libvips-linuxmusl-x64': 1.2.4
      '@img/sharp-linux-arm': 0.34.5
      '@img/sharp-linux-arm64': 0.34.5
      '@img/sharp-linux-ppc64': 0.34.5
      '@img/sharp-linux-riscv64': 0.34.5
      '@img/sharp-linux-s390x': 0.34.5
      '@img/sharp-linux-x64': 0.34.5
      '@img/sharp-linuxmusl-arm64': 0.34.5
      '@img/sharp-linuxmusl-x64': 0.34.5
      '@img/sharp-wasm32': 0.34.5
      '@img/sharp-win32-arm64': 0.34.5
      '@img/sharp-win32-ia32': 0.34.5
      '@img/sharp-win32-x64': 0.34.5
    optional: true

  shebang-command@2.0.0:
    dependencies:
      shebang-regex: 3.0.0

  shebang-regex@3.0.0: {}

  side-channel-list@1.0.1:
    dependencies:
      es-errors: 1.3.0
      object-inspect: 1.13.4

  side-channel-map@1.0.1:
    dependencies:
      call-bound: 1.0.4
      es-errors: 1.3.0
      get-intrinsic: 1.3.0
      object-inspect: 1.13.4

  side-channel-weakmap@1.0.2:
    dependencies:
      call-bound: 1.0.4
      es-errors: 1.3.0
      get-intrinsic: 1.3.0
      object-inspect: 1.13.4
      side-channel-map: 1.0.1

  side-channel@1.1.1:
    dependencies:
      es-errors: 1.3.0
      object-inspect: 1.13.4
      side-channel-list: 1.0.1
      side-channel-map: 1.0.1
      side-channel-weakmap: 1.0.2

  signal-exit@3.0.7: {}

  size-sensor@1.0.3: {}

  source-map-js@1.2.1: {}

  stable-hash@0.0.5: {}

  stop-iteration-iterator@1.1.0:
    dependencies:
      es-errors: 1.3.0
      internal-slot: 1.1.0

  string-width@4.2.3:
    dependencies:
      emoji-regex: 8.0.0
      is-fullwidth-code-point: 3.0.0
      strip-ansi: 6.0.1

  string.prototype.includes@2.0.1:
    dependencies:
      call-bind: 1.0.9
      define-properties: 1.2.1
      es-abstract: 1.24.2

  string.prototype.matchall@4.0.12:
    dependencies:
      call-bind: 1.0.9
      call-bound: 1.0.4
      define-properties: 1.2.1
      es-abstract: 1.24.2
      es-errors: 1.3.0
      es-object-atoms: 1.1.2
      get-intrinsic: 1.3.0
      gopd: 1.2.0
      has-symbols: 1.1.0
      internal-slot: 1.1.0
      regexp.prototype.flags: 1.5.4
      set-function-name: 2.0.2
      side-channel: 1.1.1

  string.prototype.repeat@1.0.0:
    dependencies:
      define-properties: 1.2.1
      es-abstract: 1.24.2

  string.prototype.trim@1.2.11:
    dependencies:
      call-bind: 1.0.9
      call-bound: 1.0.4
      define-data-property: 1.1.4
      define-properties: 1.2.1
      es-abstract: 1.24.2
      es-object-atoms: 1.1.2
      has-property-descriptors: 1.0.2
      safe-regex-test: 1.1.0

  string.prototype.trimend@1.0.10:
    dependencies:
      call-bind: 1.0.9
      call-bound: 1.0.4
      define-properties: 1.2.1
      es-object-atoms: 1.1.2

  string.prototype.trimstart@1.0.8:
    dependencies:
      call-bind: 1.0.9
      define-properties: 1.2.1
      es-object-atoms: 1.1.2

  string_decoder@1.1.1:
    dependencies:
      safe-buffer: 5.1.2

  string_decoder@1.3.0:
    dependencies:
      safe-buffer: 5.2.1

  strip-ansi@6.0.1:
    dependencies:
      ansi-regex: 5.0.1

  strip-bom@3.0.0: {}

  strip-final-newline@2.0.0: {}

  strip-json-comments@3.1.1: {}

  styled-jsx@5.1.6(react@19.2.7):
    dependencies:
      client-only: 0.0.1
      react: 19.2.7

  sucrase@3.35.1:
    dependencies:
      '@jridgewell/gen-mapping': 0.3.13
      commander: 4.1.1
      lines-and-columns: 1.2.4
      mz: 2.7.0
      pirates: 4.0.7
      tinyglobby: 0.2.17
      ts-interface-checker: 0.1.13

  supports-color@7.2.0:
    dependencies:
      has-flag: 4.0.0

  supports-preserve-symlinks-flag@1.0.0: {}

  tailwindcss@3.4.19(tsx@4.23.0):
    dependencies:
      '@alloc/quick-lru': 5.2.0
      arg: 5.0.2
      chokidar: 3.6.0
      didyoumean: 1.2.2
      dlv: 1.1.3
      fast-glob: 3.3.3
      glob-parent: 6.0.2
      is-glob: 4.0.3
      jiti: 1.21.7
      lilconfig: 3.1.3
      micromatch: 4.0.8
      normalize-path: 3.0.0
      object-hash: 3.0.0
      picocolors: 1.1.1
      postcss: 8.5.16
      postcss-import: 15.1.0(postcss@8.5.16)
      postcss-js: 4.1.0(postcss@8.5.16)
      postcss-load-config: 6.0.1(jiti@1.21.7)(postcss@8.5.16)(tsx@4.23.0)
      postcss-nested: 6.2.0(postcss@8.5.16)
      postcss-selector-parser: 6.1.4
      resolve: 1.22.12
      sucrase: 3.35.1
    transitivePeerDependencies:
      - tsx
      - yaml

  tar-stream@2.2.0:
    dependencies:
      bl: 4.1.0
      end-of-stream: 1.4.5
      fs-constants: 1.0.0
      inherits: 2.0.4
      readable-stream: 3.6.2

  thenify-all@1.6.0:
    dependencies:
      thenify: 3.3.1

  thenify@3.3.1:
    dependencies:
      any-promise: 1.3.0

  throttleit@2.1.0: {}

  tinyexec@1.2.4: {}

  tinyglobby@0.2.17:
    dependencies:
      fdir: 6.5.0(picomatch@4.0.5)
      picomatch: 4.0.5

  tmp@0.2.7: {}

  to-regex-range@5.0.1:
    dependencies:
      is-number: 7.0.0

  traverse@0.3.9: {}

  ts-api-utils@2.5.0(typescript@5.9.3):
    dependencies:
      typescript: 5.9.3

  ts-interface-checker@0.1.13: {}

  tsconfig-paths@3.15.0:
    dependencies:
      '@types/json5': 0.0.29
      json5: 1.0.2
      minimist: 1.2.8
      strip-bom: 3.0.0

  tslib@2.3.0: {}

  tslib@2.8.1: {}

  tsx@4.23.0:
    dependencies:
      esbuild: 0.28.1
    optionalDependencies:
      fsevents: 2.3.3

  type-check@0.4.0:
    dependencies:
      prelude-ls: 1.2.1

  typed-array-buffer@1.0.3:
    dependencies:
      call-bound: 1.0.4
      es-errors: 1.3.0
      is-typed-array: 1.1.15

  typed-array-byte-length@1.0.3:
    dependencies:
      call-bind: 1.0.9
      for-each: 0.3.5
      gopd: 1.2.0
      has-proto: 1.2.0
      is-typed-array: 1.1.15

  typed-array-byte-offset@1.0.4:
    dependencies:
      available-typed-arrays: 1.0.7
      call-bind: 1.0.9
      for-each: 0.3.5
      gopd: 1.2.0
      has-proto: 1.2.0
      is-typed-array: 1.1.15
      reflect.getprototypeof: 1.0.10

  typed-array-length@1.0.8:
    dependencies:
      call-bind: 1.0.9
      for-each: 0.3.5
      gopd: 1.2.0
      is-typed-array: 1.1.15
      possible-typed-array-names: 1.1.0
      reflect.getprototypeof: 1.0.10

  typescript@5.9.3: {}

  unbox-primitive@1.1.0:
    dependencies:
      call-bound: 1.0.4
      has-bigints: 1.1.0
      has-symbols: 1.1.0
      which-boxed-primitive: 1.1.1

  undici-types@6.21.0: {}

  undici@6.27.0: {}

  unrs-resolver@1.12.2:
    dependencies:
      napi-postinstall: 0.3.4
    optionalDependencies:
      '@unrs/resolver-binding-android-arm-eabi': 1.12.2
      '@unrs/resolver-binding-android-arm64': 1.12.2
      '@unrs/resolver-binding-darwin-arm64': 1.12.2
      '@unrs/resolver-binding-darwin-x64': 1.12.2
      '@unrs/resolver-binding-freebsd-x64': 1.12.2
      '@unrs/resolver-binding-linux-arm-gnueabihf': 1.12.2
      '@unrs/resolver-binding-linux-arm-musleabihf': 1.12.2
      '@unrs/resolver-binding-linux-arm64-gnu': 1.12.2
      '@unrs/resolver-binding-linux-arm64-musl': 1.12.2
      '@unrs/resolver-binding-linux-loong64-gnu': 1.12.2
      '@unrs/resolver-binding-linux-loong64-musl': 1.12.2
      '@unrs/resolver-binding-linux-ppc64-gnu': 1.12.2
      '@unrs/resolver-binding-linux-riscv64-gnu': 1.12.2
      '@unrs/resolver-binding-linux-riscv64-musl': 1.12.2
      '@unrs/resolver-binding-linux-s390x-gnu': 1.12.2
      '@unrs/resolver-binding-linux-x64-gnu': 1.12.2
      '@unrs/resolver-binding-linux-x64-musl': 1.12.2
      '@unrs/resolver-binding-openharmony-arm64': 1.12.2
      '@unrs/resolver-binding-wasm32-wasi': 1.12.2
      '@unrs/resolver-binding-win32-arm64-msvc': 1.12.2
      '@unrs/resolver-binding-win32-ia32-msvc': 1.12.2
      '@unrs/resolver-binding-win32-x64-msvc': 1.12.2

  unzipper@0.10.14:
    dependencies:
      big-integer: 1.6.52
      binary: 0.3.0
      bluebird: 3.4.7
      buffer-indexof-polyfill: 1.0.2
      duplexer2: 0.1.4
      fstream: 1.0.12
      graceful-fs: 4.2.11
      listenercount: 1.0.1
      readable-stream: 2.3.8
      setimmediate: 1.0.5

  update-browserslist-db@1.2.3(browserslist@4.28.5):
    dependencies:
      browserslist: 4.28.5
      escalade: 3.2.0
      picocolors: 1.1.1

  uri-js@4.4.1:
    dependencies:
      punycode: 2.3.1

  util-deprecate@1.0.2: {}

  uuid@8.3.2: {}

  which-boxed-primitive@1.1.1:
    dependencies:
      is-bigint: 1.1.0
      is-boolean-object: 1.2.2
      is-number-object: 1.1.1
      is-string: 1.1.1
      is-symbol: 1.1.1

  which-builtin-type@1.2.1:
    dependencies:
      call-bound: 1.0.4
      function.prototype.name: 1.2.0
      has-tostringtag: 1.0.2
      is-async-function: 2.1.1
      is-date-object: 1.1.0
      is-finalizationregistry: 1.1.1
      is-generator-function: 1.1.2
      is-regex: 1.2.1
      is-weakref: 1.1.1
      isarray: 2.0.5
      which-boxed-primitive: 1.1.1
      which-collection: 1.0.2
      which-typed-array: 1.1.22

  which-collection@1.0.2:
    dependencies:
      is-map: 2.0.3
      is-set: 2.0.3
      is-weakmap: 2.0.2
      is-weakset: 2.0.4

  which-module@2.0.1: {}

  which-typed-array@1.1.22:
    dependencies:
      available-typed-arrays: 1.0.7
      call-bind: 1.0.9
      call-bound: 1.0.4
      for-each: 0.3.5
      get-proto: 1.0.1
      gopd: 1.2.0
      has-tostringtag: 1.0.2

  which@2.0.2:
    dependencies:
      isexe: 2.0.0

  word-wrap@1.2.5: {}

  wrap-ansi@6.2.0:
    dependencies:
      ansi-styles: 4.3.0
      string-width: 4.2.3
      strip-ansi: 6.0.1

  wrappy@1.0.2: {}

  xdg-app-paths@5.5.1:
    dependencies:
      os-paths: 4.4.0
      xdg-portable: 7.3.0

  xdg-portable@7.3.0:
    dependencies:
      os-paths: 4.4.0

  xmlchars@2.2.0: {}

  y18n@4.0.3: {}

  yargs-parser@18.1.3:
    dependencies:
      camelcase: 5.3.1
      decamelize: 1.2.0

  yargs@15.4.1:
    dependencies:
      cliui: 6.0.0
      decamelize: 1.2.0
      find-up: 4.1.0
      get-caller-file: 2.0.5
      require-directory: 2.1.1
      require-main-filename: 2.0.0
      set-blocking: 2.0.0
      string-width: 4.2.3
      which-module: 2.0.1
      y18n: 4.0.3
      yargs-parser: 18.1.3

  yocto-queue@0.1.0: {}

  zip-stream@4.1.1:
    dependencies:
      archiver-utils: 3.0.4
      compress-commons: 4.1.2
      readable-stream: 3.6.2

  zod@3.25.76: {}

  zod@4.1.11: {}

  zrender@6.1.0:
    dependencies:
      tslib: 2.3.0
~~~~~~

### `pnpm-workspace.yaml`

~~~~~~yaml
allowBuilds:
  '@prisma/client': true
  '@prisma/engines': true
  esbuild: true
  prisma: true
  sharp: true
  unrs-resolver: true
~~~~~~

### `postcss.config.mjs`

~~~~~~javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
~~~~~~

### `README.md`

~~~~~~markdown
# SISTEMA DE IDEAS DE MEJORA - PROpEx

Aplicacion web para capturar, revisar, validar, implementar, cerrar y reconocer ideas de mejora en una empresa alimenticia. Incluye captura publica por QR, roles operativos, aprobaciones, validaciones paralelas, evidencias, puntos, dashboard, Kanban, auditoria, notificaciones con fallback local y exportacion a Excel.

## Tecnologias

- Next.js con TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite local, preparado para cambiar `DATABASE_URL` a PostgreSQL
- Microsoft Graph opcional para correo
- Teams Webhook opcional
- Vercel Blob opcional para evidencias online
- ExcelJS para reportes
- QR dinamico por area

## Instalacion

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Si tu equipo no tiene `npm` en PATH, puedes usar el `pnpm` incluido por Codex para instalar y ejecutar los mismos scripts:

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

La aplicacion inicia en:

```text
http://localhost:3000
```

## Usuarios demo

Todos usan la contrasena `admin123`.

| Rol | Usuario |
| --- | --- |
| Administrador | `admin@propEx.local` |
| Mejora Continua | `mc@propEx.local` |
| Calidad/Inocuidad | `calidad@propEx.local` |
| Seguridad Industrial | `seguridad@propEx.local` |
| Mantenimiento | `mantenimiento@propEx.local` |
| Supervisor P1 | `supervisor.p1@propEx.local` |
| Supervisor P2 | `supervisor.p2@propEx.local` |
| Supervisor P3 | `supervisor.p3@propEx.local` |
| Supervisor P4 | `supervisor.p4@propEx.local` |
| Supervisor P5 | `supervisor.p5@propEx.local` |
| Supervisor P6 | `supervisor.p6@propEx.local` |
| Supervisor P7 | `supervisor.p7@propEx.local` |
| Supervisor P8 | `supervisor.p8@propEx.local` |
| Supervisor P9 | `supervisor.p9@propEx.local` |

## Rutas principales

- `/login`: entrada al panel administrativo.
- `/`: dashboard de KPIs.
- `/captura/P1` a `/captura/P9`: captura publica por QR sin login.
- `/supervisor`: bandeja de supervisor.
- `/validaciones/calidad`: validacion Calidad/Inocuidad.
- `/validaciones/seguridad`: validacion Seguridad Industrial.
- `/validaciones/mantenimiento`: validacion Mantenimiento.
- `/mejora`: panel de Mejora Continua.
- `/implementacion`: avance y evidencia despues.
- `/ideas`: tabla maestra con filtros.
- `/ideas/[id]`: detalle del folio y acciones por rol.
- `/kanban`: vista Kanban.
- `/qr`: QR por area con descarga PNG.
- `/reportes`: exportacion y recordatorios.
- `/notificaciones`: outbox local.
- `/auditoria`: historial de cambios.
- `/configuracion`: areas, supervisores, correos soporte y reglas de puntos.

## Flujo del proceso

1. El colaborador entra por QR y registra la idea.
2. El sistema genera folio `IM-000001`, asigna supervisor, crea auditoria y notificacion.
3. El supervisor aprueba, rechaza o solicita informacion.
4. Si aprueba, se crean validaciones paralelas segun impacto: Calidad/Inocuidad, Seguridad y Mantenimiento.
5. Si todas las validaciones obligatorias aprueban, la idea queda aprobada para implementar.
6. Mejora Continua clasifica, prioriza, asigna responsable y fecha compromiso.
7. El responsable carga avances y evidencia despues.
8. Mejora Continua valida cierre, selecciona reglas de puntos y cierra.
9. El sistema notifica cierre y actualiza dashboard, Kanban, tabla y auditoria.

## Variables de entorno

El archivo `.env.example` incluye:

```env
DATABASE_URL="file:./dev.db"
APP_BASE_URL="http://localhost:3000"
AUTH_SECRET="cambia-este-secreto-en-produccion"
BLOB_READ_WRITE_TOKEN=""

MICROSOFT_TENANT_ID=""
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
MICROSOFT_SENDER_EMAIL=""
TEAMS_WEBHOOK_URL=""
```

Para produccion usa `.env.production.example` como referencia y configura `DATABASE_URL` con Postgres.

### Evidencias online

En local, las evidencias se guardan en `public/uploads`. En Vercel, configura `BLOB_READ_WRITE_TOKEN` para guardar evidencias en Vercel Blob. Si Vercel no tiene ese token, el sistema rechazara la carga de evidencias para evitar perder archivos.

### Microsoft Outlook / Graph

Para enviar correos reales configura:

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_SENDER_EMAIL`

La app usa flujo `client_credentials` y endpoint `sendMail` de Microsoft Graph. Si falta una variable, la notificacion se guarda en `NotificationOutbox` con estatus `PENDING`.

### Teams

Configura `TEAMS_WEBHOOK_URL` para publicar eventos en Teams. Si no existe, la notificacion queda en el outbox local.

## QR por area

Los QR se generan dinamicamente desde:

```text
/api/qr/P1
/api/qr/P2
...
/api/qr/P9
```

Cada QR apunta a `/captura/Px`. La pantalla `/qr` muestra area, supervisor, QR visible, URL directa, descarga PNG e impresion.

## Exportacion a Excel

Desde la app:

```text
/api/export
```

Desde consola:

```bash
npm run export-demo
```

El archivo se genera como:

```text
Ideas_Mejora_PROpEx_YYYY-MM-DD.xlsx
```

Incluye hojas de ideas, validaciones, comentarios y puntos.

## Recordatorios y vencimientos

Ejecuta:

```bash
npm run reminders
```

El script marca como `VENCIDA` toda idea con fecha compromiso pasada y sin cierre/cancelacion/rechazo, genera auditoria y crea notificaciones para responsable, supervisor y Mejora Continua.

Para programarlo en Windows Task Scheduler:

1. Crear tarea basica diaria.
2. Accion: iniciar un programa.
3. Programa: `npm`.
4. Argumentos: `run reminders`.
5. Iniciar en: carpeta del proyecto.

## Datos demo

El seed crea:

- Areas P1 a P9.
- Supervisores P1 a P9.
- Usuarios de soporte.
- Reglas de puntos editables.
- Ideas de ejemplo en estatus registrados, revision, validacion, implementacion, cierre, rechazo y vencimiento.
- Una notificacion pendiente para probar el fallback local.

## Estructura

```text
prisma/schema.prisma       Modelo de datos
prisma/schema.production.prisma Modelo de datos para Postgres online
prisma/seed.ts             Datos demo
src/app                    Rutas, pantallas, acciones y APIs
src/components             Componentes de interfaz
src/lib                    Auth, flujo, notificaciones, auditoria, Prisma, Blob y Excel
scripts/reminders.ts       Vencimientos
scripts/export-demo.ts     Exportacion local
public/uploads             Evidencias cargadas
```

## Produccion

El despliegue recomendado es Vercel + Neon Postgres + Vercel Blob. Revisa la guia completa:

```text
DEPLOYMENT.md
```

Comandos de produccion:

```bash
pnpm build:vercel
pnpm db:push:production
pnpm db:seed:production
```

Antes de publicar:

- Cambiar `AUTH_SECRET`.
- Usar PostgreSQL en `DATABASE_URL`.
- Configurar `BLOB_READ_WRITE_TOKEN` para evidencias persistentes.
- Configurar Microsoft Graph o Teams si se desea envio real.
- Servir la app detras de HTTPS.
- Revisar politicas de retencion de evidencias.
- Cambiar correos y usuarios demo por usuarios reales.
~~~~~~

### `tailwind.config.ts`

~~~~~~typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        line: "#dedede",
        panel: "#f7f7f7",
        brand: {
          50: "#fff1f4",
          100: "#ffe0e7",
          500: "#ea0029",
          700: "#b50020",
          900: "#620011"
        },
        dept: {
          supervisor: "#14835f",
          calidad: "#d32236",
          seguridad: "#626a70",
          mantenimiento: "#176fc1",
          mejora: "#171a18"
        },
        warn: "#b7791f",
        danger: "#d32236",
        info: "#176fc1",
        grape: "#7768ae"
      },
      boxShadow: {
        soft: "0 10px 28px rgba(23, 26, 24, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
~~~~~~

### `tsconfig.json`

~~~~~~json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "propex-interno-sites"]
}
~~~~~~

### `vercel.json`

~~~~~~json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build:vercel"
}
~~~~~~

## 5.2 Modelo de datos y seed

### `prisma/schema.prisma`

~~~~~~prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  MEJORA_CONTINUA
  SUPERVISOR
  CALIDAD
  SEGURIDAD
  MANTENIMIENTO
  COLABORADOR
}

enum IdeaStatus {
  REGISTRADA
  EN_REVISION_SUPERVISOR
  RECHAZADA_SUPERVISOR
  SOLICITUD_INFORMACION
  APROBADA_SUPERVISOR
  EN_VALIDACION_CALIDAD
  EN_VALIDACION_SEGURIDAD
  EN_VALIDACION_MANTENIMIENTO
  RECHAZADA_VALIDACION
  APROBADA_PARA_IMPLEMENTAR
  CLASIFICACION_MEJORA_CONTINUA
  EN_IMPLEMENTACION
  IMPLEMENTADA
  EN_VALIDACION_FINAL
  CERRADA
  CANCELADA
  VENCIDA
}

enum Priority {
  BAJA
  MEDIA
  ALTA
  CRITICA
}

enum IdeaCategory {
  A
  B
  C
}

enum Classification {
  IDEA_RAPIDA
  ACCION_MANTENIMIENTO
  KAIZEN
  PROYECTO_DMAIC
  PLAN_ACCION
  CINCO_S_GESTION_VISUAL
  SEGURIDAD
  CALIDAD_INOCUIDAD
  NO_VIABLE
}

enum ApprovalType {
  SUPERVISOR
  CALIDAD
  SEGURIDAD
  MANTENIMIENTO
  MEJORA_CONTINUA_FINAL
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  MORE_INFO
}

enum ApprovalDecision {
  APROBAR
  RECHAZAR
  SOLICITAR_INFORMACION
}

enum AttachmentType {
  BEFORE
  AFTER
  OTHER
}

enum NotificationChannel {
  EMAIL
  TEAMS
  LOCAL
}

enum NotificationStatus {
  PENDING
  SENT
  ERROR
  DISMISSED
}

enum KaizenStatus {
  PENDIENTE_CHARTER
  PLANIFICACION
  EN_CURSO
  EN_PAUSA
  COMPLETADO
  CANCELADO
}

enum WorkItemStatus {
  PENDIENTE
  EN_PROCESO
  BLOQUEADA
  COMPLETADA
  CANCELADA
  COMBINADA
}

enum GenbaStatus {
  ABIERTO
  CERRADO
  CANCELADO
}

enum KaizenAttachmentType {
  CHARTER
  EVIDENCE
  OTHER
}

enum GenbaAttachmentType {
  EVIDENCE
  OTHER
}

enum PlantCode {
  APO
  CAR
}

enum OrgUnitType {
  MACROPROCESO
  DEPARTAMENTO
  AREA
  PROCESO
}

model User {
  id                    String           @id @default(cuid())
  name                  String
  email                 String           @unique
  role                  Role
  passwordHash          String
  active                Boolean          @default(true)
  kaizenAccess          Boolean          @default(false)
  genbaAccess           Boolean          @default(false)
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
  supervisedAreas       Area[]           @relation("AreaSupervisor")
  supervisedIdeas       Idea[]           @relation("IdeaSupervisor")
  ownedImplementations  Idea[]           @relation("ImplementationOwner")
  approvals             Approval[]
  comments              Comment[]
  auditLogs             AuditLog[]
  ledKaizenProjects     KaizenProject[]  @relation("KaizenLeader")
  createdKaizenProjects KaizenProject[]  @relation("KaizenCreator")
  ownedKaizenActivities KaizenActivity[] @relation("KaizenActivityOwner")
  kaizenUpdates         KaizenUpdate[]
  coordinatedGenbaWalks GenbaWalk[]      @relation("GenbaCoordinator")
  createdGenbaWalks     GenbaWalk[]      @relation("GenbaCreator")
  ownedGenbaActivities  GenbaActivity[]  @relation("GenbaActivityOwner")
  genbaUpdates          GenbaUpdate[]
  routedOrgUnits        OrgUnit[]        @relation("OrgUnitRoutingUser")
}

model Area {
  id               String   @id @default(cuid())
  code             String   @unique
  name             String
  supervisorId     String?
  active           Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  supervisor       User?    @relation("AreaSupervisor", fields: [supervisorId], references: [id])
  ideas            Idea[]
  organizationUnit OrgUnit? @relation("OrgUnitCaptureArea")
}

model Plant {
  id        String    @id @default(cuid())
  code      PlantCode @unique
  name      String
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  orgUnits  OrgUnit[]
}

model OrgUnit {
  id            String      @id @default(cuid())
  plantId       String
  parentId      String?
  type          OrgUnitType
  code          String      @unique
  name          String
  responsible   String
  manager       String
  routingUserId String?
  captureAreaId String?     @unique
  qrEnabled     Boolean     @default(false)
  active        Boolean     @default(true)
  sortOrder     Int         @default(0)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  plant         Plant       @relation(fields: [plantId], references: [id], onDelete: Cascade)
  parent        OrgUnit?    @relation("OrgUnitTree", fields: [parentId], references: [id], onDelete: SetNull)
  children      OrgUnit[]   @relation("OrgUnitTree")
  routingUser   User?       @relation("OrgUnitRoutingUser", fields: [routingUserId], references: [id], onDelete: SetNull)
  captureArea   Area?       @relation("OrgUnitCaptureArea", fields: [captureAreaId], references: [id], onDelete: SetNull)

  @@index([plantId, parentId, sortOrder])
}

model Idea {
  id                      String               @id @default(cuid())
  folio                   String               @unique
  collaboratorName        String
  collaboratorEmail       String?
  employeeNumber          String?
  areaId                  String
  shift                   String
  problem                 String
  proposal                String
  expectedBenefit         String
  impactTypes             String
  category                IdeaCategory         @default(A)
  impactsQuality          Boolean              @default(false)
  impactsSafety           Boolean              @default(false)
  requiresMaintenance     Boolean              @default(false)
  requiresExternalSupport Boolean              @default(false)
  externalSupportDetails  String?
  priority                Priority?
  classification          Classification?
  status                  IdeaStatus           @default(EN_REVISION_SUPERVISOR)
  supervisorId            String?
  implementationOwnerId   String?
  dueDate                 DateTime?
  requiresEvidence        Boolean              @default(true)
  implementedAt           DateTime?
  closedAt                DateTime?
  pointsAssigned          Int                  @default(0)
  rejectionReason         String?
  moreInfoRequest         String?
  mcComments              String?
  createdAt               DateTime             @default(now())
  updatedAt               DateTime             @updatedAt
  area                    Area                 @relation(fields: [areaId], references: [id])
  supervisor              User?                @relation("IdeaSupervisor", fields: [supervisorId], references: [id])
  implementationOwner     User?                @relation("ImplementationOwner", fields: [implementationOwnerId], references: [id])
  approvals               Approval[]
  attachments             Attachment[]
  comments                Comment[]
  pointRuleSelections     IdeaPointRule[]
  notifications           NotificationOutbox[]
  kaizenProject           KaizenProject?
}

model Approval {
  id           String            @id @default(cuid())
  ideaId       String
  type         ApprovalType
  assignedToId String?
  status       ApprovalStatus    @default(PENDING)
  decision     ApprovalDecision?
  comments     String?
  decidedAt    DateTime?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
  idea         Idea              @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  assignedTo   User?             @relation(fields: [assignedToId], references: [id])

  @@unique([ideaId, type])
}

model Attachment {
  id         String         @id @default(cuid())
  ideaId     String
  type       AttachmentType
  filename   String
  path       String
  uploadedBy String?
  createdAt  DateTime       @default(now())
  idea       Idea           @relation(fields: [ideaId], references: [id], onDelete: Cascade)
}

model Comment {
  id        String   @id @default(cuid())
  ideaId    String
  userId    String?
  comment   String
  createdAt DateTime @default(now())
  idea      Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  user      User?    @relation(fields: [userId], references: [id])
}

model PointRule {
  id          String          @id @default(cuid())
  name        String
  description String
  points      Int
  active      Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  ideas       IdeaPointRule[]
}

model IdeaPointRule {
  id          String    @id @default(cuid())
  ideaId      String
  pointRuleId String
  points      Int
  createdAt   DateTime  @default(now())
  idea        Idea      @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  pointRule   PointRule @relation(fields: [pointRuleId], references: [id])

  @@unique([ideaId, pointRuleId])
}

model NotificationOutbox {
  id           String              @id @default(cuid())
  ideaId       String?
  channel      NotificationChannel
  to           String
  subject      String
  body         String
  status       NotificationStatus  @default(PENDING)
  errorMessage String?
  sentAt       DateTime?
  createdAt    DateTime            @default(now())
  idea         Idea?               @relation(fields: [ideaId], references: [id], onDelete: SetNull)
}

model AuditLog {
  id        String   @id @default(cuid())
  entity    String
  entityId  String
  action    String
  userId    String?
  details   String
  createdAt DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id])
}

model Setting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}

model KaizenProject {
  id               String             @id @default(cuid())
  number           Int                @unique
  folio            String             @unique
  title            String
  plant            String?
  area             String
  objective        String
  scope            String?
  baselineValue    Float?
  targetValue      Float?
  currentValue     Float?
  unit             String?
  estimatedSavings Float?
  realSavings      Float?
  status           KaizenStatus       @default(PENDIENTE_CHARTER)
  startDate        DateTime
  endDate          DateTime
  closedAt         DateTime?
  leaderId         String
  createdById      String
  sourceIdeaId     String?            @unique
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  leader           User               @relation("KaizenLeader", fields: [leaderId], references: [id])
  createdBy        User               @relation("KaizenCreator", fields: [createdById], references: [id])
  sourceIdea       Idea?              @relation(fields: [sourceIdeaId], references: [id], onDelete: SetNull)
  activities       KaizenActivity[]
  attachments      KaizenAttachment[]
  updates          KaizenUpdate[]
}

model KaizenActivity {
  id                    String             @id @default(cuid())
  projectId             String
  number                Int
  problem               String?
  action                String
  ownerId               String?
  startDate             DateTime?
  dueDate               DateTime?
  status                WorkItemStatus     @default(PENDIENTE)
  completionNote        String?
  cancellationReason    String?
  closedAt              DateTime?
  mergedIntoId          String?
  mergeReason           String?
  sourceGenbaActivityId String?            @unique
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
  project               KaizenProject      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  owner                 User?              @relation("KaizenActivityOwner", fields: [ownerId], references: [id])
  mergedInto            KaizenActivity?    @relation("KaizenActivityMerge", fields: [mergedIntoId], references: [id])
  mergedActivities      KaizenActivity[]   @relation("KaizenActivityMerge")
  sourceGenbaActivity   GenbaActivity?     @relation("GenbaPromotion", fields: [sourceGenbaActivityId], references: [id], onDelete: SetNull)
  attachments           KaizenAttachment[]
  updates               KaizenUpdate[]

  @@unique([projectId, number])
}

model KaizenAttachment {
  id         String               @id @default(cuid())
  projectId  String
  activityId String?
  type       KaizenAttachmentType
  filename   String
  path       String
  uploadedBy String
  createdAt  DateTime             @default(now())
  project    KaizenProject        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  activity   KaizenActivity?      @relation(fields: [activityId], references: [id], onDelete: Cascade)
}

model KaizenUpdate {
  id         String          @id @default(cuid())
  projectId  String
  activityId String?
  userId     String?
  comment    String
  createdAt  DateTime        @default(now())
  project    KaizenProject   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  activity   KaizenActivity? @relation(fields: [activityId], references: [id], onDelete: Cascade)
  user       User?           @relation(fields: [userId], references: [id])
}

model GenbaWalk {
  id                  String            @id @default(cuid())
  number              Int               @unique
  folio               String            @unique
  areaName            String
  visitDate           DateTime
  expectedDepartments String
  attendedDepartments String
  notes               String?
  status              GenbaStatus       @default(ABIERTO)
  coordinatorId       String
  createdById         String
  closedAt            DateTime?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  coordinator         User              @relation("GenbaCoordinator", fields: [coordinatorId], references: [id])
  createdBy           User              @relation("GenbaCreator", fields: [createdById], references: [id])
  activities          GenbaActivity[]
  attachments         GenbaAttachment[]
  updates             GenbaUpdate[]
}

model GenbaActivity {
  id                     String            @id @default(cuid())
  walkId                 String
  number                 Int
  problem                String
  action                 String?
  ownerId                String?
  dueDate                DateTime?
  status                 WorkItemStatus    @default(PENDIENTE)
  completionNote         String?
  cancellationReason     String?
  closedAt               DateTime?
  mergedIntoId           String?
  mergeReason            String?
  createdAt              DateTime          @default(now())
  updatedAt              DateTime          @updatedAt
  walk                   GenbaWalk         @relation(fields: [walkId], references: [id], onDelete: Cascade)
  owner                  User?             @relation("GenbaActivityOwner", fields: [ownerId], references: [id])
  mergedInto             GenbaActivity?    @relation("GenbaActivityMerge", fields: [mergedIntoId], references: [id])
  mergedActivities       GenbaActivity[]   @relation("GenbaActivityMerge")
  promotedKaizenActivity KaizenActivity?   @relation("GenbaPromotion")
  attachments            GenbaAttachment[]
  updates                GenbaUpdate[]

  @@unique([walkId, number])
}

model GenbaAttachment {
  id         String              @id @default(cuid())
  walkId     String
  activityId String?
  type       GenbaAttachmentType @default(EVIDENCE)
  filename   String
  path       String
  uploadedBy String
  createdAt  DateTime            @default(now())
  walk       GenbaWalk           @relation(fields: [walkId], references: [id], onDelete: Cascade)
  activity   GenbaActivity?      @relation(fields: [activityId], references: [id], onDelete: Cascade)
}

model GenbaUpdate {
  id         String         @id @default(cuid())
  walkId     String
  activityId String?
  userId     String?
  comment    String
  createdAt  DateTime       @default(now())
  walk       GenbaWalk      @relation(fields: [walkId], references: [id], onDelete: Cascade)
  activity   GenbaActivity? @relation(fields: [activityId], references: [id], onDelete: Cascade)
  user       User?          @relation(fields: [userId], references: [id])
}
~~~~~~

### `prisma/schema.production.prisma`

~~~~~~prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  MEJORA_CONTINUA
  SUPERVISOR
  CALIDAD
  SEGURIDAD
  MANTENIMIENTO
  COLABORADOR
}

enum IdeaStatus {
  REGISTRADA
  EN_REVISION_SUPERVISOR
  RECHAZADA_SUPERVISOR
  SOLICITUD_INFORMACION
  APROBADA_SUPERVISOR
  EN_VALIDACION_CALIDAD
  EN_VALIDACION_SEGURIDAD
  EN_VALIDACION_MANTENIMIENTO
  RECHAZADA_VALIDACION
  APROBADA_PARA_IMPLEMENTAR
  CLASIFICACION_MEJORA_CONTINUA
  EN_IMPLEMENTACION
  IMPLEMENTADA
  EN_VALIDACION_FINAL
  CERRADA
  CANCELADA
  VENCIDA
}

enum Priority {
  BAJA
  MEDIA
  ALTA
  CRITICA
}

enum IdeaCategory {
  A
  B
  C
}

enum Classification {
  IDEA_RAPIDA
  ACCION_MANTENIMIENTO
  KAIZEN
  PROYECTO_DMAIC
  PLAN_ACCION
  CINCO_S_GESTION_VISUAL
  SEGURIDAD
  CALIDAD_INOCUIDAD
  NO_VIABLE
}

enum ApprovalType {
  SUPERVISOR
  CALIDAD
  SEGURIDAD
  MANTENIMIENTO
  MEJORA_CONTINUA_FINAL
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  MORE_INFO
}

enum ApprovalDecision {
  APROBAR
  RECHAZAR
  SOLICITAR_INFORMACION
}

enum AttachmentType {
  BEFORE
  AFTER
  OTHER
}

enum NotificationChannel {
  EMAIL
  TEAMS
  LOCAL
}

enum NotificationStatus {
  PENDING
  SENT
  ERROR
  DISMISSED
}

enum KaizenStatus {
  PENDIENTE_CHARTER
  PLANIFICACION
  EN_CURSO
  EN_PAUSA
  COMPLETADO
  CANCELADO
}

enum WorkItemStatus {
  PENDIENTE
  EN_PROCESO
  BLOQUEADA
  COMPLETADA
  CANCELADA
  COMBINADA
}

enum GenbaStatus {
  ABIERTO
  CERRADO
  CANCELADO
}

enum KaizenAttachmentType {
  CHARTER
  EVIDENCE
  OTHER
}

enum GenbaAttachmentType {
  EVIDENCE
  OTHER
}

enum PlantCode {
  APO
  CAR
}

enum OrgUnitType {
  MACROPROCESO
  DEPARTAMENTO
  AREA
  PROCESO
}

model User {
  id                    String           @id @default(cuid())
  name                  String
  email                 String           @unique
  role                  Role
  passwordHash          String
  active                Boolean          @default(true)
  kaizenAccess          Boolean          @default(false)
  genbaAccess           Boolean          @default(false)
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
  supervisedAreas       Area[]           @relation("AreaSupervisor")
  supervisedIdeas       Idea[]           @relation("IdeaSupervisor")
  ownedImplementations  Idea[]           @relation("ImplementationOwner")
  approvals             Approval[]
  comments              Comment[]
  auditLogs             AuditLog[]
  ledKaizenProjects     KaizenProject[]  @relation("KaizenLeader")
  createdKaizenProjects KaizenProject[]  @relation("KaizenCreator")
  ownedKaizenActivities KaizenActivity[] @relation("KaizenActivityOwner")
  kaizenUpdates         KaizenUpdate[]
  coordinatedGenbaWalks GenbaWalk[]      @relation("GenbaCoordinator")
  createdGenbaWalks     GenbaWalk[]      @relation("GenbaCreator")
  ownedGenbaActivities  GenbaActivity[]  @relation("GenbaActivityOwner")
  genbaUpdates          GenbaUpdate[]
  routedOrgUnits        OrgUnit[]        @relation("OrgUnitRoutingUser")
}

model Area {
  id               String   @id @default(cuid())
  code             String   @unique
  name             String
  supervisorId     String?
  active           Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  supervisor       User?    @relation("AreaSupervisor", fields: [supervisorId], references: [id])
  ideas            Idea[]
  organizationUnit OrgUnit? @relation("OrgUnitCaptureArea")
}

model Plant {
  id        String    @id @default(cuid())
  code      PlantCode @unique
  name      String
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  orgUnits  OrgUnit[]
}

model OrgUnit {
  id            String      @id @default(cuid())
  plantId       String
  parentId      String?
  type          OrgUnitType
  code          String      @unique
  name          String
  responsible   String
  manager       String
  routingUserId String?
  captureAreaId String?     @unique
  qrEnabled     Boolean     @default(false)
  active        Boolean     @default(true)
  sortOrder     Int         @default(0)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  plant         Plant       @relation(fields: [plantId], references: [id], onDelete: Cascade)
  parent        OrgUnit?    @relation("OrgUnitTree", fields: [parentId], references: [id], onDelete: SetNull)
  children      OrgUnit[]   @relation("OrgUnitTree")
  routingUser   User?       @relation("OrgUnitRoutingUser", fields: [routingUserId], references: [id], onDelete: SetNull)
  captureArea   Area?       @relation("OrgUnitCaptureArea", fields: [captureAreaId], references: [id], onDelete: SetNull)

  @@index([plantId, parentId, sortOrder])
}

model Idea {
  id                      String               @id @default(cuid())
  folio                   String               @unique
  collaboratorName        String
  collaboratorEmail       String?
  employeeNumber          String?
  areaId                  String
  shift                   String
  problem                 String
  proposal                String
  expectedBenefit         String
  impactTypes             String
  category                IdeaCategory         @default(A)
  impactsQuality          Boolean              @default(false)
  impactsSafety           Boolean              @default(false)
  requiresMaintenance     Boolean              @default(false)
  requiresExternalSupport Boolean              @default(false)
  externalSupportDetails  String?
  priority                Priority?
  classification          Classification?
  status                  IdeaStatus           @default(EN_REVISION_SUPERVISOR)
  supervisorId            String?
  implementationOwnerId   String?
  dueDate                 DateTime?
  requiresEvidence        Boolean              @default(true)
  implementedAt           DateTime?
  closedAt                DateTime?
  pointsAssigned          Int                  @default(0)
  rejectionReason         String?
  moreInfoRequest         String?
  mcComments              String?
  createdAt               DateTime             @default(now())
  updatedAt               DateTime             @updatedAt
  area                    Area                 @relation(fields: [areaId], references: [id])
  supervisor              User?                @relation("IdeaSupervisor", fields: [supervisorId], references: [id])
  implementationOwner     User?                @relation("ImplementationOwner", fields: [implementationOwnerId], references: [id])
  approvals               Approval[]
  attachments             Attachment[]
  comments                Comment[]
  pointRuleSelections     IdeaPointRule[]
  notifications           NotificationOutbox[]
  kaizenProject           KaizenProject?
}

model Approval {
  id           String            @id @default(cuid())
  ideaId       String
  type         ApprovalType
  assignedToId String?
  status       ApprovalStatus    @default(PENDING)
  decision     ApprovalDecision?
  comments     String?
  decidedAt    DateTime?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
  idea         Idea              @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  assignedTo   User?             @relation(fields: [assignedToId], references: [id])

  @@unique([ideaId, type])
}

model Attachment {
  id         String         @id @default(cuid())
  ideaId     String
  type       AttachmentType
  filename   String
  path       String
  uploadedBy String?
  createdAt  DateTime       @default(now())
  idea       Idea           @relation(fields: [ideaId], references: [id], onDelete: Cascade)
}

model Comment {
  id        String   @id @default(cuid())
  ideaId    String
  userId    String?
  comment   String
  createdAt DateTime @default(now())
  idea      Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  user      User?    @relation(fields: [userId], references: [id])
}

model PointRule {
  id          String          @id @default(cuid())
  name        String
  description String
  points      Int
  active      Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  ideas       IdeaPointRule[]
}

model IdeaPointRule {
  id          String    @id @default(cuid())
  ideaId      String
  pointRuleId String
  points      Int
  createdAt   DateTime  @default(now())
  idea        Idea      @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  pointRule   PointRule @relation(fields: [pointRuleId], references: [id])

  @@unique([ideaId, pointRuleId])
}

model NotificationOutbox {
  id           String              @id @default(cuid())
  ideaId       String?
  channel      NotificationChannel
  to           String
  subject      String
  body         String
  status       NotificationStatus  @default(PENDING)
  errorMessage String?
  sentAt       DateTime?
  createdAt    DateTime            @default(now())
  idea         Idea?               @relation(fields: [ideaId], references: [id], onDelete: SetNull)
}

model AuditLog {
  id        String   @id @default(cuid())
  entity    String
  entityId  String
  action    String
  userId    String?
  details   String
  createdAt DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id])
}

model Setting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}

model KaizenProject {
  id               String             @id @default(cuid())
  number           Int                @unique
  folio            String             @unique
  title            String
  plant            String?
  area             String
  objective        String
  scope            String?
  baselineValue    Float?
  targetValue      Float?
  currentValue     Float?
  unit             String?
  estimatedSavings Float?
  realSavings      Float?
  status           KaizenStatus       @default(PENDIENTE_CHARTER)
  startDate        DateTime
  endDate          DateTime
  closedAt         DateTime?
  leaderId         String
  createdById      String
  sourceIdeaId     String?            @unique
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  leader           User               @relation("KaizenLeader", fields: [leaderId], references: [id])
  createdBy        User               @relation("KaizenCreator", fields: [createdById], references: [id])
  sourceIdea       Idea?              @relation(fields: [sourceIdeaId], references: [id], onDelete: SetNull)
  activities       KaizenActivity[]
  attachments      KaizenAttachment[]
  updates          KaizenUpdate[]
}

model KaizenActivity {
  id                    String             @id @default(cuid())
  projectId             String
  number                Int
  problem               String?
  action                String
  ownerId               String?
  startDate             DateTime?
  dueDate               DateTime?
  status                WorkItemStatus     @default(PENDIENTE)
  completionNote        String?
  cancellationReason    String?
  closedAt              DateTime?
  mergedIntoId          String?
  mergeReason           String?
  sourceGenbaActivityId String?            @unique
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
  project               KaizenProject      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  owner                 User?              @relation("KaizenActivityOwner", fields: [ownerId], references: [id])
  mergedInto            KaizenActivity?    @relation("KaizenActivityMerge", fields: [mergedIntoId], references: [id])
  mergedActivities      KaizenActivity[]   @relation("KaizenActivityMerge")
  sourceGenbaActivity   GenbaActivity?     @relation("GenbaPromotion", fields: [sourceGenbaActivityId], references: [id], onDelete: SetNull)
  attachments           KaizenAttachment[]
  updates               KaizenUpdate[]

  @@unique([projectId, number])
}

model KaizenAttachment {
  id         String               @id @default(cuid())
  projectId  String
  activityId String?
  type       KaizenAttachmentType
  filename   String
  path       String
  uploadedBy String
  createdAt  DateTime             @default(now())
  project    KaizenProject        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  activity   KaizenActivity?      @relation(fields: [activityId], references: [id], onDelete: Cascade)
}

model KaizenUpdate {
  id         String          @id @default(cuid())
  projectId  String
  activityId String?
  userId     String?
  comment    String
  createdAt  DateTime        @default(now())
  project    KaizenProject   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  activity   KaizenActivity? @relation(fields: [activityId], references: [id], onDelete: Cascade)
  user       User?           @relation(fields: [userId], references: [id])
}

model GenbaWalk {
  id                  String            @id @default(cuid())
  number              Int               @unique
  folio               String            @unique
  areaName            String
  visitDate           DateTime
  expectedDepartments String
  attendedDepartments String
  notes               String?
  status              GenbaStatus       @default(ABIERTO)
  coordinatorId       String
  createdById         String
  closedAt            DateTime?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  coordinator         User              @relation("GenbaCoordinator", fields: [coordinatorId], references: [id])
  createdBy           User              @relation("GenbaCreator", fields: [createdById], references: [id])
  activities          GenbaActivity[]
  attachments         GenbaAttachment[]
  updates             GenbaUpdate[]
}

model GenbaActivity {
  id                     String            @id @default(cuid())
  walkId                 String
  number                 Int
  problem                String
  action                 String?
  ownerId                String?
  dueDate                DateTime?
  status                 WorkItemStatus    @default(PENDIENTE)
  completionNote         String?
  cancellationReason     String?
  closedAt               DateTime?
  mergedIntoId           String?
  mergeReason            String?
  createdAt              DateTime          @default(now())
  updatedAt              DateTime          @updatedAt
  walk                   GenbaWalk         @relation(fields: [walkId], references: [id], onDelete: Cascade)
  owner                  User?             @relation("GenbaActivityOwner", fields: [ownerId], references: [id])
  mergedInto             GenbaActivity?    @relation("GenbaActivityMerge", fields: [mergedIntoId], references: [id])
  mergedActivities       GenbaActivity[]   @relation("GenbaActivityMerge")
  promotedKaizenActivity KaizenActivity?   @relation("GenbaPromotion")
  attachments            GenbaAttachment[]
  updates                GenbaUpdate[]

  @@unique([walkId, number])
}

model GenbaAttachment {
  id         String              @id @default(cuid())
  walkId     String
  activityId String?
  type       GenbaAttachmentType @default(EVIDENCE)
  filename   String
  path       String
  uploadedBy String
  createdAt  DateTime            @default(now())
  walk       GenbaWalk           @relation(fields: [walkId], references: [id], onDelete: Cascade)
  activity   GenbaActivity?      @relation(fields: [activityId], references: [id], onDelete: Cascade)
}

model GenbaUpdate {
  id         String         @id @default(cuid())
  walkId     String
  activityId String?
  userId     String?
  comment    String
  createdAt  DateTime       @default(now())
  walk       GenbaWalk      @relation(fields: [walkId], references: [id], onDelete: Cascade)
  activity   GenbaActivity? @relation(fields: [activityId], references: [id], onDelete: Cascade)
  user       User?          @relation(fields: [userId], references: [id])
}
~~~~~~

### `prisma/seed.ts`

~~~~~~typescript
import { PrismaClient, ApprovalStatus, IdeaStatus, Priority } from "@prisma/client";
import bcrypt from "bcryptjs";
import { managerialEvaluationFactors } from "../src/lib/managerial-evaluation";

const prisma = new PrismaClient();

const password = "admin123";

async function user(email: string, name: string, role: Parameters<typeof prisma.user.upsert>[0]["create"]["role"]) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, role, active: true, passwordHash },
    create: { email, name, role, passwordHash, active: true }
  });
}

async function idea(input: {
  folio: string;
  areaId: string;
  supervisorId: string;
  status: IdeaStatus;
  collaboratorName: string;
  employeeNumber?: string;
  problem: string;
  proposal: string;
  impactsQuality?: boolean;
  impactsSafety?: boolean;
  requiresMaintenance?: boolean;
  priority?: Priority;
  dueDate?: Date;
  pointsAssigned?: number;
  rejectionReason?: string;
}) {
  return prisma.idea.upsert({
    where: { folio: input.folio },
    update: {},
    create: {
      folio: input.folio,
      collaboratorName: input.collaboratorName,
      collaboratorEmail: `${input.collaboratorName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@propex.local`,
      employeeNumber: input.employeeNumber ?? null,
      areaId: input.areaId,
      shift: "Matutino",
      problem: input.problem,
      proposal: input.proposal,
      expectedBenefit: "Reducir retrabajos y mejorar el control operativo.",
      impactTypes: JSON.stringify(["Seguridad", "Calidad/Inocuidad", "Productividad"].filter((_, index) => index !== 0 || input.impactsSafety)),
      impactsQuality: input.impactsQuality ?? false,
      impactsSafety: input.impactsSafety ?? false,
      requiresMaintenance: input.requiresMaintenance ?? false,
      status: input.status,
      supervisorId: input.supervisorId,
      priority: input.priority ?? null,
      dueDate: input.dueDate ?? null,
      implementedAt: ["IMPLEMENTADA", "EN_VALIDACION_FINAL", "CERRADA"].includes(input.status) ? new Date() : null,
      closedAt: input.status === "CERRADA" ? new Date() : null,
      pointsAssigned: input.pointsAssigned ?? 0,
      rejectionReason: input.rejectionReason ?? null,
      mcComments: "Dato demo creado para validar dashboard y flujo."
    }
  });
}

async function main() {
  const admin = await user("admin@propEx.local", "Administrador PROpEx", "ADMIN");
  const mc = await user("mc@propEx.local", "Mejora Continua", "MEJORA_CONTINUA");
  const calidad = await user("calidad@propEx.local", "Calidad/Inocuidad", "CALIDAD");
  const seguridad = await user("seguridad@propEx.local", "Seguridad Industrial", "SEGURIDAD");
  const mantenimiento = await user("mantenimiento@propEx.local", "Mantenimiento", "MANTENIMIENTO");

  const supervisors = [];
  for (let index = 1; index <= 9; index += 1) {
    supervisors.push(await user(`supervisor.p${index}@propEx.local`, `Supervisor P${index}`, "SUPERVISOR"));
  }

  const areas = [];
  for (let index = 1; index <= 9; index += 1) {
    const code = `P${index}`;
    const area = await prisma.area.upsert({
      where: { code },
      update: { name: `Area ${code}`, supervisorId: supervisors[index - 1].id, active: true },
      create: {
        code,
        name: `Area ${code}`,
        supervisorId: supervisors[index - 1].id,
        active: true
      }
    });
    areas.push(area);
  }

  const pointRules = [
    ["Idea registrada correctamente", "Registro completo con problema y propuesta claros.", 2],
    ["Idea aprobada por supervisor", "La idea supera el filtro inicial del area.", 5],
    ["Idea validada por areas soporte", "Calidad, Seguridad o Mantenimiento validaron segun aplique.", 8],
    ["Idea implementada", "La accion fue ejecutada en piso o proceso.", 10],
    ["Idea cerrada con evidencia", "Cierre con evidencia despues.", 10],
    ["Idea replicable a otra area", "Puede aplicarse en mas de una linea o area.", 8],
    ["Idea con impacto en seguridad", "Reduce una condicion insegura o riesgo ergonomico.", 10],
    ["Idea con impacto en inocuidad", "Reduce riesgo de producto, limpieza, empaque o trazabilidad.", 10],
    ["Idea con ahorro comprobado", "Incluye beneficio economico verificable.", 15]
  ] as const;

  for (const [name, description, points] of pointRules) {
    await prisma.pointRule.upsert({
      where: { id: name },
      update: {},
      create: { id: name, name, description, points, active: true }
    });
  }

  for (const factor of managerialEvaluationFactors) {
    await prisma.pointRule.upsert({
      where: { id: factor.ruleId },
      update: { name: factor.ruleName, description: factor.description, points: factor.maxPoints },
      create: { id: factor.ruleId, name: factor.ruleName, description: factor.description, points: factor.maxPoints, active: true }
    });
  }

  await prisma.setting.upsert({
    where: { key: "supportEmails" },
    update: { value: JSON.stringify({ calidad: calidad.email, seguridad: seguridad.email, mantenimiento: mantenimiento.email, mejoraContinua: mc.email }) },
    create: {
      key: "supportEmails",
      value: JSON.stringify({ calidad: calidad.email, seguridad: seguridad.email, mantenimiento: mantenimiento.email, mejoraContinua: mc.email })
    }
  });

  await prisma.setting.upsert({
    where: { key: "appName" },
    update: { value: "SISTEMA DE IDEAS DE MEJORA - PROpEx" },
    create: { key: "appName", value: "SISTEMA DE IDEAS DE MEJORA - PROpEx" }
  });

  const demoIdeas = [
    await idea({
      folio: "IM-000001",
      areaId: areas[0].id,
      supervisorId: supervisors[0].id,
      status: "REGISTRADA",
      collaboratorName: "Laura Gomez",
      employeeNumber: "1001",
      problem: "El material de limpieza se queda fuera de su punto asignado.",
      proposal: "Colocar tablero visual con sombras y responsables por turno.",
      impactsQuality: true
    }),
    await idea({
      folio: "IM-000002",
      areaId: areas[1].id,
      supervisorId: supervisors[1].id,
      status: "EN_REVISION_SUPERVISOR",
      collaboratorName: "Marco Ruiz",
      employeeNumber: "1002",
      problem: "Se duplican registros manuales de temperatura.",
      proposal: "Unificar formato y colocar lector compartido.",
      impactsQuality: true
    }),
    await idea({
      folio: "IM-000003",
      areaId: areas[2].id,
      supervisorId: supervisors[2].id,
      status: "EN_VALIDACION_CALIDAD",
      collaboratorName: "Ana Lopez",
      employeeNumber: "1003",
      problem: "El flujo de charolas genera cruces en cambio de turno.",
      proposal: "Separar entrada y salida con senalizacion y mesa de espera.",
      impactsQuality: true,
      impactsSafety: true
    }),
    await idea({
      folio: "IM-000004",
      areaId: areas[3].id,
      supervisorId: supervisors[3].id,
      status: "APROBADA_PARA_IMPLEMENTAR",
      collaboratorName: "Jose Martinez",
      employeeNumber: "1004",
      problem: "La herramienta de ajuste no tiene ubicacion fija.",
      proposal: "Instalar base marcada junto al equipo.",
      impactsSafety: true,
      requiresMaintenance: true,
      priority: "MEDIA"
    }),
    await idea({
      folio: "IM-000005",
      areaId: areas[4].id,
      supervisorId: supervisors[4].id,
      status: "EN_IMPLEMENTACION",
      collaboratorName: "Sofia Perez",
      employeeNumber: "1005",
      problem: "Hay recorridos innecesarios para surtir etiquetas.",
      proposal: "Crear punto de reposicion cercano con maximos y minimos.",
      priority: "ALTA",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5)
    }),
    await idea({
      folio: "IM-000006",
      areaId: areas[5].id,
      supervisorId: supervisors[5].id,
      status: "CERRADA",
      collaboratorName: "Daniel Castro",
      employeeNumber: "1006",
      problem: "Los formatos terminados se mezclaban con pendientes.",
      proposal: "Separar charolas y usar codificacion de color.",
      priority: "BAJA",
      pointsAssigned: 35
    }),
    await idea({
      folio: "IM-000007",
      areaId: areas[6].id,
      supervisorId: supervisors[6].id,
      status: "RECHAZADA_SUPERVISOR",
      collaboratorName: "Patricia Nunez",
      employeeNumber: "1007",
      problem: "Solicita cambiar frecuencia de sanitizacion sin validacion.",
      proposal: "Reducir de cada turno a diaria.",
      impactsQuality: true,
      rejectionReason: "No viable por requisitos de inocuidad y limpieza."
    }),
    await idea({
      folio: "IM-000008",
      areaId: areas[7].id,
      supervisorId: supervisors[7].id,
      status: "VENCIDA",
      collaboratorName: "Ramon Silva",
      employeeNumber: "1008",
      problem: "Guardas visuales de una estacion estan desgastadas.",
      proposal: "Reponer guardas e incluir inspeccion semanal.",
      impactsSafety: true,
      requiresMaintenance: true,
      priority: "CRITICA",
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
    })
  ];

  for (const demoIdea of demoIdeas) {
    if (["EN_VALIDACION_CALIDAD", "EN_VALIDACION_SEGURIDAD", "EN_VALIDACION_MANTENIMIENTO"].includes(demoIdea.status)) {
      await prisma.approval.upsert({
        where: { ideaId_type: { ideaId: demoIdea.id, type: "CALIDAD" } },
        update: {},
        create: { ideaId: demoIdea.id, type: "CALIDAD", assignedToId: calidad.id, status: "PENDING" }
      });
      await prisma.approval.upsert({
        where: { ideaId_type: { ideaId: demoIdea.id, type: "SEGURIDAD" } },
        update: {},
        create: { ideaId: demoIdea.id, type: "SEGURIDAD", assignedToId: seguridad.id, status: "PENDING" }
      });
    }

    if (demoIdea.status === "CERRADA") {
      const rules = await prisma.pointRule.findMany({ where: { active: true }, take: 4 });
      for (const rule of rules) {
        await prisma.ideaPointRule.upsert({
          where: { ideaId_pointRuleId: { ideaId: demoIdea.id, pointRuleId: rule.id } },
          update: {},
          create: { ideaId: demoIdea.id, pointRuleId: rule.id, points: rule.points }
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        entity: "Idea",
        entityId: demoIdea.id,
        action: "SEED_DEMO_DATA",
        userId: admin.id,
        details: JSON.stringify({ folio: demoIdea.folio, status: demoIdea.status })
      }
    });
  }

  await prisma.notificationOutbox.create({
    data: {
      ideaId: demoIdeas[0].id,
      channel: "EMAIL",
      to: supervisors[0].email,
      subject: "Nueva idea de mejora pendiente de revision - Folio IM-000001 - Area P1",
      body: "Notificacion demo en fallback local porque Microsoft Graph no esta configurado.",
      status: "PENDING"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
~~~~~~

## 5.3 Scripts operativos

### `scripts/backfill-kaizen-ideas.ts`

~~~~~~typescript
import { createKaizenFromIdea } from "../src/lib/kaizen-from-idea";
import { prisma } from "../src/lib/prisma";

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.startsWith("file:") && process.env.ALLOW_PRODUCTION_KAIZEN_BACKFILL !== "1") {
    throw new Error("Define ALLOW_PRODUCTION_KAIZEN_BACKFILL=1 para conciliar Kaizen en produccion.");
  }

  const fallbackLeader = await prisma.user.findFirst({
    where: { active: true, role: { in: ["MEJORA_CONTINUA", "ADMIN"] } },
    orderBy: { role: "desc" }
  });
  if (!fallbackLeader) throw new Error("No existe un usuario activo de Mejora Continua o Administrador.");

  const ideas = await prisma.idea.findMany({
    where: { classification: "KAIZEN", kaizenProject: { is: null } },
    orderBy: { createdAt: "asc" }
  });

  for (const idea of ideas) {
    const leaderId = idea.implementationOwnerId ?? fallbackLeader.id;
    const startDate = idea.createdAt;
    const proposedEnd = idea.dueDate ?? new Date(startDate.getTime() + 90 * 86_400_000);
    const project = await createKaizenFromIdea({
      ideaId: idea.id,
      leaderId,
      startDate,
      endDate: proposedEnd,
      createdById: fallbackLeader.id
    });
    await prisma.auditLog.create({
      data: {
        entity: "KaizenProject",
        entityId: project.id,
        action: "BACKFILLED_FROM_CLASSIFIED_IDEA",
        userId: fallbackLeader.id,
        details: JSON.stringify({ ideaId: idea.id, folio: project.folio })
      }
    });
  }

  console.log(`Ideas Kaizen conciliadas: ${ideas.length}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
~~~~~~

### `scripts/db-push.ts`

~~~~~~typescript
import { spawnSync } from "child_process";
import path from "path";

function prismaCli() {
  return path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
}

function run(args: string[], input?: string) {
  return spawnSync(process.execPath, [prismaCli(), ...args], {
    cwd: process.cwd(),
    env: process.env,
    input,
    encoding: "utf8",
    shell: false
  });
}

function print(result: ReturnType<typeof run>) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

function toIdempotentSql(sql: string) {
  return sql
    .replaceAll("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ")
    .replaceAll("CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX IF NOT EXISTS ");
}

function schemaPath() {
  const cliIndex = process.argv.findIndex((arg) => arg === "--schema");
  if (cliIndex >= 0 && process.argv[cliIndex + 1]) return process.argv[cliIndex + 1];
  return process.env.PRISMA_SCHEMA || "prisma/schema.prisma";
}

const schema = schemaPath();
const schemaArgs = ["--schema", schema];
const direct = run(["db", "push", ...schemaArgs]);
if (direct.status === 0) {
  print(direct);
  process.exit(0);
}

print(direct);
console.warn("Prisma db push fallo; aplicando fallback via migrate diff + db execute.");

const diff = run(["migrate", "diff", "--from-empty", "--to-schema-datamodel", schema, "--script"]);
if (diff.status !== 0 || !diff.stdout) {
  print(diff);
  process.exit(diff.status ?? 1);
}

const execute = run(["db", "execute", ...schemaArgs, "--stdin"], toIdempotentSql(diff.stdout));
print(execute);
if (execute.status !== 0) {
  process.exit(execute.status ?? 1);
}

const generate = run(["generate", ...schemaArgs]);
print(generate);
process.exit(generate.status ?? 0);
~~~~~~

### `scripts/export-demo.ts`

~~~~~~typescript
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { buildIdeasWorkbook } from "../src/lib/export";

async function main() {
  const workbook = await buildIdeasWorkbook();
  const date = new Date().toISOString().slice(0, 10);
  const outputDir = path.join(process.cwd(), "exports");
  const outputPath = path.join(outputDir, `Ideas_Mejora_PROpEx_${date}.xlsx`);
  await mkdir(outputDir, { recursive: true });
  const buffer = await workbook.xlsx.writeBuffer();
  await writeFile(outputPath, Buffer.from(buffer));
  console.log(`Exportacion generada: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
~~~~~~

### `scripts/reminders.ts`

~~~~~~typescript
import { prisma } from "../src/lib/prisma";
import { markOverdueIdeas } from "../src/lib/workflow";

async function main() {
  const count = await markOverdueIdeas();
  console.log(`Recordatorios procesados. Ideas vencidas actualizadas: ${count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
~~~~~~

### `scripts/seed-dashboard-examples.ts`

~~~~~~typescript
import {
  GenbaStatus,
  KaizenStatus,
  PrismaClient,
  WorkItemStatus
} from "@prisma/client";

const prisma = new PrismaClient();
const DAY = 86_400_000;
const dateFromToday = (offset: number) => new Date(Date.now() + offset * DAY);

const kaizenExamples: Array<{
  title: string;
  plant: string;
  area: string;
  objective: string;
  status: KaizenStatus;
  start: number;
  end: number;
  estimatedSavings: number;
  realSavings: number;
  progress: number;
}> = [
  { title: "SMED en cambio de presentación P1", plant: "Apodaca", area: "Producción P1", objective: "Reducir el cambio de presentación de 48 a 28 minutos.", status: "EN_CURSO", start: -92, end: 22, estimatedSavings: 185000, realSavings: 92000, progress: 62 },
  { title: "Control visual de materiales indirectos", plant: "Apodaca", area: "Almacén secos", objective: "Eliminar faltantes y reducir 30% el tiempo de surtido.", status: "PENDIENTE_CHARTER", start: -18, end: 72, estimatedSavings: 68000, realSavings: 0, progress: 0 },
  { title: "Optimización del flujo de empaque P3", plant: "Apodaca", area: "Producción P3", objective: "Incrementar 12% la productividad sin aumentar personal.", status: "EN_CURSO", start: -118, end: 12, estimatedSavings: 245000, realSavings: 198000, progress: 78 },
  { title: "Reducción de merma en corte", plant: "El Carmen", area: "Valor Agregado", objective: "Disminuir la merma del proceso de 4.8% a 3.2%.", status: "PLANIFICACION", start: -24, end: 96, estimatedSavings: 320000, realSavings: 28000, progress: 18 },
  { title: "Estandarización de liberación de calidad", plant: "Apodaca", area: "Calidad e Inocuidad", objective: "Reducir a menos de 20 minutos la liberación de producto.", status: "COMPLETADO", start: -190, end: -52, estimatedSavings: 96000, realSavings: 112000, progress: 100 },
  { title: "Disponibilidad de selladoras críticas", plant: "El Carmen", area: "Mantenimiento", objective: "Elevar la disponibilidad técnica de 89% a 96%.", status: "EN_PAUSA", start: -105, end: 38, estimatedSavings: 410000, realSavings: 120000, progress: 44 },
  { title: "Rutas internas de embarques", plant: "Apodaca", area: "Logística", objective: "Reducir recorridos de montacargas y tiempos de espera en andenes.", status: "EN_CURSO", start: -64, end: 48, estimatedSavings: 155000, realSavings: 54000, progress: 52 },
  { title: "Prevención de atrapamientos en tarimas", plant: "El Carmen", area: "Seguridad", objective: "Eliminar condiciones de atrapamiento en maniobras de tarimas.", status: "EN_CURSO", start: -76, end: 18, estimatedSavings: 75000, realSavings: 61000, progress: 71 },
  { title: "Digitalización de formatos de producción", plant: "Apodaca", area: "Producción P2", objective: "Eliminar captura duplicada y recuperar 18 horas administrativas al mes.", status: "COMPLETADO", start: -220, end: -84, estimatedSavings: 132000, realSavings: 146000, progress: 100 },
  { title: "Balanceo de carga en servicios generales", plant: "El Carmen", area: "Servicios Generales", objective: "Mejorar cobertura de rutinas y reducir pendientes semanales 40%.", status: "EN_CURSO", start: -42, end: 78, estimatedSavings: 84000, realSavings: 19000, progress: 33 }
];

const genbaExamples: Array<{
  area: string;
  visit: number;
  status: GenbaStatus;
  expected: number;
  attended: number;
  completion: number;
}> = [
  { area: "Producción P1", visit: -5, status: "ABIERTO", expected: 7, attended: 6, completion: 35 },
  { area: "Producción P3", visit: -12, status: "ABIERTO", expected: 7, attended: 5, completion: 50 },
  { area: "Almacén secos", visit: -19, status: "ABIERTO", expected: 6, attended: 4, completion: 25 },
  { area: "Mantenimiento", visit: -27, status: "ABIERTO", expected: 5, attended: 5, completion: 60 },
  { area: "Valor Agregado", visit: -36, status: "CERRADO", expected: 7, attended: 7, completion: 100 },
  { area: "Calidad e Inocuidad", visit: -45, status: "ABIERTO", expected: 6, attended: 5, completion: 70 },
  { area: "Embarques", visit: -57, status: "ABIERTO", expected: 7, attended: 4, completion: 20 },
  { area: "Servicios Generales", visit: -69, status: "CERRADO", expected: 5, attended: 5, completion: 100 },
  { area: "Producción P2", visit: -83, status: "ABIERTO", expected: 7, attended: 6, completion: 45 },
  { area: "Seguridad", visit: -105, status: "CERRADO", expected: 6, attended: 6, completion: 100 }
];

function workStatus(index: number, total: number, completion: number, variant: number): WorkItemStatus {
  const closedCount = Math.round((completion / 100) * total);
  if (index < closedCount) return "COMPLETADA";
  if (index === closedCount && completion < 100) return "EN_PROCESO";
  if (index === closedCount + 1 && variant % 3 === 0) return "BLOQUEADA";
  return "PENDIENTE";
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const explicitProductionSeed = process.env.ALLOW_PRODUCTION_DEMO_SEED === "1";
  if (!databaseUrl.startsWith("file:") && !explicitProductionSeed) {
    throw new Error("La carga en una base en línea requiere ALLOW_PRODUCTION_DEMO_SEED=1.");
  }

  const users = await prisma.user.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } });
  if (!users.length) throw new Error("No hay usuarios locales para asignar responsables.");

  await prisma.genbaWalk.deleteMany({ where: { folio: { startsWith: "DEMO-GENBA-" } } });
  await prisma.kaizenProject.deleteMany({ where: { folio: { startsWith: "DEMO-KZN-" } } });

  const kaizenMax = await prisma.kaizenProject.aggregate({ _max: { number: true } });
  const genbaMax = await prisma.genbaWalk.aggregate({ _max: { number: true } });
  const createdKaizenIds: string[] = [];
  const createdGenbaIds: string[] = [];

  for (const [index, example] of kaizenExamples.entries()) {
    const number = (kaizenMax._max.number ?? 0) + index + 1;
    const activityCount = 5 + (index % 3);
    const duration = example.end - example.start;
    const project = await prisma.kaizenProject.create({
      data: {
        number,
        folio: `DEMO-KZN-${String(index + 1).padStart(3, "0")}`,
        title: example.title,
        plant: example.plant,
        area: example.area,
        objective: example.objective,
        scope: "Ejemplo representativo para validar el centro de mando.",
        baselineValue: 100,
        targetValue: 70,
        currentValue: Math.max(70, 100 - Math.round(example.progress * 0.3)),
        unit: "Índice",
        estimatedSavings: example.estimatedSavings,
        realSavings: example.realSavings,
        status: example.status,
        startDate: dateFromToday(example.start),
        endDate: dateFromToday(example.end),
        closedAt: example.status === "COMPLETADO" ? dateFromToday(example.end - 2) : null,
        leaderId: users[index % users.length].id,
        createdById: users[0].id,
        createdAt: dateFromToday(example.start - 7),
        activities: {
          create: Array.from({ length: activityCount }, (_, activityIndex) => {
            const status = workStatus(activityIndex, activityCount, example.progress, index);
            const dueOffset = Math.round(example.start + ((activityIndex + 1) * duration) / (activityCount + 1));
            return {
              number: activityIndex + 1,
              problem: `Oportunidad ${activityIndex + 1} asociada a ${example.area}`,
              action: ["Definir estándar", "Ejecutar prueba piloto", "Validar resultado", "Capacitar al equipo", "Cerrar controles", "Auditar sostenimiento", "Documentar lección"][activityIndex],
              ownerId: activityIndex === activityCount - 1 && index % 4 === 0 ? null : users[(index + activityIndex) % users.length].id,
              startDate: dateFromToday(dueOffset - 14),
              dueDate: dateFromToday(dueOffset),
              status,
              closedAt: status === "COMPLETADA" ? dateFromToday(Math.min(-1, dueOffset + (activityIndex % 3 === 0 ? 2 : -2))) : null,
              createdAt: dateFromToday(example.start)
            };
          })
        },
        ...(example.status === "PENDIENTE_CHARTER" ? {} : {
          attachments: {
            create: {
              type: "CHARTER",
              filename: `project-charter-demo-${index + 1}.pdf`,
              path: "/demo/project-charter.pdf",
              uploadedBy: users[0].email
            }
          }
        })
      }
    });
    createdKaizenIds.push(project.id);
  }

  const departments = ["Producción", "Calidad / Inocuidad", "Mantenimiento", "Seguridad", "Mejora Continua", "Almacén", "Supervisión"];
  for (const [index, example] of genbaExamples.entries()) {
    const number = (genbaMax._max.number ?? 0) + index + 1;
    const activityCount = 5 + (index % 3 === 1 ? 1 : 0);
    const expected = departments.slice(0, example.expected);
    const attended = expected.slice(0, example.attended);
    const walk = await prisma.genbaWalk.create({
      data: {
        number,
        folio: `DEMO-GENBA-${String(index + 1).padStart(3, "0")}`,
        areaName: example.area,
        visitDate: dateFromToday(example.visit),
        expectedDepartments: JSON.stringify(expected),
        attendedDepartments: JSON.stringify(attended),
        notes: "Recorrido de demostración para validar tendencias y seguimiento.",
        status: example.status,
        coordinatorId: users[index % users.length].id,
        createdById: users[0].id,
        closedAt: example.status === "CERRADO" ? dateFromToday(example.visit + 24) : null,
        createdAt: dateFromToday(example.visit),
        activities: {
          create: Array.from({ length: activityCount }, (_, activityIndex) => {
            const status = workStatus(activityIndex, activityCount, example.completion, index + 1);
            const dueOffset = example.visit + 14 + activityIndex * 8;
            return {
              number: activityIndex + 1,
              problem: ["Condición fuera de estándar", "Material sin identificación", "Punto de limpieza pendiente", "Riesgo en recorrido", "Flujo con espera", "Control visual incompleto"][activityIndex],
              action: ["Restablecer condición", "Identificar y delimitar", "Ejecutar limpieza profunda", "Instalar control preventivo", "Balancear el flujo", "Actualizar ayuda visual"][activityIndex],
              ownerId: activityIndex === activityCount - 1 && index % 3 === 0 ? null : users[(index + activityIndex + 1) % users.length].id,
              dueDate: dateFromToday(dueOffset),
              status,
              closedAt: status === "COMPLETADA" ? dateFromToday(Math.min(-1, dueOffset + (activityIndex % 2 ? 1 : -1))) : null,
              createdAt: dateFromToday(example.visit)
            };
          })
        }
      }
    });
    createdGenbaIds.push(walk.id);
  }

  const promotableGenbaActivities = await prisma.genbaActivity.findMany({
    where: { walkId: { in: createdGenbaIds }, status: { not: "COMBINADA" } },
    orderBy: { createdAt: "asc" },
    take: 2
  });
  const targetKaizenActivities = await prisma.kaizenActivity.findMany({
    where: { projectId: { in: createdKaizenIds }, sourceGenbaActivityId: null },
    orderBy: { createdAt: "asc" },
    take: 2
  });
  for (let index = 0; index < Math.min(promotableGenbaActivities.length, targetKaizenActivities.length); index += 1) {
    await prisma.kaizenActivity.update({
      where: { id: targetKaizenActivities[index].id },
      data: { sourceGenbaActivityId: promotableGenbaActivities[index].id }
    });
  }

  console.log(`Ejemplos creados: ${createdKaizenIds.length} Kaizen y ${createdGenbaIds.length} GENBA.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
~~~~~~

### `scripts/seed-managerial-point-rules.ts`

~~~~~~typescript
import { PrismaClient } from "@prisma/client";
import { managerialEvaluationFactors } from "../src/lib/managerial-evaluation";

const prisma = new PrismaClient();

async function main() {
  for (const factor of managerialEvaluationFactors) {
    await prisma.pointRule.upsert({
      where: { id: factor.ruleId },
      update: { name: factor.ruleName, description: factor.description, points: factor.maxPoints },
      create: {
        id: factor.ruleId,
        name: factor.ruleName,
        description: factor.description,
        points: factor.maxPoints,
        active: true
      }
    });
  }
  console.log(`Reglas gerenciales listas: ${managerialEvaluationFactors.length}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
~~~~~~

### `scripts/seed-organization.ts`

~~~~~~typescript
import { ensureOrganizationStructure } from "../src/lib/organization";
import { prisma } from "../src/lib/prisma";

async function main() {
  await ensureOrganizationStructure();
  const [plants, units, captureAreas] = await Promise.all([
    prisma.plant.count(),
    prisma.orgUnit.count(),
    prisma.orgUnit.count({ where: { qrEnabled: true, captureAreaId: { not: null } } })
  ]);
  console.log(`Estructura lista: ${plants} plantas, ${units} unidades, ${captureAreas} areas con QR.`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
~~~~~~

## 5.4 Rutas, páginas, acciones y APIs

### `src/app/(app)/auditoria/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { Clock3, FileSearch, UserRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const actionLabels: Record<string, string> = {
  IDEA_CREATED: "Idea registrada",
  SUPERVISOR_APPROVED: "Supervisor aprobo",
  SUPERVISOR_REJECTED: "Supervisor rechazo",
  SUPERVISOR_MORE_INFO: "Supervisor solicitó información",
  MC_CLASSIFIED: "Mejora Continua clasifico",
  IMPLEMENTATION_ASSIGNED: "Implementación asignada",
  IMPLEMENTATION_UPDATED: "Avance actualizado",
  IDEA_CLOSED: "Idea cerrada",
  IDEA_CLOSED_REVIEWED_POINTS: "Idea cerrada con ProbocaCoins revisadas",
  PROBOCACOINS_REASSIGNED: "ProbocaCoins otorgadas nuevamente",
  AUTO_POINTS_REMOVED: "ProbocaCoins retiradas",
  IDEA_CANCELLED: "Idea cancelada",
  COMMENT_ADDED: "Comentario agregado",
  AREA_UPDATED: "Área actualizada",
  POINT_RULE_UPDATED: "Regla de ProbocaCoins actualizada",
  POINT_RULE_CREATED: "Regla de ProbocaCoins creada",
  USER_CREATED: "Usuario creado",
  USER_UPDATED: "Usuario actualizado"
};

function readableAction(action: string) {
  return actionLabels[action] ?? action.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

export default async function AuditPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const logs = await prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 120 });

  return (
    <>
      <PageHeader eyebrow="Control · Trazabilidad" title="Auditoría" description="Historial cronológico de decisiones y cambios importantes en el sistema." />

      <div className="mobile-card-list">
        {logs.map((log) => (
          <article className="surface rounded-lg p-4" key={log.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-ink">{readableAction(log.action)}</p>
                <p className="mt-1 text-xs text-slate-500">{log.entity === "Idea" ? <Link className="font-bold text-brand-700" href={`/ideas/${log.entityId}`}>Abrir idea</Link> : log.entity}</p>
              </div>
              <FileSearch className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" aria-hidden />{log.user?.name ?? "Sistema"}</span>
              <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" aria-hidden />{log.createdAt.toLocaleString("es-MX")}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="table-wrap desktop-table-only">
        <table className="data-table">
          <thead><tr><th>Fecha</th><th>Registro</th><th>Acción</th><th>Usuario</th><th>Detalle técnico</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap">{log.createdAt.toLocaleString("es-MX")}</td>
                <td>{log.entity === "Idea" ? <Link className="font-extrabold text-brand-700 hover:underline" href={`/ideas/${log.entityId}`}>Idea</Link> : log.entity}</td>
                <td className="font-bold text-slate-800">{readableAction(log.action)}</td>
                <td className="whitespace-nowrap">{log.user?.name ?? "Sistema"}</td>
                <td className="max-w-lg"><details><summary className="cursor-pointer text-xs font-bold text-slate-600">Ver detalle</summary><pre className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-500">{log.details}</pre></details></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
~~~~~~

### `src/app/(app)/configuracion/estructura/actions.ts`

~~~~~~typescript
"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import type { OrganizationActionResult } from "@/lib/organization-types";
import { prisma } from "@/lib/prisma";

const unitSchema = z.object({
  unitId: z.string().trim().optional(),
  plantId: z.string().trim().min(1),
  parentId: z.string().trim().optional(),
  type: z.enum(["MACROPROCESO", "DEPARTAMENTO", "AREA", "PROCESO"]),
  name: z.string().trim().min(2, "Escribe un nombre de al menos 2 caracteres."),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,32}$/, "Usa un codigo de 2 a 32 caracteres, sin espacios."),
  responsible: z.string().trim().min(2, "Indica el responsable o puesto."),
  manager: z.string().trim().min(2, "Indica el jefe directo o gerente."),
  routingUserId: z.string().trim().optional(),
  qrEnabled: z.boolean(),
  active: z.boolean()
});

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isChecked(formData: FormData, key: string) {
  return ["on", "true", "1", "yes", "si"].includes(value(formData, key).toLowerCase());
}

function refreshOrganizationPaths(captureCodes: string[] = []) {
  revalidatePath("/configuracion/estructura");
  revalidatePath("/configuracion");
  revalidatePath("/qr");
  for (const code of captureCodes) revalidatePath(`/captura/${code}`);
}

export async function saveOrganizationUnitAction(formData: FormData): Promise<OrganizationActionResult> {
  const admin = await requireUser(["ADMIN"]);
  const parsed = unitSchema.safeParse({
    unitId: value(formData, "unitId") || undefined,
    plantId: value(formData, "plantId"),
    parentId: value(formData, "parentId") || undefined,
    type: value(formData, "type"),
    name: value(formData, "name"),
    code: value(formData, "code"),
    responsible: value(formData, "responsible"),
    manager: value(formData, "manager"),
    routingUserId: value(formData, "routingUserId") || undefined,
    qrEnabled: isChecked(formData, "qrEnabled"),
    active: isChecked(formData, "active")
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos capturados." };
  }

  const input = parsed.data;
  const plant = await prisma.plant.findUnique({ where: { id: input.plantId } });
  if (!plant) return { ok: false, message: "La planta seleccionada ya no existe." };

  const parent = input.parentId ? await prisma.orgUnit.findUnique({ where: { id: input.parentId } }) : null;
  if (input.parentId && (!parent || parent.plantId !== plant.id)) {
    return { ok: false, message: "El departamento superior no pertenece a la planta seleccionada." };
  }

  const routingUser = input.routingUserId
    ? await prisma.user.findFirst({ where: { id: input.routingUserId, active: true } })
    : null;
  if (input.routingUserId && !routingUser) {
    return { ok: false, message: "El usuario responsable no existe o esta inactivo." };
  }

  const duplicate = await prisma.orgUnit.findFirst({
    where: { code: input.code, ...(input.unitId ? { id: { not: input.unitId } } : {}) }
  });
  if (duplicate) return { ok: false, message: `El codigo ${input.code} ya esta asignado a ${duplicate.name}.` };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = input.unitId
        ? await tx.orgUnit.findUnique({ where: { id: input.unitId }, include: { captureArea: true } })
        : null;
      if (input.unitId && !existing) throw new Error("UNIT_NOT_FOUND");
      if (existing && existing.plantId !== plant.id) throw new Error("PLANT_MISMATCH");

      let captureArea = existing?.captureArea ?? null;
      const oldCaptureCode = captureArea?.code ?? null;

      if (input.qrEnabled) {
        if (!captureArea) {
          const availableArea = await tx.area.findUnique({ where: { code: input.code } });
          if (availableArea) {
            const linkedUnit = await tx.orgUnit.findFirst({ where: { captureAreaId: availableArea.id } });
            if (linkedUnit && linkedUnit.id !== existing?.id) throw new Error("AREA_ALREADY_LINKED");
          }
          captureArea = availableArea
            ? await tx.area.update({ where: { id: availableArea.id }, data: { name: input.name, active: input.active, supervisorId: routingUser?.id ?? null } })
            : await tx.area.create({ data: { code: input.code, name: input.name, active: input.active, supervisorId: routingUser?.id ?? null } });
        } else {
          const captureCode = existing && captureArea.code === existing.code ? input.code : captureArea.code;
          captureArea = await tx.area.update({
            where: { id: captureArea.id },
            data: { code: captureCode, name: input.name, active: input.active, supervisorId: routingUser?.id ?? null }
          });
        }
      } else if (captureArea) {
        captureArea = await tx.area.update({ where: { id: captureArea.id }, data: { active: false, supervisorId: routingUser?.id ?? captureArea.supervisorId } });
      }

      const commonData = {
        plantId: plant.id,
        parentId: parent?.id ?? null,
        type: input.type,
        code: input.code,
        name: input.name,
        responsible: input.responsible,
        manager: input.manager,
        routingUserId: routingUser?.id ?? null,
        qrEnabled: input.qrEnabled,
        active: input.active,
        ...(captureArea ? { captureAreaId: captureArea.id } : {})
      };

      const unit = existing
        ? await tx.orgUnit.update({ where: { id: existing.id }, data: commonData })
        : await tx.orgUnit.create({
          data: {
            ...commonData,
            sortOrder: await tx.orgUnit.count({ where: { plantId: plant.id, parentId: parent?.id ?? null } })
          }
        });

      return { unit, captureCode: captureArea?.code ?? null, oldCaptureCode };
    });

    await auditLog({
      entity: "OrgUnit",
      entityId: result.unit.id,
      action: input.unitId ? "ORG_UNIT_UPDATED" : "ORG_UNIT_CREATED",
      userId: admin.id,
      details: { plant: plant.code, code: input.code, qrEnabled: input.qrEnabled, routingUserId: routingUser?.id ?? null }
    });
    refreshOrganizationPaths([result.oldCaptureCode, result.captureCode].filter((code): code is string => Boolean(code)));

    const routingMessage = input.qrEnabled && !routingUser
      ? " El QR quedo activo, pero debes asignar un usuario para que reciba las ideas y correos."
      : "";
    return { ok: true, message: `${input.name} se guardo correctamente en ${plant.name}.${routingMessage}` };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: "El codigo o el area de captura ya esta en uso." };
    }
    if (error instanceof Error && error.message === "AREA_ALREADY_LINKED") {
      return { ok: false, message: "Esa area de captura ya esta vinculada con otro elemento de la estructura." };
    }
    if (error instanceof Error && ["UNIT_NOT_FOUND", "PLANT_MISMATCH"].includes(error.message)) {
      return { ok: false, message: "El elemento que intentas modificar ya no esta disponible." };
    }
    console.error("saveOrganizationUnitAction", error);
    return { ok: false, message: "No pudimos guardar la estructura. Intenta nuevamente." };
  }
}
~~~~~~

### `src/app/(app)/configuracion/estructura/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { ArrowLeft, Database, QrCode } from "lucide-react";
import { OrganizationBuilder } from "@/components/organization-builder";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { getOrganizationStructure } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

export default async function OrganizationStructurePage() {
  await requireUser(["ADMIN"]);
  const [structure, users] = await Promise.all([
    getOrganizationStructure(),
    prisma.user.findMany({
      where: { active: true, role: { not: "COLABORADOR" } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true }
    })
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Administracion · Estructura y responsables"
        title="Estructura organizacional"
        description="Selecciona la planta y administra departamentos, areas, responsables, jefes directos y rutas de captura."
        actions={<Link className="btn btn-secondary" href="/configuracion"><ArrowLeft className="h-4 w-4" aria-hidden />Volver a configuracion</Link>}
      />

      <div className="alert alert-success mb-5">
        <Database className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div><p className="font-extrabold">Estructura conectada al sistema</p><p className="mt-0.5 leading-5">Los cambios se guardan en la base de datos y quedan registrados. Las unidades con QR se sincronizan con las areas de captura.</p></div>
      </div>

      <div className="no-print mb-5 flex justify-end">
        <Link className="btn btn-secondary" href="/qr"><QrCode className="h-4 w-4" aria-hidden />Revisar QR activos</Link>
      </div>

      <OrganizationBuilder initialStructure={structure} users={users} />
    </>
  );
}
~~~~~~

### `src/app/(app)/configuracion/page.tsx`

~~~~~~tsx
import { Building2, CircleCheck, KeyRound, Mail, Network, Plus, SlidersHorizontal, UserCog, UsersRound } from "lucide-react";
import { createPointRuleAction, createUserAction, updateAreaAction, updatePointRuleAction, updateUserAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { requireUser } from "@/lib/auth";
import { roleLabels } from "@/lib/domain";
import { isManagerialEvaluationRule } from "@/lib/managerial-evaluation";
import { prisma } from "@/lib/prisma";

const configurableRoles = ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO"] as const;

type ConfigPageProps = {
  searchParams: Promise<{ error?: string; success?: string; user?: string }>;
};

const roleTone = {
  ADMIN: "bg-slate-950 text-white",
  MEJORA_CONTINUA: "bg-slate-800 text-white",
  SUPERVISOR: "bg-emerald-50 text-emerald-800",
  CALIDAD: "bg-red-50 text-red-800",
  SEGURIDAD: "bg-slate-100 text-slate-700",
  MANTENIMIENTO: "bg-blue-50 text-blue-800"
};

export default async function ConfigPage({ searchParams }: ConfigPageProps) {
  await requireUser(["ADMIN"]);
  const query = await searchParams;
  const [areas, assignableUsers, users, pointRules] = await Promise.all([
    prisma.area.findMany({ include: { supervisor: true }, orderBy: { code: "asc" } }),
    prisma.user.findMany({ where: { role: { in: [...configurableRoles] }, active: true }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
    prisma.user.findMany({ where: { role: { in: [...configurableRoles] } }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
    prisma.pointRule.findMany({ orderBy: { createdAt: "asc" } })
  ]);

  const errorMessage = query.error === "correo"
    ? "Ese correo ya pertenece a otro usuario."
    : query.error === "correo_invalido"
      ? "Escribe un correo valido, por ejemplo nombre@proboca.net."
    : query.error === "contrasena"
      ? "La contraseña debe tener al menos 8 caracteres."
      : query.error === "usuario"
        ? "El usuario que intentas modificar ya no existe."
      : query.error
        ? "Revisa la información capturada."
        : null;
  const successMessage = query.success === "usuario_actualizado"
    ? "Los datos y el correo se actualizaron correctamente. Los avisos pendientes ahora usan el correo nuevo."
    : query.success === "usuario_creado"
      ? "El usuario fue creado y ya puede usar su correo para iniciar sesion."
      : query.success === "area_actualizada"
        ? "El area y su responsable se actualizaron en la estructura, los QR y las rutas de seguimiento."
      : null;

  return (
    <>
      <PageHeader eyebrow="Administración · Directorio y reglas" title="Configuración" description="Controla accesos, correos, módulos disponibles, áreas y reglas de ProbocaCoins." />

      {errorMessage ? <div className="alert alert-danger mb-5"><KeyRound className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{errorMessage}</span></div> : null}
      {successMessage ? <div className="alert alert-success mb-5"><CircleCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{successMessage}</span></div> : null}

      <nav aria-label="Secciones de configuración" className="no-print mb-6 flex gap-2 overflow-x-auto border-b border-line pb-3">
        <a className="btn btn-secondary shrink-0" href="#usuarios"><UsersRound className="h-4 w-4" aria-hidden />Usuarios</a>
        <a className="btn btn-secondary shrink-0" href="#areas"><Building2 className="h-4 w-4" aria-hidden />Áreas</a>
        <a className="btn btn-secondary shrink-0" href="/configuracion/estructura"><Network className="h-4 w-4" aria-hidden />Estructura organizacional</a>
        <a className="btn btn-secondary shrink-0" href="#puntos"><SlidersHorizontal className="h-4 w-4" aria-hidden />Reglas de ProbocaCoins</a>
      </nav>

      <div className="alert alert-info mb-7">
        <Mail className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div><p className="font-extrabold">Directorio de notificaciones</p><p className="mt-0.5 leading-5">Puedes crear varias personas para un mismo departamento. Cualquier usuario activo recibira los avisos que correspondan a su rol.</p></div>
      </div>

      <section className="scroll-mt-6" id="usuarios">
        <SectionHeading count={users.length} description="Solo el administrador puede crear accesos, cambiar correos o desactivar cuentas." title="Usuarios y correos" />

        <details className="details-panel mb-4 border-dashed border-slate-400" open={Boolean(query.error && !query.user)}>
          <summary><span className="flex items-center gap-2 text-brand-700"><Plus className="h-4 w-4" aria-hidden />Agregar una persona</span></summary>
          <form action={createUserAction} className="grid gap-4 p-4 lg:grid-cols-2 xl:grid-cols-3">
            <label><span className="label">Nombre completo</span><input className="field" name="name" placeholder="Nombre y apellidos" required /></label>
            <label><span className="label">Correo de acceso y notificaciones</span><input autoComplete="off" className="field" name="email" placeholder="nombre@proboca.net" required type="email" /></label>
            <label><span className="label">Departamento / rol</span><select className="field" name="role" defaultValue="MEJORA_CONTINUA">{configurableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
            <label><span className="label">Contraseña temporal</span><input autoComplete="new-password" className="field" minLength={8} name="password" placeholder="Minimo 8 caracteres" required type="password" /></label>
            <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-slate-700"><input defaultChecked name="active" type="checkbox" />Acceso activo</label>
            <fieldset className="rounded-lg border border-line bg-panel p-3"><legend className="px-1 text-xs font-extrabold text-ink">Módulos adicionales</legend><div className="mt-2 flex flex-wrap gap-4 text-sm font-bold text-slate-700"><label className="flex items-center gap-2"><input name="kaizenAccess" type="checkbox" />Kaizen</label><label className="flex items-center gap-2"><input name="genbaAccess" type="checkbox" />GENBA</label></div></fieldset>
            <div className="flex items-end"><button className="btn btn-primary w-full" type="submit"><Plus className="h-4 w-4" aria-hidden />Crear usuario</button></div>
          </form>
        </details>

        <div className="grid gap-3">
          {users.map((user) => (
            <details className="details-panel" data-user-email={user.email.toLowerCase()} data-testid={`user-${user.id}`} key={user.id} open={query.user === user.id}>
              <summary>
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${roleTone[user.role as keyof typeof roleTone]}`}>{user.name.charAt(0).toUpperCase()}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-extrabold text-ink">{user.name}</span><span className="block truncate text-xs font-normal text-slate-500">{user.email}</span></span>
                </span>
                <span className="ml-auto hidden items-center gap-2 pr-2 sm:flex"><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${roleTone[user.role as keyof typeof roleTone]}`}>{roleLabels[user.role]}</span><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${user.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{user.active ? "Activo" : "Inactivo"}</span></span>
              </summary>
              <form action={updateUserAction} className="grid gap-4 p-4 lg:grid-cols-2 xl:grid-cols-3">
                <input name="userId" type="hidden" value={user.id} />
                <label><span className="label">Nombre</span><input className="field" name="name" defaultValue={user.name} required /></label>
                <label><span className="label">Correo real</span><input className="field" name="email" defaultValue={user.email} required type="email" /></label>
                <label><span className="label">Departamento / rol</span><select className="field" name="role" defaultValue={user.role}>{configurableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
                <label><span className="label">Cambiar contraseña</span><input autoComplete="new-password" className="field" minLength={8} name="password" placeholder="Dejar vacio para conservar" type="password" /></label>
                <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-slate-700"><input defaultChecked={user.active} name="active" type="checkbox" />Acceso activo</label>
                <fieldset className="rounded-lg border border-line bg-panel p-3"><legend className="px-1 text-xs font-extrabold text-ink">Módulos adicionales</legend><div className="mt-2 flex flex-wrap gap-4 text-sm font-bold text-slate-700"><label className="flex items-center gap-2"><input defaultChecked={user.kaizenAccess} name="kaizenAccess" type="checkbox" />Kaizen</label><label className="flex items-center gap-2"><input defaultChecked={user.genbaAccess} name="genbaAccess" type="checkbox" />GENBA</label></div></fieldset>
                <div className="flex items-end"><button className="btn btn-secondary w-full" type="submit"><UserCog className="h-4 w-4" aria-hidden />Guardar cambios</button></div>
              </form>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10 scroll-mt-6" id="areas">
        <SectionHeading count={areas.length} description="Define el nombre visible, supervisor responsable y disponibilidad de cada QR." title="Áreas y supervisores" tone="green" />
        <div className="grid gap-3">
          {areas.map((area) => (
            <details className="details-panel" key={area.id}>
              <summary><span className="flex items-center gap-3"><span className="flex h-9 w-12 items-center justify-center rounded-lg bg-emerald-700 text-xs font-extrabold text-white">{area.code}</span><span><span className="block text-sm font-extrabold text-ink">{area.name}</span><span className="block text-xs font-normal text-slate-500">{area.supervisor?.name ?? "Sin supervisor"}</span></span></span><span className={`ml-auto mr-2 hidden rounded-full px-2 py-1 text-[10px] font-extrabold sm:inline-flex ${area.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{area.active ? "Activa" : "Inactiva"}</span></summary>
              <form action={updateAreaAction} className="grid gap-4 p-4 md:grid-cols-[1fr_1fr_140px_auto]">
                <input name="areaId" type="hidden" value={area.id} />
                <label><span className="label">Nombre del área</span><input className="field" name="name" defaultValue={area.name} required /></label>
                <label><span className="label">Responsable de recibir ideas</span><select className="field" name="supervisorId" defaultValue={area.supervisorId ?? ""}><option value="">Sin responsable</option>{assignableUsers.map((person) => <option key={person.id} value={person.id}>{person.name} · {roleLabels[person.role]}</option>)}</select></label>
                <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-slate-700"><input defaultChecked={area.active} name="active" type="checkbox" />Área activa</label>
                <div className="flex items-end"><button className="btn btn-secondary w-full" type="submit">Guardar</button></div>
              </form>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10 scroll-mt-6" id="puntos">
        <SectionHeading count={pointRules.length} description="Estas reglas aparecen como sugerencia automatica y pueden ajustarse antes del cierre." title="Reglas de ProbocaCoins" />

        <details className="details-panel mb-4 border-dashed border-slate-400">
          <summary><span className="flex items-center gap-2 text-brand-700"><Plus className="h-4 w-4" aria-hidden />Crear una regla</span></summary>
          <form action={createPointRuleAction} className="grid gap-4 p-4 md:grid-cols-[1fr_1.5fr_110px_auto]">
            <label><span className="label">Nombre</span><input className="field" name="name" required /></label>
            <label><span className="label">Descripcion</span><input className="field" name="description" required /></label>
            <label><span className="label">ProbocaCoins</span><input className="field" name="points" min={0} required type="number" /></label>
            <div className="flex items-end"><button className="btn btn-primary w-full" type="submit">Crear</button></div>
          </form>
        </details>

        <div className="grid gap-3">
          {pointRules.map((rule) => {
            const managerial = isManagerialEvaluationRule(rule.id);
            return (
            <details className="details-panel" key={rule.id}>
              <summary><span className="min-w-0"><span className="block truncate text-sm font-extrabold text-ink">{rule.name}</span><span className="block truncate text-xs font-normal text-slate-500">{rule.description}</span></span><span className="ml-auto mr-2 flex items-center gap-2"><span className="text-sm font-extrabold text-emerald-700">+{rule.points}</span><span className={`hidden rounded-full px-2 py-1 text-[10px] font-extrabold sm:inline-flex ${rule.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{rule.active ? "Activa" : "Inactiva"}</span></span></summary>
              <form action={updatePointRuleAction} className="grid gap-4 p-4 md:grid-cols-[1fr_1.5fr_110px_120px_auto]">
                <input name="pointRuleId" type="hidden" value={rule.id} />
                <label><span className="label">Regla</span><input className="field" name="name" defaultValue={rule.name} required /></label>
                <label><span className="label">Descripcion</span><input className="field" name="description" defaultValue={rule.description} required /></label>
                <label><span className="label">{managerial ? "ProbocaCoins maximas" : "ProbocaCoins"}</span><input className="field" name="points" defaultValue={rule.points} min={0} readOnly={managerial} type="number" required /></label>
                <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-slate-700"><input defaultChecked={rule.active} name="active" type="checkbox" />Regla activa</label>
                <div className="flex items-end"><button className="btn btn-secondary w-full" type="submit">Guardar</button></div>
              </form>
            </details>
            );
          })}
        </div>
      </section>
    </>
  );
}
~~~~~~

### `src/app/(app)/dashboard/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { Download, Plus, QrCode } from "lucide-react";
import { DashboardCommandCenter, type DashboardIdea } from "@/components/dashboard-command-center";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { attendancePercent, isWorkItemOverdue, parseImpactTypes, workProgress } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

function averageHours(rows: Array<{ idea: { createdAt: Date }; decidedAt: Date | null }>) {
  const closed = rows.filter((row) => row.decidedAt);
  if (!closed.length) return "0 h";
  const total = closed.reduce((sum, row) => sum + ((row.decidedAt?.getTime() ?? 0) - row.idea.createdAt.getTime()), 0);
  return `${Math.max(1, Math.round(total / closed.length / 1000 / 60 / 60))} h`;
}

export default async function DashboardPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const [ideas, areas, supervisorApprovals, validationApprovals, kaizenProjects, genbaWalks] = await Promise.all([
    prisma.idea.findMany({
      include: { area: true, supervisor: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.area.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.approval.findMany({ where: { type: "SUPERVISOR" }, include: { idea: true } }),
    prisma.approval.findMany({ where: { type: { in: ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"] } }, include: { idea: true } }),
    prisma.kaizenProject.findMany({ include: { activities: true } }),
    prisma.genbaWalk.findMany({ include: { activities: true } })
  ]);

  const dashboardIdeas: DashboardIdea[] = ideas.map((idea) => ({
    id: idea.id,
    folio: idea.folio,
    areaCode: idea.area.code,
    collaboratorName: idea.collaboratorName,
    supervisorName: idea.supervisor?.name ?? null,
    problem: idea.problem,
    status: idea.status,
    category: idea.category,
    createdAt: idea.createdAt.toISOString(),
    closedAt: idea.closedAt?.toISOString() ?? null,
    dueDate: idea.dueDate?.toISOString() ?? null,
    pointsAssigned: idea.pointsAssigned,
    impactTypes: parseImpactTypes(idea.impactTypes),
    impactsQuality: idea.impactsQuality,
    impactsSafety: idea.impactsSafety,
    requiresMaintenance: idea.requiresMaintenance
  }));

  const implementationRows = ideas.filter((idea) => idea.implementedAt);
  const implementationDays = implementationRows.length
    ? `${Math.round(implementationRows.reduce((sum, idea) => sum + ((idea.implementedAt?.getTime() ?? idea.createdAt.getTime()) - idea.createdAt.getTime()), 0) / implementationRows.length / 1000 / 60 / 60 / 24)} d`
    : "0 d";

  const kaizenProgress = kaizenProjects.map((project) => workProgress(project.activities));
  const kaizenActive = kaizenProjects.filter((project) => ["PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(project.status)).length;
  const kaizenAverageProgress = kaizenProgress.length ? Math.round(kaizenProgress.reduce((sum, progress) => sum + progress.percent, 0) / kaizenProgress.length) : 0;
  const genbaActivities = genbaWalks.flatMap((walk) => walk.activities).filter((activity) => activity.status !== "COMBINADA");
  const genbaOpenActivities = genbaActivities.filter((activity) => !["COMPLETADA", "CANCELADA"].includes(activity.status));
  const averageAttendance = genbaWalks.length
    ? Math.round(genbaWalks.reduce((sum, walk) => sum + attendancePercent(walk.expectedDepartments, walk.attendedDepartments), 0) / genbaWalks.length)
    : 0;

  return (
    <>
      <PageHeader
        title="Hoy en PROpEx"
        eyebrow="Centro de mando · Inteligencia operativa"
        description="Lo que requiere atención hoy y el desempeño conectado de Ideas, Kaizen y GENBA."
        actions={
          <>
            <Link aria-label="Ver códigos QR" className="icon-button" href="/qr" title="Códigos QR">
              <QrCode className="h-[18px] w-[18px]" aria-hidden />
            </Link>
            <Link className="btn btn-secondary" href="/api/export">
              <Download className="h-4 w-4" aria-hidden />
              Exportar
            </Link>
            <Link className="btn btn-primary" href="/#areas">
              <Plus className="h-4 w-4" aria-hidden />
              Nueva idea
            </Link>
          </>
        }
      />

      <DashboardCommandCenter
        areas={areas.map((area) => area.code)}
        generatedAt={new Date().toISOString()}
        ideas={dashboardIdeas}
        portfolio={{
          kaizen: {
            total: kaizenProjects.length,
            active: kaizenActive,
            averageProgress: kaizenAverageProgress,
            overdueActivities: kaizenProjects.flatMap((project) => project.activities).filter(isWorkItemOverdue).length,
            estimatedSavings: kaizenProjects.reduce((sum, project) => sum + (project.estimatedSavings ?? 0), 0),
            realSavings: kaizenProjects.reduce((sum, project) => sum + (project.realSavings ?? 0), 0)
          },
          genba: {
            total: genbaWalks.length,
            openActivities: genbaOpenActivities.length,
            overdueActivities: genbaOpenActivities.filter(isWorkItemOverdue).length,
            averageAttendance
          }
        }}
        timing={{
          supervisor: averageHours(supervisorApprovals),
          validation: averageHours(validationApprovals),
          implementation: implementationDays
        }}
      />
    </>
  );
}
~~~~~~

### `src/app/(app)/genba/[id]/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Footprints,
  GitMerge,
  MessageSquare,
  Paperclip,
  Plus,
  Save,
  Send,
  UsersRound,
  XCircle
} from "lucide-react";
import {
  addGenbaActivityAction,
  addGenbaUpdateAction,
  closeGenbaActivityAction,
  mergeGenbaActivitiesAction,
  promoteGenbaActivityToKaizenAction,
  updateGenbaActivityAction,
  updateGenbaWalkAction
} from "@/app/actions";
import { GenbaStatusPill } from "@/components/module-status";
import { PageHeader } from "@/components/page-header";
import { ProgressMeter } from "@/components/progress-meter";
import { SectionHeading } from "@/components/section-heading";
import { WorkItemDisclosure } from "@/components/work-item-disclosure";
import {
  attendancePercent,
  genbaDepartments,
  genbaStatusLabels,
  isWorkItemOverdue,
  parseStringArray,
  workProgress
} from "@/lib/domain";
import { requireGenbaAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

type GenbaDetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function GenbaDetailPage({ params, searchParams }: GenbaDetailProps) {
  const { user, canManage } = await requireGenbaAccess();
  const { id } = await params;
  const query = await searchParams;
  const [walk, users, kaizenProjects] = await Promise.all([
    prisma.genbaWalk.findUnique({
      where: { id },
      include: {
        coordinator: true,
        activities: {
          include: {
            owner: true,
            mergedInto: true,
            attachments: true,
            promotedKaizenActivity: { include: { project: true } }
          },
          orderBy: { number: "asc" }
        },
        updates: { include: { user: true, activity: true }, orderBy: { createdAt: "desc" }, take: 60 }
      }
    }),
    prisma.user.findMany({ where: { active: true, role: { not: "COLABORADOR" } }, orderBy: { name: "asc" } }),
    prisma.kaizenProject.findMany({ where: { status: { notIn: ["COMPLETADO", "CANCELADO"] } }, orderBy: { number: "desc" } })
  ]);

  if (!walk) notFound();

  const progress = workProgress(walk.activities);
  const expected = parseStringArray(walk.expectedDepartments);
  const attended = new Set(parseStringArray(walk.attendedDepartments));
  const attendance = attendancePercent(walk.expectedDepartments, walk.attendedDepartments);
  const activeActivities = walk.activities.filter((activity) => !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status));
  const overdue = walk.activities.filter(isWorkItemOverdue).length;
  const defaultActivityDueDate = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const canAddActivity = canManage && walk.status === "ABIERTO";
  const errorMessage = query.error === "evidencia"
    ? "Para completar una actividad debes adjuntar evidencia."
    : query.error === "justificacion"
      ? "Escribe por qué la actividad no se realizará."
      : query.error === "lider"
        ? "Selecciona el líder del nuevo proyecto Kaizen."
        : query.error === "actividad"
          ? "Escribe la problemática de la nueva actividad."
          : query.error === "cerrado"
            ? "No se pueden agregar actividades a un recorrido cerrado."
            : query.error
              ? "Revisa los campos obligatorios."
              : null;

  return (
    <>
      <PageHeader
        eyebrow={`Recorridos GENBA · GENBA #${String(walk.number).padStart(3, "0")}`}
        title={walk.areaName}
        description={walk.visitDate.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={<Link className="btn btn-secondary" href="/genba"><ArrowLeft className="h-4 w-4" aria-hidden />Panel</Link>}
      />
      {errorMessage ? <div className="alert alert-danger mb-5"><AlertTriangle className="h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{errorMessage}</span></div> : null}

      <section className="surface mb-5 rounded-lg p-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2"><GenbaStatusPill status={walk.status} /><span className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-extrabold text-slate-700">Coordinador: {walk.coordinator.name}</span></div>
            <p className="mt-4 text-lg font-extrabold text-ink">{walk.notes ?? "Recorrido de observación y seguimiento operativo."}</p>
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-600"><UsersRound className="h-4 w-4 text-red-700" aria-hidden />{attended.size} de {expected.length} departamentos asistieron · {attendance}%</div>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <ProgressMeter label={`${progress.closed} de ${progress.total} actividades cerradas`} percent={progress.percent} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div><p className="text-2xl font-extrabold text-ink">{progress.open}</p><p className="text-[10px] font-bold uppercase text-slate-500">Abiertas</p></div>
              <div><p className={`text-2xl font-extrabold ${overdue ? "text-rose-700" : "text-ink"}`}>{overdue}</p><p className="text-[10px] font-bold uppercase text-slate-500">Vencidas</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-5">
          <article className="surface rounded-lg p-5">
            <SectionHeading description="Comparación entre comité esperado y asistencia real." title="Asistencia" />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {expected.map((department) => <div className={`flex items-center justify-between rounded-lg border p-3 text-sm font-bold ${attended.has(department) ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-800"}`} key={department}><span>{department}</span><span className="text-[10px] font-extrabold uppercase">{attended.has(department) ? "Asistió" : "Ausente"}</span></div>)}
            </div>
          </article>

          <section>
            <SectionHeading count={walk.activities.filter((activity) => activity.status !== "COMBINADA").length} description="Las cinco principales y cualquier actividad adicional del recorrido." title="Plan de acción GENBA" tone="red" />
            {canAddActivity ? (
              <details className="details-panel mb-4" open={query.error === "actividad"}>
                <summary><span className="flex items-center gap-2"><Plus className="h-4 w-4 text-red-700" aria-hidden />Agregar otra actividad</span></summary>
                <form action={addGenbaActivityAction} className="grid gap-3 p-4 sm:grid-cols-2">
                  <input name="walkId" type="hidden" value={walk.id} />
                  <label className="sm:col-span-2"><span className="label">Problemática *</span><textarea className="field min-h-20" name="problem" placeholder="Condición o hallazgo adicional" required /></label>
                  <label className="sm:col-span-2"><span className="label">Acción propuesta</span><textarea className="field min-h-20" name="action" placeholder="Qué debe hacerse" /></label>
                  <label><span className="label">Responsable</span><select className="field" defaultValue="" name="ownerId"><option value="">Sin asignar</option>{users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
                  <label><span className="label">Compromiso</span><input className="field" defaultValue={defaultActivityDueDate} name="dueDate" type="date" /></label>
                  <button className="btn btn-primary sm:col-span-2" type="submit"><Plus className="h-4 w-4" aria-hidden />Agregar al plan de acción</button>
                </form>
              </details>
            ) : null}

            {!walk.activities.length ? <div className="surface rounded-lg border-dashed p-8 text-center text-sm text-slate-500">Todavía no hay actividades en este recorrido.</div> : null}
            <div className="overflow-hidden rounded-lg">
              {walk.activities.map((activity) => {
                const canClose = canManage || walk.coordinatorId === user.id || activity.ownerId === user.id;
                const terminal = ["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status);
                return (
                  <WorkItemDisclosure
                    description={`Acción: ${activity.action ?? "Por definir"}`}
                    dueDate={activity.dueDate}
                    id={`actividad-${activity.id}`}
                    key={activity.id}
                    number={activity.number}
                    overdue={isWorkItemOverdue(activity)}
                    owner={activity.owner?.name}
                    status={activity.status}
                    title={activity.problem}
                    tone="red"
                  >
                    <div className="grid gap-3 text-xs sm:grid-cols-2">
                      <p className="border-l-4 border-brand-500 pl-3"><span className="block text-[10px] font-extrabold uppercase text-slate-400">Acción acordada</span><span className="mt-1 block leading-5 text-slate-700">{activity.action ?? "Por definir"}</span></p>
                      <p className="flex items-center gap-2 border-l-4 border-slate-300 pl-3"><Paperclip className="h-4 w-4 text-slate-400" aria-hidden /><span><span className="block text-[10px] font-extrabold uppercase text-slate-400">Evidencias</span><span className="mt-1 block font-extrabold text-slate-700">{activity.attachments.length}</span></span></p>
                    </div>
                    {activity.mergedInto ? <div className="alert alert-info mt-3"><GitMerge className="h-4 w-4 shrink-0" aria-hidden />Combinada con actividad #{activity.mergedInto.number}. {activity.mergeReason}</div> : null}
                    {activity.promotedKaizenActivity ? <Link className="alert alert-warning mt-3" href={`/kaizen/${activity.promotedKaizenActivity.projectId}`}><Send className="h-4 w-4 shrink-0" aria-hidden />Enviada a {activity.promotedKaizenActivity.project.folio}: {activity.promotedKaizenActivity.project.title}</Link> : null}
                    {activity.completionNote || activity.cancellationReason ? <p className="mt-3 rounded-lg bg-white p-3 text-sm leading-5 text-slate-700">{activity.completionNote ?? activity.cancellationReason}</p> : null}
                    {activity.attachments.length ? <div className="mt-3 flex flex-wrap gap-2">{activity.attachments.map((file) => <a className="btn btn-secondary" href={file.path} key={file.id} rel="noreferrer" target="_blank"><Paperclip className="h-4 w-4" aria-hidden />{file.filename}</a>)}</div> : null}

                    {!terminal && (canManage || canClose) ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {canManage ? (
                          <details className="details-panel">
                            <summary>Editar actividad</summary>
                            <form action={updateGenbaActivityAction} className="grid gap-3 p-4">
                              <input name="activityId" type="hidden" value={activity.id} />
                              <label><span className="label">Problemática</span><textarea className="field min-h-20" defaultValue={activity.problem} name="problem" required /></label>
                              <label><span className="label">Acción</span><textarea className="field min-h-20" defaultValue={activity.action ?? ""} name="action" /></label>
                              <label><span className="label">Responsable</span><select className="field" defaultValue={activity.ownerId ?? ""} name="ownerId"><option value="">Sin asignar</option>{users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
                              <label><span className="label">Compromiso</span><input className="field" defaultValue={activity.dueDate?.toISOString().slice(0, 10) ?? ""} name="dueDate" type="date" /></label>
                              <label><span className="label">Estado</span><select className="field" defaultValue={activity.status} name="status"><option value="PENDIENTE">Pendiente</option><option value="EN_PROCESO">En proceso</option><option value="BLOQUEADA">Bloqueada</option></select></label>
                              <button className="btn btn-secondary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar actividad</button>
                            </form>
                          </details>
                        ) : null}
                        {canClose ? (
                          <details className="details-panel">
                            <summary>Cerrar actividad</summary>
                            <form action={closeGenbaActivityAction} className="grid gap-3 p-4">
                              <input name="activityId" type="hidden" value={activity.id} />
                              <p className="text-xs leading-5 text-slate-600">Para completar, adjunta evidencia. Si no se hará, escribe la justificación.</p>
                              <label><span className="label">Evidencia</span><input className="field" name="evidence" type="file" accept="image/*,.pdf,.doc,.docx" /></label>
                              <label><span className="label">Resultado o justificación</span><textarea className="field min-h-20" name="note" /></label>
                              <div className="grid gap-2 sm:grid-cols-2"><button className="btn btn-success" name="outcome" type="submit" value="COMPLETADA"><CheckCircle2 className="h-4 w-4" aria-hidden />Completar</button><button className="btn btn-danger" name="outcome" type="submit" value="CANCELADA"><XCircle className="h-4 w-4" aria-hidden />Cerrar sin ejecutar</button></div>
                            </form>
                          </details>
                        ) : null}
                      </div>
                    ) : null}

                    {canManage && !activity.promotedKaizenActivity && activity.status !== "COMBINADA" ? (
                      <details className="details-panel mt-3">
                        <summary><span className="flex items-center gap-2 text-amber-800"><Send className="h-4 w-4" aria-hidden />Enviar actividad a Kaizen</span></summary>
                        <form action={promoteGenbaActivityToKaizenAction} className="grid gap-3 p-4">
                          <input name="activityId" type="hidden" value={activity.id} />
                          <label><span className="label">Proyecto existente</span><select className="field" defaultValue="" name="targetProjectId"><option value="">Crear un nuevo Kaizen</option>{kaizenProjects.map((project) => <option key={project.id} value={project.id}>{project.folio} · {project.title}</option>)}</select></label>
                          <label><span className="label">Nombre si se crea uno nuevo</span><input className="field" defaultValue={activity.problem} name="newProjectTitle" /></label>
                          <label><span className="label">Líder del nuevo Kaizen</span><select className="field" defaultValue={activity.ownerId ?? ""} name="leaderId"><option value="">Seleccionar</option>{users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
                          <button className="btn bg-amber-500 text-slate-950 hover:bg-amber-400" type="submit"><Send className="h-4 w-4" aria-hidden />Enviar a Kaizen</button>
                        </form>
                      </details>
                    ) : null}
                  </WorkItemDisclosure>
                );
              })}
            </div>
          </section>

          <article className="surface rounded-lg p-5">
            <SectionHeading count={walk.updates.length} description="Avances y acuerdos del recorrido." title="Bitácora" />
            {canManage ? <form action={addGenbaUpdateAction} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><input name="walkId" type="hidden" value={walk.id} /><label><span className="label">Nuevo seguimiento</span><textarea className="field min-h-20" name="comment" required /></label><button className="btn btn-secondary" type="submit"><MessageSquare className="h-4 w-4" aria-hidden />Agregar</button></form> : null}
            <div className="mt-5 space-y-3 border-t border-line pt-4">{walk.updates.map((update) => <div className="flex gap-3" key={update.id}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold">{(update.user?.name ?? "S").charAt(0)}</span><div><p className="text-xs font-extrabold text-ink">{update.user?.name ?? "Sistema"} <span className="font-normal text-slate-400">{update.createdAt.toLocaleString("es-MX")}</span></p><p className="mt-1 text-sm leading-5 text-slate-700">{update.comment}</p></div></div>)}</div>
          </article>
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
          <article className="surface rounded-lg p-5">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-700"><Footprints className="h-5 w-5" aria-hidden /></span><div><h2 className="text-base font-extrabold text-ink">Resumen del recorrido</h2><p className="text-xs text-slate-500">{walk.folio}</p></div></div>
            <dl className="mt-4 divide-y divide-line text-xs">{[["Fecha", walk.visitDate.toLocaleDateString("es-MX")], ["Área", walk.areaName], ["Coordinador", walk.coordinator.name], ["Asistencia", `${attendance}%`], ["Actividades", String(progress.total)], ["Avance", `${progress.percent}%`]].map(([label, value]) => <div className="flex justify-between gap-3 py-2.5" key={label}><dt className="font-bold text-slate-500">{label}</dt><dd className="text-right font-extrabold text-slate-800">{value}</dd></div>)}</dl>
          </article>

          {canManage ? (
            <details className="details-panel">
              <summary>Editar recorrido</summary>
              <form action={updateGenbaWalkAction} className="grid gap-3 p-4">
                <input name="walkId" type="hidden" value={walk.id} />
                <label><span className="label">Área</span><input className="field" defaultValue={walk.areaName} name="areaName" required /></label>
                <label><span className="label">Fecha</span><input className="field" defaultValue={walk.visitDate.toISOString().slice(0, 10)} name="visitDate" type="date" required /></label>
                <label><span className="label">Coordinador</span><select className="field" defaultValue={walk.coordinatorId} name="coordinatorId">{users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
                <label><span className="label">Notas</span><textarea className="field min-h-20" defaultValue={walk.notes ?? ""} name="notes" /></label>
                <label><span className="label">Estado</span><select className="field" defaultValue={walk.status} name="status">{Object.entries(genbaStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <fieldset><legend className="label">Asistencia</legend><div className="space-y-2">{genbaDepartments.map((department) => <div className="grid grid-cols-[1fr_70px_70px] items-center gap-2 rounded-lg border border-line p-2 text-xs" key={department}><span className="font-bold">{department}</span><label className="text-center"><span className="block text-[9px] uppercase text-slate-400">Esperado</span><input defaultChecked={expected.includes(department)} name="expectedDepartments" type="checkbox" value={department} /></label><label className="text-center"><span className="block text-[9px] uppercase text-slate-400">Asistió</span><input defaultChecked={attended.has(department)} name="attendedDepartments" type="checkbox" value={department} /></label></div>)}</div></fieldset>
                <button className="btn btn-primary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar recorrido</button>
              </form>
            </details>
          ) : null}

          {canManage && activeActivities.length > 1 ? (
            <details className="details-panel">
              <summary><span className="flex items-center gap-2"><GitMerge className="h-4 w-4 text-violet-700" aria-hidden />Combinar actividades</span></summary>
              <form action={mergeGenbaActivitiesAction} className="grid gap-3 p-4">
                <label><span className="label">Actividad duplicada</span><select className="field" name="sourceId" required defaultValue=""><option value="">Seleccionar</option>{activeActivities.map((activity) => <option key={activity.id} value={activity.id}>#{activity.number} · {activity.problem}</option>)}</select></label>
                <label><span className="label">Se integrará en</span><select className="field" name="targetId" required defaultValue=""><option value="">Seleccionar</option>{activeActivities.map((activity) => <option key={activity.id} value={activity.id}>#{activity.number} · {activity.problem}</option>)}</select></label>
                <label><span className="label">Justificación *</span><textarea className="field min-h-20" name="reason" required /></label>
                <button className="btn btn-secondary" type="submit"><GitMerge className="h-4 w-4" aria-hidden />Combinar</button>
              </form>
            </details>
          ) : null}
        </aside>
      </section>
    </>
  );
}
~~~~~~

### `src/app/(app)/genba/kanban/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Footprints } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { WorkStatusPill } from "@/components/module-status";
import { PageHeader } from "@/components/page-header";
import { ProgressMeter } from "@/components/progress-meter";
import { isWorkItemOverdue, workProgress } from "@/lib/domain";
import { requireGenbaAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

const columns = [
  { key: "PENDIENTES", title: "Por iniciar", tone: "border-amber-400" },
  { key: "EN_PROCESO", title: "En seguimiento", tone: "border-blue-500" },
  { key: "BLOQUEADAS", title: "Con bloqueos", tone: "border-rose-500" },
  { key: "CERRADAS", title: "Cerrados", tone: "border-emerald-600" }
] as const;

type ColumnKey = typeof columns[number]["key"];

function walkColumn(walk: {
  status: string;
  activities: Array<{ status: string }>;
}): ColumnKey {
  const activities = walk.activities.filter((activity) => activity.status !== "COMBINADA");
  const allClosed = activities.length > 0 && activities.every((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status));
  if (walk.status !== "ABIERTO" || allClosed) return "CERRADAS";
  if (activities.some((activity) => activity.status === "BLOQUEADA")) return "BLOQUEADAS";
  if (activities.some((activity) => activity.status === "EN_PROCESO" || ["COMPLETADA", "CANCELADA"].includes(activity.status))) return "EN_PROCESO";
  return "PENDIENTES";
}

export default async function GenbaKanbanPage() {
  await requireGenbaAccess();
  const walks = await prisma.genbaWalk.findMany({
    include: { activities: { include: { owner: true }, orderBy: { number: "asc" } } },
    orderBy: { visitDate: "desc" }
  });

  return (
    <>
      <PageHeader eyebrow="Recorridos GENBA · Flujo visual" title="Kanban GENBA por recorrido" description="Cada tarjeta representa un GENBA completo y muestra todas sus actividades sin saturar el tablero." />
      {!walks.length ? <EmptyState title="No hay recorridos GENBA" description="Crea un recorrido para comenzar el seguimiento." /> : null}
      <section className="grid gap-4 xl:grid-cols-4">
        {columns.map((column) => {
          const items = walks.filter((walk) => walkColumn(walk) === column.key);
          return (
            <div className="min-w-0" key={column.key}>
              <div className={`mb-3 flex items-center justify-between border-b-2 ${column.tone} pb-2`}><h2 className="text-sm font-extrabold text-ink">{column.title}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-extrabold text-slate-700">{items.length} GENBA</span></div>
              <div className="grid gap-3">
                {items.map((walk) => {
                  const activities = walk.activities.filter((activity) => activity.status !== "COMBINADA");
                  const progress = workProgress(activities);
                  const overdue = activities.filter(isWorkItemOverdue).length;
                  return (
                    <article className="surface overflow-hidden rounded-lg" key={walk.id}>
                      <div className={`h-1 ${column.key === "CERRADAS" ? "bg-emerald-600" : column.key === "BLOQUEADAS" ? "bg-rose-600" : column.key === "EN_PROCESO" ? "bg-blue-600" : "bg-amber-500"}`} />
                      <div className="p-4">
                        <Link className="group flex items-start justify-between gap-3" href={`/genba/${walk.id}`}>
                          <span className="min-w-0"><span className="block text-[10px] font-extrabold uppercase text-brand-700">{walk.folio}</span><span className="mt-1 block truncate text-base font-extrabold text-ink">{walk.areaName}</span><span className="mt-1 block text-[11px] font-bold text-slate-500">{walk.visitDate.toLocaleDateString("es-MX")}</span></span>
                          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500" aria-hidden />
                        </Link>
                        <div className="mt-4"><ProgressMeter label={`${progress.closed} de ${progress.total} realizadas`} percent={progress.percent} /></div>
                        {overdue ? <p className="mt-3 flex items-center gap-2 text-xs font-extrabold text-rose-700"><AlertTriangle className="h-4 w-4" aria-hidden />{overdue} {overdue === 1 ? "actividad vencida" : "actividades vencidas"}</p> : null}
                      </div>
                      <div className="border-t border-line bg-slate-50/70">
                        {activities.slice(0, 3).map((activity) => (
                          <Link className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-2 border-b border-line px-3 py-3 transition last:border-0 hover:bg-white" href={`/genba/${walk.id}#actividad-${activity.id}`} key={activity.id}>
                            <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-extrabold ${["COMPLETADA", "CANCELADA"].includes(activity.status) ? "bg-emerald-100 text-emerald-800" : activity.status === "BLOQUEADA" ? "bg-rose-100 text-rose-800" : "bg-white text-slate-700"}`}>{activity.status === "COMPLETADA" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : activity.number}</span>
                            <span className="min-w-0"><span className="line-clamp-2 block text-xs font-extrabold leading-4 text-slate-800">{activity.action ?? activity.problem}</span><span className={`mt-1 block truncate text-[10px] font-bold ${isWorkItemOverdue(activity) ? "text-rose-700" : "text-slate-500"}`}>{activity.owner?.name ?? "Sin responsable"} · {activity.dueDate ? activity.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</span></span>
                            <WorkStatusPill status={activity.status} />
                          </Link>
                        ))}
                        {activities.length ? <Link className="flex min-h-11 items-center justify-between gap-3 bg-white px-3 py-2 text-xs font-extrabold text-brand-700 hover:bg-brand-50" href={`/genba/${walk.id}`}><span>Ver plan completo · {activities.length} actividades</span><ArrowRight className="h-4 w-4" aria-hidden /></Link> : <p className="px-4 py-5 text-center text-xs font-bold text-slate-500">Sin actividades registradas</p>}
                      </div>
                    </article>
                  );
                })}
                {!items.length ? <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500"><Footprints className="mx-auto mb-2 h-5 w-5" aria-hidden />Sin recorridos</div> : null}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
~~~~~~

### `src/app/(app)/genba/nuevo/page.tsx`

~~~~~~tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Footprints, Save } from "lucide-react";
import { createGenbaWalkAction } from "@/app/actions";
import { GenbaActivityEntryTable } from "@/components/genba-activity-entry-table";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { genbaDepartments } from "@/lib/domain";
import { requireGenbaAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

type NewGenbaProps = { searchParams: Promise<{ error?: string }> };

export default async function NewGenbaPage({ searchParams }: NewGenbaProps) {
  const { canManage } = await requireGenbaAccess();
  if (!canManage) redirect("/genba");
  const query = await searchParams;
  const users = await prisma.user.findMany({ where: { active: true, role: { not: "COLABORADOR" } }, orderBy: { name: "asc" } });
  const today = new Date();
  const due = new Date(today.getTime() + 14 * 86400000);

  return (
    <>
      <PageHeader eyebrow="Recorridos GENBA · Registro" title="Crear recorrido GENBA" description="Registra el área, los departamentos presentes y las cinco actividades principales." actions={<Link className="btn btn-secondary" href="/genba"><ArrowLeft className="h-4 w-4" aria-hidden />Volver</Link>} />
      {query.error ? <div className="alert alert-danger mb-5">Completa los datos generales, selecciona departamentos y captura las cinco problemáticas principales.</div> : null}
      <form action={createGenbaWalkAction} className="space-y-5">
        <section className="surface rounded-lg p-5 sm:p-6">
          <SectionHeading description="Identificación del recorrido y responsable de coordinación." title="Datos del GENBA" tone="red" />
          <div className="grid gap-4 lg:grid-cols-2">
            <label><span className="label">Área / zona visitada *</span><input className="field" name="areaName" placeholder="Ejemplo: P1, Embarques, Sanidad" required /></label>
            <label><span className="label">Fecha del recorrido *</span><input className="field" defaultValue={today.toISOString().slice(0, 10)} name="visitDate" type="date" required /></label>
            <label><span className="label">Coordinador *</span><select className="field" defaultValue="" name="coordinatorId" required><option value="">Seleccionar</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <label><span className="label">Notas generales</span><input className="field" name="notes" placeholder="Enfoque, turno o contexto del recorrido" /></label>
          </div>
        </section>

        <section className="surface rounded-lg p-5 sm:p-6">
          <SectionHeading description="Esperado define el comité convocado; asistió calcula automáticamente el cumplimiento." title="Asistencia por departamento" />
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b border-line text-left text-xs uppercase text-slate-500"><th className="px-2 py-3">Departamento</th><th className="w-28 px-2 py-3 text-center">Esperado</th><th className="w-28 px-2 py-3 text-center">Asistió</th></tr></thead><tbody>{genbaDepartments.map((department) => <tr className="border-b border-line last:border-0" key={department}><td className="px-2 py-3 font-extrabold text-slate-700">{department}</td><td className="px-2 py-3 text-center"><input defaultChecked name="expectedDepartments" type="checkbox" value={department} /></td><td className="px-2 py-3 text-center"><input name="attendedDepartments" type="checkbox" value={department} /></td></tr>)}</tbody></table></div>
        </section>

        <section>
          <SectionHeading description="Captura las cinco principales y agrega las adicionales que requiera el recorrido antes de guardarlo." title="Plan de acción inicial" tone="red" />
          <GenbaActivityEntryTable initialDueDate={due.toISOString().slice(0, 10)} users={users.map(({ id, name }) => ({ id, name }))} />
        </section>

        <footer className="flex flex-col gap-3 rounded-lg bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Footprints className="h-5 w-5 text-red-300" aria-hidden /><p className="text-sm font-bold">Se asignará automáticamente el siguiente número GENBA.</p></div><button className="btn btn-brand" type="submit"><Save className="h-4 w-4" aria-hidden />Crear recorrido</button></footer>
      </form>
    </>
  );
}
~~~~~~

### `src/app/(app)/genba/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { Download, ListTodo, Plus } from "lucide-react";
import { GenbaCommandCenter, type GenbaDashboardWalk } from "@/components/genba-command-center";
import { PageHeader } from "@/components/page-header";
import { parseStringArray } from "@/lib/domain";
import { requireGenbaAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

export default async function GenbaDashboardPage() {
  const { canManage } = await requireGenbaAccess();
  const walks = await prisma.genbaWalk.findMany({
    include: {
      coordinator: true,
      activities: {
        include: { owner: true, promotedKaizenActivity: true },
        orderBy: { number: "asc" }
      }
    },
    orderBy: { visitDate: "desc" }
  });

  const dashboardWalks: GenbaDashboardWalk[] = walks.map((walk) => ({
    id: walk.id,
    number: walk.number,
    folio: walk.folio,
    areaName: walk.areaName,
    visitDate: walk.visitDate.toISOString(),
    status: walk.status,
    coordinatorName: walk.coordinator.name,
    expectedDepartments: parseStringArray(walk.expectedDepartments).length,
    attendedDepartments: parseStringArray(walk.attendedDepartments).length,
    createdAt: walk.createdAt.toISOString(),
    closedAt: walk.closedAt?.toISOString() ?? null,
    activities: walk.activities.map((activity) => ({
      id: activity.id,
      number: activity.number,
      problem: activity.problem,
      action: activity.action,
      ownerName: activity.owner?.name ?? null,
      dueDate: activity.dueDate?.toISOString() ?? null,
      status: activity.status,
      closedAt: activity.closedAt?.toISOString() ?? null,
      createdAt: activity.createdAt.toISOString(),
      promotedToKaizen: Boolean(activity.promotedKaizenActivity)
    }))
  }));

  return (
    <>
      <PageHeader
        eyebrow="Recorridos GENBA · Gestión visual"
        title="Centro de mando GENBA"
        description="Recurrencia, asistencia, vencimientos y velocidad de cierre para dirigir el seguimiento en piso."
        actions={
          <>
            <Link className="btn btn-secondary" href="/api/export/genba"><Download className="h-4 w-4" aria-hidden />Excel</Link>
            <Link className="btn btn-secondary" href="/genba/kanban"><ListTodo className="h-4 w-4" aria-hidden />Kanban</Link>
            {canManage ? <Link className="btn btn-primary" href="/genba/nuevo"><Plus className="h-4 w-4" aria-hidden />Nuevo recorrido</Link> : null}
          </>
        }
      />
      <GenbaCommandCenter generatedAt={new Date().toISOString()} walks={dashboardWalks} />
    </>
  );
}
~~~~~~

### `src/app/(app)/ideas/[id]/page.tsx`

~~~~~~tsx
import type { ApprovalType } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  ImageIcon,
  MessageSquare,
  MessageSquareMore,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Tag,
  Trash2,
  UserRound,
  Wrench,
  XCircle
} from "lucide-react";
import {
  addCommentAction,
  assignImplementationAction,
  cancelIdeaAction,
  classifyIdeaAction,
  implementationUpdateAction,
  removeIdeaPointsAction,
  reopenRejectedIdeaAction,
  supervisorDecisionAction,
  validationDecisionAction
} from "@/app/actions";
import { IdeaProgress } from "@/components/idea-progress";
import { PageHeader } from "@/components/page-header";
import { ProbocaCoin } from "@/components/proboca-coin";
import { ManagerialCriteriaTable, ProbocaCoinsAwardForm } from "@/components/proboca-coins-award-form";
import { ProbocaCoinsCelebration } from "@/components/proboca-coins-celebration";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import {
  approvalStatusLabels,
  approvalTypeForRole,
  approvalTypeLabels,
  classificationLabels,
  coreClassificationGuide,
  ideaCategoryLabels,
  parseImpactTypes,
  priorityLabels,
  roleHomePath,
  roleLabels
} from "@/lib/domain";
import { requireUser } from "@/lib/auth";
import { isManagerialEvaluationRule } from "@/lib/managerial-evaluation";
import { automaticManagerialEvaluation, automaticPointRules } from "@/lib/points";
import { prisma } from "@/lib/prisma";

type DetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ coins?: string; error?: string }>;
};

const approvalTone: Record<ApprovalType, { border: string; accent: string; soft: string; text: string; icon: typeof ShieldCheck }> = {
  SUPERVISOR: { border: "border-emerald-500", accent: "bg-emerald-500", soft: "bg-emerald-50", text: "text-emerald-800", icon: UserRound },
  CALIDAD: { border: "border-red-500", accent: "bg-red-500", soft: "bg-red-50", text: "text-red-800", icon: ShieldCheck },
  SEGURIDAD: { border: "border-slate-500", accent: "bg-slate-500", soft: "bg-slate-100", text: "text-slate-800", icon: ClipboardCheck },
  MANTENIMIENTO: { border: "border-blue-500", accent: "bg-blue-500", soft: "bg-blue-50", text: "text-blue-800", icon: Wrench },
  MEJORA_CONTINUA_FINAL: { border: "border-slate-950", accent: "bg-slate-950", soft: "bg-slate-100", text: "text-slate-950", icon: CheckCircle2 }
};

function isImagePath(path: string) {
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(path);
}

export default async function IdeaDetailPage({ params, searchParams }: DetailProps) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const [idea, owners, pointRules] = await Promise.all([
    prisma.idea.findUnique({
      where: { id },
      include: {
        area: { include: { supervisor: true } },
        supervisor: true,
        implementationOwner: true,
        approvals: { include: { assignedTo: true }, orderBy: { createdAt: "asc" } },
        attachments: { orderBy: { createdAt: "asc" } },
        comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
        pointRuleSelections: { include: { pointRule: true } },
        kaizenProject: true
      }
    }),
    prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR", "ADMIN"] }, active: true }, orderBy: { name: "asc" } }),
    prisma.pointRule.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } })
  ]);

  if (!idea) notFound();

  const canViewIdea =
    user.role === "ADMIN" ||
    user.role === "MEJORA_CONTINUA" ||
    (user.role === "SUPERVISOR" && idea.supervisorId === user.id) ||
    (user.role === "CALIDAD" && idea.approvals.some((approval) => approval.type === "CALIDAD")) ||
    (user.role === "SEGURIDAD" && idea.approvals.some((approval) => approval.type === "SEGURIDAD")) ||
    (user.role === "MANTENIMIENTO" && (idea.approvals.some((approval) => approval.type === "MANTENIMIENTO") || ["EN_IMPLEMENTACION", "IMPLEMENTADA", "VENCIDA"].includes(idea.status)));

  if (!canViewIdea) redirect(roleHomePath(user.role));

  const canSupervisor = user.role === "ADMIN" || (user.role === "SUPERVISOR" && idea.supervisorId === user.id);
  const roleApprovalType = approvalTypeForRole(user.role);
  const validationTypes: ApprovalType[] = user.role === "ADMIN"
    ? ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"]
    : roleApprovalType
      ? [roleApprovalType].filter((type) => type !== "SUPERVISOR" && type !== "MEJORA_CONTINUA_FINAL")
      : [];
  const canMC = user.role === "ADMIN" || user.role === "MEJORA_CONTINUA";
  const hasAfterEvidence = idea.attachments.some((attachment) => attachment.type === "AFTER");
  const automaticPoints = automaticPointRules(idea, pointRules);
  const standardPointRules = pointRules.filter((rule) => !isManagerialEvaluationRule(rule.id));
  const managerialSuggestions = automaticManagerialEvaluation(idea);
  const activeManagerialSuggestions = managerialSuggestions.filter(({ factor }) => pointRules.some((rule) => rule.id === factor.ruleId));
  const managerialSuggestionTotal = managerialSuggestions.reduce((sum, suggestion) => sum + suggestion.points, 0);
  const currentCoinSelections = idea.pointRuleSelections.map((selection) => ({ pointRuleId: selection.pointRuleId, points: selection.points }));
  const suggestedStandardRuleIds = automaticPoints.selectedRules.map((rule) => rule.id);
  const isClosed = idea.status === "CERRADA";
  const canUpdateProgress = ["EN_IMPLEMENTACION", "IMPLEMENTADA", "VENCIDA"].includes(idea.status);
  const canReviewClose = canMC && (["IMPLEMENTADA", "EN_VALIDACION_FINAL", "CERRADA"].includes(idea.status));
  const canAssign = canMC && !["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status);
  const canClassify = canMC && !["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status);
  const canReopen = canMC && ["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status);
  const impacts = parseImpactTypes(idea.impactTypes);
  const returnPath = roleHomePath(user.role);
  const parsedReward = Number.parseInt(query.coins ?? "", 10);
  const rewardAmount = Number.isFinite(parsedReward) ? Math.max(0, Math.min(parsedReward, 999_999)) : null;

  const errorMessage = query.error === "evidencia"
    ? "Falta la evidencia despues. Agregala en Avance antes de cerrar la idea."
    : query.error === "justificacion"
      ? "Escribe una justificacion para completar esta decision."
      : query.error === "informacion"
        ? "Explica qué información necesitas del colaborador."
        : query.error
          ? "Revisa los campos obligatorios e intenta nuevamente."
          : null;

  return (
    <>
      {rewardAmount !== null ? <ProbocaCoinsCelebration amount={rewardAmount} /> : null}
      <PageHeader
        eyebrow={`${roleLabels[user.role]} · Seguimiento de idea`}
        title={idea.folio}
        description={`${idea.area.code} · ${idea.collaboratorName}`}
        actions={
          <>
            <Link className="btn btn-secondary" href={returnPath}><ArrowLeft className="h-4 w-4" aria-hidden />Volver</Link>
            {canMC ? <Link className="btn btn-secondary" href="/kanban">Ver Kanban</Link> : null}
          </>
        }
      />

      {errorMessage ? <div className="alert alert-danger mb-5" role="alert"><XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{errorMessage}</span></div> : null}

      <section className="surface mb-5 rounded-lg p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">Registrada el {idea.createdAt.toLocaleString("es-MX")}</p>
            <h2 className="mt-1 max-w-4xl text-xl font-extrabold leading-7 text-ink sm:text-2xl">{idea.problem}</h2>
          </div>
          <StatusPill status={idea.status} />
        </div>
        <div className="mt-6 border-t border-line pt-5">
          <IdeaProgress status={idea.status} />
        </div>
        {idea.kaizenProject ? <div className="mt-5 flex flex-col gap-3 border-l-4 border-amber-500 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-extrabold uppercase text-amber-800">Convertida en proyecto Kaizen</p><p className="mt-1 text-sm font-bold text-amber-950">{idea.kaizenProject.folio} · {idea.kaizenProject.title}</p></div><Link className="btn bg-amber-500 text-slate-950 hover:bg-amber-400" href={`/kaizen/${idea.kaizenProject.id}`}>Abrir proyecto Kaizen</Link></div> : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <article className="surface rounded-lg p-5 sm:p-6">
            <SectionHeading description="Información original compartida por el colaborador." title="Propuesta de mejora" />
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="border-l-4 border-emerald-600 pl-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Solucion propuesta</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{idea.proposal}</p>
              </div>
              <div className="border-l-4 border-brand-500 pl-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Beneficio esperado</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{idea.expectedBenefit}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">{ideaCategoryLabels[idea.category]}</span>
              {impacts.length ? impacts.map((impact) => <span className="rounded-full border border-line bg-panel px-3 py-1 text-xs font-bold text-slate-700" key={impact}>{impact}</span>) : <span className="text-sm text-slate-500">Sin impactos seleccionados.</span>}
            </div>
            {idea.requiresExternalSupport ? <div className="mt-4 border-l-4 border-slate-900 bg-slate-50 p-3"><p className="text-xs font-extrabold uppercase text-slate-600">Compra, cotización o apoyo externo</p><p className="mt-1 text-sm leading-5 text-slate-700">{idea.externalSupportDetails}</p></div> : null}
          </article>

          <article className="surface rounded-lg p-5 sm:p-6">
            <SectionHeading count={idea.approvals.length} description="Decisiones registradas por cada departamento." title="Validaciones" />
            <div className="space-y-3">
              {idea.approvals.map((approval) => {
                const tone = approvalTone[approval.type];
                const ApprovalIcon = tone.icon;
                return (
                  <div className={`border-l-4 ${tone.border} ${tone.soft} p-3.5`} key={approval.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <ApprovalIcon className={`h-5 w-5 shrink-0 ${tone.text}`} aria-hidden />
                        <div>
                          <p className={`text-sm font-extrabold ${tone.text}`}>{approvalTypeLabels[approval.type]}</p>
                          <p className="mt-0.5 text-xs text-slate-600">{approval.assignedTo?.name ?? "Sin asignar"}</p>
                        </div>
                      </div>
                      <span className="w-fit rounded-full border border-white bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-700">{approvalStatusLabels[approval.status]}</span>
                    </div>
                    {approval.comments ? <p className="mt-3 border-t border-black/5 pt-2 text-sm leading-5 text-slate-700">{approval.comments}</p> : null}
                  </div>
                );
              })}
            </div>
          </article>

          <article className="surface rounded-lg p-5 sm:p-6">
            <SectionHeading count={idea.attachments.length} description="Archivos que comprueban la situacion antes y despues." title="Evidencias" />
            {idea.attachments.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {idea.attachments.map((attachment) => (
                  <a className="group overflow-hidden rounded-lg border border-line bg-panel" href={attachment.path} key={attachment.id} rel="noreferrer" target="_blank">
                    {isImagePath(attachment.path) ? (
                      <span className="block aspect-[16/9] overflow-hidden bg-slate-100">
                        <img alt={`Evidencia ${attachment.type.toLowerCase()} de ${idea.folio}`} className="h-full w-full object-cover transition group-hover:scale-[1.02]" src={attachment.path} />
                      </span>
                    ) : (
                      <span className="flex aspect-[16/9] items-center justify-center bg-slate-100 text-slate-500"><FileText className="h-9 w-9" aria-hidden /></span>
                    )}
                    <span className="flex items-center gap-3 border-t border-line bg-white p-3">
                      <ImageIcon className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-extrabold uppercase text-slate-500">{attachment.type === "BEFORE" ? "Antes" : attachment.type === "AFTER" ? "Despues" : "Otro"}</span>
                        <span className="block truncate text-sm font-bold text-slate-800">{attachment.filename}</span>
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            ) : <p className="rounded-lg border border-dashed border-slate-300 bg-panel p-6 text-center text-sm text-slate-500">Todavia no hay evidencias cargadas.</p>}
          </article>

          <article className="surface rounded-lg p-5 sm:p-6">
            <SectionHeading count={idea.comments.length} description="Conversacion y avances registrados por el equipo." title="Comentarios" />
            <div className="space-y-3">
              {idea.comments.length ? idea.comments.map((comment) => (
                <div className="flex gap-3 border-b border-line pb-3 last:border-0" key={comment.id}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold text-slate-700">{(comment.user?.name ?? "S").charAt(0).toUpperCase()}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-ink">{comment.user?.name ?? "Sistema"} <span className="ml-1 font-normal text-slate-400">{comment.createdAt.toLocaleString("es-MX")}</span></p>
                    <p className="mt-1 text-sm leading-5 text-slate-700">{comment.comment}</p>
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">Sin comentarios todavia.</p>}
            </div>
            <form action={addCommentAction} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <input name="ideaId" type="hidden" value={idea.id} />
              <label>
                <span className="label">Nuevo comentario</span>
                <textarea className="field min-h-20" name="comment" placeholder="Escribe una actualizacion para el equipo" />
              </label>
              <button className="btn btn-secondary" type="submit"><Send className="h-4 w-4" aria-hidden />Comentar</button>
            </form>
          </article>
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
          <article className="surface rounded-lg p-5">
            <h2 className="text-base font-extrabold text-ink">Resumen</h2>
            <dl className="mt-4 divide-y divide-line text-sm">
              {[
                ["Área", `${idea.area.code} · ${idea.area.name}`],
                ["Colaborador", idea.collaboratorName],
                ["Turno", idea.shift],
                ["Categoría", ideaCategoryLabels[idea.category]],
                ["Supervisor", idea.supervisor?.name ?? "Sin supervisor"],
                ["Responsable", idea.implementationOwner?.name ?? "Sin responsable"],
                ["Fecha compromiso", idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : "Sin fecha"],
                ["Prioridad", idea.priority ? priorityLabels[idea.priority] : "Sin prioridad"],
                ["Clasificación", idea.classification ? classificationLabels[idea.classification] : "Sin clasificar"],
                ["ProbocaCoins", String(idea.pointsAssigned)]
              ].map(([label, value]) => (
                <div className="grid grid-cols-[120px_1fr] gap-3 py-2.5" key={label}>
                  <dt className="text-xs font-bold text-slate-500">{label}</dt>
                  <dd className="text-right text-xs font-extrabold leading-5 text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </article>

          {canSupervisor && ["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"].includes(idea.status) ? (
            <article className="surface overflow-hidden rounded-lg">
              <div className="h-1 bg-emerald-600" />
              <div className="p-5">
                <h2 className="text-base font-extrabold text-ink">Decision del supervisor</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">El comentario es obligatorio al rechazar o solicitar información.</p>
                <form action={supervisorDecisionAction} className="mt-4 grid gap-2">
                  <input name="ideaId" type="hidden" value={idea.id} />
                  <fieldset className="rounded-lg border border-line bg-panel p-3">
                    <legend className="px-1 text-xs font-extrabold text-ink">Apoyo requerido</legend>
                    <p className="mb-2 text-xs leading-5 text-slate-500">Puedes agregar o quitar áreas antes de aprobar.</p>
                    <div className="grid gap-2">
                      <label className="flex items-center gap-2 text-xs font-bold"><input defaultChecked={idea.impactsQuality} name="impactsQuality" type="checkbox" />Calidad / Inocuidad</label>
                      <label className="flex items-center gap-2 text-xs font-bold"><input defaultChecked={idea.impactsSafety} name="impactsSafety" type="checkbox" />Seguridad</label>
                      <label className="flex items-center gap-2 text-xs font-bold"><input defaultChecked={idea.requiresMaintenance} name="requiresMaintenance" type="checkbox" />Mantenimiento</label>
                    </div>
                  </fieldset>
                  <textarea className="field min-h-20" name="comments" placeholder="Comentario de la decision" />
                  <button className="btn btn-success" name="decision" type="submit" value="APROBAR"><Check className="h-4 w-4" aria-hidden />Aprobar idea</button>
                  <button className="btn btn-secondary" name="decision" type="submit" value="SOLICITAR_INFORMACION"><MessageSquareMore className="h-4 w-4" aria-hidden />Solicitar información</button>
                  <button className="btn btn-danger" name="decision" type="submit" value="RECHAZAR"><XCircle className="h-4 w-4" aria-hidden />Rechazar</button>
                </form>
              </div>
            </article>
          ) : null}

          {canReopen ? (
            <details className="details-panel border-slate-900" open>
              <summary><span className="flex items-center gap-2 text-slate-950"><RotateCcw className="h-4 w-4" aria-hidden />Revalidar idea rechazada</span></summary>
              <form action={reopenRejectedIdeaAction} className="grid gap-3 p-4">
                <input name="ideaId" type="hidden" value={idea.id} />
                <p className="text-xs leading-5 text-slate-600">Mejora Continua puede justificar la recuperación y enviarla nuevamente a las áreas que deban apoyar.</p>
                <label><span className="label">Justificación de la revalidación *</span><textarea className="field min-h-24" name="justification" placeholder="Explica por qué debe continuar y qué cambió en la evaluación" required /></label>
                <fieldset>
                  <legend className="label">Solicitar apoyo a</legend>
                  <div className="grid gap-2">
                    <label className="flex items-center gap-2 rounded-lg border border-line p-3 text-xs font-bold"><input defaultChecked={idea.impactsQuality} name="impactsQuality" type="checkbox" />Calidad / Inocuidad</label>
                    <label className="flex items-center gap-2 rounded-lg border border-line p-3 text-xs font-bold"><input defaultChecked={idea.impactsSafety} name="impactsSafety" type="checkbox" />Seguridad</label>
                    <label className="flex items-center gap-2 rounded-lg border border-line p-3 text-xs font-bold"><input defaultChecked={idea.requiresMaintenance} name="requiresMaintenance" type="checkbox" />Mantenimiento</label>
                  </div>
                </fieldset>
                <button className="btn btn-primary" type="submit"><RotateCcw className="h-4 w-4" aria-hidden />Reabrir y enviar a validación</button>
              </form>
            </details>
          ) : null}

          {validationTypes.map((type) => {
            const approval = idea.approvals.find((item) => item.type === type);
            if (!approval || approval.status === "APPROVED" || approval.status === "REJECTED") return null;
            const tone = approvalTone[type];
            return (
              <article className="surface overflow-hidden rounded-lg" key={type}>
                <div className={`h-1 ${tone.accent}`} />
                <div className="p-5">
                  <h2 className="text-base font-extrabold text-ink">{approvalTypeLabels[type]}</h2>
                  <form action={validationDecisionAction} className="mt-4 grid gap-2">
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <input name="type" type="hidden" value={type} />
                    <textarea className="field min-h-20" name="comments" placeholder="Comentario de la validación" />
                    <button className="btn btn-success" name="decision" type="submit" value="APROBAR"><Check className="h-4 w-4" aria-hidden />Aprobar validación</button>
                    <button className="btn btn-secondary" name="decision" type="submit" value="SOLICITAR_INFORMACION">Solicitar información</button>
                    <button className="btn btn-danger" name="decision" type="submit" value="RECHAZAR">Rechazar</button>
                  </form>
                </div>
              </article>
            );
          })}

          {canClassify ? (
            <details className="details-panel" open={["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA"].includes(idea.status)}>
              <summary><span className="flex items-center gap-2"><Tag className="h-4 w-4 text-slate-500" aria-hidden />Clasificar y priorizar</span></summary>
              <form action={classifyIdeaAction} className="grid gap-3 p-4">
                <input name="ideaId" type="hidden" value={idea.id} />
                <label><span className="label">Clasificación</span><select className="field" name="classification" defaultValue={idea.classification ?? "IDEA_RAPIDA"}>{Object.entries(classificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <div className="overflow-hidden border border-line bg-panel">
                  <div className="grid grid-cols-[90px_minmax(0,1fr)_92px] border-b border-line bg-slate-100 px-3 py-2 text-[9px] font-extrabold uppercase text-slate-500"><span>Ruta</span><span>Señal principal</span><span>Tiempo</span></div>
                  {coreClassificationGuide.map((item) => <div className="grid grid-cols-[90px_minmax(0,1fr)_92px] gap-2 border-b border-line px-3 py-2.5 text-[11px] last:border-0" key={item.key}><span className="font-extrabold text-ink">{item.label}</span><span className="leading-4 text-slate-600">{item.signal}</span><span className="font-bold text-slate-700">{item.timing}</span></div>)}
                </div>
                <label><span className="label">Prioridad</span><select className="field" name="priority" defaultValue={idea.priority ?? "MEDIA"}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label><span className="label">Comentario de MC</span><textarea className="field min-h-20" name="mcComments" placeholder="Criterio o alcance" defaultValue={idea.mcComments ?? ""} /></label>
                <button className="btn btn-secondary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar clasificación</button>
              </form>
            </details>
          ) : null}

          {canAssign ? (
            <details className="details-panel" open={["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA"].includes(idea.status)}>
              <summary><span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-500" aria-hidden />Asignar implementación</span></summary>
              <form action={assignImplementationAction} className="grid gap-3 p-4">
                <input name="ideaId" type="hidden" value={idea.id} />
                <label><span className="label">Responsable</span><select className="field" name="ownerId" defaultValue={idea.implementationOwnerId ?? ""} required><option value="">Seleccionar responsable</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label>
                <label><span className="label">Fecha compromiso</span><input className="field" name="dueDate" type="date" defaultValue={idea.dueDate ? idea.dueDate.toISOString().slice(0, 10) : ""} required /></label>
                <label><span className="label">Prioridad</span><select className="field" name="priority" defaultValue={idea.priority ?? "MEDIA"}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input defaultChecked={idea.requiresEvidence} name="requiresEvidence" type="checkbox" />Requiere evidencia final</label>
                <button className="btn btn-primary" type="submit">Guardar asignacion</button>
              </form>
            </details>
          ) : null}

          {canUpdateProgress ? (
            <details className="details-panel" open={idea.status === "EN_IMPLEMENTACION" || idea.status === "VENCIDA"}>
              <summary><span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-slate-500" aria-hidden />Registrar avance</span></summary>
              <form action={implementationUpdateAction} className="grid gap-3 p-4">
                <input name="ideaId" type="hidden" value={idea.id} />
                <label><span className="label">Avance o comentario</span><textarea className="field min-h-20" name="comments" placeholder="Describe lo realizado" /></label>
                <label><span className="label">Evidencia después</span><input className="field" name="afterEvidence" type="file" accept="image/*,.pdf" /></label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="markImplemented" type="checkbox" />Marcar como implementada</label>
                <button className="btn btn-primary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar avance</button>
              </form>
            </details>
          ) : null}

          {canReviewClose ? (
            <details className="details-panel" open>
              <summary><span className="flex items-center gap-2"><ProbocaCoin size="sm" />{isClosed ? "ProbocaCoins otorgadas" : "Cierre y ProbocaCoins"}</span></summary>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
                  <div><p className="text-xs font-extrabold uppercase text-slate-500">{isClosed ? "Total de ProbocaCoins" : "ProbocaCoins sugeridas"}</p><p className="mt-1 text-xs text-slate-500">Base {automaticPoints.totalPoints} + evaluacion gerencial {managerialSuggestionTotal}. Todo puede ajustarse.</p></div>
                  <p className="flex items-center gap-2 text-3xl font-extrabold text-ink"><ProbocaCoin size="md" />{isClosed ? idea.pointsAssigned : automaticPoints.totalPoints + managerialSuggestionTotal}</p>
                </div>
                {!isClosed && !hasAfterEvidence && idea.requiresEvidence ? <div className="alert alert-warning mt-3">Falta evidencia despues para cerrar.</div> : null}

                {isClosed && idea.pointRuleSelections.length ? (
                  <div className="mt-3 space-y-2">
                    {idea.pointRuleSelections.map((item) => <div className="flex items-start justify-between gap-3 border-b border-line py-2 text-sm last:border-0" key={item.id}><span><span className="block font-extrabold text-ink">{item.pointRule.name}</span><span className="block text-xs text-slate-500">{item.pointRule.description}</span></span><span className="flex items-center gap-1 font-extrabold text-emerald-700"><ProbocaCoin size="sm" />+{item.points}</span></div>)}
                  </div>
                ) : null}

                {!isClosed ? (
                  <div className="mt-3">
                    <ProbocaCoinsAwardForm currentSelections={[]} ideaId={idea.id} managerialSuggestions={activeManagerialSuggestions} mode="close" standardRules={standardPointRules} suggestedStandardRuleIds={suggestedStandardRuleIds} />
                  </div>
                ) : idea.pointsAssigned === 0 ? (
                  <div className="mt-4">
                    <div className="alert alert-warning mb-3">Esta idea no tiene ProbocaCoins. Puedes revisar la sugerencia y otorgarlas nuevamente.</div>
                    <ProbocaCoinsAwardForm currentSelections={currentCoinSelections} ideaId={idea.id} managerialSuggestions={activeManagerialSuggestions} mode="restore" standardRules={standardPointRules} suggestedStandardRuleIds={suggestedStandardRuleIds} />
                  </div>
                ) : (
                  <details className="mt-4 border-t border-line pt-4">
                    <summary className="cursor-pointer text-sm font-extrabold text-ink">Modificar ProbocaCoins otorgadas</summary>
                    <div className="mt-3"><ProbocaCoinsAwardForm currentSelections={currentCoinSelections} ideaId={idea.id} managerialSuggestions={activeManagerialSuggestions} mode="adjust" standardRules={standardPointRules} suggestedStandardRuleIds={suggestedStandardRuleIds} /></div>
                  </details>
                )}

                {isClosed && idea.pointsAssigned > 0 ? (
                  <form action={removeIdeaPointsAction} className="mt-4 grid gap-2 border-t border-line pt-4">
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <textarea className="field min-h-20" name="reason" placeholder="Motivo para retirar las ProbocaCoins" required />
                    <button className="btn btn-danger" type="submit"><Trash2 className="h-4 w-4" aria-hidden />Retirar ProbocaCoins</button>
                  </form>
                ) : null}
              </div>
            </details>
          ) : null}

          {canMC && !["CANCELADA", "CERRADA"].includes(idea.status) ? (
            <details className="details-panel border-rose-200">
              <summary><span className="flex items-center gap-2 text-rose-700"><XCircle className="h-4 w-4" aria-hidden />Cancelar idea</span></summary>
              <form action={cancelIdeaAction} className="grid gap-3 p-4">
                <input name="ideaId" type="hidden" value={idea.id} />
                <label><span className="label">Justificación</span><textarea className="field min-h-20" name="reason" placeholder="Explica por qué se cancela" required /></label>
                <button className="btn btn-danger" type="submit">Confirmar cancelacion</button>
              </form>
            </details>
          ) : null}
        </aside>
      </section>

      {canReviewClose ? (
        <article className="surface mt-6 rounded-lg p-5 sm:p-6">
          <ManagerialCriteriaTable currentSelections={currentCoinSelections} managerialSuggestions={managerialSuggestions} />
        </article>
      ) : null}
    </>
  );
}
~~~~~~

### `src/app/(app)/ideas/page.tsx`

~~~~~~tsx
import { IdeaStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { ArrowRight, CalendarDays, Download, Filter, RotateCcw, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { classificationLabels, ideaCategoryLabels, priorityLabels, statusLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

type IdeasPageProps = {
  searchParams: Promise<{ q?: string; status?: string; area?: string }>;
};

export default async function IdeasPage({ searchParams }: IdeasPageProps) {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const query = await searchParams;
  const where: Prisma.IdeaWhereInput = {};
  if (query.q) {
    where.OR = [
      { folio: { contains: query.q } },
      { collaboratorName: { contains: query.q } },
      { problem: { contains: query.q } },
      { proposal: { contains: query.q } }
    ];
  }
  if (query.status && Object.values(IdeaStatus).includes(query.status as IdeaStatus)) where.status = query.status as IdeaStatus;
  if (query.area) where.area = { code: query.area };

  const [ideas, areas] = await Promise.all([
    prisma.idea.findMany({ where, include: { area: true, supervisor: true, implementationOwner: true }, orderBy: { createdAt: "desc" } }),
    prisma.area.findMany({ orderBy: { code: "asc" } })
  ]);
  const hasFilters = Boolean(query.q || query.status || query.area);

  return (
    <>
      <PageHeader
        eyebrow="Mejora Continua · Base de seguimiento"
        title="Todas las ideas"
        description={`${ideas.length} ${ideas.length === 1 ? "resultado" : "resultados"}${hasFilters ? " con los filtros actuales" : " en la base maestra"}.`}
        actions={
          <Link className="btn btn-primary" href="/api/export">
            <Download className="h-4 w-4" aria-hidden /> Exportar Excel
          </Link>
        }
      />

      <form className="surface mb-5 rounded-lg p-4" method="get">
        <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink">
          <Filter className="h-4 w-4 text-slate-500" aria-hidden />
          Buscar y filtrar
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_160px_220px_auto_auto]">
          <label>
            <span className="label">Buscar</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-[14px] h-4 w-4 text-slate-400" aria-hidden />
              <input className="field pl-9" defaultValue={query.q ?? ""} name="q" placeholder="Folio, persona o problema" />
            </span>
          </label>
          <label>
            <span className="label">Área</span>
            <select className="field" defaultValue={query.area ?? ""} name="area">
              <option value="">Todas</option>
              {areas.map((area) => <option key={area.id} value={area.code}>{area.code}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Estatus</span>
            <select className="field" defaultValue={query.status ?? ""} name="status">
              <option value="">Todos</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" type="submit">Aplicar</button>
          </div>
          {hasFilters ? (
            <div className="flex items-end">
              <Link aria-label="Limpiar filtros" className="icon-button w-full md:w-[42px]" href="/ideas" title="Limpiar filtros"><RotateCcw className="h-4 w-4" aria-hidden /></Link>
            </div>
          ) : null}
        </div>
      </form>

      {!ideas.length ? <EmptyState title="No encontramos ideas" description="Cambia los filtros o limpia la busqueda para ver mas resultados." /> : null}

      <div className="mobile-card-list">
        {ideas.map((idea) => {
          const daysOpen = Math.max(0, Math.floor((Date.now() - idea.createdAt.getTime()) / 86400000));
          return (
            <Link className="surface block rounded-lg p-4" href={`/ideas/${idea.id}`} key={idea.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-extrabold text-brand-700">{idea.folio}</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-500">{idea.area.code} · {idea.collaboratorName}</p>
                  <p className="mt-1 text-[11px] font-extrabold text-emerald-700">{ideaCategoryLabels[idea.category]}</p>
                </div>
                <StatusPill status={idea.status} />
              </div>
              <p className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{idea.problem}</p>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden />{daysOpen} dias abierta</span>
                <span className="font-extrabold text-slate-700">{idea.pointsAssigned} ProbocaCoins</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </div>
            </Link>
          );
        })}
      </div>

      {ideas.length ? (
        <div className="table-wrap desktop-table-only">
          <table className="data-table">
            <thead>
              <tr>
                <th>Folio</th><th>Fecha</th><th>Área</th><th>Categoría</th><th>Colaborador</th><th>Problema</th><th>Supervisor</th><th>Estatus</th><th>Prioridad</th><th>Clasificación</th><th>Compromiso</th><th>Días</th><th>ProbocaCoins</th><th><span className="sr-only">Acción</span></th>
              </tr>
            </thead>
            <tbody>
              {ideas.map((idea) => {
                const daysOpen = Math.max(0, Math.floor((Date.now() - idea.createdAt.getTime()) / 86400000));
                return (
                  <tr key={idea.id}>
                    <td><Link className="font-extrabold text-brand-700 hover:underline" href={`/ideas/${idea.id}`}>{idea.folio}</Link></td>
                    <td className="whitespace-nowrap">{idea.createdAt.toLocaleDateString("es-MX")}</td>
                    <td className="font-extrabold text-ink">{idea.area.code}</td>
                    <td className="min-w-44 text-xs font-bold">{ideaCategoryLabels[idea.category]}</td>
                    <td className="whitespace-nowrap">{idea.collaboratorName}</td>
                    <td className="min-w-64 max-w-sm"><p className="line-clamp-2">{idea.problem}</p></td>
                    <td className="whitespace-nowrap">{idea.supervisor?.name ?? "Sin supervisor"}</td>
                    <td><StatusPill status={idea.status} /></td>
                    <td>{idea.priority ? priorityLabels[idea.priority] : "-"}</td>
                    <td className="min-w-36">{idea.classification ? classificationLabels[idea.classification] : "-"}</td>
                    <td className="whitespace-nowrap">{idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : "-"}</td>
                    <td>{daysOpen}</td>
                    <td className="font-extrabold text-ink">{idea.pointsAssigned}</td>
                    <td><Link aria-label={`Ver ${idea.folio}`} className="icon-button h-9 w-9 min-w-9" href={`/ideas/${idea.id}`} title="Ver detalle"><ArrowRight className="h-4 w-4" aria-hidden /></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
~~~~~~

### `src/app/(app)/implementacion/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Save, UserRound } from "lucide-react";
import { implementationUpdateAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/mini-charts";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { isOverdue } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export default async function ImplementationPage() {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR"]);
  const ideas = await prisma.idea.findMany({
    where: { status: { in: ["EN_IMPLEMENTACION", "IMPLEMENTADA", "VENCIDA"] }, ...(user.role === "SUPERVISOR" ? { supervisorId: user.id } : {}) },
    include: { area: true, implementationOwner: true, supervisor: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }]
  });
  const overdue = ideas.filter(isOverdue).length;
  const implemented = ideas.filter((idea) => idea.status === "IMPLEMENTADA").length;

  return (
    <>
      <PageHeader eyebrow="Ejecución · Avances y evidencia" title="Implementación" description="Registra avances, carga la evidencia final y marca las acciones terminadas." />
      <section className="grid gap-3 sm:grid-cols-3">
        <KpiCard detail="Acciones en esta bandeja" icon={Clock3} label="En seguimiento" tone="blue" value={ideas.length} />
        <KpiCard detail="Fecha compromiso superada" icon={AlertTriangle} label="Vencidas" tone="red" value={overdue} />
        <KpiCard detail="Esperan cierre de MC" icon={CheckCircle2} label="Implementadas" tone="green" value={implemented} />
      </section>

      <section className="mt-8">
        <SectionHeading count={ideas.length} description="Actualiza cada acción sin perder de vista responsable y compromiso." title="Acciones activas" tone="blue" />
        {!ideas.length ? <EmptyState title="Sin acciones pendientes" description="Cuando se te asigne una implementación aparecerá en esta bandeja." /> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {ideas.map((idea) => {
            const overdueIdea = isOverdue(idea);
            return (
              <article className={`surface overflow-hidden rounded-lg ${overdueIdea ? "border-rose-300" : ""}`} key={idea.id}>
                <div className={`h-1 ${overdueIdea ? "bg-rose-600" : "bg-blue-600"}`} />
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link className="text-lg font-extrabold text-blue-800 hover:underline" href={`/ideas/${idea.id}`}>{idea.folio}</Link>
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-extrabold text-blue-800">{idea.area.code}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{idea.problem}</p>
                    </div>
                    <StatusPill status={idea.status} />
                  </div>

                  <dl className="mt-4 grid gap-3 border-y border-line py-3 sm:grid-cols-2">
                    <div className="flex items-start gap-2"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden /><div><dt className="text-[10px] font-extrabold uppercase text-slate-500">Responsable</dt><dd className="mt-0.5 text-xs font-extrabold text-ink">{idea.implementationOwner?.name ?? "Sin asignar"}</dd></div></div>
                    <div className="flex items-start gap-2"><CalendarDays className={`mt-0.5 h-4 w-4 shrink-0 ${overdueIdea ? "text-rose-600" : "text-slate-400"}`} aria-hidden /><div><dt className="text-[10px] font-extrabold uppercase text-slate-500">Fecha compromiso</dt><dd className={`mt-0.5 text-xs font-extrabold ${overdueIdea ? "text-rose-700" : "text-ink"}`}>{idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</dd></div></div>
                  </dl>

                  <form action={implementationUpdateAction} className="mt-4 grid gap-3">
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <label><span className="label">Avance realizado</span><textarea className="field min-h-20" name="comments" placeholder="Describe que se hizo o que falta" /></label>
                    <label><span className="label">Evidencia después</span><input className="field" name="afterEvidence" type="file" accept="image/*,.pdf" /></label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="markImplemented" type="checkbox" />Trabajo terminado</label>
                      <button className="btn btn-primary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar avance</button>
                    </div>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
~~~~~~

### `src/app/(app)/kaizen/[id]/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, FileText, FolderOpen, GitMerge, MessageSquare, Paperclip, Plus, Save, Target, Upload, XCircle } from "lucide-react";
import {
  addKaizenActivityAction,
  addKaizenUpdateAction,
  closeKaizenActivityAction,
  mergeKaizenActivitiesAction,
  updateKaizenActivityAction,
  updateKaizenProjectAction,
  uploadKaizenCharterAction
} from "@/app/actions";
import { KaizenStatusPill } from "@/components/module-status";
import { PageHeader } from "@/components/page-header";
import { ProgressMeter } from "@/components/progress-meter";
import { SectionHeading } from "@/components/section-heading";
import { WorkItemDisclosure } from "@/components/work-item-disclosure";
import { isWorkItemOverdue, kaizenStatusLabels, workItemStatusLabels, workProgress } from "@/lib/domain";
import { requireKaizenAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

type KaizenDetailProps = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function KaizenDetailPage({ params, searchParams }: KaizenDetailProps) {
  const { user, canManage } = await requireKaizenAccess();
  const { id } = await params;
  const query = await searchParams;
  const [project, users] = await Promise.all([
    prisma.kaizenProject.findUnique({
      where: { id },
      include: {
        leader: true,
        createdBy: true,
        sourceIdea: true,
        activities: { include: { owner: true, mergedInto: true, attachments: true }, orderBy: { number: "asc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        updates: { include: { user: true, activity: true }, orderBy: { createdAt: "desc" }, take: 60 }
      }
    }),
    prisma.user.findMany({ where: { active: true, role: { not: "COLABORADOR" } }, orderBy: { name: "asc" } })
  ]);
  if (!project) notFound();
  const progress = workProgress(project.activities);
  const charterFiles = project.attachments.filter((attachment) => attachment.type === "CHARTER");
  const activeActivities = project.activities.filter((activity) => !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status));
  const overdue = project.activities.filter(isWorkItemOverdue).length;
  const errorMessage = query.error === "evidencia" ? "Para completar una actividad debes adjuntar evidencia." : query.error === "justificacion" ? "Escribe el motivo por el que la actividad no se realizará." : query.error === "charter" ? "Selecciona el archivo de Project Charter." : query.error ? "Revisa los campos obligatorios." : null;

  return (
    <>
      <PageHeader eyebrow={`Proyectos Kaizen · Kaizen #${String(project.number).padStart(3, "0")}`} title={project.title} description={`${project.area}${project.plant ? ` · ${project.plant}` : ""}`} actions={<><Link className="btn btn-secondary" href="/kaizen"><ArrowLeft className="h-4 w-4" aria-hidden />Panel</Link><Link className="btn btn-secondary" href="/kaizen/gantt"><CalendarDays className="h-4 w-4" aria-hidden />Gantt</Link></>} />
      {errorMessage ? <div className="alert alert-danger mb-5"><AlertTriangle className="h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{errorMessage}</span></div> : null}

      <section className="surface mb-5 rounded-lg p-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-center">
          <div><div className="flex flex-wrap items-center gap-2"><KaizenStatusPill status={project.status} />{project.sourceIdea ? <Link className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-extrabold text-slate-700 hover:border-slate-400" href={`/ideas/${project.sourceIdea.id}`}>Origen {project.sourceIdea.folio}</Link> : null}{charterFiles.length ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">Charter cargado</span> : <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-800">Charter pendiente</span>}</div><p className="mt-4 max-w-4xl text-lg font-extrabold leading-7 text-ink">{project.objective}</p><p className="mt-2 text-sm leading-6 text-slate-600">{project.scope ?? "Alcance por definir."}</p></div>
          <div className="rounded-lg border border-line bg-panel p-4"><ProgressMeter label={`${progress.closed} de ${progress.total} actividades cerradas`} percent={progress.percent} /><div className="mt-4 grid grid-cols-2 gap-3 text-center"><div><p className="text-2xl font-extrabold text-ink">{progress.open}</p><p className="text-[10px] font-bold uppercase text-slate-500">Abiertas</p></div><div><p className={`text-2xl font-extrabold ${overdue ? "text-rose-700" : "text-ink"}`}>{overdue}</p><p className="text-[10px] font-bold uppercase text-slate-500">Vencidas</p></div></div></div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-5">
          <article className="surface rounded-lg p-5">
            <SectionHeading description="Indicador, responsables y calendario del proyecto." title="Ficha ejecutiva" />
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border-l-4 border-amber-500 pl-3"><dt className="text-[10px] font-extrabold uppercase text-slate-500">Líder</dt><dd className="mt-1 text-sm font-extrabold text-ink">{project.leader.name}</dd></div>
              <div className="border-l-4 border-slate-300 pl-3"><dt className="text-[10px] font-extrabold uppercase text-slate-500">Periodo</dt><dd className="mt-1 text-sm font-extrabold text-ink">{project.startDate.toLocaleDateString("es-MX")} – {project.endDate.toLocaleDateString("es-MX")}</dd></div>
              <div className="border-l-4 border-slate-300 pl-3"><dt className="text-[10px] font-extrabold uppercase text-slate-500">Actual → Meta → Real</dt><dd className="mt-1 text-sm font-extrabold text-ink">{project.baselineValue ?? "–"} → {project.targetValue ?? "–"} → {project.currentValue ?? "–"} {project.unit ?? ""}</dd></div>
              <div className="border-l-4 border-emerald-500 pl-3"><dt className="text-[10px] font-extrabold uppercase text-slate-500">Ahorro estimado / real</dt><dd className="mt-1 text-sm font-extrabold text-ink">${(project.estimatedSavings ?? 0).toLocaleString("es-MX")} / ${(project.realSavings ?? 0).toLocaleString("es-MX")}</dd></div>
            </dl>
          </article>

          <section>
            <SectionHeading count={project.activities.filter((activity) => activity.status !== "COMBINADA").length} description="El avance del proyecto se calcula automáticamente con estas actividades." title="Plan de actividades" tone="dark" />
            {!project.activities.length ? <div className="surface rounded-lg border-dashed p-8 text-center text-sm text-slate-500">Todavía no hay actividades en este Kaizen.</div> : null}
            <div className="overflow-hidden rounded-lg">
              {project.activities.map((activity) => {
                const canClose = canManage || project.leaderId === user.id || activity.ownerId === user.id;
                const terminal = ["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status);
                return (
                  <WorkItemDisclosure description={activity.problem ? `Problema: ${activity.problem}` : null} dueDate={activity.dueDate} id={`actividad-${activity.id}`} key={activity.id} number={activity.number} overdue={isWorkItemOverdue(activity)} owner={activity.owner?.name} status={activity.status} title={activity.action} tone="amber">
                      <div className="grid gap-3 text-xs sm:grid-cols-2">
                        <p className="border-l-4 border-slate-300 pl-3"><span className="block text-[10px] font-extrabold uppercase text-slate-400">Contexto</span><span className="mt-1 block leading-5 text-slate-700">{activity.problem ?? "Sin problemática adicional."}</span></p>
                        <p className="flex items-center gap-2 border-l-4 border-slate-300 pl-3"><Paperclip className="h-4 w-4 text-slate-400" aria-hidden /><span><span className="block text-[10px] font-extrabold uppercase text-slate-400">Evidencias</span><span className="mt-1 block font-extrabold text-slate-700">{activity.attachments.length}</span></span></p>
                      </div>
                      {activity.mergedInto ? <div className="alert alert-info mt-3"><GitMerge className="h-4 w-4 shrink-0" aria-hidden />Combinada con actividad #{activity.mergedInto.number}. {activity.mergeReason}</div> : null}
                      {activity.completionNote || activity.cancellationReason ? <p className="mt-3 rounded-lg bg-panel p-3 text-sm leading-5 text-slate-700">{activity.completionNote ?? activity.cancellationReason}</p> : null}
                      {activity.attachments.length ? <div className="mt-3 flex flex-wrap gap-2">{activity.attachments.map((file) => <a className="btn btn-secondary" href={file.path} key={file.id} rel="noreferrer" target="_blank"><Paperclip className="h-4 w-4" aria-hidden />{file.filename}</a>)}</div> : null}

                      {!terminal && (canManage || canClose) ? <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {canManage ? <details className="details-panel"><summary>Editar actividad</summary><form action={updateKaizenActivityAction} className="grid gap-3 p-4"><input name="activityId" type="hidden" value={activity.id} /><label><span className="label">Problemática</span><textarea className="field min-h-20" defaultValue={activity.problem ?? ""} name="problem" /></label><label><span className="label">Acción</span><textarea className="field min-h-20" defaultValue={activity.action} name="action" required /></label><label><span className="label">Responsable</span><select className="field" defaultValue={activity.ownerId ?? ""} name="ownerId"><option value="">Sin asignar</option>{users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label><span className="label">Inicio</span><input className="field" defaultValue={activity.startDate?.toISOString().slice(0, 10) ?? ""} name="startDate" type="date" /></label><label><span className="label">Compromiso</span><input className="field" defaultValue={activity.dueDate?.toISOString().slice(0, 10) ?? ""} name="dueDate" type="date" /></label></div><label><span className="label">Estado</span><select className="field" defaultValue={activity.status} name="status"><option value="PENDIENTE">Pendiente</option><option value="EN_PROCESO">En proceso</option><option value="BLOQUEADA">Bloqueada</option></select></label><button className="btn btn-secondary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar actividad</button></form></details> : null}
                        {canClose ? <details className="details-panel"><summary>Cerrar actividad</summary><form action={closeKaizenActivityAction} className="grid gap-3 p-4"><input name="activityId" type="hidden" value={activity.id} /><p className="text-xs leading-5 text-slate-600">Para completar, adjunta evidencia. Si no se hará, escribe la justificación.</p><label><span className="label">Evidencia</span><input className="field" name="evidence" type="file" accept="image/*,.pdf,.doc,.docx" /></label><label><span className="label">Resultado o justificación</span><textarea className="field min-h-20" name="note" placeholder="Qué se realizó o por qué no se realizará" /></label><div className="grid gap-2 sm:grid-cols-2"><button className="btn btn-success" name="outcome" type="submit" value="COMPLETADA"><CheckCircle2 className="h-4 w-4" aria-hidden />Completar</button><button className="btn btn-danger" name="outcome" type="submit" value="CANCELADA"><XCircle className="h-4 w-4" aria-hidden />Cerrar sin ejecutar</button></div></form></details> : null}
                      </div> : null}
                  </WorkItemDisclosure>
                );
              })}
            </div>
          </section>

          <article className="surface rounded-lg p-5">
            <SectionHeading count={project.updates.length} description="Comentarios y decisiones en orden cronológico." title="Bitácora" />
            {canManage ? <form action={addKaizenUpdateAction} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><input name="projectId" type="hidden" value={project.id} /><label><span className="label">Nuevo seguimiento</span><textarea className="field min-h-20" name="comment" placeholder="Avance, bloqueo, acuerdo o siguiente paso" required /></label><button className="btn btn-secondary" type="submit"><MessageSquare className="h-4 w-4" aria-hidden />Agregar</button></form> : null}
            <div className="mt-5 space-y-3 border-t border-line pt-4">{project.updates.map((update) => <div className="flex gap-3" key={update.id}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold">{(update.user?.name ?? "S").charAt(0)}</span><div><p className="text-xs font-extrabold text-ink">{update.user?.name ?? "Sistema"} <span className="font-normal text-slate-400">{update.createdAt.toLocaleString("es-MX")}</span></p><p className="mt-1 text-sm leading-5 text-slate-700">{update.comment}</p></div></div>)}</div>
          </article>
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
          <article className="surface rounded-lg p-5">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800"><FolderOpen className="h-5 w-5" aria-hidden /></span><div><h2 className="text-base font-extrabold text-ink">Carpeta del Kaizen</h2><p className="text-xs text-slate-500">{project.folio}</p></div></div>
            <div className="mt-4 space-y-2">{charterFiles.length ? charterFiles.map((file) => <a className="flex items-center gap-3 rounded-lg border border-line bg-panel p-3 text-sm font-bold text-slate-700 hover:border-slate-400" href={file.path} key={file.id} rel="noreferrer" target="_blank"><FileText className="h-4 w-4 shrink-0 text-amber-700" aria-hidden /><span className="min-w-0 flex-1 truncate">{file.filename}</span></a>) : <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-xs leading-5 text-amber-900">En espera del Project Charter.</p>}</div>
            {canManage ? <form action={uploadKaizenCharterAction} className="mt-4 grid gap-2 border-t border-line pt-4"><input name="projectId" type="hidden" value={project.id} /><label><span className="label">Project Charter</span><input className="field" name="charter" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" required /></label><button className="btn btn-secondary" type="submit"><Upload className="h-4 w-4" aria-hidden />Subir documento</button></form> : null}
          </article>

          {canManage ? <details className="details-panel"><summary><span className="flex items-center gap-2"><Target className="h-4 w-4 text-amber-700" aria-hidden />Editar proyecto</span></summary><form action={updateKaizenProjectAction} className="grid gap-3 p-4"><input name="projectId" type="hidden" value={project.id} /><label><span className="label">Nombre</span><input className="field" defaultValue={project.title} name="title" required /></label><div className="grid grid-cols-2 gap-2"><label><span className="label">Planta</span><input className="field" defaultValue={project.plant ?? ""} name="plant" /></label><label><span className="label">Área</span><input className="field" defaultValue={project.area} name="area" required /></label></div><label><span className="label">Objetivo</span><textarea className="field min-h-20" defaultValue={project.objective} name="objective" required /></label><label><span className="label">Alcance</span><textarea className="field min-h-20" defaultValue={project.scope ?? ""} name="scope" /></label><label><span className="label">Líder</span><select className="field" defaultValue={project.leaderId} name="leaderId">{users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label><span className="label">Inicio</span><input className="field" defaultValue={project.startDate.toISOString().slice(0, 10)} name="startDate" type="date" required /></label><label><span className="label">Cierre</span><input className="field" defaultValue={project.endDate.toISOString().slice(0, 10)} name="endDate" type="date" required /></label></div><label><span className="label">Estado</span><select className="field" defaultValue={project.status} name="status">{Object.entries(kaizenStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="grid grid-cols-3 gap-2"><label><span className="label">Actual</span><input className="field" defaultValue={project.baselineValue ?? ""} name="baselineValue" step="any" type="number" /></label><label><span className="label">Meta</span><input className="field" defaultValue={project.targetValue ?? ""} name="targetValue" step="any" type="number" /></label><label><span className="label">Real</span><input className="field" defaultValue={project.currentValue ?? ""} name="currentValue" step="any" type="number" /></label></div><label><span className="label">Unidad</span><input className="field" defaultValue={project.unit ?? ""} name="unit" /></label><div className="grid grid-cols-2 gap-2"><label><span className="label">Ahorro estimado</span><input className="field" defaultValue={project.estimatedSavings ?? ""} name="estimatedSavings" type="number" /></label><label><span className="label">Ahorro real</span><input className="field" defaultValue={project.realSavings ?? ""} name="realSavings" type="number" /></label></div><button className="btn btn-primary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar proyecto</button></form></details> : null}

          {canManage ? <details className="details-panel"><summary><span className="flex items-center gap-2"><Plus className="h-4 w-4 text-amber-700" aria-hidden />Agregar actividad</span></summary><form action={addKaizenActivityAction} className="grid gap-3 p-4"><input name="projectId" type="hidden" value={project.id} /><label><span className="label">Problemática</span><textarea className="field min-h-20" name="problem" /></label><label><span className="label">Acción *</span><textarea className="field min-h-20" name="action" required /></label><label><span className="label">Responsable</span><select className="field" defaultValue="" name="ownerId"><option value="">Sin asignar</option>{users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label><span className="label">Inicio</span><input className="field" name="startDate" type="date" /></label><label><span className="label">Compromiso</span><input className="field" name="dueDate" type="date" /></label></div><button className="btn btn-primary" type="submit"><Plus className="h-4 w-4" aria-hidden />Agregar</button></form></details> : null}

          {canManage && activeActivities.length > 1 ? <details className="details-panel"><summary><span className="flex items-center gap-2"><GitMerge className="h-4 w-4 text-violet-700" aria-hidden />Combinar actividades</span></summary><form action={mergeKaizenActivitiesAction} className="grid gap-3 p-4"><label><span className="label">Actividad duplicada</span><select className="field" name="sourceId" required defaultValue=""><option value="">Seleccionar</option>{activeActivities.map((activity) => <option key={activity.id} value={activity.id}>#{activity.number} · {activity.action}</option>)}</select></label><label><span className="label">Se integrará en</span><select className="field" name="targetId" required defaultValue=""><option value="">Seleccionar</option>{activeActivities.map((activity) => <option key={activity.id} value={activity.id}>#{activity.number} · {activity.action}</option>)}</select></label><label><span className="label">Justificación *</span><textarea className="field min-h-20" name="reason" required /></label><button className="btn btn-secondary" type="submit"><GitMerge className="h-4 w-4" aria-hidden />Combinar</button></form></details> : null}
        </aside>
      </section>
    </>
  );
}
~~~~~~

### `src/app/(app)/kaizen/gantt/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { updateKaizenDatesAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProgressMeter } from "@/components/progress-meter";
import { workProgress } from "@/lib/domain";
import { requireKaizenAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

type GanttProps = { searchParams: Promise<{ year?: string; error?: string }> };

function isoWeek(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const first = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - first.getTime()) / 86400000) + 1) / 7);
}

function mondayOfWeek(year: number, week: number) {
  const fourth = new Date(Date.UTC(year, 0, 4));
  const day = fourth.getUTCDay() || 7;
  const monday = new Date(fourth);
  monday.setUTCDate(fourth.getUTCDate() - day + 1 + (week - 1) * 7);
  return monday;
}

const barTone = {
  PENDIENTE_CHARTER: "bg-amber-400 text-slate-950",
  PLANIFICACION: "bg-sky-500 text-white",
  EN_CURSO: "bg-emerald-600 text-white",
  EN_PAUSA: "bg-slate-500 text-white",
  COMPLETADO: "bg-slate-950 text-white",
  CANCELADO: "bg-rose-600 text-white"
};

export default async function KaizenGanttPage({ searchParams }: GanttProps) {
  const { canManage } = await requireKaizenAccess();
  const query = await searchParams;
  const currentYear = new Date().getFullYear();
  const parsedYear = Number(query.year || currentYear);
  const year = Number.isInteger(parsedYear) && parsedYear >= 2020 && parsedYear <= 2100 ? parsedYear : currentYear;
  const yearStart = new Date(`${year}-01-01T00:00:00`);
  const yearEnd = new Date(`${year}-12-31T23:59:59`);
  const projects = await prisma.kaizenProject.findMany({
    where: { startDate: { lte: yearEnd }, endDate: { gte: yearStart } },
    include: { leader: true, activities: true },
    orderBy: [{ startDate: "asc" }, { number: "asc" }]
  });
  const weeks = Array.from({ length: 53 }, (_, index) => index + 1);
  const gridStyle = { gridTemplateColumns: "340px repeat(53, 34px)" };

  return (
    <>
      <PageHeader
        eyebrow="Proyectos Kaizen · Calendario anual"
        title={`Gantt Kaizen ${year}`}
        description="Las fechas se editan aquí o en la carpeta del proyecto; ambas vistas usan el mismo registro."
        actions={<div className="flex items-center gap-2"><Link aria-label="Año anterior" className="icon-button" href={`/kaizen/gantt?year=${year - 1}`}><ChevronLeft className="h-4 w-4" aria-hidden /></Link><span className="min-w-16 text-center text-sm font-extrabold">{year}</span><Link aria-label="Año siguiente" className="icon-button" href={`/kaizen/gantt?year=${year + 1}`}><ChevronRight className="h-4 w-4" aria-hidden /></Link></div>}
      />
      {query.error ? <div className="alert alert-danger mb-5">La fecha final debe ser posterior a la fecha de inicio.</div> : null}
      {!projects.length ? <EmptyState title="No hay proyectos en este año" description="Cambia el año o crea un nuevo proyecto Kaizen." /> : (
        <section className="surface overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <div className="gantt-grid gantt-header" style={gridStyle}>
              <div className="gantt-sticky-cell px-4 py-3"><p className="text-xs font-extrabold uppercase text-slate-500">Proyecto, fechas y avance</p></div>
              {weeks.map((week) => {
                const date = mondayOfWeek(year, week);
                const month = date.toLocaleDateString("es-MX", { month: "short", timeZone: "UTC" });
                return <div className="border-l border-line py-2 text-center" key={week}><span className="block text-[9px] font-bold uppercase text-slate-400">{week === 1 || date.getUTCDate() <= 7 ? month : ""}</span><span className="block text-[10px] font-extrabold text-slate-600">{week}</span></div>;
              })}
            </div>
            {projects.map((project) => {
              const progress = workProgress(project.activities);
              const start = project.startDate.getFullYear() < year ? 1 : Math.max(1, isoWeek(project.startDate));
              const end = project.endDate.getFullYear() > year ? 53 : Math.min(53, isoWeek(project.endDate));
              return (
                <div className="gantt-grid gantt-project-row" style={gridStyle} key={project.id}>
                  <div className="gantt-sticky-cell border-t border-line bg-white p-3">
                    <div className="flex items-start justify-between gap-2"><Link className="min-w-0 text-sm font-extrabold text-ink hover:text-amber-700" href={`/kaizen/${project.id}`}>#{String(project.number).padStart(3, "0")} · {project.title}</Link><span className="shrink-0 text-[10px] font-bold text-slate-500">{project.leader.name}</span></div>
                    {canManage ? (
                      <form action={updateKaizenDatesAction} className="mt-2 grid grid-cols-[1fr_1fr_34px] gap-1.5">
                        <input name="projectId" type="hidden" value={project.id} />
                        <input aria-label={`Inicio de ${project.folio}`} className="field min-h-8 px-1.5 py-1 text-[10px]" defaultValue={project.startDate.toISOString().slice(0, 10)} name="startDate" type="date" />
                        <input aria-label={`Cierre de ${project.folio}`} className="field min-h-8 px-1.5 py-1 text-[10px]" defaultValue={project.endDate.toISOString().slice(0, 10)} name="endDate" type="date" />
                        <button aria-label={`Guardar fechas de ${project.folio}`} className="icon-button h-8 min-h-8 w-8 min-w-8" type="submit"><Save className="h-3.5 w-3.5" aria-hidden /></button>
                      </form>
                    ) : <p className="mt-2 text-[10px] font-bold text-slate-500">{project.startDate.toLocaleDateString("es-MX")} → {project.endDate.toLocaleDateString("es-MX")}</p>}
                    <div className="mt-2"><ProgressMeter label={`${progress.closed}/${progress.total} actividades`} percent={progress.percent} /></div>
                  </div>
                  {weeks.map((week) => <div className={`border-l border-t border-line ${week % 4 === 0 ? "bg-slate-50" : "bg-white"}`} key={week} />)}
                  <Link className={`gantt-bar ${barTone[project.status]}`} href={`/kaizen/${project.id}`} style={{ gridColumn: `${start + 1} / ${Math.max(start + 2, end + 2)}`, gridRow: 1 }} title={`${project.folio}: ${project.startDate.toLocaleDateString("es-MX")} - ${project.endDate.toLocaleDateString("es-MX")}`}><span>{progress.percent}%</span></Link>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span><strong className="text-slate-700">Gris alternado:</strong> bloques de cuatro semanas</span><span><strong className="text-slate-700">Barra:</strong> periodo vigente del proyecto</span><span><strong className="text-slate-700">Número:</strong> semana del año</span></div>
    </>
  );
}
~~~~~~

### `src/app/(app)/kaizen/kanban/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { KaizenStatusPill, WorkStatusPill } from "@/components/module-status";
import { PageHeader } from "@/components/page-header";
import { ProgressMeter } from "@/components/progress-meter";
import { isWorkItemOverdue, workProgress } from "@/lib/domain";
import { requireKaizenAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

const columns = [
  { key: "PENDIENTES", title: "Por iniciar", tone: "border-amber-400" },
  { key: "EN_PROCESO", title: "En seguimiento", tone: "border-blue-500" },
  { key: "BLOQUEADAS", title: "Con bloqueos", tone: "border-rose-500" },
  { key: "CERRADAS", title: "Cerrados", tone: "border-emerald-600" }
] as const;

type ColumnKey = typeof columns[number]["key"];

function projectColumn(project: {
  status: string;
  activities: Array<{ status: string }>;
}): ColumnKey {
  const activities = project.activities.filter((activity) => activity.status !== "COMBINADA");
  const allClosed = activities.length > 0 && activities.every((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status));
  if (["COMPLETADO", "CANCELADO"].includes(project.status) || allClosed) return "CERRADAS";
  if (project.status === "EN_PAUSA" || activities.some((activity) => activity.status === "BLOQUEADA")) return "BLOQUEADAS";
  if (project.status === "EN_CURSO" || activities.some((activity) => activity.status === "EN_PROCESO" || ["COMPLETADA", "CANCELADA"].includes(activity.status))) return "EN_PROCESO";
  return "PENDIENTES";
}

export default async function KaizenKanbanPage() {
  await requireKaizenAccess();
  const projects = await prisma.kaizenProject.findMany({
    include: {
      leader: true,
      activities: { include: { owner: true }, orderBy: { number: "asc" } }
    },
    orderBy: [{ endDate: "asc" }, { number: "desc" }]
  });

  return (
    <>
      <PageHeader eyebrow="Proyectos Kaizen / Flujo visual" title="Kanban Kaizen por proyecto" description="Cada tarjeta representa un proyecto completo y mantiene sus actividades juntas para revisar avance, responsables y bloqueos." />
      {!projects.length ? <EmptyState title="No hay proyectos Kaizen" description="Los proyectos apareceran aqui cuando se creen o se transfieran desde Ideas de Mejora." /> : null}
      <section className="grid gap-4 xl:grid-cols-4">
        {columns.map((column) => {
          const items = projects.filter((project) => projectColumn(project) === column.key);
          return (
            <div className="min-w-0" key={column.key}>
              <div className={`mb-3 flex items-center justify-between border-b-2 ${column.tone} pb-2`}>
                <h2 className="text-sm font-extrabold text-ink">{column.title}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-extrabold text-slate-700">{items.length} Kaizen</span>
              </div>
              <div className="grid gap-3">
                {items.map((project) => {
                  const activities = project.activities.filter((activity) => activity.status !== "COMBINADA");
                  const progress = workProgress(activities);
                  const overdue = activities.filter(isWorkItemOverdue).length;
                  const accent = column.key === "CERRADAS" ? "bg-emerald-600" : column.key === "BLOQUEADAS" ? "bg-rose-600" : column.key === "EN_PROCESO" ? "bg-blue-600" : "bg-amber-500";
                  return (
                    <article className="surface overflow-hidden rounded-lg" key={project.id}>
                      <div className={`h-1 ${accent}`} />
                      <div className="p-4">
                        <Link className="group flex items-start justify-between gap-3" href={`/kaizen/${project.id}`}>
                          <span className="min-w-0">
                            <span className="block text-[10px] font-extrabold uppercase text-amber-700">{project.folio}</span>
                            <span className="mt-1 block line-clamp-2 text-base font-extrabold leading-5 text-ink">{project.title}</span>
                            <span className="mt-1 block truncate text-[11px] font-bold text-slate-500">{project.leader.name} / {project.endDate.toLocaleDateString("es-MX")}</span>
                          </span>
                          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-amber-700" aria-hidden />
                        </Link>
                        <div className="mt-3"><KaizenStatusPill status={project.status} /></div>
                        <div className="mt-4"><ProgressMeter label={`${progress.closed} de ${progress.total} realizadas`} percent={progress.percent} /></div>
                        {overdue ? <p className="mt-3 flex items-center gap-2 text-xs font-extrabold text-rose-700"><AlertTriangle className="h-4 w-4" aria-hidden />{overdue} {overdue === 1 ? "actividad vencida" : "actividades vencidas"}</p> : null}
                      </div>
                      <div className="border-t border-line bg-slate-50/70">
                        {activities.slice(0, 3).map((activity) => (
                          <Link className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-2 border-b border-line px-3 py-3 transition last:border-0 hover:bg-white" href={`/kaizen/${project.id}#actividad-${activity.id}`} key={activity.id}>
                            <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-extrabold ${["COMPLETADA", "CANCELADA"].includes(activity.status) ? "bg-emerald-100 text-emerald-800" : activity.status === "BLOQUEADA" ? "bg-rose-100 text-rose-800" : "bg-white text-slate-700"}`}>{activity.status === "COMPLETADA" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : activity.number}</span>
                            <span className="min-w-0">
                              <span className="line-clamp-2 block text-xs font-extrabold leading-4 text-slate-800">{activity.action}</span>
                              <span className={`mt-1 block truncate text-[10px] font-bold ${isWorkItemOverdue(activity) ? "text-rose-700" : "text-slate-500"}`}>{activity.owner?.name ?? "Sin responsable"} / {activity.dueDate ? activity.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</span>
                            </span>
                            <WorkStatusPill status={activity.status} />
                          </Link>
                        ))}
                        {!activities.length ? <p className="px-4 py-5 text-center text-xs font-bold text-slate-500">Sin actividades registradas</p> : null}
                        {activities.length ? <Link className="flex min-h-11 items-center justify-between gap-3 bg-white px-3 py-2 text-xs font-extrabold text-amber-800 hover:bg-amber-50" href={`/kaizen/${project.id}`}><span>Ver plan completo · {activities.length} actividades</span><ArrowRight className="h-4 w-4" aria-hidden /></Link> : null}
                      </div>
                    </article>
                  );
                })}
                {!items.length ? <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500"><FolderKanban className="mx-auto mb-2 h-5 w-5" aria-hidden />Sin proyectos</div> : null}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
~~~~~~

### `src/app/(app)/kaizen/nuevo/page.tsx`

~~~~~~tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderPlus, Save } from "lucide-react";
import { createKaizenProjectAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { requireKaizenAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

type NewKaizenProps = { searchParams: Promise<{ error?: string }> };

export default async function NewKaizenPage({ searchParams }: NewKaizenProps) {
  const { canManage } = await requireKaizenAccess();
  if (!canManage) redirect("/kaizen");
  const query = await searchParams;
  const users = await prisma.user.findMany({ where: { active: true, role: { not: "COLABORADOR" } }, orderBy: { name: "asc" } });
  const today = new Date();
  const defaultEnd = new Date(today.getTime() + 60 * 86400000);

  return (
    <>
      <PageHeader eyebrow="Proyectos Kaizen · Alta" title="Crear proyecto Kaizen" description="El folio se asignará automáticamente y la carpeta quedará en espera del Project Charter." actions={<Link className="btn btn-secondary" href="/kaizen"><ArrowLeft className="h-4 w-4" aria-hidden />Volver</Link>} />
      {query.error ? <div className="alert alert-danger mb-5">Revisa los campos y confirma que la fecha final sea posterior a la fecha de inicio.</div> : null}
      <form action={createKaizenProjectAction} className="surface overflow-hidden rounded-lg">
        <div className="border-l-4 border-amber-500 p-5 sm:p-6">
          <SectionHeading description="Nombre, objetivo y dueño del resultado." title="Definición del proyecto" tone="dark" />
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="lg:col-span-2"><span className="label">Nombre del Kaizen *</span><input className="field" name="title" placeholder="Ejemplo: Reducir tiempos de cambio en P1" required /></label>
            <label><span className="label">Planta</span><select className="field" defaultValue="Apodaca" name="plant"><option>Apodaca</option><option>El Carmen</option><option>Otra</option></select></label>
            <label><span className="label">Área / proceso *</span><input className="field" name="area" placeholder="Línea, departamento o proceso" required /></label>
            <label className="lg:col-span-2"><span className="label">Objetivo *</span><textarea className="field min-h-24" name="objective" placeholder="Resultado concreto que se busca alcanzar" required /></label>
            <label className="lg:col-span-2"><span className="label">Alcance</span><textarea className="field min-h-20" name="scope" placeholder="Qué incluye y qué no incluye el proyecto" /></label>
            <label><span className="label">Líder / responsable *</span><select className="field" name="leaderId" required defaultValue=""><option value="">Seleccionar</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3"><label><span className="label">Inicio *</span><input className="field" defaultValue={today.toISOString().slice(0, 10)} name="startDate" type="date" required /></label><label><span className="label">Cierre esperado *</span><input className="field" defaultValue={defaultEnd.toISOString().slice(0, 10)} name="endDate" type="date" required /></label></div>
          </div>
        </div>

        <div className="border-t border-line p-5 sm:p-6">
          <SectionHeading description="Campos tomados del control actual de Kaizen; pueden completarse después." title="Indicador y beneficio" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label><span className="label">Valor actual</span><input className="field" name="baselineValue" step="any" type="number" /></label>
            <label><span className="label">Meta</span><input className="field" name="targetValue" step="any" type="number" /></label>
            <label><span className="label">Resultado real</span><input className="field" name="currentValue" step="any" type="number" /></label>
            <label><span className="label">Unidad</span><input className="field" name="unit" placeholder="%, minutos, kg, MOD..." /></label>
            <label><span className="label">Ahorro estimado</span><input className="field" min="0" name="estimatedSavings" step="any" type="number" /></label>
            <label><span className="label">Ahorro real</span><input className="field" min="0" name="realSavings" step="any" type="number" /></label>
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-line bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><FolderPlus className="h-5 w-5 text-amber-300" aria-hidden /><p className="text-sm font-bold">Se generará el siguiente número Kaizen disponible.</p></div>
          <button className="btn bg-amber-500 text-slate-950 hover:bg-amber-400" type="submit"><Save className="h-4 w-4" aria-hidden />Crear carpeta Kaizen</button>
        </footer>
      </form>
    </>
  );
}
~~~~~~

### `src/app/(app)/kaizen/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { CalendarRange, Download, ListTodo, Plus } from "lucide-react";
import { KaizenCommandCenter, type KaizenDashboardProject } from "@/components/kaizen-command-center";
import { PageHeader } from "@/components/page-header";
import { requireKaizenAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

export default async function KaizenDashboardPage() {
  const { canManage } = await requireKaizenAccess();
  const projects = await prisma.kaizenProject.findMany({
    include: {
      leader: true,
      activities: { include: { owner: true }, orderBy: { number: "asc" } },
      attachments: true,
      sourceIdea: true
    },
    orderBy: [{ status: "asc" }, { number: "desc" }]
  });

  const dashboardProjects: KaizenDashboardProject[] = projects.map((project) => ({
    id: project.id,
    number: project.number,
    folio: project.folio,
    title: project.title,
    plant: project.plant,
    area: project.area,
    objective: project.objective,
    status: project.status,
    startDate: project.startDate.toISOString(),
    endDate: project.endDate.toISOString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    leaderName: project.leader.name,
    sourceIdeaFolio: project.sourceIdea?.folio ?? null,
    estimatedSavings: project.estimatedSavings ?? 0,
    realSavings: project.realSavings ?? 0,
    hasCharter: project.attachments.some((attachment) => attachment.type === "CHARTER"),
    activities: project.activities.map((activity) => ({
      id: activity.id,
      number: activity.number,
      action: activity.action,
      ownerName: activity.owner?.name ?? null,
      startDate: activity.startDate?.toISOString() ?? null,
      dueDate: activity.dueDate?.toISOString() ?? null,
      status: activity.status,
      closedAt: activity.closedAt?.toISOString() ?? null,
      createdAt: activity.createdAt.toISOString()
    }))
  }));

  return (
    <>
      <PageHeader
        eyebrow="Proyectos Kaizen · Dirección y seguimiento"
        title="Centro de mando Kaizen"
        description="Salud del portafolio, avance planeado contra real, beneficios y compromisos en una vista ejecutiva."
        actions={
          <>
            <Link className="btn btn-secondary" href="/api/export/kaizen"><Download className="h-4 w-4" aria-hidden />Excel</Link>
            <Link className="btn btn-secondary" href="/kaizen/kanban"><ListTodo className="h-4 w-4" aria-hidden />Kanban</Link>
            <Link className="btn btn-secondary" href="/kaizen/gantt"><CalendarRange className="h-4 w-4" aria-hidden />Gantt</Link>
            {canManage ? <Link className="btn btn-primary" href="/kaizen/nuevo"><Plus className="h-4 w-4" aria-hidden />Nuevo Kaizen</Link> : null}
          </>
        }
      />
      <KaizenCommandCenter generatedAt={new Date().toISOString()} projects={dashboardProjects} />
    </>
  );
}
~~~~~~

### `src/app/(app)/kanban/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { List } from "lucide-react";
import { IdeaCard } from "@/components/idea-card";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { kanbanColumns } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

const columnColors = ["bg-amber-500", "bg-red-500", "bg-emerald-600", "bg-blue-600", "bg-violet-600", "bg-slate-950", "bg-slate-500"];

export default async function KanbanPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideas = await prisma.idea.findMany({
    include: { area: true, supervisor: true, implementationOwner: true, approvals: true },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <>
      <PageHeader
        eyebrow="Mejora Continua · Flujo visual"
        title="Kanban de seguimiento"
        description="Recorre el proceso de izquierda a derecha. Cada columna mantiene un ancho comodo para leer y comparar."
        actions={<Link className="btn btn-secondary" href="/ideas"><List className="h-4 w-4" aria-hidden />Ver tabla</Link>}
      />
      <div className="overflow-x-auto pb-4">
        <div className="grid min-w-max auto-cols-[minmax(286px,320px)] grid-flow-col gap-4">
          {kanbanColumns.map((column, index) => {
            const columnIdeas = ideas.filter((idea) => column.statuses.includes(idea.status));
            return (
              <section className="min-h-[520px] rounded-lg border border-line bg-[#eef1ef]" key={column.title}>
                <div className={`h-1 rounded-t-lg ${columnColors[index]}`} />
                <div className="flex min-h-[74px] items-start justify-between gap-3 border-b border-line bg-white p-4">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-slate-500">Etapa {index + 1}</p>
                    <h2 className="mt-1 max-w-[220px] text-sm font-extrabold leading-5 text-ink">{column.title}</h2>
                  </div>
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-extrabold text-slate-700">{columnIdeas.length}</span>
                </div>
                <div className="space-y-3 p-3">
                  {columnIdeas.length ? columnIdeas.map((idea) => <IdeaCard idea={idea} key={idea.id} />) : (
                    <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/60 p-4 text-center text-xs font-bold text-slate-500">Sin ideas en esta etapa</div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
~~~~~~

### `src/app/(app)/layout.tsx`

~~~~~~tsx
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userModuleAccess } from "@/lib/module-access";
import type { NotificationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const pendingStatuses: NotificationStatus[] = ["PENDING", "ERROR"];
  const notificationWhere =
    user.role === "ADMIN" || user.role === "MEJORA_CONTINUA"
      ? { status: { in: pendingStatuses } }
      : { status: { in: pendingStatuses }, to: { contains: user.email } };
  const [pendingNotifications, moduleAccess] = await Promise.all([
    prisma.notificationOutbox.count({ where: notificationWhere }),
    userModuleAccess(user)
  ]);
  return (
    <AppShell
      moduleAccess={moduleAccess}
      pendingNotifications={pendingNotifications}
      user={{ name: user.name, email: user.email, role: user.role, kaizenAccess: user.kaizenAccess, genbaAccess: user.genbaAccess }}
    >
      {children}
    </AppShell>
  );
}
~~~~~~

### `src/app/(app)/mejora/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Save, UserRound } from "lucide-react";
import { assignImplementationAction, classifyIdeaAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/mini-charts";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import { classificationLabels, priorityLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function MejoraContinuaPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const [ideas, owners] = await Promise.all([
    prisma.idea.findMany({
      where: { status: { in: ["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA", "IMPLEMENTADA", "EN_VALIDACION_FINAL", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"] } },
      include: { area: true, implementationOwner: true, kaizenProject: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR", "ADMIN"] }, active: true }, orderBy: { name: "asc" } })
  ]);
  const toAssign = ideas.filter((idea) => !idea.implementationOwnerId).length;
  const readyToClose = ideas.filter((idea) => ["IMPLEMENTADA", "EN_VALIDACION_FINAL"].includes(idea.status)).length;

  return (
    <>
      <PageHeader eyebrow="Mejora Continua · Acciones requeridas" title="Panel de Mejora Continua" description="Clasifica, prioriza, asigna responsables y prepara el cierre de las ideas aprobadas." />
      <section className="grid gap-3 sm:grid-cols-3">
        <KpiCard detail="Requieren acción de MC" icon={Clock3} label="En bandeja" tone="dark" value={ideas.length} />
        <KpiCard detail="Sin responsable definido" icon={UserRound} label="Por asignar" tone="amber" value={toAssign} />
        <KpiCard detail="Esperan revisión final" icon={CheckCircle2} label="Listas para cierre" tone="green" value={readyToClose} />
      </section>

      <section className="mt-8">
        <SectionHeading count={ideas.length} description="Clasifica las aprobadas o abre una rechazada para justificar y enviarla a revalidación." title="Ideas listas para gestionar" />
        {!ideas.length ? <EmptyState title="Todo está al día" description="Las ideas aprobadas por las áreas de soporte aparecerán aquí." /> : null}
        <div className="grid gap-4">
          {ideas.map((idea) => (
            <article className="surface rounded-lg p-4 sm:p-5" key={idea.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link className="text-lg font-extrabold text-ink hover:text-brand-700" href={`/ideas/${idea.id}`}>{idea.folio}</Link>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-slate-700">{idea.area.code}</span>
                  </div>
                  <p className="mt-2 max-w-4xl text-sm font-semibold leading-5 text-slate-700">{idea.problem}</p>
                </div>
                <StatusPill status={idea.status} />
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status) ? (
                  <div className="alert alert-warning lg:col-span-2">
                    Esta idea requiere una justificación de Mejora Continua. Ábrela en el detalle para revalidarla y elegir las áreas de apoyo.
                  </div>
                ) : (
                  <>
                <details className="details-panel" open={!idea.classification && !["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status)}>
                  <summary>1. Clasificar y priorizar</summary>
                  <form action={classifyIdeaAction} className="grid gap-3 p-4">
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label><span className="label">Clasificación</span><select className="field" name="classification" defaultValue={idea.classification ?? "IDEA_RAPIDA"}>{Object.entries(classificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                      <label><span className="label">Prioridad</span><select className="field" name="priority" defaultValue={idea.priority ?? "MEDIA"}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    </div>
                    <label><span className="label">Comentario de MC</span><textarea className="field min-h-20" name="mcComments" placeholder="Criterio, alcance o siguiente paso" defaultValue={idea.mcComments ?? ""} /></label>
                    <button className="btn btn-secondary w-full sm:w-fit" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar clasificación</button>
                  </form>
                </details>

                <details className="details-panel" open={Boolean(idea.classification && !idea.implementationOwnerId && !["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status))}>
                  <summary>2. Asignar implementación</summary>
                  <form action={assignImplementationAction} className="grid gap-3 p-4">
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <label><span className="label">Responsable</span><select className="field" name="ownerId" defaultValue={idea.implementationOwnerId ?? ""} required><option value="">Seleccionar</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label><span className="label">Fecha compromiso</span><input className="field" defaultValue={idea.dueDate ? idea.dueDate.toISOString().slice(0, 10) : ""} name="dueDate" type="date" required /></label>
                      <label><span className="label">Prioridad</span><select className="field" name="priority" defaultValue={idea.priority ?? "MEDIA"}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input defaultChecked={idea.requiresEvidence} name="requiresEvidence" type="checkbox" />Solicitar evidencia final</label>
                    <button className="btn btn-primary w-full sm:w-fit" type="submit">Asignar implementación</button>
                    {idea.classification === "KAIZEN" ? <p className="text-xs font-bold leading-5 text-amber-800">{idea.kaizenProject ? `El proyecto ${idea.kaizenProject.folio} ya fue transferido a Kaizen. Esta asignación actualizará su líder y fechas.` : "El proyecto Kaizen se generará automáticamente al guardar la clasificación."}</p> : null}
                  </form>
                </details>
                  </>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                <p className="text-xs text-slate-500">Responsable: <span className="font-extrabold text-slate-700">{idea.implementationOwner?.name ?? "Pendiente"}</span></p>
                <Link className="flex items-center gap-1 text-xs font-extrabold text-brand-700 hover:underline" href={`/ideas/${idea.id}`}>Abrir detalle <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
~~~~~~

### `src/app/(app)/notificaciones/page.tsx`

~~~~~~tsx
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { AlertCircle, Bell, Check, Clock3, Mail, RefreshCw } from "lucide-react";
import { markNotificationAction, retryNotificationAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type NotificationsProps = {
  searchParams: Promise<{ vista?: string; pagina?: string }>;
};

const statusMeta = {
  PENDING: { label: "Pendiente", className: "border-amber-200 bg-amber-50 text-amber-900", icon: Clock3 },
  ERROR: { label: "Requiere atención", className: "border-rose-200 bg-rose-50 text-rose-800", icon: AlertCircle },
  SENT: { label: "Enviada", className: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: Check },
  DISMISSED: { label: "Revisada", className: "border-slate-200 bg-slate-100 text-slate-700", icon: Check }
};

const channelLabels = { EMAIL: "Correo", TEAMS: "Teams", LOCAL: "Aviso interno" };

export default async function NotificationsPage({ searchParams }: NotificationsProps) {
  const user = await requireUser();
  const query = await searchParams;
  const canSeeAll = user.role === "ADMIN" || user.role === "MEJORA_CONTINUA";
  const showHistory = query.vista === "todas";
  const currentPage = Math.max(1, Number.parseInt(query.pagina ?? "1", 10) || 1);
  const pageSize = 20;
  const personalWhere: Prisma.NotificationOutboxWhereInput = canSeeAll ? {} : { to: { contains: user.email } };
  const activeWhere: Prisma.NotificationOutboxWhereInput = { ...personalWhere, status: { in: ["PENDING", "ERROR"] } };
  const viewWhere = showHistory ? personalWhere : activeWhere;
  const [notifications, pendingCount, viewCount] = await Promise.all([
    prisma.notificationOutbox.findMany({
      where: viewWhere,
      include: { idea: { include: { area: true } } },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize
    }),
    prisma.notificationOutbox.count({ where: activeWhere }),
    prisma.notificationOutbox.count({ where: viewWhere })
  ]);
  const totalPages = Math.max(1, Math.ceil(viewCount / pageSize));
  const pageBase = showHistory ? "/notificaciones?vista=todas&pagina=" : "/notificaciones?pagina=";

  return (
    <>
      <PageHeader
        eyebrow="Avisos · Actividad del sistema"
        title="Notificaciones"
        description={canSeeAll ? "Avisos generados por el flujo y estado de los envíos de correo." : `Avisos dirigidos a ${user.email}.`}
      />

      <section className="mb-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="overflow-hidden rounded-lg bg-slate-950 p-5 text-white">
          <Bell className="h-6 w-6 text-red-300" aria-hidden />
          <p className="mt-4 text-4xl font-extrabold">{pendingCount}</p>
          <p className="mt-1 text-sm font-bold text-slate-300">{pendingCount === 1 ? "aviso pendiente" : "avisos pendientes"}</p>
        </div>
        <div className="surface flex flex-col justify-center rounded-lg p-4 sm:p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.05em] text-slate-500">Vista actual</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className={`btn ${!showHistory ? "btn-primary" : "btn-secondary"}`} href="/notificaciones">Pendientes</Link>
            <Link className={`btn ${showHistory ? "btn-primary" : "btn-secondary"}`} href="/notificaciones?vista=todas">Todo el historial</Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">Mostrando {viewCount ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, viewCount)} de {viewCount}.</p>
        </div>
      </section>

      {!notifications.length ? <EmptyState title={showHistory ? "Sin notificaciones" : "Todo esta revisado"} description={showHistory ? "No hay actividad registrada para esta cuenta." : "No tienes avisos pendientes en este momento."} /> : null}
      <div className="grid gap-3">
        {notifications.map((notification) => {
          const meta = statusMeta[notification.status];
          const StatusIcon = meta.icon;
          return (
            <article className={`surface min-w-0 overflow-hidden rounded-lg border-l-4 p-4 sm:p-5 ${notification.status === "ERROR" ? "border-l-rose-600" : notification.status === "PENDING" ? "border-l-amber-500" : "border-l-emerald-600"}`} key={notification.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Mail className="h-5 w-5" aria-hidden /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold leading-5 text-ink">{notification.subject}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{channelLabels[notification.channel]} · {notification.to}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${meta.className}`}><StatusIcon className="h-3.5 w-3.5" aria-hidden />{meta.label}</span>
                  <span className="text-[11px] text-slate-500">{notification.createdAt.toLocaleString("es-MX")}</span>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words border-t border-line pt-3 text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{notification.body}</p>
              {notification.errorMessage ? <div className="alert alert-danger mt-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{notification.errorMessage}</span></div> : null}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                {notification.idea ? <Link className="btn btn-secondary" href={`/ideas/${notification.idea.id}`}>Ver {notification.idea.folio}</Link> : null}
                <div className="ml-auto flex flex-wrap gap-2">
                  {canSeeAll && ["PENDING", "ERROR"].includes(notification.status) ? (
                    <form action={retryNotificationAction}><input name="notificationId" type="hidden" value={notification.id} /><button className="btn btn-secondary" type="submit"><RefreshCw className="h-4 w-4" aria-hidden />Reintentar</button></form>
                  ) : null}
                  {notification.status !== "DISMISSED" ? (
                    <form action={markNotificationAction}><input name="notificationId" type="hidden" value={notification.id} /><button className="btn btn-ghost" type="submit"><Check className="h-4 w-4" aria-hidden />Marcar revisada</button></form>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {totalPages > 1 ? (
        <nav aria-label="Paginación de notificaciones" className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          {currentPage > 1 ? <Link className="btn btn-secondary" href={`${pageBase}${currentPage - 1}`}>Anterior</Link> : <span />}
          <span className="text-xs font-extrabold text-slate-600">Página {currentPage} de {totalPages}</span>
          {currentPage < totalPages ? <Link className="btn btn-secondary" href={`${pageBase}${currentPage + 1}`}>Siguiente</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}
~~~~~~

### `src/app/(app)/qr/page.tsx`

~~~~~~tsx
import { Globe2 } from "lucide-react";
import { headers } from "next/headers";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { QrExplorer } from "@/components/qr-explorer";
import { requireUser } from "@/lib/auth";
import { getOrganizationStructure } from "@/lib/organization";
import { baseUrlFromRequest } from "@/lib/url";

export default async function QrPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const structure = await getOrganizationStructure();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const baseUrl = baseUrlFromRequest(host ? `${protocol}://${host}` : null);

  return (
    <>
      <PageHeader eyebrow="Herramientas · Captura publica" title="QR por planta y departamento" description="Selecciona una planta, abre el departamento y revisa sus areas, responsables, correos y codigos de captura." actions={<PrintButton />} />

      <div className="alert alert-info mb-6">
        <Globe2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div><p className="font-extrabold">Enlaces en linea activos</p><p className="mt-0.5 leading-5">Los codigos utilizan <span className="font-bold">{baseUrl}</span>; no dependen de esta computadora.</p></div>
      </div>

      <QrExplorer baseUrl={baseUrl} structure={structure} />
    </>
  );
}
~~~~~~

### `src/app/(app)/reportes/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { AlertTriangle, Bell, Download, FileSpreadsheet, Play } from "lucide-react";
import { runRemindersAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const [ideaCount, notificationCount, overdueCount] = await Promise.all([
    prisma.idea.count(),
    prisma.notificationOutbox.count({ where: { status: { in: ["PENDING", "ERROR"] } } }),
    prisma.idea.count({ where: { status: "VENCIDA" } })
  ]);

  const tools = [
    { title: "Base completa de ideas", value: ideaCount, detail: "Incluye validaciones, responsables, fechas, ProbocaCoins y comentarios.", icon: FileSpreadsheet, color: "bg-emerald-50 text-emerald-700", action: <Link className="btn btn-primary w-full" href="/api/export"><Download className="h-4 w-4" aria-hidden />Descargar Excel</Link> },
    { title: "Notificaciones pendientes", value: notificationCount, detail: "Mensajes pendientes o que requieren un nuevo intento.", icon: Bell, color: "bg-blue-50 text-blue-700", action: <Link className="btn btn-secondary w-full" href="/notificaciones">Abrir notificaciones</Link> },
    { title: "Compromisos vencidos", value: overdueCount, detail: "Ejecuta la revisión para actualizar semáforos y generar avisos.", icon: AlertTriangle, color: "bg-rose-50 text-rose-700", action: <form action={runRemindersAction}><button className="btn btn-secondary w-full" type="submit"><Play className="h-4 w-4" aria-hidden />Revisar vencimientos</button></form> }
  ];

  return (
    <>
      <PageHeader eyebrow="Herramientas · Información y control" title="Reportes y automatizaciones" description="Descarga la información del programa y ejecuta tareas de seguimiento." />
      <section className="grid gap-4 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <article className="surface flex min-h-[270px] flex-col rounded-lg p-5" key={tool.title}>
              <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${tool.color}`}><Icon className="h-5 w-5" aria-hidden /></span>
              <h2 className="mt-5 text-base font-extrabold text-ink">{tool.title}</h2>
              <p className="mt-2 text-4xl font-extrabold text-ink">{tool.value}</p>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{tool.detail}</p>
              <div className="mt-5">{tool.action}</div>
            </article>
          );
        })}
      </section>
    </>
  );
}
~~~~~~

### `src/app/(app)/supervisor/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { CalendarDays, Check, CheckCircle2, Clock3, Eye, MessageSquareMore, UserRound, X } from "lucide-react";
import { supervisorDecisionAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/mini-charts";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { approvalStatusLabels, approvalTypeLabels, ideaCategoryLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

function SupportRequestFields({ idea }: { idea: { impactsQuality: boolean; impactsSafety: boolean; requiresMaintenance: boolean } }) {
  return (
    <fieldset className="rounded-lg border border-line bg-panel p-3">
      <legend className="px-1 text-xs font-extrabold text-ink">¿Necesitas apoyo para validar o realizar esta idea?</legend>
      <p className="mb-3 mt-1 text-xs leading-5 text-slate-500">Marca las áreas que deban revisarla. Al aprobar, les aparecerá automáticamente en su bandeja.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          ["impactsQuality", "Calidad / Inocuidad", idea.impactsQuality, "accent-red-600"],
          ["impactsSafety", "Seguridad", idea.impactsSafety, "accent-slate-700"],
          ["requiresMaintenance", "Mantenimiento", idea.requiresMaintenance, "accent-blue-600"]
        ].map(([name, label, selected, accent]) => (
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-extrabold text-slate-700" key={String(name)}>
            <input className={String(accent)} defaultChecked={Boolean(selected)} name={String(name)} type="checkbox" />
            {String(label)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default async function SupervisorPage() {
  const user = await requireUser(["ADMIN", "SUPERVISOR"]);
  const supervisorWhere = user.role === "SUPERVISOR" ? { supervisorId: user.id } : {};
  const [ideas, approvedIdeas] = await Promise.all([
    prisma.idea.findMany({
      where: { status: { in: ["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"] }, ...supervisorWhere },
      include: { area: true, supervisor: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.idea.findMany({
      where: { ...supervisorWhere, approvals: { some: { type: "SUPERVISOR", status: "APPROVED" } } },
      include: { area: true, implementationOwner: true, approvals: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 40
    })
  ]);
  const ideasInMotion = approvedIdeas.filter((idea) => !["CERRADA", "CANCELADA"].includes(idea.status)).length;
  const closedIdeas = approvedIdeas.filter((idea) => idea.status === "CERRADA").length;

  return (
    <>
      <PageHeader
        eyebrow="Supervisor · Revisión de área"
        title="Bandeja del supervisor"
        description="Primero atiende las ideas pendientes; abajo puedes consultar lo que ocurrio con las ideas aprobadas."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <KpiCard detail="Esperan tu decision" icon={Clock3} label="Pendientes" tone="amber" value={ideas.length} />
        <KpiCard detail="Continuan en el proceso" icon={CheckCircle2} label="En seguimiento" tone="green" value={ideasInMotion} />
        <KpiCard detail="Con resultado final" icon={Check} label="Cerradas" tone="dark" value={closedIdeas} />
      </section>

      <section className="mt-8">
        <SectionHeading count={ideas.length} description="Aprueba, solicita información o rechaza cada propuesta." title="Pendientes de decisión" tone="green" />
        {!ideas.length ? <EmptyState title="Todo está al día" description="Las nuevas ideas de tus áreas aparecerán aquí automáticamente." /> : null}
        <div className="grid gap-4">
          {ideas.map((idea) => (
            <article className="surface overflow-hidden rounded-lg" key={idea.id}>
              <div className="h-1 bg-emerald-600" />
              <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link className="text-lg font-extrabold text-emerald-800 hover:underline" href={`/ideas/${idea.id}`}>{idea.folio}</Link>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-extrabold text-emerald-800">Área {idea.area.code}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-slate-700">{ideaCategoryLabels[idea.category]}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500">{idea.collaboratorName} · {idea.shift} · {idea.createdAt.toLocaleDateString("es-MX")}</p>
                  </div>
                  <StatusPill status={idea.status} />
                </div>

                <div className="mt-5 grid gap-4 border-y border-line py-4 lg:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Problema observado</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{idea.problem}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Propuesta</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{idea.proposal}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Beneficio esperado</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{idea.expectedBenefit}</p>
                  </div>
                </div>

                <form action={supervisorDecisionAction} className="mt-4 grid gap-3">
                  <input name="ideaId" type="hidden" value={idea.id} />
                  <SupportRequestFields idea={idea} />
                  <label>
                    <span className="label">Comentario de la decision</span>
                    <textarea className="field min-h-20" name="comments" placeholder="Obligatorio al rechazar o solicitar información" />
                  </label>
                  <div className="grid gap-2 sm:flex sm:flex-wrap">
                    <button className="btn btn-success" name="decision" type="submit" value="APROBAR">
                      <Check className="h-4 w-4" aria-hidden /> Aprobar idea
                    </button>
                    <button className="btn btn-secondary" name="decision" type="submit" value="SOLICITAR_INFORMACION">
                      <MessageSquareMore className="h-4 w-4" aria-hidden /> Solicitar información
                    </button>
                    <button className="btn btn-danger sm:ml-auto" name="decision" type="submit" value="RECHAZAR">
                      <X className="h-4 w-4" aria-hidden /> Rechazar
                    </button>
                  </div>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading count={approvedIdeas.length} description="Consulta responsable, fecha, validaciones y resultado final." title="Ideas que aprobaste" />
        {!approvedIdeas.length ? <EmptyState title="Aun no hay ideas aprobadas" description="Cuando apruebes una idea, su seguimiento permanecera visible aqui." /> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {approvedIdeas.map((idea) => {
            const supportApprovals = idea.approvals.filter((approval) => ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"].includes(approval.type));
            return (
              <article className="surface rounded-lg p-4 sm:p-5" key={idea.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link className="text-base font-extrabold text-ink hover:text-brand-700" href={`/ideas/${idea.id}`}>{idea.folio}</Link>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">{idea.area.code} · {idea.collaboratorName}</p>
                  </div>
                  <StatusPill status={idea.status} />
                </div>
                <p className="mt-4 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{idea.problem}</p>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="border-l-2 border-slate-300 pl-3">
                    <dt className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-500"><UserRound className="h-3.5 w-3.5" aria-hidden />Responsable</dt>
                    <dd className="mt-1 text-sm font-extrabold text-ink">{idea.implementationOwner?.name ?? "Pendiente de asignar"}</dd>
                  </div>
                  <div className="border-l-2 border-slate-300 pl-3">
                    <dt className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-500"><CalendarDays className="h-3.5 w-3.5" aria-hidden />Compromiso</dt>
                    <dd className="mt-1 text-sm font-extrabold text-ink">{idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-[10px] font-extrabold uppercase text-slate-500">Validaciones</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {supportApprovals.length ? supportApprovals.map((approval) => (
                      <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-bold text-slate-700" key={approval.id}>
                        {approvalTypeLabels[approval.type]}: {approvalStatusLabels[approval.status]}
                      </span>
                    )) : <span className="text-xs text-slate-500">No requirió validaciones adicionales.</span>}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <p className="text-xs font-extrabold text-slate-600">{idea.pointsAssigned} ProbocaCoins</p>
                  <Link className="btn btn-secondary" href={`/ideas/${idea.id}`}>
                    <Eye className="h-4 w-4" aria-hidden /> Ver seguimiento
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
~~~~~~

### `src/app/(app)/validaciones/calidad/page.tsx`

~~~~~~tsx
import { ValidationInbox } from "@/components/validation-inbox";

export default function CalidadPage() {
  return <ValidationInbox roles={["CALIDAD"]} title="Validación Calidad/Inocuidad" type="CALIDAD" />;
}
~~~~~~

### `src/app/(app)/validaciones/mantenimiento/page.tsx`

~~~~~~tsx
import { ValidationInbox } from "@/components/validation-inbox";

export default function MantenimientoPage() {
  return <ValidationInbox roles={["MANTENIMIENTO"]} title="Validación Mantenimiento" type="MANTENIMIENTO" />;
}
~~~~~~

### `src/app/(app)/validaciones/seguridad/page.tsx`

~~~~~~tsx
import { ValidationInbox } from "@/components/validation-inbox";

export default function SeguridadPage() {
  return <ValidationInbox roles={["SEGURIDAD"]} title="Validación Seguridad" type="SEGURIDAD" />;
}
~~~~~~

### `src/app/(app)/vencidas/page.tsx`

~~~~~~tsx
import Link from "next/link";
import { AlertTriangle, CalendarDays, Play, UserRound } from "lucide-react";
import { runRemindersAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OverduePage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideas = await prisma.idea.findMany({
    where: { OR: [{ status: "VENCIDA" }, { dueDate: { lt: new Date() }, status: { notIn: ["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"] } }] },
    include: { area: true, supervisor: true, implementationOwner: true },
    orderBy: { dueDate: "asc" }
  });

  return (
    <>
      <PageHeader
        eyebrow="Mejora Continua · Semaforo de compromisos"
        title="Compromisos vencidos"
        description="Acciones cuya fecha compromiso ya terminó y todavía no tienen cierre."
        actions={<form action={runRemindersAction}><button className="btn btn-primary" type="submit"><Play className="h-4 w-4" aria-hidden />Actualizar y notificar</button></form>}
      />
      <div className="alert alert-danger mb-6"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span><strong>{ideas.length} {ideas.length === 1 ? "compromiso requiere" : "compromisos requieren"} atención.</strong> Abre el detalle para registrar avance o ajustar la asignación.</span></div>
      <SectionHeading count={ideas.length} title="Lista de atención" tone="red" />
      {!ideas.length ? <EmptyState title="Sin vencimientos" description="Todos los compromisos activos se encuentran dentro de fecha." /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {ideas.map((idea) => {
          const daysLate = idea.dueDate ? Math.max(1, Math.ceil((Date.now() - idea.dueDate.getTime()) / 86400000)) : 0;
          return (
            <article className="surface overflow-hidden rounded-lg border-rose-200" key={idea.id}>
              <div className="h-1 bg-rose-600" />
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><Link className="text-lg font-extrabold text-rose-800 hover:underline" href={`/ideas/${idea.id}`}>{idea.folio}</Link><p className="mt-0.5 text-xs font-bold text-slate-500">Área {idea.area.code}</p></div>
                  <StatusPill status={idea.status} />
                </div>
                <p className="mt-4 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{idea.problem}</p>
                <dl className="mt-4 grid gap-3 border-y border-line py-3 sm:grid-cols-2">
                  <div className="flex items-start gap-2"><UserRound className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden /><div><dt className="text-[10px] font-extrabold uppercase text-slate-500">Responsable</dt><dd className="mt-0.5 text-xs font-extrabold text-ink">{idea.implementationOwner?.name ?? "Sin asignar"}</dd></div></div>
                  <div className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 text-rose-600" aria-hidden /><div><dt className="text-[10px] font-extrabold uppercase text-slate-500">Vencimiento</dt><dd className="mt-0.5 text-xs font-extrabold text-rose-700">{idea.dueDate?.toLocaleDateString("es-MX") ?? "Sin fecha"} · {daysLate} dias</dd></div></div>
                </dl>
                <Link className="btn btn-secondary mt-4 w-full" href={`/ideas/${idea.id}`}>Abrir seguimiento</Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
~~~~~~

### `src/app/actions.ts`

~~~~~~typescript
"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma, type ApprovalType, type Classification, type GenbaStatus, type IdeaCategory, type KaizenStatus, type Priority, type Role, type WorkItemStatus } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { clearSession, requireUser, setSession } from "@/lib/auth";
import { approvalTypeForRole, genbaDepartments, impactOptions, nextValidationStatus, requiredApprovalTypes, roleHomePath } from "@/lib/domain";
import { saveUpload } from "@/lib/files";
import { createKaizenFromIdea } from "@/lib/kaizen-from-idea";
import { managerialFactorForRule } from "@/lib/managerial-evaluation";
import { userModuleAccess } from "@/lib/module-access";
import { ideaMailBody, notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/url";
import { approveSupervisor, createValidationApprovals, markOverdueIdeas, nextFolio, notifyIdeaClosed, updateStatusAfterValidations } from "@/lib/workflow";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const checked = (formData: FormData, key: string) => ["on", "true", "1", "yes", "si"].includes(text(formData, key).toLowerCase());
const numberOrNull = (formData: FormData, key: string) => {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const dateOrNull = (formData: FormData, key: string) => {
  const value = text(formData, key);
  return value ? new Date(`${value}T12:00:00`) : null;
};
const isImprovementManager = (role: Role) => role === "ADMIN" || role === "MEJORA_CONTINUA";

const ideaSchema = z.object({
  collaboratorName: z.string().min(2),
  areaCode: z.string().min(1),
  shift: z.string().min(1),
  problem: z.string().min(3),
  proposal: z.string().min(3),
  expectedBenefit: z.string().min(2),
  category: z.enum(["A", "B", "C"])
});

const userRoles: Role[] = ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO"];
const emailSchema = z.string().trim().toLowerCase().email();

async function userWithNormalizedEmail(email: string) {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  return users.find((user) => user.email.trim().toLowerCase() === email) ?? null;
}

async function notifyModuleAssignment(input: { to?: string | null; subject: string; lines: string[]; path: string }) {
  await notify({
    to: input.to ?? "",
    subject: input.subject,
    body: [...input.lines, `Liga directa: ${appBaseUrl()}${input.path}`].join("\n")
  });
}

async function createIdeaWithUniqueFolio(data: Omit<Prisma.IdeaUncheckedCreateInput, "folio">) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.idea.create({ data: { ...data, folio: await nextFolio() } });
    } catch (error) {
      const duplicateFolio = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!duplicateFolio || attempt === 3) throw error;
    }
  }
  throw new Error("No fue posible generar el folio de la idea.");
}

async function ensureKaizenTransfer(input: {
  ideaId: string;
  actorId: string;
  leaderId?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  updateExisting?: boolean;
}) {
  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: input.ideaId },
    select: {
      classification: true,
      implementationOwnerId: true,
      createdAt: true,
      dueDate: true
    }
  });
  if (idea.classification !== "KAIZEN") return null;

  const startDate = input.startDate ?? idea.createdAt;
  const endDate = input.endDate ?? idea.dueDate ?? new Date(startDate.getTime() + 90 * 86_400_000);
  return createKaizenFromIdea({
    ideaId: input.ideaId,
    leaderId: input.leaderId ?? idea.implementationOwnerId ?? input.actorId,
    startDate,
    endDate,
    createdById: input.actorId,
    updateExisting: input.updateExisting
  });
}

async function refreshKaizenProject(projectId: string) {
  const project = await prisma.kaizenProject.findUniqueOrThrow({
    where: { id: projectId },
    include: { activities: true }
  });
  if (project.status === "CANCELADO") return;
  const relevant = project.activities.filter((activity) => activity.status !== "COMBINADA");
  const complete = relevant.length > 0 && relevant.every((activity) => activity.status === "COMPLETADA" || activity.status === "CANCELADA");
  if (complete) {
    await prisma.kaizenProject.update({ where: { id: projectId }, data: { status: "COMPLETADO", closedAt: new Date() } });
    if (project.sourceIdeaId) {
      await prisma.idea.update({ where: { id: project.sourceIdeaId }, data: { status: "IMPLEMENTADA", implementedAt: new Date() } });
    }
  } else if (project.status === "COMPLETADO") {
    await prisma.kaizenProject.update({ where: { id: projectId }, data: { status: "EN_CURSO", closedAt: null } });
  }
}

async function refreshGenbaWalk(walkId: string) {
  const walk = await prisma.genbaWalk.findUniqueOrThrow({ where: { id: walkId }, include: { activities: true } });
  if (walk.status === "CANCELADO") return;
  const relevant = walk.activities.filter((activity) => activity.status !== "COMBINADA");
  const complete = relevant.length > 0 && relevant.every((activity) => activity.status === "COMPLETADA" || activity.status === "CANCELADA");
  await prisma.genbaWalk.update({
    where: { id: walkId },
    data: complete ? { status: "CERRADO", closedAt: new Date() } : { status: "ABIERTO", closedAt: null }
  });
}

export async function loginAction(formData: FormData) {
  const email = text(formData, "email");
  const password = text(formData, "password");
  const destination = text(formData, "destination");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
    redirect("/login?error=credenciales");
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    redirect("/login?error=credenciales");
  }

  await setSession(user);
  const access = await userModuleAccess(user);
  if (destination === "kaizen" && access.kaizen) redirect("/kaizen");
  if (destination === "genba" && access.genba) redirect("/genba");
  redirect(roleHomePath(user.role));
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function submitIdeaAction(formData: FormData) {
  const areaCode = text(formData, "areaCode") || "P1";
  const parsed = ideaSchema.safeParse({
    collaboratorName: text(formData, "collaboratorName"),
    areaCode,
    shift: text(formData, "shift"),
    problem: text(formData, "problem"),
    proposal: text(formData, "proposal"),
    expectedBenefit: text(formData, "expectedBenefit"),
    category: text(formData, "category")
  });

  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => String(issue.path[0])).filter(Boolean);
    const category = text(formData, "category");
    redirect(`/captura/${areaCode}?error=datos&campos=${encodeURIComponent([...new Set(fields)].join(","))}&categoria=${encodeURIComponent(category)}`);
  }

  const area = await prisma.area.findFirst({
    where: { code: parsed.data.areaCode, active: true },
    include: { supervisor: true }
  });
  if (!area) redirect(`/captura/${areaCode}?error=area`);

  const selectedImpacts = formData
    .getAll("impactTypes")
    .map(String)
    .filter((impact) => impactOptions.includes(impact));
  const selectedSupport = {
    impactsQuality: parsed.data.category === "A" ? false : checked(formData, "impactsQuality"),
    impactsSafety: parsed.data.category === "A" ? false : checked(formData, "impactsSafety"),
    requiresMaintenance: parsed.data.category === "A" ? false : checked(formData, "requiresMaintenance")
  };
  const externalSupportDetails = text(formData, "externalSupportDetails");
  if (parsed.data.category === "C" && externalSupportDetails.length < 3) {
    redirect(`/captura/${areaCode}?error=datos&campos=externalSupportDetails&categoria=C`);
  }

  const idea = await createIdeaWithUniqueFolio({
      collaboratorName: parsed.data.collaboratorName,
      collaboratorEmail: text(formData, "collaboratorEmail") || null,
      employeeNumber: text(formData, "employeeNumber") || null,
      areaId: area.id,
      shift: parsed.data.shift,
      problem: parsed.data.problem,
      proposal: parsed.data.proposal,
      expectedBenefit: parsed.data.expectedBenefit,
      impactTypes: JSON.stringify(selectedImpacts),
      category: parsed.data.category,
      ...selectedSupport,
      requiresExternalSupport: parsed.data.category === "C",
      externalSupportDetails: parsed.data.category === "C" ? externalSupportDetails : null,
      status: "EN_REVISION_SUPERVISOR",
      supervisorId: area.supervisorId
  });

  await prisma.approval.create({
    data: {
      ideaId: idea.id,
      type: "SUPERVISOR",
      assignedToId: area.supervisorId,
      status: "PENDING"
    }
  });

  const beforeEvidence = await saveUpload(formData.get("beforeEvidence") as File | null, `${idea.folio}-before`);
  if (beforeEvidence) {
    await prisma.attachment.create({
      data: {
        ideaId: idea.id,
        type: "BEFORE",
        filename: beforeEvidence.filename,
        path: beforeEvidence.path,
        uploadedBy: idea.collaboratorName
      }
    });
  }

  await auditLog({
    entity: "Idea",
    entityId: idea.id,
    action: "IDEA_CREATED",
    details: { area: area.code, supervisorId: area.supervisorId }
  });

  await notify({
    ideaId: idea.id,
    to: area.supervisor?.email ?? "",
    subject: `Nueva idea de mejora pendiente de revision - Folio ${idea.folio} - Area ${area.code}`,
    body: ideaMailBody({
      folio: idea.folio,
      area: area.code,
      problem: idea.problem,
      proposal: idea.proposal,
      action: "Revision de supervisor",
      ideaId: idea.id
    }),
    channels: ["EMAIL", "TEAMS"]
  });

  revalidatePath("/");
  redirect(`/captura/gracias?folio=${encodeURIComponent(idea.folio)}&area=${encodeURIComponent(area.code)}`);
}

export async function supervisorDecisionAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "SUPERVISOR"]);
  const ideaId = text(formData, "ideaId");
  const decision = text(formData, "decision");
  const comments = text(formData, "comments");

  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { area: true, supervisor: true }
  });
  if (user.role === "SUPERVISOR" && idea.supervisorId !== user.id) redirect("/supervisor");

  if (decision === "RECHAZAR") {
    if (!comments) redirect(`/ideas/${ideaId}?error=justificacion`);
    await prisma.approval.upsert({
      where: { ideaId_type: { ideaId, type: "SUPERVISOR" } },
      update: { status: "REJECTED", decision: "RECHAZAR", comments, decidedAt: new Date(), assignedToId: user.id },
      create: { ideaId, type: "SUPERVISOR", status: "REJECTED", decision: "RECHAZAR", comments, decidedAt: new Date(), assignedToId: user.id }
    });
    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: "RECHAZADA_SUPERVISOR", rejectionReason: comments }
    });
    await auditLog({ entity: "Idea", entityId: ideaId, action: "SUPERVISOR_REJECTED", userId: user.id, details: { comments } });
    await notify({
      ideaId,
      to: idea.collaboratorEmail ?? "",
      subject: `Idea rechazada por supervisor - Folio ${idea.folio} - Area ${idea.area.code}`,
      body: ideaMailBody({
        folio: idea.folio,
        area: idea.area.code,
        problem: idea.problem,
        proposal: idea.proposal,
        action: `Rechazada: ${comments}`,
        ideaId
      })
    });
  }

  if (decision === "SOLICITAR_INFORMACION") {
    if (!comments) redirect(`/ideas/${ideaId}?error=informacion`);
    await prisma.approval.upsert({
      where: { ideaId_type: { ideaId, type: "SUPERVISOR" } },
      update: { status: "MORE_INFO", decision: "SOLICITAR_INFORMACION", comments, decidedAt: new Date(), assignedToId: user.id },
      create: {
        ideaId,
        type: "SUPERVISOR",
        status: "MORE_INFO",
        decision: "SOLICITAR_INFORMACION",
        comments,
        decidedAt: new Date(),
        assignedToId: user.id
      }
    });
    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: "SOLICITUD_INFORMACION", moreInfoRequest: comments }
    });
    await auditLog({ entity: "Idea", entityId: ideaId, action: "SUPERVISOR_MORE_INFO", userId: user.id, details: { comments } });
    await notify({
      ideaId,
      to: idea.collaboratorEmail ?? "",
      subject: `Solicitud de mas informacion - Folio ${idea.folio} - Area ${idea.area.code}`,
      body: ideaMailBody({
        folio: idea.folio,
        area: idea.area.code,
        problem: idea.problem,
        proposal: idea.proposal,
        action: comments,
        ideaId
      })
    });
  }

  if (decision === "APROBAR") {
    const support = {
      impactsQuality: checked(formData, "impactsQuality"),
      impactsSafety: checked(formData, "impactsSafety"),
      requiresMaintenance: checked(formData, "requiresMaintenance")
    };
    const category: IdeaCategory = idea.category === "C" ? "C" : Object.values(support).some(Boolean) ? "B" : "A";
    await prisma.idea.update({ where: { id: ideaId }, data: { ...support, category } });
    await approveSupervisor(ideaId, user.id);
  }

  revalidatePath("/");
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function validationDecisionAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO"]);
  const ideaId = text(formData, "ideaId");
  const decision = text(formData, "decision");
  const comments = text(formData, "comments");
  const explicitType = text(formData, "type") as ApprovalType;
  const type = user.role === "ADMIN" && explicitType ? explicitType : approvalTypeForRole(user.role);
  if (!type || !requiredApprovalTypes({ impactsQuality: true, impactsSafety: true, requiresMaintenance: true }).includes(type)) redirect("/dashboard");
  if ((decision === "RECHAZAR" || decision === "SOLICITAR_INFORMACION") && !comments) redirect(`/ideas/${ideaId}?error=justificacion`);

  const idea = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, include: { area: true, supervisor: true } });
  const status = decision === "APROBAR" ? "APPROVED" : decision === "RECHAZAR" ? "REJECTED" : "MORE_INFO";
  await prisma.approval.upsert({
    where: { ideaId_type: { ideaId, type } },
    update: {
      assignedToId: user.id,
      status,
      decision: decision === "APROBAR" ? "APROBAR" : decision === "RECHAZAR" ? "RECHAZAR" : "SOLICITAR_INFORMACION",
      comments: comments || null,
      decidedAt: new Date()
    },
    create: {
      ideaId,
      type,
      assignedToId: user.id,
      status,
      decision: decision === "APROBAR" ? "APROBAR" : decision === "RECHAZAR" ? "RECHAZAR" : "SOLICITAR_INFORMACION",
      comments: comments || null,
      decidedAt: new Date()
    }
  });

  if (decision === "RECHAZAR") {
    await prisma.idea.update({ where: { id: ideaId }, data: { status: "RECHAZADA_VALIDACION", rejectionReason: comments } });
  } else if (decision === "SOLICITAR_INFORMACION") {
    await prisma.idea.update({ where: { id: ideaId }, data: { status: "SOLICITUD_INFORMACION", moreInfoRequest: comments } });
  } else {
    await updateStatusAfterValidations(ideaId);
  }

  await auditLog({ entity: "Idea", entityId: ideaId, action: `${type}_${decision}`, userId: user.id, details: { comments } });
  const recipients = [idea.supervisor?.email].filter((value): value is string => Boolean(value));
  const mcUsers = await prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "ADMIN"] }, active: true } });
  recipients.push(...mcUsers.map((mcUser) => mcUser.email));
  for (const to of new Set(recipients)) {
    await notify({
      ideaId,
      to,
      subject: `Validacion ${decision.toLowerCase()} - Folio ${idea.folio} - Area ${idea.area.code}`,
      body: ideaMailBody({
        folio: idea.folio,
        area: idea.area.code,
        problem: idea.problem,
        proposal: idea.proposal,
        action: `${type}: ${comments || decision}`,
        ideaId
      })
    });
  }

  revalidatePath("/");
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function reopenRejectedIdeaAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const justification = text(formData, "justification");
  if (!justification) redirect(`/ideas/${ideaId}?error=justificacion`);

  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { area: true, supervisor: true }
  });
  if (!["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status)) redirect(`/ideas/${ideaId}`);

  const support = {
    impactsQuality: checked(formData, "impactsQuality"),
    impactsSafety: checked(formData, "impactsSafety"),
    requiresMaintenance: checked(formData, "requiresMaintenance")
  };
  const category: IdeaCategory = idea.category === "C" ? "C" : Object.values(support).some(Boolean) ? "B" : "A";

  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      ...support,
      category,
      rejectionReason: null,
      moreInfoRequest: null,
      mcComments: justification
    }
  });
  await prisma.approval.upsert({
    where: { ideaId_type: { ideaId, type: "SUPERVISOR" } },
    update: { status: "APPROVED", decision: "APROBAR", comments: `Revalidada por Mejora Continua: ${justification}`, decidedAt: new Date() },
    create: { ideaId, type: "SUPERVISOR", assignedToId: idea.supervisorId, status: "APPROVED", decision: "APROBAR", comments: `Revalidada por Mejora Continua: ${justification}`, decidedAt: new Date() }
  });

  const required = await createValidationApprovals(ideaId);
  const status = required.length ? nextValidationStatus(required) : "APROBADA_PARA_IMPLEMENTAR";
  await prisma.idea.update({ where: { id: ideaId }, data: { status } });
  await prisma.comment.create({ data: { ideaId, userId: user.id, comment: `Mejora Continua reabrió la idea. Justificación: ${justification}` } });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "MC_REOPENED_REJECTED_IDEA", userId: user.id, details: { justification, support, status } });

  const recipients = new Set<string>();
  if (idea.supervisor?.email) recipients.add(idea.supervisor.email);
  if (idea.collaboratorEmail) recipients.add(idea.collaboratorEmail);
  for (const to of recipients) {
    await notify({
      ideaId,
      to,
      subject: `Idea reabierta por Mejora Continua - Folio ${idea.folio} - Area ${idea.area.code}`,
      body: ideaMailBody({ folio: idea.folio, area: idea.area.code, problem: idea.problem, proposal: idea.proposal, action: `Revalidada: ${justification}`, ideaId })
    });
  }

  revalidatePath("/mejora");
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function classifyIdeaAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const classification = text(formData, "classification") as Classification;
  const priority = text(formData, "priority") as Priority;
  const mcComments = text(formData, "mcComments");
  const currentIdea = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, select: { status: true } });
  if (["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(currentIdea.status)) redirect(`/ideas/${ideaId}?error=justificacion`);

  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      classification,
      priority,
      mcComments: mcComments || null,
      status: "CLASIFICACION_MEJORA_CONTINUA"
    }
  });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "MC_CLASSIFIED", userId: user.id, details: { classification, priority } });
  if (classification === "KAIZEN") {
    const startDate = new Date();
    const kaizenProject = await ensureKaizenTransfer({
      ideaId,
      actorId: user.id,
      leaderId: user.id,
      startDate,
      endDate: new Date(startDate.getTime() + 90 * 86_400_000),
      updateExisting: false
    });
    if (!kaizenProject) throw new Error("La idea no conservó la clasificación Kaizen.");
    await auditLog({
      entity: "KaizenProject",
      entityId: kaizenProject.id,
      action: "AUTO_CREATED_FROM_CLASSIFICATION",
      userId: user.id,
      details: { ideaId, folio: kaizenProject.folio }
    });
    revalidatePath("/kaizen");
  }
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function assignImplementationAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const ownerId = text(formData, "ownerId");
  const dueDateText = text(formData, "dueDate");
  const priority = text(formData, "priority") as Priority;
  if (!ownerId || !dueDateText) redirect(`/ideas/${ideaId}?error=asignacion`);
  const currentIdea = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, select: { status: true, classification: true } });
  if (["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(currentIdea.status)) redirect(`/ideas/${ideaId}?error=justificacion`);

  const idea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      implementationOwnerId: ownerId,
      dueDate: new Date(`${dueDateText}T12:00:00`),
      priority,
      requiresEvidence: checked(formData, "requiresEvidence"),
      status: "EN_IMPLEMENTACION"
    },
    include: { area: true, implementationOwner: true }
  });

  await auditLog({ entity: "Idea", entityId: ideaId, action: "IMPLEMENTATION_ASSIGNED", userId: user.id, details: { ownerId, dueDateText } });
  await notify({
    ideaId,
    to: idea.implementationOwner?.email ?? "",
    subject: `Responsable asignado - Folio ${idea.folio} - Area ${idea.area.code}`,
    body: ideaMailBody({
      folio: idea.folio,
      area: idea.area.code,
      problem: idea.problem,
      proposal: idea.proposal,
      action: `Implementar antes de ${dueDateText}`,
      ideaId
    })
  });

  let kaizenProject: Awaited<ReturnType<typeof createKaizenFromIdea>> | null = null;
  if (currentIdea.classification === "KAIZEN") {
    kaizenProject = await ensureKaizenTransfer({
      ideaId,
      actorId: user.id,
      leaderId: ownerId,
      startDate: new Date(),
      endDate: new Date(`${dueDateText}T12:00:00`),
      updateExisting: true
    });
    if (!kaizenProject) throw new Error("La idea no conservó la clasificación Kaizen.");
    await auditLog({ entity: "KaizenProject", entityId: kaizenProject.id, action: "SYNCED_FROM_IDEA_ASSIGNMENT", userId: user.id, details: { ideaId, folio: kaizenProject.folio, leaderId: ownerId, dueDateText } });
    await notifyModuleAssignment({
      to: idea.implementationOwner?.email,
      subject: `Nuevo proyecto Kaizen ${kaizenProject.folio}`,
      lines: [`Proyecto: ${kaizenProject.title}`, `Origen: idea ${idea.folio}`, "Acción requerida: cargar Project Charter y plan de actividades."],
      path: `/kaizen/${kaizenProject.id}`
    });
  }

  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/kaizen");
  if (kaizenProject) redirect(`/kaizen/${kaizenProject.id}`);
  redirect(`/ideas/${ideaId}`);
}

export async function implementationUpdateAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR"]);
  const ideaId = text(formData, "ideaId");
  const comments = text(formData, "comments");
  const markImplemented = checked(formData, "markImplemented");

  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { area: true, supervisor: true, implementationOwner: true }
  });
  if (user.role === "SUPERVISOR" && idea.supervisorId !== user.id) redirect(`/ideas/${ideaId}`);

  const afterEvidence = await saveUpload(formData.get("afterEvidence") as File | null, `${idea.folio}-after`);
  if (afterEvidence) {
    await prisma.attachment.create({
      data: {
        ideaId,
        type: "AFTER",
        filename: afterEvidence.filename,
        path: afterEvidence.path,
        uploadedBy: user.name
      }
    });
  }

  if (comments) {
    await prisma.comment.create({ data: { ideaId, userId: user.id, comment: comments } });
  }

  const updatedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: markImplemented ? "IMPLEMENTADA" : "EN_IMPLEMENTACION",
      implementedAt: markImplemented ? new Date() : idea.implementedAt
    },
    include: { area: true, supervisor: true, implementationOwner: true }
  });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "IMPLEMENTATION_UPDATED", userId: user.id, details: { markImplemented, hasEvidence: Boolean(afterEvidence) } });

  const kaizenProject = await ensureKaizenTransfer({
    ideaId,
    actorId: user.id,
    leaderId: updatedIdea.implementationOwnerId,
    startDate: updatedIdea.createdAt,
    endDate: updatedIdea.dueDate,
    updateExisting: false
  });
  if (kaizenProject) {
    await auditLog({
      entity: "KaizenProject",
      entityId: kaizenProject.id,
      action: markImplemented ? "TRANSFER_VERIFIED_AT_IMPLEMENTATION" : "TRANSFER_VERIFIED_AT_PROGRESS",
      userId: user.id,
      details: { ideaId, folio: kaizenProject.folio }
    });
  }

  const recipients = new Set<string>();
  if (updatedIdea.supervisor?.email) recipients.add(updatedIdea.supervisor.email);
  if (updatedIdea.implementationOwner?.email) recipients.add(updatedIdea.implementationOwner.email);
  const mcUsers = await prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "ADMIN"] }, active: true } });
  mcUsers.forEach((mcUser) => recipients.add(mcUser.email));
  for (const to of recipients) {
    await notify({
      ideaId,
      to,
      subject: `${markImplemented ? "Idea marcada como implementada" : "Avance de implementacion actualizado"} - Folio ${updatedIdea.folio} - Area ${updatedIdea.area.code}`,
      body: ideaMailBody({
        folio: updatedIdea.folio,
        area: updatedIdea.area.code,
        problem: updatedIdea.problem,
        proposal: updatedIdea.proposal,
        action: `${user.name} actualizo el avance.${comments ? ` Comentario: ${comments}` : ""}${afterEvidence ? " Se cargo evidencia." : ""}`,
        ideaId
      })
    });
  }

  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/kanban");
  redirect(`/ideas/${ideaId}`);
}

export async function closeIdeaAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const selectedRuleIds = new Set(formData.getAll("pointRuleIds").map(String));
  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { approvals: true, attachments: true }
  });
  const wasClosed = idea.status === "CERRADA";

  const hasAfterEvidence = idea.attachments.some((attachment) => attachment.type === "AFTER");
  if (!wasClosed && idea.requiresEvidence && !hasAfterEvidence) redirect(`/ideas/${ideaId}?error=evidencia`);

  const activeRules = await prisma.pointRule.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" }
  });
  const pointAdjustments = new Map<string, number>();
  for (const rule of activeRules) {
    const factor = managerialFactorForRule(rule.id);
    if (!factor) continue;
    const rawValue = text(formData, `managerial-${rule.id}`);
    if (!rawValue) continue;
    const value = Number(rawValue);
    if (!factor.options.some((option) => option.points === value)) continue;
    selectedRuleIds.add(rule.id);
    pointAdjustments.set(rule.id, value);
  }
  const selectedRules = activeRules.filter((rule) => selectedRuleIds.has(rule.id));
  for (const rule of selectedRules) {
    if (pointAdjustments.has(rule.id)) continue;
    const value = Number(text(formData, `points-${rule.id}`));
    pointAdjustments.set(rule.id, Number.isFinite(value) ? Math.max(0, value) : rule.points);
  }
  const totalPoints = selectedRules.reduce((sum, rule) => sum + (pointAdjustments.get(rule.id) ?? rule.points), 0);
  await prisma.ideaPointRule.deleteMany({ where: { ideaId } });
  for (const rule of selectedRules) {
    await prisma.ideaPointRule.create({
      data: {
        ideaId,
        pointRuleId: rule.id,
        points: pointAdjustments.get(rule.id) ?? rule.points
      }
    });
  }

  await prisma.approval.upsert({
    where: { ideaId_type: { ideaId, type: "MEJORA_CONTINUA_FINAL" } },
    update: { assignedToId: user.id, status: "APPROVED", decision: "APROBAR", decidedAt: new Date(), comments: wasClosed ? "ProbocaCoins revisadas y otorgadas nuevamente." : "Cierre final validado." },
    create: {
      ideaId,
      type: "MEJORA_CONTINUA_FINAL",
      assignedToId: user.id,
      status: "APPROVED",
      decision: "APROBAR",
      decidedAt: new Date(),
      comments: wasClosed ? "ProbocaCoins revisadas y otorgadas nuevamente." : "Cierre final validado."
    }
  });

  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: "CERRADA",
      closedAt: idea.closedAt ?? new Date(),
      pointsAssigned: totalPoints
    }
  });
  if (wasClosed) {
    await prisma.comment.create({
      data: {
        ideaId,
        userId: user.id,
        comment: `Mejora Continua otorgo o ajusto ${totalPoints} ProbocaCoins.`
      }
    });
  }
  await auditLog({
    entity: "Idea",
    entityId: ideaId,
    action: wasClosed ? "PROBOCACOINS_REASSIGNED" : "IDEA_CLOSED_REVIEWED_POINTS",
    userId: user.id,
    details: {
      totalPoints,
      selectedRuleIds: selectedRules.map((rule) => rule.id),
      selectedRules: selectedRules.map((rule) => ({
        name: rule.name,
        defaultPoints: rule.points,
        assignedPoints: pointAdjustments.get(rule.id) ?? rule.points
      }))
    }
  });
  const kaizenProject = await ensureKaizenTransfer({
    ideaId,
    actorId: user.id,
    leaderId: idea.implementationOwnerId,
    startDate: idea.createdAt,
    endDate: idea.dueDate,
    updateExisting: false
  });
  if (kaizenProject) {
    await auditLog({
      entity: "KaizenProject",
      entityId: kaizenProject.id,
      action: "TRANSFER_VERIFIED_AT_IDEA_CLOSE",
      userId: user.id,
      details: { ideaId, folio: kaizenProject.folio }
    });
  }
  await notifyIdeaClosed(ideaId, { coinsUpdated: wasClosed });
  revalidatePath("/dashboard");
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/kanban");
  redirect(`/ideas/${ideaId}?coins=${totalPoints}`);
}

export async function removeIdeaPointsAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const reason = text(formData, "reason");
  if (!reason) redirect(`/ideas/${ideaId}?error=justificacion`);

  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { pointRuleSelections: { include: { pointRule: true } } }
  });

  await prisma.ideaPointRule.deleteMany({ where: { ideaId } });
  await prisma.idea.update({ where: { id: ideaId }, data: { pointsAssigned: 0 } });
  await prisma.comment.create({
    data: {
      ideaId,
      userId: user.id,
      comment: `Mejora Continua retiro las ProbocaCoins. Motivo: ${reason}`
    }
  });
  await auditLog({
    entity: "Idea",
    entityId: ideaId,
    action: "AUTO_POINTS_REMOVED",
    userId: user.id,
    details: {
      previousPoints: idea.pointsAssigned,
      previousRules: idea.pointRuleSelections.map((selection) => selection.pointRule.name),
      reason
    }
  });
  revalidatePath("/dashboard");
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function cancelIdeaAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const reason = text(formData, "reason");
  if (!reason) redirect(`/ideas/${ideaId}?error=justificacion`);
  await prisma.idea.update({ where: { id: ideaId }, data: { status: "CANCELADA", rejectionReason: reason } });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "IDEA_CANCELLED", userId: user.id, details: { reason } });
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function addCommentAction(formData: FormData) {
  const user = await requireUser();
  const ideaId = text(formData, "ideaId");
  const comment = text(formData, "comment");
  if (!comment) redirect(`/ideas/${ideaId}`);
  await prisma.comment.create({ data: { ideaId, userId: user.id, comment } });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "COMMENT_ADDED", userId: user.id, details: { comment } });
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function createKaizenProjectAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const title = text(formData, "title");
  const area = text(formData, "area");
  const objective = text(formData, "objective");
  const leaderId = text(formData, "leaderId");
  const startDate = dateOrNull(formData, "startDate");
  const endDate = dateOrNull(formData, "endDate");
  if (!title || !area || !objective || !leaderId || !startDate || !endDate || endDate < startDate) redirect("/kaizen/nuevo?error=campos");

  const project = await prisma.$transaction(async (tx) => {
    const maximum = await tx.kaizenProject.aggregate({ _max: { number: true } });
    const number = (maximum._max.number ?? 0) + 1;
    return tx.kaizenProject.create({
      data: {
        number,
        folio: `KZN-${String(number).padStart(3, "0")}`,
        title,
        plant: text(formData, "plant") || null,
        area,
        objective,
        scope: text(formData, "scope") || null,
        baselineValue: numberOrNull(formData, "baselineValue"),
        targetValue: numberOrNull(formData, "targetValue"),
        currentValue: numberOrNull(formData, "currentValue"),
        unit: text(formData, "unit") || null,
        estimatedSavings: numberOrNull(formData, "estimatedSavings"),
        realSavings: numberOrNull(formData, "realSavings"),
        status: "PENDIENTE_CHARTER",
        startDate,
        endDate,
        leaderId,
        createdById: user.id
      },
      include: { leader: true }
    });
  });

  await auditLog({ entity: "KaizenProject", entityId: project.id, action: "KAIZEN_CREATED", userId: user.id, details: { folio: project.folio } });
  await notifyModuleAssignment({
    to: project.leader.email,
    subject: `Nuevo proyecto Kaizen ${project.folio}`,
    lines: [`Proyecto: ${project.title}`, `Objetivo: ${project.objective}`, "Acción requerida: preparar el Project Charter."],
    path: `/kaizen/${project.id}`
  });
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/gantt");
  redirect(`/kaizen/${project.id}`);
}

export async function updateKaizenProjectAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const projectId = text(formData, "projectId");
  const startDate = dateOrNull(formData, "startDate");
  const endDate = dateOrNull(formData, "endDate");
  const status = text(formData, "status") as KaizenStatus;
  const allowedStatuses: KaizenStatus[] = ["PENDIENTE_CHARTER", "PLANIFICACION", "EN_CURSO", "EN_PAUSA", "COMPLETADO", "CANCELADO"];
  if (!startDate || !endDate || endDate < startDate || !allowedStatuses.includes(status)) redirect(`/kaizen/${projectId}?error=fechas`);
  const project = await prisma.kaizenProject.update({
    where: { id: projectId },
    data: {
      title: text(formData, "title"),
      plant: text(formData, "plant") || null,
      area: text(formData, "area"),
      objective: text(formData, "objective"),
      scope: text(formData, "scope") || null,
      baselineValue: numberOrNull(formData, "baselineValue"),
      targetValue: numberOrNull(formData, "targetValue"),
      currentValue: numberOrNull(formData, "currentValue"),
      unit: text(formData, "unit") || null,
      estimatedSavings: numberOrNull(formData, "estimatedSavings"),
      realSavings: numberOrNull(formData, "realSavings"),
      status,
      startDate,
      endDate,
      leaderId: text(formData, "leaderId"),
      closedAt: status === "COMPLETADO" || status === "CANCELADO" ? new Date() : null
    }
  });
  await auditLog({ entity: "KaizenProject", entityId: projectId, action: "KAIZEN_UPDATED", userId: user.id, details: { status } });
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/gantt");
  revalidatePath(`/kaizen/${projectId}`);
  redirect(`/kaizen/${projectId}`);
}

export async function updateKaizenDatesAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const projectId = text(formData, "projectId");
  const startDate = dateOrNull(formData, "startDate");
  const endDate = dateOrNull(formData, "endDate");
  if (!startDate || !endDate || endDate < startDate) redirect("/kaizen/gantt?error=fechas");
  await prisma.kaizenProject.update({ where: { id: projectId }, data: { startDate, endDate } });
  await auditLog({ entity: "KaizenProject", entityId: projectId, action: "KAIZEN_DATES_UPDATED", userId: user.id, details: { startDate, endDate } });
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/gantt");
  revalidatePath(`/kaizen/${projectId}`);
}

export async function uploadKaizenCharterAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const projectId = text(formData, "projectId");
  const project = await prisma.kaizenProject.findUniqueOrThrow({ where: { id: projectId } });
  const upload = await saveUpload(formData.get("charter") as File | null, `${project.folio}-charter`);
  if (!upload) redirect(`/kaizen/${projectId}?error=charter`);
  await prisma.$transaction([
    prisma.kaizenAttachment.create({ data: { projectId, type: "CHARTER", filename: upload.filename, path: upload.path, uploadedBy: user.name } }),
    prisma.kaizenProject.update({ where: { id: projectId }, data: project.status === "PENDIENTE_CHARTER" ? { status: "PLANIFICACION" } : {} }),
    prisma.kaizenUpdate.create({ data: { projectId, userId: user.id, comment: `Project Charter cargado: ${upload.filename}` } })
  ]);
  await auditLog({ entity: "KaizenProject", entityId: projectId, action: "KAIZEN_CHARTER_UPLOADED", userId: user.id, details: { filename: upload.filename } });
  revalidatePath("/kaizen");
  revalidatePath(`/kaizen/${projectId}`);
  redirect(`/kaizen/${projectId}`);
}

export async function addKaizenActivityAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const projectId = text(formData, "projectId");
  const action = text(formData, "action");
  if (!action) redirect(`/kaizen/${projectId}?error=actividad`);
  const activity = await prisma.$transaction(async (tx) => {
    const maximum = await tx.kaizenActivity.aggregate({ where: { projectId }, _max: { number: true } });
    return tx.kaizenActivity.create({
      data: {
        projectId,
        number: (maximum._max.number ?? 0) + 1,
        problem: text(formData, "problem") || null,
        action,
        ownerId: text(formData, "ownerId") || null,
        startDate: dateOrNull(formData, "startDate"),
        dueDate: dateOrNull(formData, "dueDate"),
        status: "PENDIENTE"
      },
      include: { owner: true, project: true }
    });
  });
  await prisma.kaizenUpdate.create({ data: { projectId, activityId: activity.id, userId: user.id, comment: `Actividad #${activity.number} creada.` } });
  await auditLog({ entity: "KaizenActivity", entityId: activity.id, action: "KAIZEN_ACTIVITY_CREATED", userId: user.id, details: { projectId } });
  await notifyModuleAssignment({
    to: activity.owner?.email,
    subject: `Actividad asignada en ${activity.project.folio}`,
    lines: [`Proyecto: ${activity.project.title}`, `Actividad: ${activity.action}`, `Fecha compromiso: ${activity.dueDate?.toLocaleDateString("es-MX") ?? "Por definir"}`],
    path: `/kaizen/${projectId}`
  });
  await refreshKaizenProject(projectId);
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/kanban");
  revalidatePath(`/kaizen/${projectId}`);
  redirect(`/kaizen/${projectId}`);
}

export async function updateKaizenActivityAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const activityId = text(formData, "activityId");
  const status = text(formData, "status") as WorkItemStatus;
  const editableStatuses: WorkItemStatus[] = ["PENDIENTE", "EN_PROCESO", "BLOQUEADA"];
  if (!editableStatuses.includes(status)) redirect("/kaizen");
  const activity = await prisma.kaizenActivity.update({
    where: { id: activityId },
    data: {
      problem: text(formData, "problem") || null,
      action: text(formData, "action"),
      ownerId: text(formData, "ownerId") || null,
      startDate: dateOrNull(formData, "startDate"),
      dueDate: dateOrNull(formData, "dueDate"),
      status
    }
  });
  await prisma.kaizenUpdate.create({ data: { projectId: activity.projectId, activityId, userId: user.id, comment: `Actividad #${activity.number} actualizada.` } });
  await auditLog({ entity: "KaizenActivity", entityId: activityId, action: "KAIZEN_ACTIVITY_UPDATED", userId: user.id, details: { status } });
  await refreshKaizenProject(activity.projectId);
  revalidatePath("/kaizen/kanban");
  revalidatePath(`/kaizen/${activity.projectId}`);
  redirect(`/kaizen/${activity.projectId}`);
}

export async function closeKaizenActivityAction(formData: FormData) {
  const user = await requireUser();
  const activityId = text(formData, "activityId");
  const outcome = text(formData, "outcome") as WorkItemStatus;
  const note = text(formData, "note");
  const activity = await prisma.kaizenActivity.findUniqueOrThrow({ where: { id: activityId }, include: { project: true } });
  if (!isImprovementManager(user.role) && activity.ownerId !== user.id && activity.project.leaderId !== user.id) redirect(`/kaizen/${activity.projectId}`);
  if (outcome !== "COMPLETADA" && outcome !== "CANCELADA") redirect(`/kaizen/${activity.projectId}`);
  if (outcome === "CANCELADA" && !note) redirect(`/kaizen/${activity.projectId}?error=justificacion`);
  const evidence = await saveUpload(formData.get("evidence") as File | null, `${activity.project.folio}-actividad-${activity.number}`);
  if (outcome === "COMPLETADA" && !evidence) redirect(`/kaizen/${activity.projectId}?error=evidencia`);

  await prisma.$transaction(async (tx) => {
    await tx.kaizenActivity.update({
      where: { id: activityId },
      data: {
        status: outcome,
        completionNote: outcome === "COMPLETADA" ? note || "Actividad completada con evidencia." : null,
        cancellationReason: outcome === "CANCELADA" ? note : null,
        closedAt: new Date()
      }
    });
    if (evidence) {
      await tx.kaizenAttachment.create({ data: { projectId: activity.projectId, activityId, type: "EVIDENCE", filename: evidence.filename, path: evidence.path, uploadedBy: user.name } });
    }
    await tx.kaizenUpdate.create({ data: { projectId: activity.projectId, activityId, userId: user.id, comment: outcome === "COMPLETADA" ? `Actividad #${activity.number} completada.` : `Actividad #${activity.number} cerrada sin ejecutar. Motivo: ${note}` } });
  });
  await auditLog({ entity: "KaizenActivity", entityId: activityId, action: `KAIZEN_ACTIVITY_${outcome}`, userId: user.id, details: { note, evidence: evidence?.filename } });
  await refreshKaizenProject(activity.projectId);
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/kanban");
  revalidatePath(`/kaizen/${activity.projectId}`);
  redirect(`/kaizen/${activity.projectId}`);
}

export async function mergeKaizenActivitiesAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const sourceId = text(formData, "sourceId");
  const targetId = text(formData, "targetId");
  const reason = text(formData, "reason");
  if (!sourceId || !targetId || sourceId === targetId || !reason) redirect("/kaizen?error=combinacion");
  const [source, target] = await Promise.all([
    prisma.kaizenActivity.findUniqueOrThrow({ where: { id: sourceId }, include: { project: true } }),
    prisma.kaizenActivity.findUniqueOrThrow({ where: { id: targetId } })
  ]);
  if (source.projectId !== target.projectId) redirect(`/kaizen/${source.projectId}`);
  await prisma.$transaction([
    prisma.kaizenActivity.update({ where: { id: sourceId }, data: { status: "COMBINADA", mergedIntoId: targetId, mergeReason: reason, closedAt: new Date() } }),
    prisma.kaizenUpdate.create({ data: { projectId: source.projectId, activityId: sourceId, userId: user.id, comment: `Actividad #${source.number} combinada con #${target.number}. Justificación: ${reason}` } })
  ]);
  await auditLog({ entity: "KaizenActivity", entityId: sourceId, action: "KAIZEN_ACTIVITY_MERGED", userId: user.id, details: { targetId, reason } });
  await refreshKaizenProject(source.projectId);
  revalidatePath("/kaizen/kanban");
  revalidatePath(`/kaizen/${source.projectId}`);
  redirect(`/kaizen/${source.projectId}`);
}

export async function addKaizenUpdateAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const projectId = text(formData, "projectId");
  const comment = text(formData, "comment");
  if (!comment) redirect(`/kaizen/${projectId}`);
  await prisma.kaizenUpdate.create({ data: { projectId, userId: user.id, comment } });
  await auditLog({ entity: "KaizenProject", entityId: projectId, action: "KAIZEN_UPDATE_ADDED", userId: user.id, details: { comment } });
  revalidatePath(`/kaizen/${projectId}`);
  redirect(`/kaizen/${projectId}`);
}

export async function createGenbaWalkAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const areaName = text(formData, "areaName");
  const visitDate = dateOrNull(formData, "visitDate");
  const coordinatorId = text(formData, "coordinatorId");
  const expectedDepartments = formData.getAll("expectedDepartments").map(String).filter((value) => genbaDepartments.includes(value));
  const attendedDepartments = formData.getAll("attendedDepartments").map(String).filter((value) => expectedDepartments.includes(value));
  const requestedActivityCount = Number.parseInt(text(formData, "activityCount") || "5", 10);
  const activityCount = Number.isFinite(requestedActivityCount) ? Math.min(25, Math.max(5, requestedActivityCount)) : 5;
  const activityInputs = Array.from({ length: activityCount }, (_, index) => ({
    number: index + 1,
    problem: text(formData, `problem-${index + 1}`),
    action: text(formData, `action-${index + 1}`) || null,
    ownerId: text(formData, `ownerId-${index + 1}`) || null,
    dueDate: dateOrNull(formData, `dueDate-${index + 1}`)
  }));
  if (!areaName || !visitDate || !coordinatorId || expectedDepartments.length === 0 || activityInputs.some((activity) => !activity.problem)) redirect("/genba/nuevo?error=campos");

  const walk = await prisma.$transaction(async (tx) => {
    const maximum = await tx.genbaWalk.aggregate({ _max: { number: true } });
    const number = (maximum._max.number ?? 0) + 1;
    return tx.genbaWalk.create({
      data: {
        number,
        folio: `GENBA-${String(number).padStart(3, "0")}`,
        areaName,
        visitDate,
        expectedDepartments: JSON.stringify(expectedDepartments),
        attendedDepartments: JSON.stringify(attendedDepartments),
        notes: text(formData, "notes") || null,
        coordinatorId,
        createdById: user.id,
        activities: { create: activityInputs }
      },
      include: { coordinator: true, activities: { include: { owner: true } } }
    });
  });
  await auditLog({ entity: "GenbaWalk", entityId: walk.id, action: "GENBA_CREATED", userId: user.id, details: { folio: walk.folio, areaName } });
  const notified = new Set<string>();
  for (const activity of walk.activities) {
    if (!activity.owner?.email || notified.has(activity.owner.email)) continue;
    notified.add(activity.owner.email);
    await notifyModuleAssignment({
      to: activity.owner.email,
      subject: `Actividades asignadas en ${walk.folio}`,
      lines: [`Área visitada: ${walk.areaName}`, `Fecha: ${walk.visitDate.toLocaleDateString("es-MX")}`, "Revisa las actividades que tienes asignadas."],
      path: `/genba/${walk.id}`
    });
  }
  revalidatePath("/genba");
  revalidatePath("/genba/kanban");
  redirect(`/genba/${walk.id}`);
}

export async function updateGenbaWalkAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const walkId = text(formData, "walkId");
  const expectedDepartments = formData.getAll("expectedDepartments").map(String).filter((value) => genbaDepartments.includes(value));
  const attendedDepartments = formData.getAll("attendedDepartments").map(String).filter((value) => expectedDepartments.includes(value));
  const status = text(formData, "status") as GenbaStatus;
  const allowed: GenbaStatus[] = ["ABIERTO", "CERRADO", "CANCELADO"];
  if (!allowed.includes(status) || expectedDepartments.length === 0) redirect(`/genba/${walkId}?error=campos`);
  await prisma.genbaWalk.update({
    where: { id: walkId },
    data: {
      areaName: text(formData, "areaName"),
      visitDate: dateOrNull(formData, "visitDate") ?? undefined,
      expectedDepartments: JSON.stringify(expectedDepartments),
      attendedDepartments: JSON.stringify(attendedDepartments),
      notes: text(formData, "notes") || null,
      coordinatorId: text(formData, "coordinatorId"),
      status,
      closedAt: status === "CERRADO" || status === "CANCELADO" ? new Date() : null
    }
  });
  await auditLog({ entity: "GenbaWalk", entityId: walkId, action: "GENBA_UPDATED", userId: user.id, details: { status } });
  revalidatePath("/genba");
  revalidatePath(`/genba/${walkId}`);
  redirect(`/genba/${walkId}`);
}

export async function addGenbaActivityAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const walkId = text(formData, "walkId");
  const problem = text(formData, "problem");
  if (!problem) redirect(`/genba/${walkId}?error=actividad`);
  const walk = await prisma.genbaWalk.findUniqueOrThrow({ where: { id: walkId } });
  if (walk.status !== "ABIERTO") redirect(`/genba/${walkId}?error=cerrado`);
  const activity = await prisma.$transaction(async (tx) => {
    const maximum = await tx.genbaActivity.aggregate({ where: { walkId }, _max: { number: true } });
    return tx.genbaActivity.create({
      data: {
        walkId,
        number: (maximum._max.number ?? 0) + 1,
        problem,
        action: text(formData, "action") || null,
        ownerId: text(formData, "ownerId") || null,
        dueDate: dateOrNull(formData, "dueDate")
      },
      include: { owner: true, walk: true }
    });
  });
  await prisma.genbaUpdate.create({ data: { walkId, activityId: activity.id, userId: user.id, comment: `Actividad #${activity.number} agregada.` } });
  await auditLog({ entity: "GenbaActivity", entityId: activity.id, action: "GENBA_ACTIVITY_CREATED", userId: user.id, details: { walkId } });
  await notifyModuleAssignment({
    to: activity.owner?.email,
    subject: `Actividad asignada en ${activity.walk.folio}`,
    lines: [`Área: ${activity.walk.areaName}`, `Problemática: ${activity.problem}`, `Acción: ${activity.action ?? "Por definir"}`],
    path: `/genba/${walkId}`
  });
  await refreshGenbaWalk(walkId);
  revalidatePath("/genba");
  revalidatePath("/genba/kanban");
  revalidatePath(`/genba/${walkId}`);
  redirect(`/genba/${walkId}`);
}

export async function updateGenbaActivityAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const activityId = text(formData, "activityId");
  const status = text(formData, "status") as WorkItemStatus;
  const editableStatuses: WorkItemStatus[] = ["PENDIENTE", "EN_PROCESO", "BLOQUEADA"];
  if (!editableStatuses.includes(status)) redirect("/genba");
  const activity = await prisma.genbaActivity.update({
    where: { id: activityId },
    data: {
      problem: text(formData, "problem"),
      action: text(formData, "action") || null,
      ownerId: text(formData, "ownerId") || null,
      dueDate: dateOrNull(formData, "dueDate"),
      status
    }
  });
  await prisma.genbaUpdate.create({ data: { walkId: activity.walkId, activityId, userId: user.id, comment: `Actividad #${activity.number} actualizada.` } });
  await auditLog({ entity: "GenbaActivity", entityId: activityId, action: "GENBA_ACTIVITY_UPDATED", userId: user.id, details: { status } });
  await refreshGenbaWalk(activity.walkId);
  revalidatePath("/genba/kanban");
  revalidatePath(`/genba/${activity.walkId}`);
  redirect(`/genba/${activity.walkId}`);
}

export async function closeGenbaActivityAction(formData: FormData) {
  const user = await requireUser();
  const activityId = text(formData, "activityId");
  const outcome = text(formData, "outcome") as WorkItemStatus;
  const note = text(formData, "note");
  const activity = await prisma.genbaActivity.findUniqueOrThrow({ where: { id: activityId }, include: { walk: true } });
  if (!isImprovementManager(user.role) && activity.ownerId !== user.id && activity.walk.coordinatorId !== user.id) redirect(`/genba/${activity.walkId}`);
  if (outcome !== "COMPLETADA" && outcome !== "CANCELADA") redirect(`/genba/${activity.walkId}`);
  if (outcome === "CANCELADA" && !note) redirect(`/genba/${activity.walkId}?error=justificacion`);
  const evidence = await saveUpload(formData.get("evidence") as File | null, `${activity.walk.folio}-actividad-${activity.number}`);
  if (outcome === "COMPLETADA" && !evidence) redirect(`/genba/${activity.walkId}?error=evidencia`);

  await prisma.$transaction(async (tx) => {
    await tx.genbaActivity.update({
      where: { id: activityId },
      data: {
        status: outcome,
        completionNote: outcome === "COMPLETADA" ? note || "Actividad completada con evidencia." : null,
        cancellationReason: outcome === "CANCELADA" ? note : null,
        closedAt: new Date()
      }
    });
    if (evidence) {
      await tx.genbaAttachment.create({ data: { walkId: activity.walkId, activityId, filename: evidence.filename, path: evidence.path, uploadedBy: user.name } });
    }
    await tx.genbaUpdate.create({ data: { walkId: activity.walkId, activityId, userId: user.id, comment: outcome === "COMPLETADA" ? `Actividad #${activity.number} completada.` : `Actividad #${activity.number} cerrada sin ejecutar. Motivo: ${note}` } });
  });
  await auditLog({ entity: "GenbaActivity", entityId: activityId, action: `GENBA_ACTIVITY_${outcome}`, userId: user.id, details: { note, evidence: evidence?.filename } });
  await refreshGenbaWalk(activity.walkId);
  revalidatePath("/genba");
  revalidatePath("/genba/kanban");
  revalidatePath(`/genba/${activity.walkId}`);
  redirect(`/genba/${activity.walkId}`);
}

export async function mergeGenbaActivitiesAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const sourceId = text(formData, "sourceId");
  const targetId = text(formData, "targetId");
  const reason = text(formData, "reason");
  if (!sourceId || !targetId || sourceId === targetId || !reason) redirect("/genba?error=combinacion");
  const [source, target] = await Promise.all([
    prisma.genbaActivity.findUniqueOrThrow({ where: { id: sourceId }, include: { walk: true } }),
    prisma.genbaActivity.findUniqueOrThrow({ where: { id: targetId } })
  ]);
  if (source.walkId !== target.walkId) redirect(`/genba/${source.walkId}`);
  await prisma.$transaction([
    prisma.genbaActivity.update({ where: { id: sourceId }, data: { status: "COMBINADA", mergedIntoId: targetId, mergeReason: reason, closedAt: new Date() } }),
    prisma.genbaUpdate.create({ data: { walkId: source.walkId, activityId: sourceId, userId: user.id, comment: `Actividad #${source.number} combinada con #${target.number}. Justificación: ${reason}` } })
  ]);
  await auditLog({ entity: "GenbaActivity", entityId: sourceId, action: "GENBA_ACTIVITY_MERGED", userId: user.id, details: { targetId, reason } });
  await refreshGenbaWalk(source.walkId);
  revalidatePath("/genba/kanban");
  revalidatePath(`/genba/${source.walkId}`);
  redirect(`/genba/${source.walkId}`);
}

export async function addGenbaUpdateAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const walkId = text(formData, "walkId");
  const comment = text(formData, "comment");
  if (!comment) redirect(`/genba/${walkId}`);
  await prisma.genbaUpdate.create({ data: { walkId, userId: user.id, comment } });
  await auditLog({ entity: "GenbaWalk", entityId: walkId, action: "GENBA_UPDATE_ADDED", userId: user.id, details: { comment } });
  revalidatePath(`/genba/${walkId}`);
  redirect(`/genba/${walkId}`);
}

export async function promoteGenbaActivityToKaizenAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const activityId = text(formData, "activityId");
  const activity = await prisma.genbaActivity.findUniqueOrThrow({
    where: { id: activityId },
    include: { walk: true, owner: true, promotedKaizenActivity: true }
  });
  if (activity.promotedKaizenActivity) redirect(`/kaizen/${activity.promotedKaizenActivity.projectId}`);

  let projectId = text(formData, "targetProjectId");
  if (!projectId) {
    const leaderId = text(formData, "leaderId") || activity.ownerId;
    if (!leaderId) redirect(`/genba/${activity.walkId}?error=lider`);
    const project = await prisma.$transaction(async (tx) => {
      const maximum = await tx.kaizenProject.aggregate({ _max: { number: true } });
      const number = (maximum._max.number ?? 0) + 1;
      const startDate = new Date();
      const proposedEndDate = activity.dueDate ?? new Date(startDate.getTime() + 30 * 86400000);
      const endDate = proposedEndDate < startDate ? new Date(startDate.getTime() + 30 * 86400000) : proposedEndDate;
      return tx.kaizenProject.create({
        data: {
          number,
          folio: `KZN-${String(number).padStart(3, "0")}`,
          title: text(formData, "newProjectTitle") || activity.problem,
          area: activity.walk.areaName,
          objective: activity.action || activity.problem,
          scope: `Origen: ${activity.walk.folio}, actividad #${activity.number}.`,
          startDate,
          endDate,
          leaderId,
          createdById: user.id
        }
      });
    });
    projectId = project.id;
  }

  const kaizenActivity = await prisma.$transaction(async (tx) => {
    const maximum = await tx.kaizenActivity.aggregate({ where: { projectId }, _max: { number: true } });
    return tx.kaizenActivity.create({
      data: {
        projectId,
        number: (maximum._max.number ?? 0) + 1,
        problem: activity.problem,
        action: activity.action || activity.problem,
        ownerId: activity.ownerId,
        startDate: new Date(),
        dueDate: activity.dueDate,
        sourceGenbaActivityId: activity.id
      },
      include: { project: true, owner: true }
    });
  });
  await prisma.genbaUpdate.create({ data: { walkId: activity.walkId, activityId, userId: user.id, comment: `Actividad enviada al proyecto ${kaizenActivity.project.folio}.` } });
  await prisma.kaizenUpdate.create({ data: { projectId, activityId: kaizenActivity.id, userId: user.id, comment: `Actividad importada desde ${activity.walk.folio}.` } });
  await auditLog({ entity: "GenbaActivity", entityId: activityId, action: "GENBA_ACTIVITY_PROMOTED_TO_KAIZEN", userId: user.id, details: { projectId } });
  await notifyModuleAssignment({
    to: kaizenActivity.owner?.email,
    subject: `Actividad incorporada a ${kaizenActivity.project.folio}`,
    lines: [`Proyecto: ${kaizenActivity.project.title}`, `Actividad: ${kaizenActivity.action}`, `Origen: ${activity.walk.folio}`],
    path: `/kaizen/${projectId}`
  });
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/kanban");
  revalidatePath(`/genba/${activity.walkId}`);
  redirect(`/kaizen/${projectId}`);
}

export async function updateAreaAction(formData: FormData) {
  const user = await requireUser(["ADMIN"]);
  const areaId = text(formData, "areaId");
  const supervisorId = text(formData, "supervisorId") || null;
  const active = checked(formData, "active");
  await prisma.$transaction(async (tx) => {
    await tx.area.update({
      where: { id: areaId },
      data: { name: text(formData, "name"), supervisorId, active }
    });
    await tx.orgUnit.updateMany({
      where: { captureAreaId: areaId },
      data: { routingUserId: supervisorId, active, qrEnabled: active }
    });
  });
  await auditLog({ entity: "Area", entityId: areaId, action: "AREA_UPDATED", userId: user.id });
  revalidatePath("/configuracion");
  revalidatePath("/configuracion/estructura");
  revalidatePath("/qr");
  redirect(`/configuracion?success=area_actualizada#areas`);
}

export async function updatePointRuleAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const pointRuleId = text(formData, "pointRuleId");
  await prisma.pointRule.update({
    where: { id: pointRuleId },
    data: {
      name: text(formData, "name"),
      description: text(formData, "description"),
      points: Number(text(formData, "points") || 0),
      active: checked(formData, "active")
    }
  });
  await auditLog({ entity: "PointRule", entityId: pointRuleId, action: "POINT_RULE_UPDATED", userId: user.id });
  revalidatePath("/configuracion");
}

export async function createPointRuleAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const rule = await prisma.pointRule.create({
    data: {
      name: text(formData, "name"),
      description: text(formData, "description"),
      points: Number(text(formData, "points") || 0),
      active: true
    }
  });
  await auditLog({ entity: "PointRule", entityId: rule.id, action: "POINT_RULE_CREATED", userId: user.id });
  revalidatePath("/configuracion");
}

export async function updateSupportSettingsAction(formData: FormData) {
  const user = await requireUser(["ADMIN"]);
  const value = JSON.stringify({
    calidad: text(formData, "calidad"),
    seguridad: text(formData, "seguridad"),
    mantenimiento: text(formData, "mantenimiento"),
    mejoraContinua: text(formData, "mejoraContinua")
  });
  await prisma.setting.upsert({
    where: { key: "supportEmails" },
    update: { value },
    create: { key: "supportEmails", value }
  });
  await auditLog({ entity: "Setting", entityId: "supportEmails", action: "SUPPORT_EMAILS_UPDATED", userId: user.id });
  revalidatePath("/configuracion");
}

export async function createUserAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const role = text(formData, "role") as Role;
  if (!userRoles.includes(role)) redirect("/configuracion?error=rol");

  const parsedEmail = emailSchema.safeParse(text(formData, "email"));
  if (!parsedEmail.success) redirect("/configuracion?error=correo_invalido#usuarios");
  const email = parsedEmail.data;
  const existing = await userWithNormalizedEmail(email);
  if (existing) redirect("/configuracion?error=correo#usuarios");
  const password = text(formData, "password");
  if (password.length < 8) redirect("/configuracion?error=contrasena#usuarios");
  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: text(formData, "name"),
        email,
        role,
        active: checked(formData, "active"),
        kaizenAccess: checked(formData, "kaizenAccess"),
        genbaAccess: checked(formData, "genbaAccess"),
        passwordHash: await bcrypt.hash(password, 10)
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/configuracion?error=correo#usuarios");
    }
    throw error;
  }
  await auditLog({ entity: "User", entityId: user.id, action: "USER_CREATED", userId: admin.id, details: { email, role } });
  revalidatePath("/configuracion");
  redirect(`/configuracion?success=usuario_creado&user=${encodeURIComponent(user.id)}#usuarios`);
}

export async function updateUserAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const userId = text(formData, "userId");
  const role = text(formData, "role") as Role;
  if (!userRoles.includes(role)) redirect(`/configuracion?error=rol&user=${encodeURIComponent(userId)}#usuarios`);

  const parsedEmail = emailSchema.safeParse(text(formData, "email"));
  if (!parsedEmail.success) redirect(`/configuracion?error=correo_invalido&user=${encodeURIComponent(userId)}#usuarios`);
  const email = parsedEmail.data;
  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser) redirect("/configuracion?error=usuario#usuarios");
  const existing = await userWithNormalizedEmail(email);
  if (existing && existing.id !== userId) redirect(`/configuracion?error=correo&user=${encodeURIComponent(userId)}#usuarios`);
  const password = text(formData, "password");
  if (password && password.length < 8) redirect(`/configuracion?error=contrasena&user=${encodeURIComponent(userId)}#usuarios`);
  const data = {
    name: text(formData, "name"),
    email,
    role,
    active: checked(formData, "active"),
    kaizenAccess: checked(formData, "kaizenAccess"),
    genbaAccess: checked(formData, "genbaAccess"),
    ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {})
  };

  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: userId }, data });
      if (currentUser.email !== updated.email) {
        await tx.notificationOutbox.updateMany({
          where: { to: currentUser.email, status: { in: ["PENDING", "ERROR"] } },
          data: { to: updated.email }
        });
      }
      return updated;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/configuracion?error=correo&user=${encodeURIComponent(userId)}#usuarios`);
    }
    throw error;
  }
  if (admin.id === user.id) await setSession(user);
  await auditLog({
    entity: "User",
    entityId: user.id,
    action: "USER_UPDATED",
    userId: admin.id,
    details: { previousEmail: currentUser.email, email: user.email, role }
  });
  revalidatePath("/configuracion");
  revalidatePath("/configuracion/estructura");
  revalidatePath("/notificaciones");
  redirect(`/configuracion?success=usuario_actualizado&user=${encodeURIComponent(user.id)}#usuarios`);
}

export async function markNotificationAction(formData: FormData) {
  const user = await requireUser();
  const notificationId = text(formData, "notificationId");
  const where =
    user.role === "ADMIN" || user.role === "MEJORA_CONTINUA"
      ? { id: notificationId }
      : { id: notificationId, to: { contains: user.email } };
  const notification = await prisma.notificationOutbox.findFirst({ where });
  if (!notification) redirect("/notificaciones");
  await prisma.notificationOutbox.update({
    where: { id: notification.id },
    data: { status: "DISMISSED" }
  });
  revalidatePath("/notificaciones");
}

export async function retryNotificationAction(formData: FormData) {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const notification = await prisma.notificationOutbox.findUniqueOrThrow({
    where: { id: text(formData, "notificationId") }
  });
  await notify({
    ideaId: notification.ideaId,
    to: notification.to,
    subject: notification.subject,
    body: notification.body,
    channels: [notification.channel]
  });
  await prisma.notificationOutbox.update({ where: { id: notification.id }, data: { status: "DISMISSED" } });
  revalidatePath("/notificaciones");
}

export async function runRemindersAction() {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  await markOverdueIdeas(user.id);
  revalidatePath("/");
  revalidatePath("/vencidas");
}
~~~~~~

### `src/app/api/export/genba/route.ts`

~~~~~~typescript
import { requireGenbaAccess } from "@/lib/module-access";
import { buildGenbaWorkbook } from "@/lib/portfolio-export";

export async function GET() {
  await requireGenbaAccess();
  const workbook = await buildGenbaWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="Concentrado_GENBA_PROpEx_${date}.xlsx"` } });
}
~~~~~~

### `src/app/api/export/kaizen/route.ts`

~~~~~~typescript
import { requireKaizenAccess } from "@/lib/module-access";
import { buildKaizenWorkbook } from "@/lib/portfolio-export";

export async function GET() {
  await requireKaizenAccess();
  const workbook = await buildKaizenWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="Concentrado_Kaizen_PROpEx_${date}.xlsx"` } });
}
~~~~~~

### `src/app/api/export/route.ts`

~~~~~~typescript
import { buildIdeasWorkbook } from "@/lib/export";
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const workbook = await buildIdeasWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Ideas_Mejora_PROpEx_${date}.xlsx"`
    }
  });
}
~~~~~~

### `src/app/api/qr/[code]/route.ts`

~~~~~~typescript
import QRCode from "qrcode";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { baseUrlFromRequest } from "@/lib/url";

type QrContext = {
  params: Promise<{ code: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, context: QrContext) {
  const { code } = await context.params;
  const area = await prisma.area.findFirst({ where: { code: code.toUpperCase(), active: true } });
  if (!area) {
    return new Response("Area no encontrada", { status: 404 });
  }

  const url = `${baseUrlFromRequest(request.nextUrl.origin)}/captura/${area.code}`;
  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    width: 900,
    margin: 2,
    color: {
      dark: "#17202a",
      light: "#ffffff"
    }
  });
  const download = request.nextUrl.searchParams.get("download");

  return new Response(new Blob([new Uint8Array(buffer)]), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "X-QR-Target": url,
      ...(download ? { "Content-Disposition": `attachment; filename="QR-${area.code}.png"` } : {})
    }
  });
}
~~~~~~

### `src/app/captura/[code]/page.tsx`

~~~~~~tsx
import type { ComponentType } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Accessibility,
  Camera,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Factory,
  Gauge,
  HeartHandshake,
  ImagePlus,
  Leaf,
  Lightbulb,
  PackageCheck,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";
import { submitIdeaAction } from "@/app/actions";
import { CaptureClassification } from "@/components/capture-classification";
import { ThemeSelector } from "@/components/theme-selector";
import { impactOptions, shifts } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CaptureProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string; campos?: string; categoria?: string }>;
};

const fieldLabels: Record<string, string> = {
  collaboratorName: "tu nombre",
  areaCode: "el área",
  shift: "el turno",
  problem: "el problema",
  proposal: "la propuesta",
  expectedBenefit: "el beneficio esperado",
  externalSupportDetails: "lo que se necesita comprar, cotizar o solicitar externamente"
};

const impactIcons: Record<string, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  Seguridad: ShieldCheck,
  "Calidad/Inocuidad": PackageCheck,
  Entrega: Truck,
  Costo: CircleDollarSign,
  Moral: HeartHandshake,
  Productividad: Gauge,
  "5S": Sparkles,
  Ergonomia: Accessibility,
  "Medio ambiente": Leaf
};

function fieldHasError(fields: string[], field: string) {
  return fields.includes(field);
}

function fieldClass(fields: string[], field: string) {
  return fieldHasError(fields, field) ? "field border-rose-500 bg-rose-50" : "field";
}

function FormSectionTitle({ number, title, description, icon: Icon }: { number: string; title: string; description: string; icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }> }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-emerald-700">Paso {number}</p>
        <h2 className="text-lg font-extrabold text-ink">{title}</h2>
        <p className="mt-0.5 text-sm leading-5 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function IdeaEligibilityGuide() {
  return (
    <details className="details-panel mb-5">
      <summary><span className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-emerald-700" aria-hidden />¿Esto sí es una idea de mejora?</span></summary>
      <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
        <div className="border-l-4 border-emerald-600 pl-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-900"><CheckCircle2 className="h-4 w-4" aria-hidden />Sí es una idea</p>
          <ul className="mt-2 space-y-2 text-xs leading-5 text-slate-700">
            <li>Propone una solución a un problema u objetivo no alcanzado.</li>
            <li>Mejora o crea una forma estándar de trabajar.</li>
            <li>Reduce defectos, esperas, movimientos, transporte, inventario o reproceso.</li>
          </ul>
        </div>
        <div className="border-l-4 border-slate-400 pl-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-slate-800"><XCircle className="h-4 w-4" aria-hidden />Necesita otro canal</p>
          <ul className="mt-2 space-y-2 text-xs leading-5 text-slate-700">
            <li>Es solo una queja, sin propuesta de solución.</li>
            <li>Es una falla rutinaria que requiere reparación inmediata.</li>
            <li>Es un asunto de personal o contradice una norma establecida.</li>
          </ul>
        </div>
      </div>
    </details>
  );
}

export default async function CapturePage({ params, searchParams }: CaptureProps) {
  const { code } = await params;
  const query = await searchParams;
  const errorFields = query.campos ? query.campos.split(",").filter(Boolean) : [];
  const missingLabels = errorFields.map((field) => fieldLabels[field] ?? field);
  const area = await prisma.area.findFirst({
    where: { code: code.toUpperCase(), active: true },
    include: { supervisor: true }
  });

  if (!area) notFound();

  return (
    <main className="capture-theme min-h-screen bg-panel px-4 py-5 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-5xl">
        <header className="surface overflow-hidden rounded-lg">
          <div className="h-1.5 bg-brand-500" />
          <div className="grid gap-5 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <span className="brand-logo-surface flex h-12 w-24 shrink-0 items-center justify-center border border-line bg-white p-2 sm:h-14 sm:w-28">
                <Image alt="Proboca" className="h-auto w-full object-contain" height={72} priority width={216} src="/brand/proboca-logo.png" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-brand-700">PROpEx · Captura publica</p>
                <h1 className="mt-0.5 text-xl font-extrabold leading-tight text-ink sm:text-2xl">Registrar idea de mejora</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-3 border-l-4 border-emerald-600 bg-emerald-50 px-3 py-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-sm font-extrabold text-white">{area.code}</span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-extrabold text-emerald-900">{area.name}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-emerald-800">{area.supervisor?.name ?? "Supervisor pendiente"}</span>
                </span>
              </div>
              <ThemeSelector />
            </div>
          </div>
        </header>

        <div className="my-4 grid grid-cols-3 gap-2 sm:my-5 sm:gap-3">
          {[
            ["1", "Idea", Lightbulb],
            ["2", "Categoría", ClipboardCheck],
            ["3", "Enviar", Send]
          ].map(([number, label, Icon]) => {
            const StepIcon = Icon as ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
            return (
              <div className="step-surface flex min-h-16 items-center gap-2 rounded-lg p-2.5 sm:p-3" key={number as string}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <StepIcon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-extrabold uppercase text-emerald-700">Paso {number as string}</span>
                  <span className="block text-[11px] font-extrabold leading-4 text-ink sm:text-sm">{label as string}</span>
                </span>
              </div>
            );
          })}
        </div>

        {query.error ? (
          <div className="alert alert-danger mb-4" role="alert">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div>
              <p className="font-extrabold">No pudimos enviar la idea todavia.</p>
              <p className="mt-1 leading-5">
                {query.error === "area"
                  ? "Este QR pertenece a un área inactiva. Avisa a Mejora Continua o utiliza otro código."
                  : missingLabels.length
                    ? `Revisa ${missingLabels.join(", ")}. Puedes usar frases cortas; no tiene que quedar perfecto.`
                    : "Revisa los campos marcados e intenta nuevamente."}
              </p>
            </div>
          </div>
        ) : null}

        <form action={submitIdeaAction} className="surface overflow-hidden rounded-lg">
          <input name="areaCode" type="hidden" value={area.code} />

          <section className="p-5 sm:p-6">
            <FormSectionTitle description="Solo necesitamos saber quien comparte la oportunidad." icon={UserRound} number="1" title="Tus datos" />
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="label">Nombre completo *</span>
                <input autoComplete="name" className={fieldClass(errorFields, "collaboratorName")} name="collaboratorName" placeholder="Escribe tu nombre" required />
                {fieldHasError(errorFields, "collaboratorName") ? <span className="helper-text font-bold text-rose-700">Escribe al menos 2 letras.</span> : null}
              </label>
              <label>
                <span className="label">Número de empleado</span>
                <input className="field" inputMode="numeric" name="employeeNumber" placeholder="Opcional" />
              </label>
              <label>
                <span className="label">Correo</span>
                <input autoComplete="email" className="field" name="collaboratorEmail" placeholder="Opcional, para recibir avisos" type="email" />
              </label>
              <label>
                <span className="label">Turno *</span>
                <select className={fieldClass(errorFields, "shift")} defaultValue="Matutino" name="shift" required>
                  {shifts.map((shift) => (
                    <option key={shift} value={shift}>{shift}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="border-t border-line p-5 sm:p-6">
            <FormSectionTitle description="Cuentanos que viste y como crees que podria mejorar." icon={Lightbulb} number="2" title="La oportunidad" />
            <IdeaEligibilityGuide />
            <div className="grid gap-4">
              <label>
                <span className="label">¿Qué problema viste? *</span>
                <textarea className={`${fieldClass(errorFields, "problem")} min-h-28`} name="problem" placeholder="Ejemplo: El material se atora y retrasa la linea..." required />
                {fieldHasError(errorFields, "problem") ? <span className="helper-text font-bold text-rose-700">Describe el problema con una frase corta.</span> : null}
              </label>
              <div className="grid gap-4 lg:grid-cols-2">
                <label>
                  <span className="label">¿Qué propones hacer? *</span>
                  <textarea className={`${fieldClass(errorFields, "proposal")} min-h-28`} name="proposal" placeholder="Ejemplo: Cambiar la guia para evitar el atoron..." required />
                  {fieldHasError(errorFields, "proposal") ? <span className="helper-text font-bold text-rose-700">Escribe una propuesta corta.</span> : null}
                </label>
                <label>
                  <span className="label">¿Qué mejora esperas? *</span>
                  <textarea className={`${fieldClass(errorFields, "expectedBenefit")} min-h-28`} name="expectedBenefit" placeholder="Ejemplo: Menos paro, menor riesgo y trabajo mas rapido..." required />
                  {fieldHasError(errorFields, "expectedBenefit") ? <span className="helper-text font-bold text-rose-700">Escribe el beneficio esperado.</span> : null}
                </label>
              </div>
            </div>
          </section>

          <section className="border-t border-line p-5 sm:p-6">
            <FormSectionTitle description="Indica quién participará y marca todo lo que podría mejorar." icon={ClipboardCheck} number="3" title="Categoría, apoyo e impacto" />
            <CaptureClassification initialCategory={query.categoria === "B" || query.categoria === "C" ? query.categoria : "A"} />

            <div className="mt-6 border-t border-line pt-6">
              <fieldset>
                <legend className="label">¿Qué beneficia la idea?</legend>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {impactOptions.map((impact) => {
                  const ImpactIcon = impactIcons[impact] ?? Check;
                  return (
                    <label className="capture-choice cursor-pointer" key={impact}>
                      <input className="peer sr-only" name="impactTypes" type="checkbox" value={impact} />
                      <span className="flex min-h-14 items-center gap-3 rounded-lg border border-line bg-white p-3 text-sm font-bold text-slate-700 transition peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-900">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-panel text-slate-600">
                          <ImpactIcon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">{impact}</span>
                        <Check className="capture-choice-check h-4 w-4 shrink-0 text-emerald-700 opacity-0" aria-hidden />
                      </span>
                    </label>
                  );
                })}
                </div>
              </fieldset>
            </div>

            <label className="mt-6 block rounded-lg border border-dashed border-slate-300 bg-panel p-4">
              <span className="flex items-center gap-2 text-sm font-extrabold text-ink">
                <Camera className="h-5 w-5 text-emerald-700" aria-hidden />
                Foto o evidencia antes
              </span>
              <span className="helper-text">Opcional. Una imagen ayuda a entender la oportunidad con mayor rapidez.</span>
              <input className="field mt-3 bg-white" name="beforeEvidence" type="file" accept="image/*,.pdf" />
            </label>
          </section>

          <footer className="flex flex-col gap-4 border-t border-line bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <Factory className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
              <div>
                <p className="text-sm font-extrabold">Tu idea llegará al supervisor de {area.code}</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">Al enviarla recibirás un folio para identificarla.</p>
              </div>
            </div>
            <button className="btn btn-success min-w-48" type="submit">
              Enviar mi idea
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </footer>
        </form>
      </section>
    </main>
  );
}
~~~~~~

### `src/app/captura/gracias/page.tsx`

~~~~~~tsx
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Lightbulb } from "lucide-react";

type ThanksProps = {
  searchParams: Promise<{ folio?: string; area?: string }>;
};

export default async function ThanksPage({ searchParams }: ThanksProps) {
  const { folio, area } = await searchParams;
  const areaCode = area ?? "P1";
  return (
    <main className="capture-theme grid min-h-screen place-items-center bg-panel p-4">
      <section className="surface w-full max-w-lg overflow-hidden rounded-lg text-center">
        <div className="h-1.5 bg-brand-500" />
        <div className="p-6 sm:p-8">
          <Image alt="Proboca" className="mx-auto h-auto w-28 object-contain" height={72} width={216} src="/brand/proboca-logo.png" />
          <span className="mx-auto mt-7 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-ink sm:text-3xl">¡Idea registrada!</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">El supervisor de {areaCode} ya puede revisarla.</p>
          <div className="mt-6 border-y border-line bg-panel px-4 py-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">Tu folio</p>
            <p className="mt-1 text-3xl font-extrabold text-ink">{folio ?? "Pendiente"}</p>
          </div>
          <p className="mt-5 flex items-start justify-center gap-2 text-xs leading-5 text-slate-500">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            Guarda este folio para identificar tu idea.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link className="btn btn-success" href={`/captura/${areaCode}`}>
              Registrar otra
            </Link>
            <Link className="btn btn-secondary" href="/">
              Terminar
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
~~~~~~

### `src/app/globals.css`

~~~~~~css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ProbocaCoins keep the official Mejora Continua mark inside a distinct reward token. */
.proboca-coin {
  position: relative;
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  aspect-ratio: 1;
  overflow: hidden;
  border: 2px solid #755815;
  border-radius: 50%;
  background: linear-gradient(145deg, #fff0a5 0%, #d8a82f 42%, #9b7316 100%);
  box-shadow:
    inset 0 0 0 2px rgba(255, 255, 255, 0.5),
    inset -4px -5px 8px rgba(82, 55, 4, 0.28),
    0 3px 8px rgba(23, 23, 23, 0.2);
}

.proboca-coin::after {
  position: absolute;
  top: 8%;
  left: 18%;
  width: 25%;
  height: 56%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  content: "";
  filter: blur(1px);
  pointer-events: none;
  transform: rotate(34deg);
}

.proboca-coin-sm { width: 20px; }
.proboca-coin-md { width: 34px; }
.proboca-coin-lg { width: 64px; }
.proboca-coin-xl { width: 112px; border-width: 4px; }

.proboca-coin-face {
  position: absolute;
  inset: 12%;
  overflow: hidden;
  border: 1px solid rgba(117, 88, 21, 0.72);
  border-radius: 50%;
  background: #ffffff;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.7);
}

.proboca-coin-face img {
  object-fit: cover;
  transform: scale(1.08);
}

.proboca-coins-celebration {
  position: fixed;
  z-index: 120;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: rgba(10, 10, 10, 0.72);
  padding: 1rem;
  animation: proboca-coins-overlay-in 220ms ease-out both;
  backdrop-filter: blur(6px);
}

.proboca-coins-rain {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.proboca-coins-falling {
  position: absolute;
  top: -88px;
  left: var(--coin-left);
  display: block;
  animation: proboca-coin-fall var(--coin-duration) linear var(--coin-delay) both;
  transform: translate3d(0, -80px, 0) scale(var(--coin-scale));
  will-change: transform;
}

.proboca-coins-dialog {
  position: relative;
  width: min(92vw, 430px);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-top: 5px solid var(--brand-red);
  border-radius: 8px;
  background: #ffffff;
  padding: 2rem 1.5rem 1.5rem;
  text-align: center;
  box-shadow: 0 26px 80px rgba(0, 0, 0, 0.34);
  animation: proboca-coins-dialog-in 420ms cubic-bezier(0.2, 0.8, 0.2, 1) 90ms both;
}

.proboca-coins-dialog::before {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 6px;
  background: linear-gradient(90deg, #171717 0 34%, #d8a82f 34% 66%, #ea0029 66%);
  content: "";
}

.proboca-coins-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #ffffff;
  color: #4b5563;
  cursor: pointer;
}

.proboca-coins-close:hover { background: #f6f6f6; color: #171717; }

.proboca-coins-hero-coin {
  display: inline-flex;
  margin-bottom: 1rem;
  animation: proboca-coin-award 680ms cubic-bezier(0.2, 0.9, 0.2, 1.25) 220ms both;
}

.proboca-coins-eyebrow {
  color: var(--brand-red);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.proboca-coins-dialog h2 {
  margin: 0.35rem 0 0;
  color: #171717;
  font-size: clamp(1.45rem, 6vw, 2rem);
  font-weight: 900;
  letter-spacing: 0;
}

.proboca-coins-amount {
  margin-top: 0.5rem;
  color: #8a6412;
  font-size: clamp(2.5rem, 12vw, 4rem);
  font-variant-numeric: tabular-nums;
  font-weight: 950;
  line-height: 1;
  letter-spacing: 0;
}

.proboca-coins-message {
  max-width: 32ch;
  margin: 0.9rem auto 0;
  color: #5f6368;
  font-size: 0.9rem;
  line-height: 1.55;
}

.proboca-coins-sound {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.2rem;
  border: 1px solid #171717;
  border-radius: 6px;
  background: #171717;
  padding: 0.65rem 1rem;
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 850;
  cursor: pointer;
}

.proboca-coins-sound:hover { background: #333333; }

@keyframes proboca-coins-overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes proboca-coins-dialog-in {
  from { opacity: 0; transform: translateY(20px) scale(0.94); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes proboca-coin-award {
  0% { opacity: 0; transform: translateY(-26px) rotate(-18deg) scale(0.55); }
  70% { opacity: 1; transform: translateY(3px) rotate(4deg) scale(1.08); }
  100% { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
}

@keyframes proboca-coin-fall {
  0% { opacity: 0; transform: translate3d(0, -80px, 0) rotateY(0) rotateZ(0) scale(var(--coin-scale)); }
  12% { opacity: 1; }
  100% { opacity: 0.95; transform: translate3d(var(--coin-drift), calc(100vh + 150px), 0) rotateY(var(--coin-spin)) rotateZ(520deg) scale(var(--coin-scale)); }
}

@media (prefers-reduced-motion: reduce) {
  .proboca-coins-celebration,
  .proboca-coins-dialog,
  .proboca-coins-hero-coin { animation: none; }
  .proboca-coins-falling { display: none; }
}

:root {
  color-scheme: light;
  --background: #f6f6f6;
  --foreground: #171717;
  --surface: #ffffff;
  --surface-subtle: #f8f8f8;
  --surface-elevated: #ffffff;
  --muted: #6c6c6c;
  --line: #dedede;
  --line-strong: #c8c8c8;
  --brand-red: #ea0029;
  --brand-red-dark: #b50020;
  --brand-black: #171717;
  --brand-gray: #8a8a8a;
  --supervisor: #14835f;
  --quality: #d32236;
  --safety: #626a70;
  --maintenance: #176fc1;
  --role-accent: #171717;
  --role-soft: #f0f0f0;
  --primary: #ea0029;
  --primary-foreground: #ffffff;
  --secondary: #f0f0f0;
  --accent: #fff1f4;
  --success: #14835f;
  --warning: #a16207;
  --danger: #d32236;
  --shadow-soft: 0 1px 2px rgba(23, 26, 24, 0.035), 0 8px 24px rgba(23, 26, 24, 0.035);
  --shadow-raised: 0 14px 36px rgba(23, 26, 24, 0.09);
}

html[data-theme="dark"] {
  color-scheme: dark;
  --background: #0c0e11;
  --foreground: #f5f7fa;
  --surface: #15181d;
  --surface-subtle: #1b1f25;
  --surface-elevated: #20242b;
  --muted: #a1a8b3;
  --line: #2b313a;
  --line-strong: #3d4652;
  --brand-red-dark: #ff3659;
  --brand-gray: #9da5b0;
  --secondary: #20242b;
  --accent: #32151d;
  --shadow-soft: 0 1px 1px rgba(0, 0, 0, 0.24), 0 12px 32px rgba(0, 0, 0, 0.2);
  --shadow-raised: 0 18px 44px rgba(0, 0, 0, 0.32);
}

.capture-theme {
  --role-accent: #14835f;
  --role-soft: #e9f6f0;
}

.capture-choice > input:checked + span .capture-choice-check {
  opacity: 1;
}

* {
  box-sizing: border-box;
}

html {
  min-height: 100%;
  background: var(--background);
}

body {
  min-height: 100%;
  margin: 0;
  color: var(--foreground);
  background: var(--background);
  text-rendering: optimizeLegibility;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
select,
textarea {
  font: inherit;
}

button,
a,
select,
input[type="checkbox"],
input[type="radio"] {
  -webkit-tap-highlight-color: transparent;
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
summary:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--role-accent) 24%, transparent);
  outline-offset: 2px;
}

::selection {
  color: #ffffff;
  background: var(--brand-red);
}

.app-shell {
  min-height: 100vh;
}

.app-sidebar {
  display: none;
}

.app-content {
  min-height: 100vh;
}

.app-main {
  width: 100%;
  max-width: 1680px;
  margin: 0 auto;
  padding: 1.25rem 1rem 6.5rem;
}

.mobile-topbar {
  position: sticky;
  z-index: 30;
  top: 0;
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-top: 4px solid var(--brand-red);
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface) 96%, transparent);
  padding: 0.5rem 1rem;
  backdrop-filter: blur(14px);
}

.mobile-module-strip {
  border-bottom: 1px solid var(--line);
  background: var(--surface);
  padding: 0.45rem 1rem;
}

.module-switcher {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 0.25rem;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface-subtle);
  padding: 0.22rem;
}

.module-switcher-link {
  display: flex;
  min-width: 0;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 0.38rem;
  border-radius: 5px;
  color: #68716c;
  font-size: 0.7rem;
  font-weight: 850;
}

.module-switcher-link.is-active {
  background: var(--surface-elevated);
  color: var(--role-accent);
  box-shadow: 0 1px 4px rgba(23, 26, 24, 0.1);
}

.module-switcher.is-compact .module-switcher-link {
  min-height: 36px;
  font-size: 0.68rem;
}

.mobile-bottom-nav {
  position: fixed;
  z-index: 40;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  min-height: 70px;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  border-top: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface) 97%, transparent);
  padding: 0.35rem max(0.5rem, env(safe-area-inset-right)) max(0.35rem, env(safe-area-inset-bottom)) max(0.5rem, env(safe-area-inset-left));
  box-shadow: 0 -8px 24px rgba(23, 26, 24, 0.08);
  backdrop-filter: blur(16px);
}

.mobile-bottom-link {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 54px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border: 0;
  background: transparent;
  color: #727b76;
  font-size: 0.68rem;
  font-weight: 800;
}

.mobile-bottom-link::before {
  position: absolute;
  top: -0.35rem;
  width: 36px;
  height: 3px;
  background: transparent;
  content: "";
}

.mobile-bottom-link.is-active {
  color: var(--role-accent);
}

.mobile-bottom-link.is-active::before {
  background: var(--role-accent);
}

.mobile-drawer-layer {
  position: fixed;
  z-index: 70;
  inset: 0;
  display: flex;
  justify-content: flex-end;
}

.mobile-drawer-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(17, 20, 18, 0.56);
}

.mobile-drawer {
  position: relative;
  display: flex;
  width: min(90vw, 390px);
  height: 100%;
  flex-direction: column;
  background: var(--surface);
  box-shadow: -18px 0 48px rgba(17, 20, 18, 0.18);
}

.app-nav-link {
  position: relative;
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 0.75rem;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0.48rem 0.6rem;
  color: #4f4f4f;
  font-size: 0.84rem;
  font-weight: 750;
  transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
}

.app-nav-link:hover {
  border-color: var(--line);
  background: var(--surface-subtle);
  color: var(--brand-black);
}

.app-nav-link.is-active {
  border-color: color-mix(in srgb, var(--role-accent) 18%, #ffffff);
  background: var(--role-soft);
  color: var(--role-accent);
}

.app-nav-link.is-active::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 0;
  width: 3px;
  background: var(--role-accent);
  content: "";
}

.app-nav-icon {
  display: flex;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface-elevated);
  color: inherit;
}

.app-nav-link.is-active .app-nav-icon {
  border-color: color-mix(in srgb, var(--role-accent) 20%, #ffffff);
}

.nav-group-label {
  padding: 0 0.65rem;
  color: var(--brand-gray);
  font-size: 0.66rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav-count {
  display: inline-flex;
  min-width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--brand-red);
  padding: 0 0.4rem;
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 850;
}

.notification-dot {
  position: absolute;
  right: 7px;
  top: 7px;
  width: 8px;
  height: 8px;
  border: 2px solid var(--surface);
  border-radius: 999px;
  background: var(--brand-red);
}

.icon-button {
  display: inline-flex;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line-strong);
  border-radius: 7px;
  background: var(--surface-elevated);
  color: var(--foreground);
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}

.icon-button:hover {
  border-color: #b5b5b5;
  background: var(--surface-subtle);
  color: var(--brand-black);
}

.user-summary {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  display: flex;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: var(--role-accent);
  color: #ffffff;
  font-size: 0.86rem;
  font-weight: 850;
}

.role-chip {
  overflow: hidden;
  color: var(--role-accent);
  font-size: 0.7rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.surface {
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.surface-interactive {
  transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}

.surface-interactive:hover {
  border-color: var(--line-strong);
  box-shadow: var(--shadow-raised);
  transform: translateY(-1px);
}

.step-surface {
  border: 1px solid var(--line);
  background: var(--surface);
}

.gantt-grid {
  position: relative;
  display: grid;
  min-width: max-content;
}

.gantt-header {
  position: sticky;
  z-index: 20;
  top: 0;
  min-height: 52px;
  background: var(--surface-subtle);
}

.gantt-project-row {
  min-height: 102px;
}

.gantt-sticky-cell {
  position: sticky;
  z-index: 10;
  left: 0;
  box-shadow: 8px 0 14px rgba(23, 26, 24, 0.06);
}

.gantt-bar {
  z-index: 5;
  align-self: center;
  min-width: 24px;
  height: 30px;
  margin: 0 3px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(23, 26, 24, 0.18);
}

.gantt-bar span {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0 0.35rem;
  font-size: 0.65rem;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field {
  width: 100%;
  min-height: 46px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: var(--surface-elevated);
  padding: 0.72rem 0.82rem;
  color: var(--foreground);
  transition: border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease;
}

.field:hover {
  border-color: #b5b5b5;
}

.field:focus {
  border-color: var(--role-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--role-accent) 12%, transparent);
  outline: 0;
}

.field::placeholder {
  color: #8d8d8d;
}

.field:disabled {
  background: var(--surface-subtle);
  color: var(--muted);
}

textarea.field {
  resize: vertical;
}

input[type="checkbox"],
input[type="radio"] {
  width: 17px;
  height: 17px;
  flex: 0 0 17px;
  accent-color: var(--role-accent);
}

input[type="file"].field {
  padding: 0.52rem;
}

input[type="file"]::file-selector-button {
  min-height: 34px;
  margin-right: 0.75rem;
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  background: var(--surface-subtle);
  padding: 0.35rem 0.7rem;
  color: var(--foreground);
  font-weight: 750;
}

.label {
  display: block;
  margin-bottom: 0.38rem;
  color: var(--foreground);
  font-size: 0.76rem;
  font-weight: 800;
}

.helper-text {
  display: block;
  margin-top: 0.32rem;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.btn {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid transparent;
  border-radius: 7px;
  padding: 0.62rem 0.95rem;
  font-size: 0.86rem;
  font-weight: 800;
  line-height: 1.15;
  transition: background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, color 140ms ease;
}

.btn:hover {
  box-shadow: 0 6px 16px rgba(23, 26, 24, 0.1);
}

.btn:active {
  box-shadow: none;
}

.btn-primary {
  background: var(--role-accent);
  color: #ffffff;
}

.btn-brand {
  background: var(--brand-red);
  color: #ffffff;
}

.btn-brand:hover {
  background: var(--brand-red-dark);
}

.btn-success {
  background: var(--supervisor);
  color: #ffffff;
}

.btn-secondary {
  border-color: var(--line-strong);
  background: var(--surface-elevated);
  color: var(--foreground);
}

.btn-secondary:hover {
  border-color: #b5b5b5;
  background: var(--surface-subtle);
}

.btn-danger {
  background: var(--quality);
  color: #ffffff;
}

.btn-ghost {
  background: transparent;
  color: #59635d;
}

.btn-ghost:hover {
  background: var(--surface-subtle);
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.section-heading-mark {
  width: 4px;
  min-height: 36px;
  flex: 0 0 4px;
  border-radius: 2px;
  background: var(--section-accent, var(--role-accent));
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(23, 26, 24, 0.03);
}

.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.84rem;
}

.data-table th,
.data-table td {
  border-bottom: 1px solid #e6e6e6;
  padding: 0.78rem 0.85rem;
  text-align: left;
  vertical-align: middle;
}

.data-table th {
  background: var(--surface-subtle);
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 850;
  letter-spacing: 0.045em;
  text-transform: uppercase;
  white-space: nowrap;
}

.data-table tbody tr {
  transition: background-color 120ms ease;
}

.data-table tbody tr:hover {
  background: var(--surface-subtle);
}

.data-table tr:last-child td {
  border-bottom: 0;
}

.data-table td {
  color: var(--foreground);
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border: 1px solid var(--line);
  border-left-width: 4px;
  border-radius: 6px;
  background: var(--surface);
  padding: 0.85rem 1rem;
  font-size: 0.84rem;
}

.alert-danger {
  border-color: #f0b8bf;
  border-left-color: var(--quality);
  background: #fff7f8;
  color: #931728;
}

.alert-warning {
  border-color: #ecd4a8;
  border-left-color: #b7791f;
  background: #fffaf0;
  color: #7b5319;
}

.alert-info {
  border-color: #b9d5ee;
  border-left-color: var(--maintenance);
  background: #f5faff;
  color: #17578f;
}

.details-panel {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}

.details-panel > summary {
  display: flex;
  min-width: 0;
  min-height: 52px;
  cursor: pointer;
  list-style: none;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 1rem;
  font-weight: 800;
}

.details-panel > summary::-webkit-details-marker {
  display: none;
}

.details-panel[open] > summary {
  border-bottom: 1px solid var(--line);
}

.details-panel > summary::after {
  color: #7d8781;
  content: "+";
  font-size: 1.25rem;
  font-weight: 500;
}

.details-panel[open] > summary::after {
  content: "−";
}

.work-item-disclosure {
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}

.work-item-disclosure:first-child {
  border-top: 1px solid var(--line);
}

.work-item-disclosure > summary::-webkit-details-marker {
  display: none;
}

.work-item-disclosure[open] .work-item-chevron {
  transform: rotate(180deg);
}

.brand-logo-surface {
  background: #ffffff !important;
}

.sidebar-brand-row {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.sidebar-collapse-button {
  display: none;
}

.collapsed-brand {
  display: flex;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #ffffff;
  padding: 0.28rem;
}

.workspace-topbar {
  display: none;
}

.workspace-topbar-context,
.workspace-topbar-actions {
  display: flex;
  min-width: 0;
  align-items: center;
}

.workspace-topbar-context {
  gap: 0.75rem;
}

.workspace-context-mark {
  width: 4px;
  height: 34px;
  flex: 0 0 4px;
  border-radius: 2px;
  background: var(--role-accent);
  box-shadow: 0 0 18px color-mix(in srgb, var(--role-accent) 28%, transparent);
}

.workspace-topbar-actions {
  gap: 0.55rem;
}

.workspace-search-trigger,
.workspace-period-control,
.theme-selector-trigger {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid var(--line-strong);
  border-radius: 7px;
  background: var(--surface-elevated);
  color: var(--foreground);
  font-size: 0.78rem;
  font-weight: 800;
}

.workspace-search-trigger {
  min-width: 160px;
  justify-content: flex-start;
  padding: 0 0.8rem;
  color: var(--muted);
}

.workspace-search-trigger:hover,
.workspace-period-control:hover,
.theme-selector-trigger:hover {
  border-color: color-mix(in srgb, var(--role-accent) 36%, var(--line-strong));
}

.workspace-search-trigger.is-full,
.workspace-period-control.is-full,
.theme-selector-labeled {
  width: 100%;
}

.workspace-period-control {
  min-width: 118px;
  padding-left: 0.75rem;
}

.workspace-period-control select {
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  padding: 0 0.65rem 0 0;
  color: inherit;
  font-size: 0.76rem;
  font-weight: 800;
  outline: 0;
}

.theme-selector,
.workspace-profile {
  position: relative;
}

.theme-selector > summary,
.workspace-profile > summary {
  cursor: pointer;
  list-style: none;
}

.theme-selector > summary::-webkit-details-marker,
.workspace-profile > summary::-webkit-details-marker {
  display: none;
}

.theme-selector-trigger {
  width: 100%;
  justify-content: flex-start;
  padding: 0 0.8rem;
}

.theme-selector-menu,
.workspace-profile-menu {
  position: absolute;
  z-index: 65;
  top: calc(100% + 0.55rem);
  right: 0;
  width: 260px;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface-elevated);
  padding: 0.55rem;
  box-shadow: var(--shadow-raised);
}

.theme-selector-title {
  padding: 0.45rem 0.55rem 0.55rem;
  color: var(--muted);
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.theme-selector-option {
  display: flex;
  width: 100%;
  min-height: 58px;
  align-items: center;
  gap: 0.7rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  padding: 0.55rem;
  color: var(--foreground);
}

.theme-selector-option:hover,
.theme-selector-option.is-active {
  border-color: var(--line);
  background: var(--surface-subtle);
}

.theme-selector-option-icon {
  display: flex;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.workspace-profile > summary {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 0.55rem;
  border-left: 1px solid var(--line);
  padding-left: 0.75rem;
}

.workspace-profile .user-avatar {
  width: 36px;
  height: 36px;
  flex-basis: 36px;
}

.workspace-profile-menu {
  width: 285px;
  padding: 1rem;
}

.command-search-layer,
.quick-view-layer {
  position: fixed;
  z-index: 100;
  inset: 0;
}

.command-search-backdrop,
.quick-view-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(7, 9, 12, 0.68);
  backdrop-filter: blur(4px);
}

.command-search-panel {
  position: relative;
  width: min(92vw, 660px);
  max-height: min(78vh, 680px);
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-top: 4px solid var(--brand-red);
  border-radius: 8px;
  background: var(--surface-elevated);
  margin: min(12vh, 110px) auto 0;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.34);
  animation: command-panel-in 160ms ease-out both;
}

.command-search-input-row {
  display: flex;
  min-height: 68px;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid var(--line);
  padding: 0.65rem 0.8rem 0.65rem 1rem;
}

.command-search-input-row input {
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--foreground);
  font-size: 1rem;
  font-weight: 700;
  outline: 0;
}

.command-search-input-row input::placeholder {
  color: var(--muted);
}

.command-search-results {
  max-height: min(62vh, 530px);
  overflow-y: auto;
  padding: 0.55rem;
}

.command-search-result {
  display: flex;
  min-height: 62px;
  align-items: center;
  gap: 1rem;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0.65rem 0.8rem;
}

.command-search-result:hover {
  border-color: var(--line);
  background: var(--surface-subtle);
}

.command-search-empty {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  text-align: center;
}

.mobile-workspace-preferences {
  display: grid;
  gap: 0.6rem;
  margin-top: 0.85rem;
  border-top: 1px solid var(--line);
  padding-top: 0.85rem;
}

.quick-view-layer {
  z-index: 95;
  display: flex;
  justify-content: flex-end;
}

.quick-view-panel {
  position: relative;
  display: flex;
  width: min(94vw, 470px);
  height: 100%;
  flex-direction: column;
  border-left: 1px solid var(--line-strong);
  background: var(--surface-elevated);
  box-shadow: -24px 0 70px rgba(0, 0, 0, 0.28);
  animation: quick-view-in 180ms ease-out both;
}

.quick-view-header,
.quick-view-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--line);
  padding: 1rem 1.15rem;
}

.quick-view-header {
  border-top: 5px solid var(--brand-red);
}

.quick-view-body {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 1.15rem;
}

.quick-view-section {
  margin-top: 1rem;
  border-top: 1px solid var(--line);
  padding-top: 1rem;
}

.quick-view-label {
  color: var(--muted);
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.quick-view-next-step {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 1rem;
  border-radius: 8px;
  background: #111318;
  padding: 0.9rem;
  color: #ffffff;
}

.quick-view-facts {
  margin-top: 1rem;
  border-top: 1px solid var(--line);
}

.quick-view-facts > div {
  display: grid;
  gap: 0.3rem;
  border-bottom: 1px solid var(--line);
  padding: 0.85rem 0;
}

.quick-view-facts dt {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 800;
}

.quick-view-facts dd {
  color: var(--foreground);
  font-size: 0.86rem;
  font-weight: 800;
}

.quick-view-impact {
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface-subtle);
  padding: 0.38rem 0.65rem;
  color: var(--foreground);
  font-size: 0.7rem;
  font-weight: 800;
}

.quick-view-footer {
  border-top: 1px solid var(--line);
  border-bottom: 0;
}

.quick-view-row {
  color: inherit;
}

.command-attention-band {
  position: relative;
  isolation: isolate;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 18px 44px rgba(15, 17, 21, 0.16);
}

.command-attention-band::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background-image:
    linear-gradient(115deg, rgba(234, 0, 41, 0.18), transparent 34%),
    repeating-linear-gradient(90deg, transparent 0 47px, rgba(255, 255, 255, 0.035) 48px),
    repeating-linear-gradient(0deg, transparent 0 47px, rgba(255, 255, 255, 0.025) 48px);
  content: "";
}

.metric-depth {
  position: relative;
  overflow: hidden;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.metric-depth::after {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 42px;
  height: 3px;
  background: var(--role-accent);
  content: "";
  opacity: 0.78;
}

.metric-depth:hover {
  border-color: var(--line-strong);
  box-shadow: var(--shadow-raised);
  transform: translateY(-2px);
}

.dashboard-command-center > section {
  animation: dashboard-section-in 280ms ease-out both;
}

.dashboard-command-center > section:nth-of-type(2) { animation-delay: 35ms; }
.dashboard-command-center > section:nth-of-type(3) { animation-delay: 70ms; }
.dashboard-command-center > section:nth-of-type(4) { animation-delay: 105ms; }

html[data-theme="dark"] .app-shell[data-role="ADMIN"],
html[data-theme="dark"] .app-shell[data-role="MEJORA_CONTINUA"] {
  --role-accent: #f4f5f7 !important;
  --role-soft: #262b32 !important;
}

html[data-theme="dark"] .app-shell[data-role="SUPERVISOR"] { --role-accent: #55d6a7 !important; --role-soft: #133229 !important; }
html[data-theme="dark"] .app-shell[data-role="CALIDAD"] { --role-accent: #ff6b7e !important; --role-soft: #35171d !important; }
html[data-theme="dark"] .app-shell[data-role="SEGURIDAD"] { --role-accent: #c3c8cf !important; --role-soft: #292e34 !important; }
html[data-theme="dark"] .app-shell[data-role="MANTENIMIENTO"] { --role-accent: #69b9ff !important; --role-soft: #142b3f !important; }
html[data-theme="dark"] .app-shell[data-module="kaizen"] { --role-accent: #f2bf49 !important; --role-soft: #332a14 !important; }
html[data-theme="dark"] .app-shell[data-module="genba"] { --role-accent: #ff5572 !important; --role-soft: #35171e !important; }
html[data-theme="dark"] .capture-theme { --role-accent: #55d6a7; --role-soft: #133229; }

html[data-theme="dark"] .app-shell:is([data-role="ADMIN"], [data-role="MEJORA_CONTINUA"]) .btn-primary {
  background: var(--brand-red);
}

html[data-theme="dark"] .bg-white { background-color: var(--surface-elevated) !important; }
html[data-theme="dark"] .brand-logo-surface { background-color: #ffffff !important; }
html[data-theme="dark"] .bg-panel,
html[data-theme="dark"] .bg-slate-50 { background-color: var(--surface-subtle) !important; }
html[data-theme="dark"] .bg-slate-100 { background-color: #242932 !important; }
html[data-theme="dark"] .border-line,
html[data-theme="dark"] .border-slate-200 { border-color: var(--line) !important; }
html[data-theme="dark"] .divide-line > :not([hidden]) ~ :not([hidden]) { border-color: var(--line) !important; }
html[data-theme="dark"] .text-ink,
html[data-theme="dark"] .text-slate-950,
html[data-theme="dark"] .text-slate-900,
html[data-theme="dark"] .text-slate-800 { color: #f5f7fa !important; }
html[data-theme="dark"] .text-slate-700,
html[data-theme="dark"] .text-slate-600 { color: #cbd2dc !important; }
html[data-theme="dark"] .text-slate-500 { color: #9da6b3 !important; }
html[data-theme="dark"] .text-slate-400 { color: #8993a1 !important; }
html[data-theme="dark"] .text-brand-700 { color: #ff6983 !important; }
html[data-theme="dark"] .bg-brand-50 { background-color: #35151d !important; }
html[data-theme="dark"] .bg-brand-100 { background-color: #481822 !important; }
html[data-theme="dark"] .border-brand-100 { border-color: #6d2634 !important; }
html[data-theme="dark"] .bg-emerald-50 { background-color: #123129 !important; }
html[data-theme="dark"] .text-emerald-900,
html[data-theme="dark"] .text-emerald-800,
html[data-theme="dark"] .text-emerald-700 { color: #67ddb1 !important; }
html[data-theme="dark"] .bg-blue-50 { background-color: #142d43 !important; }
html[data-theme="dark"] .text-blue-700 { color: #77bfff !important; }
html[data-theme="dark"] .bg-rose-50 { background-color: #35171d !important; }
html[data-theme="dark"] .text-rose-700 { color: #ff7b8e !important; }
html[data-theme="dark"] .bg-amber-50 { background-color: #342a14 !important; }
html[data-theme="dark"] .text-amber-800,
html[data-theme="dark"] .text-amber-700 { color: #f2c35f !important; }
html[data-theme="dark"] .hover\:bg-slate-50:hover,
html[data-theme="dark"] .hover\:bg-white:hover { background-color: var(--surface-subtle) !important; }
html[data-theme="dark"] .alert-danger { border-color: #6b2934; background: #2c151a; color: #ff9aaa; }
html[data-theme="dark"] .alert-warning { border-color: #654c22; background: #2c2415; color: #f1c76a; }
html[data-theme="dark"] .alert-info { border-color: #24547c; background: #142638; color: #87c5fa; }

@keyframes command-panel-in {
  from { opacity: 0; transform: translateY(-8px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes quick-view-in {
  from { opacity: 0; transform: translateX(28px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes dashboard-section-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.org-dialog::backdrop {
  background: rgba(17, 20, 18, 0.56);
  backdrop-filter: blur(3px);
}

@media (min-width: 640px) {
  .app-main {
    padding: 1.75rem 1.5rem 6.5rem;
  }
}

@media (min-width: 1024px) {
  .workspace-topbar {
    position: sticky;
    z-index: 40;
    top: 0;
    display: flex;
    min-height: 70px;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid var(--line);
    background: color-mix(in srgb, var(--surface) 94%, transparent);
    padding: 0.7rem 2rem;
    backdrop-filter: blur(18px);
  }

  .sidebar-collapse-button {
    display: inline-flex;
  }

  .app-sidebar {
    position: fixed;
    z-index: 50;
    inset: 0 auto 0 0;
    display: flex;
    width: 276px;
    flex-direction: column;
    border-top: 5px solid var(--brand-red);
    border-right: 1px solid var(--line);
    background: var(--surface);
    transition: width 180ms ease;
  }

  .app-sidebar-brand {
    border-bottom: 1px solid var(--line);
    padding: 1.05rem 1rem;
  }

  .app-sidebar-scroll {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    padding: 1rem 0.8rem;
  }

  .app-sidebar-footer {
    border-top: 1px solid var(--line);
    background: var(--surface-subtle);
    padding: 0.9rem 1rem;
  }

  .app-content {
    margin-left: 276px;
    transition: margin-left 180ms ease;
  }

  .app-main {
    padding: 2rem 2rem 3rem;
  }

  .app-shell.is-sidebar-collapsed .app-sidebar {
    width: 88px;
  }

  .app-shell.is-sidebar-collapsed .app-content {
    margin-left: 88px;
  }

  .app-shell.is-sidebar-collapsed .app-sidebar-brand {
    padding: 0.85rem 0.65rem;
  }

  .app-shell.is-sidebar-collapsed .sidebar-brand-row {
    flex-direction: column;
  }

  .app-shell.is-sidebar-collapsed .sidebar-collapse-button {
    width: 38px;
    height: 38px;
    flex-basis: 38px;
  }

  .app-shell.is-sidebar-collapsed .module-switcher {
    grid-auto-flow: row;
    grid-auto-rows: 38px;
  }

  .app-shell.is-sidebar-collapsed .module-switcher-link span,
  .app-shell.is-sidebar-collapsed .nav-group-label,
  .app-shell.is-sidebar-collapsed .app-nav-link > .min-w-0,
  .app-shell.is-sidebar-collapsed .user-summary > .min-w-0,
  .app-shell.is-sidebar-collapsed .user-summary > svg,
  .app-shell.is-sidebar-collapsed .role-chip {
    display: none;
  }

  .app-shell.is-sidebar-collapsed .app-sidebar-scroll {
    padding-right: 0.55rem;
    padding-left: 0.55rem;
  }

  .app-shell.is-sidebar-collapsed .app-nav-link {
    justify-content: center;
    padding: 0.35rem;
  }

  .app-shell.is-sidebar-collapsed .app-nav-link .nav-count {
    position: absolute;
    top: 1px;
    right: 0;
    min-width: 18px;
    height: 18px;
    padding: 0 0.25rem;
    font-size: 0.58rem;
  }

  .app-shell.is-sidebar-collapsed .app-sidebar-footer {
    padding: 0.75rem 0.55rem;
  }

  .app-shell.is-sidebar-collapsed .user-summary,
  .app-shell.is-sidebar-collapsed .app-sidebar-footer > div {
    justify-content: center;
  }

  .mobile-topbar,
  .mobile-module-strip,
  .mobile-bottom-nav,
  .mobile-drawer-layer {
    display: none;
  }
}

@media (min-width: 1024px) and (max-width: 1199px) {
  .workspace-search-trigger {
    min-width: 44px;
    width: 44px;
    justify-content: center;
    padding: 0;
  }

  .workspace-search-trigger > span,
  .workspace-profile-copy {
    display: none;
  }
}

@media (max-width: 639px) {
  .btn {
    min-height: 46px;
  }

  .mobile-card-list {
    display: grid;
    gap: 0.75rem;
  }

  .desktop-table-only {
    display: none;
  }

  .command-search-panel {
    width: calc(100vw - 1rem);
    max-height: calc(100dvh - 1rem);
    margin-top: 0.5rem;
  }

  .command-search-results {
    max-height: calc(100dvh - 84px);
  }

  .quick-view-panel {
    width: 100%;
  }
}

@media (min-width: 640px) {
  .mobile-card-list {
    display: none;
  }
}

@media print {
  body {
    background: #ffffff;
  }

  .app-sidebar,
  .mobile-topbar,
  .mobile-module-strip,
  .mobile-bottom-nav,
  .no-print {
    display: none !important;
  }

  .app-content {
    margin: 0;
  }

  .app-main {
    max-width: none;
    padding: 0;
  }

  .surface {
    break-inside: avoid;
    box-shadow: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-sidebar,
  .app-content,
  .metric-depth,
  .surface-interactive,
  .dashboard-command-center > section,
  .command-search-panel,
  .quick-view-panel {
    animation: none !important;
    scroll-behavior: auto !important;
    transition: none !important;
  }
}
~~~~~~

### `src/app/layout.tsx`

~~~~~~tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "PROpEx Ideas de Mejora",
  description: "Sistema de Ideas de Mejora PROpEx",
  icons: {
    icon: "/brand/mejora-continua-logo-rojo.png",
    apple: "/brand/mejora-continua-logo-rojo.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
~~~~~~

### `src/app/login/page.tsx`

~~~~~~tsx
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Footprints, FolderKanban, Lightbulb, LockKeyhole, QrCode, ShieldCheck } from "lucide-react";
import { loginAction } from "@/app/actions";
import { ThemeSelector } from "@/components/theme-selector";

type LoginProps = {
  searchParams: Promise<{ error?: string; modulo?: string }>;
};

export default async function LoginPage({ searchParams }: LoginProps) {
  const params = await searchParams;
  const module = params.modulo === "kaizen" || params.modulo === "genba" ? params.modulo : "ideas";
  const moduleCopy = {
    ideas: { eyebrow: "Sistema de Ideas de Mejora", title: "Entrar a mi bandeja", description: "Captura, validación, implementación y cierre de ideas.", icon: Lightbulb },
    kaizen: { eyebrow: "Proyectos Kaizen", title: "Entrar a proyectos", description: "Charter, actividades, avance, Kanban y calendario Gantt.", icon: FolderKanban },
    genba: { eyebrow: "Recorridos GENBA", title: "Entrar a recorridos", description: "Hallazgos, asistencia, evidencias y cumplimiento de actividades.", icon: Footprints }
  }[module];
  const ModuleIcon = moduleCopy.icon;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <Image alt="Planta de produccion Proboca" className="object-cover" fill priority sizes="100vw" src="/brand/proboca-servicios.jpg" />
      <div className="absolute inset-0 bg-slate-950/75" />
      <div className="absolute inset-x-0 top-0 z-10 h-1.5 bg-brand-500" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link className="flex items-center gap-3" href="/">
            <span className="brand-logo-surface flex h-12 w-24 items-center justify-center bg-white p-2">
              <Image alt="Proboca" className="h-auto w-full object-contain" height={72} priority width={216} src="/brand/proboca-logo.png" />
            </span>
            <span>
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-100">PROpEx</span>
              <span className="block text-sm font-extrabold">Mejora Operativa</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <Link className="btn border-white/25 bg-white/10 text-white hover:bg-white/20" href="/">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Inicio
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_430px] lg:py-14">
          <div className="max-w-2xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-brand-100">Portal PROpEx</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">Un acceso para mejorar cada día.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-200">
              Ideas de Mejora, Proyectos Kaizen y Recorridos GENBA en un mismo espacio de trabajo.
            </p>
            <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                ["1", "Ideas"],
                ["2", "Kaizen"],
                ["3", "GENBA"]
              ].map(([number, label]) => (
                <div className="border-l-2 border-brand-500 pl-3" key={number}>
                  <p className="text-xs font-extrabold text-brand-100">PASO {number}</p>
                  <p className="mt-1 text-sm font-extrabold">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <form action={loginAction} className="rounded-lg border border-white/20 bg-white p-6 text-ink shadow-2xl sm:p-8">
            <nav aria-label="Elegir sistema" className="mb-6 grid grid-cols-3 gap-1 rounded-lg border border-line bg-panel p-1">
              {[
                ["ideas", "Ideas", Lightbulb],
                ["kaizen", "Kaizen", FolderKanban],
                ["genba", "GENBA", Footprints]
              ].map(([value, label, Icon]) => {
                const ItemIcon = Icon as typeof Lightbulb;
                const active = module === value;
                return <Link aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-extrabold ${active ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`} href={`/login?modulo=${value}`} key={String(value)}><ItemIcon className="h-4 w-4" aria-hidden />{String(label)}</Link>;
              })}
            </nav>
            <input name="destination" type="hidden" value={module} />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-brand-700">{moduleCopy.eyebrow}</p>
                <h2 className="mt-1 text-2xl font-extrabold">{moduleCopy.title}</h2>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                <ModuleIcon className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{moduleCopy.description}</p>

            {params.error ? (
              <div className="alert alert-danger mt-5">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>El correo o la contraseña no coinciden. Revisa los datos e intenta de nuevo.</span>
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              <label>
                <span className="label">Correo</span>
                <input autoComplete="email" className="field" name="email" placeholder="nombre@proboca.net" type="email" required />
              </label>
              <label>
                <span className="label">Contraseña</span>
                <input autoComplete="current-password" className="field" name="password" placeholder="Ingresa tu contraseña" type="password" required />
              </label>
            </div>

            <button className="btn btn-primary mt-6 w-full" type="submit">
              {moduleCopy.title}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <Link className="btn btn-secondary mt-3 w-full" href="/#areas">
              <QrCode className="h-4 w-4" aria-hidden />
              Registrar una idea sin entrar
            </Link>
            <p className="mt-5 text-center text-xs leading-5 text-slate-500">El acceso y las acciones quedan registrados para proteger la trazabilidad del proceso.</p>
          </form>
        </section>
      </div>
    </main>
  );
}
~~~~~~

### `src/app/page.tsx`

~~~~~~tsx
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, LogIn, QrCode } from "lucide-react";
import { CaptureAreaExplorer } from "@/components/capture-area-explorer";
import { ThemeSelector } from "@/components/theme-selector";
import { getOrganizationStructure } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const structure = await getOrganizationStructure();

  return (
    <main className="min-h-screen bg-white text-ink">
      <section className="relative flex min-h-[72svh] flex-col overflow-hidden bg-slate-950 text-white">
        <Image alt="Personal y equipo de proceso en Proboca" className="object-cover" fill priority sizes="100vw" src="/brand/proboca-servicios.jpg" />
        <div className="absolute inset-0 bg-slate-950/75" />
        <header className="relative z-10 border-t-4 border-brand-500">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="brand-logo-surface flex h-12 w-24 items-center justify-center bg-white p-2">
                <Image alt="Proboca" className="h-auto w-full object-contain" height={72} width={216} src="/brand/proboca-logo.png" />
              </span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-100">PROpEx</p>
                <p className="text-sm font-extrabold">Ideas de Mejora</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeSelector />
              <Link className="btn border-white/30 bg-white/10 text-white hover:bg-white/20" href="/login">
                <LogIn className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Entrar al panel</span>
                <span className="sm:hidden">Entrar</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-100">
              <span className="h-px w-9 bg-brand-500" />
              Mejora Continua Proboca
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl">PROpEx Ideas de Mejora</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100 sm:text-lg">
              Tu experiencia en planta puede hacer el trabajo más seguro, simple y eficiente. Registra la oportunidad y sigue su avance en un solo lugar.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a className="btn btn-brand" href="#areas">
                <QrCode className="h-4 w-4" aria-hidden />
                Registrar una idea
              </a>
              <Link className="btn border-white/30 bg-white text-slate-950" href="/login">
                Consultar seguimientos
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-200">
              {[
                "Sin iniciar sesión",
                "Desde cualquier celular",
                "Folio inmediato"
              ].map((item) => (
                <span className="flex items-center gap-1.5" key={item}>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="relative z-10 h-2 bg-brand-500" />
      </section>

      <section className="scroll-mt-6 bg-white" id="areas">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-brand-700">Captura directa</p>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">¿En qué área viste la oportunidad?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Selecciona el área. El sistema enviará la idea al supervisor correcto automáticamente.</p>
          </div>
          <div className="mt-7"><CaptureAreaExplorer structure={structure} /></div>
        </div>
      </section>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 font-bold text-slate-700"><Building2 className="h-4 w-4" aria-hidden /> Productora de Bocados Carnicos</p>
          <p>PROpEx · Sistema interno de Ideas de Mejora</p>
        </div>
      </footer>
    </main>
  );
}
~~~~~~

## 5.5 Componentes de UI

### `src/components/app-shell.tsx`

~~~~~~tsx
"use client";

import type { Role } from "@prisma/client";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarRange,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Download,
  Footprints,
  FolderKanban,
  Gauge,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  QrCode,
  Settings,
  ShieldCheck,
  UserCheck,
  Wrench,
  X
} from "lucide-react";
import { logoutAction } from "@/app/actions";
import { ThemeSelector } from "@/components/theme-selector";
import { WorkspacePeriodControl, WorkspaceSearch } from "@/components/workspace-controls";
import { roleLabels } from "@/lib/domain";

type ShellUser = {
  name: string;
  email: string;
  role: Role;
  kaizenAccess: boolean;
  genbaAccess: boolean;
};

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  roles: Role[];
  group: "work" | "control" | "system";
};

const ideaNav: NavItem[] = [
  { href: "/dashboard", label: "Hoy", shortLabel: "Hoy", icon: LayoutDashboard, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "work" },
  { href: "/supervisor", label: "Bandeja de supervisor", shortLabel: "Bandeja", icon: UserCheck, roles: ["ADMIN", "SUPERVISOR"], group: "work" },
  { href: "/validaciones/calidad", label: "Calidad e inocuidad", shortLabel: "Calidad", icon: ShieldCheck, roles: ["ADMIN", "CALIDAD"], group: "work" },
  { href: "/validaciones/seguridad", label: "Seguridad industrial", shortLabel: "Seguridad", icon: ClipboardCheck, roles: ["ADMIN", "SEGURIDAD"], group: "work" },
  { href: "/validaciones/mantenimiento", label: "Mantenimiento", icon: Wrench, roles: ["ADMIN", "MANTENIMIENTO"], group: "work" },
  { href: "/mejora", label: "Mejora Continua", shortLabel: "Mejora", icon: Gauge, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "work" },
  { href: "/implementacion", label: "Implementación", shortLabel: "Avances", icon: ListChecks, roles: ["ADMIN", "MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR"], group: "work" },
  { href: "/ideas", label: "Todas las ideas", shortLabel: "Ideas", icon: ClipboardList, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "control" },
  { href: "/kanban", label: "Flujo Kanban", shortLabel: "Kanban", icon: KanbanSquare, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "control" },
  { href: "/vencidas", label: "Compromisos vencidos", shortLabel: "Vencidas", icon: BarChart3, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "control" },
  { href: "/qr", label: "QR por planta", shortLabel: "QR", icon: QrCode, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "system" },
  { href: "/reportes", label: "Reportes", icon: Download, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "system" },
  { href: "/notificaciones", label: "Notificaciones", shortLabel: "Avisos", icon: Bell, roles: ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO"], group: "system" },
  { href: "/auditoria", label: "Auditoría", icon: BarChart3, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "system" },
  { href: "/configuracion/estructura", label: "Estructura organizacional", shortLabel: "Estructura", icon: Network, roles: ["ADMIN"], group: "system" },
  { href: "/configuracion", label: "Configuración", shortLabel: "Ajustes", icon: Settings, roles: ["ADMIN"], group: "system" }
];

const kaizenNav: NavItem[] = [
  { href: "/kaizen", label: "Panel de proyectos", shortLabel: "Kaizen", icon: LayoutDashboard, roles: ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO", "COLABORADOR"], group: "work" },
  { href: "/kaizen/nuevo", label: "Nuevo proyecto", shortLabel: "Nuevo", icon: Plus, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "work" },
  { href: "/kaizen/gantt", label: "Calendario Gantt", shortLabel: "Gantt", icon: CalendarRange, roles: ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO", "COLABORADOR"], group: "control" },
  { href: "/kaizen/kanban", label: "Kanban por proyecto", shortLabel: "Kanban", icon: FolderKanban, roles: ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO", "COLABORADOR"], group: "control" }
];

const genbaNav: NavItem[] = [
  { href: "/genba", label: "Panel de recorridos", shortLabel: "GENBA", icon: LayoutDashboard, roles: ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO", "COLABORADOR"], group: "work" },
  { href: "/genba/nuevo", label: "Nuevo recorrido", shortLabel: "Nuevo", icon: Plus, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "work" },
  { href: "/genba/kanban", label: "Kanban por recorrido", shortLabel: "Kanban", icon: FolderKanban, roles: ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO", "COLABORADOR"], group: "control" }
];

const roleTheme: Record<Role, { accent: string; soft: string; home: string; context: string }> = {
  ADMIN: { accent: "#171717", soft: "#f0f0f0", home: "/dashboard", context: "Control del sistema" },
  MEJORA_CONTINUA: { accent: "#171717", soft: "#f0f0f0", home: "/dashboard", context: "Seguimiento global" },
  SUPERVISOR: { accent: "#14835f", soft: "#e9f6f0", home: "/supervisor", context: "Seguimiento de tu área" },
  CALIDAD: { accent: "#d32236", soft: "#fff0f2", home: "/validaciones/calidad", context: "Calidad e inocuidad" },
  SEGURIDAD: { accent: "#626a70", soft: "#f0f2f3", home: "/validaciones/seguridad", context: "Seguridad industrial" },
  MANTENIMIENTO: { accent: "#176fc1", soft: "#edf5fc", home: "/validaciones/mantenimiento", context: "Factibilidad técnica" },
  COLABORADOR: { accent: "#ea0029", soft: "#fff1f4", home: "/", context: "Captura pública" }
};

const groupLabels = {
  work: "Trabajo pendiente",
  control: "Seguimiento",
  system: "Herramientas"
};

function isCurrentPath(pathname: string, href: string) {
  if (["/dashboard", "/kaizen", "/genba"].includes(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NotificationBadge({ count }: { count: number }) {
  if (!count) return null;
  return <span className="nav-count">{count > 99 ? "99+" : count}</span>;
}

function NavigationLink({ item, pathname, pendingNotifications, collapsed = false, onNavigate }: { item: NavItem; pathname: string; pendingNotifications: number; collapsed?: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  const active = isCurrentPath(pathname, item.href);
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`app-nav-link ${active ? "is-active" : ""}`}
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
    >
      <span className="app-nav-icon">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.href === "/notificaciones" ? <NotificationBadge count={pendingNotifications} /> : null}
    </Link>
  );
}

function BrandBlock({ compact = false, collapsed = false }: { compact?: boolean; collapsed?: boolean }) {
  if (collapsed) {
    return (
      <Link aria-label="PROpEx - Inicio" className="collapsed-brand" href="/">
        <Image alt="Mejora Continua" className="h-full w-full object-contain" height={64} priority width={64} src="/brand/mejora-continua-logo-rojo.png" />
      </Link>
    );
  }
  return (
    <Link className="flex min-w-0 items-center gap-3" href="/">
      <span className={`brand-logo-surface flex shrink-0 items-center justify-center border border-slate-200 bg-white ${compact ? "h-10 w-[84px] p-1.5" : "h-12 w-[102px] p-2"}`}>
        <Image alt="Proboca" className="h-auto w-full object-contain" height={72} priority width={216} src="/brand/proboca-logo.png" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-700">PROpEx</span>
        <span className="block truncate text-sm font-extrabold text-slate-950">Mejora Operativa</span>
      </span>
    </Link>
  );
}

function ModuleSwitcher({ home, access, compact = false, onNavigate }: { home: string; access: { kaizen: boolean; genba: boolean }; compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const modules = [
    { href: home, label: "Ideas", icon: ClipboardList, active: !pathname.startsWith("/kaizen") && !pathname.startsWith("/genba"), visible: true },
    { href: "/kaizen", label: "Kaizen", icon: FolderKanban, active: pathname.startsWith("/kaizen"), visible: access.kaizen },
    { href: "/genba", label: "GENBA", icon: Footprints, active: pathname.startsWith("/genba"), visible: access.genba }
  ].filter((item) => item.visible);
  return (
    <nav aria-label="Cambiar de módulo" className={`module-switcher ${compact ? "is-compact" : ""}`}>
      {modules.map((item) => {
        const Icon = item.icon;
        return <Link aria-current={item.active ? "page" : undefined} className={`module-switcher-link ${item.active ? "is-active" : ""}`} href={item.href} key={item.label} onClick={onNavigate}><Icon className="h-4 w-4" aria-hidden /><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}

export function AppShell({ user, children, pendingNotifications, moduleAccess }: { user: ShellUser; children: ReactNode; pendingNotifications: number; moduleAccess: { kaizen: boolean; genba: boolean } }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const roleBaseTheme = roleTheme[user.role];
  const currentModule = pathname.startsWith("/kaizen") ? "kaizen" : pathname.startsWith("/genba") ? "genba" : "ideas";
  const theme = currentModule === "kaizen"
    ? { ...roleBaseTheme, accent: "#a16207", soft: "#fff7d6", context: "Proyectos Kaizen", home: "/kaizen" }
    : currentModule === "genba"
      ? { ...roleBaseTheme, accent: "#ea0029", soft: "#fff1f4", context: "Recorridos GENBA", home: "/genba" }
      : roleBaseTheme;
  const visibleNav = useMemo(() => {
    const source = currentModule === "kaizen" ? kaizenNav : currentModule === "genba" ? genbaNav : ideaNav;
    return source.filter((item) => item.roles.includes(user.role));
  }, [currentModule, user.role]);
  const mobileItems = useMemo(() => {
    const preferred = currentModule === "ideas"
      ? [theme.home, user.role === "ADMIN" || user.role === "MEJORA_CONTINUA" ? "/ideas" : "/implementacion", "/notificaciones"]
      : currentModule === "kaizen"
        ? ["/kaizen", "/kaizen/gantt", "/kaizen/kanban"]
        : ["/genba", "/genba/kanban"];
    return preferred.map((href) => visibleNav.find((item) => item.href === href)).filter((item): item is NavItem => Boolean(item)).filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href) === index).slice(0, 3);
  }, [currentModule, theme.home, user.role, visibleNav]);
  const activeItem = visibleNav.find((item) => isCurrentPath(pathname, item.href));
  const searchItems = useMemo(() => {
    const moduleSources = [
      { label: "Ideas", visible: true, items: ideaNav },
      { label: "Kaizen", visible: moduleAccess.kaizen, items: kaizenNav },
      { label: "GENBA", visible: moduleAccess.genba, items: genbaNav }
    ];
    const seen = new Set<string>();
    return moduleSources.flatMap((module) => module.visible
      ? module.items
        .filter((item) => item.roles.includes(user.role) && !seen.has(item.href))
        .map((item) => {
          seen.add(item.href);
          return { href: item.href, label: item.label, group: `${module.label} · ${groupLabels[item.group]}` };
        })
      : []);
  }, [moduleAccess.genba, moduleAccess.kaizen, user.role]);

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem("propex-sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("propex-sidebar-collapsed", String(next));
      return next;
    });
  };

  const shellStyle = {
    "--role-accent": theme.accent,
    "--role-soft": theme.soft
  } as CSSProperties;

  const navigation = (onNavigate?: () => void, collapsed = false) => (
    <nav aria-label="Navegacion principal" className="space-y-5">
      {(["work", "control", "system"] as const).map((group) => {
        const items = visibleNav.filter((item) => item.group === group);
        if (!items.length) return null;
        return (
          <div key={group}>
            <p className="nav-group-label">{groupLabels[group]}</p>
            <div className="mt-1.5 space-y-1">
              {items.map((item) => (
                <NavigationLink collapsed={collapsed} item={item} key={item.href} onNavigate={onNavigate} pathname={pathname} pendingNotifications={pendingNotifications} />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className={`app-shell ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`} data-module={currentModule} data-role={user.role} style={shellStyle}>
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <div className="sidebar-brand-row">
            <BrandBlock collapsed={sidebarCollapsed} />
            <button
              aria-label={sidebarCollapsed ? "Expandir navegación" : "Contraer navegación"}
              className="icon-button sidebar-collapse-button"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expandir navegación" : "Contraer navegación"}
              type="button"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden /> : <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden />}
            </button>
          </div>
          <div className="mt-4"><ModuleSwitcher access={moduleAccess} home={roleBaseTheme.home} /></div>
        </div>
        <div className="app-sidebar-scroll">{navigation(undefined, sidebarCollapsed)}</div>
        <div className="app-sidebar-footer">
          <Link className="user-summary" href="/notificaciones">
            <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-extrabold text-slate-950">{user.name}</span>
              <span className="block truncate text-xs text-slate-500">{roleLabels[user.role]}</span>
            </span>
            <Bell className="h-4 w-4 text-slate-500" aria-hidden />
          </Link>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="role-chip">{theme.context}</span>
            <form action={logoutAction}>
              <button aria-label="Cerrar sesion" className="icon-button" title="Cerrar sesion" type="submit">
                <LogOut className="h-[18px] w-[18px]" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="app-content">
        <header className="workspace-topbar">
          <div className="workspace-topbar-context">
            <span className="workspace-context-mark" />
            <span className="min-w-0">
              <span className="block text-[10px] font-extrabold uppercase text-slate-500">{theme.context}</span>
              <span className="mt-0.5 block truncate text-sm font-extrabold text-ink">{activeItem?.label ?? "Espacio de trabajo"}</span>
            </span>
          </div>
          <div className="workspace-topbar-actions">
            <WorkspaceSearch items={searchItems} />
            <WorkspacePeriodControl />
            <ThemeSelector />
            <Link aria-label={`${pendingNotifications} notificaciones pendientes`} className="icon-button relative" href="/notificaciones" title="Notificaciones">
              <Bell className="h-[18px] w-[18px]" aria-hidden />
              {pendingNotifications ? <span className="notification-dot" /> : null}
            </Link>
            <details className="workspace-profile">
              <summary aria-label="Abrir perfil" title="Perfil de usuario">
                <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
                <span className="workspace-profile-copy">
                  <span className="block max-w-36 truncate text-xs font-extrabold text-ink">{user.name}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">{roleLabels[user.role]}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
              </summary>
              <div className="workspace-profile-menu">
                <p className="truncate text-sm font-extrabold text-ink">{user.name}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
                <p className="mt-3 border-t border-line pt-3 text-[11px] font-bold text-slate-500">{theme.context}</p>
                <form action={logoutAction} className="mt-3">
                  <button className="btn btn-secondary w-full" type="submit"><LogOut className="h-4 w-4" aria-hidden />Cerrar sesión</button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <header className="mobile-topbar">
          <BrandBlock compact />
          <div className="flex items-center gap-2">
            <Link aria-label={`${pendingNotifications} notificaciones pendientes`} className="icon-button relative" href="/notificaciones">
              <Bell className="h-5 w-5" aria-hidden />
              {pendingNotifications ? <span className="notification-dot" /> : null}
            </Link>
            <button aria-expanded={menuOpen} aria-label="Abrir menu" className="icon-button" onClick={() => setMenuOpen(true)} type="button">
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        <div className="mobile-module-strip"><ModuleSwitcher access={moduleAccess} compact home={roleBaseTheme.home} /></div>

        <main className="app-main">{children}</main>
      </div>

      <nav aria-label="Accesos rapidos" className="mobile-bottom-nav">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = isCurrentPath(pathname, item.href);
          return (
            <Link aria-current={active ? "page" : undefined} className={`mobile-bottom-link ${active ? "is-active" : ""}`} href={item.href} key={item.href}>
              <span className="relative">
                <Icon className="h-5 w-5" aria-hidden />
                {item.href === "/notificaciones" && pendingNotifications ? <span className="notification-dot -right-1 -top-1" /> : null}
              </span>
              <span>{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
        <button className={`mobile-bottom-link ${menuOpen ? "is-active" : ""}`} onClick={() => setMenuOpen(true)} type="button">
          <Menu className="h-5 w-5" aria-hidden />
          <span>Menu</span>
        </button>
      </nav>

      {menuOpen ? (
        <div className="mobile-drawer-layer" role="presentation">
          <button aria-label="Cerrar menu" className="mobile-drawer-backdrop" onClick={() => setMenuOpen(false)} type="button" />
          <aside aria-label="Menu movil" className="mobile-drawer">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <BrandBlock compact />
              <button aria-label="Cerrar menu" className="icon-button" onClick={() => setMenuOpen(false)} type="button">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="border-b border-slate-200 p-4">
              <p className="text-sm font-extrabold text-slate-950">{user.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{roleLabels[user.role]} · {theme.context}</p>
              <div className="mt-3"><ModuleSwitcher access={moduleAccess} compact home={roleBaseTheme.home} onNavigate={() => setMenuOpen(false)} /></div>
              <div className="mobile-workspace-preferences">
                <WorkspaceSearch fullWidth items={searchItems} />
                <WorkspacePeriodControl fullWidth />
                <ThemeSelector showLabel />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{navigation(() => setMenuOpen(false))}</div>
            <form action={logoutAction} className="border-t border-slate-200 p-4">
              <button className="btn btn-secondary w-full" type="submit">
                <LogOut className="h-4 w-4" aria-hidden />
                Cerrar sesion
              </button>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
~~~~~~

### `src/components/capture-area-explorer.tsx`

~~~~~~tsx
"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronRight,
  Factory,
  MapPin,
  Search,
  Warehouse
} from "lucide-react";
import { useMemo, useState } from "react";
import type { OrganizationNode, OrganizationStructure, PlantCode } from "@/lib/organization-types";

type CaptureItem = {
  node: OrganizationNode;
  path: OrganizationNode[];
};

type CaptureGroup = {
  id: string;
  code: string;
  name: string;
  items: CaptureItem[];
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function buildGroups(nodes: OrganizationNode[]) {
  const groups = new Map<string, CaptureGroup>();

  function visit(node: OrganizationNode, path: OrganizationNode[], department: OrganizationNode | null) {
    const nextPath = [...path, node];
    const currentDepartment = node.type === "DEPARTAMENTO" ? node : department;
    const groupNode = currentDepartment ?? node;

    if (node.qrEnabled && node.active && node.captureArea?.active) {
      const group = groups.get(groupNode.id) ?? {
        id: groupNode.id,
        code: groupNode.code,
        name: currentDepartment?.name ?? "Otras áreas",
        items: []
      };
      group.items.push({ node, path: nextPath });
      groups.set(groupNode.id, group);
    }

    node.children.forEach((child) => visit(child, nextPath, currentDepartment));
  }

  nodes.forEach((node) => visit(node, [], null));
  return [...groups.values()].sort((left, right) => {
    const leftPriority = left.code.endsWith("-PROD") ? 0 : 1;
    const rightPriority = right.code.endsWith("-PROD") ? 0 : 1;
    return leftPriority - rightPriority || left.name.localeCompare(right.name, "es");
  });
}

function groupMatches(group: CaptureGroup, query: string) {
  if (normalize(`${group.name} ${group.code}`).includes(query)) return true;
  return group.items.some(({ node, path }) => normalize([
    node.name,
    node.code,
    node.captureArea?.code,
    node.responsible,
    ...path.map((item) => item.name)
  ].filter(Boolean).join(" ")).includes(query));
}

export function CaptureAreaExplorer({ structure }: { structure: OrganizationStructure }) {
  const [plant, setPlant] = useState<PlantCode | null>(null);
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const groups = useMemo(() => ({
    APO: buildGroups(structure.APO.nodes),
    CAR: buildGroups(structure.CAR.nodes)
  }), [structure]);

  function selectPlant(code: PlantCode) {
    const production = groups[code].find((group) => group.code.endsWith("-PROD"));
    setPlant(code);
    setQuery("");
    setOpenGroups(new Set(production ? [production.id] : []));
  }

  function toggleGroup(groupId: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  if (!plant) {
    return (
      <div className="border border-line bg-white">
        <div className="grid sm:grid-cols-2">
          <button className="group flex min-h-28 items-center gap-4 border-b border-line p-5 text-left transition hover:bg-brand-50 sm:border-b-0 sm:border-r" onClick={() => selectPlant("APO")} type="button">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-brand-500 text-white"><Factory className="h-6 w-6" aria-hidden /></span>
            <span className="min-w-0 flex-1"><strong className="block text-lg text-ink">Planta Apodaca</strong><span className="mt-1 block text-sm text-slate-600">{groups.APO.length} departamentos disponibles</span></span>
            <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500" aria-hidden />
          </button>
          <button className="group flex min-h-28 items-center gap-4 p-5 text-left transition hover:bg-slate-50" onClick={() => selectPlant("CAR")} type="button">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-slate-950 text-white"><Warehouse className="h-6 w-6" aria-hidden /></span>
            <span className="min-w-0 flex-1"><strong className="block text-lg text-ink">Planta El Carmen</strong><span className="mt-1 block text-sm text-slate-600">{groups.CAR.length} departamentos disponibles</span></span>
            <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-950" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  const normalizedQuery = normalize(query.trim());
  const visibleGroups = normalizedQuery ? groups[plant].filter((group) => groupMatches(group, normalizedQuery)) : groups[plant];

  return (
    <div className="border border-line bg-white">
      <div className="border-b border-line p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase text-brand-700">Planta seleccionada</p>
            <div className="mt-1 flex items-center gap-2"><MapPin className="h-5 w-5 text-brand-500" aria-hidden /><h3 className="text-lg font-extrabold text-ink">{structure[plant].name}</h3></div>
          </div>
          <label className="min-w-0 flex-[1.4]">
            <span className="label">Buscar departamento o área</span>
            <span className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden /><input className="field pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Ej. Producción, P3, Embarques..." type="search" value={query} /></span>
          </label>
          <button className="btn btn-secondary" onClick={() => { setPlant(null); setQuery(""); setOpenGroups(new Set()); }} type="button"><MapPin className="h-4 w-4" aria-hidden />Cambiar planta</button>
        </div>
      </div>

      <div className="divide-y divide-line" aria-live="polite">
        {visibleGroups.map((group) => {
          const isProduction = group.code.endsWith("-PROD");
          const isOpen = normalizedQuery ? true : openGroups.has(group.id);
          return (
            <section key={group.id}>
              <button aria-expanded={isOpen} className={`grid w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 border-l-4 px-4 py-4 text-left transition sm:px-5 ${isProduction ? "border-brand-500 bg-brand-50 hover:bg-red-100" : "border-transparent hover:bg-slate-50"}`} onClick={() => toggleGroup(group.id)} type="button">
                <span className={`flex h-10 w-10 items-center justify-center ${isProduction ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600"}`}><Building2 className="h-5 w-5" aria-hidden /></span>
                <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-ink sm:text-base">{group.name}</strong>{isProduction ? <span className="bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase text-brand-700">Principal</span> : null}</span><span className="mt-1 block text-xs text-slate-500">{group.items.length} {group.items.length === 1 ? "área" : "áreas"} para registrar</span></span>
                {isOpen ? <ChevronDown className="h-5 w-5 text-slate-500" aria-hidden /> : <ChevronRight className="h-5 w-5 text-slate-500" aria-hidden />}
              </button>

              {isOpen ? (
                <div className="divide-y divide-line border-t border-line bg-slate-50 px-3 sm:px-5">
                  {group.items.map(({ node, path }) => {
                    const areaCode = node.captureArea?.code;
                    if (!areaCode) return null;
                    const route = path.filter((item) => item.type !== "MACROPROCESO" && item.id !== node.id).map((item) => item.name).join(" / ");
                    return (
                      <Link className="group grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2 py-3 transition hover:bg-white sm:grid-cols-[100px_minmax(0,1fr)_auto]" href={`/captura/${areaCode}`} key={node.id}>
                        <span className="hidden break-all font-mono text-[11px] font-extrabold text-brand-700 sm:block">{areaCode}</span>
                        <span className="min-w-0"><span className="block text-sm font-extrabold text-ink">{node.name}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{route || group.name}<span className="sm:hidden"> · {areaCode}</span></span></span>
                        <span className="flex items-center gap-2 text-xs font-extrabold text-brand-700">Registrar<span className="hidden sm:inline"> idea</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden /></span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
        {!visibleGroups.length ? <div className="px-5 py-10 text-center"><Search className="mx-auto h-6 w-6 text-slate-400" aria-hidden /><p className="mt-3 font-extrabold text-ink">No encontramos esa área</p><p className="mt-1 text-sm text-slate-500">Prueba con otro nombre o cambia de planta.</p></div> : null}
      </div>
    </div>
  );
}
~~~~~~

### `src/components/capture-classification.tsx`

~~~~~~tsx
"use client";

import { useState } from "react";
import { Building2, Check, HardHat, PackageCheck, UsersRound, Wrench } from "lucide-react";

type Category = "A" | "B" | "C";

const categories = [
  {
    value: "A" as const,
    title: "Categoría A",
    subtitle: "Operador + supervisor",
    description: "Es sencilla, no requiere inversión ni apoyo de otro departamento."
  },
  {
    value: "B" as const,
    title: "Categoría B",
    subtitle: "Apoyo interno",
    description: "Necesita ayuda de Calidad, Seguridad o Mantenimiento."
  },
  {
    value: "C" as const,
    title: "Categoría C",
    subtitle: "Externo o cotización",
    description: "Requiere comprar, cotizar, modificar o recibir apoyo externo."
  }
];

const departments = [
  { name: "impactsQuality", title: "Calidad / Inocuidad", description: "Producto, limpieza, empaque o proceso", icon: PackageCheck, tone: "peer-checked:border-red-400 peer-checked:bg-red-50 peer-checked:text-red-900" },
  { name: "impactsSafety", title: "Seguridad", description: "Riesgo, ergonomía o condición insegura", icon: HardHat, tone: "peer-checked:border-slate-500 peer-checked:bg-slate-100 peer-checked:text-slate-900" },
  { name: "requiresMaintenance", title: "Mantenimiento", description: "Reparación, instalación o ajuste técnico", icon: Wrench, tone: "peer-checked:border-blue-400 peer-checked:bg-blue-50 peer-checked:text-blue-900" }
];

export function CaptureClassification({ initialCategory = "A" }: { initialCategory?: Category }) {
  const [category, setCategory] = useState<Category>(initialCategory);

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="label">¿Qué tipo de apoyo necesita la idea? *</legend>
        <p className="mb-3 text-xs leading-5 text-slate-600">Elige la opción que más se parezca. El supervisor podrá ajustarla después.</p>
        <div className="grid gap-2 lg:grid-cols-3">
          {categories.map((item) => (
            <label className="capture-choice cursor-pointer" key={item.value}>
              <input
                checked={category === item.value}
                className="peer sr-only"
                name="category"
                onChange={() => setCategory(item.value)}
                type="radio"
                value={item.value}
              />
              <span className="flex min-h-32 items-start gap-3 rounded-lg border border-line bg-white p-4 transition peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-950">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel text-slate-600 peer-checked:text-emerald-700">
                  {item.value === "A" ? <UsersRound className="h-5 w-5" aria-hidden /> : item.value === "B" ? <Building2 className="h-5 w-5" aria-hidden /> : <Wrench className="h-5 w-5" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold">{item.title}</span>
                  <span className="mt-0.5 block text-xs font-bold text-emerald-800">{item.subtitle}</span>
                  <span className="mt-2 block text-xs leading-5 text-slate-600">{item.description}</span>
                </span>
                <Check className={`h-4 w-4 shrink-0 text-emerald-700 ${category === item.value ? "opacity-100" : "opacity-0"}`} aria-hidden />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {category !== "A" ? (
        <fieldset>
          <legend className="label px-1">¿Qué departamentos deben apoyar para realizarla?</legend>
          <p className="mb-3 px-1 text-xs leading-5 text-slate-600">
            Marca todos los que apliquen. Si todavía no estás seguro, el supervisor puede pedir el apoyo después.
          </p>
          <div className="grid gap-2 lg:grid-cols-3">
            {departments.map((department) => {
              const Icon = department.icon;
              return (
                <label className="capture-choice cursor-pointer" key={department.name}>
                  <input className="peer sr-only" name={department.name} type="checkbox" />
                  <span className={`flex min-h-20 items-start gap-3 rounded-lg border border-line bg-white p-3 transition ${department.tone}`}>
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                    <span>
                      <span className="block text-sm font-extrabold">{department.title}</span>
                      <span className="mt-1 block text-xs leading-4 opacity-75">{department.description}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div><p className="text-sm font-extrabold">La realizarán el operador y el supervisor</p><p className="mt-1 text-xs leading-5">No necesitas seleccionar otro departamento.</p></div>
        </div>
      )}

      {category === "C" ? (
        <label className="block rounded-lg border border-slate-300 bg-panel p-4">
          <span className="label">¿Qué se necesita comprar, cotizar o solicitar externamente? *</span>
          <textarea className="field min-h-24 bg-white" name="externalSupportDetails" placeholder="Ejemplo: cotizar una guarda, comprar material o solicitar apoyo de un proveedor..." required />
        </label>
      ) : null}
    </div>
  );
}
~~~~~~

### `src/components/dashboard-command-center.tsx`

~~~~~~tsx
"use client";

import type { IdeaCategory, IdeaStatus } from "@prisma/client";
import type { EChartsOption } from "echarts";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Footprints,
  FolderKanban,
  Gauge,
  Layers3,
  Lightbulb,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Tag,
  TimerReset,
  TrendingDown,
  TrendingUp,
  UserRound,
  X,
  XCircle
} from "lucide-react";
import { ProbocaCoin } from "@/components/proboca-coin";
import { StatusPill } from "@/components/status-pill";
import { WORKSPACE_PERIOD_EVENT, WORKSPACE_PERIOD_STORAGE, type WorkspacePeriod } from "@/components/workspace-controls";
import { statusLabels } from "@/lib/domain";

const DynamicChart = dynamic(() => import("@/components/premium-chart"), {
  ssr: false,
  loading: () => <div className="flex h-72 items-center justify-center text-sm font-bold text-slate-400">Preparando visualización...</div>
});

const DAY = 86_400_000;
const PROPEX_TIME_ZONE = "America/Monterrey";

const initialStatuses: IdeaStatus[] = ["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"];
const validationStatuses: IdeaStatus[] = ["EN_VALIDACION_CALIDAD", "EN_VALIDACION_SEGURIDAD", "EN_VALIDACION_MANTENIMIENTO"];
const implementationStatuses: IdeaStatus[] = ["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA", "EN_IMPLEMENTACION", "IMPLEMENTADA", "EN_VALIDACION_FINAL"];
const approvedStatuses: IdeaStatus[] = ["APROBADA_SUPERVISOR", ...validationStatuses, ...implementationStatuses, "CERRADA"];
const rejectedStatuses: IdeaStatus[] = ["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"];

type Period = WorkspacePeriod;
type Department = "all" | "quality" | "safety" | "maintenance";

export type DashboardIdea = {
  id: string;
  folio: string;
  areaCode: string;
  collaboratorName: string;
  supervisorName: string | null;
  problem: string;
  status: IdeaStatus;
  category: IdeaCategory;
  createdAt: string;
  closedAt: string | null;
  dueDate: string | null;
  pointsAssigned: number;
  impactTypes: string[];
  impactsQuality: boolean;
  impactsSafety: boolean;
  requiresMaintenance: boolean;
};

export type DashboardPortfolio = {
  kaizen: {
    total: number;
    active: number;
    averageProgress: number;
    overdueActivities: number;
    estimatedSavings: number;
    realSavings: number;
  };
  genba: {
    total: number;
    openActivities: number;
    overdueActivities: number;
    averageAttendance: number;
  };
};

type DashboardCommandCenterProps = {
  ideas: DashboardIdea[];
  areas: string[];
  generatedAt: string;
  portfolio: DashboardPortfolio;
  timing: {
    supervisor: string;
    validation: string;
    implementation: string;
  };
};

function departmentMatches(idea: DashboardIdea, department: Department) {
  if (department === "quality") return idea.impactsQuality;
  if (department === "safety") return idea.impactsSafety;
  if (department === "maintenance") return idea.requiresMaintenance;
  return true;
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function delta(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function averageCycleDays(ideas: DashboardIdea[]) {
  const closed = ideas.filter((idea) => idea.closedAt);
  if (!closed.length) return 0;
  return Math.round(closed.reduce((sum, idea) => sum + (new Date(idea.closedAt!).getTime() - new Date(idea.createdAt).getTime()) / DAY, 0) / closed.length);
}

function nextStepFor(status: IdeaStatus) {
  if (["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"].includes(status)) return "Revisión y decisión del supervisor";
  if (["EN_VALIDACION_CALIDAD", "EN_VALIDACION_SEGURIDAD", "EN_VALIDACION_MANTENIMIENTO"].includes(status)) return "Completar la validación del área de soporte";
  if (["APROBADA_SUPERVISOR", "APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA"].includes(status)) return "Clasificar, priorizar y asignar responsable";
  if (status === "EN_IMPLEMENTACION") return "Registrar avance y evidencia de implementación";
  if (["IMPLEMENTADA", "EN_VALIDACION_FINAL"].includes(status)) return "Validar el resultado y asignar ProbocaCoins";
  if (["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(status)) return "Revisar la justificación y decidir si se reenvía";
  if (status === "VENCIDA") return "Escalar el compromiso o acordar una nueva fecha";
  if (status === "CERRADA") return "Consultar evidencia y resultado final";
  return "Revisar el expediente y definir la siguiente acción";
}

function trendBuckets(ideas: DashboardIdea[], period: Period) {
  const monthly = period === "365" || period === "all";
  const bucketMap = new Map<string, { label: string; created: number; closed: number; sort: number }>();

  const add = (dateValue: string, key: "created" | "closed") => {
    const date = new Date(dateValue);
    const start = monthly
      ? new Date(date.getFullYear(), date.getMonth(), 1)
      : new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
    const id = monthly ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}` : start.toISOString().slice(0, 10);
    const label = monthly
      ? start.toLocaleDateString("es-MX", { month: "short", year: "2-digit", timeZone: PROPEX_TIME_ZONE })
      : start.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: PROPEX_TIME_ZONE });
    const bucket = bucketMap.get(id) ?? { label, created: 0, closed: 0, sort: start.getTime() };
    bucket[key] += 1;
    bucketMap.set(id, bucket);
  };

  ideas.forEach((idea) => {
    add(idea.createdAt, "created");
    if (idea.closedAt) add(idea.closedAt, "closed");
  });

  return [...bucketMap.values()].sort((a, b) => a.sort - b.sort).slice(monthly ? -12 : -13);
}

function ChartPanel({ eyebrow, title, description, children, action }: { eyebrow: string; title: string; description: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <article className="surface overflow-hidden rounded-lg">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-brand-700">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-extrabold text-ink">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </article>
  );
}

function MetricCard({ label, value, detail, change, icon: Icon, visual, tone = "dark" }: { label: string; value: string | number; detail: string; change?: number | null; icon: typeof Lightbulb; visual?: React.ReactNode; tone?: "dark" | "green" | "red" | "amber" | "blue" }) {
  const colors = {
    dark: "bg-slate-950 text-white",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-blue-50 text-blue-700"
  };
  const positive = (change ?? 0) >= 0;

  return (
    <article className="surface metric-depth min-h-[150px] rounded-lg p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">{label}</p>
        {visual ?? <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors[tone]}`}><Icon className="h-[18px] w-[18px]" aria-hidden /></span>}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-extrabold leading-none text-ink">{value}</p>
        {change !== null && change !== undefined ? (
          <span className={`inline-flex items-center gap-1 text-xs font-extrabold ${positive ? "text-emerald-700" : "text-rose-700"}`}>
            {positive ? <TrendingUp className="h-3.5 w-3.5" aria-hidden /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden />}
            {Math.abs(change)}%
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

export function DashboardCommandCenter({ ideas, areas, generatedAt, portfolio, timing }: DashboardCommandCenterProps) {
  const [period, setPeriod] = useState<Period>("90");
  const [area, setArea] = useState("all");
  const [category, setCategory] = useState<"all" | IdeaCategory>("all");
  const [department, setDepartment] = useState<Department>("all");
  const [impact, setImpact] = useState<string | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  useEffect(() => {
    const storedPeriod = window.localStorage.getItem(WORKSPACE_PERIOD_STORAGE);
    if (["30", "90", "365", "all"].includes(storedPeriod ?? "")) setPeriod(storedPeriod as Period);
    const onPeriodChange = (event: Event) => {
      const value = (event as CustomEvent<WorkspacePeriod>).detail;
      if (["30", "90", "365", "all"].includes(value)) setPeriod(value);
    };
    window.addEventListener(WORKSPACE_PERIOD_EVENT, onPeriodChange);
    return () => window.removeEventListener(WORKSPACE_PERIOD_EVENT, onPeriodChange);
  }, []);

  const now = useMemo(() => new Date(generatedAt), [generatedAt]);
  const dimensionIdeas = useMemo(() => ideas.filter((idea) =>
    (area === "all" || idea.areaCode === area) &&
    (category === "all" || idea.category === category) &&
    departmentMatches(idea, department) &&
    (!impact || idea.impactTypes.includes(impact))
  ), [ideas, area, category, department, impact]);

  const periodDays = period === "all" ? null : Number(period);
  const currentIdeas = useMemo(() => {
    if (!periodDays) return dimensionIdeas;
    const start = now.getTime() - periodDays * DAY;
    return dimensionIdeas.filter((idea) => new Date(idea.createdAt).getTime() >= start);
  }, [dimensionIdeas, now, periodDays]);
  const previousIdeas = useMemo(() => {
    if (!periodDays) return [];
    const end = now.getTime() - periodDays * DAY;
    const start = end - periodDays * DAY;
    return dimensionIdeas.filter((idea) => {
      const created = new Date(idea.createdAt).getTime();
      return created >= start && created < end;
    });
  }, [dimensionIdeas, now, periodDays]);

  const metrics = useMemo(() => {
    const closed = currentIdeas.filter((idea) => idea.status === "CERRADA").length;
    const previousClosed = previousIdeas.filter((idea) => idea.status === "CERRADA").length;
    const approved = currentIdeas.filter((idea) => approvedStatuses.includes(idea.status)).length;
    const rejected = currentIdeas.filter((idea) => rejectedStatuses.includes(idea.status)).length;
    const overdue = currentIdeas.filter((idea) => idea.status === "VENCIDA" || (idea.dueDate && new Date(idea.dueDate) < now && !["CERRADA", "CANCELADA"].includes(idea.status))).length;
    const points = currentIdeas.reduce((sum, idea) => sum + idea.pointsAssigned, 0);
    return {
      closed,
      approved,
      rejected,
      overdue,
      points,
      closeRate: percent(closed, currentIdeas.length),
      previousCloseRate: percent(previousClosed, previousIdeas.length),
      cycleDays: averageCycleDays(currentIdeas),
      previousCycleDays: averageCycleDays(previousIdeas)
    };
  }, [currentIdeas, previousIdeas, now]);

  const attention = useMemo(() => [
    { label: "Revisión de supervisor", value: currentIdeas.filter((idea) => initialStatuses.includes(idea.status)).length, href: "/supervisor", icon: Clock3, tone: "text-amber-300" },
    { label: "Validaciones pendientes", value: currentIdeas.filter((idea) => validationStatuses.includes(idea.status)).length, href: "/kanban", icon: ShieldCheck, tone: "text-blue-300" },
    { label: "Acciones de Mejora Continua", value: currentIdeas.filter((idea) => ["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA", "IMPLEMENTADA", "EN_VALIDACION_FINAL"].includes(idea.status)).length, href: "/mejora", icon: Lightbulb, tone: "text-emerald-300" },
    { label: "Compromisos vencidos", value: metrics.overdue, href: "/vencidas", icon: AlertTriangle, tone: "text-rose-300" }
  ], [currentIdeas, metrics.overdue]);

  const trend = useMemo(() => trendBuckets(currentIdeas, period), [currentIdeas, period]);
  const impactRows = useMemo(() => {
    const counts = new Map<string, number>();
    currentIdeas.forEach((idea) => idea.impactTypes.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1)));
    return [...counts.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 9);
  }, [currentIdeas]);
  const agingRows = useMemo(() => {
    const open = currentIdeas.filter((idea) => !["CERRADA", "CANCELADA"].includes(idea.status));
    const buckets = [
      { name: "0-2 días", min: 0, max: 2, color: "#14835f" },
      { name: "3-7 días", min: 3, max: 7, color: "#176fc1" },
      { name: "8-14 días", min: 8, max: 14, color: "#b7791f" },
      { name: "15-30 días", min: 15, max: 30, color: "#d32236" },
      { name: "+30 días", min: 31, max: Number.POSITIVE_INFINITY, color: "#171717" }
    ];
    return buckets.map((bucket) => ({ ...bucket, value: open.filter((idea) => {
      const age = Math.floor((now.getTime() - new Date(idea.createdAt).getTime()) / DAY);
      return age >= bucket.min && age <= bucket.max;
    }).length }));
  }, [currentIdeas, now]);

  const flowRows = useMemo(() => [
    { name: "Registradas", value: currentIdeas.length },
    { name: "Aval supervisor", value: currentIdeas.filter((idea) => ![...initialStatuses, "RECHAZADA_SUPERVISOR", "CANCELADA"].includes(idea.status)).length },
    { name: "Listas para ejecutar", value: currentIdeas.filter((idea) => [...implementationStatuses, "CERRADA"].includes(idea.status)).length },
    { name: "En implementación", value: currentIdeas.filter((idea) => ["EN_IMPLEMENTACION", "IMPLEMENTADA", "EN_VALIDACION_FINAL", "CERRADA"].includes(idea.status)).length },
    { name: "Cerradas", value: metrics.closed }
  ], [currentIdeas, metrics.closed]);

  const trendOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    color: ["#EA0029", "#14835F"],
    tooltip: { trigger: "axis", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    legend: { bottom: 0, icon: "circle", textStyle: { color: "#64748b", fontSize: 11 } },
    grid: { left: 40, right: 18, top: 22, bottom: 48 },
    xAxis: { type: "category", boundaryGap: false, data: trend.map((row) => row.label), axisLine: { lineStyle: { color: "#d8d8d8" } }, axisTick: { show: false }, axisLabel: { color: "#64748b", fontSize: 10 } },
    yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeeee" } }, axisLabel: { color: "#94a3b8" } },
    series: [
      { name: "Registradas", type: "line", smooth: true, symbolSize: 7, data: trend.map((row) => row.created), lineStyle: { width: 3 }, areaStyle: { color: "rgba(234,0,41,.08)" } },
      { name: "Cerradas", type: "line", smooth: true, symbolSize: 7, data: trend.map((row) => row.closed), lineStyle: { width: 3 } }
    ]
  };

  const funnelOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { trigger: "item", formatter: "{b}: {c}", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    series: [{
      name: "Flujo",
      type: "funnel",
      left: "5%",
      top: 16,
      bottom: 10,
      width: "90%",
      minSize: "16%",
      maxSize: "100%",
      sort: "descending",
      gap: 4,
      label: { show: true, position: "inside", formatter: "{b}  {c}", color: "#fff", fontWeight: 700, fontSize: 11 },
      labelLine: { show: false },
      itemStyle: { borderColor: "#fff", borderWidth: 1, borderRadius: 4 },
      data: flowRows.map((row, index) => ({ ...row, itemStyle: { color: ["#171717", "#3b3b3b", "#626a70", "#b50020", "#ea0029"][index] } }))
    }],
    media: [{
      query: { maxWidth: 500 },
      option: {
        series: [{
          left: "3%",
          width: "55%",
          label: { show: true, position: "right", formatter: "{b}\n{c}", color: "#334155", fontWeight: 700, fontSize: 10, lineHeight: 14 },
          labelLine: { show: true, length: 7, length2: 4, lineStyle: { color: "#94a3b8" } }
        }]
      }
    }]
  };

  const impactOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { trigger: "item", formatter: "{b}: {c} ideas", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    grid: { left: 112, right: 28, top: 12, bottom: 20 },
    xAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeeee" } }, axisLabel: { color: "#94a3b8" } },
    yAxis: { type: "category", inverse: true, data: impactRows.map((row) => row.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontWeight: 600, fontSize: 10, width: 104, overflow: "truncate" } },
    series: [{ type: "bar", barWidth: 14, data: impactRows.map((row) => row.value), itemStyle: { color: "#EA0029", borderRadius: [0, 5, 5, 0] }, label: { show: true, position: "right", color: "#171717", fontWeight: 700 } }]
  };

  const agingOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { trigger: "item", formatter: "{b}: {c} ideas abiertas", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    grid: { left: 44, right: 14, top: 18, bottom: 42 },
    xAxis: { type: "category", data: agingRows.map((row) => row.name), axisLine: { lineStyle: { color: "#d8d8d8" } }, axisTick: { show: false }, axisLabel: { color: "#64748b", fontSize: 10 } },
    yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeeee" } }, axisLabel: { color: "#94a3b8" } },
    series: [{ type: "bar", barMaxWidth: 38, data: agingRows.map((row) => ({ value: row.value, itemStyle: { color: row.color, borderRadius: [5, 5, 0, 0] } })), label: { show: true, position: "top", color: "#171717", fontWeight: 700 } }]
  };

  const recentIdeas = currentIdeas.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
  const selectedIdea = selectedIdeaId ? currentIdeas.find((idea) => idea.id === selectedIdeaId) ?? null : null;
  const activeFilters = [period !== "90", area !== "all", category !== "all", department !== "all", Boolean(impact)].filter(Boolean).length;
  const updatePeriod = (value: Period) => {
    setPeriod(value);
    window.localStorage.setItem(WORKSPACE_PERIOD_STORAGE, value);
    window.dispatchEvent(new CustomEvent<WorkspacePeriod>(WORKSPACE_PERIOD_EVENT, { detail: value }));
  };
  const resetFilters = () => { updatePeriod("90"); setArea("all"); setCategory("all"); setDepartment("all"); setImpact(null); };

  useEffect(() => {
    if (!selectedIdea) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedIdeaId(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedIdea]);

  return (
    <div className="dashboard-command-center">
      <section className="surface mb-5 rounded-lg p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-500" aria-hidden /><p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">Vista analítica</p></div>
            <h2 className="mt-1 text-lg font-extrabold text-ink">Explora el desempeño sin salir del panel</h2>
            <p className="mt-1 text-xs text-slate-500">Actualizado {new Date(generatedAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: PROPEX_TIME_ZONE })}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label><span className="label">Periodo</span><select className="field min-w-36" value={period} onChange={(event) => updatePeriod(event.target.value as Period)}><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="365">Último año</option><option value="all">Todo el historial</option></select></label>
            <label><span className="label">Área</span><select className="field min-w-32" value={area} onChange={(event) => setArea(event.target.value)}><option value="all">Todas</option>{areas.map((code) => <option value={code} key={code}>{code}</option>)}</select></label>
            <label><span className="label">Categoría</span><select className="field min-w-32" value={category} onChange={(event) => setCategory(event.target.value as "all" | IdeaCategory)}><option value="all">Todas</option><option value="A">Categoría A</option><option value="B">Categoría B</option><option value="C">Categoría C</option></select></label>
            <label><span className="label">Soporte</span><select className="field min-w-40" value={department} onChange={(event) => setDepartment(event.target.value as Department)}><option value="all">Todos</option><option value="quality">Calidad</option><option value="safety">Seguridad</option><option value="maintenance">Mantenimiento</option></select></label>
          </div>
        </div>
        {(impact || activeFilters) ? <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3"><span className="text-xs font-bold text-slate-500">{activeFilters} filtros activos</span>{impact ? <button className="inline-flex min-h-8 items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 text-xs font-extrabold text-brand-700" onClick={() => setImpact(null)} type="button">Impacto: {impact}<XCircle className="h-3.5 w-3.5" aria-hidden /></button> : null}<button className="btn btn-secondary ml-auto min-h-9 px-3 text-xs" onClick={resetFilters} type="button"><RotateCcw className="h-3.5 w-3.5" aria-hidden />Restablecer</button></div> : null}
      </section>

      <section className="command-attention-band overflow-hidden rounded-lg bg-slate-950 text-white">
        <div className="grid lg:grid-cols-[285px_1fr]">
          <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-red-300">Atención de hoy</p>
            <h2 className="mt-2 text-xl font-extrabold">Lo que necesita movimiento</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">La prioridad cambia con los filtros del panel.</p>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            {attention.map((item) => { const Icon = item.icon; return <Link className="group flex min-h-28 items-center gap-3 border-b border-white/10 p-4 transition hover:bg-white/5 sm:border-r xl:border-b-0" href={item.href} key={item.label}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10"><Icon className={`h-5 w-5 ${item.tone}`} aria-hidden /></span><span className="min-w-0 flex-1"><span className="block text-2xl font-extrabold">{item.value}</span><span className="mt-1 block text-xs font-bold leading-4 text-slate-300">{item.label}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" aria-hidden /></Link>; })}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Ideas registradas" value={currentIdeas.length} detail="Comparación contra el periodo anterior" change={periodDays && previousIdeas.length ? delta(currentIdeas.length, previousIdeas.length) : null} icon={Lightbulb} />
        <MetricCard label="Tasa de cierre" value={`${metrics.closeRate}%`} detail={`${metrics.closed} ideas cerradas`} change={periodDays && previousIdeas.length ? metrics.closeRate - metrics.previousCloseRate : null} icon={Target} tone="green" />
        <MetricCard label="Ciclo promedio" value={`${metrics.cycleDays} d`} detail="Desde registro hasta cierre" change={periodDays && metrics.previousCycleDays ? -delta(metrics.cycleDays, metrics.previousCycleDays) : null} icon={TimerReset} tone="blue" />
        <MetricCard label="Compromisos vencidos" value={metrics.overdue} detail="Requieren escalamiento o nueva fecha" icon={AlertTriangle} tone="red" />
        <MetricCard label="ProbocaCoins otorgadas" value={metrics.points} detail={`${metrics.approved} aprobadas · ${metrics.rejected} rechazadas`} icon={Gauge} visual={<ProbocaCoin size="md" />} tone="amber" />
      </section>

      <section className="mt-5 grid gap-3 lg:grid-cols-3">
        <Link className="surface surface-interactive flex min-h-28 items-center gap-4 rounded-lg border-l-4 border-l-brand-500 p-4" href="/ideas"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Layers3 className="h-5 w-5" aria-hidden /></span><span className="min-w-0 flex-1"><span className="text-xs font-extrabold uppercase text-slate-500">Ideas</span><span className="mt-1 block text-lg font-extrabold text-ink">{currentIdeas.length} en el periodo</span><span className="mt-1 block text-xs text-slate-500">{metrics.closeRate}% cerradas · {metrics.overdue} vencidas</span></span><ArrowRight className="h-4 w-4 text-slate-400" aria-hidden /></Link>
        <Link className="surface surface-interactive flex min-h-28 items-center gap-4 rounded-lg border-l-4 border-l-amber-600 p-4" href="/kaizen"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-800"><FolderKanban className="h-5 w-5" aria-hidden /></span><span className="min-w-0 flex-1"><span className="text-xs font-extrabold uppercase text-slate-500">Kaizen</span><span className="mt-1 block text-lg font-extrabold text-ink">{portfolio.kaizen.active} proyectos activos</span><span className="mt-1 block text-xs text-slate-500">{portfolio.kaizen.averageProgress}% avance · {portfolio.kaizen.overdueActivities} vencidas</span></span><ArrowRight className="h-4 w-4 text-slate-400" aria-hidden /></Link>
        <Link className="surface surface-interactive flex min-h-28 items-center gap-4 rounded-lg border-l-4 border-l-slate-700 p-4" href="/genba"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-800"><Footprints className="h-5 w-5" aria-hidden /></span><span className="min-w-0 flex-1"><span className="text-xs font-extrabold uppercase text-slate-500">GENBA</span><span className="mt-1 block text-lg font-extrabold text-ink">{portfolio.genba.openActivities} acciones abiertas</span><span className="mt-1 block text-xs text-slate-500">{portfolio.genba.averageAttendance}% asistencia · {portfolio.genba.overdueActivities} vencidas</span></span><ArrowRight className="h-4 w-4 text-slate-400" aria-hidden /></Link>
      </section>

      <section className="mt-7 grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
        <ChartPanel eyebrow="Ritmo del programa" title="Entradas y cierres" description="Evolución temporal de las ideas registradas y terminadas."><DynamicChart option={trendOption} style={{ height: 310 }} /></ChartPanel>
        <ChartPanel eyebrow="Conversión" title="Embudo de ejecución" description="Cuántas ideas avanzan desde registro hasta cierre."><DynamicChart option={funnelOption} style={{ height: 310 }} /></ChartPanel>
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-2">
        <ChartPanel eyebrow="Prioridades SQDCM" title="Impactos más frecuentes" description="Selecciona una barra o tema para filtrar todo el panel." action={impact ? <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">{impact}</span> : undefined}>
          <DynamicChart option={impactOption} style={{ height: 300 }} onEvents={{ click: (params: { name?: string }) => params.name && setImpact(params.name) }} />
          <div className="flex flex-wrap gap-2 border-t border-line px-1 pt-3">
            {impactRows.map((row) => <button aria-pressed={impact === row.name} className={`min-h-8 rounded-full border px-3 text-[11px] font-extrabold transition ${impact === row.name ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-slate-600 hover:border-brand-100 hover:bg-brand-50 hover:text-brand-700"}`} key={row.name} onClick={() => setImpact(impact === row.name ? null : row.name)} type="button">{row.name} · {row.value}</button>)}
          </div>
        </ChartPanel>
        <ChartPanel eyebrow="Riesgo operativo" title="Antigüedad de ideas abiertas" description="Concentración de trabajo según días sin cierre."><DynamicChart option={agingOption} style={{ height: 330 }} /></ChartPanel>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="surface rounded-lg p-5">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white"><CalendarDays className="h-5 w-5" aria-hidden /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Velocidad</p><h2 className="text-lg font-extrabold text-ink">Tiempos de respuesta</h2></div></div>
          <dl className="mt-4 divide-y divide-line">
            {[["Respuesta del supervisor", timing.supervisor], ["Validación de soporte", timing.validation], ["Implementación", timing.implementation]].map(([label, value]) => <div className="flex items-center justify-between gap-4 py-4" key={label}><dt className="text-sm font-bold text-slate-600">{label}</dt><dd className="text-xl font-extrabold text-ink">{value}</dd></div>)}
          </dl>
          <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-slate-500">Estos tiempos usan las decisiones registradas y se recalculan automáticamente.</p>
        </article>

        <article className="surface overflow-hidden rounded-lg">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-brand-700">Trazabilidad inmediata</p><h2 className="mt-1 text-lg font-extrabold text-ink">Ideas recientes en la selección</h2></div><Link className="text-xs font-extrabold text-brand-700 hover:underline" href="/ideas">Ver todas</Link></div>
          {!recentIdeas.length ? <div className="flex min-h-56 flex-col items-center justify-center p-6 text-center"><CheckCircle2 className="h-8 w-8 text-slate-300" aria-hidden /><p className="mt-3 text-sm font-extrabold text-slate-700">No hay ideas con estos filtros</p><button className="mt-3 text-xs font-extrabold text-brand-700" onClick={resetFilters} type="button">Restablecer filtros</button></div> : <div className="divide-y divide-line">{recentIdeas.map((idea) => <button aria-label={`Ver resumen de ${idea.folio}`} className="quick-view-row group grid w-full gap-3 px-5 py-4 text-left transition hover:bg-slate-50 sm:grid-cols-[110px_1fr_auto] sm:items-center" key={idea.id} onClick={() => setSelectedIdeaId(idea.id)} type="button"><span><span className="block text-xs font-extrabold text-brand-700">{idea.folio}</span><span className="mt-1 block text-[11px] font-bold text-slate-500">{idea.areaCode} · Cat. {idea.category}</span></span><span className="min-w-0"><span className="line-clamp-1 block text-sm font-bold text-slate-800">{idea.problem}</span><span className="mt-1 block text-xs text-slate-500">{idea.supervisorName ?? "Sin supervisor"} · {new Date(idea.createdAt).toLocaleDateString("es-MX", { timeZone: PROPEX_TIME_ZONE })}</span></span><span className="flex items-center gap-3"><StatusPill status={idea.status} /><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" aria-hidden /></span></button>)}</div>}
        </article>
      </section>

      {selectedIdea ? (
        <div className="quick-view-layer" role="presentation">
          <button aria-label="Cerrar detalle rápido" className="quick-view-backdrop" onClick={() => setSelectedIdeaId(null)} type="button" />
          <aside aria-label={`Detalle rápido de ${selectedIdea.folio}`} aria-modal="true" className="quick-view-panel" role="dialog">
            <header className="quick-view-header">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase text-brand-700">Detalle rápido · {selectedIdea.areaCode}</p>
                <h2 className="mt-1 text-xl font-extrabold text-ink">{selectedIdea.folio}</h2>
              </div>
              <button aria-label="Cerrar detalle rápido" className="icon-button" onClick={() => setSelectedIdeaId(null)} title="Cerrar" type="button"><X className="h-4 w-4" aria-hidden /></button>
            </header>
            <div className="quick-view-body">
              <div className="flex flex-wrap items-center gap-2"><StatusPill status={selectedIdea.status} /><span className="text-xs font-bold text-slate-500">Categoría {selectedIdea.category}</span></div>
              <section className="quick-view-section">
                <p className="quick-view-label">Qué pasó</p>
                <p className="mt-2 text-sm font-bold leading-6 text-ink">{selectedIdea.problem}</p>
                <p className="mt-2 text-xs text-slate-500">Registrada por {selectedIdea.collaboratorName} el {new Date(selectedIdea.createdAt).toLocaleDateString("es-MX", { dateStyle: "medium", timeZone: PROPEX_TIME_ZONE })}.</p>
              </section>
              <section className="quick-view-next-step">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10"><ArrowRight className="h-4 w-4" aria-hidden /></span>
                <span><span className="block text-[10px] font-extrabold uppercase text-red-200">Siguiente paso</span><span className="mt-1 block text-sm font-extrabold">{nextStepFor(selectedIdea.status)}</span></span>
              </section>
              <dl className="quick-view-facts">
                <div><dt><UserRound className="h-4 w-4" aria-hidden />Responsable visible</dt><dd>{selectedIdea.supervisorName ?? "Pendiente de asignar"}</dd></div>
                <div><dt><CalendarClock className="h-4 w-4" aria-hidden />Fecha compromiso</dt><dd>{selectedIdea.dueDate ? new Date(selectedIdea.dueDate).toLocaleDateString("es-MX", { dateStyle: "medium", timeZone: PROPEX_TIME_ZONE }) : "Sin fecha definida"}</dd></div>
                <div><dt><Tag className="h-4 w-4" aria-hidden />Estado actual</dt><dd>{statusLabels[selectedIdea.status]}</dd></div>
              </dl>
              <section className="quick-view-section">
                <p className="quick-view-label">Impacto operativo</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedIdea.impactTypes.length ? selectedIdea.impactTypes.map((item) => <span className="quick-view-impact" key={item}>{item}</span>) : <span className="text-xs text-slate-500">Sin impacto clasificado</span>}
                </div>
              </section>
            </div>
            <footer className="quick-view-footer">
              <Link className="btn btn-brand w-full" href={`/ideas/${selectedIdea.id}`}>Abrir expediente completo<ArrowUpRight className="h-4 w-4" aria-hidden /></Link>
            </footer>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
~~~~~~

### `src/components/empty-state.tsx`

~~~~~~tsx
import { CheckCircle2 } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-7 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="mt-3 text-base font-extrabold text-ink">{title}</h2>
      {description ? <p className="mt-1 max-w-lg text-sm leading-6 text-slate-600">{description}</p> : null}
    </div>
  );
}
~~~~~~

### `src/components/genba-activity-entry-table.tsx`

~~~~~~tsx
"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type PersonOption = {
  id: string;
  name: string;
};

const MINIMUM_ACTIVITIES = 5;
const MAXIMUM_ACTIVITIES = 25;

export function GenbaActivityEntryTable({
  users,
  initialDueDate
}: {
  users: PersonOption[];
  initialDueDate: string;
}) {
  const [activityCount, setActivityCount] = useState(MINIMUM_ACTIVITIES);
  const additionalCount = activityCount - MINIMUM_ACTIVITIES;

  return (
    <div>
      <input name="activityCount" type="hidden" value={activityCount} />
      <div className="mb-3 flex flex-col gap-3 border-y border-line bg-panel px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold text-slate-600" aria-live="polite">
          {MINIMUM_ACTIVITIES} principales{additionalCount ? ` + ${additionalCount} adicionales` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {activityCount > MINIMUM_ACTIVITIES ? (
            <button className="btn btn-secondary" onClick={() => setActivityCount((count) => Math.max(MINIMUM_ACTIVITIES, count - 1))} type="button">
              <Trash2 className="h-4 w-4" aria-hidden />Quitar ultima
            </button>
          ) : null}
          <button className="btn btn-primary" disabled={activityCount >= MAXIMUM_ACTIVITIES} onClick={() => setActivityCount((count) => Math.min(MAXIMUM_ACTIVITIES, count + 1))} type="button">
            <Plus className="h-4 w-4" aria-hidden />Agregar actividad
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="hidden grid-cols-[48px_minmax(210px,1.2fr)_minmax(210px,1.2fr)_minmax(170px,0.8fr)_160px] gap-3 bg-slate-100 px-3 py-3 text-[10px] font-extrabold uppercase text-slate-500 lg:grid">
          <span className="text-center">#</span><span>Problematica *</span><span>Accion propuesta</span><span>Responsable</span><span>Fecha compromiso</span>
        </div>
        <div className="divide-y divide-line">
          {Array.from({ length: activityCount }, (_, index) => {
            const number = index + 1;
            const additional = number > MINIMUM_ACTIVITIES;
            return (
              <div className={`grid gap-3 p-3 lg:grid-cols-[48px_minmax(210px,1.2fr)_minmax(210px,1.2fr)_minmax(170px,0.8fr)_160px] lg:items-start ${additional ? "bg-red-50/40" : "bg-white"}`} key={number}>
                <div className="flex items-center gap-2 lg:justify-center">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-extrabold text-white ${additional ? "bg-slate-800" : "bg-red-700"}`}>{number}</span>
                  <span className="text-xs font-extrabold text-slate-600 lg:hidden">Actividad {number}{additional ? " adicional" : ""}</span>
                </div>
                <label htmlFor={`problem-${number}`}>
                  <span className="label lg:sr-only">Problematica *</span>
                  <textarea className="field min-h-20 resize-y" id={`problem-${number}`} name={`problem-${number}`} placeholder={additional ? "Actividad adicional" : "Condicion o problema observado"} required />
                </label>
                <label htmlFor={`action-${number}`}>
                  <span className="label lg:sr-only">Accion propuesta</span>
                  <textarea className="field min-h-20 resize-y" id={`action-${number}`} name={`action-${number}`} placeholder="Que debe hacerse" />
                </label>
                <label htmlFor={`owner-${number}`}>
                  <span className="label lg:sr-only">Responsable</span>
                  <select className="field" defaultValue="" id={`owner-${number}`} name={`ownerId-${number}`}>
                    <option value="">Sin asignar</option>
                    {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                </label>
                <label htmlFor={`due-${number}`}>
                  <span className="label lg:sr-only">Fecha compromiso</span>
                  <input className="field" defaultValue={initialDueDate} id={`due-${number}`} name={`dueDate-${number}`} type="date" />
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
~~~~~~

### `src/components/genba-command-center.tsx`

~~~~~~tsx
"use client";

import type { GenbaStatus, WorkItemStatus } from "@prisma/client";
import type { EChartsOption } from "echarts";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Footprints,
  MapPinned,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  UserRoundX,
  UsersRound
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { GenbaStatusPill, WorkStatusPill } from "@/components/module-status";
import { EmptyChart, PortfolioAttention, PortfolioChartPanel, PortfolioMetric } from "@/components/portfolio-command-ui";
import { ProgressMeter } from "@/components/progress-meter";
import { WORKSPACE_PERIOD_EVENT, WORKSPACE_PERIOD_STORAGE, type WorkspacePeriod } from "@/components/workspace-controls";
import { genbaStatusLabels } from "@/lib/domain";

const DynamicChart = dynamic(() => import("@/components/premium-chart"), {
  ssr: false,
  loading: () => <div className="flex h-72 items-center justify-center text-sm font-bold text-slate-400">Preparando visualización...</div>
});

const DAY = 86_400_000;
const PROPEX_TIME_ZONE = "America/Monterrey";
type Period = WorkspacePeriod;

export type GenbaDashboardActivity = {
  id: string;
  number: number;
  problem: string;
  action: string | null;
  ownerName: string | null;
  dueDate: string | null;
  status: WorkItemStatus;
  closedAt: string | null;
  createdAt: string;
  promotedToKaizen: boolean;
};

export type GenbaDashboardWalk = {
  id: string;
  number: number;
  folio: string;
  areaName: string;
  visitDate: string;
  status: GenbaStatus;
  coordinatorName: string;
  expectedDepartments: number;
  attendedDepartments: number;
  createdAt: string;
  closedAt: string | null;
  activities: GenbaDashboardActivity[];
};

function activityProgress(activities: GenbaDashboardActivity[]) {
  const relevant = activities.filter((activity) => activity.status !== "COMBINADA");
  const closed = relevant.filter((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status)).length;
  return { total: relevant.length, closed, open: relevant.length - closed, percent: relevant.length ? Math.round((closed / relevant.length) * 100) : 0 };
}

function attendance(walk: GenbaDashboardWalk) {
  return walk.expectedDepartments ? Math.round((walk.attendedDepartments / walk.expectedDepartments) * 100) : 0;
}

function isActivityOverdue(activity: GenbaDashboardActivity, now: Date) {
  return Boolean(activity.dueDate && new Date(activity.dueDate) < now && !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status));
}

function bucketStart(date: Date, monthly: boolean) {
  return monthly
    ? new Date(date.getFullYear(), date.getMonth(), 1)
    : new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
}

function bucketId(date: Date, monthly: boolean) {
  const start = bucketStart(date, monthly);
  return monthly ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}` : start.toISOString().slice(0, 10);
}

function bucketLabel(date: Date, monthly: boolean) {
  const start = bucketStart(date, monthly);
  return monthly
    ? start.toLocaleDateString("es-MX", { month: "short", year: "2-digit", timeZone: PROPEX_TIME_ZONE })
    : start.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: PROPEX_TIME_ZONE });
}

export function GenbaCommandCenter({ walks, generatedAt }: { walks: GenbaDashboardWalk[]; generatedAt: string }) {
  const [period, setPeriod] = useState<Period>("90");
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState<"all" | GenbaStatus>("all");
  const [coordinator, setCoordinator] = useState("all");
  const now = useMemo(() => new Date(generatedAt), [generatedAt]);

  useEffect(() => {
    const storedPeriod = window.localStorage.getItem(WORKSPACE_PERIOD_STORAGE);
    if (["30", "90", "365", "all"].includes(storedPeriod ?? "")) setPeriod(storedPeriod as Period);
    const onPeriodChange = (event: Event) => setPeriod((event as CustomEvent<WorkspacePeriod>).detail);
    window.addEventListener(WORKSPACE_PERIOD_EVENT, onPeriodChange);
    return () => window.removeEventListener(WORKSPACE_PERIOD_EVENT, onPeriodChange);
  }, []);
  const areas = useMemo(() => [...new Set(walks.map((walk) => walk.areaName))].sort(), [walks]);
  const coordinators = useMemo(() => [...new Set(walks.map((walk) => walk.coordinatorName))].sort(), [walks]);

  const filteredWalks = useMemo(() => {
    const start = period === "all" ? null : now.getTime() - Number(period) * DAY;
    return walks.filter((walk) =>
      (start === null || new Date(walk.visitDate).getTime() >= start) &&
      (area === "all" || walk.areaName === area) &&
      (status === "all" || walk.status === status) &&
      (coordinator === "all" || walk.coordinatorName === coordinator)
    );
  }, [walks, period, area, status, coordinator, now]);

  const relevantActivities = useMemo(() => filteredWalks.flatMap((walk) => walk.activities.map((activity) => ({ ...activity, walk }))).filter((activity) => activity.status !== "COMBINADA"), [filteredWalks]);
  const openActivities = relevantActivities.filter((activity) => !["COMPLETADA", "CANCELADA"].includes(activity.status));
  const overdueActivities = openActivities.filter((activity) => isActivityOverdue(activity, now));
  const blockedActivities = openActivities.filter((activity) => activity.status === "BLOQUEADA");
  const unassignedActivities = openActivities.filter((activity) => !activity.ownerName);
  const closedActivities = relevantActivities.filter((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status));
  const closureRate = relevantActivities.length ? Math.round((closedActivities.length / relevantActivities.length) * 100) : 0;
  const averageAttendance = filteredWalks.length ? Math.round(filteredWalks.reduce((sum, walk) => sum + attendance(walk), 0) / filteredWalks.length) : 0;
  const closedWithDates = closedActivities.filter((activity) => activity.closedAt);
  const averageClosureDays = closedWithDates.length ? Math.round(closedWithDates.reduce((sum, activity) => sum + Math.max(0, (new Date(activity.closedAt!).getTime() - new Date(activity.createdAt).getTime()) / DAY), 0) / closedWithDates.length) : 0;
  const promotedActivities = relevantActivities.filter((activity) => activity.promotedToKaizen).length;
  const openWalks = filteredWalks.filter((walk) => walk.status === "ABIERTO");

  const monthly = period === "365" || period === "all";
  const trendRows = useMemo(() => {
    const map = new Map<string, { label: string; sort: number; walks: number; closed: number }>();
    const ensure = (date: Date) => {
      const id = bucketId(date, monthly);
      const current = map.get(id) ?? { label: bucketLabel(date, monthly), sort: bucketStart(date, monthly).getTime(), walks: 0, closed: 0 };
      map.set(id, current);
      return current;
    };
    filteredWalks.forEach((walk) => { ensure(new Date(walk.visitDate)).walks += 1; });
    closedActivities.forEach((activity) => { if (activity.closedAt) ensure(new Date(activity.closedAt)).closed += 1; });
    return [...map.values()].sort((a, b) => a.sort - b.sort).slice(monthly ? -12 : -13);
  }, [filteredWalks, closedActivities, monthly]);

  const trendOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    color: ["#EA0029", "#14835f"],
    tooltip: { trigger: "axis", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    legend: { bottom: 0, icon: "circle", textStyle: { color: "#64748b", fontSize: 11 } },
    grid: { left: 40, right: 18, top: 22, bottom: 48 },
    xAxis: { type: "category", boundaryGap: false, data: trendRows.map((row) => row.label), axisLine: { lineStyle: { color: "#d8d8d8" } }, axisTick: { show: false }, axisLabel: { color: "#64748b", fontSize: 10 } },
    yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeeee" } }, axisLabel: { color: "#94a3b8" } },
    series: [
      { name: "Recorridos", type: "line", smooth: true, symbolSize: 7, data: trendRows.map((row) => row.walks), lineStyle: { width: 3 }, areaStyle: { color: "rgba(234,0,41,.08)" } },
      { name: "Actividades cerradas", type: "line", smooth: true, symbolSize: 7, data: trendRows.map((row) => row.closed), lineStyle: { width: 3 } }
    ]
  };

  const areaAttendanceRows = useMemo(() => {
    const map = new Map<string, number[]>();
    filteredWalks.forEach((walk) => map.set(walk.areaName, [...(map.get(walk.areaName) ?? []), attendance(walk)]));
    return [...map.entries()].map(([name, values]) => ({ name, value: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) })).sort((a, b) => a.value - b.value).slice(0, 10);
  }, [filteredWalks]);
  const attendanceOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { trigger: "item", formatter: "{b}: {c}% de asistencia", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    grid: { left: 118, right: 38, top: 12, bottom: 20 },
    xAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%", color: "#94a3b8" }, splitLine: { lineStyle: { color: "#eeeeee" } } },
    yAxis: { type: "category", inverse: true, data: areaAttendanceRows.map((row) => row.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontSize: 10, width: 106, overflow: "truncate" } },
    series: [{ type: "bar", barWidth: 15, data: areaAttendanceRows.map((row) => ({ value: row.value, itemStyle: { color: row.value >= 90 ? "#14835f" : row.value >= 70 ? "#a16207" : "#d32236", borderRadius: [0, 5, 5, 0] } })), label: { show: true, position: "right", formatter: "{c}%", color: "#171717", fontWeight: 700 } }]
  };

  const topAreas = useMemo(() => {
    const map = new Map<string, number>();
    filteredWalks.forEach((walk) => map.set(walk.areaName, (map.get(walk.areaName) ?? 0) + walk.activities.filter((activity) => activity.status !== "COMBINADA").length));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name);
  }, [filteredWalks]);
  const heatPeriods = [...new Set(filteredWalks.map((walk) => bucketId(new Date(walk.visitDate), monthly)))].sort().slice(monthly ? -8 : -10);
  const heatLabels = heatPeriods.map((id) => bucketLabel(new Date(`${id}T12:00:00`), monthly));
  const heatData = topAreas.flatMap((areaName, x) => heatPeriods.map((periodId, y) => {
    const value = filteredWalks.filter((walk) => walk.areaName === areaName && bucketId(new Date(walk.visitDate), monthly) === periodId).reduce((sum, walk) => sum + walk.activities.filter((activity) => activity.status !== "COMBINADA").length, 0);
    return { name: areaName, value: [x, y, value] };
  }));
  const heatMax = Math.max(1, ...heatData.map((row) => Number(row.value[2])));
  const heatmapOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { formatter: (params: unknown) => {
      const item = params as { data?: { name?: string; value?: number[] } };
      const value = item.data?.value ?? [];
      return `${item.data?.name ?? "Área"}<br/>${heatLabels[value[1]] ?? "Periodo"}: <b>${value[2] ?? 0} actividades</b>`;
    }, backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    grid: { left: 88, right: 18, top: 18, bottom: 82 },
    xAxis: { type: "category", data: topAreas, splitArea: { show: true }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontSize: 9, rotate: 32, width: 78, overflow: "truncate" } },
    yAxis: { type: "category", data: heatLabels, splitArea: { show: true }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#64748b", fontSize: 10 } },
    visualMap: { min: 0, max: heatMax, calculable: false, orient: "horizontal", left: "center", bottom: 4, inRange: { color: ["#f8fafc", "#fecdd3", "#EA0029", "#171717"] }, textStyle: { color: "#64748b", fontSize: 10 } },
    series: [{ type: "heatmap", data: heatData, label: { show: true, formatter: (params: unknown) => { const item = params as { value?: number[] }; return String(item.value?.[2] ?? 0); }, color: "#171717", fontSize: 10 }, itemStyle: { borderColor: "#fff", borderWidth: 3, borderRadius: 4 } }]
  };

  const agingRows = [
    { name: "0-7 días", min: 0, max: 7, color: "#14835f" },
    { name: "8-14 días", min: 8, max: 14, color: "#176fc1" },
    { name: "15-30 días", min: 15, max: 30, color: "#a16207" },
    { name: "31-60 días", min: 31, max: 60, color: "#d32236" },
    { name: "+60 días", min: 61, max: Number.POSITIVE_INFINITY, color: "#171717" }
  ].map((bucket) => ({ ...bucket, value: openActivities.filter((activity) => { const age = Math.floor((now.getTime() - new Date(activity.createdAt).getTime()) / DAY); return age >= bucket.min && age <= bucket.max; }).length }));
  const agingOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { trigger: "item", formatter: "{b}: {c} actividades abiertas", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    grid: { left: 44, right: 14, top: 18, bottom: 42 },
    xAxis: { type: "category", data: agingRows.map((row) => row.name), axisLine: { lineStyle: { color: "#d8d8d8" } }, axisTick: { show: false }, axisLabel: { color: "#64748b", fontSize: 10 } },
    yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeeee" } }, axisLabel: { color: "#94a3b8" } },
    series: [{ type: "bar", barMaxWidth: 38, data: agingRows.map((row) => ({ value: row.value, itemStyle: { color: row.color, borderRadius: [5, 5, 0, 0] } })), label: { show: true, position: "top", color: "#171717", fontWeight: 700 } }]
  };

  const commitments = openActivities.slice().sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  }).slice(0, 12);
  const activeFilters = [period !== "90", area !== "all", status !== "all", coordinator !== "all"].filter(Boolean).length;
  const updatePeriod = (value: Period) => { setPeriod(value); window.localStorage.setItem(WORKSPACE_PERIOD_STORAGE, value); window.dispatchEvent(new CustomEvent<WorkspacePeriod>(WORKSPACE_PERIOD_EVENT, { detail: value })); };
  const resetFilters = () => { updatePeriod("90"); setArea("all"); setStatus("all"); setCoordinator("all"); };

  return (
    <div className="dashboard-command-center">
      <section className="surface mb-5 rounded-lg p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-500" aria-hidden /><p className="text-xs font-extrabold uppercase text-slate-500">Gestión visual de piso</p></div><h2 className="mt-1 text-lg font-extrabold text-ink">Convierte cada recorrido en acciones verificables</h2><p className="mt-1 text-xs text-slate-500">Actualizado {now.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: PROPEX_TIME_ZONE })}</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label><span className="label">Periodo</span><select className="field min-w-36" value={period} onChange={(event) => updatePeriod(event.target.value as Period)}><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="365">Último año</option><option value="all">Todo el historial</option></select></label>
            <label><span className="label">Área visitada</span><select className="field min-w-40" value={area} onChange={(event) => setArea(event.target.value)}><option value="all">Todas</option>{areas.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
            <label><span className="label">Estatus</span><select className="field min-w-36" value={status} onChange={(event) => setStatus(event.target.value as "all" | GenbaStatus)}><option value="all">Todos</option>{Object.entries(genbaStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label><span className="label">Coordinador</span><select className="field min-w-40" value={coordinator} onChange={(event) => setCoordinator(event.target.value)}><option value="all">Todos</option>{coordinators.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          </div>
        </div>
        {activeFilters ? <div className="mt-4 flex items-center gap-3 border-t border-line pt-3"><span className="text-xs font-bold text-slate-500">{activeFilters} filtros activos</span><button className="btn btn-secondary ml-auto min-h-9 px-3 text-xs" onClick={resetFilters} type="button"><RotateCcw className="h-3.5 w-3.5" aria-hidden />Restablecer</button></div> : null}
      </section>

      <PortfolioAttention eyebrow="Atención de hoy" title="Hallazgos que necesitan seguimiento" description="Enfoca vencimientos, bloqueos y actividades sin dueño." items={[
        { label: "Actividades vencidas", value: overdueActivities.length, href: "/genba/kanban", icon: AlertTriangle, tone: "text-rose-300" },
        { label: "Actividades bloqueadas", value: blockedActivities.length, href: "/genba/kanban", icon: ShieldAlert, tone: "text-red-300" },
        { label: "Acciones sin responsable", value: unassignedActivities.length, href: "/genba/kanban", icon: UserRoundX, tone: "text-amber-300" },
        { label: "Recorridos abiertos", value: openWalks.length, href: openWalks[0] ? `/genba/${openWalks[0].id}` : "/genba", icon: Footprints, tone: "text-blue-300" }
      ]} />

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PortfolioMetric label="Recorridos GENBA" value={filteredWalks.length} detail={`${openWalks.length} recorridos todavía abiertos`} icon={Footprints} />
        <PortfolioMetric label="Actividades abiertas" value={openActivities.length} detail={`${relevantActivities.length} actividades vigentes`} icon={ClipboardList} tone="amber" />
        <PortfolioMetric label="Tasa de cierre" value={`${closureRate}%`} detail={`${closedActivities.length} actividades atendidas`} icon={CheckCircle2} tone="green" />
        <PortfolioMetric label="Asistencia promedio" value={`${averageAttendance}%`} detail="Departamentos esperados contra presentes" icon={UsersRound} tone="blue" />
        <PortfolioMetric label="Tiempo de cierre" value={`${averageClosureDays} d`} detail={`${promotedActivities} actividades promovidas a Kaizen`} icon={Clock3} tone="red" />
      </section>

      <section className="mt-7 grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
        <PortfolioChartPanel eyebrow="Ritmo de ejecución" title="Recorridos y actividades cerradas" description="Evolución del trabajo detectado y resuelto en piso.">{trendRows.length ? <DynamicChart option={trendOption} style={{ height: 320 }} /> : <EmptyChart message="No hay recorridos en el periodo seleccionado." />}</PortfolioChartPanel>
        <PortfolioChartPanel eyebrow="Disciplina del recorrido" title="Asistencia por área" description="Identifica rápidamente dónde falta representación departamental.">{areaAttendanceRows.length ? <DynamicChart option={attendanceOption} style={{ height: 320 }} /> : <EmptyChart message="No hay asistencia registrada en esta selección." />}</PortfolioChartPanel>
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
        <PortfolioChartPanel eyebrow="Concentración operativa" title="Mapa de calor de actividades" description="Cantidad de hallazgos por área y periodo." action={area !== "all" ? <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">{area}</span> : undefined}>{topAreas.length && heatPeriods.length ? <DynamicChart option={heatmapOption} style={{ height: 350 }} /> : <EmptyChart message="Se necesitan recorridos para construir el mapa de calor." />}</PortfolioChartPanel>
        <PortfolioChartPanel eyebrow="Riesgo por antigüedad" title="Edad de actividades abiertas" description="Concentración de pendientes según días sin cierre."><DynamicChart option={agingOption} style={{ height: 350 }} /></PortfolioChartPanel>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase text-brand-700">Recorridos visibles</p><h2 className="mt-1 text-xl font-extrabold text-ink">Cumplimiento por GENBA</h2><p className="mt-1 text-sm text-slate-500">Hallazgos, asistencia y avance sin perder el contexto del recorrido.</p></div><span className="text-xs font-extrabold text-slate-500">{filteredWalks.length} recorridos</span></div>
        {!filteredWalks.length ? <EmptyState title="No hay recorridos con estos filtros" description="Restablece los filtros para recuperar el historial completo." /> : <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{filteredWalks.slice(0, 12).map((walk) => { const progress = activityProgress(walk.activities); const overdue = walk.activities.filter((activity) => isActivityOverdue(activity, now)).length; const blocked = walk.activities.filter((activity) => activity.status === "BLOQUEADA").length; const risk = overdue > 0 || blocked > 0; return <Link className={`surface surface-interactive block min-h-64 rounded-lg border-l-4 p-5 ${risk ? "border-l-rose-500" : "border-l-slate-950"}`} href={`/genba/${walk.id}`} key={walk.id}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase text-brand-700">GENBA #{String(walk.number).padStart(3, "0")}</p><h3 className="mt-1 text-lg font-extrabold text-ink">{walk.areaName}</h3><p className="mt-1 text-xs text-slate-500">{new Date(walk.visitDate).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: PROPEX_TIME_ZONE })}</p></div><GenbaStatusPill status={walk.status} /></div><div className="mt-5"><ProgressMeter label={`${progress.closed} de ${progress.total} actividades cerradas`} percent={progress.percent} /></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs"><div><p className="font-bold text-slate-500">Coordinador</p><p className="mt-1 truncate font-extrabold text-slate-800">{walk.coordinatorName}</p></div><div><p className="font-bold text-slate-500">Asistencia</p><p className="mt-1 font-extrabold text-slate-800">{attendance(walk)}%</p></div></div>{risk ? <p className="mt-4 flex items-center gap-2 text-xs font-extrabold text-rose-700"><AlertTriangle className="h-4 w-4" aria-hidden />{overdue} vencidas · {blocked} bloqueadas</p> : null}</Link>; })}</div>}
      </section>

      <section className="mt-7">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase text-slate-500">Siguiente paso</p><h2 className="mt-1 text-xl font-extrabold text-ink">Próximos compromisos</h2></div><Link className="text-xs font-extrabold text-brand-700 hover:underline" href="/genba/kanban">Abrir Kanban</Link></div>
        {!commitments.length ? <EmptyState title="No hay actividades abiertas" description="Todos los hallazgos de la selección están atendidos." /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>GENBA</th><th>Área</th><th>Actividad</th><th>Responsable</th><th>Compromiso</th><th>Estatus</th><th></th></tr></thead><tbody>{commitments.map((activity) => <tr key={activity.id}><td className="font-extrabold text-brand-700">{activity.walk.folio}</td><td>{activity.walk.areaName}</td><td className="min-w-64">{activity.action ?? activity.problem}</td><td>{activity.ownerName ?? "Sin asignar"}</td><td className={isActivityOverdue(activity, now) ? "font-extrabold text-rose-700" : ""}>{activity.dueDate ? new Date(activity.dueDate).toLocaleDateString("es-MX", { timeZone: PROPEX_TIME_ZONE }) : "Sin fecha"}</td><td><WorkStatusPill status={activity.status} /></td><td><Link aria-label={`Abrir ${activity.walk.folio}`} className="icon-button h-9 w-9 min-w-9" href={`/genba/${activity.walk.id}`}><ArrowRight className="h-4 w-4" aria-hidden /></Link></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
~~~~~~

### `src/components/idea-card.tsx`

~~~~~~tsx
import type { Approval, ApprovalStatus, ApprovalType, Area, Idea, User } from "@prisma/client";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Check, Clock3, HelpCircle, UserRound, X } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { approvalStatusLabels, ideaCategoryLabels, isOverdue } from "@/lib/domain";

type IdeaWithBasics = Idea & {
  area: Area;
  supervisor?: User | null;
  implementationOwner?: User | null;
  approvals: Approval[];
};

const validationOrder: ApprovalType[] = ["SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO"];

const validationLabels: Partial<Record<ApprovalType, string>> = {
  SUPERVISOR: "Supervisor",
  CALIDAD: "Calidad",
  SEGURIDAD: "Seguridad",
  MANTENIMIENTO: "Mantenimiento"
};

const departmentBorder: Partial<Record<ApprovalType, string>> = {
  SUPERVISOR: "border-l-emerald-600",
  CALIDAD: "border-l-red-600",
  SEGURIDAD: "border-l-slate-500",
  MANTENIMIENTO: "border-l-blue-600"
};

const validationStatus: Record<ApprovalStatus, { icon: typeof Check; tone: string }> = {
  APPROVED: { icon: Check, tone: "bg-emerald-50 text-emerald-800" },
  REJECTED: { icon: X, tone: "bg-rose-50 text-rose-800" },
  MORE_INFO: { icon: HelpCircle, tone: "bg-amber-50 text-amber-800" },
  PENDING: { icon: Clock3, tone: "bg-slate-100 text-slate-700" }
};

export function IdeaCard({ idea }: { idea: IdeaWithBasics }) {
  const overdue = isOverdue(idea);
  const validations = idea.approvals
    .filter((approval) => validationOrder.includes(approval.type))
    .sort((a, b) => validationOrder.indexOf(a.type) - validationOrder.indexOf(b.type));
  return (
    <Link className="surface surface-interactive group block rounded-lg p-4" href={`/ideas/${idea.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.06em] text-slate-500">{idea.area.code}</p>
          <p className="mt-0.5 text-sm font-extrabold text-ink">{idea.folio}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-slate-900" aria-hidden />
      </div>
      <p className="mt-3 line-clamp-3 text-sm font-semibold leading-5 text-slate-800">{idea.problem}</p>
      <p className="mt-2 text-[10px] font-extrabold uppercase text-emerald-700">{ideaCategoryLabels[idea.category]}</p>
      <div className="mt-4">
        <StatusPill status={idea.status} />
      </div>
      {validations.length ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-[10px] font-extrabold uppercase text-slate-500">Validaciones por area</p>
          <div className="grid grid-cols-2 gap-1.5">
            {validations.map((approval) => {
              const status = validationStatus[approval.status];
              const ValidationIcon = status.icon;
              return (
                <span className={`min-w-0 border border-line border-l-4 bg-white px-2 py-1.5 ${departmentBorder[approval.type] ?? "border-l-slate-400"}`} key={approval.id} title={`${validationLabels[approval.type]}: ${approvalStatusLabels[approval.status]}`}>
                  <span className="block truncate text-[9px] font-extrabold uppercase text-slate-500">{validationLabels[approval.type]}</span>
                  <span className={`mt-1 flex w-fit max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-extrabold ${status.tone}`}>
                    <ValidationIcon className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">{approvalStatusLabels[approval.status]}</span>
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-[11px] text-slate-600">
        <p className="flex min-w-0 items-center gap-2">
          <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{idea.implementationOwner?.name ?? idea.supervisor?.name ?? "Sin responsable"}</span>
        </p>
        <p className={`flex items-center gap-2 font-semibold ${overdue ? "text-rose-700" : ""}`}>
          <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : "Sin fecha compromiso"}
        </p>
      </div>
    </Link>
  );
}
~~~~~~

### `src/components/idea-progress.tsx`

~~~~~~tsx
import type { IdeaStatus } from "@prisma/client";
import { Check, X } from "lucide-react";

const stages = ["Captura", "Supervisor", "Validaciones", "Implementación", "Cierre"];

const stageByStatus: Record<IdeaStatus, number> = {
  REGISTRADA: 0,
  EN_REVISION_SUPERVISOR: 1,
  RECHAZADA_SUPERVISOR: 1,
  SOLICITUD_INFORMACION: 1,
  APROBADA_SUPERVISOR: 2,
  EN_VALIDACION_CALIDAD: 2,
  EN_VALIDACION_SEGURIDAD: 2,
  EN_VALIDACION_MANTENIMIENTO: 2,
  RECHAZADA_VALIDACION: 2,
  APROBADA_PARA_IMPLEMENTAR: 3,
  CLASIFICACION_MEJORA_CONTINUA: 3,
  EN_IMPLEMENTACION: 3,
  IMPLEMENTADA: 4,
  EN_VALIDACION_FINAL: 4,
  CERRADA: 4,
  CANCELADA: 4,
  VENCIDA: 3
};

const stoppedStatuses: IdeaStatus[] = ["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION", "CANCELADA"];

export function IdeaProgress({ status }: { status: IdeaStatus }) {
  const current = stageByStatus[status];
  const stopped = stoppedStatuses.includes(status);
  return (
    <ol aria-label="Progreso de la idea" className="grid grid-cols-5 gap-1 sm:gap-2">
      {stages.map((stage, index) => {
        const complete = index < current || status === "CERRADA";
        const active = index === current && status !== "CERRADA";
        const halted = active && stopped;
        return (
          <li className="min-w-0" key={stage}>
            <div className="flex items-center">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold ${complete ? "border-emerald-700 bg-emerald-700 text-white" : halted ? "border-rose-600 bg-rose-600 text-white" : active ? "border-[var(--role-accent)] bg-[var(--role-accent)] text-white" : "border-slate-300 bg-white text-slate-500"}`}>
                {complete ? <Check className="h-4 w-4" aria-hidden /> : halted ? <X className="h-4 w-4" aria-hidden /> : index + 1}
              </span>
              {index < stages.length - 1 ? <span className={`h-px flex-1 ${index < current ? "bg-emerald-600" : "bg-slate-300"}`} /> : null}
            </div>
            <p className={`mt-2 text-center text-[9px] font-extrabold leading-3 sm:text-xs ${complete || active ? "text-slate-800" : "text-slate-400"}`}>{stage}</p>
          </li>
        );
      })}
    </ol>
  );
}
~~~~~~

### `src/components/kaizen-command-center.tsx`

~~~~~~tsx
"use client";

import type { KaizenStatus, WorkItemStatus } from "@prisma/client";
import type { EChartsOption } from "echarts";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Gauge,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  UsersRound
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { KaizenStatusPill, WorkStatusPill } from "@/components/module-status";
import { EmptyChart, PortfolioAttention, PortfolioChartPanel, PortfolioMetric } from "@/components/portfolio-command-ui";
import { ProgressMeter } from "@/components/progress-meter";
import { WORKSPACE_PERIOD_EVENT, WORKSPACE_PERIOD_STORAGE, type WorkspacePeriod } from "@/components/workspace-controls";
import { kaizenStatusLabels, workItemStatusLabels } from "@/lib/domain";

const DynamicChart = dynamic(() => import("@/components/premium-chart"), {
  ssr: false,
  loading: () => <div className="flex h-72 items-center justify-center text-sm font-bold text-slate-400">Preparando visualización...</div>
});

const DAY = 86_400_000;
const PROPEX_TIME_ZONE = "America/Monterrey";
type Period = WorkspacePeriod;

export type KaizenDashboardActivity = {
  id: string;
  number: number;
  action: string;
  ownerName: string | null;
  startDate: string | null;
  dueDate: string | null;
  status: WorkItemStatus;
  closedAt: string | null;
  createdAt: string;
};

export type KaizenDashboardProject = {
  id: string;
  number: number;
  folio: string;
  title: string;
  plant: string | null;
  area: string;
  objective: string;
  status: KaizenStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  leaderName: string;
  sourceIdeaFolio: string | null;
  estimatedSavings: number;
  realSavings: number;
  hasCharter: boolean;
  activities: KaizenDashboardActivity[];
};

function activityProgress(activities: KaizenDashboardActivity[]) {
  const relevant = activities.filter((activity) => activity.status !== "COMBINADA");
  const closed = relevant.filter((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status)).length;
  return { total: relevant.length, closed, open: relevant.length - closed, percent: relevant.length ? Math.round((closed / relevant.length) * 100) : 0 };
}

function plannedProgress(project: KaizenDashboardProject, now: Date) {
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.endDate).getTime();
  if (now.getTime() <= start) return 0;
  if (now.getTime() >= end || end <= start) return 100;
  return Math.round(((now.getTime() - start) / (end - start)) * 100);
}

function isActivityOverdue(activity: KaizenDashboardActivity, now: Date) {
  return Boolean(activity.dueDate && new Date(activity.dueDate) < now && !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status));
}

function currency(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value);
}

export function KaizenCommandCenter({ projects, generatedAt }: { projects: KaizenDashboardProject[]; generatedAt: string }) {
  const [period, setPeriod] = useState<Period>("90");
  const [plant, setPlant] = useState("all");
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState<"all" | KaizenStatus>("all");
  const [responsible, setResponsible] = useState("all");
  const now = useMemo(() => new Date(generatedAt), [generatedAt]);

  useEffect(() => {
    const storedPeriod = window.localStorage.getItem(WORKSPACE_PERIOD_STORAGE);
    if (["30", "90", "365", "all"].includes(storedPeriod ?? "")) setPeriod(storedPeriod as Period);
    const onPeriodChange = (event: Event) => setPeriod((event as CustomEvent<WorkspacePeriod>).detail);
    window.addEventListener(WORKSPACE_PERIOD_EVENT, onPeriodChange);
    return () => window.removeEventListener(WORKSPACE_PERIOD_EVENT, onPeriodChange);
  }, []);

  const plants = useMemo(() => [...new Set(projects.map((project) => project.plant ?? "Sin planta"))].sort(), [projects]);
  const areas = useMemo(() => [...new Set(projects.map((project) => project.area))].sort(), [projects]);
  const responsibles = useMemo(() => [...new Set(projects.flatMap((project) => [project.leaderName, ...project.activities.flatMap((activity) => activity.ownerName ? [activity.ownerName] : [])]))].sort(), [projects]);

  const filteredProjects = useMemo(() => {
    const start = period === "all" ? null : now.getTime() - Number(period) * DAY;
    return projects.filter((project) => {
      const overlapsPeriod = start === null || new Date(project.endDate).getTime() >= start;
      const matchesResponsible = responsible === "all" || project.leaderName === responsible || project.activities.some((activity) => activity.ownerName === responsible);
      return overlapsPeriod &&
        (plant === "all" || (project.plant ?? "Sin planta") === plant) &&
        (area === "all" || project.area === area) &&
        (status === "all" || project.status === status) &&
        matchesResponsible;
    });
  }, [projects, period, plant, area, status, responsible, now]);

  const projectRows = useMemo(() => filteredProjects.map((project) => {
    const progress = activityProgress(project.activities);
    const planned = plannedProgress(project, now);
    const overdue = project.activities.filter((activity) => isActivityOverdue(activity, now)).length;
    const blocked = project.activities.filter((activity) => activity.status === "BLOQUEADA").length;
    return { project, progress, planned, overdue, blocked, atRisk: ["PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(project.status) && (overdue > 0 || blocked > 0 || progress.percent + 10 < planned) };
  }), [filteredProjects, now]);

  const relevantActivities = useMemo(() => filteredProjects.flatMap((project) => project.activities.map((activity) => ({ ...activity, project }))).filter((activity) => activity.status !== "COMBINADA"), [filteredProjects]);
  const openActivities = relevantActivities.filter((activity) => !["COMPLETADA", "CANCELADA"].includes(activity.status));
  const overdueActivities = openActivities.filter((activity) => isActivityOverdue(activity, now));
  const blockedActivities = openActivities.filter((activity) => activity.status === "BLOQUEADA");
  const charterPending = filteredProjects.filter((project) => project.status === "PENDIENTE_CHARTER" || !project.hasCharter);
  const activeProjects = filteredProjects.filter((project) => ["PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(project.status));
  const aggregateProgress = activityProgress(relevantActivities);
  const estimatedSavings = filteredProjects.reduce((sum, project) => sum + project.estimatedSavings, 0);
  const realSavings = filteredProjects.reduce((sum, project) => sum + project.realSavings, 0);
  const savingsAchievement = estimatedSavings ? Math.round((realSavings / estimatedSavings) * 100) : 0;
  const closedWithDate = relevantActivities.filter((activity) => activity.closedAt && activity.dueDate && ["COMPLETADA", "CANCELADA"].includes(activity.status));
  const onTimeRate = closedWithDate.length ? Math.round((closedWithDate.filter((activity) => new Date(activity.closedAt!) <= new Date(activity.dueDate!)).length / closedWithDate.length) * 100) : 0;
  const atRisk = projectRows.filter((row) => row.atRisk);

  const workloadRows = useMemo(() => {
    const map = new Map<string, number>();
    openActivities.forEach((activity) => map.set(activity.ownerName ?? "Sin asignar", (map.get(activity.ownerName ?? "Sin asignar") ?? 0) + 1));
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [openActivities]);

  const chartProjects = projectRows.filter((row) => ["PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(row.project.status)).sort((a, b) => Number(b.atRisk) - Number(a.atRisk) || b.planned - b.progress.percent).slice(0, 10);
  const progressOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    color: ["#171717", "#EA0029"],
    tooltip: { trigger: "axis", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    legend: { bottom: 0, icon: "circle", textStyle: { color: "#64748b", fontSize: 11 } },
    grid: { left: 42, right: 14, top: 24, bottom: 72 },
    xAxis: { type: "category", data: chartProjects.map((row) => `K-${String(row.project.number).padStart(3, "0")}`), axisLine: { lineStyle: { color: "#d8d8d8" } }, axisTick: { show: false }, axisLabel: { color: "#64748b", fontSize: 10, rotate: chartProjects.length > 7 ? 35 : 0 } },
    yAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%", color: "#94a3b8" }, splitLine: { lineStyle: { color: "#eeeeee" } } },
    series: [
      { name: "Avance planeado", type: "bar", barMaxWidth: 22, data: chartProjects.map((row) => row.planned), itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: "Avance real", type: "bar", barMaxWidth: 22, data: chartProjects.map((row) => row.progress.percent), itemStyle: { borderRadius: [4, 4, 0, 0] } }
    ]
  };

  const savingsProjects = filteredProjects.filter((project) => project.estimatedSavings || project.realSavings).sort((a, b) => b.estimatedSavings - a.estimatedSavings).slice(0, 10);
  const savingsOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    color: ["#171717", "#14835f"],
    tooltip: { trigger: "axis", valueFormatter: (value) => currency(Number(value)), backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    legend: { bottom: 0, icon: "circle", textStyle: { color: "#64748b", fontSize: 11 } },
    grid: { left: 78, right: 20, top: 18, bottom: 48 },
    xAxis: { type: "value", axisLabel: { color: "#94a3b8", formatter: (value: number) => `$${Math.round(value / 1000)}k` }, splitLine: { lineStyle: { color: "#eeeeee" } } },
    yAxis: { type: "category", inverse: true, data: savingsProjects.map((project) => `K-${String(project.number).padStart(3, "0")}`), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontWeight: 700 } },
    series: [
      { name: "Estimado", type: "bar", barMaxWidth: 16, data: savingsProjects.map((project) => project.estimatedSavings), itemStyle: { borderRadius: [0, 4, 4, 0] } },
      { name: "Real", type: "bar", barMaxWidth: 16, data: savingsProjects.map((project) => project.realSavings), itemStyle: { borderRadius: [0, 4, 4, 0] } }
    ]
  };

  const workloadOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { trigger: "item", formatter: "{b}: {c} actividades abiertas", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    grid: { left: 120, right: 34, top: 12, bottom: 22 },
    xAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeeee" } }, axisLabel: { color: "#94a3b8" } },
    yAxis: { type: "category", inverse: true, data: workloadRows.map((row) => row.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontSize: 10, width: 108, overflow: "truncate" } },
    series: [{ type: "bar", barWidth: 14, data: workloadRows.map((row) => row.value), itemStyle: { color: "#EA0029", borderRadius: [0, 5, 5, 0] }, label: { show: true, position: "right", color: "#171717", fontWeight: 700 } }]
  };

  const statusRows = Object.entries(workItemStatusLabels).map(([key, label]) => ({ key: key as WorkItemStatus, label, value: relevantActivities.filter((activity) => activity.status === key).length })).filter((row) => row.value);
  const statusOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { trigger: "item", formatter: "{b}: {c} actividades", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    grid: { left: 116, right: 30, top: 12, bottom: 20 },
    xAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeeee" } }, axisLabel: { color: "#94a3b8" } },
    yAxis: { type: "category", inverse: true, data: statusRows.map((row) => row.label), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontSize: 10, width: 104, overflow: "truncate" } },
    series: [{ type: "bar", barMaxWidth: 22, data: statusRows.map((row) => ({ value: row.value, itemStyle: { color: row.key === "BLOQUEADA" ? "#d32236" : row.key === "COMPLETADA" ? "#14835f" : row.key === "EN_PROCESO" ? "#176fc1" : "#a16207", borderRadius: [0, 5, 5, 0] } })), label: { show: true, position: "right", color: "#171717", fontWeight: 700 } }]
  };

  const commitments = openActivities.slice().sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  }).slice(0, 12);
  const activeFilters = [period !== "90", plant !== "all", area !== "all", status !== "all", responsible !== "all"].filter(Boolean).length;
  const updatePeriod = (value: Period) => { setPeriod(value); window.localStorage.setItem(WORKSPACE_PERIOD_STORAGE, value); window.dispatchEvent(new CustomEvent<WorkspacePeriod>(WORKSPACE_PERIOD_EVENT, { detail: value })); };
  const resetFilters = () => { updatePeriod("90"); setPlant("all"); setArea("all"); setStatus("all"); setResponsible("all"); };

  return (
    <div className="dashboard-command-center">
      <section className="surface mb-5 rounded-lg p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-500" aria-hidden /><p className="text-xs font-extrabold uppercase text-slate-500">Control del portafolio</p></div><h2 className="mt-1 text-lg font-extrabold text-ink">Decide con el avance real de cada Kaizen</h2><p className="mt-1 text-xs text-slate-500">Actualizado {now.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: PROPEX_TIME_ZONE })}</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label><span className="label">Periodo</span><select className="field min-w-36" value={period} onChange={(event) => updatePeriod(event.target.value as Period)}><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="365">Último año</option><option value="all">Todo el historial</option></select></label>
            <label><span className="label">Planta</span><select className="field min-w-32" value={plant} onChange={(event) => setPlant(event.target.value)}><option value="all">Todas</option>{plants.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
            <label><span className="label">Área</span><select className="field min-w-32" value={area} onChange={(event) => setArea(event.target.value)}><option value="all">Todas</option>{areas.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
            <label><span className="label">Estatus</span><select className="field min-w-40" value={status} onChange={(event) => setStatus(event.target.value as "all" | KaizenStatus)}><option value="all">Todos</option>{Object.entries(kaizenStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label><span className="label">Responsable</span><select className="field min-w-40" value={responsible} onChange={(event) => setResponsible(event.target.value)}><option value="all">Todos</option>{responsibles.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          </div>
        </div>
        {activeFilters ? <div className="mt-4 flex items-center gap-3 border-t border-line pt-3"><span className="text-xs font-bold text-slate-500">{activeFilters} filtros activos</span><button className="btn btn-secondary ml-auto min-h-9 px-3 text-xs" onClick={resetFilters} type="button"><RotateCcw className="h-3.5 w-3.5" aria-hidden />Restablecer</button></div> : null}
      </section>

      <PortfolioAttention eyebrow="Atención de hoy" title="Proyectos que necesitan movimiento" description="Prioriza documentación, bloqueos y desviaciones del plan." items={[
        { label: "Project Charter pendientes", value: charterPending.length, href: charterPending[0] ? `/kaizen/${charterPending[0].id}` : "/kaizen", icon: Clock3, tone: "text-amber-300" },
        { label: "Actividades vencidas", value: overdueActivities.length, href: "/kaizen/kanban", icon: CalendarClock, tone: "text-rose-300" },
        { label: "Actividades bloqueadas", value: blockedActivities.length, href: "/kaizen/kanban", icon: ShieldAlert, tone: "text-red-300" },
        { label: "Proyectos en riesgo", value: atRisk.length, href: atRisk[0] ? `/kaizen/${atRisk[0].project.id}` : "/kaizen", icon: AlertTriangle, tone: "text-orange-300" }
      ]} />

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PortfolioMetric label="Kaizen activos" value={activeProjects.length} detail={`${filteredProjects.length} proyectos en la selección`} icon={FolderKanban} />
        <PortfolioMetric label="Avance global" value={`${aggregateProgress.percent}%`} detail={`${aggregateProgress.closed} de ${aggregateProgress.total} actividades cerradas`} icon={Gauge} tone="green" />
        <PortfolioMetric label="Cumplimiento de fecha" value={`${onTimeRate}%`} detail={`${closedWithDate.length} cierres con fecha evaluable`} icon={Target} tone="blue" />
        <PortfolioMetric label="Actividades vencidas" value={overdueActivities.length} detail="Requieren ajuste o escalamiento" icon={AlertTriangle} tone="red" />
        <PortfolioMetric label="Ahorro realizado" value={currency(realSavings)} detail={`${savingsAchievement}% de ${currency(estimatedSavings)} estimados`} icon={Banknote} tone="amber" />
      </section>

      <section className="mt-7 grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
        <PortfolioChartPanel eyebrow="Salud del calendario" title="Avance planeado contra real" description="La diferencia revela proyectos atrasados antes de que venzan.">{chartProjects.length ? <DynamicChart option={progressOption} style={{ height: 330 }} /> : <EmptyChart message="No hay proyectos activos con estos filtros." />}</PortfolioChartPanel>
        <PortfolioChartPanel eyebrow="Beneficio comprobado" title="Ahorro estimado contra real" description="Comparación económica por proyecto Kaizen.">{savingsProjects.length ? <DynamicChart option={savingsOption} style={{ height: 330 }} /> : <EmptyChart message="Aún no hay beneficios económicos registrados." />}</PortfolioChartPanel>
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-2">
        <PortfolioChartPanel eyebrow="Capacidad" title="Carga abierta por responsable" description="Selecciona un responsable en los filtros para profundizar.">{workloadRows.length ? <DynamicChart option={workloadOption} style={{ height: 320 }} /> : <EmptyChart message="No hay actividades abiertas en la selección." />}</PortfolioChartPanel>
        <PortfolioChartPanel eyebrow="Flujo de ejecución" title="Estado de las actividades" description="Distribución de trabajo pendiente, en proceso, bloqueado y cerrado.">{statusRows.length ? <DynamicChart option={statusOption} style={{ height: 320 }} /> : <EmptyChart message="No hay actividades para analizar." />}</PortfolioChartPanel>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase text-brand-700">Portafolio visible</p><h2 className="mt-1 text-xl font-extrabold text-ink">Salud de cada Kaizen</h2><p className="mt-1 text-sm text-slate-500">Avance, fechas, responsable y alerta en una sola lectura.</p></div><span className="text-xs font-extrabold text-slate-500">{projectRows.length} proyectos</span></div>
        {!projectRows.length ? <EmptyState title="No hay Kaizen con estos filtros" description="Restablece los filtros para recuperar el portafolio completo." /> : <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{projectRows.map(({ project, progress, planned, overdue, blocked, atRisk: risk }) => <Link className={`surface surface-interactive block min-h-72 rounded-lg border-l-4 p-5 ${risk ? "border-l-rose-500" : "border-l-slate-950"}`} href={`/kaizen/${project.id}`} key={project.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-extrabold uppercase text-brand-700">Kaizen #{String(project.number).padStart(3, "0")}</p><h3 className="mt-1 line-clamp-2 text-lg font-extrabold leading-6 text-ink">{project.title}</h3></div><KaizenStatusPill status={project.status} /></div><p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">{project.objective}</p><div className="mt-5"><ProgressMeter label={`${progress.closed} de ${progress.total} actividades · plan ${planned}%`} percent={progress.percent} /></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs"><div><p className="font-bold text-slate-500">Líder</p><p className="mt-1 truncate font-extrabold text-slate-800">{project.leaderName}</p></div><div><p className="font-bold text-slate-500">Fecha objetivo</p><p className="mt-1 font-extrabold text-slate-800">{new Date(project.endDate).toLocaleDateString("es-MX", { timeZone: PROPEX_TIME_ZONE })}</p></div></div>{risk ? <p className="mt-4 flex items-center gap-2 text-xs font-extrabold text-rose-700"><AlertTriangle className="h-4 w-4" aria-hidden />{overdue} vencidas · {blocked} bloqueadas · brecha {Math.max(0, planned - progress.percent)} pts</p> : null}</Link>)}</div>}
      </section>

      <section className="mt-7">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase text-slate-500">Siguiente paso</p><h2 className="mt-1 text-xl font-extrabold text-ink">Próximos compromisos</h2></div><Link className="text-xs font-extrabold text-brand-700 hover:underline" href="/kaizen/kanban">Abrir Kanban</Link></div>
        {!commitments.length ? <EmptyState title="No hay actividades abiertas" description="Todos los compromisos de la selección están atendidos." /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Kaizen</th><th>Actividad</th><th>Responsable</th><th>Compromiso</th><th>Estatus</th><th></th></tr></thead><tbody>{commitments.map((activity) => <tr key={activity.id}><td className="font-extrabold text-brand-700">{activity.project.folio}</td><td className="min-w-64">{activity.action}</td><td>{activity.ownerName ?? "Sin asignar"}</td><td className={isActivityOverdue(activity, now) ? "font-extrabold text-rose-700" : ""}>{activity.dueDate ? new Date(activity.dueDate).toLocaleDateString("es-MX", { timeZone: PROPEX_TIME_ZONE }) : "Sin fecha"}</td><td><WorkStatusPill status={activity.status} /></td><td><Link aria-label={`Abrir ${activity.project.folio}`} className="icon-button h-9 w-9 min-w-9" href={`/kaizen/${activity.project.id}`}><ArrowRight className="h-4 w-4" aria-hidden /></Link></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
~~~~~~

### `src/components/mini-charts.tsx`

~~~~~~tsx
import type { ComponentType } from "react";

const toneClasses = {
  neutral: "bg-slate-100 text-slate-700",
  dark: "bg-slate-950 text-white",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-rose-50 text-rose-700",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-800"
};

export function BarList({ rows, color = "var(--role-accent)" }: { rows: Array<{ label: string; value: number }>; color?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="space-y-3.5">
      {rows.map((row) => (
        <div className="grid grid-cols-[minmax(72px,112px)_1fr_32px] items-center gap-3" key={row.label}>
          <span className="truncate text-xs font-bold text-slate-600" title={row.label}>{row.label}</span>
          <div aria-label={`${row.label}: ${row.value}`} className="h-2 overflow-hidden rounded-full bg-slate-100" role="img">
            <div className="h-full rounded-full" style={{ backgroundColor: color, width: `${row.value ? Math.max(5, (row.value / max) * 100) : 0}%` }} />
          </div>
          <span className="text-right text-xs font-extrabold text-ink">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral"
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <article className="surface min-h-[132px] rounded-lg p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.04em] text-slate-500">{label}</p>
        {Icon ? (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-extrabold leading-none text-ink">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p> : null}
    </article>
  );
}
~~~~~~

### `src/components/module-status.tsx`

~~~~~~tsx
import type { GenbaStatus, KaizenStatus, WorkItemStatus } from "@prisma/client";
import { genbaStatusLabels, kaizenStatusLabels, workItemStatusLabels } from "@/lib/domain";

const kaizenTone: Record<KaizenStatus, string> = {
  PENDIENTE_CHARTER: "border-amber-200 bg-amber-50 text-amber-800",
  PLANIFICACION: "border-sky-200 bg-sky-50 text-sky-800",
  EN_CURSO: "border-emerald-200 bg-emerald-50 text-emerald-800",
  EN_PAUSA: "border-slate-300 bg-slate-100 text-slate-700",
  COMPLETADO: "border-emerald-700 bg-emerald-700 text-white",
  CANCELADO: "border-rose-200 bg-rose-50 text-rose-700"
};

const workTone: Record<WorkItemStatus, string> = {
  PENDIENTE: "border-amber-200 bg-amber-50 text-amber-800",
  EN_PROCESO: "border-blue-200 bg-blue-50 text-blue-800",
  BLOQUEADA: "border-rose-200 bg-rose-50 text-rose-700",
  COMPLETADA: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELADA: "border-slate-300 bg-slate-100 text-slate-700",
  COMBINADA: "border-violet-200 bg-violet-50 text-violet-800"
};

const genbaTone: Record<GenbaStatus, string> = {
  ABIERTO: "border-red-200 bg-red-50 text-red-800",
  CERRADO: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELADO: "border-slate-300 bg-slate-100 text-slate-700"
};

function Pill({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${className}`}>{label}</span>;
}

export function KaizenStatusPill({ status }: { status: KaizenStatus }) {
  return <Pill className={kaizenTone[status]} label={kaizenStatusLabels[status]} />;
}

export function WorkStatusPill({ status }: { status: WorkItemStatus }) {
  return <Pill className={workTone[status]} label={workItemStatusLabels[status]} />;
}

export function GenbaStatusPill({ status }: { status: GenbaStatus }) {
  return <Pill className={genbaTone[status]} label={genbaStatusLabels[status]} />;
}
~~~~~~

### `src/components/organization-builder.tsx`

~~~~~~tsx
"use client";

import {
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleAlert,
  ExternalLink,
  Factory,
  FolderTree,
  LoaderCircle,
  Mail,
  MapPin,
  Minus,
  Network,
  Pencil,
  Plus,
  QrCode,
  Search,
  UserRound,
  Warehouse,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOrganizationUnitAction } from "@/app/(app)/configuracion/estructura/actions";
import type {
  OrganizationNode,
  OrganizationPlant,
  OrganizationStructure,
  OrganizationUserOption,
  OrgNodeType,
  PlantCode
} from "@/lib/organization-types";

type NodeMatch = {
  node: OrganizationNode;
  parent: OrganizationNode | null;
  path: OrganizationNode[];
};

type EditorState = {
  mode: "create" | "edit";
  nodeId: string | null;
  parentId: string | null;
};

type EditorValues = {
  type: OrgNodeType;
  name: string;
  code: string;
  responsible: string;
  manager: string;
  routingUserId: string;
  qrEnabled: boolean;
  active: boolean;
};

const nodeTypeLabels: Record<OrgNodeType, string> = {
  MACROPROCESO: "Macroproceso",
  DEPARTAMENTO: "Departamento",
  AREA: "Area",
  PROCESO: "Proceso o equipo"
};

const emptyValues: EditorValues = {
  type: "DEPARTAMENTO",
  name: "",
  code: "",
  responsible: "",
  manager: "",
  routingUserId: "",
  qrEnabled: false,
  active: true
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function walkNodes(nodes: OrganizationNode[], callback: (match: NodeMatch) => void, parent: OrganizationNode | null = null, path: OrganizationNode[] = []) {
  for (const node of nodes) {
    const nextPath = [...path, node];
    callback({ node, parent, path: nextPath });
    walkNodes(node.children, callback, node, nextPath);
  }
}

function findNode(nodes: OrganizationNode[], id: string): NodeMatch | null {
  let result: NodeMatch | null = null;
  walkNodes(nodes, (match) => {
    if (match.node.id === id) result = match;
  });
  return result;
}

function matchesNode(node: OrganizationNode, query: string): boolean {
  const ownValue = normalize([
    node.name,
    node.code,
    node.responsible,
    node.manager,
    node.routingUser?.name,
    node.routingUser?.email,
    nodeTypeLabels[node.type]
  ].filter(Boolean).join(" "));
  return ownValue.includes(query) || node.children.some((child) => matchesNode(child, query));
}

function countNodes(nodes: OrganizationNode[]) {
  let count = 0;
  walkNodes(nodes, () => { count += 1; });
  return count;
}

function nodeIcon(type: OrgNodeType) {
  if (type === "MACROPROCESO") return Network;
  if (type === "DEPARTAMENTO") return Building2;
  if (type === "AREA") return Factory;
  return FolderTree;
}

export function OrganizationBuilder({
  initialStructure,
  users
}: {
  initialStructure: OrganizationStructure;
  users: OrganizationUserOption[];
}) {
  const router = useRouter();
  const [structure, setStructure] = useState(initialStructure);
  const [plant, setPlant] = useState<PlantCode | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [values, setValues] = useState<EditorValues>(emptyValues);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isSaving, startSaving] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setStructure(initialStructure);
  }, [initialStructure]);

  useEffect(() => {
    if (editor && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [editor]);

  const activePlant: OrganizationPlant | null = plant ? structure[plant] : null;
  const nodes = activePlant?.nodes ?? [];
  const selected = selectedId ? findNode(nodes, selectedId) : null;

  const parentOptions = useMemo(() => {
    const options: NodeMatch[] = [];
    if (!plant) return options;
    walkNodes(structure[plant].nodes, (match) => {
      if (["MACROPROCESO", "DEPARTAMENTO", "AREA"].includes(match.node.type)) options.push(match);
    });
    return options;
  }, [plant, structure]);

  function choosePlant(code: PlantCode) {
    const plantNodes = structure[code].nodes;
    setPlant(code);
    setSelectedId(plantNodes[0]?.id ?? null);
    setExpanded(new Set(plantNodes.map((node) => node.id)));
    setQuery("");
    setMessage("");
  }

  function toggleNode(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate(parentId: string | null = null) {
    setMessage("");
    setValues({ ...emptyValues, type: parentId ? "PROCESO" : "DEPARTAMENTO", code: plant ? `${plant}-` : "" });
    setEditor({ mode: "create", nodeId: null, parentId });
  }

  function openEdit() {
    if (!selected) return;
    setMessage("");
    setValues({
      type: selected.node.type,
      name: selected.node.name,
      code: selected.node.code,
      responsible: selected.node.responsible,
      manager: selected.node.manager,
      routingUserId: selected.node.routingUserId ?? "",
      qrEnabled: selected.node.qrEnabled,
      active: selected.node.active
    });
    setEditor({ mode: "edit", nodeId: selected.node.id, parentId: selected.parent?.id ?? null });
  }

  function closeEditor() {
    dialogRef.current?.close();
    setEditor(null);
  }

  function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activePlant || !editor) return;
    const formData = new FormData(event.currentTarget);

    startSaving(async () => {
      const result = await saveOrganizationUnitAction(formData);
      setMessage(result.message);
      setMessageTone(result.ok ? "success" : "error");
      if (result.ok) {
        closeEditor();
        router.refresh();
      }
    });
  }

  function renderNode(node: OrganizationNode, depth = 0): React.ReactNode {
    const normalizedQuery = normalize(query.trim());
    if (normalizedQuery && !matchesNode(node, normalizedQuery)) return null;
    const hasChildren = node.children.length > 0;
    const isExpanded = normalizedQuery ? hasChildren : expanded.has(node.id);
    const Icon = nodeIcon(node.type);

    return (
      <div key={node.id} role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
        <div
          className={`grid min-w-0 grid-cols-[42px_minmax(0,1fr)_42px] items-center border-b border-line px-1 py-1 transition-colors ${selectedId === node.id ? "bg-brand-50" : "hover:bg-panel"} ${node.active ? "" : "opacity-60"}`}
          style={{ marginLeft: `${Math.min(depth, 4) * 14}px` }}
        >
          {hasChildren ? (
            <button className="icon-button h-9 w-9" type="button" onClick={() => toggleNode(node.id)} title={isExpanded ? `Contraer ${node.name}` : `Expandir ${node.name}`} aria-label={isExpanded ? `Contraer ${node.name}` : `Expandir ${node.name}`}>
              {isExpanded ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
            </button>
          ) : <span className="flex h-9 w-9 items-center justify-center text-slate-400"><Minus className="h-4 w-4" aria-hidden /></span>}

          <button className="min-w-0 px-2 py-2 text-left" type="button" onClick={() => setSelectedId(node.id)}>
            <span className="flex min-w-0 items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              <span className="min-w-0">
                <span className="block break-words text-sm font-extrabold text-ink">{node.name}</span>
                <span className="mt-0.5 block break-words text-xs text-slate-500">{nodeTypeLabels[node.type]} · {node.code}</span>
              </span>
            </span>
          </button>

          <button className="icon-button h-9 w-9" type="button" onClick={() => openCreate(node.id)} title={`Agregar dentro de ${node.name}`} aria-label={`Agregar dentro de ${node.name}`}>
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {hasChildren && isExpanded ? (
          <div className="ml-5 border-l border-line pl-1" role="group">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  }

  if (!plant) {
    return (
      <section className="surface p-5 sm:p-7" aria-labelledby="plant-selector-title">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-brand-700">Paso 1 de 3 · Planta</p>
            <h2 id="plant-selector-title" className="text-xl font-extrabold text-ink sm:text-2xl">¿Que planta quieres administrar?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">La planta se selecciona antes de mostrar areas, responsables o codigos para evitar mezclar Apodaca con El Carmen.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="surface surface-interactive flex min-h-32 items-center gap-4 p-5 text-left" type="button" onClick={() => choosePlant("APO")}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-brand-500 text-white"><Factory className="h-6 w-6" aria-hidden /></span>
              <span><strong className="block text-lg text-ink">Apodaca</strong><span className="mt-1 block text-sm text-slate-600">Codigo de planta APO · {countNodes(structure.APO.nodes)} elementos</span></span>
            </button>
            <button className="surface surface-interactive flex min-h-32 items-center gap-4 p-5 text-left" type="button" onClick={() => choosePlant("CAR")}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-ink text-white"><Warehouse className="h-6 w-6" aria-hidden /></span>
              <span><strong className="block text-lg text-ink">El Carmen</strong><span className="mt-1 block text-sm text-slate-600">Codigo de planta CAR · {countNodes(structure.CAR.nodes)} elementos</span></span>
            </button>
          </div>
          <div className="mt-5 border-l-4 border-emerald-600 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-extrabold">Conectado a la base de datos</p>
            <p className="mt-1 leading-5">Los cambios que guardes aqui se aplican al sistema y quedan registrados en auditoria.</p>
          </div>
        </div>
      </section>
    );
  }

  const currentPlant = activePlant as OrganizationPlant;
  const normalizedQuery = normalize(query.trim());
  const visibleNodes = nodes.filter((node) => !normalizedQuery || matchesNode(node, normalizedQuery));

  return (
    <>
      <section className="mb-5 border-b border-line bg-white px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">Estructura activa</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-500" aria-hidden />
              <h2 className="text-xl font-extrabold text-ink">{currentPlant.name}</h2>
              <span className="rounded bg-ink px-2 py-1 text-xs font-extrabold text-white">{plant}</span>
            </div>
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => { setPlant(null); setSelectedId(null); setMessage(""); }}><MapPin className="h-4 w-4" aria-hidden />Cambiar planta</button>
        </div>
      </section>

      {message ? (
        <div className={`alert mb-5 ${messageTone === "success" ? "alert-success" : "alert-danger"}`} role="status">
          {messageTone === "success" ? <Network className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
          <span className="font-bold">{message}</span>
        </div>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.75fr)]">
        <section className="surface min-w-0 p-4 sm:p-5" aria-labelledby="structure-tree-title">
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <label className="min-w-0 flex-1">
                <span className="label">Buscar area, proceso, codigo o responsable</span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
                  <input className="field pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. Embarques, APO-LOG o Mejora Continua" type="search" />
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button className="icon-button" type="button" onClick={() => setExpanded(new Set())} title="Contraer todo" aria-label="Contraer todo"><ChevronsDownUp className="h-4 w-4" aria-hidden /></button>
                <button className="icon-button" type="button" onClick={() => {
                  const ids = new Set<string>();
                  walkNodes(nodes, ({ node }) => { if (node.children.length) ids.add(node.id); });
                  setExpanded(ids);
                }} title="Expandir todo" aria-label="Expandir todo"><ChevronsUpDown className="h-4 w-4" aria-hidden /></button>
                <button className="btn btn-primary" type="button" onClick={() => openCreate()}><Plus className="h-4 w-4" aria-hidden />Agregar</button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{countNodes(nodes)} elementos en {currentPlant.name}</span><span>·</span><span>Selecciona una fila para revisar responsables</span>
            </div>
          </div>

          <h3 id="structure-tree-title" className="sr-only">Arbol de estructura organizacional</h3>
          <div role="tree" aria-label={`Estructura de ${currentPlant.name}`}>
            {visibleNodes.length ? visibleNodes.map((node) => renderNode(node)) : (
              <div className="py-10 text-center">
                <Search className="mx-auto h-7 w-7 text-slate-400" aria-hidden />
                <p className="mt-3 font-bold text-ink">No encontramos esa area</p>
                <p className="mt-1 text-sm text-slate-500">Prueba con el nombre, codigo, correo o responsable.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="surface min-w-0 p-5 xl:sticky xl:top-6" aria-live="polite">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-panel px-2 py-1 text-xs font-extrabold text-slate-700">{nodeTypeLabels[selected.node.type]}</span>
                <code className="text-xs font-bold text-brand-700">{selected.node.code}</code>
                <span className={`rounded px-2 py-1 text-[10px] font-extrabold ${selected.node.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{selected.node.active ? "Activo" : "Inactivo"}</span>
              </div>
              <h3 className="mt-3 break-words text-xl font-extrabold text-ink">{selected.node.name}</h3>
              <p className="mt-1 break-words text-xs leading-5 text-slate-500">{selected.path.map((node) => node.name).join(" › ")}</p>

              <dl className="mt-5 grid gap-4">
                <div className="border-b border-line pb-3"><dt className="text-xs font-bold text-slate-500">Planta</dt><dd className="mt-1 font-extrabold text-ink">{currentPlant.name}</dd></div>
                <div className="border-b border-line pb-3"><dt className="flex items-center gap-2 text-xs font-bold text-slate-500"><UserRound className="h-4 w-4" aria-hidden />Responsable</dt><dd className="mt-1 break-words font-bold text-ink">{selected.node.responsible}</dd></div>
                <div className="border-b border-line pb-3"><dt className="text-xs font-bold text-slate-500">Jefe directo o gerente</dt><dd className="mt-1 break-words font-bold text-ink">{selected.node.manager}</dd></div>
                <div className="border-b border-line pb-3">
                  <dt className="flex items-center gap-2 text-xs font-bold text-slate-500"><Mail className="h-4 w-4" aria-hidden />Quien recibe ideas y correos</dt>
                  <dd className="mt-1 break-words font-bold text-ink">{selected.node.routingUser?.name ?? "Pendiente de asignar"}</dd>
                  {selected.node.routingUser ? <dd className="mt-0.5 break-all text-xs text-slate-500">{selected.node.routingUser.email}</dd> : null}
                </div>
                <div className="border-b border-line pb-3"><dt className="text-xs font-bold text-slate-500">Contenido</dt><dd className="mt-1 font-bold text-ink">{selected.node.children.length ? `${selected.node.children.length} elementos dependientes` : "Sin subdivisiones registradas"}</dd></div>
                <div>
                  <dt className="flex items-center gap-2 text-xs font-bold text-slate-500"><QrCode className="h-4 w-4" aria-hidden />QR de captura</dt>
                  <dd className="mt-1 font-bold text-ink">{selected.node.qrEnabled ? `Habilitado · ${selected.node.captureArea?.code ?? "en preparacion"}` : "No requerido"}</dd>
                  {selected.node.qrEnabled && selected.node.captureArea ? <a className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-brand-700 hover:underline" href={`/captura/${selected.node.captureArea.code}`} rel="noreferrer" target="_blank">Probar formulario <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a> : null}
                </div>
              </dl>

              {selected.node.qrEnabled && !selected.node.routingUser ? (
                <div className="mt-5 border-l-4 border-amber-500 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  <strong className="block">Falta asignar el seguimiento</strong>
                  El QR funciona, pero los avisos no tendran destinatario hasta elegir un usuario activo.
                </div>
              ) : null}

              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <button className="btn btn-secondary" type="button" onClick={openEdit}><Pencil className="h-4 w-4" aria-hidden />Editar</button>
                <button className="btn btn-secondary" type="button" onClick={() => openCreate(selected.node.id)}><Plus className="h-4 w-4" aria-hidden />Agregar dentro</button>
              </div>
            </>
          ) : <p className="text-sm text-slate-600">Selecciona un elemento de la estructura.</p>}
        </aside>
      </div>

      <dialog ref={dialogRef} className="org-dialog w-[min(92vw,720px)] max-h-[calc(100vh-2rem)] overflow-y-auto border border-line bg-white p-0 shadow-soft">
        {editor ? (
          <form className="p-5 sm:p-6" onSubmit={saveEditor}>
            <input name="unitId" type="hidden" value={editor.nodeId ?? ""} />
            <input name="plantId" type="hidden" value={currentPlant.id} />
            <input name="parentId" type="hidden" value={editor.parentId ?? ""} />
            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-brand-700">{currentPlant.name} · {plant}</p>
                <h3 className="mt-1 text-xl font-extrabold text-ink">{editor.mode === "edit" ? "Editar estructura" : "Agregar elemento"}</h3>
              </div>
              <button className="icon-button" disabled={isSaving} type="button" onClick={closeEditor} aria-label="Cerrar"><X className="h-5 w-5" aria-hidden /></button>
            </div>

            {message && messageTone === "error" ? (
              <div className="alert alert-danger mt-4" role="alert"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{message}</span></div>
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label><span className="label">Tipo</span><select className="field" name="type" value={values.type} onChange={(event) => setValues((current) => ({ ...current, type: event.target.value as OrgNodeType }))}><option value="MACROPROCESO">Macroproceso</option><option value="DEPARTAMENTO">Departamento</option><option value="AREA">Area</option><option value="PROCESO">Proceso o equipo</option></select></label>
              <label><span className="label">Pertenece a</span><select className="field" disabled={editor.mode === "edit"} value={editor.parentId ?? ""} onChange={(event) => setEditor((current) => current ? ({ ...current, parentId: event.target.value || null }) : current)}><option value="">Raiz de {currentPlant.name}</option>{parentOptions.map((option) => <option key={option.node.id} value={option.node.id}>{option.path.map((node) => node.name).join(" › ")}</option>)}</select>{editor.mode === "edit" ? <span className="helper-text">La ubicacion se conserva para proteger el historial.</span> : null}</label>
              <label><span className="label">Nombre</span><input className="field" name="name" required value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Almacen de secos" /></label>
              <label><span className="label">Codigo</span><input className="field uppercase" maxLength={32} name="code" pattern="[A-Za-z0-9-]{2,32}" required value={values.code} onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder={`${plant}-LOG-SEC`} /></label>
              <label><span className="label">Responsable o puesto</span><input className="field" name="responsible" required value={values.responsible} onChange={(event) => setValues((current) => ({ ...current, responsible: event.target.value }))} placeholder="Nombre o puesto responsable" /></label>
              <label><span className="label">Jefe directo o gerente</span><input className="field" name="manager" required value={values.manager} onChange={(event) => setValues((current) => ({ ...current, manager: event.target.value }))} placeholder="Nombre o puesto superior" /></label>
              <label className="sm:col-span-2"><span className="label">Usuario que recibe las ideas y correos</span><select className="field" name="routingUserId" value={values.routingUserId} onChange={(event) => setValues((current) => ({ ...current, routingUserId: event.target.value }))}><option value="">Pendiente de asignar</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select><span className="helper-text">El correo se toma del directorio de usuarios; si cambia ahi, se actualiza aqui automaticamente.</span></label>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 border border-line bg-panel p-4 text-sm font-bold text-ink"><input checked={values.qrEnabled} name="qrEnabled" onChange={(event) => setValues((current) => ({ ...current, qrEnabled: event.target.checked }))} type="checkbox" />Habilitar QR de captura</label>
              <label className="flex items-center gap-3 border border-line bg-panel p-4 text-sm font-bold text-ink"><input checked={values.active} name="active" onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))} type="checkbox" />Elemento activo</label>
            </div>

            {values.qrEnabled && !values.routingUserId ? <div className="mt-4 border-l-4 border-amber-500 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">Puedes guardar el QR, pero debes asignar un usuario para que alguien reciba y atienda las ideas.</div> : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button className="btn btn-secondary" disabled={isSaving} type="button" onClick={closeEditor}>Cancelar</button>
              <button className="btn btn-primary" disabled={isSaving} type="submit">{isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}{isSaving ? "Guardando..." : "Guardar en el sistema"}</button>
            </div>
          </form>
        ) : null}
      </dialog>
    </>
  );
}
~~~~~~

### `src/components/page-header.tsx`

~~~~~~tsx
export function PageHeader({
  title,
  description,
  actions,
  eyebrow = "PROpEx · Ideas de Mejora"
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="mb-7 border-b border-line pb-5 sm:mb-8 sm:pb-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 bg-brand-500" />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand-700">{eyebrow}</p>
          </div>
          <h1 className="text-2xl font-extrabold leading-tight text-ink sm:text-[2rem]">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
~~~~~~

### `src/components/portfolio-command-ui.tsx`

~~~~~~tsx
"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

const toneClasses = {
  dark: "bg-slate-950 text-white",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-rose-50 text-rose-700",
  amber: "bg-amber-50 text-amber-800",
  blue: "bg-blue-50 text-blue-700"
};

export function PortfolioMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "dark",
  change
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: keyof typeof toneClasses;
  change?: number | null;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <article className="surface min-h-[150px] rounded-lg p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-extrabold leading-none text-ink">{value}</p>
        {change !== null && change !== undefined ? (
          <span className={`inline-flex items-center gap-1 text-xs font-extrabold ${positive ? "text-emerald-700" : "text-rose-700"}`}>
            {positive ? <TrendingUp className="h-3.5 w-3.5" aria-hidden /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden />}
            {Math.abs(change)}%
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

export function PortfolioChartPanel({
  eyebrow,
  title,
  description,
  children,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <article className="surface overflow-hidden rounded-lg">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase text-brand-700">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-extrabold text-ink">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </article>
  );
}

export type PortfolioAttentionItem = {
  label: string;
  value: number;
  href: string;
  icon: LucideIcon;
  tone: string;
};

export function PortfolioAttention({
  eyebrow,
  title,
  description,
  items
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: PortfolioAttentionItem[];
}) {
  return (
    <section className="overflow-hidden rounded-lg bg-slate-950 text-white">
      <div className="grid lg:grid-cols-[285px_1fr]">
        <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-6">
          <p className="text-xs font-extrabold uppercase text-red-300">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-extrabold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link className="group flex min-h-28 items-center gap-3 border-b border-white/10 p-4 transition hover:bg-white/5 sm:border-r xl:border-b-0" href={item.href} key={item.label}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10"><Icon className={`h-5 w-5 ${item.tone}`} aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block text-2xl font-extrabold">{item.value}</span><span className="mt-1 block text-xs font-bold leading-4 text-slate-300">{item.label}</span></span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" aria-hidden />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-72 items-center justify-center px-6 text-center text-sm font-bold text-slate-400">{message}</div>;
}
~~~~~~

### `src/components/premium-chart.tsx`

~~~~~~tsx
"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { BarChart, FunnelChart, HeatmapChart, LineChart } from "echarts/charts";
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/lib/core";

echarts.use([BarChart, FunnelChart, HeatmapChart, LineChart, AriaComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

type LooseRecord = Record<string, unknown>;

function record(value: unknown): LooseRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as LooseRecord : {};
}

function themedAxis(value: unknown, dark: boolean) {
  const apply = (axisValue: unknown) => {
    const axis = record(axisValue);
    const axisLine = record(axis.axisLine);
    const splitLine = record(axis.splitLine);
    return {
      ...axis,
      axisLine: { ...axisLine, lineStyle: { ...record(axisLine.lineStyle), color: dark ? "#3a414c" : "#d8d8d8" } },
      axisLabel: { ...record(axis.axisLabel), color: dark ? "#aeb7c4" : "#64748b" },
      nameTextStyle: { ...record(axis.nameTextStyle), color: dark ? "#cbd5e1" : "#475569" },
      splitLine: { ...splitLine, lineStyle: { ...record(splitLine.lineStyle), color: dark ? "#292f38" : "#eeeeee" } }
    };
  };
  return Array.isArray(value) ? value.map(apply) : apply(value);
}

function themedSeries(value: unknown, dark: boolean) {
  if (!Array.isArray(value)) return value;
  return value.map((seriesValue, seriesIndex) => {
    const series = record(seriesValue);
    const label = record(series.label);
    const currentColor = typeof label.color === "string" ? label.color.toLowerCase() : "";
    const keepLightLabel = currentColor === "#fff" || currentColor === "#ffffff";
    const isFunnel = series.type === "funnel";
    const funnelPalette = ["#657181", "#526173", "#3f5268", "#b81f3a", "#ea0029"];
    const data = dark && isFunnel && Array.isArray(series.data)
      ? series.data.map((item, itemIndex) => {
        const entry = record(item);
        if (!Object.keys(entry).length) return item;
        return {
          ...entry,
          itemStyle: {
            ...record(entry.itemStyle),
            color: funnelPalette[(itemIndex + seriesIndex) % funnelPalette.length]
          }
        };
      })
      : series.data;
    return {
      ...series,
      data,
      itemStyle: isFunnel && dark
        ? { ...record(series.itemStyle), borderColor: "#111318" }
        : series.itemStyle,
      label: { ...label, color: keepLightLabel ? label.color : dark ? "#e5e7eb" : "#171717" }
    };
  });
}

function themedTextComponent(value: unknown, dark: boolean) {
  const apply = (componentValue: unknown) => {
    const component = record(componentValue);
    return {
      ...component,
      textStyle: { ...record(component.textStyle), color: dark ? "#aeb7c4" : "#64748b" }
    };
  };
  return Array.isArray(value) ? value.map(apply) : apply(value);
}

function applyChartTheme(option: EChartsOption, dark: boolean): EChartsOption {
  const source = option as unknown as LooseRecord;
  return {
    ...source,
    backgroundColor: "transparent",
    textStyle: { ...record(source.textStyle), color: dark ? "#d7dce3" : "#475569" },
    ...(source.legend ? { legend: themedTextComponent(source.legend, dark) } : {}),
    ...(source.visualMap ? { visualMap: themedTextComponent(source.visualMap, dark) } : {}),
    xAxis: source.xAxis ? themedAxis(source.xAxis, dark) : source.xAxis,
    yAxis: source.yAxis ? themedAxis(source.yAxis, dark) : source.yAxis,
    series: themedSeries(source.series, dark)
  } as EChartsOption;
}

export default function PremiumChart({ option, style, onEvents }: { option: EChartsOption; style?: CSSProperties; onEvents?: Record<string, (params: { name?: string }) => void> }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.dataset.theme === "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const themedOption = useMemo(() => applyChartTheme(option, dark), [dark, option]);
  return <ReactEChartsCore echarts={echarts} key={dark ? "dark" : "light"} lazyUpdate notMerge onEvents={onEvents} option={themedOption} style={style} />;
}
~~~~~~

### `src/components/print-button.tsx`

~~~~~~tsx
"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="btn btn-secondary" onClick={() => window.print()} title="Imprimir" type="button">
      <Printer className="h-4 w-4" aria-hidden />
      Imprimir
    </button>
  );
}
~~~~~~

### `src/components/proboca-coin.tsx`

~~~~~~tsx
import Image from "next/image";

type ProbocaCoinProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

export function ProbocaCoin({ className = "", size = "md" }: ProbocaCoinProps) {
  return (
    <span aria-hidden className={`proboca-coin proboca-coin-${size} ${className}`.trim()}>
      <span className="proboca-coin-face">
        <Image
          alt=""
          fill
          priority={size === "xl"}
          sizes={size === "xl" ? "112px" : size === "lg" ? "64px" : size === "md" ? "32px" : "20px"}
          src="/brand/mejora-continua-icon.png"
        />
      </span>
    </span>
  );
}
~~~~~~

### `src/components/proboca-coins-award-form.tsx`

~~~~~~tsx
import type { ManagerialEvaluationFactor } from "@/lib/managerial-evaluation";
import { CheckCircle2 } from "lucide-react";
import { closeIdeaAction } from "@/app/actions";

type StandardRule = {
  id: string;
  name: string;
  description: string;
  points: number;
};

type ManagerialSuggestion = {
  factor: ManagerialEvaluationFactor;
  points: number;
  criterion: string;
};

type CurrentSelection = {
  pointRuleId: string;
  points: number;
};

type AwardFormProps = {
  ideaId: string;
  standardRules: StandardRule[];
  suggestedStandardRuleIds: string[];
  managerialSuggestions: ManagerialSuggestion[];
  currentSelections: CurrentSelection[];
  mode: "close" | "adjust" | "restore";
};

function factorName(factor: ManagerialEvaluationFactor) {
  return factor.ruleName.replace("Evaluacion gerencial - ", "");
}

export function ProbocaCoinsAwardForm({
  ideaId,
  standardRules,
  suggestedStandardRuleIds,
  managerialSuggestions,
  currentSelections,
  mode
}: AwardFormProps) {
  const currentByRule = new Map(currentSelections.map((selection) => [selection.pointRuleId, selection.points]));
  const hasCurrentSelections = currentSelections.length > 0;
  const suggestedStandard = new Set(suggestedStandardRuleIds);
  const buttonLabel = mode === "close"
    ? "Cerrar y entregar ProbocaCoins"
    : mode === "restore"
      ? "Volver a otorgar ProbocaCoins"
      : "Guardar cambios de ProbocaCoins";

  return (
    <form action={closeIdeaAction} className="grid gap-3">
      <input name="ideaId" type="hidden" value={ideaId} />
      <div className="space-y-2">
        {standardRules.map((rule) => {
          const suggested = suggestedStandard.has(rule.id);
          const selected = hasCurrentSelections ? currentByRule.has(rule.id) : suggested;
          const assigned = currentByRule.get(rule.id) ?? rule.points;
          return (
            <label className="grid gap-2 rounded-lg border border-line bg-panel p-3 text-sm sm:grid-cols-[1fr_104px]" key={rule.id}>
              <span className="flex items-start gap-2">
                <input className="mt-1" defaultChecked={selected} name="pointRuleIds" type="checkbox" value={rule.id} />
                <span>
                  <span className="font-extrabold text-ink">{rule.name}</span>
                  {suggested ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">Sugerida</span> : null}
                  <span className="mt-0.5 block text-xs text-slate-500">{rule.description}</span>
                </span>
              </span>
              <span><span className="label mb-1">ProbocaCoins</span><input className="field min-h-10 py-2" defaultValue={assigned} min={0} name={`points-${rule.id}`} type="number" /></span>
            </label>
          );
        })}
      </div>

      <fieldset className="border-t border-line pt-4">
        <legend className="mb-3 flex w-full items-center justify-between gap-3 text-sm font-extrabold text-ink">
          <span>Evaluacion gerencial complementaria</span>
          <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] text-white">Hasta 500 ProbocaCoins</span>
        </legend>
        <p className="mb-3 text-xs leading-5 text-slate-500">El sistema propone un nivel. Puedes cambiarlo o elegir No incluir antes de guardar.</p>
        <div className="space-y-3">
          {managerialSuggestions.map(({ factor, points, criterion }) => {
            const assigned = currentByRule.get(factor.ruleId);
            const selectedPoints = assigned ?? (mode === "adjust" ? "" : points);
            return (
              <label className="grid gap-2 border-l-4 border-slate-900 bg-slate-50 p-3 text-sm" key={factor.ruleId}>
                <span>
                  <span className="font-extrabold text-ink">{factorName(factor)}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">Sugerencia automatica: {criterion} ({points} ProbocaCoins)</span>
                </span>
                <select className="field" defaultValue={String(selectedPoints)} name={`managerial-${factor.ruleId}`}>
                  <option value="">No incluir este factor</option>
                  {factor.options.map((option) => <option key={option.points} value={option.points}>{option.points} ProbocaCoins - {option.label}</option>)}
                </select>
              </label>
            );
          })}
        </div>
      </fieldset>

      <button className="btn btn-success" type="submit"><CheckCircle2 className="h-4 w-4" aria-hidden />{buttonLabel}</button>
    </form>
  );
}

export function ManagerialCriteriaTable({
  managerialSuggestions,
  currentSelections
}: Pick<AwardFormProps, "managerialSuggestions" | "currentSelections">) {
  const currentByRule = new Map(currentSelections.map((selection) => [selection.pointRuleId, selection.points]));

  return (
    <section aria-labelledby="managerial-criteria-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-extrabold uppercase text-brand-700">Referencia oficial</p>
          <h3 className="mt-1 text-sm font-extrabold text-ink" id="managerial-criteria-title">Tabla de evaluacion del gerente</h3>
        </div>
        <span className="text-xs font-bold text-slate-500">4 factores / 20 criterios</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">La fila verde es la sugerencia automatica. La fila negra corresponde al nivel actualmente otorgado.</p>

      <div className="mt-3 hidden overflow-x-auto rounded-lg border border-line md:block">
        <table className="min-w-[780px] w-full border-collapse text-left text-xs">
          <thead className="bg-slate-950 text-white">
            <tr><th className="px-3 py-2.5">Factor</th><th className="px-3 py-2.5">Criterio</th><th className="px-3 py-2.5 text-right">ProbocaCoins</th><th className="px-3 py-2.5">Referencia</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {managerialSuggestions.flatMap(({ factor, points }) => {
              const assigned = currentByRule.get(factor.ruleId);
              return factor.options.map((option, index) => {
                const isAssigned = assigned === option.points;
                const isSuggested = points === option.points;
                return (
                  <tr className={isAssigned ? "bg-slate-100" : isSuggested ? "bg-emerald-50" : "bg-white"} key={`${factor.ruleId}-${option.points}`}>
                    <td className="px-3 py-2.5 align-top font-extrabold text-ink">{index === 0 ? factorName(factor) : ""}</td>
                    <td className="px-3 py-2.5 leading-5 text-slate-600">{option.label}</td>
                    <td className="px-3 py-2.5 text-right font-extrabold tabular-nums text-ink">{option.points}</td>
                    <td className="px-3 py-2.5">{isAssigned ? <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-extrabold text-white">Otorgada</span> : isSuggested ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-extrabold text-emerald-800">Sugerida</span> : null}</td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 divide-y divide-line border-y border-line md:hidden">
        {managerialSuggestions.map(({ factor, points }) => {
          const assigned = currentByRule.get(factor.ruleId);
          return (
            <div className="py-4" key={factor.ruleId}>
              <div className="mb-2 flex items-start justify-between gap-3"><h4 className="text-sm font-extrabold text-ink">{factorName(factor)}</h4><span className="shrink-0 text-xs font-bold text-slate-500">Max. {factor.maxPoints}</span></div>
              <div className="space-y-1.5">
                {factor.options.map((option) => {
                  const isAssigned = assigned === option.points;
                  const isSuggested = points === option.points;
                  return (
                    <div className={`grid grid-cols-[1fr_auto] gap-3 border-l-4 px-3 py-2 text-xs ${isAssigned ? "border-slate-950 bg-slate-100" : isSuggested ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`} key={option.points}>
                      <span className="leading-5 text-slate-600">{option.label}</span>
                      <span className="font-extrabold tabular-nums text-ink">{option.points}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
~~~~~~

### `src/components/proboca-coins-celebration.tsx`

~~~~~~tsx
"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { Volume2, X } from "lucide-react";
import { ProbocaCoin } from "@/components/proboca-coin";

const fallingCoins = [
  { left: 5, delay: 0, duration: 3.5, drift: 42, scale: 0.7 },
  { left: 13, delay: 0.55, duration: 3.9, drift: -34, scale: 0.9 },
  { left: 21, delay: 0.2, duration: 4.2, drift: 28, scale: 0.65 },
  { left: 30, delay: 0.85, duration: 3.7, drift: -48, scale: 1 },
  { left: 39, delay: 0.35, duration: 4.4, drift: 36, scale: 0.8 },
  { left: 48, delay: 0.05, duration: 3.8, drift: -22, scale: 1.05 },
  { left: 57, delay: 0.7, duration: 4.1, drift: 44, scale: 0.72 },
  { left: 66, delay: 0.28, duration: 3.6, drift: -38, scale: 0.92 },
  { left: 75, delay: 0.95, duration: 4.3, drift: 30, scale: 0.66 },
  { left: 84, delay: 0.42, duration: 3.9, drift: -26, scale: 1 },
  { left: 93, delay: 0.12, duration: 4.25, drift: 32, scale: 0.76 },
  { left: 9, delay: 1.2, duration: 3.8, drift: -30, scale: 0.64 },
  { left: 25, delay: 1.45, duration: 4.15, drift: 40, scale: 0.84 },
  { left: 43, delay: 1.1, duration: 3.65, drift: -36, scale: 0.7 },
  { left: 61, delay: 1.35, duration: 4.35, drift: 26, scale: 0.9 },
  { left: 79, delay: 1.05, duration: 3.75, drift: -44, scale: 0.68 },
  { left: 89, delay: 1.55, duration: 4.05, drift: 34, scale: 0.86 }
];

function removeRewardParameter() {
  const url = new URL(window.location.href);
  url.searchParams.delete("coins");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function ProbocaCoinsCelebration({ amount }: { amount: number }) {
  const [visible, setVisible] = useState(true);

  const playCoinSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const start = context.currentTime + 0.02;
      [
        { at: 0, frequency: 988, volume: 0.12 },
        { at: 0.08, frequency: 1319, volume: 0.1 },
        { at: 0.17, frequency: 1568, volume: 0.08 }
      ].forEach((note) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(note.frequency, start + note.at);
        oscillator.frequency.exponentialRampToValueAtTime(note.frequency * 1.08, start + note.at + 0.08);
        gain.gain.setValueAtTime(0.0001, start + note.at);
        gain.gain.exponentialRampToValueAtTime(note.volume, start + note.at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + 0.24);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start + note.at);
        oscillator.stop(start + note.at + 0.25);
      });
      window.setTimeout(() => void context.close(), 900);
    } catch {
      // Some browsers block automatic audio; the replay control remains available.
    }
  }, []);

  useEffect(() => {
    removeRewardParameter();
    const soundTimer = window.setTimeout(playCoinSound, 180);
    const closeTimer = window.setTimeout(() => setVisible(false), 5200);
    return () => {
      window.clearTimeout(soundTimer);
      window.clearTimeout(closeTimer);
    };
  }, [playCoinSound]);

  if (!visible) return null;

  return (
    <div aria-labelledby="proboca-coins-title" aria-live="polite" aria-modal="true" className="proboca-coins-celebration" role="dialog">
      <div aria-hidden className="proboca-coins-rain">
        {fallingCoins.map((coin, index) => (
          <span
            className="proboca-coins-falling"
            key={`${coin.left}-${coin.delay}`}
            style={{
              "--coin-delay": `${coin.delay}s`,
              "--coin-drift": `${coin.drift}px`,
              "--coin-duration": `${coin.duration}s`,
              "--coin-left": `${coin.left}%`,
              "--coin-scale": coin.scale,
              "--coin-spin": `${index % 2 === 0 ? 900 : -900}deg`
            } as CSSProperties}
          >
            <ProbocaCoin size="lg" />
          </span>
        ))}
      </div>

      <section className="proboca-coins-dialog">
        <button aria-label="Cerrar celebracion" className="proboca-coins-close" onClick={() => setVisible(false)} title="Cerrar" type="button">
          <X aria-hidden className="h-5 w-5" />
        </button>
        <div className="proboca-coins-hero-coin"><ProbocaCoin size="xl" /></div>
        <p className="proboca-coins-eyebrow">Idea finalizada</p>
        <h2 id="proboca-coins-title">ProbocaCoins entregadas</h2>
        <p className="proboca-coins-amount">+{amount.toLocaleString("es-MX")}</p>
        <p className="proboca-coins-message">La mejora quedo cerrada y la recompensa fue registrada.</p>
        <button className="proboca-coins-sound" onClick={playCoinSound} type="button">
          <Volume2 aria-hidden className="h-4 w-4" />Repetir sonido
        </button>
      </section>
    </div>
  );
}
~~~~~~

### `src/components/progress-meter.tsx`

~~~~~~tsx
export function ProgressMeter({ percent, label = "Avance" }: { percent: number; label?: string }) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-600">{label}</span>
        <span className="font-extrabold text-ink">{safePercent}%</span>
      </div>
      <div aria-label={`${label}: ${safePercent}%`} className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safePercent}>
        <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${safePercent}%` }} />
      </div>
    </div>
  );
}
~~~~~~

### `src/components/qr-explorer.tsx`

~~~~~~tsx
"use client";

import {
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  ExternalLink,
  Factory,
  Mail,
  MapPin,
  QrCode,
  Search,
  UserRound,
  Warehouse
} from "lucide-react";
import { useMemo, useState } from "react";
import type { OrganizationNode, OrganizationStructure, OrganizationUserOption, PlantCode } from "@/lib/organization-types";

type QrItem = {
  node: OrganizationNode;
  path: OrganizationNode[];
};

type DepartmentGroup = {
  id: string;
  name: string;
  code: string;
  responsible: string;
  manager: string;
  routingUser: OrganizationUserOption | null;
  items: QrItem[];
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function departmentGroups(nodes: OrganizationNode[]) {
  const groups = new Map<string, DepartmentGroup>();

  function visit(node: OrganizationNode, path: OrganizationNode[], department: OrganizationNode | null) {
    const nextPath = [...path, node];
    const currentDepartment = node.type === "DEPARTAMENTO" ? node : department;
    const groupNode = currentDepartment ?? node;

    if (node.qrEnabled && node.active && node.captureArea?.active) {
      const existing = groups.get(groupNode.id) ?? {
        id: groupNode.id,
        name: currentDepartment?.name ?? "Otras areas",
        code: currentDepartment?.code ?? groupNode.code,
        responsible: currentDepartment?.responsible ?? groupNode.responsible,
        manager: currentDepartment?.manager ?? groupNode.manager,
        routingUser: currentDepartment?.routingUser ?? null,
        items: []
      };
      existing.items.push({ node, path: nextPath });
      groups.set(groupNode.id, existing);
    }

    node.children.forEach((child) => visit(child, nextPath, currentDepartment));
  }

  nodes.forEach((node) => visit(node, [], null));
  return [...groups.values()].sort((left, right) => {
    const leftPriority = left.code.endsWith("-PROD") ? 0 : 1;
    const rightPriority = right.code.endsWith("-PROD") ? 0 : 1;
    return leftPriority - rightPriority || left.name.localeCompare(right.name, "es");
  });
}

function contactsFor(group: DepartmentGroup) {
  const contacts = new Map<string, OrganizationUserOption>();
  if (group.routingUser) contacts.set(group.routingUser.id, group.routingUser);
  group.items.forEach(({ node }) => {
    if (node.routingUser) contacts.set(node.routingUser.id, node.routingUser);
  });
  return [...contacts.values()].sort((left, right) => left.name.localeCompare(right.name, "es"));
}

function matchesGroup(group: DepartmentGroup, query: string) {
  const departmentText = normalize([
    group.name,
    group.code,
    group.responsible,
    group.manager,
    group.routingUser?.name,
    group.routingUser?.email
  ].filter(Boolean).join(" "));
  if (departmentText.includes(query)) return true;
  return group.items.some(({ node, path }) => normalize([
    node.name,
    node.code,
    node.captureArea?.code,
    node.responsible,
    node.manager,
    node.routingUser?.name,
    node.routingUser?.email,
    ...path.map((item) => item.name)
  ].filter(Boolean).join(" ")).includes(query));
}

export function QrExplorer({ structure, baseUrl }: { structure: OrganizationStructure; baseUrl: string }) {
  const [plant, setPlant] = useState<PlantCode | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const groupsByPlant = useMemo(() => ({
    APO: departmentGroups(structure.APO.nodes),
    CAR: departmentGroups(structure.CAR.nodes)
  }), [structure]);

  const activeGroups = plant ? groupsByPlant[plant] : [];
  const normalizedQuery = normalize(query.trim());
  const visibleGroups = normalizedQuery ? activeGroups.filter((group) => matchesGroup(group, normalizedQuery)) : activeGroups;
  const qrCount = (code: PlantCode) => groupsByPlant[code].reduce((total, group) => total + group.items.length, 0);

  function choosePlant(code: PlantCode) {
    setPlant(code);
    setOpenGroups(new Set());
    setQuery("");
  }

  function toggleGroup(id: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!plant) {
    return (
      <section className="surface p-5 sm:p-7" aria-labelledby="qr-plant-title">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-brand-700">Paso 1 de 3 · Planta</p>
          <h2 className="text-xl font-extrabold text-ink sm:text-2xl" id="qr-plant-title">¿De que planta necesitas los QR?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Selecciona la planta para mostrar solamente sus departamentos, areas y responsables.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button className="surface surface-interactive flex min-h-32 items-center gap-4 p-5 text-left" type="button" onClick={() => choosePlant("APO")}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-brand-500 text-white"><Factory className="h-6 w-6" aria-hidden /></span>
              <span><strong className="block text-lg text-ink">Apodaca</strong><span className="mt-1 block text-sm text-slate-600">{groupsByPlant.APO.length} departamentos · {qrCount("APO")} QR activos</span></span>
            </button>
            <button className="surface surface-interactive flex min-h-32 items-center gap-4 p-5 text-left" type="button" onClick={() => choosePlant("CAR")}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-ink text-white"><Warehouse className="h-6 w-6" aria-hidden /></span>
              <span><strong className="block text-lg text-ink">El Carmen</strong><span className="mt-1 block text-sm text-slate-600">{groupsByPlant.CAR.length} departamentos · {qrCount("CAR")} QR activos</span></span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  const currentPlant = structure[plant];

  return (
    <>
      <section className="mb-5 border-b border-line bg-white px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">Biblioteca de QR</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-500" aria-hidden />
              <h2 className="text-xl font-extrabold text-ink">{currentPlant.name}</h2>
              <span className="rounded bg-ink px-2 py-1 text-xs font-extrabold text-white">{plant}</span>
            </div>
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => { setPlant(null); setOpenGroups(new Set()); setQuery(""); }}><MapPin className="h-4 w-4" aria-hidden />Cambiar planta</button>
        </div>
      </section>

      <section className="surface overflow-hidden" aria-labelledby="qr-departments-title">
        <div className="border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="min-w-0 flex-1">
              <span className="label">Buscar departamento, area, responsable o correo</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
                <input className="field pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Ej. Operaciones, P3, Embarques o nombre@proboca.net" type="search" value={query} />
              </span>
            </label>
            <div className="flex gap-2">
              <button className="icon-button" type="button" onClick={() => setOpenGroups(new Set())} title="Contraer todo" aria-label="Contraer todo"><ChevronsDownUp className="h-4 w-4" aria-hidden /></button>
              <button className="icon-button" type="button" onClick={() => setOpenGroups(new Set(visibleGroups.map((group) => group.id)))} title="Expandir todo" aria-label="Expandir todo"><ChevronsUpDown className="h-4 w-4" aria-hidden /></button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{visibleGroups.length} departamentos</span><span>·</span><span>{visibleGroups.reduce((total, group) => total + group.items.length, 0)} codigos disponibles</span>
          </div>
        </div>

        <h3 className="sr-only" id="qr-departments-title">QR por departamento y area</h3>
        <div className="divide-y divide-line">
          {visibleGroups.map((group) => {
            const contacts = contactsFor(group);
            const isOpen = normalizedQuery ? true : openGroups.has(group.id);
            const isProduction = group.code.endsWith("-PROD");
            return (
              <section key={group.id}>
                <button className={`grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-l-4 px-4 py-4 text-left transition-colors sm:px-5 ${isProduction ? "border-brand-500 bg-brand-50 hover:bg-red-100" : "border-transparent hover:bg-panel"}`} type="button" onClick={() => toggleGroup(group.id)} aria-expanded={isOpen}>
                  <span className={`flex h-11 w-11 items-center justify-center ${isOpen || isProduction ? "bg-brand-500 text-white" : "bg-panel text-slate-600"}`}>
                    <Building2 className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2"><strong className="break-words text-base text-ink">{group.name}</strong><code className="text-[10px] font-bold text-brand-700">{group.code}</code>{isProduction ? <span className="bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase text-brand-700">Principal</span> : null}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{group.items.length} {group.items.length === 1 ? "area con QR" : "areas con QR"} · {contacts.length ? `${contacts.length} ${contacts.length === 1 ? "correo registrado" : "correos registrados"}` : "Correos pendientes"}</span>
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center text-slate-500">{isOpen ? <ChevronDown className="h-5 w-5" aria-hidden /> : <ChevronRight className="h-5 w-5" aria-hidden />}</span>
                </button>

                {isOpen ? <div className="border-t border-line bg-panel px-4 py-5 sm:px-5">
                  <div className="mb-5 grid gap-4 border-l-4 border-slate-950 bg-white p-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <div>
                      <p className="text-xs font-extrabold uppercase text-slate-500">Responsabilidad del departamento</p>
                      <p className="mt-1 font-extrabold text-ink">{group.responsible}</p>
                      <p className="mt-1 text-xs text-slate-500">Reporta a {group.manager}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-500"><Mail className="h-4 w-4" aria-hidden />Responsables y correos</p>
                      {contacts.length ? (
                        <div className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
                          {contacts.map((contact) => <p className="min-w-0 text-xs" key={contact.id}><span className="block truncate font-extrabold text-ink">{contact.name}</span><span className="block break-all text-slate-500">{contact.email}</span></p>)}
                        </div>
                      ) : <p className="mt-2 text-sm font-bold text-amber-800">Falta asignar usuarios en Estructura Organizacional.</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {group.items.map(({ node, path }) => {
                      const areaCode = node.captureArea?.code as string;
                      const captureUrl = `${baseUrl}/captura/${areaCode}`;
                      const qrUrl = `/api/qr/${areaCode}?target=${encodeURIComponent(captureUrl)}`;
                      return (
                        <article className="surface overflow-hidden" key={node.id}>
                          <div className="flex min-h-24 items-start justify-between gap-3 border-b border-line p-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="flex h-11 min-w-11 shrink-0 items-center justify-center bg-slate-950 px-2 text-xs font-extrabold text-white">{areaCode}</span>
                              <div className="min-w-0"><h4 className="break-words text-sm font-extrabold text-ink">{node.name}</h4><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{path.map((item) => item.name).join(" › ")}</p></div>
                            </div>
                            <QrCode className="h-5 w-5 shrink-0 text-brand-500" aria-hidden />
                          </div>
                          <div className="p-4">
                            <div className="mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center border border-line bg-white p-3">
                              <img alt={`Codigo QR para captura del area ${areaCode}`} className="h-full w-full object-contain" loading="lazy" src={qrUrl} />
                            </div>
                            <div className="mt-4 min-h-16 border-l-4 border-emerald-600 bg-emerald-50 p-3">
                              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase text-emerald-900"><UserRound className="h-3.5 w-3.5" aria-hidden />Recibe y da seguimiento</p>
                              <p className="mt-1 break-words text-xs font-extrabold text-emerald-950">{node.routingUser?.name ?? "Responsable pendiente"}</p>
                              <p className="mt-0.5 break-all text-[11px] text-emerald-800">{node.routingUser?.email ?? "Sin correo asignado"}</p>
                            </div>
                            <p className="mt-3 break-all bg-panel p-3 text-[11px] font-semibold leading-4 text-slate-600">{captureUrl}</p>
                            <div className="no-print mt-3 grid gap-2 sm:grid-cols-2">
                              <a className="btn btn-secondary" download href={`${qrUrl}&download=1`}><Download className="h-4 w-4" aria-hidden />Descargar</a>
                              <a className="btn btn-primary" href={captureUrl} rel="noreferrer" target="_blank"><ExternalLink className="h-4 w-4" aria-hidden />Probar</a>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div> : null}
              </section>
            );
          })}
          {!visibleGroups.length ? <div className="px-5 py-12 text-center"><Search className="mx-auto h-7 w-7 text-slate-400" aria-hidden /><p className="mt-3 font-extrabold text-ink">No encontramos ese departamento o area</p><p className="mt-1 text-sm text-slate-500">Prueba con el nombre, codigo, responsable o correo.</p></div> : null}
        </div>
      </section>
    </>
  );
}
~~~~~~

### `src/components/section-heading.tsx`

~~~~~~tsx
const accents = {
  dark: "#171a18",
  green: "#14835f",
  red: "#d32236",
  gray: "#626a70",
  blue: "#176fc1",
  amber: "#b7791f"
};

export function SectionHeading({
  title,
  description,
  count,
  tone = "dark",
  actions
}: {
  title: string;
  description?: string;
  count?: number;
  tone?: keyof typeof accents;
  actions?: React.ReactNode;
}) {
  return (
    <div className="section-heading" style={{ "--section-accent": accents[tone] } as React.CSSProperties}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="section-heading-mark" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold leading-tight text-ink sm:text-xl">{title}</h2>
            {typeof count === "number" ? <span className="rounded-full border border-line bg-white px-2 py-0.5 text-xs font-extrabold text-slate-600">{count}</span> : null}
          </div>
          {description ? <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
~~~~~~

### `src/components/status-pill.tsx`

~~~~~~tsx
import type { IdeaStatus } from "@prisma/client";
import { statusLabels, statusTone } from "@/lib/domain";

const toneClass = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800 before:bg-emerald-600",
  yellow: "border-amber-200 bg-amber-50 text-amber-900 before:bg-amber-500",
  red: "border-rose-200 bg-rose-50 text-rose-800 before:bg-rose-600",
  blue: "border-blue-200 bg-blue-50 text-blue-800 before:bg-blue-600",
  gray: "border-slate-200 bg-slate-100 text-slate-700 before:bg-slate-500",
  purple: "border-violet-200 bg-violet-50 text-violet-800 before:bg-violet-600"
};

export function StatusPill({ status }: { status: IdeaStatus }) {
  return (
    <span className={`inline-flex min-h-7 w-fit max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold leading-4 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:content-[''] ${toneClass[statusTone[status]]}`}>
      <span className="truncate">{statusLabels[status]}</span>
    </span>
  );
}
~~~~~~

### `src/components/theme-provider.tsx`

~~~~~~tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableColorScheme
      enableSystem
      storageKey="propex-theme"
      themes={["light", "dark"]}
    >
      {children}
    </NextThemesProvider>
  );
}
~~~~~~

### `src/components/theme-selector.tsx`

~~~~~~tsx
"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

const themeOptions = [
  { value: "light", label: "Tema claro", description: "Superficies ejecutivas", icon: Sun },
  { value: "dark", label: "Tema oscuro", description: "Centro de comando", icon: Moon },
  { value: "system", label: "Usar sistema", description: "Sigue tu dispositivo", icon: Monitor }
] as const;

export function ThemeSelector({ showLabel = false }: { showLabel?: boolean }) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => setMounted(true), []);

  const selectedTheme = themeOptions.some((option) => option.value === theme) ? theme : "system";
  const ActiveIcon = mounted && resolvedTheme === "dark" ? Moon : Sun;

  const selectTheme = (value: "light" | "dark" | "system") => {
    setTheme(value);
    if (detailsRef.current) detailsRef.current.open = false;
  };

  return (
    <details className={`theme-selector ${showLabel ? "theme-selector-labeled" : ""}`} ref={detailsRef}>
      <summary
        aria-label="Seleccionar tema de interfaz"
        className={showLabel ? "theme-selector-trigger" : "icon-button"}
        title="Tema de interfaz"
      >
        <ActiveIcon className="h-[18px] w-[18px]" aria-hidden />
        {showLabel ? <span>Tema</span> : null}
      </summary>
      <div className="theme-selector-menu" role="menu">
        <p className="theme-selector-title">Apariencia</p>
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const active = mounted && selectedTheme === option.value;
          return (
            <button
              aria-pressed={active}
              className={`theme-selector-option ${active ? "is-active" : ""}`}
              key={option.value}
              onClick={() => selectTheme(option.value)}
              role="menuitem"
              type="button"
            >
              <span className="theme-selector-option-icon"><Icon className="h-4 w-4" aria-hidden /></span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-extrabold">{option.label}</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">{option.description}</span>
              </span>
              {active ? <Check className="h-4 w-4 text-brand-500" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </details>
  );
}
~~~~~~

### `src/components/validation-inbox.tsx`

~~~~~~tsx
import type { ApprovalType, Role } from "@prisma/client";
import Link from "next/link";
import { CalendarDays, Check, CheckCircle2, Clock3, Eye, MessageSquareMore, UserRound, XCircle } from "lucide-react";
import { validationDecisionAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/mini-charts";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import { approvalStatusLabels, approvalTypeLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const validationTone: Record<ApprovalType, { accent: string; link: string; soft: string; sectionTone: "green" | "red" | "gray" | "blue" | "dark"; eyebrow: string }> = {
  SUPERVISOR: { accent: "bg-emerald-600", link: "text-emerald-800", soft: "bg-emerald-50", sectionTone: "green", eyebrow: "Supervisor" },
  CALIDAD: { accent: "bg-red-600", link: "text-red-800", soft: "bg-red-50", sectionTone: "red", eyebrow: "Calidad e inocuidad" },
  SEGURIDAD: { accent: "bg-slate-600", link: "text-slate-800", soft: "bg-slate-100", sectionTone: "gray", eyebrow: "Seguridad industrial" },
  MANTENIMIENTO: { accent: "bg-blue-600", link: "text-blue-800", soft: "bg-blue-50", sectionTone: "blue", eyebrow: "Mantenimiento" },
  MEJORA_CONTINUA_FINAL: { accent: "bg-slate-950", link: "text-slate-950", soft: "bg-slate-100", sectionTone: "dark", eyebrow: "Mejora Continua" }
};

export async function ValidationInbox({ type, roles, title }: { type: ApprovalType; roles: Role[]; title: string }) {
  await requireUser(["ADMIN", ...roles]);
  const [approvals, reviewedApprovals] = await Promise.all([
    prisma.approval.findMany({
      where: { type, status: { in: ["PENDING", "MORE_INFO"] } },
      include: { idea: { include: { area: true, supervisor: true } }, assignedTo: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.approval.findMany({
      where: { type, status: { in: ["APPROVED", "REJECTED"] } },
      include: {
        idea: { include: { area: true, supervisor: true, implementationOwner: true, approvals: { orderBy: { createdAt: "asc" } } } },
        assignedTo: true
      },
      orderBy: { updatedAt: "desc" },
      take: 40
    })
  ]);
  const tone = validationTone[type];
  const approvedCount = reviewedApprovals.filter((approval) => approval.status === "APPROVED").length;
  const rejectedCount = reviewedApprovals.filter((approval) => approval.status === "REJECTED").length;

  return (
    <>
      <PageHeader eyebrow={`${tone.eyebrow} · Bandeja de validación`} title={title} description="Atiende primero las validaciones pendientes y consulta después el avance de las ideas que ya revisaste." />

      <section className="grid gap-3 sm:grid-cols-3">
        <KpiCard detail="Esperan una decision" icon={Clock3} label="Pendientes" tone="amber" value={approvals.length} />
        <KpiCard detail="Validaciones favorables" icon={CheckCircle2} label="Aprobadas" tone="green" value={approvedCount} />
        <KpiCard detail="Con justificacion registrada" icon={XCircle} label="Rechazadas" tone="red" value={rejectedCount} />
      </section>

      <section className="mt-8">
        <SectionHeading count={approvals.length} description="Revisa problema, propuesta y beneficio antes de decidir." title="Pendientes de validación" tone={tone.sectionTone} />
        {!approvals.length ? <EmptyState title="Todo está al día" description="Las ideas que requieran la validación del departamento aparecerán aquí." /> : null}
        <div className="grid gap-4">
          {approvals.map((approval) => (
            <article className="surface overflow-hidden rounded-lg" key={approval.id}>
              <div className={`h-1 ${tone.accent}`} />
              <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link className={`text-lg font-extrabold hover:underline ${tone.link}`} href={`/ideas/${approval.idea.id}`}>{approval.idea.folio}</Link>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-extrabold ${tone.soft} ${tone.link}`}>Área {approval.idea.area.code}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500">{approval.idea.collaboratorName} · {approval.idea.createdAt.toLocaleDateString("es-MX")}</p>
                  </div>
                  <StatusPill status={approval.idea.status} />
                </div>

                <div className="mt-5 grid gap-4 border-y border-line py-4 lg:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Problema</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{approval.idea.problem}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Propuesta</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{approval.idea.proposal}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Beneficio esperado</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{approval.idea.expectedBenefit}</p>
                  </div>
                </div>

                <form action={validationDecisionAction} className="mt-4 grid gap-3">
                  <input name="ideaId" type="hidden" value={approval.idea.id} />
                  <input name="type" type="hidden" value={type} />
                  <label>
                    <span className="label">Comentario de la validación</span>
                    <textarea className="field min-h-20" name="comments" placeholder="Obligatorio al rechazar o solicitar información" />
                  </label>
                  <div className="grid gap-2 sm:flex sm:flex-wrap">
                    <button className="btn btn-success" name="decision" type="submit" value="APROBAR">
                      <Check className="h-4 w-4" aria-hidden /> Aprobar validación
                    </button>
                    <button className="btn btn-secondary" name="decision" type="submit" value="SOLICITAR_INFORMACION">
                      <MessageSquareMore className="h-4 w-4" aria-hidden /> Solicitar información
                    </button>
                    <button className="btn btn-danger sm:ml-auto" name="decision" type="submit" value="RECHAZAR">
                      <XCircle className="h-4 w-4" aria-hidden /> Rechazar
                    </button>
                  </div>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading count={reviewedApprovals.length} description="Seguimiento posterior a la decision de tu departamento." title="Validaciones realizadas" tone={tone.sectionTone} />
        {!reviewedApprovals.length ? <EmptyState title="Aún no hay validaciones realizadas" description="Las ideas revisadas permanecerán visibles en esta sección." /> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {reviewedApprovals.map((approval) => {
            const supportApprovals = approval.idea.approvals.filter((item) => ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"].includes(item.type));
            return (
              <article className="surface rounded-lg p-4 sm:p-5" key={approval.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link className={`text-base font-extrabold hover:underline ${tone.link}`} href={`/ideas/${approval.idea.id}`}>{approval.idea.folio}</Link>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">{approval.idea.area.code} · {approval.idea.collaboratorName}</p>
                  </div>
                  <StatusPill status={approval.idea.status} />
                </div>
                <p className="mt-4 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{approval.idea.problem}</p>

                <div className={`mt-4 border-l-4 p-3 ${tone.soft}`}>
                  <p className="text-[10px] font-extrabold uppercase text-slate-500">Decision del departamento</p>
                  <p className={`mt-1 text-sm font-extrabold ${tone.link}`}>{approvalStatusLabels[approval.status]}</p>
                  {approval.comments ? <p className="mt-1 text-sm leading-5 text-slate-700">{approval.comments}</p> : null}
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="border-l-2 border-slate-300 pl-3">
                    <dt className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-500"><UserRound className="h-3.5 w-3.5" aria-hidden />Responsable</dt>
                    <dd className="mt-1 text-sm font-extrabold text-ink">{approval.idea.implementationOwner?.name ?? "Pendiente de asignar"}</dd>
                  </div>
                  <div className="border-l-2 border-slate-300 pl-3">
                    <dt className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-500"><CalendarDays className="h-3.5 w-3.5" aria-hidden />Compromiso</dt>
                    <dd className="mt-1 text-sm font-extrabold text-ink">{approval.idea.dueDate ? approval.idea.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-[10px] font-extrabold uppercase text-slate-500">Todas las validaciones</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {supportApprovals.map((item) => (
                      <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-bold text-slate-700" key={item.id}>
                        {approvalTypeLabels[item.type]}: {approvalStatusLabels[item.status]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <p className="text-xs font-extrabold text-slate-600">{approval.idea.pointsAssigned} ProbocaCoins</p>
                  <Link className="btn btn-secondary" href={`/ideas/${approval.idea.id}`}><Eye className="h-4 w-4" aria-hidden />Ver seguimiento</Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
~~~~~~

### `src/components/work-item-disclosure.tsx`

~~~~~~tsx
import type { WorkItemStatus } from "@prisma/client";
import { CalendarDays, ChevronDown, UserRound } from "lucide-react";
import { WorkStatusPill } from "@/components/module-status";

const borderTone = {
  amber: "border-l-amber-500",
  red: "border-l-brand-500"
};

export function WorkItemDisclosure({
  id,
  number,
  title,
  description,
  owner,
  dueDate,
  overdue,
  status,
  tone,
  children
}: {
  id: string;
  number: number;
  title: string;
  description?: string | null;
  owner?: string | null;
  dueDate?: Date | null;
  overdue?: boolean;
  status: WorkItemStatus;
  tone: keyof typeof borderTone;
  children: React.ReactNode;
}) {
  const muted = status === "COMBINADA";
  return (
    <details className={`work-item-disclosure border-l-4 ${borderTone[tone]} ${muted ? "opacity-70" : ""}`} id={id}>
      <summary className="grid min-h-[78px] cursor-pointer list-none grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 bg-white px-3 py-3 transition hover:bg-slate-50 sm:px-4 md:grid-cols-[34px_minmax(220px,1fr)_minmax(130px,0.35fr)_118px_auto]">
        <span className="flex h-8 w-8 items-center justify-center bg-slate-100 text-xs font-extrabold text-slate-700">{number}</span>
        <span className="min-w-0">
          <span className="line-clamp-2 block text-sm font-extrabold leading-5 text-ink">{title}</span>
          {description ? <span className="mt-1 line-clamp-1 block text-[11px] text-slate-500">{description}</span> : null}
          <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500 md:hidden"><span>{owner || "Sin responsable"}</span><span className={overdue ? "text-rose-700" : ""}>{dueDate ? dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</span></span>
        </span>
        <span className="hidden min-w-0 items-center gap-2 text-xs text-slate-600 md:flex"><UserRound className="h-4 w-4 shrink-0 text-slate-400" aria-hidden /><span className="truncate font-bold">{owner || "Sin responsable"}</span></span>
        <span className={`hidden items-center gap-2 whitespace-nowrap text-xs font-bold md:flex ${overdue ? "text-rose-700" : "text-slate-600"}`}><CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />{dueDate ? dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</span>
        <span className="flex items-center justify-end gap-2"><WorkStatusPill status={status} /><ChevronDown className="work-item-chevron hidden h-4 w-4 shrink-0 text-slate-400 transition sm:block" aria-hidden /></span>
      </summary>
      <div className="border-t border-line bg-slate-50/60 p-4 sm:p-5">{children}</div>
    </details>
  );
}
~~~~~~

### `src/components/workspace-controls.tsx`

~~~~~~tsx
"use client";

import { ArrowRight, CalendarRange, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type WorkspacePeriod = "30" | "90" | "365" | "all";

export const WORKSPACE_PERIOD_EVENT = "propex:period-change";
export const WORKSPACE_PERIOD_STORAGE = "propex-period";

export type WorkspaceSearchItem = {
  href: string;
  label: string;
  group: string;
};

const periodOptions: Array<{ value: WorkspacePeriod; label: string }> = [
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
  { value: "365", label: "1 año" },
  { value: "all", label: "Histórico" }
];

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
}

export function WorkspaceSearch({ items, fullWidth = false }: { items: WorkspaceSearchItem[]; fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previousOverflow;
      setQuery("");
    };
  }, [open]);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-MX");
    if (!normalized) return items.slice(0, 8);
    return items.filter((item) => `${item.label} ${item.group}`.toLocaleLowerCase("es-MX").includes(normalized)).slice(0, 10);
  }, [items, query]);

  return (
    <>
      <button
        aria-expanded={open}
        className={fullWidth ? "workspace-search-trigger is-full" : "workspace-search-trigger"}
        onClick={() => setOpen(true)}
        title="Buscar en el espacio de trabajo"
        type="button"
      >
        <Search className="h-[18px] w-[18px]" aria-hidden />
        <span>Buscar</span>
      </button>
      {open ? (
        <div className="command-search-layer" role="presentation">
          <button aria-label="Cerrar búsqueda" className="command-search-backdrop" onClick={() => setOpen(false)} type="button" />
          <section aria-label="Búsqueda global" aria-modal="true" className="command-search-panel" role="dialog">
            <div className="command-search-input-row">
              <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              <input
                aria-label="Buscar módulo o herramienta"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busca un módulo, bandeja o herramienta"
                ref={inputRef}
                value={query}
              />
              <button aria-label="Cerrar búsqueda" className="icon-button" onClick={() => setOpen(false)} title="Cerrar" type="button">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="command-search-results">
              {results.length ? results.map((item) => (
                <Link className="command-search-result" href={item.href} key={`${item.group}-${item.href}`} onClick={() => setOpen(false)}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-ink">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] font-bold uppercase text-slate-500">{item.group}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden />
                </Link>
              )) : (
                <div className="command-search-empty">
                  <Search className="h-6 w-6 text-slate-300" aria-hidden />
                  <p className="mt-3 text-sm font-extrabold text-ink">Sin resultados</p>
                  <p className="mt-1 text-xs text-slate-500">Prueba con el nombre de una bandeja o módulo.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function WorkspacePeriodControl({ fullWidth = false }: { fullWidth?: boolean }) {
  const [period, setPeriod] = useState<WorkspacePeriod>("90");

  useEffect(() => {
    const stored = window.localStorage.getItem(WORKSPACE_PERIOD_STORAGE);
    if (periodOptions.some((option) => option.value === stored)) setPeriod(stored as WorkspacePeriod);
  }, []);

  const updatePeriod = (value: WorkspacePeriod) => {
    setPeriod(value);
    window.localStorage.setItem(WORKSPACE_PERIOD_STORAGE, value);
    window.dispatchEvent(new CustomEvent<WorkspacePeriod>(WORKSPACE_PERIOD_EVENT, { detail: value }));
  };

  return (
    <label className={`workspace-period-control ${fullWidth ? "is-full" : ""}`}>
      <CalendarRange className="h-[18px] w-[18px]" aria-hidden />
      <span className="sr-only">Periodo global</span>
      <select aria-label="Periodo global" onChange={(event) => updatePeriod(event.target.value as WorkspacePeriod)} value={period}>
        {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
~~~~~~

## 5.6 Lógica de negocio, servicios y utilidades

### `src/lib/audit.ts`

~~~~~~typescript
import { prisma } from "@/lib/prisma";

export async function auditLog(input: {
  entity: string;
  entityId: string;
  action: string;
  userId?: string | null;
  details?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      userId: input.userId ?? null,
      details: JSON.stringify(input.details ?? {})
    }
  });
}
~~~~~~

### `src/lib/auth.ts`

~~~~~~typescript
import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { roleHomePath } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "propex_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  userId: string;
  email: string;
  role: Role;
  exp: number;
};

function secret() {
  return process.env.AUTH_SECRET || "dev-secret-change-me";
}

function signPayload(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signPayload(body)}`;
}

function decodeSession(value: string): SessionPayload | null {
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = signPayload(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSession(user: Pick<User, "id" | "email" | "role">) {
  const store = await cookies();
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  store.set(SESSION_COOKIE, encodeSession({ userId: user.id, email: user.email, role: user.role, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  return raw ? decodeSession(raw) : null;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findFirst({
    where: { id: session.userId, active: true }
  });
}

export async function requireUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect(roleHomePath(user.role));
  return user;
}
~~~~~~

### `src/lib/domain.ts`

~~~~~~typescript
import {
  ApprovalStatus,
  ApprovalType,
  Classification,
  IdeaStatus,
  IdeaCategory,
  GenbaStatus,
  KaizenStatus,
  Priority,
  Role,
  WorkItemStatus
} from "@prisma/client";

export const ideaCategoryLabels: Record<IdeaCategory, string> = {
  A: "Categoría A · Operador y supervisor",
  B: "Categoría B · Apoyo interno",
  C: "Categoría C · Externo o cotización"
};

export const kaizenStatusLabels: Record<KaizenStatus, string> = {
  PENDIENTE_CHARTER: "Pendiente de Project Charter",
  PLANIFICACION: "En planificación",
  EN_CURSO: "En curso",
  EN_PAUSA: "En pausa",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado"
};

export const genbaStatusLabels: Record<GenbaStatus, string> = {
  ABIERTO: "Abierto",
  CERRADO: "Cerrado",
  CANCELADO: "Cancelado"
};

export const workItemStatusLabels: Record<WorkItemStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  BLOQUEADA: "Bloqueada",
  COMPLETADA: "Completada",
  CANCELADA: "Cerrada sin ejecutar",
  COMBINADA: "Combinada"
};

export const genbaDepartments = [
  "Calidad / Inocuidad",
  "Mantenimiento",
  "Producción",
  "Seguridad",
  "Mejora Continua",
  "Almacén",
  "Supervisión"
];

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  MEJORA_CONTINUA: "Mejora Continua",
  SUPERVISOR: "Supervisor",
  CALIDAD: "Calidad/Inocuidad",
  SEGURIDAD: "Seguridad Industrial",
  MANTENIMIENTO: "Mantenimiento",
  COLABORADOR: "Colaborador"
};

export const statusLabels: Record<IdeaStatus, string> = {
  REGISTRADA: "Registrada",
  EN_REVISION_SUPERVISOR: "En revisión de supervisor",
  RECHAZADA_SUPERVISOR: "Rechazada por supervisor",
  SOLICITUD_INFORMACION: "Solicitud de información",
  APROBADA_SUPERVISOR: "Aprobada por supervisor",
  EN_VALIDACION_CALIDAD: "En validación Calidad/Inocuidad",
  EN_VALIDACION_SEGURIDAD: "En validación Seguridad",
  EN_VALIDACION_MANTENIMIENTO: "En validación Mantenimiento",
  RECHAZADA_VALIDACION: "Rechazada en validación",
  APROBADA_PARA_IMPLEMENTAR: "Aprobada para implementar",
  CLASIFICACION_MEJORA_CONTINUA: "Clasificación Mejora Continua",
  EN_IMPLEMENTACION: "En implementación",
  IMPLEMENTADA: "Implementada",
  EN_VALIDACION_FINAL: "En validación final",
  CERRADA: "Cerrada",
  CANCELADA: "Cancelada",
  VENCIDA: "Vencida"
};

export const statusTone: Record<IdeaStatus, "green" | "yellow" | "red" | "blue" | "gray" | "purple"> = {
  REGISTRADA: "yellow",
  EN_REVISION_SUPERVISOR: "yellow",
  RECHAZADA_SUPERVISOR: "red",
  SOLICITUD_INFORMACION: "yellow",
  APROBADA_SUPERVISOR: "green",
  EN_VALIDACION_CALIDAD: "yellow",
  EN_VALIDACION_SEGURIDAD: "yellow",
  EN_VALIDACION_MANTENIMIENTO: "yellow",
  RECHAZADA_VALIDACION: "red",
  APROBADA_PARA_IMPLEMENTAR: "green",
  CLASIFICACION_MEJORA_CONTINUA: "yellow",
  EN_IMPLEMENTACION: "blue",
  IMPLEMENTADA: "blue",
  EN_VALIDACION_FINAL: "purple",
  CERRADA: "green",
  CANCELADA: "gray",
  VENCIDA: "red"
};

export const priorityLabels: Record<Priority, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Crítica"
};

export const classificationLabels: Record<Classification, string> = {
  IDEA_RAPIDA: "Idea de mejora / Quick Win (hasta 1 mes)",
  ACCION_MANTENIMIENTO: "Actividad de mantenimiento",
  KAIZEN: "Proyecto Kaizen (1 a 3 meses)",
  PROYECTO_DMAIC: "Proyecto DMAIC (4 a 6 meses)",
  PLAN_ACCION: "Plan de acción (solución ya definida)",
  CINCO_S_GESTION_VISUAL: "5S / Gestión visual",
  SEGURIDAD: "Seguridad",
  CALIDAD_INOCUIDAD: "Calidad/Inocuidad",
  NO_VIABLE: "No viable"
};

export const coreClassificationGuide = [
  { key: "IDEA_RAPIDA", label: "Idea de mejora", signal: "Causa y solución conocidas", timing: "Hasta 1 mes" },
  { key: "KAIZEN", label: "Kaizen", signal: "Desperdicio visible; requiere equipo", timing: "1 a 3 meses" },
  { key: "PROYECTO_DMAIC", label: "DMAIC", signal: "Variación crónica; causa desconocida", timing: "4 a 6 meses" },
  { key: "PLAN_ACCION", label: "Plan de acción", signal: "La solución ya está decidida; falta ejecutar", timing: "Según cronograma" }
] as const;

export const approvalTypeLabels: Record<ApprovalType, string> = {
  SUPERVISOR: "Supervisor",
  CALIDAD: "Calidad/Inocuidad",
  SEGURIDAD: "Seguridad Industrial",
  MANTENIMIENTO: "Mantenimiento",
  MEJORA_CONTINUA_FINAL: "Mejora Continua final"
};

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  MORE_INFO: "Más información"
};

export const impactOptions = [
  "Seguridad",
  "Calidad/Inocuidad",
  "Entrega",
  "Costo",
  "Moral",
  "Productividad",
  "5S",
  "Ergonomia",
  "Medio ambiente"
];

export const shifts = ["Matutino", "Vespertino", "Nocturno", "Mixto", "Administrativo"];

export const validationOrder: ApprovalType[] = ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"];

export function parseImpactTypes(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

export function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
}

export function workProgress(items: Array<{ status: WorkItemStatus }>) {
  const relevant = items.filter((item) => item.status !== "COMBINADA");
  const closed = relevant.filter((item) => item.status === "COMPLETADA" || item.status === "CANCELADA").length;
  return {
    total: relevant.length,
    closed,
    open: relevant.length - closed,
    percent: relevant.length ? Math.round((closed / relevant.length) * 100) : 0
  };
}

export function attendancePercent(expectedValue: string, attendedValue: string) {
  const expected = parseStringArray(expectedValue);
  const attended = new Set(parseStringArray(attendedValue));
  if (!expected.length) return 0;
  return Math.round((expected.filter((department) => attended.has(department)).length / expected.length) * 100);
}

export function isWorkItemOverdue(item: { dueDate: Date | null; status: WorkItemStatus }) {
  return Boolean(item.dueDate && item.dueDate < new Date() && !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(item.status));
}

export function requiredApprovalTypes(input: {
  impactsQuality: boolean;
  impactsSafety: boolean;
  requiresMaintenance: boolean;
}): ApprovalType[] {
  const required: ApprovalType[] = [];
  if (input.impactsQuality) required.push("CALIDAD");
  if (input.impactsSafety) required.push("SEGURIDAD");
  if (input.requiresMaintenance) required.push("MANTENIMIENTO");
  return required;
}

export function statusForApprovalType(type: ApprovalType): IdeaStatus {
  if (type === "CALIDAD") return "EN_VALIDACION_CALIDAD";
  if (type === "SEGURIDAD") return "EN_VALIDACION_SEGURIDAD";
  if (type === "MANTENIMIENTO") return "EN_VALIDACION_MANTENIMIENTO";
  return "APROBADA_SUPERVISOR";
}

export function nextValidationStatus(types: ApprovalType[]): IdeaStatus {
  const first = validationOrder.find((type) => types.includes(type));
  return first ? statusForApprovalType(first) : "APROBADA_PARA_IMPLEMENTAR";
}

export function approvalTypeForRole(role: Role): ApprovalType | null {
  if (role === "SUPERVISOR") return "SUPERVISOR";
  if (role === "CALIDAD") return "CALIDAD";
  if (role === "SEGURIDAD") return "SEGURIDAD";
  if (role === "MANTENIMIENTO") return "MANTENIMIENTO";
  if (role === "MEJORA_CONTINUA") return "MEJORA_CONTINUA_FINAL";
  return null;
}

export function roleHomePath(role: Role): string {
  if (role === "SUPERVISOR") return "/supervisor";
  if (role === "CALIDAD") return "/validaciones/calidad";
  if (role === "SEGURIDAD") return "/validaciones/seguridad";
  if (role === "MANTENIMIENTO") return "/validaciones/mantenimiento";
  if (role === "MEJORA_CONTINUA" || role === "ADMIN") return "/dashboard";
  return "/";
}

export function isTerminalStatus(status: IdeaStatus): boolean {
  return ["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(status);
}

export function isOverdue(input: { dueDate: Date | null; status: IdeaStatus }): boolean {
  if (!input.dueDate || isTerminalStatus(input.status)) return false;
  return input.dueDate.getTime() < Date.now();
}

export const kanbanColumns: Array<{ title: string; statuses: IdeaStatus[] }> = [
  { title: "En revisión de supervisor", statuses: ["REGISTRADA", "EN_REVISION_SUPERVISOR"] },
  {
    title: "En validación",
    statuses: ["APROBADA_SUPERVISOR", "EN_VALIDACION_CALIDAD", "EN_VALIDACION_SEGURIDAD", "EN_VALIDACION_MANTENIMIENTO"]
  },
  { title: "Aprobada para implementar", statuses: ["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA"] },
  { title: "En implementación", statuses: ["EN_IMPLEMENTACION"] },
  { title: "Validación final", statuses: ["IMPLEMENTADA", "EN_VALIDACION_FINAL"] },
  { title: "Cerrada", statuses: ["CERRADA"] },
  { title: "Rechazada / Cancelada", statuses: ["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION", "CANCELADA", "VENCIDA"] }
];
~~~~~~

### `src/lib/export.ts`

~~~~~~typescript
import {
  approvalStatusLabels,
  approvalTypeLabels,
  classificationLabels,
  ideaCategoryLabels,
  kaizenStatusLabels,
  parseImpactTypes,
  priorityLabels,
  statusLabels
} from "@/lib/domain";
import { isManagerialEvaluationRule, managerialCriterionLabel } from "@/lib/managerial-evaluation";
import { prisma } from "@/lib/prisma";
import {
  WORKBOOK_COLORS as COLORS,
  addSummaryMetric,
  createDataSheet,
  createSummarySheet,
  finalizeDataSheet,
  setupWorkbook
} from "@/lib/workbook-style";

function isIdeaOverdue(idea: { dueDate: Date | null; status: string }, now: Date) {
  return Boolean(idea.dueDate && idea.dueDate < now && !["IMPLEMENTADA", "EN_VALIDACION_FINAL", "CERRADA", "CANCELADA"].includes(idea.status));
}

export async function buildIdeasWorkbook() {
  const workbook = setupWorkbook("Concentrado de Ideas de Mejora");
  const now = new Date();
  const ideas = await prisma.idea.findMany({
    include: {
      area: { include: { organizationUnit: { include: { plant: true, parent: true } } } },
      supervisor: true,
      implementationOwner: true,
      approvals: { include: { assignedTo: true } },
      comments: { include: { user: true } },
      pointRuleSelections: { include: { pointRule: true } },
      kaizenProject: { include: { leader: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const closed = ideas.filter((idea) => idea.status === "CERRADA").length;
  const implemented = ideas.filter((idea) => ["IMPLEMENTADA", "EN_VALIDACION_FINAL", "CERRADA"].includes(idea.status)).length;
  const active = ideas.filter((idea) => !["CERRADA", "CANCELADA"].includes(idea.status)).length;
  const overdue = ideas.filter((idea) => isIdeaOverdue(idea, now)).length;
  const pendingApprovals = ideas.flatMap((idea) => idea.approvals).filter((approval) => approval.status === "PENDING").length;
  const kaizenClassified = ideas.filter((idea) => idea.classification === "KAIZEN").length;
  const kaizenLinked = ideas.filter((idea) => idea.kaizenProject).length;
  const totalPoints = ideas.reduce((sum, idea) => sum + idea.pointsAssigned, 0);

  const summary = createSummarySheet(
    workbook,
    "CONCENTRADO DE IDEAS DE MEJORA",
    `Corte al ${now.toLocaleDateString("es-MX")} | Informacion sincronizada con PROpEx`
  );
  addSummaryMetric(summary, 1, 4, "IDEAS", ideas.length, COLORS.blueSoft);
  addSummaryMetric(summary, 3, 4, "EN SEGUIMIENTO", active, COLORS.amberSoft);
  addSummaryMetric(summary, 5, 4, "IMPLEMENTADAS", implemented, COLORS.greenSoft);
  addSummaryMetric(summary, 7, 4, "CIERRE", ideas.length ? `${Math.round((closed / ideas.length) * 100)}%` : "0%", COLORS.greenSoft);
  addSummaryMetric(summary, 1, 9, "VALIDACIONES PENDIENTES", pendingApprovals, pendingApprovals ? COLORS.amberSoft : COLORS.greenSoft);
  addSummaryMetric(summary, 3, 9, "VENCIDAS", overdue, overdue ? COLORS.roseSoft : COLORS.greenSoft);
  addSummaryMetric(summary, 5, 9, "CLASIFICADAS KAIZEN", kaizenClassified, COLORS.blueSoft);
  addSummaryMetric(summary, 7, 9, "PROBOCACOINS ASIGNADAS", totalPoints, COLORS.greenSoft);
  summary.mergeCells("A14:H14");
  summary.getCell("A14").value = `Trazabilidad Kaizen: ${kaizenLinked} proyectos vinculados. El archivo incluye base maestra, validaciones, comentarios, ProbocaCoins y flujo automatico hacia Kaizen.`;
  summary.getCell("A14").alignment = { wrapText: true, vertical: "middle" };
  summary.getCell("A14").font = { color: { argb: COLORS.gray }, italic: true, size: 10 };
  summary.getRow(14).height = 42;

  const ideaSheet = createDataSheet(workbook, "Ideas", "BASE MAESTRA DE IDEAS", "Una fila por idea con origen, flujo, responsables, fechas, ProbocaCoins y proyecto relacionado.", [
    { header: "Folio", key: "folio", width: 18 },
    { header: "Registro", key: "createdAt", width: 18 },
    { header: "Planta", key: "plant", width: 16 },
    { header: "Area", key: "areaCode", width: 16 },
    { header: "Nombre del area", key: "areaName", width: 24 },
    { header: "Departamento", key: "department", width: 24 },
    { header: "Categoria", key: "category", width: 30 },
    { header: "Colaborador", key: "collaboratorName", width: 26 },
    { header: "Correo", key: "collaboratorEmail", width: 30 },
    { header: "Empleado", key: "employeeNumber", width: 14 },
    { header: "Turno", key: "shift", width: 16 },
    { header: "Problema", key: "problem", width: 42 },
    { header: "Propuesta", key: "proposal", width: 42 },
    { header: "Beneficio esperado", key: "expectedBenefit", width: 36 },
    { header: "Impactos", key: "impactTypes", width: 30 },
    { header: "Calidad", key: "quality", width: 12 },
    { header: "Seguridad", key: "safety", width: 12 },
    { header: "Mantenimiento", key: "maintenance", width: 16 },
    { header: "Apoyo externo", key: "external", width: 15 },
    { header: "Detalle externo / cotizacion", key: "externalDetails", width: 38 },
    { header: "Supervisor", key: "supervisor", width: 24 },
    { header: "Estatus", key: "status", width: 28 },
    { header: "Prioridad", key: "priority", width: 14 },
    { header: "Clasificacion", key: "classification", width: 24 },
    { header: "Responsable", key: "owner", width: 24 },
    { header: "Compromiso", key: "dueDate", width: 15 },
    { header: "Implementada", key: "implementedAt", width: 15 },
    { header: "Cerrada", key: "closedAt", width: 15 },
    { header: "ProbocaCoins", key: "points", width: 16 },
    { header: "Kaizen", key: "kaizen", width: 18 },
    { header: "Estatus Kaizen", key: "kaizenStatus", width: 24 },
    { header: "Comentario MC", key: "mcComments", width: 38 }
  ]);
  ideas.forEach((idea) => {
    const orgUnit = idea.area.organizationUnit;
    ideaSheet.addRow({
      folio: idea.folio,
      createdAt: idea.createdAt,
      plant: orgUnit?.plant.name ?? "Sin planta",
      areaCode: idea.area.code,
      areaName: idea.area.name,
      department: orgUnit?.parent?.name ?? orgUnit?.name ?? "",
      category: ideaCategoryLabels[idea.category],
      collaboratorName: idea.collaboratorName,
      collaboratorEmail: idea.collaboratorEmail ?? "",
      employeeNumber: idea.employeeNumber ?? "",
      shift: idea.shift,
      problem: idea.problem,
      proposal: idea.proposal,
      expectedBenefit: idea.expectedBenefit,
      impactTypes: parseImpactTypes(idea.impactTypes).join(", "),
      quality: idea.impactsQuality ? "Si" : "No",
      safety: idea.impactsSafety ? "Si" : "No",
      maintenance: idea.requiresMaintenance ? "Si" : "No",
      external: idea.requiresExternalSupport ? "Si" : "No",
      externalDetails: idea.externalSupportDetails ?? "",
      supervisor: idea.supervisor?.name ?? "Sin asignar",
      status: statusLabels[idea.status],
      priority: idea.priority ? priorityLabels[idea.priority] : "Sin definir",
      classification: idea.classification ? classificationLabels[idea.classification] : "Sin clasificar",
      owner: idea.implementationOwner?.name ?? "Sin asignar",
      dueDate: idea.dueDate ?? null,
      implementedAt: idea.implementedAt ?? null,
      closedAt: idea.closedAt ?? null,
      points: idea.pointsAssigned,
      kaizen: idea.kaizenProject?.folio ?? (idea.classification === "KAIZEN" ? "Pendiente" : ""),
      kaizenStatus: idea.kaizenProject ? kaizenStatusLabels[idea.kaizenProject.status] : "",
      mcComments: idea.mcComments ?? ""
    });
  });
  ["createdAt", "dueDate", "implementedAt", "closedAt"].forEach((key) => { ideaSheet.getColumn(key).numFmt = "dd/mm/yyyy"; });
  finalizeDataSheet(ideaSheet, ["status", "priority", "classification", "kaizenStatus"]);

  const approvalSheet = createDataSheet(workbook, "Validaciones", "VALIDACIONES POR IDEA", "Decisiones y comentarios de Supervisor, Calidad, Seguridad, Mantenimiento y Mejora Continua.", [
    { header: "Folio", key: "folio", width: 18 },
    { header: "Area", key: "area", width: 18 },
    { header: "Tipo", key: "type", width: 24 },
    { header: "Asignado a", key: "assignedTo", width: 26 },
    { header: "Estatus", key: "status", width: 18 },
    { header: "Comentarios", key: "comments", width: 48 },
    { header: "Fecha decision", key: "decidedAt", width: 18 }
  ]);
  ideas.forEach((idea) => idea.approvals.forEach((approval) => approvalSheet.addRow({
    folio: idea.folio,
    area: idea.area.code,
    type: approvalTypeLabels[approval.type],
    assignedTo: approval.assignedTo?.name ?? "Sin asignar",
    status: approvalStatusLabels[approval.status],
    comments: approval.comments ?? "",
    decidedAt: approval.decidedAt ?? null
  })));
  approvalSheet.getColumn("decidedAt").numFmt = "dd/mm/yyyy hh:mm";
  finalizeDataSheet(approvalSheet, ["status"]);

  const kaizenSheet = createDataSheet(workbook, "Flujo Kaizen", "TRAZABILIDAD DE IDEAS A KAIZEN", "Toda idea clasificada como Kaizen debe tener un proyecto consecutivo relacionado.", [
    { header: "Idea", key: "idea", width: 18 },
    { header: "Registro idea", key: "createdAt", width: 16 },
    { header: "Planta", key: "plant", width: 16 },
    { header: "Area", key: "area", width: 20 },
    { header: "Problema / proyecto", key: "problem", width: 42 },
    { header: "Kaizen", key: "kaizen", width: 18 },
    { header: "Lider", key: "leader", width: 24 },
    { header: "Estatus Kaizen", key: "status", width: 24 },
    { header: "Inicio", key: "startDate", width: 14 },
    { header: "Cierre objetivo", key: "endDate", width: 16 },
    { header: "Resultado", key: "result", width: 24 }
  ]);
  ideas.filter((idea) => idea.classification === "KAIZEN").forEach((idea) => kaizenSheet.addRow({
    idea: idea.folio,
    createdAt: idea.createdAt,
    plant: idea.area.organizationUnit?.plant.name ?? "Sin planta",
    area: `${idea.area.code} - ${idea.area.name}`,
    problem: idea.problem,
    kaizen: idea.kaizenProject?.folio ?? "Pendiente",
    leader: idea.kaizenProject?.leader.name ?? "Pendiente",
    status: idea.kaizenProject ? kaizenStatusLabels[idea.kaizenProject.status] : "Sin proyecto",
    startDate: idea.kaizenProject?.startDate ?? null,
    endDate: idea.kaizenProject?.endDate ?? null,
    result: idea.kaizenProject ? "Transferida automaticamente" : "Requiere conciliacion"
  }));
  ["createdAt", "startDate", "endDate"].forEach((key) => { kaizenSheet.getColumn(key).numFmt = "dd/mm/yyyy"; });
  finalizeDataSheet(kaizenSheet, ["status", "result"]);

  const commentsSheet = createDataSheet(workbook, "Comentarios", "BITACORA DE COMENTARIOS", "Seguimientos y acuerdos registrados dentro de cada idea.", [
    { header: "Folio", key: "folio", width: 18 },
    { header: "Area", key: "area", width: 18 },
    { header: "Usuario", key: "user", width: 26 },
    { header: "Comentario", key: "comment", width: 64 },
    { header: "Fecha", key: "createdAt", width: 20 }
  ]);
  ideas.forEach((idea) => idea.comments.forEach((comment) => commentsSheet.addRow({
    folio: idea.folio,
    area: idea.area.code,
    user: comment.user?.name ?? "Sistema",
    comment: comment.comment,
    createdAt: comment.createdAt
  })));
  commentsSheet.getColumn("createdAt").numFmt = "dd/mm/yyyy hh:mm";
  finalizeDataSheet(commentsSheet);

  const pointsSheet = createDataSheet(workbook, "ProbocaCoins", "DETALLE DE PROBOCACOINS", "Reglas sugeridas o aprobadas que forman la recompensa total de cada idea.", [
    { header: "Folio", key: "folio", width: 18 },
    { header: "Colaborador", key: "collaborator", width: 28 },
    { header: "Area", key: "area", width: 18 },
    { header: "Tipo", key: "type", width: 24 },
    { header: "Regla", key: "rule", width: 38 },
    { header: "Criterio seleccionado", key: "criterion", width: 56 },
    { header: "ProbocaCoins", key: "points", width: 16 }
  ]);
  ideas.forEach((idea) => idea.pointRuleSelections.forEach((selection) => pointsSheet.addRow({
    folio: idea.folio,
    collaborator: idea.collaboratorName,
    area: idea.area.code,
    type: isManagerialEvaluationRule(selection.pointRule.id) ? "Evaluacion gerencial" : "Regla base",
    rule: selection.pointRule.name,
    criterion: isManagerialEvaluationRule(selection.pointRule.id) ? managerialCriterionLabel(selection.pointRule.id, selection.points) : "",
    points: selection.points
  })));
  finalizeDataSheet(pointsSheet);

  return workbook;
}
~~~~~~

### `src/lib/files.ts`

~~~~~~typescript
import "server-only";

import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const uploadRoot = path.join(process.cwd(), "public", "uploads");

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function saveUpload(file: File | null | undefined, prefix: string) {
  if (!file || file.size === 0) return null;
  const extension = path.extname(file.name) || ".bin";
  const safeName = sanitizeFilename(`${prefix}-${randomUUID()}${extension}`);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`evidencias/${safeName}`, file, {
      access: "public",
      contentType: file.type || undefined,
      addRandomSuffix: false
    });
    return {
      filename: file.name,
      path: blob.url
    };
  }

  if (process.env.VERCEL) {
    throw new Error("BLOB_READ_WRITE_TOKEN es obligatorio para cargar evidencias en Vercel.");
  }

  await mkdir(uploadRoot, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const fullPath = path.join(uploadRoot, safeName);
  await writeFile(fullPath, buffer);
  return {
    filename: file.name,
    path: `/uploads/${safeName}`
  };
}
~~~~~~

### `src/lib/kaizen-from-idea.ts`

~~~~~~typescript
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CreateKaizenFromIdeaInput = {
  ideaId: string;
  leaderId: string;
  startDate: Date;
  endDate: Date;
  createdById: string;
  updateExisting?: boolean;
};

export async function createKaizenFromIdea(input: CreateKaizenFromIdeaInput) {
  const endDate = input.endDate < input.startDate ? new Date(input.startDate.getTime() + 30 * 86_400_000) : input.endDate;
  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: input.ideaId },
    include: { area: { include: { organizationUnit: { include: { plant: true } } } } }
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await prisma.kaizenProject.findUnique({ where: { sourceIdeaId: input.ideaId } });
    if (existing) {
      if (!input.updateExisting) return existing;
      return prisma.kaizenProject.update({
        where: { id: existing.id },
        data: { leaderId: input.leaderId, startDate: input.startDate, endDate }
      });
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const maximum = await tx.kaizenProject.aggregate({ _max: { number: true } });
        const number = (maximum._max.number ?? 0) + 1;
        return tx.kaizenProject.create({
          data: {
            number,
            folio: `KZN-${String(number).padStart(3, "0")}`,
            title: idea.problem,
            plant: idea.area.organizationUnit?.plant.name ?? null,
            area: `${idea.area.code} - ${idea.area.name}`,
            objective: idea.expectedBenefit,
            scope: idea.proposal,
            status: "PENDIENTE_CHARTER",
            startDate: input.startDate,
            endDate,
            leaderId: input.leaderId,
            createdById: input.createdById,
            sourceIdeaId: idea.id
          }
        });
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || attempt === 2) throw error;
    }
  }

  throw new Error("No fue posible generar el consecutivo Kaizen.");
}
~~~~~~

### `src/lib/managerial-evaluation.ts`

~~~~~~typescript
export type ManagerialEvaluationOption = {
  points: number;
  label: string;
};

export type ManagerialEvaluationFactor = {
  ruleId: string;
  ruleName: string;
  description: string;
  maxPoints: number;
  options: ManagerialEvaluationOption[];
};

export const managerialEvaluationFactors: ManagerialEvaluationFactor[] = [
  {
    ruleId: "managerial-effect",
    ruleName: "Evaluacion gerencial - Efecto",
    description: "Impacto comprobado en Calidad, Costo, Entrega, Seguridad o Moral.",
    maxPoints: 300,
    options: [
      { points: 300, label: "Muy significativo en Calidad, Costo o Entrega (mayor a $15,000)" },
      { points: 225, label: "Considerable ($3,000 a $5,000) o significativo en Seguridad o Moral" },
      { points: 150, label: "Pequeno (menor a $3,000) o algun efecto en Seguridad o Moral" },
      { points: 75, label: "Efecto no significativo" },
      { points: 0, label: "No hay manera de medirlo" }
    ]
  },
  {
    ruleId: "managerial-implementation",
    ruleName: "Evaluacion gerencial - Posibilidad de implementacion",
    description: "Tiempo y preparacion requeridos para llevar la mejora a operacion.",
    maxPoints: 75,
    options: [
      { points: 75, label: "Se implemento inmediatamente (menos de 30 dias)" },
      { points: 50, label: "Requirio un periodo de preparacion (31 a 60 dias)" },
      { points: 30, label: "Tuvo dificultad para implementarse (61 a 90 dias)" },
      { points: 15, label: "Requirio mucho estudio adicional (mas de 90 dias)" },
      { points: 0, label: "No implementada o sin evidencia suficiente" }
    ]
  },
  {
    ruleId: "managerial-effort",
    ruleName: "Evaluacion gerencial - Esfuerzo de implementacion",
    description: "Recursos y horas-persona invertidos para ejecutar la mejora.",
    maxPoints: 50,
    options: [
      { points: 50, label: "Gran cantidad de esfuerzo (mas de 50 horas-persona)" },
      { points: 40, label: "Esfuerzo alto (25 a 50 horas-persona)" },
      { points: 25, label: "Esfuerzo moderado (9 a 24 horas-persona)" },
      { points: 10, label: "Esfuerzo bajo (1 a 8 horas-persona)" },
      { points: 0, label: "Sin esfuerzo comprobable o sin informacion" }
    ]
  },
  {
    ruleId: "managerial-originality",
    ruleName: "Evaluacion gerencial - Originalidad",
    description: "Grado de novedad, creatividad y aplicacion original de la solucion.",
    maxPoints: 75,
    options: [
      { points: 75, label: "Nuevo y creativo" },
      { points: 50, label: "Bastante original y con amplia esfera de aplicacion" },
      { points: 30, label: "Adaptacion creativa con alguna ayuda" },
      { points: 10, label: "Usa ejemplos similares como referencia" },
      { points: 0, label: "Sin contribucion original identificable" }
    ]
  }
];

export const managerialEvaluationRuleIds = managerialEvaluationFactors.map((factor) => factor.ruleId);

export function managerialFactorForRule(ruleId: string) {
  return managerialEvaluationFactors.find((factor) => factor.ruleId === ruleId);
}

export function isManagerialEvaluationRule(ruleId: string) {
  return managerialEvaluationRuleIds.includes(ruleId);
}

export function managerialCriterionLabel(ruleId: string, points: number) {
  return managerialFactorForRule(ruleId)?.options.find((option) => option.points === points)?.label ?? "Ajuste manual";
}
~~~~~~

### `src/lib/module-access.ts`

~~~~~~typescript
import "server-only";

import type { User } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AccessUser = Pick<User, "id" | "role" | "kaizenAccess" | "genbaAccess">;

export function canManageImprovementModules(user: Pick<User, "role">) {
  return user.role === "ADMIN" || user.role === "MEJORA_CONTINUA";
}

export async function userModuleAccess(user: AccessUser) {
  if (canManageImprovementModules(user)) return { kaizen: true, genba: true };
  const [kaizenAssignments, genbaAssignments] = await Promise.all([
    prisma.kaizenProject.count({ where: { OR: [{ leaderId: user.id }, { activities: { some: { ownerId: user.id } } }] } }),
    prisma.genbaWalk.count({ where: { OR: [{ coordinatorId: user.id }, { activities: { some: { ownerId: user.id } } }] } })
  ]);
  return {
    kaizen: user.kaizenAccess || kaizenAssignments > 0,
    genba: user.genbaAccess || genbaAssignments > 0
  };
}

export async function requireKaizenAccess() {
  const user = await requireUser();
  const access = await userModuleAccess(user);
  if (!access.kaizen) redirect("/dashboard?error=acceso-kaizen");
  return { user, canManage: canManageImprovementModules(user) };
}

export async function requireGenbaAccess() {
  const user = await requireUser();
  const access = await userModuleAccess(user);
  if (!access.genba) redirect("/dashboard?error=acceso-genba");
  return { user, canManage: canManageImprovementModules(user) };
}
~~~~~~

### `src/lib/notifications.ts`

~~~~~~typescript
import { NotificationChannel } from "@prisma/client";
import { appBaseUrl } from "@/lib/url";
import { prisma } from "@/lib/prisma";

type NotifyInput = {
  ideaId?: string | null;
  to: string;
  subject: string;
  body: string;
  channels?: NotificationChannel[];
};

function hasGraphConfig() {
  return Boolean(
    process.env.MICROSOFT_TENANT_ID &&
      process.env.MICROSOFT_CLIENT_ID &&
      process.env.MICROSOFT_CLIENT_SECRET &&
      process.env.MICROSOFT_SENDER_EMAIL
  );
}

async function sendGraphMail(input: NotifyInput) {
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials"
      })
    }
  );

  if (!tokenResponse.ok) {
    throw new Error(`Microsoft Graph token error ${tokenResponse.status}`);
  }

  const tokenJson = (await tokenResponse.json()) as { access_token: string };
  const mailResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${process.env.MICROSOFT_SENDER_EMAIL}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: {
          subject: input.subject,
          body: { contentType: "HTML", content: input.body.replace(/\n/g, "<br />") },
          toRecipients: input.to
            .split(/[;,]/)
            .map((address) => address.trim())
            .filter(Boolean)
            .map((address) => ({ emailAddress: { address } }))
        },
        saveToSentItems: true
      })
    }
  );

  if (!mailResponse.ok) {
    throw new Error(`Microsoft Graph sendMail error ${mailResponse.status}`);
  }
}

async function sendTeams(input: NotifyInput) {
  if (!process.env.TEAMS_WEBHOOK_URL) throw new Error("TEAMS_WEBHOOK_URL no configurado");
  const response = await fetch(process.env.TEAMS_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `**${input.subject}**\n\n${input.body}` })
  });
  if (!response.ok) throw new Error(`Teams webhook error ${response.status}`);
}

async function recordOutbox(input: NotifyInput, channel: NotificationChannel, status: "PENDING" | "SENT" | "ERROR", error?: string) {
  await prisma.notificationOutbox.create({
    data: {
      ideaId: input.ideaId ?? null,
      channel,
      to: input.to || "LOCAL",
      subject: input.subject,
      body: input.body,
      status,
      errorMessage: error,
      sentAt: status === "SENT" ? new Date() : null
    }
  });
}

export async function notify(input: NotifyInput) {
  const channels = input.channels ?? ["EMAIL"];
  for (const channel of channels) {
    if (channel === "EMAIL") {
      if (!input.to || !hasGraphConfig()) {
        await recordOutbox(input, input.to ? "EMAIL" : "LOCAL", "PENDING");
        continue;
      }

      try {
        await sendGraphMail(input);
        await recordOutbox(input, "EMAIL", "SENT");
      } catch (error) {
        await recordOutbox(input, "EMAIL", "ERROR", error instanceof Error ? error.message : "Error desconocido");
      }
    }

    if (channel === "TEAMS") {
      if (!process.env.TEAMS_WEBHOOK_URL) {
        await recordOutbox(input, "TEAMS", "PENDING", "TEAMS_WEBHOOK_URL no configurado");
        continue;
      }

      try {
        await sendTeams(input);
        await recordOutbox(input, "TEAMS", "SENT");
      } catch (error) {
        await recordOutbox(input, "TEAMS", "ERROR", error instanceof Error ? error.message : "Error desconocido");
      }
    }

    if (channel === "LOCAL") {
      await recordOutbox(input, "LOCAL", "PENDING");
    }
  }
}

export function ideaLink(ideaId: string) {
  return `${appBaseUrl()}/ideas/${ideaId}`;
}

export function ideaMailBody(input: {
  folio: string;
  area: string;
  problem: string;
  proposal: string;
  action: string;
  ideaId: string;
}) {
  return [
    `Folio: ${input.folio}`,
    `Area: ${input.area}`,
    `Problema: ${input.problem}`,
    `Propuesta: ${input.proposal}`,
    `Accion requerida: ${input.action}`,
    `Liga directa: ${ideaLink(input.ideaId)}`
  ].join("\n");
}
~~~~~~

### `src/lib/organization.ts`

~~~~~~typescript
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { OrganizationNode, OrganizationStructure, PlantCode } from "@/lib/organization-types";

type SeedNode = {
  code: string;
  name: string;
  type: "MACROPROCESO" | "DEPARTAMENTO" | "AREA" | "PROCESO";
  responsible: string;
  manager: string;
  qrEnabled?: boolean;
  captureAreaCode?: string;
  routingRole?: Role;
  children?: SeedNode[];
};

const pAreas: SeedNode[] = Array.from({ length: 9 }, (_, index) => ({
  code: `APO-P${index + 1}`,
  captureAreaCode: `P${index + 1}`,
  name: `P${index + 1}`,
  type: "AREA",
  responsible: `Supervisor P${index + 1}`,
  manager: "Jefatura de Produccion",
  qrEnabled: true
}));

const seedPlants: Array<{ code: PlantCode; name: string; nodes: SeedNode[] }> = [
  {
    code: "APO",
    name: "Planta Apodaca",
    nodes: [
      {
        code: "APO-VAL",
        name: "Cadena de valor",
        type: "MACROPROCESO",
        responsible: "Gerencia de Operaciones",
        manager: "Direccion de Planta",
        children: [{
          code: "APO-PROD",
          name: "Produccion y Valor Agregado",
          type: "DEPARTAMENTO",
          responsible: "Jefatura de Produccion",
          manager: "Gerencia de Operaciones",
          children: pAreas
        }]
      },
      {
        code: "APO-SOP",
        name: "Areas de soporte y gestion",
        type: "MACROPROCESO",
        responsible: "Direccion de Planta",
        manager: "Direccion General",
        children: [
          {
            code: "APO-LOG",
            name: "Logistica",
            type: "DEPARTAMENTO",
            responsible: "Jefatura de Logistica",
            manager: "Gerencia de Logistica",
            children: [
              { code: "APO-LOG-SEC", name: "Almacen de secos", type: "PROCESO", responsible: "Supervisor de Almacen", manager: "Jefatura de Logistica", qrEnabled: true },
              { code: "APO-LOG-REC", name: "Recibo", type: "PROCESO", responsible: "Supervisor de Recibo", manager: "Jefatura de Logistica", qrEnabled: true },
              { code: "APO-LOG-EMB", name: "Embarques", type: "PROCESO", responsible: "Supervisor de Embarques", manager: "Jefatura de Logistica", qrEnabled: true },
              { code: "APO-LOG-TRA", name: "Trafico", type: "PROCESO", responsible: "Responsable de Trafico", manager: "Gerencia de Logistica", qrEnabled: true },
              { code: "APO-LOG-TAR", name: "Tarimas", type: "PROCESO", responsible: "Responsable por asignar", manager: "Jefatura de Logistica", qrEnabled: true }
            ]
          },
          { code: "APO-MC", name: "Mejora Continua", type: "DEPARTAMENTO", responsible: "Equipo de Mejora Continua (2 personas)", manager: "Gerencia de Mejora Continua", qrEnabled: true, routingRole: "MEJORA_CONTINUA" },
          { code: "APO-PROY", name: "Proyectos", type: "DEPARTAMENTO", responsible: "Responsable de Proyectos", manager: "Gerencia de Proyectos", qrEnabled: true, routingRole: "MEJORA_CONTINUA" },
          { code: "APO-CAL", name: "Calidad e Inocuidad", type: "DEPARTAMENTO", responsible: "Jefatura de Calidad", manager: "Gerencia de Calidad", qrEnabled: true, routingRole: "CALIDAD" },
          { code: "APO-MAN", name: "Mantenimiento y Servicios", type: "DEPARTAMENTO", responsible: "Jefatura de Mantenimiento", manager: "Gerencia de Mantenimiento", qrEnabled: true, routingRole: "MANTENIMIENTO" },
          { code: "APO-SEG", name: "Seguridad, Salud y Ambiente", type: "DEPARTAMENTO", responsible: "Responsable de Seguridad", manager: "Gerencia responsable", qrEnabled: true, routingRole: "SEGURIDAD" }
        ]
      }
    ]
  },
  {
    code: "CAR",
    name: "Planta El Carmen",
    nodes: [
      {
        code: "CAR-VAL",
        name: "Cadena de valor",
        type: "MACROPROCESO",
        responsible: "Gerencia de Operaciones El Carmen",
        manager: "Direccion de Planta",
        children: [{ code: "CAR-PROD", name: "Produccion y Operaciones", type: "DEPARTAMENTO", responsible: "Jefatura de Produccion El Carmen", manager: "Gerencia de Operaciones El Carmen", qrEnabled: true }]
      },
      {
        code: "CAR-SOP",
        name: "Areas de soporte y gestion",
        type: "MACROPROCESO",
        responsible: "Direccion de Planta",
        manager: "Direccion General",
        children: [
          {
            code: "CAR-LOG",
            name: "Logistica",
            type: "DEPARTAMENTO",
            responsible: "Jefatura de Logistica El Carmen",
            manager: "Gerencia de Logistica",
            children: [
              { code: "CAR-LOG-ALM", name: "Almacen", type: "PROCESO", responsible: "Supervisor de Almacen", manager: "Jefatura de Logistica El Carmen", qrEnabled: true },
              { code: "CAR-LOG-EMB", name: "Embarques", type: "PROCESO", responsible: "Supervisor de Embarques", manager: "Jefatura de Logistica El Carmen", qrEnabled: true }
            ]
          },
          { code: "CAR-MC", name: "Mejora Continua", type: "DEPARTAMENTO", responsible: "Responsable por asignar", manager: "Gerencia de Mejora Continua", qrEnabled: true, routingRole: "MEJORA_CONTINUA" },
          { code: "CAR-PROY", name: "Proyectos", type: "DEPARTAMENTO", responsible: "Responsable de Proyectos", manager: "Gerencia de Proyectos", qrEnabled: true, routingRole: "MEJORA_CONTINUA" },
          { code: "CAR-CAL", name: "Calidad e Inocuidad", type: "DEPARTAMENTO", responsible: "Jefatura de Calidad El Carmen", manager: "Gerencia de Calidad", qrEnabled: true, routingRole: "CALIDAD" },
          { code: "CAR-MAN", name: "Mantenimiento y Servicios", type: "DEPARTAMENTO", responsible: "Jefatura de Mantenimiento El Carmen", manager: "Gerencia de Mantenimiento", qrEnabled: true, routingRole: "MANTENIMIENTO" }
        ]
      }
    ]
  }
];

async function createSeedNode(input: { plantId: string; parentId: string | null; node: SeedNode; sortOrder: number }) {
  const captureCode = input.node.captureAreaCode ?? input.node.code;
  let captureArea = input.node.qrEnabled ? await prisma.area.findUnique({ where: { code: captureCode } }) : null;
  let routingUserId = captureArea?.supervisorId ?? null;

  if (!routingUserId && input.node.routingRole) {
    routingUserId = (await prisma.user.findFirst({ where: { role: input.node.routingRole, active: true }, orderBy: { createdAt: "asc" } }))?.id ?? null;
  }

  if (input.node.qrEnabled) {
    captureArea = captureArea
      ? await prisma.area.update({ where: { id: captureArea.id }, data: { active: true, ...(routingUserId && !captureArea.supervisorId ? { supervisorId: routingUserId } : {}) } })
      : await prisma.area.create({ data: { code: captureCode, name: input.node.name, active: true, supervisorId: routingUserId } });
  }

  const unit = await prisma.orgUnit.upsert({
    where: { code: input.node.code },
    update: {},
    create: {
      plantId: input.plantId,
      parentId: input.parentId,
      type: input.node.type,
      code: input.node.code,
      name: input.node.name,
      responsible: input.node.responsible,
      manager: input.node.manager,
      routingUserId,
      captureAreaId: captureArea?.id ?? null,
      qrEnabled: Boolean(input.node.qrEnabled),
      active: true,
      sortOrder: input.sortOrder
    }
  });

  for (const [index, child] of (input.node.children ?? []).entries()) {
    await createSeedNode({ plantId: input.plantId, parentId: unit.id, node: child, sortOrder: index });
  }
}

export async function ensureOrganizationStructure() {
  if (await prisma.orgUnit.count()) return;

  for (const plantInput of seedPlants) {
    const plant = await prisma.plant.upsert({
      where: { code: plantInput.code },
      update: { name: plantInput.name, active: true },
      create: { code: plantInput.code, name: plantInput.name, active: true }
    });
    for (const [index, node] of plantInput.nodes.entries()) {
      await createSeedNode({ plantId: plant.id, parentId: null, node, sortOrder: index });
    }
  }
}

function buildTree(flatNodes: Omit<OrganizationNode, "children">[]): OrganizationNode[] {
  const nodes = new Map(flatNodes.map((node) => [node.id, { ...node, children: [] as OrganizationNode[] }]));
  const roots: OrganizationNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (items: OrganizationNode[]) => {
    items.sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "es"));
    items.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
}

export async function getOrganizationStructure(): Promise<OrganizationStructure> {
  await ensureOrganizationStructure();
  const plants = await prisma.plant.findMany({
    where: { code: { in: ["APO", "CAR"] } },
    include: {
      orgUnits: {
        include: { routingUser: true, captureArea: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      }
    }
  });

  const entries = plants.map((plant) => [plant.code, {
    id: plant.id,
    code: plant.code,
    name: plant.name,
    active: plant.active,
    nodes: buildTree(plant.orgUnits.map((unit) => ({
      id: unit.id,
      plantId: unit.plantId,
      parentId: unit.parentId,
      name: unit.name,
      type: unit.type,
      code: unit.code,
      responsible: unit.responsible,
      manager: unit.manager,
      routingUserId: unit.routingUserId,
      routingUser: unit.routingUser ? { id: unit.routingUser.id, name: unit.routingUser.name, email: unit.routingUser.email, role: unit.routingUser.role } : null,
      captureArea: unit.captureArea ? { id: unit.captureArea.id, code: unit.captureArea.code, active: unit.captureArea.active, supervisorId: unit.captureArea.supervisorId } : null,
      qrEnabled: unit.qrEnabled,
      active: unit.active,
      sortOrder: unit.sortOrder
    })))
  }]);

  return Object.fromEntries(entries) as OrganizationStructure;
}
~~~~~~

### `src/lib/organization-types.ts`

~~~~~~typescript
export type PlantCode = "APO" | "CAR";
export type OrgNodeType = "MACROPROCESO" | "DEPARTAMENTO" | "AREA" | "PROCESO";

export type OrganizationUserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type OrganizationNode = {
  id: string;
  plantId: string;
  parentId: string | null;
  name: string;
  type: OrgNodeType;
  code: string;
  responsible: string;
  manager: string;
  routingUserId: string | null;
  routingUser: OrganizationUserOption | null;
  captureArea: {
    id: string;
    code: string;
    active: boolean;
    supervisorId: string | null;
  } | null;
  qrEnabled: boolean;
  active: boolean;
  sortOrder: number;
  children: OrganizationNode[];
};

export type OrganizationPlant = {
  id: string;
  code: PlantCode;
  name: string;
  active: boolean;
  nodes: OrganizationNode[];
};

export type OrganizationStructure = Record<PlantCode, OrganizationPlant>;

export type OrganizationActionResult = {
  ok: boolean;
  message: string;
};
~~~~~~

### `src/lib/points.ts`

~~~~~~typescript
import type { Approval, Attachment, Idea, PointRule } from "@prisma/client";
import { parseImpactTypes } from "@/lib/domain";
import { managerialCriterionLabel, managerialEvaluationFactors } from "@/lib/managerial-evaluation";

type IdeaForPoints = Idea & {
  approvals: Approval[];
  attachments: Attachment[];
};

const defaultRuleNames = {
  registered: "Idea registrada correctamente",
  supervisorApproved: "Idea aprobada por supervisor",
  supportValidated: "Idea validada por areas soporte",
  implemented: "Idea implementada",
  evidence: "Idea cerrada con evidencia",
  replicable: "Idea replicable a otra area",
  safety: "Idea con impacto en seguridad",
  foodSafety: "Idea con impacto en inocuidad",
  savings: "Idea con ahorro comprobado"
};

function textHasAny(value: string | null | undefined, words: string[]) {
  const text = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return words.some((word) => text.includes(word));
}

function addIfRuleExists(selected: Set<string>, rulesByName: Map<string, PointRule>, name: string) {
  const rule = rulesByName.get(name);
  if (rule) selected.add(rule.id);
}

export function automaticPointRules(idea: IdeaForPoints, pointRules: PointRule[]) {
  const activeRules = pointRules.filter((rule) => rule.active);
  const rulesByName = new Map(activeRules.map((rule) => [rule.name, rule]));
  const selected = new Set<string>();
  const impacts = parseImpactTypes(idea.impactTypes);
  const approvedSupport = idea.approvals.filter(
    (approval) => ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"].includes(approval.type) && approval.status === "APPROVED"
  );
  const afterEvidence = idea.attachments.some((attachment) => attachment.type === "AFTER");

  addIfRuleExists(selected, rulesByName, defaultRuleNames.registered);

  if (idea.approvals.some((approval) => approval.type === "SUPERVISOR" && approval.status === "APPROVED")) {
    addIfRuleExists(selected, rulesByName, defaultRuleNames.supervisorApproved);
  }

  if (approvedSupport.length > 0 || (!idea.impactsQuality && !idea.impactsSafety && !idea.requiresMaintenance)) {
    addIfRuleExists(selected, rulesByName, defaultRuleNames.supportValidated);
  }

  if (idea.implementedAt || idea.status === "IMPLEMENTADA" || idea.status === "CERRADA" || afterEvidence) {
    addIfRuleExists(selected, rulesByName, defaultRuleNames.implemented);
  }

  if (afterEvidence) addIfRuleExists(selected, rulesByName, defaultRuleNames.evidence);

  if (
    textHasAny(`${idea.proposal} ${idea.expectedBenefit} ${idea.mcComments}`, [
      "replica",
      "replicable",
      "otra area",
      "otras areas",
      "linea",
      "lineas"
    ])
  ) {
    addIfRuleExists(selected, rulesByName, defaultRuleNames.replicable);
  }

  if (idea.impactsSafety || impacts.some((impact) => ["Seguridad", "Ergonomia"].includes(impact))) {
    addIfRuleExists(selected, rulesByName, defaultRuleNames.safety);
  }

  if (idea.impactsQuality || impacts.includes("Calidad/Inocuidad")) {
    addIfRuleExists(selected, rulesByName, defaultRuleNames.foodSafety);
  }

  if (
    impacts.includes("Costo") ||
    textHasAny(`${idea.expectedBenefit} ${idea.mcComments}`, ["ahorro", "costo", "econom", "merma", "desperdicio"])
  ) {
    addIfRuleExists(selected, rulesByName, defaultRuleNames.savings);
  }

  const selectedRules = activeRules.filter((rule) => selected.has(rule.id));
  const totalPoints = selectedRules.reduce((sum, rule) => sum + rule.points, 0);
  return { selectedRules, totalPoints };
}

function normalized(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function numericAmounts(value: string) {
  return [...value.matchAll(/\$?\s*(\d[\d,]*(?:\.\d+)?)/g)]
    .map((match) => Number(match[1].replaceAll(",", "")))
    .filter((amount) => Number.isFinite(amount));
}

function suggestedEffect(idea: Idea) {
  const impacts = parseImpactTypes(idea.impactTypes);
  const textValue = `${idea.expectedBenefit} ${idea.mcComments ?? ""}`;
  const greatestAmount = Math.max(0, ...numericAmounts(textValue));
  if (greatestAmount > 15_000) return 300;
  if (greatestAmount >= 3_000) return 225;
  if (greatestAmount > 0) return 150;
  if (idea.impactsSafety || impacts.includes("Seguridad") || normalized(textValue).includes("moral")) return 225;
  if (impacts.length > 0) return 150;
  return 75;
}

function suggestedImplementation(idea: Idea) {
  const implementedAt = idea.implementedAt ?? idea.closedAt;
  if (!implementedAt) return 0;
  const days = Math.max(0, Math.ceil((implementedAt.getTime() - idea.createdAt.getTime()) / 86_400_000));
  if (days <= 30) return 75;
  if (days <= 60) return 50;
  if (days <= 90) return 30;
  return 15;
}

function suggestedEffort(idea: Idea) {
  const textValue = `${idea.proposal} ${idea.mcComments ?? ""}`;
  const hourMatches = [...normalized(textValue).matchAll(/(\d+(?:\.\d+)?)\s*(?:horas?|hrs?|h)\b/g)];
  const hours = Math.max(0, ...hourMatches.map((match) => Number(match[1])));
  if (hours > 50) return 50;
  if (hours >= 25) return 40;
  if (hours >= 9) return 25;
  if (hours > 0) return 10;
  if (idea.category === "C" || idea.requiresExternalSupport) return 40;
  if (idea.category === "B" || idea.impactsQuality || idea.impactsSafety || idea.requiresMaintenance) return 25;
  return 10;
}

function suggestedOriginality(idea: Idea) {
  const textValue = normalized(`${idea.problem} ${idea.proposal} ${idea.expectedBenefit} ${idea.mcComments ?? ""}`);
  if (["nuevo", "creativ", "innov", "automat", "digitaliz"].some((word) => textValue.includes(word))) return 75;
  if (["replica", "replicable", "otras areas", "amplia aplicacion"].some((word) => textValue.includes(word))) return 50;
  if (["adapt", "modific", "reorganiz", "visual", "estandariz"].some((word) => textValue.includes(word))) return 30;
  if (["similar", "referencia", "copi"].some((word) => textValue.includes(word))) return 10;
  return 30;
}

export function automaticManagerialEvaluation(idea: Idea) {
  const suggestions = [suggestedEffect(idea), suggestedImplementation(idea), suggestedEffort(idea), suggestedOriginality(idea)];
  return managerialEvaluationFactors.map((factor, index) => {
    const points = suggestions[index];
    return { factor, points, criterion: managerialCriterionLabel(factor.ruleId, points) };
  });
}
~~~~~~

### `src/lib/portfolio-export.ts`

~~~~~~typescript
import {
  attendancePercent,
  genbaStatusLabels,
  kaizenStatusLabels,
  parseStringArray,
  workItemStatusLabels,
  workProgress
} from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import {
  WORKBOOK_COLORS as COLORS,
  addSummaryMetric,
  createDataSheet,
  createSummarySheet,
  finalizeDataSheet,
  setupWorkbook
} from "@/lib/workbook-style";

function plannedProgress(startDate: Date, endDate: Date, now: Date) {
  if (now <= startDate) return 0;
  if (now >= endDate || endDate <= startDate) return 100;
  return Math.round(((now.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100);
}

function isOverdue(item: { dueDate: Date | null; status: string }, now: Date) {
  return Boolean(item.dueDate && item.dueDate < now && !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(item.status));
}

export async function buildKaizenWorkbook() {
  const workbook = setupWorkbook("Concentrado de Proyectos Kaizen");
  const now = new Date();
  const projects = await prisma.kaizenProject.findMany({
    include: {
      leader: true,
      sourceIdea: true,
      attachments: true,
      activities: { include: { owner: true, sourceGenbaActivity: { include: { walk: true } } }, orderBy: { number: "asc" } },
      updates: { include: { user: true, activity: true }, orderBy: { createdAt: "desc" } }
    },
    orderBy: { number: "asc" }
  });
  const activities = projects.flatMap((project) => project.activities.filter((activity) => activity.status !== "COMBINADA").map((activity) => ({ project, activity })));
  const progress = workProgress(activities.map(({ activity }) => activity));
  const active = projects.filter((project) => ["PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(project.status)).length;
  const completed = projects.filter((project) => project.status === "COMPLETADO").length;
  const overdue = activities.filter(({ activity }) => isOverdue(activity, now)).length;
  const estimated = projects.reduce((sum, project) => sum + (project.estimatedSavings ?? 0), 0);
  const real = projects.reduce((sum, project) => sum + (project.realSavings ?? 0), 0);

  const summary = createSummarySheet(workbook, "CONCENTRADO DE PROYECTOS KAIZEN", `Corte al ${now.toLocaleDateString("es-MX")} · Información sincronizada con PROpEx`);
  addSummaryMetric(summary, 1, 4, "PROYECTOS", projects.length, COLORS.blueSoft);
  addSummaryMetric(summary, 3, 4, "ACTIVOS", active, COLORS.amberSoft);
  addSummaryMetric(summary, 5, 4, "COMPLETADOS", completed, COLORS.greenSoft);
  addSummaryMetric(summary, 7, 4, "AVANCE GLOBAL", `${progress.percent}%`, COLORS.greenSoft);
  addSummaryMetric(summary, 1, 9, "ACTIVIDADES", progress.total, COLORS.blueSoft);
  addSummaryMetric(summary, 3, 9, "VENCIDAS", overdue, overdue ? COLORS.roseSoft : COLORS.greenSoft);
  addSummaryMetric(summary, 5, 9, "AHORRO ESTIMADO", estimated, COLORS.amberSoft);
  addSummaryMetric(summary, 7, 9, "AHORRO REAL", real, COLORS.greenSoft);
  summary.getCell("E10").numFmt = "$#,##0;[Red]-$#,##0";
  summary.getCell("G10").numFmt = "$#,##0;[Red]-$#,##0";
  summary.mergeCells("A14:H14");
  summary.getCell("A14").value = "El archivo incluye una fila por proyecto, una fila por actividad y la bitácora completa. Usa los filtros de cada hoja para concentrar planta, área, líder, estado o fechas.";
  summary.getCell("A14").alignment = { wrapText: true, vertical: "middle" };
  summary.getCell("A14").font = { color: { argb: COLORS.gray }, italic: true, size: 10 };
  summary.getRow(14).height = 42;

  const projectSheet = createDataSheet(workbook, "Proyectos", "PORTAFOLIO KAIZEN", "Una fila por proyecto con salud, beneficios y trazabilidad.", [
    { header: "Folio", key: "folio", width: 18 }, { header: "Proyecto", key: "title", width: 34 }, { header: "Planta", key: "plant", width: 16 }, { header: "Área", key: "area", width: 22 }, { header: "Líder", key: "leader", width: 24 }, { header: "Estatus", key: "status", width: 22 }, { header: "Inicio", key: "startDate", width: 14 }, { header: "Cierre objetivo", key: "endDate", width: 16 }, { header: "Avance real", key: "progress", width: 14 }, { header: "Avance planeado", key: "planned", width: 16 }, { header: "Brecha", key: "gap", width: 12 }, { header: "Actividades", key: "activities", width: 12 }, { header: "Vencidas", key: "overdue", width: 11 }, { header: "Bloqueadas", key: "blocked", width: 12 }, { header: "Línea base", key: "baseline", width: 13 }, { header: "Meta", key: "target", width: 12 }, { header: "Valor actual", key: "current", width: 13 }, { header: "Unidad", key: "unit", width: 12 }, { header: "Ahorro estimado", key: "estimated", width: 17 }, { header: "Ahorro real", key: "real", width: 16 }, { header: "Idea de origen", key: "sourceIdea", width: 17 }, { header: "Project Charter", key: "charter", width: 16 }, { header: "Objetivo", key: "objective", width: 42 }
  ]);
  projects.forEach((project) => {
    const relevant = project.activities.filter((activity) => activity.status !== "COMBINADA");
    const projectProgress = workProgress(relevant);
    const planned = plannedProgress(project.startDate, project.endDate, now);
    projectSheet.addRow({ folio: project.folio, title: project.title, plant: project.plant ?? "", area: project.area, leader: project.leader.name, status: kaizenStatusLabels[project.status], startDate: project.startDate, endDate: project.endDate, progress: projectProgress.percent / 100, planned: planned / 100, gap: (projectProgress.percent - planned) / 100, activities: relevant.length, overdue: relevant.filter((activity) => isOverdue(activity, now)).length, blocked: relevant.filter((activity) => activity.status === "BLOQUEADA").length, baseline: project.baselineValue ?? "", target: project.targetValue ?? "", current: project.currentValue ?? "", unit: project.unit ?? "", estimated: project.estimatedSavings ?? 0, real: project.realSavings ?? 0, sourceIdea: project.sourceIdea?.folio ?? "", charter: project.attachments.some((attachment) => attachment.type === "CHARTER") ? "Sí" : "Pendiente", objective: project.objective });
  });
  ["startDate", "endDate"].forEach((key) => { projectSheet.getColumn(key).numFmt = "dd/mm/yyyy"; });
  ["progress", "planned", "gap"].forEach((key) => { projectSheet.getColumn(key).numFmt = "0%"; });
  ["estimated", "real"].forEach((key) => { projectSheet.getColumn(key).numFmt = "$#,##0;[Red]-$#,##0"; });
  finalizeDataSheet(projectSheet, ["status"]);

  const activitySheet = createDataSheet(workbook, "Actividades", "PLAN DE ACCIÓN KAIZEN", "Concentrado operativo de todas las actividades del portafolio.", [
    { header: "Kaizen", key: "folio", width: 18 }, { header: "Proyecto", key: "project", width: 30 }, { header: "#", key: "number", width: 7 }, { header: "Problemática", key: "problem", width: 34 }, { header: "Acción", key: "action", width: 42 }, { header: "Responsable", key: "owner", width: 24 }, { header: "Estatus", key: "status", width: 20 }, { header: "Inicio", key: "startDate", width: 14 }, { header: "Compromiso", key: "dueDate", width: 14 }, { header: "Cierre", key: "closedAt", width: 14 }, { header: "Días vencida", key: "overdueDays", width: 13 }, { header: "Resultado", key: "completion", width: 36 }, { header: "Justificación", key: "cancellation", width: 36 }, { header: "Origen GENBA", key: "sourceGenba", width: 20 }
  ]);
  activities.forEach(({ project, activity }) => activitySheet.addRow({ folio: project.folio, project: project.title, number: activity.number, problem: activity.problem ?? "", action: activity.action, owner: activity.owner?.name ?? "Sin asignar", status: workItemStatusLabels[activity.status], startDate: activity.startDate ?? null, dueDate: activity.dueDate ?? null, closedAt: activity.closedAt ?? null, overdueDays: isOverdue(activity, now) && activity.dueDate ? Math.floor((now.getTime() - activity.dueDate.getTime()) / 86_400_000) : 0, completion: activity.completionNote ?? "", cancellation: activity.cancellationReason ?? "", sourceGenba: activity.sourceGenbaActivity?.walk.folio ?? "" }));
  ["startDate", "dueDate", "closedAt"].forEach((key) => { activitySheet.getColumn(key).numFmt = "dd/mm/yyyy"; });
  finalizeDataSheet(activitySheet, ["status"]);

  const updateSheet = createDataSheet(workbook, "Bitácora", "BITÁCORA KAIZEN", "Comentarios y acuerdos registrados en los proyectos.", [
    { header: "Kaizen", key: "folio", width: 18 }, { header: "Proyecto", key: "project", width: 30 }, { header: "Actividad", key: "activity", width: 12 }, { header: "Usuario", key: "user", width: 24 }, { header: "Comentario", key: "comment", width: 62 }, { header: "Fecha", key: "createdAt", width: 20 }
  ]);
  projects.flatMap((project) => project.updates.map((update) => updateSheet.addRow({ folio: project.folio, project: project.title, activity: update.activity ? `#${update.activity.number}` : "Proyecto", user: update.user?.name ?? "Sistema", comment: update.comment, createdAt: update.createdAt })));
  updateSheet.getColumn("createdAt").numFmt = "dd/mm/yyyy hh:mm";
  finalizeDataSheet(updateSheet);
  return workbook;
}

export async function buildGenbaWorkbook() {
  const workbook = setupWorkbook("Concentrado de Recorridos GENBA");
  const now = new Date();
  const walks = await prisma.genbaWalk.findMany({
    include: {
      coordinator: true,
      activities: { include: { owner: true, attachments: true, promotedKaizenActivity: { include: { project: true } } }, orderBy: { number: "asc" } },
      updates: { include: { user: true, activity: true }, orderBy: { createdAt: "desc" } }
    },
    orderBy: { visitDate: "desc" }
  });
  const activities = walks.flatMap((walk) => walk.activities.filter((activity) => activity.status !== "COMBINADA").map((activity) => ({ walk, activity })));
  const progress = workProgress(activities.map(({ activity }) => activity));
  const openWalks = walks.filter((walk) => walk.status === "ABIERTO").length;
  const overdue = activities.filter(({ activity }) => isOverdue(activity, now)).length;
  const averageAttendance = walks.length ? Math.round(walks.reduce((sum, walk) => sum + attendancePercent(walk.expectedDepartments, walk.attendedDepartments), 0) / walks.length) : 0;
  const promoted = activities.filter(({ activity }) => activity.promotedKaizenActivity).length;

  const summary = createSummarySheet(workbook, "CONCENTRADO DE RECORRIDOS GENBA", `Corte al ${now.toLocaleDateString("es-MX")} · Información sincronizada con PROpEx`);
  addSummaryMetric(summary, 1, 4, "RECORRIDOS", walks.length, COLORS.blueSoft);
  addSummaryMetric(summary, 3, 4, "ABIERTOS", openWalks, COLORS.amberSoft);
  addSummaryMetric(summary, 5, 4, "ASISTENCIA", `${averageAttendance}%`, COLORS.blueSoft);
  addSummaryMetric(summary, 7, 4, "CIERRE", `${progress.percent}%`, COLORS.greenSoft);
  addSummaryMetric(summary, 1, 9, "ACTIVIDADES", progress.total, COLORS.blueSoft);
  addSummaryMetric(summary, 3, 9, "ABIERTAS", progress.open, COLORS.amberSoft);
  addSummaryMetric(summary, 5, 9, "VENCIDAS", overdue, overdue ? COLORS.roseSoft : COLORS.greenSoft);
  addSummaryMetric(summary, 7, 9, "PROMOVIDAS A KAIZEN", promoted, COLORS.greenSoft);
  summary.mergeCells("A14:H14");
  summary.getCell("A14").value = "El archivo incluye una fila por recorrido, todas las actividades agrupadas por GENBA, la asistencia departamental y la bitácora. Usa los filtros para preparar el concentrado requerido.";
  summary.getCell("A14").alignment = { wrapText: true, vertical: "middle" };
  summary.getCell("A14").font = { color: { argb: COLORS.gray }, italic: true, size: 10 };
  summary.getRow(14).height = 42;

  const walkSheet = createDataSheet(workbook, "Recorridos", "RECORRIDOS GENBA", "Una fila por recorrido con asistencia, avance y riesgos.", [
    { header: "Folio", key: "folio", width: 20 }, { header: "Área visitada", key: "area", width: 24 }, { header: "Fecha", key: "visitDate", width: 14 }, { header: "Coordinador", key: "coordinator", width: 24 }, { header: "Estatus", key: "status", width: 16 }, { header: "Esperados", key: "expected", width: 12 }, { header: "Asistieron", key: "attended", width: 12 }, { header: "Asistencia", key: "attendance", width: 13 }, { header: "Actividades", key: "activities", width: 12 }, { header: "Realizadas", key: "closed", width: 12 }, { header: "Abiertas", key: "open", width: 11 }, { header: "Avance", key: "progress", width: 12 }, { header: "Vencidas", key: "overdue", width: 11 }, { header: "Bloqueadas", key: "blocked", width: 12 }, { header: "Notas", key: "notes", width: 46 }
  ]);
  walks.forEach((walk) => {
    const expected = parseStringArray(walk.expectedDepartments);
    const attended = parseStringArray(walk.attendedDepartments);
    const relevant = walk.activities.filter((activity) => activity.status !== "COMBINADA");
    const walkProgress = workProgress(relevant);
    walkSheet.addRow({ folio: walk.folio, area: walk.areaName, visitDate: walk.visitDate, coordinator: walk.coordinator.name, status: genbaStatusLabels[walk.status], expected: expected.length, attended: attended.length, attendance: attendancePercent(walk.expectedDepartments, walk.attendedDepartments) / 100, activities: walkProgress.total, closed: walkProgress.closed, open: walkProgress.open, progress: walkProgress.percent / 100, overdue: relevant.filter((activity) => isOverdue(activity, now)).length, blocked: relevant.filter((activity) => activity.status === "BLOQUEADA").length, notes: walk.notes ?? "" });
  });
  walkSheet.getColumn("visitDate").numFmt = "dd/mm/yyyy";
  ["attendance", "progress"].forEach((key) => { walkSheet.getColumn(key).numFmt = "0%"; });
  finalizeDataSheet(walkSheet, ["status"]);

  const activitySheet = createDataSheet(workbook, "Actividades", "PLAN DE ACCIÓN GENBA", "Todas las actividades agrupables por folio, área, responsable y estado.", [
    { header: "GENBA", key: "folio", width: 20 }, { header: "Área", key: "area", width: 22 }, { header: "Fecha recorrido", key: "visitDate", width: 16 }, { header: "#", key: "number", width: 7 }, { header: "Problemática", key: "problem", width: 38 }, { header: "Acción", key: "action", width: 40 }, { header: "Responsable", key: "owner", width: 24 }, { header: "Compromiso", key: "dueDate", width: 14 }, { header: "Estatus", key: "status", width: 20 }, { header: "Cierre", key: "closedAt", width: 14 }, { header: "Días vencida", key: "overdueDays", width: 13 }, { header: "Evidencias", key: "evidence", width: 11 }, { header: "Resultado", key: "completion", width: 34 }, { header: "Justificación", key: "cancellation", width: 34 }, { header: "Kaizen relacionado", key: "kaizen", width: 20 }
  ]);
  activities.forEach(({ walk, activity }) => activitySheet.addRow({ folio: walk.folio, area: walk.areaName, visitDate: walk.visitDate, number: activity.number, problem: activity.problem, action: activity.action ?? "", owner: activity.owner?.name ?? "Sin asignar", dueDate: activity.dueDate ?? null, status: workItemStatusLabels[activity.status], closedAt: activity.closedAt ?? null, overdueDays: isOverdue(activity, now) && activity.dueDate ? Math.floor((now.getTime() - activity.dueDate.getTime()) / 86_400_000) : 0, evidence: activity.attachments.length, completion: activity.completionNote ?? "", cancellation: activity.cancellationReason ?? "", kaizen: activity.promotedKaizenActivity?.project.folio ?? "" }));
  ["visitDate", "dueDate", "closedAt"].forEach((key) => { activitySheet.getColumn(key).numFmt = "dd/mm/yyyy"; });
  finalizeDataSheet(activitySheet, ["status"]);

  const attendanceSheet = createDataSheet(workbook, "Asistencia", "ASISTENCIA GENBA", "Detalle de participación esperada y real por departamento.", [
    { header: "GENBA", key: "folio", width: 20 }, { header: "Área", key: "area", width: 24 }, { header: "Fecha", key: "visitDate", width: 14 }, { header: "Departamento", key: "department", width: 28 }, { header: "Esperado", key: "expected", width: 13 }, { header: "Asistió", key: "attended", width: 13 }, { header: "Resultado", key: "result", width: 16 }
  ]);
  walks.forEach((walk) => {
    const expected = new Set(parseStringArray(walk.expectedDepartments));
    const attended = new Set(parseStringArray(walk.attendedDepartments));
    [...new Set([...expected, ...attended])].sort().forEach((department) => attendanceSheet.addRow({ folio: walk.folio, area: walk.areaName, visitDate: walk.visitDate, department, expected: expected.has(department) ? "Sí" : "No", attended: attended.has(department) ? "Sí" : "No", result: attended.has(department) ? "Asistió" : "Ausente" }));
  });
  attendanceSheet.getColumn("visitDate").numFmt = "dd/mm/yyyy";
  finalizeDataSheet(attendanceSheet, ["result"]);

  const updateSheet = createDataSheet(workbook, "Bitácora", "BITÁCORA GENBA", "Seguimientos y acuerdos registrados en los recorridos.", [
    { header: "GENBA", key: "folio", width: 20 }, { header: "Área", key: "area", width: 24 }, { header: "Actividad", key: "activity", width: 12 }, { header: "Usuario", key: "user", width: 24 }, { header: "Comentario", key: "comment", width: 62 }, { header: "Fecha", key: "createdAt", width: 20 }
  ]);
  walks.flatMap((walk) => walk.updates.map((update) => updateSheet.addRow({ folio: walk.folio, area: walk.areaName, activity: update.activity ? `#${update.activity.number}` : "Recorrido", user: update.user?.name ?? "Sistema", comment: update.comment, createdAt: update.createdAt })));
  updateSheet.getColumn("createdAt").numFmt = "dd/mm/yyyy hh:mm";
  finalizeDataSheet(updateSheet);
  return workbook;
}
~~~~~~

### `src/lib/prisma.ts`

~~~~~~typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
~~~~~~

### `src/lib/url.ts`

~~~~~~typescript
export function appBaseUrl() {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function baseUrlFromRequest(origin?: string | null) {
  if (origin) return origin.replace(/\/$/, "");
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  return appBaseUrl();
}
~~~~~~

### `src/lib/workbook-style.ts`

~~~~~~typescript
import ExcelJS from "exceljs";

export const WORKBOOK_COLORS = {
  red: "EA0029",
  dark: "171717",
  gray: "64748B",
  line: "D8D8D8",
  panel: "F8FAFC",
  green: "14835F",
  greenSoft: "DCFCE7",
  amber: "A16207",
  amberSoft: "FEF3C7",
  blue: "176FC1",
  blueSoft: "DBEAFE",
  rose: "D32236",
  roseSoft: "FFE4E6",
  white: "FFFFFF"
};

export type WorkbookColumnDefinition = { header: string; key: string; width: number };

export function setupWorkbook(title: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PROpEx | Proboca";
  workbook.company = "Proboca";
  workbook.subject = title;
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  return workbook;
}

function titleRows(sheet: ExcelJS.Worksheet, title: string, subtitle: string, lastColumn: number) {
  sheet.mergeCells(1, 1, 1, lastColumn);
  sheet.mergeCells(2, 1, 2, lastColumn);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, color: { argb: WORKBOOK_COLORS.white }, size: 18 };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WORKBOOK_COLORS.red } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 34;
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { color: { argb: WORKBOOK_COLORS.gray }, italic: true, size: 10 };
  subtitleCell.alignment = { vertical: "middle" };
  sheet.getRow(2).height = 24;
}

export function createDataSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  title: string,
  subtitle: string,
  columns: WorkbookColumnDefinition[]
) {
  const sheet = workbook.addWorksheet(name, { properties: { defaultRowHeight: 20 } });
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  titleRows(sheet, title, subtitle, columns.length);
  columns.forEach((column, index) => {
    const cell = sheet.getCell(4, index + 1);
    cell.value = column.header;
    cell.font = { bold: true, color: { argb: WORKBOOK_COLORS.white }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WORKBOOK_COLORS.dark } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: WORKBOOK_COLORS.red } } };
  });
  sheet.getRow(4).height = 30;
  sheet.views = [{ state: "frozen", ySplit: 4, showGridLines: false, zoomScale: 90 }];
  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
  };
  sheet.headerFooter.oddFooter = "&LPROpEx | Proboca&C&P de &N&RGenerado &D";
  return sheet;
}

function statusFill(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("asisti")) return WORKBOOK_COLORS.greenSoft;
  if (normalized.includes("ausente")) return WORKBOOK_COLORS.roseSoft;
  if (normalized.includes("complet") || normalized.includes("cerrad") || normalized.includes("aprobad")) return WORKBOOK_COLORS.greenSoft;
  if (normalized.includes("bloque") || normalized.includes("vencid") || normalized.includes("cancel") || normalized.includes("rechaz")) return WORKBOOK_COLORS.roseSoft;
  if (normalized.includes("curso") || normalized.includes("proceso") || normalized.includes("planific") || normalized.includes("implement")) return WORKBOOK_COLORS.blueSoft;
  return WORKBOOK_COLORS.amberSoft;
}

export function finalizeDataSheet(sheet: ExcelJS.Worksheet, statusKeys: string[] = []) {
  for (let rowIndex = 5; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    row.height = 34;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: WORKBOOK_COLORS.line } } };
      if (rowIndex % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WORKBOOK_COLORS.panel } };
    });
  }
  statusKeys.forEach((key) => {
    const column = sheet.getColumn(key);
    for (let rowIndex = 5; rowIndex <= sheet.rowCount; rowIndex += 1) {
      const cell = sheet.getCell(rowIndex, column.number);
      const value = String(cell.value ?? "");
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusFill(value) } };
      cell.font = { bold: true, color: { argb: WORKBOOK_COLORS.dark } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    }
  });
}

export function addSummaryMetric(
  sheet: ExcelJS.Worksheet,
  columnStart: number,
  rowStart: number,
  label: string,
  value: string | number,
  tone: string
) {
  sheet.mergeCells(rowStart, columnStart, rowStart, columnStart + 1);
  sheet.mergeCells(rowStart + 1, columnStart, rowStart + 2, columnStart + 1);
  const labelCell = sheet.getCell(rowStart, columnStart);
  labelCell.value = label;
  labelCell.font = { bold: true, color: { argb: WORKBOOK_COLORS.gray }, size: 9 };
  labelCell.alignment = { vertical: "middle", horizontal: "center" };
  labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WORKBOOK_COLORS.panel } };
  const valueCell = sheet.getCell(rowStart + 1, columnStart);
  valueCell.value = value;
  valueCell.font = { bold: true, color: { argb: WORKBOOK_COLORS.dark }, size: 19 };
  valueCell.alignment = { vertical: "middle", horizontal: "center" };
  valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tone } };
  for (let row = rowStart; row <= rowStart + 2; row += 1) {
    for (let column = columnStart; column <= columnStart + 1; column += 1) {
      sheet.getCell(row, column).border = {
        top: { style: "thin", color: { argb: WORKBOOK_COLORS.line } },
        left: { style: "thin", color: { argb: WORKBOOK_COLORS.line } },
        bottom: { style: "thin", color: { argb: WORKBOOK_COLORS.line } },
        right: { style: "thin", color: { argb: WORKBOOK_COLORS.line } }
      };
    }
  }
}

export function createSummarySheet(workbook: ExcelJS.Workbook, title: string, subtitle: string) {
  const sheet = workbook.addWorksheet("Resumen", { properties: { defaultRowHeight: 22 } });
  sheet.columns = Array.from({ length: 8 }, () => ({ width: 16 }));
  titleRows(sheet, title, subtitle, 8);
  sheet.views = [{ showGridLines: false, zoomScale: 95 }];
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
  return sheet;
}
~~~~~~

### `src/lib/workflow.ts`

~~~~~~typescript
import { ApprovalStatus, ApprovalType, IdeaStatus, Role } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { nextValidationStatus, requiredApprovalTypes, statusForApprovalType, validationOrder } from "@/lib/domain";
import { ideaMailBody, notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const supportRoleForApproval: Partial<Record<ApprovalType, Role>> = {
  CALIDAD: "CALIDAD",
  SEGURIDAD: "SEGURIDAD",
  MANTENIMIENTO: "MANTENIMIENTO"
};

export async function nextFolio() {
  const latest = await prisma.idea.findFirst({
    where: { folio: { startsWith: "IM-" } },
    orderBy: { folio: "desc" },
    select: { folio: true }
  });
  const current = Number(latest?.folio.replace(/^IM-/, "")) || 0;
  return `IM-${String(current + 1).padStart(6, "0")}`;
}

export async function supportUserFor(type: ApprovalType) {
  const role = supportRoleForApproval[type];
  if (!role) return null;
  return prisma.user.findFirst({ where: { role, active: true }, orderBy: { createdAt: "asc" } });
}

export async function supportUsersFor(type: ApprovalType) {
  const role = supportRoleForApproval[type];
  if (!role) return [];
  return prisma.user.findMany({ where: { role, active: true }, orderBy: { createdAt: "asc" } });
}

export async function createValidationApprovals(ideaId: string) {
  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { area: true }
  });
  const required = requiredApprovalTypes(idea);

  await prisma.approval.deleteMany({
    where: { ideaId, type: { in: validationOrder.filter((type) => !required.includes(type)) } }
  });

  for (const type of required) {
    const supportUsers = await supportUsersFor(type);
    const assignedTo = supportUsers[0] ?? null;
    await prisma.approval.upsert({
      where: { ideaId_type: { ideaId, type } },
      update: {
        assignedToId: assignedTo?.id,
        status: "PENDING",
        decision: null,
        comments: null,
        decidedAt: null
      },
      create: {
        ideaId,
        type,
        assignedToId: assignedTo?.id
      }
    });

    for (const supportUser of supportUsers) {
      await notify({
        ideaId,
        to: supportUser.email,
        subject: `Idea de mejora pendiente de validacion - Folio ${idea.folio} - Area ${idea.area.code}`,
        body: ideaMailBody({
          folio: idea.folio,
          area: idea.area.code,
          problem: idea.problem,
          proposal: idea.proposal,
          action: `Validar como ${type}`,
          ideaId
        }),
        channels: ["EMAIL", "TEAMS"]
      });
    }
  }

  return required;
}

export async function updateStatusAfterValidations(ideaId: string) {
  const approvals = await prisma.approval.findMany({
    where: { ideaId, type: { in: validationOrder } },
    orderBy: { createdAt: "asc" }
  });

  if (approvals.some((approval) => approval.status === "REJECTED")) {
    await prisma.idea.update({ where: { id: ideaId }, data: { status: "RECHAZADA_VALIDACION" } });
    return "RECHAZADA_VALIDACION" satisfies IdeaStatus;
  }

  if (approvals.some((approval) => approval.status === "MORE_INFO")) {
    await prisma.idea.update({ where: { id: ideaId }, data: { status: "SOLICITUD_INFORMACION" } });
    return "SOLICITUD_INFORMACION" satisfies IdeaStatus;
  }

  const pending = approvals.filter((approval) => approval.status === "PENDING").map((approval) => approval.type);
  if (pending.length === 0) {
    const idea = await prisma.idea.update({
      where: { id: ideaId },
      data: { status: "APROBADA_PARA_IMPLEMENTAR" },
      include: { area: true }
    });
    const mcUsers = await prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "ADMIN"] }, active: true } });
    for (const user of mcUsers) {
      await notify({
        ideaId,
        to: user.email,
        subject: `Idea aprobada para implementar - Folio ${idea.folio} - Area ${idea.area.code}`,
        body: ideaMailBody({
          folio: idea.folio,
          area: idea.area.code,
          problem: idea.problem,
          proposal: idea.proposal,
          action: "Clasificar y asignar responsable",
          ideaId
        })
      });
    }
    return "APROBADA_PARA_IMPLEMENTAR" satisfies IdeaStatus;
  }

  const nextStatus = statusForApprovalType(pending[0]);
  await prisma.idea.update({ where: { id: ideaId }, data: { status: nextStatus } });
  return nextStatus;
}

export async function approveSupervisor(ideaId: string, userId: string) {
  await prisma.approval.upsert({
    where: { ideaId_type: { ideaId, type: "SUPERVISOR" } },
    update: { status: "APPROVED", decision: "APROBAR", decidedAt: new Date() },
    create: { ideaId, type: "SUPERVISOR", assignedToId: userId, status: "APPROVED", decision: "APROBAR", decidedAt: new Date() }
  });

  const required = await createValidationApprovals(ideaId);
  const status = required.length ? nextValidationStatus(required) : "APROBADA_PARA_IMPLEMENTAR";
  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status,
      rejectionReason: null,
      moreInfoRequest: null
    }
  });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "SUPERVISOR_APPROVED", userId, details: { status } });
  if (!required.length) await updateStatusAfterValidations(ideaId);
}

export async function notifyIdeaClosed(ideaId: string, options: { coinsUpdated?: boolean } = {}) {
  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { area: true, supervisor: true, approvals: { include: { assignedTo: true } } }
  });
  const recipients = new Set<string>();
  if (idea.collaboratorEmail) recipients.add(idea.collaboratorEmail);
  if (idea.supervisor?.email) recipients.add(idea.supervisor.email);
  idea.approvals.forEach((approval) => {
    if (approval.assignedTo?.email) recipients.add(approval.assignedTo.email);
  });
  const mcUsers = await prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "ADMIN"] }, active: true } });
  mcUsers.forEach((user) => recipients.add(user.email));

  for (const to of recipients) {
    await notify({
      ideaId,
      to,
      subject: `${options.coinsUpdated ? "ProbocaCoins actualizadas" : "Idea de mejora cerrada"} - Folio ${idea.folio} - Area ${idea.area.code}`,
      body: ideaMailBody({
        folio: idea.folio,
        area: idea.area.code,
        problem: idea.problem,
        proposal: idea.proposal,
        action: options.coinsUpdated
          ? `Mejora Continua actualizo la recompensa a ${idea.pointsAssigned} ProbocaCoins`
          : `Idea cerrada con ${idea.pointsAssigned} ProbocaCoins`,
        ideaId
      })
    });
  }
}

export async function markOverdueIdeas(userId?: string | null) {
  const overdueIdeas = await prisma.idea.findMany({
    where: {
      dueDate: { lt: new Date() },
      status: { notIn: ["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION", "VENCIDA"] }
    },
    include: { area: true, supervisor: true, implementationOwner: true }
  });

  for (const idea of overdueIdeas) {
    await prisma.idea.update({ where: { id: idea.id }, data: { status: "VENCIDA" } });
    await auditLog({ entity: "Idea", entityId: idea.id, action: "MARKED_OVERDUE", userId, details: { dueDate: idea.dueDate } });
    const recipients = new Set<string>();
    if (idea.implementationOwner?.email) recipients.add(idea.implementationOwner.email);
    if (idea.supervisor?.email) recipients.add(idea.supervisor.email);
    const mcUsers = await prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "ADMIN"] }, active: true } });
    mcUsers.forEach((user) => recipients.add(user.email));

    for (const to of recipients) {
      await notify({
        ideaId: idea.id,
        to,
        subject: `Idea vencida - Folio ${idea.folio} - Area ${idea.area.code}`,
        body: ideaMailBody({
          folio: idea.folio,
          area: idea.area.code,
          problem: idea.problem,
          proposal: idea.proposal,
          action: "Revisar fecha compromiso y actualizar avance",
          ideaId: idea.id
        })
      });
    }
  }

  return overdueIdeas.length;
}
~~~~~~

## 5.7 Archivos públicos textuales

### `public/uploads/.gitkeep`

~~~~~~text

~~~~~~

## 5.8 Recursos binarios versionados

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `public/brand/mejora-continua-icon.png` | 250419 | `f75dfe93fce9b7ddf323237d07bd880b24ed13fd37444c17717db573cb0cd465` |
| `public/brand/mejora-continua-logo-rojo.png` | 114251 | `f9e54fc9de84c5a19fbb422af97dd9ff599d711b0d6e3b3ef634db5e80eba8b0` |
| `public/brand/proboca-logo.png` | 2990 | `34ab610e8b9b87bc4ef4d337f79c39efd1ac225202fbf79d12f9fcf104402288` |
| `public/brand/proboca-servicios.jpg` | 35406 | `d3c576ab8a680ccbe4952874b4be5b1cbe53bf9b8efb08fe1e8ba98fd777445a` |

## 6. Variables de entorno

| Variable | Tipo | Uso exacto | Obligatoria |
|---|---|---|---|
| `DATABASE_URL` | Genérica | Prisma la consume en ambos schemas (`prisma/schema*.prisma:7`). Local: `file:./dev.db`; producción: URL PostgreSQL. | Sí para cualquier ejecución con base. |
| `APP_BASE_URL` | Genérica | URL canónica para enlaces en correos/Teams (`src/lib/url.ts:2,10`). | Recomendada; imprescindible on-prem para enlaces correctos. |
| `AUTH_SECRET` | Genérica/secreta | Firma HMAC-SHA256 de la cookie (`src/lib/auth.ts:20-25`). | Sí en producción. Si falta usa el valor inseguro `dev-secret-change-me`. |
| `BLOB_READ_WRITE_TOKEN` | Específica de Vercel Blob/secreta | Activa `@vercel/blob` (`src/lib/files.ts:19-29`). | Solo en Vercel Blob. Omitir para filesystem local. |
| `MICROSOFT_TENANT_ID` | Externa/secreta | Tenant OAuth de Graph (`src/lib/notifications.ts:15,24`). | Solo para correo real por Graph. |
| `MICROSOFT_CLIENT_ID` | Externa/secreta | Client ID OAuth (`src/lib/notifications.ts:16,29`). | Solo Graph. |
| `MICROSOFT_CLIENT_SECRET` | Externa/secreta | Client secret OAuth (`src/lib/notifications.ts:17,30`). | Solo Graph. |
| `MICROSOFT_SENDER_EMAIL` | Externa | Buzón usado en `users/{sender}/sendMail` (`src/lib/notifications.ts:18,43`). | Solo Graph. |
| `TEAMS_WEBHOOK_URL` | Externa/secreta | Webhook de Teams (`src/lib/notifications.ts:71-75`). | Solo Teams. |
| `VERCEL` | Automática de Vercel | Señala filesystem efímero y fuerza error sin Blob (`src/lib/files.ts:31-33`). | No definir on-prem. |
| `VERCEL_PROJECT_PRODUCTION_URL` | Automática de Vercel | Primer fallback de URL pública (`src/lib/url.ts:3`). | No; reemplazar con `APP_BASE_URL`. |
| `VERCEL_URL` | Automática de Vercel | Segundo fallback de URL pública (`src/lib/url.ts:4`). | No; reemplazar con `APP_BASE_URL`. |
| `NODE_ENV` | Genérica/Next.js | Cookie `secure`, logging de Prisma y caché global del cliente (`src/lib/auth.ts:56`; `src/lib/prisma.ts:8,11`). | Next la establece en dev/build/start. |
| `PRISMA_SCHEMA` | Genérica de script | Selecciona schema en `scripts/db-push.ts:32` si no se pasa `--schema`. | Opcional. No está en los ejemplos. |
| `ALLOW_PRODUCTION_DEMO_SEED` | Genérica de seguridad operativa | Debe valer `1` para permitir `seed-dashboard-examples` sobre URL no SQLite (`scripts/seed-dashboard-examples.ts:65-68`). | Solo al cargar demos en producción. No está en los ejemplos. |
| `ALLOW_PRODUCTION_KAIZEN_BACKFILL` | Genérica de seguridad operativa | Debe valer `1` para conciliar ideas Kaizen sobre URL no SQLite (`scripts/backfill-kaizen-ideas.ts:5-7`). | Solo para backfill en producción. No está en los ejemplos. |

Brechas de documentación actuales:

- `.env.example` y `.env.production.example` sí incluyen las primeras nueve variables funcionales: DB, base URL, secreto, Blob, cuatro de Microsoft y Teams.
- No incluyen `PRISMA_SCHEMA`, `ALLOW_PRODUCTION_DEMO_SEED` ni `ALLOW_PRODUCTION_KAIZEN_BACKFILL`.
- Las variables automáticas `VERCEL*` y `NODE_ENV` tampoco aparecen, lo cual es normal para variables gestionadas por plataforma/runtime.
- No se exponen valores reales en esta extracción. Los archivos `.env` y `.env.local` están ignorados por Git.

## 7. Autenticación y roles

Implementación actual del login:

1. `/login` envía correo, contraseña y módulo destino a `loginAction` (`src/app/login/page.tsx:68-113`).
2. `loginAction` hace búsqueda exacta por email, exige usuario activo y verifica bcrypt (`src/app/actions.ts:132-145`). No normaliza el email durante login, aunque creación/edición sí lo normaliza.
3. Crea una cookie `propex_session` con `userId`, email, rol y expiración; el cuerpo está codificado en Base64URL y firmado con HMAC-SHA256 (`src/lib/auth.ts:10-30`).
4. La sesión dura 12 horas. La cookie usa `httpOnly`, `sameSite=lax`, `path=/` y `secure` solo con `NODE_ENV=production` (`src/lib/auth.ts:50-59`).
5. En cada acceso protegido, `getCurrentUser` vuelve a consultar que el usuario exista y esté activo (`src/lib/auth.ts:73-78`).
6. No hay tabla de sesiones, refresh token, logout global ni revocación individual; desactivar el usuario sí invalida el acceso en la siguiente consulta.
7. `requireUser` protege páginas/acciones y redirige al home del rol (`src/lib/auth.ts:81-85`). No hay middleware global.

Roles declarados y permisos efectivos:

| Rol | Acceso principal |
|---|---|
| `ADMIN` | Acceso completo; puede actuar como supervisor/validador, administrar usuarios, áreas, estructura, reglas, notificaciones, Ideas, Kaizen y GENBA. |
| `MEJORA_CONTINUA` | Dashboard y gestión del flujo de ideas, reapertura, clasificación, asignación, cierre, ProbocaCoins, Kaizen/GENBA y recordatorios. Algunas actions de reglas permiten MC, pero la página `/configuracion` completa exige ADMIN. |
| `SUPERVISOR` | Bandeja de sus propias áreas, decisión de supervisor y actualizaciones de implementación de ideas asignadas. Puede acceder a Kaizen/GENBA por bandera o asignación. |
| `CALIDAD` | Bandeja de validación Calidad/Inocuidad; decide únicamente el tipo derivado de su rol. Acceso Kaizen/GENBA por bandera o asignación. |
| `SEGURIDAD` | Bandeja de Seguridad Industrial; misma regla por rol. Acceso Kaizen/GENBA por bandera o asignación. |
| `MANTENIMIENTO` | Bandeja de Mantenimiento y actualización de implementación; acceso Kaizen/GENBA por bandera o asignación. |
| `COLABORADOR` | Existe en el enum y etiquetas, pero `createUserAction` no permite crearlo y no hay usuario demo. La captura del colaborador es pública y sin sesión. |

Acceso a módulos:

- ADMIN y MEJORA_CONTINUA siempre acceden a Kaizen y GENBA (`src/lib/module-access.ts:10-15`).
- Cualquier otro usuario accede si tiene `kaizenAccess`/`genbaAccess` o si es líder/coordinador/responsable de una actividad (`src/lib/module-access.ts:16-23`).
- Crear/editar proyectos, recorridos, actividades, fechas, combinaciones y bitácoras está restringido a ADMIN/MEJORA_CONTINUA.
- Líder/coordinador o responsable asignado puede cerrar su actividad con evidencia o justificar cancelación (`src/app/actions.ts:1018-1049,1227-1259`).

Usuarios demo del seed, todos con contraseña literal `admin123`:

- `admin@propEx.local`
- `mc@propEx.local`
- `calidad@propEx.local`
- `seguridad@propEx.local`
- `mantenimiento@propEx.local`
- `supervisor.p1@propEx.local` a `supervisor.p9@propEx.local`

Limitaciones de autenticación confirmadas: no hay SSO/Active Directory, MFA, recuperación de contraseña, verificación de email, bloqueo por intentos, rate limiting ni política de rotación. `AUTH_SECRET` tiene fallback inseguro de desarrollo. Antes de migrar a producción on-premise se deben cambiar/eliminar los usuarios demo y fijar un secreto fuerte.

## 8. Funcionalidades implementadas vs. pendientes

- [x] **Ideas de Mejora:** captura pública por QR/área, folio `IM-######`, evidencia antes, supervisor, solicitud de información, rechazo/reapertura, validaciones de Calidad/Seguridad/Mantenimiento, clasificación, asignación, seguimiento, evidencia después, cierre y cancelación.
- [x] **Categorías A/B/C:** captura y reglas de apoyo; C exige detalle de apoyo externo.
- [x] **Dashboard y vistas:** dashboard ejecutivo, tabla maestra, detalle, bandejas por rol, Kanban, vencidas y auditoría.
- [x] **QR dinámico:** PNG por área, descarga, impresión, URL basada en origin o `APP_BASE_URL`, y estructura organizacional administrable.
- [x] **ProbocaCoins a nivel de idea:** reglas configurables, sugerencias automáticas, evaluación gerencial, ajuste/retiro y registro en `Idea.pointsAssigned` + `IdeaPointRule`, con celebración visual.
- [ ] **ProbocaCoins como programa transaccional completo:** no hay cuenta/saldo por colaborador, ledger de movimientos, catálogo, canje, caducidad, aprobaciones financieras ni integración con nómina. El nombre del colaborador no está vinculado a una entidad de empleado.
- [x] **Proyectos Kaizen:** folio `KZN-###`, creación manual y automática desde idea clasificada, Charter, métricas, ahorro, plan de actividades, responsables, evidencia, cancelación justificada, combinación, cierre automático, dashboard, Kanban, Gantt editable y exportación Excel.
- [x] **Recorridos GENBA:** folio `GENBA-###`, área/fecha/coordinador, departamentos esperados/asistentes, mínimo cinco actividades, responsables, evidencia, combinación, cierre automático, dashboard, Kanban, exportación y promoción trazable a Kaizen.
- [x] **Exportación Excel:** `/api/export` para Ideas, `/api/export/kaizen` y `/api/export/genba`; `scripts/export-demo.ts` genera exportación local de Ideas.
- [x] **Auditoría:** registra eventos relevantes en `AuditLog` y ofrece pantalla de consulta.
- [~] **Notificaciones:** outbox local, reintento y marcado como revisado están implementados. Correo Graph y webhook Teams solo funcionan si hay credenciales y salida a internet; en el escenario on-premise sin internet quedarán pendientes/locales. No hay SMTP interno.
- [~] **Recordatorios:** la lógica de vencimiento y avisos existe y puede ejecutarse desde UI o `pnpm reminders`; la programación recurrente no vive dentro de la app. Debe configurarse en Task Scheduler/servicio externo.
- [~] **Configuración de correos soporte:** existe `updateSupportSettingsAction` y el seed crea `Setting.supportEmails`, pero ninguna pantalla invoca esa action y el workflow asigna validadores consultando usuarios por rol, no ese setting. Está parcialmente desconectado.
- [~] **Datos demo:** `prisma/seed.ts` crea ocho ideas de ejemplo. `db:seed:dashboards` crea 10 Kaizen y 10 GENBA demo y usa rutas ficticias de Charter; no son evidencias reales.
- [ ] **Migraciones versionadas:** no existen. Solo `db push`; para un entorno controlado falta una historia de migraciones reproducible y respaldos/rollback definidos.
- [ ] **Pruebas automáticas de la app principal:** no hay script `test`, carpeta de tests ni CI versionada para la aplicación raíz.
- [ ] **Importación histórica de Excel:** no hay importador versionado en la app. Los scripts no versionados de extracción encontrados en el workspace no forman parte del deploy.
- [ ] **Operación sin internet de correo/Teams/Blob:** no existe adaptador alterno. El filesystem local sí funciona para evidencias si el proceso tiene permisos.

Observaciones honestas de estado:

- El código fuente vigente pasa TypeScript al comprobar solo `src`, `prisma` y scripts versionados.
- La comprobación global con el `tsconfig.json` actual falla en este workspace porque `include: ["**/*.ts","**/*.tsx"]` alcanza copias antiguas no versionadas bajo `tmp/deploy-*`; `tmp` no está en `exclude`. Un checkout limpio de Git no contiene esas copias.
- No se ejecutó una prueba end-to-end ni un build completo en esta extracción; no existe suite automática. El primer intento de `pnpm exec` quiso reconciliar `node_modules` y acceder al registry, bloqueado por el entorno sin red.

## 9. Cómo correr el proyecto hoy

Requisitos que sí se desprenden del repositorio:

- Node.js compatible con Next 15 y Prisma 6; la versión exacta no está fijada. Para on-premise conviene fijar una versión LTS y validarla antes de instalar como servicio.
- PNPM. El lockfile es la fuente reproducible del árbol de dependencias.
- SQLite para el modo local o PostgreSQL para el schema de producción.

Instalación y ejecución local con SQLite:

~~~~~~powershell
Copy-Item .env.example .env
pnpm install --frozen-lockfile
pnpm db:push
pnpm db:seed
pnpm dev
~~~~~~

La URL predeterminada es `http://localhost:3000`.

Seeds adicionales opcionales:

~~~~~~powershell
pnpm db:seed:organization
pnpm db:seed:managerial-points
pnpm db:seed:dashboards
~~~~~~

Build y arranque de producción usando SQLite/local:

~~~~~~powershell
pnpm build
pnpm start
~~~~~~

Build con schema PostgreSQL (el mismo camino usado hoy por Vercel y el apropiado para PostgreSQL on-premise):

~~~~~~powershell
Copy-Item .env.production.example .env
# Editar DATABASE_URL, APP_BASE_URL y AUTH_SECRET con valores internos reales.
pnpm install --frozen-lockfile
pnpm db:push:production
pnpm db:seed:production
pnpm build:vercel
pnpm start
~~~~~~

Aunque el script se llama `build:vercel`, lo único específico que hace es generar Prisma con `prisma/schema.production.prisma` y ejecutar `next build`; puede usarse fuera de Vercel. No define runtime Edge.

Comandos operativos:

~~~~~~powershell
pnpm reminders
pnpm export-demo
pnpm db:backfill:kaizen-ideas
~~~~~~

Para on-premise sin internet:

- Definir `APP_BASE_URL` con el origen interno, por ejemplo `https://propex.interno`.
- No definir `VERCEL` ni `BLOB_READ_WRITE_TOKEN`; así las evidencias se escriben en `public/uploads`.
- Dar permisos de lectura/escritura a la identidad que ejecuta Node sobre `public/uploads` y respaldar esa carpeta junto con la base.
- Si se usa PostgreSQL, ejecutar los comandos `*:production`; si se usa SQLite, `db:push`, `db:seed` y `build` normales.
- Alojar `next start` como proceso/servicio Node y usar IIS como reverse proxy. IIS por sí solo no puede servir esta aplicación como archivos estáticos.
- Graph, Teams y Vercel Blob no funcionarán sin salida a internet; el outbox local seguirá registrando avisos.
- Programar `pnpm reminders` con Windows Task Scheduler si se requiere ejecución diaria.
- No cargar el seed demo en producción definitiva; si se usa, cambiar inmediatamente credenciales y datos de ejemplo.

No existe un comando de migración con historial ni un comando de pruebas. `lint` apunta a `next lint`, comando que no es una verificación confiable en Next 15.5 sin configuración ESLint versionada; la validación real disponible hoy es TypeScript/build.

