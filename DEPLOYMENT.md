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
