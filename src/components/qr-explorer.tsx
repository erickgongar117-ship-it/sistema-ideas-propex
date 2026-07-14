"use client";

import {
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  ExternalLink,
  Factory,
  Mail,
  MapPin,
  QrCode,
  Search,
  UserRound,
  Warehouse
} from "lucide-react";
import { useMemo, useState } from "react";
import type { OrganizationNode, OrganizationStructure, OrganizationUserOption, PlantCode } from "@/lib/organization-types";

type QrItem = {
  node: OrganizationNode;
  path: OrganizationNode[];
};

type DepartmentGroup = {
  id: string;
  name: string;
  code: string;
  responsible: string;
  manager: string;
  routingUser: OrganizationUserOption | null;
  items: QrItem[];
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function departmentGroups(nodes: OrganizationNode[]) {
  const groups = new Map<string, DepartmentGroup>();

  function visit(node: OrganizationNode, path: OrganizationNode[], department: OrganizationNode | null) {
    const nextPath = [...path, node];
    const currentDepartment = node.type === "DEPARTAMENTO" ? node : department;
    const groupNode = currentDepartment ?? node;

    if (node.qrEnabled && node.active && node.captureArea?.active) {
      const existing = groups.get(groupNode.id) ?? {
        id: groupNode.id,
        name: currentDepartment?.name ?? "Otras areas",
        code: currentDepartment?.code ?? groupNode.code,
        responsible: currentDepartment?.responsible ?? groupNode.responsible,
        manager: currentDepartment?.manager ?? groupNode.manager,
        routingUser: currentDepartment?.routingUser ?? null,
        items: []
      };
      existing.items.push({ node, path: nextPath });
      groups.set(groupNode.id, existing);
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

function contactsFor(group: DepartmentGroup) {
  const contacts = new Map<string, OrganizationUserOption>();
  if (group.routingUser) contacts.set(group.routingUser.id, group.routingUser);
  group.items.forEach(({ node }) => {
    if (node.routingUser) contacts.set(node.routingUser.id, node.routingUser);
  });
  return [...contacts.values()].sort((left, right) => left.name.localeCompare(right.name, "es"));
}

function matchesGroup(group: DepartmentGroup, query: string) {
  const departmentText = normalize([
    group.name,
    group.code,
    group.responsible,
    group.manager,
    group.routingUser?.name,
    group.routingUser?.email
  ].filter(Boolean).join(" "));
  if (departmentText.includes(query)) return true;
  return group.items.some(({ node, path }) => normalize([
    node.name,
    node.code,
    node.captureArea?.code,
    node.responsible,
    node.manager,
    node.routingUser?.name,
    node.routingUser?.email,
    ...path.map((item) => item.name)
  ].filter(Boolean).join(" ")).includes(query));
}

export function QrExplorer({ structure, baseUrl }: { structure: OrganizationStructure; baseUrl: string }) {
  const [plant, setPlant] = useState<PlantCode | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const groupsByPlant = useMemo(() => ({
    APO: departmentGroups(structure.APO.nodes),
    CAR: departmentGroups(structure.CAR.nodes)
  }), [structure]);

  const activeGroups = plant ? groupsByPlant[plant] : [];
  const normalizedQuery = normalize(query.trim());
  const visibleGroups = normalizedQuery ? activeGroups.filter((group) => matchesGroup(group, normalizedQuery)) : activeGroups;
  const qrCount = (code: PlantCode) => groupsByPlant[code].reduce((total, group) => total + group.items.length, 0);

  function choosePlant(code: PlantCode) {
    setPlant(code);
    setOpenGroups(new Set());
    setQuery("");
  }

  function toggleGroup(id: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!plant) {
    return (
      <section className="surface p-5 sm:p-7" aria-labelledby="qr-plant-title">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-brand-700">Paso 1 de 3 · Planta</p>
          <h2 className="text-xl font-extrabold text-ink sm:text-2xl" id="qr-plant-title">¿De que planta necesitas los QR?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Selecciona la planta para mostrar solamente sus departamentos, areas y responsables.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button className="surface surface-interactive flex min-h-32 items-center gap-4 p-5 text-left" type="button" onClick={() => choosePlant("APO")}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-brand-500 text-white"><Factory className="h-6 w-6" aria-hidden /></span>
              <span><strong className="block text-lg text-ink">Apodaca</strong><span className="mt-1 block text-sm text-slate-600">{groupsByPlant.APO.length} departamentos · {qrCount("APO")} QR activos</span></span>
            </button>
            <button className="surface surface-interactive flex min-h-32 items-center gap-4 p-5 text-left" type="button" onClick={() => choosePlant("CAR")}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-ink text-white"><Warehouse className="h-6 w-6" aria-hidden /></span>
              <span><strong className="block text-lg text-ink">El Carmen</strong><span className="mt-1 block text-sm text-slate-600">{groupsByPlant.CAR.length} departamentos · {qrCount("CAR")} QR activos</span></span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  const currentPlant = structure[plant];

  return (
    <>
      <section className="mb-5 border-b border-line bg-white px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">Biblioteca de QR</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-500" aria-hidden />
              <h2 className="text-xl font-extrabold text-ink">{currentPlant.name}</h2>
              <span className="rounded bg-ink px-2 py-1 text-xs font-extrabold text-white">{plant}</span>
            </div>
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => { setPlant(null); setOpenGroups(new Set()); setQuery(""); }}><MapPin className="h-4 w-4" aria-hidden />Cambiar planta</button>
        </div>
      </section>

      <section className="surface overflow-hidden" aria-labelledby="qr-departments-title">
        <div className="border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="min-w-0 flex-1">
              <span className="label">Buscar departamento, area, responsable o correo</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
                <input className="field pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Ej. Operaciones, P3, Embarques o nombre@proboca.net" type="search" value={query} />
              </span>
            </label>
            <div className="flex gap-2">
              <button className="icon-button" type="button" onClick={() => setOpenGroups(new Set())} title="Contraer todo" aria-label="Contraer todo"><ChevronsDownUp className="h-4 w-4" aria-hidden /></button>
              <button className="icon-button" type="button" onClick={() => setOpenGroups(new Set(visibleGroups.map((group) => group.id)))} title="Expandir todo" aria-label="Expandir todo"><ChevronsUpDown className="h-4 w-4" aria-hidden /></button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{visibleGroups.length} departamentos</span><span>·</span><span>{visibleGroups.reduce((total, group) => total + group.items.length, 0)} codigos disponibles</span>
          </div>
        </div>

        <h3 className="sr-only" id="qr-departments-title">QR por departamento y area</h3>
        <div className="divide-y divide-line">
          {visibleGroups.map((group) => {
            const contacts = contactsFor(group);
            const isOpen = normalizedQuery ? true : openGroups.has(group.id);
            const isProduction = group.code.endsWith("-PROD");
            return (
              <section key={group.id}>
                <button className={`grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-l-4 px-4 py-4 text-left transition-colors sm:px-5 ${isProduction ? "border-brand-500 bg-brand-50 hover:bg-red-100" : "border-transparent hover:bg-panel"}`} type="button" onClick={() => toggleGroup(group.id)} aria-expanded={isOpen}>
                  <span className={`flex h-11 w-11 items-center justify-center ${isOpen || isProduction ? "bg-brand-500 text-white" : "bg-panel text-slate-600"}`}>
                    <Building2 className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2"><strong className="break-words text-base text-ink">{group.name}</strong><code className="text-[10px] font-bold text-brand-700">{group.code}</code>{isProduction ? <span className="bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase text-brand-700">Principal</span> : null}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{group.items.length} {group.items.length === 1 ? "area con QR" : "areas con QR"} · {contacts.length ? `${contacts.length} ${contacts.length === 1 ? "correo registrado" : "correos registrados"}` : "Correos pendientes"}</span>
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center text-slate-500">{isOpen ? <ChevronDown className="h-5 w-5" aria-hidden /> : <ChevronRight className="h-5 w-5" aria-hidden />}</span>
                </button>

                {isOpen ? <div className="border-t border-line bg-panel px-4 py-5 sm:px-5">
                  <div className="mb-5 grid gap-4 border-l-4 border-slate-950 bg-white p-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <div>
                      <p className="text-xs font-extrabold uppercase text-slate-500">Responsabilidad del departamento</p>
                      <p className="mt-1 font-extrabold text-ink">{group.responsible}</p>
                      <p className="mt-1 text-xs text-slate-500">Reporta a {group.manager}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-500"><Mail className="h-4 w-4" aria-hidden />Responsables y correos</p>
                      {contacts.length ? (
                        <div className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
                          {contacts.map((contact) => <p className="min-w-0 text-xs" key={contact.id}><span className="block truncate font-extrabold text-ink">{contact.name}</span><span className="block break-all text-slate-500">{contact.email}</span></p>)}
                        </div>
                      ) : <p className="mt-2 text-sm font-bold text-amber-800">Falta asignar usuarios en Estructura Organizacional.</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {group.items.map(({ node, path }) => {
                      const areaCode = node.captureArea?.code as string;
                      const captureUrl = `${baseUrl}/captura/${areaCode}`;
                      const qrUrl = `/api/qr/${areaCode}?target=${encodeURIComponent(captureUrl)}`;
                      return (
                        <article className="surface overflow-hidden" key={node.id}>
                          <div className="flex min-h-24 items-start justify-between gap-3 border-b border-line p-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="flex h-11 min-w-11 shrink-0 items-center justify-center bg-slate-950 px-2 text-xs font-extrabold text-white">{areaCode}</span>
                              <div className="min-w-0"><h4 className="break-words text-sm font-extrabold text-ink">{node.name}</h4><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{path.map((item) => item.name).join(" › ")}</p></div>
                            </div>
                            <QrCode className="h-5 w-5 shrink-0 text-brand-500" aria-hidden />
                          </div>
                          <div className="p-4">
                            <div className="mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center border border-line bg-white p-3">
                              <img alt={`Codigo QR para captura del area ${areaCode}`} className="h-full w-full object-contain" loading="lazy" src={qrUrl} />
                            </div>
                            <div className="mt-4 min-h-16 border-l-4 border-emerald-600 bg-emerald-50 p-3">
                              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase text-emerald-900"><UserRound className="h-3.5 w-3.5" aria-hidden />Recibe y da seguimiento</p>
                              <p className="mt-1 break-words text-xs font-extrabold text-emerald-950">{node.routingUser?.name ?? "Responsable pendiente"}</p>
                              <p className="mt-0.5 break-all text-[11px] text-emerald-800">{node.routingUser?.email ?? "Sin correo asignado"}</p>
                            </div>
                            <p className="mt-3 break-all bg-panel p-3 text-[11px] font-semibold leading-4 text-slate-600">{captureUrl}</p>
                            <div className="no-print mt-3 grid gap-2 sm:grid-cols-2">
                              <a className="btn btn-secondary" download href={`${qrUrl}&download=1`}><Download className="h-4 w-4" aria-hidden />Descargar</a>
                              <a className="btn btn-primary" href={captureUrl} rel="noreferrer" target="_blank"><ExternalLink className="h-4 w-4" aria-hidden />Probar</a>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div> : null}
              </section>
            );
          })}
          {!visibleGroups.length ? <div className="px-5 py-12 text-center"><Search className="mx-auto h-7 w-7 text-slate-400" aria-hidden /><p className="mt-3 font-extrabold text-ink">No encontramos ese departamento o area</p><p className="mt-1 text-sm text-slate-500">Prueba con el nombre, codigo, responsable o correo.</p></div> : null}
        </div>
      </section>
    </>
  );
}
