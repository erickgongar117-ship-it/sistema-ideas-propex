# Estado de ejecución de la transferencia

Fecha de revisión: 2026-08-11 (America/Mexico_City).

## Recursos creados en Microsoft Power Platform

- Tenant/entorno visible: `Productora de Bocados Carnicos (default)`.
- Environment ID: `Default-13d7b4d5-f143-4eb2-88e5-2d90d35bb5c5`.
- Publicador: `Proboca`.
- Nombre único del publicador: `ProbocaPublisher`.
- Prefijo: `pbx`.
- Prefijo numérico de Choices: `73120`.
- Solution no administrada: `PROpEx - Mejora Continua`.
- Nombre único: `PROpEx`.
- Versión inicial: `1.0.0.0`.
- Solution ID: `835eac12-9a95-f111-8075-000d3a3b4db4`.
- La Solution quedó seleccionada como solución preferida.

No se modificaron aplicaciones ni datos existentes del entorno.

## Control de acceso detectado

La cuenta autenticada puede crear publicadores, Solutions y aplicaciones, pero Power Apps muestra:

> Uno o más comandos no están disponibles debido a sus privilegios actuales para este entorno.

Dentro de la Solution, el comando `Nuevo > Tabla` aparece deshabilitado. Esto impide crear el modelo Dataverse, relaciones, Choices, claves y roles necesarios.

Para continuar, un administrador de Power Platform/Dataverse debe asignar temporalmente a **Erick Osvaldo Góngora Garza** uno de estos roles en el ambiente indicado:

1. **System Customizer / Personalizador del sistema** — recomendado para construir componentes; o
2. **System Administrator / Administrador del sistema** — sólo si también administrará seguridad, usuarios y configuración del ambiente.

El rol debe asignarse en Dataverse, no basta con una licencia de Microsoft 365 ni con Environment Maker. Después de construir y desplegar, se debe retirar el rol elevado y operar con roles PROpEx de mínimo privilegio.

## Intento de entorno piloto

Con autorización del propietario, se intentó crear un entorno separado con esta configuración:

- Nombre: `PROpEx - Piloto`.
- Tipo: Sandbox / espacio aislado.
- Región: Estados Unidos, predeterminada del inquilino.
- Dataverse: sí.
- Idioma: español.
- Divisa: MXN.
- Dynamics 365, datos de ejemplo, primera versión y pago por uso: desactivados.
- Grupo de seguridad: ninguno de forma temporal; no existe un grupo `PROpEx` disponible.

Microsoft rechazó la creación antes de aprovisionar recursos con el mensaje:

> Este entorno no se puede crear porque su organización (inquilino) necesita al menos 1 GB de capacidad de base de datos.

La página de capacidad también indica que la cuenta actual no puede ver el resumen porque no es administradora del inquilino, Power Platform ni Dynamics 365. No se creó ningún entorno, no se consumió capacidad y no se habilitó facturación ni pago por uso.

## Exportaciones verificadas

### Ensayo local

- Fuente: SQLite local.
- Conjuntos: 31.
- Filas: 3,552.
- Hashes incorrectos: 0.
- Contraseñas/hashes incluidos: 0.

### Producción

- Fuente: PostgreSQL configurado en Vercel.
- Conjuntos: 31.
- Filas: 391.
- Hashes incorrectos: 0.
- Contraseñas/hashes incluidos: 0.

Las exportaciones contienen información personal y operativa; permanecen bajo `power-platform-migration/export/`, carpeta ignorada por Git. Ningún archivo de datos se ha transmitido a Microsoft porque todavía no existe el esquema destino.

## Piloto Power Automate sin Dataverse

La cuenta `erick.gongora@proboca.net` sí puede crear flujos de nube en el entorno predeterminado. Se creó y activó:

- Nombre: `PROpEx - Piloto captura por correo`.
- Flow ID: `81e681a3-8766-4b9d-914f-6ff1339cdf08`.
- Tipo: automatizado, fuera de la Solution Dataverse.
- Conectores: Office 365 Outlook y OneDrive para la Empresa; ambos estándar.
- Disparador: correo nuevo en Inbox.
- Guarda: el asunto debe comenzar exactamente con `[PROPEX-IDEA]`.
- Folio: `IM-yyyyMMdd-HHmmss-xxxxxxxx`.
- Salida: archivo HTML en la raíz de OneDrive con remitente, asunto, contenido y folio.
- Confirmación: correo al remitente con el mismo folio.
- Estado verificado: `Activado`; comprobador de flujo con cero errores y cero advertencias.

No se envió un correo de prueba controlado. Antes de guardar el filtro en el disparador, un correo ordinario activó una ejecución de 439 ms; la condición interna tomó la rama `False`, por lo que `Crear archivo` y `Enviar correo electrónico` quedaron omitidos. Después se guardó el filtro `[PROPEX-IDEA]` en el propio disparador y se confirmó nuevamente el estado `Activado`. El historial de ejecución no sustituye un registro de negocio permanente.

La alternativa completa queda definida en `06-power-automate-only.md`, `07-sharepoint-data-model.md` y `08-m365-experience-without-powerapps.md`.

### Integración visual de prueba en PROpEx

Se añadió a `/reportes` un panel informativo controlado por `POWER_AUTOMATE_PILOT_ENABLED`. El panel:

- se muestra sólo a `ADMIN` y `MEJORA_CONTINUA`;
- presenta el estado honesto `Activado · prueba pendiente`;
- identifica el alcance como `Piloto Microsoft 365 · No oficial`;
- oculta Flow ID y enlace técnico a Mejora Continua; sólo ADMIN puede abrirlos;
- declara explícitamente que no crea ni modifica Ideas, aprobaciones o ProbocaCoins.

La bandera permanece ausente/apagada en `Production`. Se creó únicamente una vista previa de Vercel para revisión, sin promoverla al dominio productivo:

`https://sistema-ideas-propex-ebq4v73u7-erickgongar117-5366s-projects.vercel.app`

El 11 de agosto de 2026 a las 14:18 (hora de Ciudad de México) se ejecutó una prueba controlada no oficial con correlación `CODEX-CONTROLADA-20260811-1216`:

- ejecución Power Automate: `Correcto`, duración total 3 segundos;
- disparador Outlook: `Correcto`, 0.2 segundos;
- inicialización de folio: `Correcto`, 0.2 segundos;
- condición: rama `True`, `Correcto`;
- archivo OneDrive: `Correcto`, 1.3 segundos;
- confirmación Outlook: `Correcto`, 0.7 segundos;
- folio confirmado por correo: `IM-20260811-201837-3b3da280`;
- nombre esperado del archivo: `IM-20260811-201837-3b3da280.html`.

Esta evidencia permite usar el estado `VERIFIED` sólo en el entorno `Preview`; no autoriza el flujo para operación oficial ni modifica la bandera de `Production`.

## Próxima acción segura

1. Otorgar `System Customizer` en el entorno.
2. Confirmar que `Nuevo > Tabla` está habilitado dentro de la Solution `PROpEx`.
3. Crear primero Choices, tablas, relaciones y claves alternas.
4. Ejecutar pruebas de seguridad y concurrencia antes de cargar datos.
5. Cargar un subconjunto piloto; no cargar producción completa hasta conciliar folios, actores y ProbocaCoins.
