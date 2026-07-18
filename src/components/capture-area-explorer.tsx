"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronRight,
  Factory,
  MapPin,
  Search,
  Warehouse
} from "lucide-react";
import { useMemo, useState } from "react";
import type { OrganizationNode, OrganizationStructure, PlantCode } from "@/lib/organization-types";

type CaptureItem = {
  node: OrganizationNode;
  path: OrganizationNode[];
};

type CaptureGroup = {
  id: string;
  code: string;
  name: string;
  items: CaptureItem[];
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function buildGroups(nodes: OrganizationNode[]) {
  const groups = new Map<string, CaptureGroup>();

  function visit(node: OrganizationNode, path: OrganizationNode[], department: OrganizationNode | null) {
    const nextPath = [...path, node];
    const currentDepartment = node.type === "DEPARTAMENTO" ? node : department;
    const groupNode = currentDepartment ?? node;

    if (node.qrEnabled && node.active && node.captureArea?.active) {
      const group = groups.get(groupNode.id) ?? {
        id: groupNode.id,
        code: groupNode.code,
        name: currentDepartment?.name ?? "Otras áreas",
        items: []
      };
      group.items.push({ node, path: nextPath });
      groups.set(groupNode.id, group);
    }

    node.children.forEach((child) => visit(child, nextPath, currentDepartment));
  }

  nodes.forEach((node) => visit(node, [], null));
  return [...groups.values()].sort((left, right) => {
    const leftPriority = left.code.endsWith("-PROD") ? 0 : 1;
    const rightPriority = right.code.endsWith("-PROD") ? 0 : 1;
    return leftPriority - rightPriority || left.name.localeCompare(right.name, "es");
  });
}

function groupMatches(group: CaptureGroup, query: string) {
  if (normalize(`${group.name} ${group.code}`).includes(query)) return true;
  return group.items.some(({ node, path }) => normalize([
    node.name,
    node.code,
    node.captureArea?.code,
    node.responsible,
    ...path.map((item) => item.name)
  ].filter(Boolean).join(" ")).includes(query));
}

export function CaptureAreaExplorer({ structure }: { structure: OrganizationStructure }) {
  const [plant, setPlant] = useState<PlantCode | null>(null);
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const groups = useMemo(() => ({
    APO: buildGroups(structure.APO.nodes),
    CAR: buildGroups(structure.CAR.nodes)
  }), [structure]);

  function selectPlant(code: PlantCode) {
    const production = groups[code].find((group) => group.code.endsWith("-PROD"));
    setPlant(code);
    setQuery("");
    setOpenGroups(new Set(production ? [production.id] : []));
  }

  function toggleGroup(groupId: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  if (!plant) {
    return (
      <div className="border border-line bg-white">
        <div className="grid sm:grid-cols-2">
          <button className="group flex min-h-28 items-center gap-4 border-b border-line p-5 text-left transition hover:bg-brand-50 sm:border-b-0 sm:border-r" onClick={() => selectPlant("APO")} type="button">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-brand-500 text-white"><Factory className="h-6 w-6" aria-hidden /></span>
            <span className="min-w-0 flex-1"><strong className="block text-lg text-ink">Planta Apodaca</strong><span className="mt-1 block text-sm text-slate-600">{groups.APO.length} departamentos disponibles</span></span>
            <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500" aria-hidden />
          </button>
          <button className="group flex min-h-28 items-center gap-4 p-5 text-left transition hover:bg-slate-50" onClick={() => selectPlant("CAR")} type="button">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-slate-950 text-white"><Warehouse className="h-6 w-6" aria-hidden /></span>
            <span className="min-w-0 flex-1"><strong className="block text-lg text-ink">Planta El Carmen</strong><span className="mt-1 block text-sm text-slate-600">{groups.CAR.length} departamentos disponibles</span></span>
            <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-950" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  const normalizedQuery = normalize(query.trim());
  const visibleGroups = normalizedQuery ? groups[plant].filter((group) => groupMatches(group, normalizedQuery)) : groups[plant];

  return (
    <div className="border border-line bg-white">
      <div className="border-b border-line p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase text-brand-700">Planta seleccionada</p>
            <div className="mt-1 flex items-center gap-2"><MapPin className="h-5 w-5 text-brand-500" aria-hidden /><h3 className="text-lg font-extrabold text-ink">{structure[plant].name}</h3></div>
          </div>
          <label className="min-w-0 flex-[1.4]">
            <span className="label">Buscar departamento o área</span>
            <span className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden /><input className="field pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Ej. Producción, P3, Embarques..." type="search" value={query} /></span>
          </label>
          <button className="btn btn-secondary" onClick={() => { setPlant(null); setQuery(""); setOpenGroups(new Set()); }} type="button"><MapPin className="h-4 w-4" aria-hidden />Cambiar planta</button>
        </div>
      </div>

      <div className="divide-y divide-line" aria-live="polite">
        {visibleGroups.map((group) => {
          const isProduction = group.code.endsWith("-PROD");
          const isOpen = normalizedQuery ? true : openGroups.has(group.id);
          return (
            <section key={group.id}>
              <button aria-expanded={isOpen} className={`grid w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 border-l-4 px-4 py-4 text-left transition sm:px-5 ${isProduction ? "border-brand-500 bg-brand-50 hover:bg-red-100" : "border-transparent hover:bg-slate-50"}`} onClick={() => toggleGroup(group.id)} type="button">
                <span className={`flex h-10 w-10 items-center justify-center ${isProduction ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600"}`}><Building2 className="h-5 w-5" aria-hidden /></span>
                <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-ink sm:text-base">{group.name}</strong>{isProduction ? <span className="bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase text-brand-700">Principal</span> : null}</span><span className="mt-1 block text-xs text-slate-500">{group.items.length} {group.items.length === 1 ? "área" : "áreas"} para registrar</span></span>
                {isOpen ? <ChevronDown className="h-5 w-5 text-slate-500" aria-hidden /> : <ChevronRight className="h-5 w-5 text-slate-500" aria-hidden />}
              </button>

              {isOpen ? (
                <div className="divide-y divide-line border-t border-line bg-slate-50 px-3 sm:px-5">
                  {group.items.map(({ node, path }) => {
                    const areaCode = node.captureArea?.code;
                    if (!areaCode) return null;
                    const route = path.filter((item) => item.type !== "MACROPROCESO" && item.id !== node.id).map((item) => item.name).join(" / ");
                    return (
                      <Link className="group grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2 py-3 transition hover:bg-white sm:grid-cols-[100px_minmax(0,1fr)_auto]" href={`/captura/${areaCode}`} key={node.id}>
                        <span className="hidden break-all font-mono text-[11px] font-extrabold text-brand-700 sm:block">{areaCode}</span>
                        <span className="min-w-0"><span className="block text-sm font-extrabold text-ink">{node.name}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{route || group.name}<span className="sm:hidden"> · {areaCode}</span></span></span>
                        <span className="flex items-center gap-2 text-xs font-extrabold text-brand-700">Registrar<span className="hidden sm:inline"> idea</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden /></span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
        {!visibleGroups.length ? <div className="px-5 py-10 text-center"><Search className="mx-auto h-6 w-6 text-slate-400" aria-hidden /><p className="mt-3 font-extrabold text-ink">No encontramos esa área</p><p className="mt-1 text-sm text-slate-500">Prueba con otro nombre o cambia de planta.</p></div> : null}
      </div>
    </div>
  );
}
