# PROpEx — instrucciones para Codex

Este repo lo trabajan **dos agentes por turnos en esta misma carpeta**: Codex (tu) y Claude.
Claude recibe estas mismas reglas via `CLAUDE.md`. Como comparten el arbol de trabajo, **no
pueden trabajar a la vez**: el lock es lo que evita que dos editen el mismo archivo.

## Antes de tocar cualquier archivo

```powershell
powershell -File .copiloto/bin/inicio.ps1
```

Te muestra en que rama estas, con que estado cerro Claude su ultimo turno, los locks
vigentes y el trabajo a medias. No es opcional.

## Lee tambien CLAUDE.md

**`CLAUDE.md` es la memoria de producto compartida**: objetivo del sistema, reglas de
permisos por rol, flujos de Ideas / Kaizen / GENBA, variables de entorno y reglas de
despliegue. Este archivo solo cubre la coordinacion entre agentes; las reglas del producto
estan alla y aplican igual para ti.

## Tu identidad en este repo

Eres `codex`. Firma todo asi:

```powershell
powershell -File .copiloto/bin/lock.ps1      -Agente codex -Areas "src/lib"
powershell -File .copiloto/bin/registrar.ps1 -Agente codex -Que "..." -Archivos "..."
powershell -File .copiloto/bin/cerrar.ps1    -Agente codex -Hice "..." -Siguiente "..."
```

Los commits llevan prefijo `[codex]`. De ahi sale la autoria en el ledger compartido.

## Cinco reglas que no se rompen

1. **Nunca `git add -A`.** Aqui conviven varios frentes: commitea con rutas explicitas o te
   llevas trabajo ajeno.
2. **Cambios sin commitear que no son tuyos: no los pises ni los borres.** Pregunta.
3. **Nunca `git reset --hard`** sin permiso explicito del usuario. Usa `git stash`.
4. **Antes de entregar:** `pnpm exec tsc --noEmit` y `pnpm run build:vercel`.
5. **Cambios de base de datos:** los dos esquemas Prisma, y migracion local primero.

## Al terminar (aunque no hayas acabado)

Corre `cerrar.ps1`. El parametro `-Siguiente` tiene que ser ejecutable por Claude sin
contexto previo: archivo, funcion o linea, y objetivo. "Seguir con el frontend" no sirve.

---

Protocolo completo, incluido como retomar un turno interrumpido:
**`.copiloto/PROTOCOLO.md`**
