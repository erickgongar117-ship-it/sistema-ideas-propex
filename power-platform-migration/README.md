# Migracion PROpEx a Microsoft Power Platform

Este directorio contiene el paquete controlado para transferir PROpEx a Microsoft Power Platform sin apagar la aplicacion actual hasta completar la validacion y el corte.

## Arquitectura objetivo

- **Dataverse:** sistema de registro, relaciones, auditoria y seguridad.
- **Power Apps model-driven:** aplicacion interna para operacion, administracion y repositorios.
- **Paginas personalizadas de Power Apps:** vistas `Hoy`, Kanban, Kaizen, GENBA y ProbocaCoins que requieren mayor control visual.
- **Power Pages:** captura publica y anonima desde los QR por area.
- **Power Automate:** aprobaciones, notificaciones, recordatorios, escalaciones e integraciones; no conserva el estado maestro ni calcula saldos por si solo.
- **SharePoint:** documentos y evidencias de gran volumen, referenciados desde Dataverse.
- **Power BI:** tableros operativos y ejecutivos.
- **Microsoft Entra ID:** identidad interna, grupos y acceso por rol.

## Ruta operativa sin Dataverse

Mientras no se obtengan `System Customizer` y capacidad Dataverse, el paquete incluye `PROpEx M365 Lite`: Power Automate como orquestador, Microsoft Forms o correo como captura, SharePoint/Microsoft Lists como registro temporal, OneDrive/SharePoint para evidencias y Outlook/Teams para avisos. Usa conectores estándar y evita Dataverse, HTTP, conectores personalizados y AI Builder.

Power Automate no se usa como base de datos. ProbocaCoins, folios secuenciales y otras operaciones que requieren atomicidad se consideran piloto controlado hasta que puedan trasladarse a Dataverse.

## Documentos del paquete

1. `00-solution-brief.md`: alcance funcional para crear la solucion.
2. `01-dataverse-model.md`: modelo de datos, seguridad y estrategia de migracion.
3. `02-power-automate-flows.md`: catalogo y especificacion de flujos.
4. `03-apps-pages-bi.md`: aplicaciones, portal publico, documentos y analitica.
5. `04-environment-and-cutover-runbook.md`: ambientes, despliegue, corte y reversa.
6. `05-current-status.md`: evidencia de ejecución, recursos creados y bloqueos reales.
7. `06-power-automate-only.md`: arquitectura y 20 flujos sin Dataverse/premium.
8. `07-sharepoint-data-model.md`: reemplazo temporal de los 31 modelos en Lists/SharePoint.
9. `08-m365-experience-without-powerapps.md`: experiencia M365 Lite sin Power Apps.

## Estado actual

- Inventario funcional y tecnico: en preparacion.
- Exportador local: implementado en `scripts/export-power-platform.ts`.
- Exportacion base local: 31 conjuntos, 3,552 filas, cero hashes incorrectos y cero contrasenas incluidas.
- Acceso al tenant de Microsoft: autenticado.
- Publicador `Proboca` (`pbx`) y Solution `PROpEx - Mejora Continua` creados.
- Construccion Dataverse: detenida de forma segura porque la cuenta no tiene `System Customizer`; `Nuevo > Tabla` aparece deshabilitado.
- Entorno piloto con Dataverse: no creado; Microsoft exige al menos 1 GB de capacidad de base de datos.
- Power Automate: acceso confirmado con la cuenta Proboca.
- Flujo `PROpEx - Piloto captura por correo`: creado y activado con Outlook y OneDrive, sin conectores premium.
- Aplicacion PROpEx vigente: permanece sin cambios y es el respaldo operativo.

## Exportacion de datos

```powershell
pnpm migration:export:power-platform -- --out power-platform-migration\export\local-baseline
```

La carpeta `power-platform-migration/export/` esta ignorada por Git porque contiene datos personales y operativos. Cada exportacion incluye un `manifest.json` con conteos y SHA-256 por archivo.
