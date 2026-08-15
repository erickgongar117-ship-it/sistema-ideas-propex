# PENDIENTES

Backlog compartido. Cada punto con dueño: `usuario`, `claude`, `codex` o `cualquiera`.
Al terminar uno, marcalo `[x]` con la fecha; no lo borres.

## Higiene del repo — cerrada el 2026-08-15

- [x] **2026-08-15** — `sistema-ideas-propex/` era un clon anidado del mismo repo, hecho el
      13 de agosto. Mismo remoto, cero commits propios, solo un `.vscode/launch.json` con la
      plantilla por defecto. Archivado en `C:\archivo\propex-copias-2026-08-15\clon-anidado-13ago`.

- [x] **2026-08-15** — `.gitignore` ampliado. `git status` mostraba 48 pendientes y escondia
      el codigo que si faltaba guardar. Se ignoraron artefactos de build (`.next-*/`), trabajo
      temporal (`tmp/`, `outputs/`, `.propex_excel_work/`, `.qa_manual/`), la instantanea
      redundante `PROPEX_SOURCE_SNAPSHOT.zip`, los volcados `*.inspect.ndjson`, el repo anidado
      `propex-interno-sites/` y `src/app/calculadora-pollos/` (no versionada a proposito segun
      `CLAUDE.md`).

- [x] **2026-08-15** — Codigo suelto rescatado y commiteado tras verificar `tsc --noEmit` sin
      errores: `automation-pilot.ts`, `operations-workboard.tsx`, `automation-pilot-panel.tsx`,
      `configuracion/migracion-2026/`, y los scripts de power platform, importacion de Excel,
      video de capacitacion y generacion del manual.

- [x] **2026-08-15** — Documentacion y entregables versionados: extraccion tecnica, guia de
      replica, prompt de Figma, fuentes del manual, carteles QR de Microsoft Forms y la
      migracion a Power Platform. Ver `D-005` para que quedo fuera y por que.

- [x] **2026-08-15** — `propex-interno-sites/` (repo git aparte, 737 MB) movido a
      `Documentos\propex-interno-sites`, fuera de este repo.

- [x] **2026-08-15** — `CLAUDE.md` estaba sin versionar pese a ser la memoria compartida.
      Quedo commiteado.

## Abiertos

- [ ] **usuario** — `propex-interno-sites` **no tiene remoto**: su ultimo commit es del 17 de
      julio y existe solo en esta maquina. Si el disco falla, se pierde. Vale la pena subirlo a
      un repo privado propio.

- [ ] **codex** — Quedan 19 archivos modificados sin commitear en el worktree de Codex
      (`dashboard`, `kaizen`, `genba`, `probocacoins`, `entrenamientos`, `seguimientos`,
      `reportes`, los command-centers, `app-shell`, `globals.css`, `package.json`, `README`,
      `DEPLOYMENT`). Son trabajo en curso suyo; nadie mas los toca. Conviene commitearlos o
      descartarlos para que el arbol quede limpio.

## Riesgos conocidos

- [ ] **usuario** — El repo vive dentro de OneDrive. OneDrive sincroniza `.git` archivo por
      archivo y con dos agentes escribiendo puede generar copias en conflicto. Hasta hoy no ha
      dado problemas. Mitigacion real: subir siempre a GitHub, que es el respaldo que si sirve.
