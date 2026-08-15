# PROpEx: contexto compartido de proyecto

Lee este archivo completo antes de modificar el sistema. Es la memoria de trabajo compartida para Codex, Claude Code y cualquier persona que colabore en este repositorio.

## Arranque obligatorio de cada sesion

```powershell
powershell -File .copiloto/bin/inicio.ps1
```

Este repo lo trabajan **dos agentes por turnos en esta misma carpeta**: Claude y Codex.
No hay carpeta por agente. Como comparten el arbol de trabajo, **no pueden trabajar a la
vez**: el lock es lo que evita que dos editen el mismo archivo.

El comando de arriba te dice en que rama estas, con que estado cerro el otro agente, que
areas estan tomadas y que trabajo quedo a medias.

Eres `claude`: firma tus commits con prefijo `[claude]` y cierra siempre tu turno con
`.copiloto/bin/cerrar.ps1`. **Nunca uses `git add -A`** — aqui conviven varios frentes de
trabajo y te llevarias cambios ajenos; commitea con rutas explicitas.

Las reglas de coordinacion completas estan en **`.copiloto/PROTOCOLO.md`**. Las reglas de
producto, permisos y despliegue son las que siguen en este archivo.

## Objetivo del producto

PROpEx es el sistema interno de Proboca para gestionar tres procesos conectados:

1. **Ideas de Mejora**: captura publica por QR, aprobacion, validaciones, implementacion, puntos y cierre.
2. **Proyectos Kaizen**: proyectos de mejora con folio consecutivo, Project Charter, actividades, responsable, avance, tablero, Kanban y Gantt anual.
3. **Recorridos GENBA**: recorridos por area con asistencia, cinco actividades principales, seguimiento, evidencias, tablero y Kanban.

La aplicacion debe sentirse clara para personal operativo. Las personas deben ver primero solamente los apartados que les corresponden; Administrador y Mejora Continua ven y administran el flujo completo.

## Estado actual confirmado

- Repositorio: `https://github.com/erickgongar117-ship-it/sistema-ideas-propex`
- Produccion: `https://sistema-ideas-propex.vercel.app`
- Stack: Next.js 15, TypeScript, Tailwind, Prisma, Neon Postgres en produccion, SQLite local y Vercel Blob para archivos online.
- Las rutas `/login`, `/captura/P1` y `/api/qr/P1` estan verificadas en produccion.
- El commit que incorporo Kaizen y GENBA es `f8f9145`.
- No guardar secretos, tokens, contrasenas ni valores de `.env` en Git ni en este archivo.

## Navegacion y experiencia

- En el login, **Ideas** debe ser siempre la primera opcion; despues Kaizen y GENBA.
- Mantener el selector de modulo visible para usuarios con acceso a mas de un modulo.
- Ideas conserva la identidad visual PROpEx.
- Kaizen usa acento ambar.
- GENBA usa acento rojo.
- Roles por color: Supervisor verde, Calidad rojo, Seguridad gris, Mantenimiento azul, Mejora Continua y Admin oscuro/negro.
- Usar componentes y patrones existentes, iconos de `lucide-react`, tarjetas con radio discreto y diseno responsive.
- Evitar paginas de marketing, tarjetas dentro de tarjetas, botones redundantes y textos explicativos innecesarios en pantalla.

## Reglas de acceso

- Solo `ADMIN` y `MEJORA_CONTINUA` crean y editan proyectos Kaizen, recorridos GENBA, actividades, fechas, Gantt, responsables, Charter, combinaciones y bitacoras.
- Un lider Kaizen o responsable de actividad puede cerrar su actividad con evidencia o justificar que no se ejecutara.
- Un coordinador GENBA o responsable de actividad puede cerrar su actividad con evidencia o justificar que no se ejecutara.
- Usuarios asignados a una actividad obtienen acceso al modulo correspondiente; Administrador y Mejora Continua siempre tienen acceso.
- El administrador puede habilitar acceso global a Kaizen o GENBA por persona desde Configuracion.

## Reglas funcionales

### Ideas de Mejora

- Los QR son online y apuntan a `/captura/P1` a `/captura/P9`.
- Una idea clasificada como `KAIZEN` crea o reutiliza automaticamente un proyecto Kaizen cuando Mejora Continua asigna responsable y fecha.
- Las notificaciones se registran siempre en el outbox. Solo se envian por correo cuando Microsoft Graph esta configurado.

