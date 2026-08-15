# BITACORA — memoria larga

Append-only. Lo nuevo se agrega **arriba**. Aqui va el *por que*; el *que* ya lo guarda git.

---

## 2026-08-13 — claude — Se instalo la capa de coordinacion entre agentes

El repo ya tenia lo mas dificil desde julio: historial en GitHub, rama por agente y un
worktree para cada uno. Lo que faltaba era el estado compartido — ninguno de los dos agentes
podia saber que estaba haciendo el otro ni en que paso habia quedado.

Se agrego `.copiloto/` con protocolo, bitacora, decisiones, pendientes y scripts de turno.
El estado vivo (ledger, locks y el estado de cada agente) se puso en `.git/copiloto/`, no
dentro del proyecto, **porque los archivos ignorados no se comparten entre worktrees**: un
ledger en `src/` seria invisible para el otro agente. `.git/` si es comun a todos.

El hook `post-commit` quedo en el `.git` comun, asi que registra los commits de los dos
worktrees automaticamente.

Un ajuste deliberado respecto a la version generica del protocolo: `cerrar.ps1` **no hace
`git add -A`**. En este repo conviven varios frentes de trabajo y habia 50 archivos sin
commitear; un cierre de turno que barriera todo se llevaria trabajo ajeno, justo lo que
`CLAUDE.md` prohibe. Solo commitea su propia bitacora.

Contexto de como se llego aqui: existian ademas tres copias sueltas del proyecto (dos en el
Escritorio, del 12 y 13 de julio, y una tercera derivada de ellas). Ninguna estaba conectada
a este repo y todas estaban un mes atrasadas. Se archivaron para que dejaran de competir con
el repo real.

---
