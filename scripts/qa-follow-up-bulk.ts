import assert from "node:assert/strict";
import { parseFollowUpBulkTarget, serializeFollowUpBulkTarget } from "../src/lib/follow-up-bulk";
import { kaizenClosureReadiness, reconciledKaizenStatus } from "../src/lib/kaizen-closure";
import {
  allocateFollowUpSlots,
  followUpConsumedBeforePage,
  followUpTotalPages
} from "../src/lib/follow-up-pagination";

const tests: Array<[string, () => void]> = [
  ["un destino de lote conserva tipo, version de destino y version de idea", () => {
    const target = {
      kind: "DEPARTMENT" as const,
      targetId: "approval-1",
      expectedTargetUpdatedAt: "2026-08-16T10:00:00.000Z",
      expectedIdeaUpdatedAt: "2026-08-16T09:59:00.000Z"
    };
    assert.deepEqual(parseFollowUpBulkTarget(serializeFollowUpBulkTarget(target)), target);
  }],
  ["un destino sin version se rechaza", () => {
    assert.equal(parseFollowUpBulkTarget("INITIAL|approval-1"), null);
  }],
  ["una implementacion conserva la version del Kaizen relacionado", () => {
    const target = {
      kind: "IMPLEMENTATION" as const,
      targetId: "idea-1",
      expectedTargetUpdatedAt: "2026-08-16T10:00:00.000Z",
      expectedIdeaUpdatedAt: "2026-08-16T10:00:00.000Z",
      expectedRelatedUpdatedAt: "2026-08-16T10:01:00.000Z"
    };
    assert.deepEqual(parseFollowUpBulkTarget(serializeFollowUpBulkTarget(target)), target);
  }],
  ["un tipo de destino inventado se rechaza", () => {
    assert.equal(parseFollowUpBulkTarget("OTHER|1|2026-08-16T10:00:00.000Z|2026-08-16T10:00:00.000Z"), null);
  }],
  ["una sola fuente utiliza los 50 espacios", () => {
    assert.deepEqual(allocateFollowUpSlots({ IDEA: 1_000, KAIZEN: 0, GENBA: 0 }, "TODOS"), { IDEA: 50, KAIZEN: 0, GENBA: 0 });
  }],
  ["tres fuentes nunca superan 50 registros", () => {
    const slots = allocateFollowUpSlots({ IDEA: 1_000, KAIZEN: 80, GENBA: 120 }, "TODOS");
    assert.equal(slots.IDEA + slots.KAIZEN + slots.GENBA, 50);
  }],
  ["los espacios libres se reasignan", () => {
    assert.deepEqual(allocateFollowUpSlots({ IDEA: 100, KAIZEN: 3, GENBA: 2 }, "TODOS"), { IDEA: 45, KAIZEN: 3, GENBA: 2 });
  }],
  ["el filtro de modulo reserva la pagina completa", () => {
    assert.deepEqual(allocateFollowUpSlots({ IDEA: 100, KAIZEN: 100, GENBA: 100 }, "KAIZEN"), { IDEA: 0, KAIZEN: 50, GENBA: 0 });
  }],
  // Regresion: el filtro pedia el limite completo aunque hubiera menos registros.
  ["el filtro nunca pide mas registros de los que existen", () => {
    assert.deepEqual(allocateFollowUpSlots({ IDEA: 1254, KAIZEN: 152, GENBA: 34 }, "GENBA"), { IDEA: 0, KAIZEN: 0, GENBA: 34 });
  }],
  // Regresion: con menos espacios que fuentes, dos modulos quedaban sin espacio y sus
  // registros no aparecian en ninguna pagina.
  ["ninguna fuente con datos se queda sin espacio", () => {
    assert.deepEqual(allocateFollowUpSlots({ IDEA: 1673, KAIZEN: 193, GENBA: 51 }, "TODOS", 1), { IDEA: 1, KAIZEN: 1, GENBA: 1 });
  }],
  ["el total de paginas sigue la fuente mas larga", () => {
    assert.equal(followUpTotalPages({ IDEA: 100, KAIZEN: 10, GENBA: 10 }, { IDEA: 30, KAIZEN: 10, GENBA: 10 }), 4);
  }],
  ["el consumo previo no cuenta mas registros de los existentes", () => {
    assert.equal(followUpConsumedBeforePage({ IDEA: 100, KAIZEN: 10, GENBA: 2 }, { IDEA: 30, KAIZEN: 10, GENBA: 2 }, 3), 72);
  }],
  ["un Kaizen completo con Charter, equipo y evidencia esta listo", () => {
    assert.equal(kaizenClosureReadiness({ activities: [{ status: "COMPLETADA", evidenceCount: 1 }], hasCharter: true, teamCount: 2 }).ready, true);
  }],
  ["un Kaizen sin actividades no se cierra", () => {
    assert.equal(kaizenClosureReadiness({ activities: [], hasCharter: true, teamCount: 2 }).ready, false);
  }],
  ["un Kaizen con todas las actividades canceladas no simula exito", () => {
    const readiness = kaizenClosureReadiness({ activities: [{ status: "CANCELADA", evidenceCount: 0 }], hasCharter: true, teamCount: 2 });
    assert.equal(readiness.allActivitiesResolved, true);
    assert.equal(readiness.hasCompletedResult, false);
    assert.equal(readiness.ready, false);
  }],
  ["una actividad completada sin evidencia bloquea el cierre", () => {
    const readiness = kaizenClosureReadiness({ activities: [{ status: "COMPLETADA", evidenceCount: 0 }], hasCharter: true, teamCount: 1 });
    assert.equal(readiness.completedActivitiesHaveEvidence, false);
    assert.equal(readiness.ready, false);
  }],
  ["las actividades combinadas no alteran el cierre", () => {
    const readiness = kaizenClosureReadiness({
      activities: [{ status: "COMPLETADA", evidenceCount: 1 }, { status: "COMBINADA", evidenceCount: 0 }],
      hasCharter: true,
      teamCount: 1
    });
    assert.equal(readiness.ready, true);
  }],
  ["Planificacion no se revierte cuando el cierre aun no aplica", () => {
    assert.equal(reconciledKaizenStatus("PLANIFICACION", false), "PLANIFICACION");
  }],
  ["Pausa tampoco cambia por una conciliacion sin requisitos", () => {
    assert.equal(reconciledKaizenStatus("EN_PAUSA", false), "EN_PAUSA");
  }],
  ["un expediente listo concilia a completado", () => {
    assert.equal(reconciledKaizenStatus("EN_CURSO", true), "COMPLETADO");
  }]
];

for (const [name, test] of tests) {
  test();
  console.log(`OK ${name}`);
}

console.log(`\n${tests.length} pruebas de destinos, paginacion y cierre completadas.`);
