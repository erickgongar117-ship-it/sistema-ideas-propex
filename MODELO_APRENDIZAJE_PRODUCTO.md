# Modelo de aprendizaje de producto PROpEx

Este documento convierte comentarios, rechazos y fricciones en mejoras medibles. No pretende
"entrenar" un modelo con opiniones ni declarar que el sistema es perfecto. Claude audita y
desafia; Codex implementa y verifica; las personas usuarias confirman o rechazan el resultado.

## Registro minimo de cada observacion

| Campo | Ejemplo |
|---|---|
| Origen | Prueba observada, entrevista, soporte, telemetria o simulacion |
| Rol | Operador, Supervisor, Validador, Lider Kaizen, MC, Admin o Direccion |
| Modulo | Ideas, Kaizen, GENBA, Entrenamientos, ProbocaCoins o Estructura |
| Tarea | Aprobar diez ideas |
| Resultado | Completada, abandonada, bloqueada o completada con ayuda |
| Motivo | Codigo de la taxonomia y comentario textual opcional |
| Severidad | 1 cosmetica, 2 molesta, 3 bloquea parcialmente, 4 impide trabajar |
| Duracion | Segundos hasta completar o abandonar |
| Version | Commit probado |
| Evidencia | Captura, video, pasos reproducibles o evento medido |

## Motivos normalizados

- `NO_ENCONTRE`: no vio la accion o informacion.
- `NO_ENTENDI`: el texto o flujo no fue claro.
- `MUCHOS_PASOS`: la tarea exige navegacion repetida.
- `NO_ME_DEJO`: el sistema nego la accion sin explicar como resolverla.
- `PERDI_DATOS`: un error borro o cambio informacion escrita.
- `NO_SE_QUIEN_SIGUE`: no se entiende responsable, fecha o siguiente paso.
- `NO_CONFIO`: estados, saldos o historiales parecen contradictorios.
- `SE_VE_SATURADO`: la jerarquia visual no permite decidir rapido.
- `FALLA_MOVIL`: desborde, toque pequeno, teclado incorrecto o lentitud.
- `NO_ME_AYUDA_A_DECIDIR`: muestra datos, pero no una accion util.

## Peso de la evidencia

- Simulacion por agente: `0.35`.
- Entrevista o comentario sin observacion: `0.70`.
- Telemetria reproducible: `0.90`.
- Prueba observada con tarea y tiempo: `1.00`.

Prioridad sugerida: `severidad x frecuencia x criticidad x confianza / esfuerzo`.
Una simulacion nunca puede presentarse como un hallazgo de campo.

## Personas y metas

| Persona | Tarea critica | Meta inicial |
|---|---|---|
| Operador con guantes | Capturar desde QR | P90 <= 90 s, toque >= 44 px, exito >= 90% |
| Operador sin correo | Corregir captura y usar numero corto | Cero datos perdidos, recuperacion <= 20 s |
| Supervisor saturado | Decidir diez ideas y registrar la propia | <= 2 min; idea propia llega a su jefe |
| Validador de soporte | Validar diez solicitudes | <= 3 min; fallos parciales identificados |
| Responsable ausente | Delegar pendientes | Cero elementos huerfanos fuera del SLA |
| Mejora Continua | Reactivar, clasificar y convertir a Kaizen | Trazabilidad 100%, <= 4 min |
| Lider Kaizen | Equipo, actividades, evidencia y cierre | Cierre final <= 60 s, avance correcto |
| Coordinador GENBA | Recorrido, acciones extra, combinacion y Kaizen | <= 6 min, origen siempre visible |
| Coordinador de entrenamiento | Inscribir 200 personas | <= 5 min, errores por persona |
| Administrador | Plantas, areas, rutas, cuentas y bajas | <= 5 min, ninguna ruta rota |
| Finanzas | Conciliar duplicado y verificar saldo | <= 2 min, contrapartida auditable |
| Direccion | Detectar salud y abrir el principal riesgo | Tres respuestas en 5 s, detalle <= 60 s |

## Ciclo iterativo Claude + Codex