### Proyectos Kaizen

- El numero y folio son consecutivos: `KZN-001`, `KZN-002`, etc.
- Un proyecto nuevo inicia en `PENDIENTE_CHARTER` y debe poder almacenar Project Charter en Vercel Blob.
- El avance se calcula con actividades no combinadas: completadas o canceladas / total.
- El Gantt y el expediente editan las mismas fechas. No duplicar campos ni logica de calendario.
- Una actividad completada requiere evidencia. Una cancelada requiere justificacion.
- Cuando todas las actividades vigentes estan completadas o canceladas, el proyecto se cierra automaticamente.
- Las actividades se pueden combinar solo con justificacion y sin generar trabajo duplicado.

### Recorridos GENBA

- Todo GENBA inicia con cinco actividades principales; se pueden agregar mas despues.
- Registrar area visitada, fecha, coordinador, departamentos esperados y asistentes.
- Mostrar asistencia, actividades abiertas/cerradas, vencidas y porcentaje de avance.
- Las actividades pueden enviarse a un Kaizen existente o crear uno nuevo. La actividad resultante conserva trazabilidad de origen.
- Una actividad completada requiere evidencia. Una cancelada requiere justificacion.
- Cuando todas las actividades vigentes estan completadas o canceladas, el GENBA se cierra automaticamente.

## Archivos importantes

```text
prisma/schema.prisma                    Esquema SQLite local
prisma/schema.production.prisma         Esquema Neon/Postgres de produccion
src/app/actions.ts                      Acciones del servidor, permisos y flujos
src/app/(app)/kaizen/                   Dashboard, detalle, Gantt y Kanban Kaizen
src/app/(app)/genba/                    Dashboard, detalle y Kanban GENBA
src/components/app-shell.tsx            Selector de modulo y navegacion por rol
src/lib/module-access.ts                Permisos de Kaizen y GENBA
src/lib/domain.ts                       Etiquetas, progreso y utilidades del dominio
src/lib/files.ts                        Archivos locales o Vercel Blob
src/lib/notifications.ts                Outbox y Microsoft Graph opcional
src/app/globals.css                     Estilos compartidos y Gantt
```

## Datos y variables de entorno

- Local: SQLite usando `prisma/schema.prisma`.
- Produccion: Neon usando `prisma/schema.production.prisma`.
- Produccion ya tiene `DATABASE_URL`, `AUTH_SECRET`, `APP_BASE_URL` y `BLOB_READ_WRITE_TOKEN`.
- Para correo real hacen falta, en Vercel y sin exponer valores: `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` y `MICROSOFT_SENDER_EMAIL`.
- Si Graph no esta configurado, no romper flujos: dejar la notificacion en `NotificationOutbox` con estado pendiente.

## Excel de referencia

Los libros de Kaizen y GENBA se usaron para adaptar campos, Gantt, actividades, asistencia y tableros. No se importaron historicos automaticamente porque contienen hojas y versiones duplicadas. Antes de importar datos, confirmar con el usuario cual hoja es la fuente vigente y preparar una importacion idempotente.

## Flujo seguro de trabajo compartido

1. Actualiza antes de empezar: `git pull origin main`.
2. Trabaja en una rama propia: `git switch -c claude/<tema>` o `codex/<tema>`.
3. No borres cambios no relacionados ni la carpeta no versionada `src/app/calculadora-pollos/`.
4. Antes de entregar: `pnpm exec tsc --noEmit` y `pnpm run build:vercel`.
5. Para cambios de base de datos, modifica ambos esquemas Prisma y ejecuta primero la migracion local; produccion usa `pnpm run db:push:production` con las variables ya configuradas.
6. Publica solo despues de verificar. La version online se despliega desde `main` en Vercel.
7. Resume en el commit que cambiaste, por que y como se verifico.

## Prompt de inicio para Claude Code

Pega esto al iniciar una sesion nueva de Claude Code:

```text
Lee CLAUDE.md completo antes de hacer cambios. Estamos trabajando en el sistema PROpEx de Proboca. Respeta las reglas de permisos, experiencia operativa y despliegue descritas ahi. Revisa el estado de Git, preserva cambios no relacionados y antes de modificar explica brevemente que archivos afectaras. Implementa, verifica TypeScript y build de Vercel, y no publiques ni modifiques produccion sin pedirmelo explicitamente.
```
