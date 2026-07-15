import type { ManagerialEvaluationFactor } from "@/lib/managerial-evaluation";
import { CheckCircle2 } from "lucide-react";
import { closeIdeaAction } from "@/app/actions";

type StandardRule = {
  id: string;
  name: string;
  description: string;
  points: number;
};

type ManagerialSuggestion = {
  factor: ManagerialEvaluationFactor;
  points: number;
  criterion: string;
};

type CurrentSelection = {
  pointRuleId: string;
  points: number;
};

type AwardFormProps = {
  ideaId: string;
  standardRules: StandardRule[];
  suggestedStandardRuleIds: string[];
  managerialSuggestions: ManagerialSuggestion[];
  currentSelections: CurrentSelection[];
  mode: "close" | "adjust" | "restore";
};

function factorName(factor: ManagerialEvaluationFactor) {
  return factor.ruleName.replace("Evaluacion gerencial - ", "");
}

export function ProbocaCoinsAwardForm({
  ideaId,
  standardRules,
  suggestedStandardRuleIds,
  managerialSuggestions,
  currentSelections,
  mode
}: AwardFormProps) {
  const currentByRule = new Map(currentSelections.map((selection) => [selection.pointRuleId, selection.points]));
  const hasCurrentSelections = currentSelections.length > 0;
  const suggestedStandard = new Set(suggestedStandardRuleIds);
  const buttonLabel = mode === "close"
    ? "Cerrar y entregar ProbocaCoins"
    : mode === "restore"
      ? "Volver a otorgar ProbocaCoins"
      : "Guardar cambios de ProbocaCoins";

  return (
    <form action={closeIdeaAction} className="grid gap-3">
      <input name="ideaId" type="hidden" value={ideaId} />
      <div className="space-y-2">
        {standardRules.map((rule) => {
          const suggested = suggestedStandard.has(rule.id);
          const selected = hasCurrentSelections ? currentByRule.has(rule.id) : suggested;
          const assigned = currentByRule.get(rule.id) ?? rule.points;
          return (
            <label className="grid gap-2 rounded-lg border border-line bg-panel p-3 text-sm sm:grid-cols-[1fr_104px]" key={rule.id}>
              <span className="flex items-start gap-2">
                <input className="mt-1" defaultChecked={selected} name="pointRuleIds" type="checkbox" value={rule.id} />
                <span>
                  <span className="font-extrabold text-ink">{rule.name}</span>
                  {suggested ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">Sugerida</span> : null}
                  <span className="mt-0.5 block text-xs text-slate-500">{rule.description}</span>
                </span>
              </span>
              <span><span className="label mb-1">ProbocaCoins</span><input className="field min-h-10 py-2" defaultValue={assigned} min={0} name={`points-${rule.id}`} type="number" /></span>
            </label>
          );
        })}
      </div>

      <fieldset className="border-t border-line pt-4">
        <legend className="mb-3 flex w-full items-center justify-between gap-3 text-sm font-extrabold text-ink">
          <span>Evaluacion gerencial complementaria</span>
          <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] text-white">Hasta 500 ProbocaCoins</span>
        </legend>
        <p className="mb-3 text-xs leading-5 text-slate-500">El sistema propone un nivel. Puedes cambiarlo o elegir No incluir antes de guardar.</p>
        <div className="space-y-3">
          {managerialSuggestions.map(({ factor, points, criterion }) => {
            const assigned = currentByRule.get(factor.ruleId);
            const selectedPoints = assigned ?? (mode === "adjust" ? "" : points);
            return (
              <label className="grid gap-2 border-l-4 border-slate-900 bg-slate-50 p-3 text-sm" key={factor.ruleId}>
                <span>
                  <span className="font-extrabold text-ink">{factorName(factor)}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">Sugerencia automatica: {criterion} ({points} ProbocaCoins)</span>
                </span>
                <select className="field" defaultValue={String(selectedPoints)} name={`managerial-${factor.ruleId}`}>
                  <option value="">No incluir este factor</option>
                  {factor.options.map((option) => <option key={option.points} value={option.points}>{option.points} ProbocaCoins - {option.label}</option>)}
                </select>
              </label>
            );
          })}
        </div>
      </fieldset>

      <button className="btn btn-success" type="submit"><CheckCircle2 className="h-4 w-4" aria-hidden />{buttonLabel}</button>
    </form>
  );
}

export function ManagerialCriteriaTable({
  managerialSuggestions,
  currentSelections
}: Pick<AwardFormProps, "managerialSuggestions" | "currentSelections">) {
  const currentByRule = new Map(currentSelections.map((selection) => [selection.pointRuleId, selection.points]));

  return (
    <section aria-labelledby="managerial-criteria-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-extrabold uppercase text-brand-700">Referencia oficial</p>
          <h3 className="mt-1 text-sm font-extrabold text-ink" id="managerial-criteria-title">Tabla de evaluacion del gerente</h3>
        </div>
        <span className="text-xs font-bold text-slate-500">4 factores / 20 criterios</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">La fila verde es la sugerencia automatica. La fila negra corresponde al nivel actualmente otorgado.</p>

      <div className="mt-3 hidden overflow-x-auto rounded-lg border border-line md:block">
        <table className="min-w-[780px] w-full border-collapse text-left text-xs">
          <thead className="bg-slate-950 text-white">
            <tr><th className="px-3 py-2.5">Factor</th><th className="px-3 py-2.5">Criterio</th><th className="px-3 py-2.5 text-right">ProbocaCoins</th><th className="px-3 py-2.5">Referencia</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {managerialSuggestions.flatMap(({ factor, points }) => {
              const assigned = currentByRule.get(factor.ruleId);
              return factor.options.map((option, index) => {
                const isAssigned = assigned === option.points;
                const isSuggested = points === option.points;
                return (
                  <tr className={isAssigned ? "bg-slate-100" : isSuggested ? "bg-emerald-50" : "bg-white"} key={`${factor.ruleId}-${option.points}`}>
                    <td className="px-3 py-2.5 align-top font-extrabold text-ink">{index === 0 ? factorName(factor) : ""}</td>
                    <td className="px-3 py-2.5 leading-5 text-slate-600">{option.label}</td>
                    <td className="px-3 py-2.5 text-right font-extrabold tabular-nums text-ink">{option.points}</td>
                    <td className="px-3 py-2.5">{isAssigned ? <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-extrabold text-white">Otorgada</span> : isSuggested ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-extrabold text-emerald-800">Sugerida</span> : null}</td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 divide-y divide-line border-y border-line md:hidden">
        {managerialSuggestions.map(({ factor, points }) => {
          const assigned = currentByRule.get(factor.ruleId);
          return (
            <div className="py-4" key={factor.ruleId}>
              <div className="mb-2 flex items-start justify-between gap-3"><h4 className="text-sm font-extrabold text-ink">{factorName(factor)}</h4><span className="shrink-0 text-xs font-bold text-slate-500">Max. {factor.maxPoints}</span></div>
              <div className="space-y-1.5">
                {factor.options.map((option) => {
                  const isAssigned = assigned === option.points;
                  const isSuggested = points === option.points;
                  return (
                    <div className={`grid grid-cols-[1fr_auto] gap-3 border-l-4 px-3 py-2 text-xs ${isAssigned ? "border-slate-950 bg-slate-100" : isSuggested ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`} key={option.points}>
                      <span className="leading-5 text-slate-600">{option.label}</span>
                      <span className="font-extrabold tabular-nums text-ink">{option.points}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
