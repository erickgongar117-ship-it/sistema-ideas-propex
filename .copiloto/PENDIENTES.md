# PENDIENTES

Backlog compartido. Cada punto con dueño: `usuario`, `claude`, `codex` o `cualquiera`.
Al terminar uno, marcalo `[x]` con la fecha; no lo borres.

## Higiene del repo (detectado el 2026-08-13)

- [ ] **cualquiera** — El `.gitignore` se quedo corto: aparecen como pendientes los manuales
      (`.docx`, `.pptx`), `PROPEX_SOURCE_SNAPSHOT.zip`, `EXTRACCION_TECNICA_COMPLETA_PROPEX.md`,
      y las carpetas `.next-empty-rebuild/`, `.next-stale-integration/`, `tmp/`, `outputs/`,
      `.propex_excel_work/`, `.qa_manual/`. Eso esconde el codigo que si falta commitear.
      Decidir con el usuario que se versiona y que se ignora.

- [ ] **usuario** — Aclarar que es la carpeta `sistema-ideas-propex/` **dentro** del repo, sin
      rastrear. Se llama igual que el repo de GitHub: podria ser un clon anidado por accidente.
      No tocarla hasta confirmarlo.

- [ ] **cualquiera** — Hay codigo real sin commitear que conviene guardar: `automation-pilot.ts`,
      `operations-workboard.tsx`, `automation-pilot-panel.tsx`, el modulo
      `configuracion/migracion-2026/` y varios scripts de importacion. Revisar si ya funcionan
      y commitearlos con rutas explicitas.

- [ ] **cualquiera** — `CLAUDE.md` estaba sin versionar pese a ser la memoria compartida del
      proyecto. Quedo commiteado el 2026-08-13; verificar que sigue al dia.

## Riesgos conocidos

- [ ] **usuario** — El repo vive dentro de OneDrive. OneDrive sincroniza `.git` archivo por
      archivo y con dos agentes escribiendo puede generar copias en conflicto. Hasta hoy no ha
      dado problemas, pero si aparecen archivos raros dentro de `.git`, esta es la causa.
      Mitigacion real: subir siempre a GitHub, que es el respaldo que si sirve.
