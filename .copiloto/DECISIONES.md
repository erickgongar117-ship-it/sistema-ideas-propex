# DECISIONES

Decisiones vigentes de arquitectura y proceso. **Antes de revertir algo que te parece raro,
busca aqui si fue deliberado.** Si tomas una decision nueva, agregala arriba con su por que
y las alternativas descartadas.

---

## D-005 — Que se versiona y que no
**Fecha:** 2026-08-15 · **Quien:** usuario · **Estado:** vigente

**Si van al repo:** codigo, scripts de tooling, documentacion en texto (`.md`), imagenes
fuente del manual, carteles QR de Microsoft Forms y la migracion a Power Platform.

**No van al repo:**
- `Manual_de_Usuario_e_Instructivo_PROpEx.docx` y `Capacitacion_PROpEx_Flujo_y_Roles.pptx`:
  son **generados** por `build_manual_propex.py`, que si esta versionado. Se reconstruyen.
- Artefactos de build, trabajo temporal y salidas de herramientas.
- `propex-interno-sites/`: es otro proyecto con su propio git.
- `src/app/calculadora-pollos/`: no versionada a proposito (ver `CLAUDE.md`).

El criterio para los binarios: git guarda una copia completa de cada version. Un `.docx` de
652 KB reeditado veinte veces son ~13 MB permanentes en el historial, y eso no se deshace
facil. Con texto no pasa, porque git guarda solo las diferencias.

Alternativa descartada: versionar todo. Comodo al principio, caro para siempre.

---

## D-004 — El cierre de turno no commitea codigo
**Fecha:** 2026-08-13 · **Quien:** claude · **Estado:** vigente

`cerrar.ps1` solo commitea `.copiloto/BITACORA.md`. Los commits de codigo los hace cada
agente con rutas explicitas.

Alternativa descartada: `git add -A` al cerrar. En este repo conviven varios frentes y al
momento de instalar esto habia 50 archivos sin commitear; un barrido automatico se llevaria
trabajo ajeno, que es justo lo que prohibe `CLAUDE.md`.

---

## D-003 — El estado vivo se guarda en `.git/copiloto/`, no en el proyecto
**Fecha:** 2026-08-13 · **Quien:** claude · **Estado:** vigente

Ledger, locks y estado por agente viven en el directorio `.git` comun.

Por que: los archivos ignorados por git **no se comparten entre worktrees**. Un ledger
dentro del arbol de trabajo seria invisible para el otro agente, que es exactamente lo que
esta capa intenta resolver. `.git/` es comun a todos los worktrees.

Consecuencia: ese estado **no viaja a GitHub**. Es correcto — es estado de maquina local, no
historia del proyecto. Lo que si debe perdurar va en `BITACORA.md`, que si esta versionado.

---

## D-006 — Una sola carpeta, los dos agentes por turnos
**Fecha:** 2026-08-15 · **Quien:** usuario · **Estado:** vigente · **Reemplaza a:** D-002

Todo el trabajo ocurre en `Documentos\proboca ideas de mejora`. No hay carpeta por agente.

Por que: el worktree de Claude desaparecio durante una reorganizacion del Escritorio, y esa
fragilidad no compensaba. El usuario piensa el proyecto como **una carpeta**, y forzar dos
solo reintroducia la dispersion que acabamos de limpiar. El trabajo en paralelo no era una
necesidad real: los turnos alcanzan.

Consecuencia: los agentes no pueden trabajar a la vez. El lock deja de ser una formalidad y
pasa a ser lo que evita que dos editen el mismo archivo. La rama `claude/al-dia` sigue viva
en GitHub por si algun dia se retoma el paralelismo.

---

## D-002 — Un worktree y una rama por agente
**Fecha:** julio 2026 · **Quien:** usuario · **Estado:** SUPERADA por D-006

Codex trabajaba en `Documentos\proboca ideas de mejora` y Claude en
`Escritorio\propex-claude`, carpetas separadas con un solo historial. Se abandono el
2026-08-15.

---

## D-001 — Las copias sueltas del proyecto se archivan
**Fecha:** 2026-08-13 · **Quien:** usuario · **Estado:** vigente

Existian tres carpetas del proyecto sin conexion a este repo, todas un mes atrasadas. Se
archivaron fuera de la ruta de trabajo.

Por que: eran la causa de que el trabajo se dispersara y de que fuera imposible saber cual
version era la buena. **El proyecto es este repo y solo este repo.**
