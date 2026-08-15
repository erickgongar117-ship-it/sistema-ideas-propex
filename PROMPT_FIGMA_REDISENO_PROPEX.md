# Prompt para Figma / Codex: rediseño premium PROpEx

Actua como diseñador senior de producto, director de arte digital e ingeniero frontend especializado en dashboards industriales premium. Necesito rediseñar e implementar la plataforma web PROpEx / Ideas de Mejora de Proboca para que se sienta moderna, ejecutiva, espectacular y lista para presentarse a Direccion, sin perder claridad operativa para planta.

## Contexto del proyecto

El sistema es una plataforma interna de mejora continua para Proboca. Incluye captura y seguimiento de Ideas de Mejora, Proyectos Kaizen, Recorridos GENBA, validaciones por areas, reportes, QR por area, notificaciones y tablero directivo.

La experiencia debe responder siempre:

- Que paso.
- Que requiere atencion.
- Quien es responsable.
- Cual es el siguiente paso.
- Cual es el impacto operativo.

## Objetivo visual

Crear una interfaz con sensacion premium, moderna y con profundidad visual tipo 3D, pero profesional e industrial. Debe sentirse como un centro de comando ejecutivo para mejora continua, no como una plantilla SaaS generica.

Debe incluir:

- Tema claro y tema oscuro seleccionables.
- Dashboards espectaculares pero accionables.
- Profundidad visual con capas, sombras precisas, glass sutil, perspectiva, microinteracciones y elementos 3D ligeros.
- Animaciones breves para cambios de estado, filtros, actualizacion de metricas y transiciones entre vistas.
- Layout responsive para escritorio, tablet y movil.
- Alta legibilidad, foco visible, contraste suficiente y controles tactiles.

## Identidad Proboca

Usar como base:

- Rojo Proboca: `#EA0029` para marca, seleccion y acciones primarias.
- Neutros: blanco, grafito, negro y grises.
- Departamentos:
  - Supervisor: verde.
  - Calidad: rojo.
  - Seguridad: gris.
  - Mantenimiento: azul.
  - Mejora Continua / Administracion: negro.

No reinterpretar logos ni activos oficiales. El diseño debe complementar la marca, no competir con ella.

## Direccion de diseño

Diseñar un sistema visual con:

- Navegacion lateral compacta y elegante.
- Top bar con busqueda, filtros globales, selector de periodo, selector claro/oscuro y perfil.
- Tarjetas KPI con meta, variacion, tendencia, estado, responsable y acceso al detalle.
- Tablas densas y faciles de escanear.
- Panel lateral para detalle rapido de una idea, proyecto o hallazgo.
- Graficas interactivas con tooltip, leyenda, unidad, rango temporal y estado vacio.
- Estados de carga, sin datos, error y datos extensos.
- Iconografia tipo Lucide.
- Bordes sobrios, maximo 8px en tarjetas y controles.
- Tipografia compacta, cifras tabulares y jerarquia clara.

Evitar:

- Exceso de gradientes decorativos.
- Tarjetas dentro de tarjetas.
- Heroes de marketing.
- Fondos genericos.
- Paletas dominadas por un solo color.
- Graficas bonitas que no ayuden a decidir.

## Vistas clave a diseñar

1. Inicio / Hoy
   - Pendientes urgentes.
   - Acciones requeridas por rol.
   - Alertas agrupadas por impacto.
   - Resumen de ideas, Kaizen y GENBA.

2. Dashboard directivo
   - Flujo de Ideas desde captura hasta cierre.
   - Antiguedad por etapa.
   - Cumplimiento SLA.
   - Participacion por area.
   - Impacto SQDCM.
   - Tendencia mensual.
   - Vista ejecutiva de portafolio conectando Ideas, Kaizen y GENBA.

3. Ideas de Mejora
   - Bandeja filtrable.
   - Estado, responsable, vencimiento, impacto y evidencia.
   - Detalle rapido en panel lateral.
   - Acciones visibles solo cuando el rol lo permita.

4. Kaizen
   - Salud del proyecto.
   - Planeado contra real.
   - Hitos, riesgos, bloqueos y proximos compromisos.
   - Ahorro estimado contra real.
   - Gantt.
   - Matriz impacto-esfuerzo.

5. GENBA
   - Asistencia semanal.
   - Hallazgos abiertos y vencidos.
   - Tiempo de cierre.
   - Recurrencia.
   - Mapa de calor por area y categoria.
   - Conversion de hallazgo GENBA a Kaizen.

6. Captura por QR
   - Experiencia simple para operador.
   - Formulario claro, rapido y mobile-first.
   - Confirmacion con folio.
   - Subida de evidencia visual.

## Tema claro

Debe sentirse limpio, operativo y ejecutivo:

- Fondo principal blanco o gris muy claro.
- Superficies con sombras suaves y bordes sutiles.
- Rojo Proboca como acento principal.
- Graficas con colores funcionales, no decorativos.
- Alto contraste en texto y estados.

## Tema oscuro

Debe sentirse como centro de comando premium:

- Fondo grafito/negro con profundidad.
- Superficies oscuras diferenciadas por elevacion.
- Rojo Proboca como energia visual controlada.
- Graficas luminosas pero sobrias.
- Evitar saturacion excesiva o apariencia gamer.

## Efecto 3D / espectacular

Incluir una capa visual moderna sin afectar el rendimiento:

- Header o fondo de dashboard con una escena abstracta industrial sutil en 3D.
- Tarjetas KPI con profundidad por elevacion y parallax ligero.
- Graficas con contenedores de profundidad controlada.
- Microinteracciones al filtrar, expandir y seleccionar.
- Animaciones de entrada breves y elegantes.

Si se implementa en codigo, usar Three.js solo para una escena ligera y decorativa/explicativa; el contenido operativo debe seguir siendo HTML accesible.

## Requisitos funcionales

No cambiar permisos, estados ni flujo de negocio existente. El rediseño debe respetar:

- Roles y modulos visibles por usuario.
- Trazabilidad.
- Evidencias.
- Responsables.
- Fechas compromiso.
- Estados de validacion.
- Exportaciones y reportes.

## Entregable esperado en Figma

Crear:

- Sistema de diseño con variables para claro/oscuro.
- Tokens de color, texto, espaciado, radio, sombra y elevacion.
- Componentes: sidebar, topbar, KPI, tabla, filtro, tabs, panel lateral, modal, status pill, timeline, chart card, empty state, loading state.
- Pantallas desktop principales.
- Version movil de captura QR e inicio.
- Prototipo navegable entre Inicio, Dashboard, Ideas, Kaizen, GENBA y Captura QR.

## Entregable esperado en Codex

Implementar el rediseño en la rama principal del proyecto respetando el codigo actual:

- Revisar primero estructura, componentes existentes y estilos globales.
- Reutilizar componentes actuales cuando tenga sentido.
- Agregar selector de tema claro/oscuro persistente.
- Crear componentes compartidos para layout, metricas, visualizaciones y paneles.
- Mantener datos reales y flujos existentes.
- Verificar en escritorio y movil.
- Probar compilacion y comportamiento.

El resultado debe sentirse como la version premium y definitiva de PROpEx: moderno, profundo, claro, accionable y digno de mostrarse a Direccion.
