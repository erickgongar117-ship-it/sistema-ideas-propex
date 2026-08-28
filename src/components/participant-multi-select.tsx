"use client";

import { useMemo, useState } from "react";
import { Search, UserPlus, UsersRound, X } from "lucide-react";
import { matchesPersonSearch } from "@/lib/person-search";

type ParticipantOption = {
  id: string;
  name: string;
  employeeNumber: string | null;
  email: string | null;
  area: string;
  plant: string;
};

type ParticipantMultiSelectProps = {
  action: (formData: FormData) => void | Promise<void>;
  participants: ParticipantOption[];
  sessionId: string;
};

export function ParticipantMultiSelect({ action, participants, sessionId }: ParticipantMultiSelectProps) {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const areas = useMemo(() => [...new Set(participants.map((participant) => `${participant.plant}|${participant.area}`))].sort(), [participants]);
  const filtered = useMemo(() => {
    return participants.filter((participant) => {
      const areaKey = `${participant.plant}|${participant.area}`;
      const searchable = `${participant.name} ${participant.employeeNumber ?? ""} ${participant.email ?? ""} ${participant.area} ${participant.plant}`;
      return (!area || areaKey === area) && matchesPersonSearch(searchable, search);
    });
  }, [area, participants, search]);
  const visible = filtered.slice(0, 80);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectFiltered() {
    setSelected((current) => new Set([...current, ...filtered.map((participant) => participant.id)]));
  }

  return (
    <form action={action} className="border-y border-line py-4">
      <input name="sessionId" type="hidden" value={sessionId} />
      {[...selected].map((id) => <input key={id} name="participantIds" type="hidden" value={id} />)}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-extrabold text-ink">Inscribir personas</p><p className="text-xs text-slate-500">Busca, filtra por area y agrega al grupo en una sola accion.</p></div>
        <span className="text-xs font-extrabold text-brand-700">{selected.size.toLocaleString("es-MX")} seleccionadas</span>
      </div>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_260px]">
        <label><span className="sr-only">Buscar persona</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-[14px] h-4 w-4 text-slate-400" aria-hidden /><input className="field pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, numero o correo" value={search} /></span></label>
        <label><span className="sr-only">Filtrar por area</span><select className="field" onChange={(event) => setArea(event.target.value)} value={area}><option value="">Todas las plantas y areas</option>{areas.map((item) => { const [plant, areaName] = item.split("|"); return <option key={item} value={item}>{plant} - {areaName}</option>; })}</select></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn btn-secondary" disabled={!filtered.length} onClick={selectFiltered} type="button"><UsersRound className="h-4 w-4" aria-hidden />Seleccionar resultados ({filtered.length})</button>
        {selected.size ? <button className="btn btn-secondary" onClick={() => setSelected(new Set())} type="button"><X className="h-4 w-4" aria-hidden />Limpiar</button> : null}
      </div>
      <div className="mt-3 max-h-72 divide-y divide-line overflow-y-auto border-y border-line">
        {visible.map((participant) => (
          <label className="flex cursor-pointer items-center gap-3 px-2 py-2.5 hover:bg-slate-50" key={participant.id}>
            <input checked={selected.has(participant.id)} onChange={() => toggle(participant.id)} type="checkbox" />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-ink">{participant.name}</span><span className="block truncate text-xs text-slate-500">{participant.employeeNumber ?? participant.email ?? "Sin identificador"} - {participant.plant} / {participant.area}</span></span>
          </label>
        ))}
        {!visible.length ? <p className="px-3 py-6 text-center text-sm text-slate-500">No hay personas disponibles con estos filtros.</p> : null}
      </div>
      {filtered.length > visible.length ? <p className="mt-2 text-xs font-bold text-slate-500">Se muestran 80 resultados. Puedes seleccionar los {filtered.length.toLocaleString("es-MX")} resultados o afinar la busqueda.</p> : null}
      <button className="btn btn-primary mt-3" disabled={!selected.size} type="submit"><UserPlus className="h-4 w-4" aria-hidden />Inscribir {selected.size || "personas"}</button>
    </form>
  );
}
