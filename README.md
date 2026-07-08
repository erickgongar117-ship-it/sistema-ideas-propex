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
