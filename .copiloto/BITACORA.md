# BITACORA — memoria larga

Append-only. Lo nuevo se agrega **arriba**. Aqui va el *por que*; el *que* ya lo guarda git.

---

## 2026-08-15 -- claude (codex/hierarchy-training-coins) -- Integre el benchmark como capitulo de gestion visual con 9 fuentes verificadas y medi el contraste de los 11 colores de estado

Siguiente paso dejado: Codex: ejecutar P0-9 y P0-10 en src/components/operations-workboard.tsx:84-94 y globals.css:976 (fondo claro + texto oscuro, negritas e icono en vencido); despues P1-5 unificando StatusPill como unico componente de estado con las cinco categorias en src/lib/domain.ts

---

## 2026-08-15 -- claude (codex/hierarchy-training-coins) -- Audite el flujo y diseno integral de PROpEx y documente el rediseno recomendado

Siguiente paso dejado: Codex debe leer AUDITORIA_UX_CLAUDE.md, contrastar las recomendaciones con el codigo y ejecutar primero los P0 reutilizando el workboard actual

---

## 2026-08-15 -- codex (codex/hierarchy-training-coins) -- Rediseñé la navegación global, los tableros de Ideas/Kaizen/GENBA y el panorama ejecutivo con BI interactivo, filtros persistentes, lectura de riesgos, responsive y accesibilidad. Validé tsc, build:vercel y vistas 390x844/1440x900; commit b9852ef.

Siguiente paso dejado: En src/app/(app)/probocacoins/page.tsx, unificar visualmente el libro mayor, añadir conciliación/eliminación controlada de duplicados y aplicar el mismo patrón de tablero; después revisar expedientes src/app/(app)/kaizen/[id] y src/app/(app)/genba/[id] con pestañas compactas.

---

## 2026-08-15 -- claude (codex/hierarchy-training-coins) -- Verifique compatibilidad entre agentes sin tocar codigo: worktree y carpeta principal en el mismo commit 276df55, tsc --noEmit y pnpm build en verde con las rutas nuevas de Codex (/entrenamientos, /probocacoins). AGENTS.md y CLAUDE.md alineados.

Siguiente paso dejado: Codex: arranca con .copiloto/bin/inicio.ps1 y toma tu lock antes de editar. El repo esta limpio en 276df55; no hay trabajo a medias. Si vas a publicar, falta correr pnpm run build:vercel (regenera despues el cliente local con pnpm exec prisma generate).

Bloqueo: Ninguno. Ojo: el servidor next dev quedo apagado a proposito; con el encendido prisma generate falla con EPERM y no se puede compilar.

---

## 2026-08-15 -- claude (codex/hierarchy-training-coins) -- Revise y commitee los 19 archivos que Codex tenia sin guardar: piloto de Power Automate por un lado, entrenamientos/ProbocaCoins y los command centers por otro. Verificado con tsc --noEmit y pnpm build.

Por que: Con trabajo ajeno suelto en el arbol, cualquier cambio nuevo se mezclaba con el suyo y despues no habia forma limpia de separarlos.

Siguiente paso dejado: El arbol esta limpio y se puede trabajar de cero. Si vas a experimentar, abre una rama con 'git switch -c claude/<tema>'. Pendiente sin urgencia: propex-interno-sites (Documentos\propex-interno-sites) no tiene remoto y existe solo en esta maquina.

---

## 2026-08-15 -- claude (codex/hierarchy-training-coins) -- Reorganice el montaje a carpeta unica por turnos tras desaparecer el worktree de Claude; verifique que nada se perdio y actualice protocolo, CLAUDE.md, AGENTS.md y los scripts.

Por que: El worktree se esfumo en una reorganizacion del Escritorio; esa fragilidad no compensaba y el usuario piensa el proyecto como una sola carpeta.

Siguiente paso dejado: Nada bloqueante. Cuando retomes: los 19 archivos modificados aqui son trabajo en curso de Codex, hay que commitearlos o descartarlos con rutas explicitas para dejar el arbol limpio. Y propex-interno-sites (Documentos\propex-interno-sites) no tiene remoto: su ultimo commit es del 17 de julio y existe solo en esta maquina.

---

## 2026-08-15 -- claude (codex/hierarchy-training-coins) -- Limpie el repo: archive el clon anidado, amplie el .gitignore, rescate el codigo y la documentacion sueltos, y saque propex-interno-sites del proyecto. git status paso de 48 pendientes a solo los 19 de Codex.

Por que: Los 48 pendientes escondian el codigo que si faltaba guardar, y un git add -A habria intentado subir ~900 MB.

Siguiente paso dejado: Dos cosas, ninguna urgente: (1) los 19 archivos modificados en el worktree de Codex son trabajo en curso suyo, hay que commitearlos o descartarlos para dejar el arbol limpio; (2) propex-interno-sites, ahora en Documentos\propex-interno-sites, no tiene remoto y su ultimo commit es del 17 de julio: existe solo en esta maquina y conviene subirlo a un repo privado.

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
