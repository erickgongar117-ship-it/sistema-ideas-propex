"use client";

import { FormEvent, useState, useTransition } from "react";
import { CircleAlert, CircleCheck, GitBranch, LoaderCircle, Plus, Trash2, UserRoundCog, UsersRound } from "lucide-react";
import {
  deleteEscalationRuleAction,
  deleteMembershipAction,
  saveEscalationRuleAction,
  saveMembershipAction
} from "@/app/(app)/configuracion/estructura/actions";
import { SearchablePicker, type SearchablePickerOption } from "@/components/searchable-picker";
import { personOptions } from "@/lib/person-options";
import type { OrganizationActionResult, OrganizationMembership, OrganizationNode, OrganizationUserOption } from "@/lib/organization-types";

type MembershipOption = OrganizationMembership & { unitName: string; plantId: string; plantName: string };

/**
 * Membresias como opciones buscables. El `<select>` con optgroup obligaba a recorrer todas
 * las membresias de ambas plantas a ojo; aqui se escribe el nombre o el numero de empleado.
 * La planta se conserva en la descripcion para no perder el aviso de cruce entre plantas.
 */
function membershipOptions(options: MembershipOption[], plantId: string, excludeId?: string, activeOnly = false, operationalOnly = false): SearchablePickerOption[] {
  const available = options.filter((option) =>
    option.id !== excludeId
    && (!activeOnly || option.active)
    && (!operationalOnly || (option.user.role !== "DIRECCION" && option.canReceiveIdeas))
  );
  const ordered = [
    ...available.filter((option) => option.plantId === plantId),
    ...available.filter((option) => option.plantId !== plantId)
  ];
  return ordered.map((option) => ({
    value: option.id,
    label: option.user.name,
    description: `${option.title} · ${option.unitName}${option.plantId === plantId ? "" : ` · ${option.plantName} (otra planta)`}`,
    searchText: [option.user.email, option.unitName, option.plantName, option.title].filter(Boolean).join(" ")
  }));
}

function MembershipOptions({ options, plantId, excludeId, activeOnly = false }: { options: MembershipOption[]; plantId: string; excludeId?: string; activeOnly?: boolean }) {
  const available = options.filter((option) => option.id !== excludeId && (!activeOnly || option.active));
  const samePlant = available.filter((option) => option.plantId === plantId);
  const otherPlants = available.filter((option) => option.plantId !== plantId);
  const renderOption = (option: MembershipOption) => <option key={option.id} value={option.id}>{option.user.name} · {option.title} · {option.unitName}</option>;

  return (
    <>
      {samePlant.length ? <optgroup label="Misma planta">{samePlant.map(renderOption)}</optgroup> : null}
      {otherPlants.length ? <optgroup label="Otra planta - revisa antes de guardar">{otherPlants.map(renderOption)}</optgroup> : null}
    </>
  );
}

function Checkbox({ defaultChecked, label, name }: { defaultChecked?: boolean; label: string; name: string }) {
  return (
    <label className="flex min-h-10 items-center gap-2 border border-line bg-white px-3 py-2 text-xs font-bold text-slate-700">
      <input defaultChecked={defaultChecked} name={name} type="checkbox" />
      {label}
    </label>
  );
}

