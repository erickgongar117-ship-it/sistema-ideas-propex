# Protocolo de trabajo compartido — Codex + Claude

Como se coordinan los agentes. **Las reglas de producto, permisos y despliegue estan en
`CLAUDE.md`**, no aqui; este archivo no las repite ni las sustituye. Si algo choca, manda
`CLAUDE.md` para el *que* del producto y este archivo para el *como* del trabajo conjunto.

---

## 0. Como esta armado esto

**Una sola carpeta, los dos agentes por turnos:**
`C:\Users\erick\OneDrive\Documentos\proboca ideas de mejora`

No hay carpetas separadas por agente. Quien tiene el turno trabaja aqui, sobre la rama del
tema en curso (`codex/<tema>` o `claude/<tema>`, segun quien la abrio). El turno se toma y se
cierra de forma explicita, y de eso se encargan los scripts de esta carpeta.

Como comparten el arbol de trabajo, **no pueden trabajar a la vez**: el lock no es una
formalidad, es lo que evita que dos agentes editen el mismo archivo al mismo tiempo.

Cinco niveles de memoria:

| Nivel | Donde | Que guarda |
|---|---|---|
| Hechos | `.git/` | Que cambio, quien y cuando. Reversible |
| Reflejo | `.git/copiloto/eventos.jsonl` | Ledger automatico de cada commit |
| Turno | `.git/copiloto/ESTADO-<agente>.md` | La foto del ahora de cada agente |
| Memoria | `.copiloto/BITACORA.md` | El *por que*. Versionado, viaja a GitHub |
| Reglas | este archivo + `CLAUDE.md` | Como jugamos |

**Por que el estado vivo esta en `.git/copiloto/` y no en el proyecto:** ahi no lo arrastra
un cambio de rama ni lo pisa un `git checkout`, y no ensucia `git status`. Ademas sigue
funcionando tal cual si algun dia se vuelve a montar un worktree aparte, porque `.git/` es
comun a todos.

---

## 1. Regla de oro

**Un solo agente escribe a la vez.** Antes de tocar archivos, lee el estado del otro. Si
alguien tiene un lock sobre lo que ibas a tocar, avisa; no asumas.

---

## 2. Arranque de turno (obligatorio, sin excepciones)

```powershell
powershell -File .copiloto/bin/inicio.ps1
```

Muestra: rama actual, el estado con que cerro cada agente, locks vigentes, cambios sin
commitear, ultimos 12 eventos y ultimos commits.

Reglas de lectura:
- **Lock vigente de otro agente** -> avisale al usuario antes de seguir.
- **Cambios sin commitear que no son tuyos** -> no los pises ni los borres. Pregunta.
- **Estas en la rama que no toca** -> confirma con el usuario antes de cambiarte. Cambiar de
  rama con trabajo a medias en el arbol es la forma mas facil de enredar todo.

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

## 7. Cuidado al cambiar de rama

`.env` y `prisma/dev.db` estan fuera de git, asi que **no cambian al hacer `git switch`**.
Si dos ramas necesitan variables o un esquema distinto, te quedas con los de la rama
anterior y la app falla de formas que no parecen tener sentido. Ante un error raro justo
despues de cambiar de rama, sospecha de esto antes que del codigo.

Si algun dia hace falta trabajo en paralelo de verdad, la salida no es copiar la carpeta —
eso fue lo que genero cinco copias del proyecto en agosto de 2026. Es un worktree:

```powershell
git worktree add ../propex-<tema> -b <agente>/<tema>
cd ../propex-<tema>
pnpm install          # cada worktree es una instalacion aparte
# copia el .env y regenera la base con pnpm run db:push
```

Toda esta capa sigue funcionando igual en ese caso, porque el estado vivo esta en el `.git`
comun. Solo recuerda que un worktree se borra con `git worktree remove`, no arrastrando la
carpeta a la papelera; si desaparece por fuera, se limpia con `git worktree prune`.

---

## 8. Si cambias esta capa

`.copiloto/` viaja versionado, asi que un cambio aqui llega al otro agente **cuando las
ramas se sincronizan**, no al instante. Si arreglas algo del protocolo, avisale al usuario
para que se propague a las dos ramas.

Los hooks son la excepcion: viven en el `.git` comun y aplican a todos los worktrees de
inmediato. Si editas `.copiloto/hooks/`, corre `instalar-hooks.ps1` para que surta efecto.
