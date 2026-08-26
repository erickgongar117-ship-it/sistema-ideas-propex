"use client";

import { useState } from "react";
import { Ban, CheckCircle2, Coins, UsersRound, X } from "lucide-react";

type EnrollmentRow = {
  id: string;
  coinsAwarded: number;
  status: "REGISTERED" | "COMPLETED" | "CANCELLED";
  participant: {
    name: string;
    employeeNumber: string | null;
    email: string | null;
  };
};

type TrainingAttendanceTableProps = {
  action: (formData: FormData) => void | Promise<void>;
  enrollments: EnrollmentRow[];
  pendingTotal: number;
  readOnly?: boolean;
  sessionId: string;
};

function Status({ status }: { status: EnrollmentRow["status"] }) {
  const style = status === "COMPLETED" ? "bg-emerald-50 text-emerald-800" : status === "CANCELLED" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800";
  const label = status === "COMPLETED" ? "Completado" : status === "CANCELLED" ? "Cancelado" : "Pendiente";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${style}`}>{label}</span>;
}

export function TrainingAttendanceTable({ action, enrollments, pendingTotal, readOnly = false, sessionId }: TrainingAttendanceTableProps) {
  const pendingVisible = enrollments.filter((enrollment) => enrollment.status === "REGISTERED");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectPendingVisible() {
    setSelected(new Set(pendingVisible.map((enrollment) => enrollment.id)));
  }

  return (
    <div>
      {pendingTotal && !readOnly ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
          <div><p className="text-sm font-extrabold text-ink">Cierre de asistencia</p><p className="text-xs text-slate-500">Confirma personas seleccionadas o todos los pendientes de la sesion.</p></div>
          <form action={action} onSubmit={(event) => { if (!window.confirm(`Se completaran ${pendingTotal} entrenamientos y se entregaran ProbocaCoins. ¿Continuar?`)) event.preventDefault(); }}>
            <input name="sessionId" type="hidden" value={sessionId} /><input name="scope" type="hidden" value="all" /><input name="status" type="hidden" value="COMPLETED" />
            <button className="btn btn-success" type="submit"><UsersRound className="h-4 w-4" aria-hidden />Completar los {pendingTotal.toLocaleString("es-MX")} pendientes</button>
          </form>
        </div>
      ) : null}

      <form action={action}>
        <input name="sessionId" type="hidden" value={sessionId} />
        {[...selected].map((id) => <input key={id} name="enrollmentIds" type="hidden" value={id} />)}
        {pendingVisible.length && !readOnly ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button className="btn btn-secondary" onClick={selectPendingVisible} type="button">Seleccionar pendientes visibles</button>
            {selected.size ? <button className="btn btn-secondary" onClick={() => setSelected(new Set())} type="button"><X className="h-4 w-4" aria-hidden />Limpiar</button> : null}
            <span className="ml-auto text-xs font-extrabold text-brand-700">{selected.size} seleccionados</span>
          </div>
        ) : null}
        <div className="overflow-x-auto border-y border-line">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-[10px] font-extrabold uppercase text-slate-500"><tr><th className="w-10 px-2 py-2"><span className="sr-only">Seleccionar</span></th><th className="px-2 py-2">Persona</th><th className="px-2 py-2">Estado</th><th className="px-2 py-2 text-right">ProbocaCoins</th></tr></thead>
            <tbody className="divide-y divide-line">
              {enrollments.map((enrollment) => (
                <tr className={selected.has(enrollment.id) ? "bg-red-50" : "bg-white"} key={enrollment.id}>
                  <td className="px-2 py-3"><input aria-label={`Seleccionar ${enrollment.participant.name}`} checked={selected.has(enrollment.id)} disabled={readOnly || enrollment.status !== "REGISTERED"} onChange={() => toggle(enrollment.id)} type="checkbox" /></td>
                  <td className="px-2 py-3"><p className="font-extrabold text-ink">{enrollment.participant.name}</p><p className="text-xs text-slate-500">{enrollment.participant.employeeNumber ?? enrollment.participant.email ?? "Sin identificador"}</p></td>
                  <td className="px-2 py-3"><Status status={enrollment.status} /></td>
                  <td className="px-2 py-3 text-right"><span className="inline-flex items-center gap-1.5 font-extrabold tabular-nums text-ink">{enrollment.coinsAwarded ? <Coins className="h-4 w-4 text-amber-600" aria-hidden /> : null}{enrollment.coinsAwarded || "-"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected.size && !readOnly ? (
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button className="btn btn-secondary" name="status" type="submit" value="CANCELLED"><Ban className="h-4 w-4" aria-hidden />Cancelar seleccionados</button>
            <button className="btn btn-success" name="status" type="submit" value="COMPLETED"><CheckCircle2 className="h-4 w-4" aria-hidden />Completar seleccionados</button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