export function OrganizationHierarchyEditor({
  node,
  users,
  allMemberships,
  onSaved
}: {
  node: OrganizationNode;
  users: OrganizationUserOption[];
  allMemberships: MembershipOption[];
  onSaved: () => void;
}) {
  const [message, setMessage] = useState<OrganizationActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(
    event: FormEvent<HTMLFormElement>,
    action: (formData: FormData) => Promise<OrganizationActionResult>
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await action(formData);
      setMessage(result);
      if (result.ok) {
        form.reset();
        onSaved();
      }
    });
  }

  const activeMemberships = node.memberships.filter((membership) =>
    membership.active && membership.canReceiveIdeas && membership.user.role !== "DIRECCION"
  );

  return (
    <div className="mt-6 space-y-5 border-t border-line pt-5">
      {message ? (
        <div className={`alert ${message.ok ? "alert-success" : "alert-danger"}`} role="status">
          {message.ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
          <span className="text-xs font-bold leading-5">{message.message}</span>
        </div>
      ) : null}

      <section aria-labelledby="area-people-title">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-extrabold text-ink" id="area-people-title"><UsersRound className="h-4 w-4 text-brand-600" aria-hidden />Personas de esta area</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">Quien trabaja aqui y a quien le reporta. Una persona puede estar en varias areas con un jefe distinto en cada una.</p>
          </div>
          <span className="rounded bg-panel px-2 py-1 text-xs font-extrabold text-slate-600">{node.memberships.length}</span>
        </div>

        <div className="mt-3 space-y-2">
          {node.memberships.map((membership) => (
            <details className="details-panel" key={membership.id}>
              <summary>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-ink">{membership.user.name}</span>
                  <span className="block truncate text-xs font-normal text-slate-500">{membership.title} · Nivel {membership.level}</span>
                </span>
                <span className="ml-auto mr-2 hidden rounded bg-panel px-2 py-1 text-[10px] font-extrabold text-slate-600 sm:inline-flex">{membership.managerMembership?.user.name ?? "Sin jefe configurado"}</span>
              </summary>
              <form className="grid gap-3 p-3" onSubmit={(event) => runAction(event, saveMembershipAction)}>
                <input name="membershipId" type="hidden" value={membership.id} />
                <input name="orgUnitId" type="hidden" value={node.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <SearchablePicker defaultValue={membership.userId} label="Persona" name="userId" options={personOptions(users)} placeholder="Nombre o numero de empleado" />
                  <label><span className="label">Puesto en esta area</span><input className="field" defaultValue={membership.title} name="title" required /></label>
                  <label><span className="label">Nivel jerarquico</span><input className="field" defaultValue={membership.level} max={99} min={0} name="level" type="number" /></label>
                  <label className="block"><SearchablePicker defaultValue={membership.managerMembershipId ?? ""} label="Jefe directo" name="managerMembershipId" options={membershipOptions(allMemberships, node.plantId, membership.id)} placeholder="Sin jefe configurado" /><span className="helper-text">Los responsables de la misma planta aparecen primero.</span></label>
                </div>
                {membership.user.role === "DIRECCION" ? (
                  <div className="border-l-4 border-slate-700 bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-700">
                    Dirección aparece en el organigrama y conserva consulta global, sin permisos para recibir ideas, tareas o avisos.
                    <input name="active" type="hidden" value={membership.active ? "on" : ""} />
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Checkbox defaultChecked={membership.canReviewTeam} label="Puede revisar y aprobar propuestas de su equipo" name="canReviewTeam" />
                    <Checkbox defaultChecked={membership.canReceiveIdeas} label="Puede recibir ideas como responsable directo" name="canReceiveIdeas" />
                    <Checkbox defaultChecked={membership.canManageActivities} label="Puede gestionar actividades" name="canManageActivities" />
                    <Checkbox defaultChecked={node.routingUserId === membership.userId} label="Usar como ruta principal actual" name="setAsRoute" />
                    <Checkbox defaultChecked={membership.active} label="Asignacion activa" name="active" />
                  </div>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  <button className="btn btn-secondary" disabled={isPending} type="submit">{isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <UserRoundCog className="h-4 w-4" aria-hidden />}Guardar persona</button>
                </div>
              </form>
              <form className="border-t border-line p-3" onSubmit={(event) => runAction(event, deleteMembershipAction)}>
                <input name="membershipId" type="hidden" value={membership.id} />
                <button className="btn btn-danger w-full" disabled={isPending} type="submit"><Trash2 className="h-4 w-4" aria-hidden />Retirar de esta area</button>
              </form>
            </details>
          ))}
        </div>

        <details className="details-panel mt-3 border-dashed border-slate-400">
          <summary><span className="flex items-center gap-2 text-brand-700"><Plus className="h-4 w-4" aria-hidden />Agregar persona o lider</span></summary>
          <form className="grid gap-3 p-3" onSubmit={(event) => runAction(event, saveMembershipAction)}>
            <input name="orgUnitId" type="hidden" value={node.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <SearchablePicker label="Persona" name="userId" options={personOptions(users.filter((user) => !node.memberships.some((membership) => membership.userId === user.id)))} placeholder="Nombre o numero de empleado" required />
              <label><span className="label">Puesto en esta area</span><input className="field" name="title" placeholder="Ej. Supervisor, jefe de turno, gerente" required /></label>
              <label><span className="label">Nivel jerarquico</span><input className="field" defaultValue={0} max={99} min={0} name="level" type="number" /><span className="helper-text">0 operativo, 1 supervisor, 2 jefatura, 3 gerencia; puedes usar los niveles que necesites.</span></label>
              <label className="block"><SearchablePicker label="Jefe directo" name="managerMembershipId" options={membershipOptions(allMemberships, node.plantId, undefined, true)} placeholder="Sin jefe configurado" /><span className="helper-text">Los responsables de la misma planta aparecen primero.</span></label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Checkbox label="Puede revisar y aprobar propuestas de su equipo" name="canReviewTeam" />
              <Checkbox label="Puede recibir ideas como responsable directo" name="canReceiveIdeas" />
              <Checkbox label="Puede gestionar actividades" name="canManageActivities" />
              <Checkbox label="Usar como ruta principal actual" name="setAsRoute" />
              <Checkbox defaultChecked label="Asignacion activa" name="active" />
            </div>
            <button className="btn btn-primary" disabled={isPending} type="submit"><Plus className="h-4 w-4" aria-hidden />Agregar a {node.name}</button>
          </form>
        </details>
      </section>

      <section aria-labelledby="escalation-routes-title">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-extrabold text-ink" id="escalation-routes-title"><GitBranch className="h-4 w-4 text-emerald-700" aria-hidden />Quien revisa, segun quien reporta</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">Cada renglon es un escalon: el operador reporta al supervisor, el supervisor al jefe de turno, el jefe al gerente. Quien captura elige su escalon en el formulario del QR, y eso decide quien le responde.</p>
          </div>
          <span className="rounded bg-panel px-2 py-1 text-xs font-extrabold text-slate-600">{node.escalationRules.length}</span>
        </div>

        {/* Ordenadas por escalon para que se lean como una escalera y no como una lista suelta. */}
        <ol className="escalation-ladder mt-3">
          {[...node.escalationRules].sort((a, b) => a.submitterLevel - b.submitterLevel || a.sortOrder - b.sortOrder).map((rule) => (
            <li key={rule.id}>
            <details className="details-panel">
              <summary>
                <span className="escalation-step" aria-hidden>{rule.submitterLevel + 1}</span>
                <span className="min-w-0"><span className="block truncate text-sm font-extrabold text-ink">{rule.submitterLabel} → {rule.reviewerMembership.user.name}</span><span className="block truncate text-xs font-normal text-slate-500">{`Escalon ${rule.submitterLevel + 1}`}{rule.circumstance ? ` · solo cuando ${rule.circumstance}` : ""}{rule.active ? "" : " · inactiva"}</span></span>
                {rule.isDefault ? <span className="ml-auto mr-2 rounded bg-emerald-50 px-2 py-1 text-[10px] font-extrabold text-emerald-800">Principal</span> : null}
              </summary>
              <form className="grid gap-3 p-3" onSubmit={(event) => runAction(event, saveEscalationRuleAction)}>
                <input name="ruleId" type="hidden" value={rule.id} />
                <input name="orgUnitId" type="hidden" value={node.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label><span className="label">Quien reporta</span><input className="field" defaultValue={rule.submitterLabel} name="submitterLabel" placeholder="Ej. Operador" required /></label>
                  <label><span className="label">Escalon</span><input className="field" defaultValue={rule.submitterLevel} min={0} name="submitterLevel" type="number" /><span className="helper-text">0 es quien esta mas abajo. Solo ordena la escalera.</span></label>
                  <label className="block sm:col-span-2"><SearchablePicker defaultValue={rule.reviewerMembershipId} label="Quien le responde" name="reviewerMembershipId" options={membershipOptions(allMemberships, node.plantId, undefined, true, true)} placeholder="Nombre o numero de empleado" /><span className="helper-text">Dirección queda fuera de las rutas operativas; otra planta se separa para evitar cruces accidentales.</span></label>
                  <label className="block sm:col-span-2"><span className="label">Solo cuando (opcional)</span><input className="field" defaultValue={rule.circumstance ?? ""} name="circumstance" placeholder="Ej. turno nocturno o linea 2" /></label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2"><Checkbox defaultChecked={rule.isDefault} label="Ruta principal" name="isDefault" /><Checkbox defaultChecked={rule.active} label="Ruta activa" name="active" /></div>
                <button className="btn btn-secondary" disabled={isPending} type="submit"><GitBranch className="h-4 w-4" aria-hidden />Guardar ruta</button>
              </form>
              <form className="border-t border-line p-3" onSubmit={(event) => runAction(event, deleteEscalationRuleAction)}><input name="ruleId" type="hidden" value={rule.id} /><button className="btn btn-danger w-full" disabled={isPending} type="submit"><Trash2 className="h-4 w-4" aria-hidden />Eliminar ruta</button></form>
            </details>
            </li>
          ))}
        </ol>

        <details className="details-panel mt-3 border-dashed border-slate-400">
          <summary><span className="flex items-center gap-2 text-emerald-800"><Plus className="h-4 w-4" aria-hidden />Agregar ruta de escalamiento</span></summary>
          {activeMemberships.length ? (
            <form className="grid gap-3 p-3" onSubmit={(event) => runAction(event, saveEscalationRuleAction)}>
              <input name="orgUnitId" type="hidden" value={node.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className="label">Quien reporta</span><input className="field" name="submitterLabel" placeholder="Ej. Operador, supervisor, jefe de turno" required /></label>
                <label><span className="label">Escalon</span><input className="field" defaultValue={node.escalationRules.length} min={0} name="submitterLevel" type="number" /><span className="helper-text">0 es quien esta mas abajo. Solo ordena la escalera.</span></label>
                <label className="block sm:col-span-2"><SearchablePicker label="Quien le responde" name="reviewerMembershipId" options={membershipOptions(allMemberships, node.plantId, undefined, true, true)} placeholder="Nombre o numero de empleado" required /><span className="helper-text">Dirección queda fuera de las rutas operativas; otra planta se separa para evitar cruces accidentales.</span></label>
                <label className="block sm:col-span-2"><span className="label">Solo cuando (opcional)</span><input className="field" name="circumstance" placeholder="Ej. turno nocturno o linea 2" /></label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2"><Checkbox defaultChecked={node.escalationRules.length === 0} label="Ruta principal" name="isDefault" /><Checkbox defaultChecked label="Ruta activa" name="active" /></div>
              <button className="btn btn-primary" disabled={isPending} type="submit"><GitBranch className="h-4 w-4" aria-hidden />Crear ruta</button>
            </form>
          ) : <p className="p-4 text-xs leading-5 text-amber-800">Primero agrega al menos una persona que pueda recibir ideas.</p>}
        </details>
      </section>
    </div>
  );
}
