# BITACORA — memoria larga

Append-only. Lo nuevo se agrega **arriba**. Aqui va el *por que*; el *que* ya lo guarda git.

---

## 2026-08-15 -- claude (claude/al-dia) -- Instale la capa de coordinacion .copiloto en el repo real, adaptada a worktrees; rehice la rama de Claude desde la rama viva de Codex; archive las tres copias huerfanas.

Por que: El repo ya tenia worktree y rama por agente desde julio; lo que faltaba era estado compartido para saber que hace el otro y como retomarlo.

Siguiente paso dejado: Revisar con el usuario los 3 puntos de higiene de .copiloto/PENDIENTES.md, en orden: (1) que es la carpeta sistema-ideas-propex/ sin rastrear dentro del repo de Codex, (2) ampliar el .gitignore para que los manuales .docx/.pptx, el PROPEX_SOURCE_SNAPSHOT.zip y las carpetas .next-*/tmp/outputs dejen de aparecer como pendientes, (3) commitear el codigo real que quedo suelto: src/lib/automation-pilot.ts, src/components/operations-workboard.tsx, src/components/automation-pilot-panel.tsx y src/app/(app)/configuracion/migracion-2026/. NO usar git add -A.

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