1. Recopilar comentarios y evidencia con el registro minimo.
2. Claude ejecuta las 12 tareas como auditor adversarial en desktop y movil, sin editar.
3. Claude entrega tres fricciones prioritarias, referencias de codigo y una hipotesis medible.
4. Codex contrasta el hallazgo con permisos, dominio y datos; acepta, ajusta o rechaza con motivo.
5. Codex implementa un bloque pequeno, corre pruebas, build y revision visual.
6. Claude vuelve a revisar solo el cambio y busca regresiones o contradicciones.
7. Una persona real ejecuta la tarea; su resultado reemplaza la confianza simulada.
8. Se conserva puntuacion antes/despues, decision y siguiente experimento.

## Cinco rondas base

| Ronda | Riesgos que intenta encontrar | Criterio de salida |
|---|---|---|
| Captura | Perdida de texto, conceptos ambiguos, error sin foco | Cero perdida y >= 90% finalizacion |
| Decisiones | Abrir uno por uno, bandejas dispersas, lote opaco | Diez decisiones <= 2 min, fallo por folio |
| Traspasos | Sin permiso silencioso, ausencia, correo sin entrega | Cero pendientes huerfanos y causa visible |
| Proyectos | Cierre inconsistente, etapa revertida, evidencia oculta | 100% de transiciones validas y auditadas |
| Escala y estetica | Directorios lentos, duplicados, exceso de destinos | <= 7 destinos, respuesta util < 2 s |

## Protocolo de repeticion para Claude

Claude no cambia ni entrena permanentemente su modelo. En cada auditoria trabaja sobre el
commit actual y repite estas pasadas dentro de la misma sesion:

1. Mapa factual: rutas, permisos, estados, datos y contratos realmente verificados.
2. Pasada adversarial: concurrencia, doble clic, permisos revocados, fallos parciales y datos viejos.
3. Persona real: comentarios probables, motivos de abandono y pasos que exigirian ayuda.
4. Pasada visual: jerarquia, densidad, belleza util, movil, teclado, contraste y lectura a un metro.
5. Consistencia: elimina duplicados, corrige contradicciones y compara contra la ronda anterior.
6. Ronda adicional solo cuando aparezca un P0 o P1 que no estaba registrado.

Se detiene cuando dos pasadas consecutivas no descubren riesgos P0/P1 nuevos o al completar
seis pasadas. Cada entrega debe conservar esta tabla:

| Comentario probable | Causa real | Evidencia | Cambio propuesto | Prueba que demuestra mejora |
|---|---|---|---|---|
| "No me deja aprobar" | Permiso o version desactualizada | Archivo, linea y estado | Mensaje y accion recuperable | Dos usuarios simultaneos; uno gana y el otro recibe conflicto |
| "No se que sigue" | Falta responsable o siguiente etapa | Expediente y auditoria | Mostrar responsable, fecha y accion | Identificacion correcta en cinco segundos |
| "Se ve bonito, pero me pierdo" | Jerarquia o destinos excesivos | Captura desktop/movil | Contraer secundarios y priorizar una accion | Tarea completada sin ayuda y dentro del tiempo meta |

Los comentarios simulados se guardan como hipotesis con confianza `0.35`; solo una prueba o
comentario real puede elevar su confianza. Una mejora visual se acepta cuando reduce tiempo,
errores o esfuerzo de lectura sin ocultar controles, trazabilidad ni informacion necesaria.

## Puntuacion honesta

Cada dimension se califica de 0 a 10: visual, claridad, rapidez, seguimiento, confianza y
gusto estetico. Un resultado de 10 exige:

- 90% identifica estado, responsable y siguiente accion en 5 segundos.
- Todas las metas de las 12 personas se cumplen.
- No existe perdida de datos, redireccion silenciosa ni estado imposible.
- Desktop y movil cumplen contraste, teclado y objetivos tactiles.
- La identidad Proboca es consistente y una encuesta visual real alcanza al menos 5.5/7.

Sin pruebas de campo, la puntuacion maxima permitida es 8.5 aunque la interfaz se vea
terminada. "Perfecto" significa que no hay defectos criticos conocidos y que las tareas
medidas cumplen su meta; no significa que se deja de aprender.
