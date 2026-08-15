# Protocolo de trabajo compartido — Codex + Claude

Como se coordinan los agentes. **Las reglas de producto, permisos y despliegue estan en
`CLAUDE.md`**, no aqui; este archivo no las repite ni las sustituye. Si algo choca, manda
`CLAUDE.md` para el *que* del producto y este archivo para el *como* del trabajo conjunto.

---

## 0. Como esta armado esto

Cada agente trabaja en **su propio worktree, sobre su propia rama**. Son carpetas distintas
en disco que comparten un solo historial de git:

| Worktree | Rama | Quien |
|---|---|---|
| `Documentos\proboca ideas de mejora` | `codex/<tema>` | Codex |
| `Escritorio\propex-claude` | `claude/<tema>` | Claude |

Eso ya evita que se pisen los archivos. Lo que faltaba —y agrega esta capa— es que cada uno
sepa **que esta haciendo el otro y en que paso quedo**. Cinco niveles:

| Nivel | Donde | Que guarda |
|---|---|---|
| Hechos | `.git/` | Que cambio, quien y cuando. Reversible |
| Reflejo | `.git/copiloto/eventos.jsonl` | Ledger automatico de cada commit, de todos los worktrees |
| Turno | `.git/copiloto/ESTADO-<agente>.md` | La foto del ahora de cada agente |
| Memoria | `.copiloto/BITACORA.md` | El *por que*. Versionado, viaja a GitHub |
| Reglas | este archivo + `CLAUDE.md` | Como jugamos |

**Por que el estado vivo esta en `.git/copiloto/` y no en el proyecto:** los archivos
ignorados por git **no se comparten entre worktrees** — cada carpeta tiene los suyos. Un
ledger dentro de `src/` seria invisible para el otro agente. En cambio `.git/` es comun a
todos los worktrees, asi que lo que vive ahi lo ven los dos, sin importar su rama.

---

## 1. Regla de oro

Cada quien en su worktree y su rama. Antes de tocar archivos, **lee el estado del otro**.
Si van a tocar los mismos archivos, se avisa; no se asume.

---

## 2. Arranque de turno (obligatorio, sin excepciones)

```powershell
powershell -File .copiloto/bin/inicio.ps1
```

Muestra: todos los worktrees con su rama y cuantos commits le faltan a cada uno, el estado
de los dos agentes, locks vigentes, cambios sin commitear aqui, ultimos 12 eventos y ultimos
commits.

Reglas de lectura:
- **Lock vigente de otro agente sobre tus areas** -> avisale al usuario antes de seguir.
- **Tu rama muy atrasada** (el script te lo dice) -> actualiza antes de trabajar, o vas a
  construir sobre codigo viejo y despues toca resolverlo a mano.
- **Cambios sin commitear que no son tuyos** -> no los pises ni los borres. Pregunta.

---

## 3. Durante el turno

1. **Toma el lock** de lo que vas a tocar:
   ```powershell
   powershell -File .copiloto/bin/lock.ps1 -Agente claude -Areas "src/lib","prisma"
   ```
2. **Registra los hitos** (no cada linea):
   ```powershell
   powershell -File .copiloto/bin/registrar.ps1 -Agente claude -Que "..." -Archivos "..."
   ```
3. **Commitea con rutas explicitas y prefijo de agente.** Nunca `git add -A`: en este repo
   conviven varios frentes y te llevarias trabajo ajeno.
   ```powershell
   git add -- src/lib/points.ts src/app/(app)/kaizen/page.tsx
   git commit -m "[claude] corrige el calculo de avance en Kaizen"
   ```
   El prefijo `[claude]` / `[codex]` no es decorativo: de ahi sale la autoria en el ledger.
4. **Decision de arquitectura o producto** -> a `DECISIONES.md`, con el por que y lo
   descartado. Sin eso, el otro agente la revierte sin saberlo.

---

## 4. Cierre de turno (obligatorio, aunque no hayas terminado)

```powershell
powershell -File .copiloto/bin/cerrar.ps1 -Agente claude `
  -Hice "Unifique el calculo de ProbocaCoins" `
  -Siguiente "Migrar src/app/(app)/entrenamientos/page.tsx: la query de la linea 34 usa Idea.points, que ya no existe"
```

Actualiza tu estado, escribe la bitacora, suelta tu lock y commitea **solo la bitacora**.
Tu codigo lo commiteas tu, a proposito.

**`-Siguiente` es la pieza mas importante del sistema.** Tiene que ser ejecutable por el otro
agente sin contexto previo: archivo, funcion o linea, y que se espera lograr. "Seguir con el
frontend" no sirve.

---

## 5. Si un agente quedo parado a la mitad

`inicio.ps1` y despues, en este orden:

1. `ESTADO-<agente>.md` -> `Siguiente paso` dice literalmente donde continuar.
2. `git status` en **su** worktree -> los archivos tocados son el trabajo a medias.
3. `git diff` -> que se alcanzo a cambiar.
4. `eventos.jsonl` -> el ultimo hito registrado.
5. `BITACORA.md` -> el por que, si el diff no se explica solo.

Si el trabajo a medias esta roto: `git stash` (guarda sin perder) o
`git checkout -- <archivo>` (descarta ese archivo). **Nunca `git reset --hard`** sin permiso
explicito del usuario: eso borra trabajo ajeno de forma irreversible.

---

## 6. Antes de entregar

Lo que ya manda `CLAUDE.md`, que este protocolo no cambia:

```powershell
pnpm exec tsc --noEmit
pnpm run build:vercel
```

Y ademas:
- Cambios de base de datos: **los dos** esquemas Prisma (`schema.prisma` y
  `schema.production.prisma`), migracion local primero.
- No borrar `src/app/calculadora-pollos/`: es una carpeta no versionada a proposito.
- Produccion se despliega desde `main` en Vercel. No publiques sin que el usuario lo pida.

---

## 7. Cada worktree es una instalacion aparte

Son carpetas independientes: cada una necesita su `pnpm install`, su `.env` y su
`prisma/dev.db`. No se comparten y no deben commitearse.

Al crear un worktree nuevo:
```powershell
git worktree add ../propex-<agente> -b <agente>/<tema>
cd ../propex-<agente>
pnpm install
# copia el .env desde otro worktree y regenera la base con pnpm run db:push
```

---

## 8. Si cambias esta capa

`.copiloto/` viaja versionado, asi que un cambio aqui llega al otro agente **cuando las
ramas se sincronizan**, no al instante. Si arreglas algo del protocolo, avisale al usuario
para que se propague a las dos ramas.

Los hooks son la excepcion: viven en el `.git` comun y aplican a todos los worktrees de
inmediato. Si editas `.copiloto/hooks/`, corre `instalar-hooks.ps1` para que surta efecto.
