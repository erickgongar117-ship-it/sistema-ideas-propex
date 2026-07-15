"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type PersonOption = {
  id: string;
  name: string;
};

const MINIMUM_ACTIVITIES = 5;
const MAXIMUM_ACTIVITIES = 25;

export function GenbaActivityEntryTable({
  users,
  initialDueDate
}: {
  users: PersonOption[];
  initialDueDate: string;
}) {
  const [activityCount, setActivityCount] = useState(MINIMUM_ACTIVITIES);
  const additionalCount = activityCount - MINIMUM_ACTIVITIES;

  return (
    <div>
      <input name="activityCount" type="hidden" value={activityCount} />
      <div className="mb-3 flex flex-col gap-3 border-y border-line bg-panel px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold text-slate-600" aria-live="polite">
          {MINIMUM_ACTIVITIES} principales{additionalCount ? ` + ${additionalCount} adicionales` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {activityCount > MINIMUM_ACTIVITIES ? (
            <button className="btn btn-secondary" onClick={() => setActivityCount((count) => Math.max(MINIMUM_ACTIVITIES, count - 1))} type="button">
              <Trash2 className="h-4 w-4" aria-hidden />Quitar ultima
            </button>
          ) : null}
          <button className="btn btn-primary" disabled={activityCount >= MAXIMUM_ACTIVITIES} onClick={() => setActivityCount((count) => Math.min(MAXIMUM_ACTIVITIES, count + 1))} type="button">
            <Plus className="h-4 w-4" aria-hidden />Agregar actividad
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="hidden grid-cols-[48px_minmax(210px,1.2fr)_minmax(210px,1.2fr)_minmax(170px,0.8fr)_160px] gap-3 bg-slate-100 px-3 py-3 text-[10px] font-extrabold uppercase text-slate-500 lg:grid">
          <span className="text-center">#</span><span>Problematica *</span><span>Accion propuesta</span><span>Responsable</span><span>Fecha compromiso</span>
        </div>
        <div className="divide-y divide-line">
          {Array.from({ length: activityCount }, (_, index) => {
            const number = index + 1;
            const additional = number > MINIMUM_ACTIVITIES;
            return (
              <div className={`grid gap-3 p-3 lg:grid-cols-[48px_minmax(210px,1.2fr)_minmax(210px,1.2fr)_minmax(170px,0.8fr)_160px] lg:items-start ${additional ? "bg-red-50/40" : "bg-white"}`} key={number}>
                <div className="flex items-center gap-2 lg:justify-center">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-extrabold text-white ${additional ? "bg-slate-800" : "bg-red-700"}`}>{number}</span>
                  <span className="text-xs font-extrabold text-slate-600 lg:hidden">Actividad {number}{additional ? " adicional" : ""}</span>
                </div>
                <label htmlFor={`problem-${number}`}>
                  <span className="label lg:sr-only">Problematica *</span>
                  <textarea className="field min-h-20 resize-y" id={`problem-${number}`} name={`problem-${number}`} placeholder={additional ? "Actividad adicional" : "Condicion o problema observado"} required />
                </label>
                <label htmlFor={`action-${number}`}>
                  <span className="label lg:sr-only">Accion propuesta</span>
                  <textarea className="field min-h-20 resize-y" id={`action-${number}`} name={`action-${number}`} placeholder="Que debe hacerse" />
                </label>
                <label htmlFor={`owner-${number}`}>
                  <span className="label lg:sr-only">Responsable</span>
                  <select className="field" defaultValue="" id={`owner-${number}`} name={`ownerId-${number}`}>
                    <option value="">Sin asignar</option>
                    {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                </label>
                <label htmlFor={`due-${number}`}>
                  <span className="label lg:sr-only">Fecha compromiso</span>
                  <input className="field" defaultValue={initialDueDate} id={`due-${number}`} name={`dueDate-${number}`} type="date" />
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
