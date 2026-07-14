"use client";

import {
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleAlert,
  ExternalLink,
  Factory,
  FolderTree,
  LoaderCircle,
  Mail,
  MapPin,
  Minus,
  Network,
  Pencil,
  Plus,
  QrCode,
  Search,
  UserRound,
  Warehouse,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOrganizationUnitAction } from "@/app/(app)/configuracion/estructura/actions";
import type {
  OrganizationNode,
  OrganizationPlant,
  OrganizationStructure,
  OrganizationUserOption,
  OrgNodeType,
  PlantCode
} from "@/lib/organization-types";

type NodeMatch = {
  node: OrganizationNode;
  parent: OrganizationNode | null;
  path: OrganizationNode[];
};

type EditorState = {
  mode: "create" | "edit";
  nodeId: string | null;
  parentId: string | null;
};

type EditorValues = {
  type: OrgNodeType;
  name: string;
  code: string;
  responsible: string;
  manager: string;
  routingUserId: string;
  qrEnabled: boolean;
  active: boolean;
};

const nodeTypeLabels: Record<OrgNodeType, string> = {
  MACROPROCESO: "Macroproceso",
  DEPARTAMENTO: "Departamento",
  AREA: "Area",
  PROCESO: "Proceso o equipo"
};

const emptyValues: EditorValues = {
  type: "DEPARTAMENTO",
  name: "",
  code: "",
  responsible: "",
  manager: "",
  routingUserId: "",
  qrEnabled: false,
  active: true
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function walkNodes(nodes: OrganizationNode[], callback: (match: NodeMatch) => void, parent: OrganizationNode | null = null, path: OrganizationNode[] = []) {
  for (const node of nodes) {
    const nextPath = [...path, node];
    callback({ node, parent, path: nextPath });
    walkNodes(node.children, callback, node, nextPath);
  }
}

function findNode(nodes: OrganizationNode[], id: string): NodeMatch | null {
  let result: NodeMatch | null = null;
  walkNodes(nodes, (match) => {
    if (match.node.id === id) result = match;
  });
  return result;
}

function matchesNode(node: OrganizationNode, query: string): boolean {
  const ownValue = normalize([
    node.name,
    node.code,
    node.responsible,
    node.manager,
    node.routingUser?.name,
    node.routingUser?.email,
    nodeTypeLabels[node.type]
  ].filter(Boolean).join(" "));
  return ownValue.includes(query) || node.children.some((child) => matchesNode(child, query));
}

function countNodes(nodes: OrganizationNode[]) {
  let count = 0;
  walkNodes(nodes, () => { count += 1; });
  return count;
}

function nodeIcon(type: OrgNodeType) {
  if (type === "MACROPROCESO") return Network;
  if (type === "DEPARTAMENTO") return Building2;
  if (type === "AREA") return Factory;
  return FolderTree;
}

export function OrganizationBuilder({
  initialStructure,
  users
}: {
  initialStructure: OrganizationStructure;
  users: OrganizationUserOption[];
}) {
  const router = useRouter();
  const [structure, setStructure] = useState(initialStructure);
  const [plant, setPlant] = useState<PlantCode | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [values, setValues] = useState<EditorValues>(emptyValues);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isSaving, startSaving] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setStructure(initialStructure);
  }, [initialStructure]);

  useEffect(() => {
    if (editor && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [editor]);

  const activePlant: OrganizationPlant | null = plant ? structure[plant] : null;
  const nodes = activePlant?.nodes ?? [];
  const selected = selectedId ? findNode(nodes, selectedId) : null;

  const parentOptions = useMemo(() => {
    const options: NodeMatch[] = [];
    if (!plant) return options;
    walkNodes(structure[plant].nodes, (match) => {
      if (["MACROPROCESO", "DEPARTAMENTO", "AREA"].includes(match.node.type)) options.push(match);
    });
    return options;
  }, [plant, structure]);

  function choosePlant(code: PlantCode) {
    const plantNodes = structure[code].nodes;
    setPlant(code);
    setSelectedId(plantNodes[0]?.id ?? null);
    setExpanded(new Set(plantNodes.map((node) => node.id)));
    setQuery("");
    setMessage("");
  }

  function toggleNode(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate(parentId: string | null = null) {
    setMessage("");
    setValues({ ...emptyValues, type: parentId ? "PROCESO" : "DEPARTAMENTO", code: plant ? `${plant}-` : "" });
    setEditor({ mode: "create", nodeId: null, parentId });
  }

  function openEdit() {
    if (!selected) return;
    setMessage("");
    setValues({
      type: selected.node.type,
      name: selected.node.name,
      code: selected.node.code,
      responsible: selected.node.responsible,
      manager: selected.node.manager,
      routingUserId: selected.node.routingUserId ?? "",
      qrEnabled: selected.node.qrEnabled,
      active: selected.node.active
    });
    setEditor({ mode: "edit", nodeId: selected.node.id, parentId: selected.parent?.id ?? null });
  }

  function closeEditor() {
    dialogRef.current?.close();
    setEditor(null);
  }

  function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activePlant || !editor) return;
    const formData = new FormData(event.currentTarget);

    startSaving(async () => {
      const result = await saveOrganizationUnitAction(formData);
      setMessage(result.message);
      setMessageTone(result.ok ? "success" : "error");
      if (result.ok) {
        closeEditor();
        router.refresh();
      }
    });
  }

  function renderNode(node: OrganizationNode, depth = 0): React.ReactNode {
    const normalizedQuery = normalize(query.trim());
    if (normalizedQuery && !matchesNode(node, normalizedQuery)) return null;
    const hasChildren = node.children.length > 0;
    const isExpanded = normalizedQuery ? hasChildren : expanded.has(node.id);
    const Icon = nodeIcon(node.type);

    return (
      <div key={node.id} role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
        <div
          className={`grid min-w-0 grid-cols-[42px_minmax(0,1fr)_42px] items-center border-b border-line px-1 py-1 transition-colors ${selectedId === node.id ? "bg-brand-50" : "hover:bg-panel"} ${node.active ? "" : "opacity-60"}`}
          style={{ marginLeft: `${Math.min(depth, 4) * 14}px` }}
        >
          {hasChildren ? (
            <button className="icon-button h-9 w-9" type="button" onClick={() => toggleNode(node.id)} title={isExpanded ? `Contraer ${node.name}` : `Expandir ${node.name}`} aria-label={isExpanded ? `Contraer ${node.name}` : `Expandir ${node.name}`}>
              {isExpanded ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
            </button>
          ) : <span className="flex h-9 w-9 items-center justify-center text-slate-400"><Minus className="h-4 w-4" aria-hidden /></span>}

          <button className="min-w-0 px-2 py-2 text-left" type="button" onClick={() => setSelectedId(node.id)}>
            <span className="flex min-w-0 items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              <span className="min-w-0">
                <span className="block break-words text-sm font-extrabold text-ink">{node.name}</span>
                <span className="mt-0.5 block break-words text-xs text-slate-500">{nodeTypeLabels[node.type]} · {node.code}</span>
              </span>
            </span>
          </button>

          <button className="icon-button h-9 w-9" type="button" onClick={() => openCreate(node.id)} title={`Agregar dentro de ${node.name}`} aria-label={`Agregar dentro de ${node.name}`}>
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {hasChildren && isExpanded ? (
          <div className="ml-5 border-l border-line pl-1" role="group">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  }

  if (!plant) {
    return (
      <section className="surface p-5 sm:p-7" aria-labelledby="plant-selector-title">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-brand-700">Paso 1 de 3 · Planta</p>
            <h2 id="plant-selector-title" className="text-xl font-extrabold text-ink sm:text-2xl">¿Que planta quieres administrar?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">La planta se selecciona antes de mostrar areas, responsables o codigos para evitar mezclar Apodaca con El Carmen.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="surface surface-interactive flex min-h-32 items-center gap-4 p-5 text-left" type="button" onClick={() => choosePlant("APO")}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-brand-500 text-white"><Factory className="h-6 w-6" aria-hidden /></span>
              <span><strong className="block text-lg text-ink">Apodaca</strong><span className="mt-1 block text-sm text-slate-600">Codigo de planta APO · {countNodes(structure.APO.nodes)} elementos</span></span>
            </button>
            <button className="surface surface-interactive flex min-h-32 items-center gap-4 p-5 text-left" type="button" onClick={() => choosePlant("CAR")}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-ink text-white"><Warehouse className="h-6 w-6" aria-hidden /></span>
              <span><strong className="block text-lg text-ink">El Carmen</strong><span className="mt-1 block text-sm text-slate-600">Codigo de planta CAR · {countNodes(structure.CAR.nodes)} elementos</span></span>
            </button>
          </div>
          <div className="mt-5 border-l-4 border-emerald-600 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-extrabold">Conectado a la base de datos</p>
            <p className="mt-1 leading-5">Los cambios que guardes aqui se aplican al sistema y quedan registrados en auditoria.</p>
          </div>
        </div>
      </section>
    );
  }

  const currentPlant = activePlant as OrganizationPlant;
  const normalizedQuery = normalize(query.trim());
  const visibleNodes = nodes.filter((node) => !normalizedQuery || matchesNode(node, normalizedQuery));

  return (
    <>
      <section className="mb-5 border-b border-line bg-white px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">Estructura activa</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-500" aria-hidden />
              <h2 className="text-xl font-extrabold text-ink">{currentPlant.name}</h2>
              <span className="rounded bg-ink px-2 py-1 text-xs font-extrabold text-white">{plant}</span>
            </div>
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => { setPlant(null); setSelectedId(null); setMessage(""); }}><MapPin className="h-4 w-4" aria-hidden />Cambiar planta</button>
        </div>
      </section>

      {message ? (
        <div className={`alert mb-5 ${messageTone === "success" ? "alert-success" : "alert-danger"}`} role="status">
          {messageTone === "success" ? <Network className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
          <span className="font-bold">{message}</span>
        </div>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.75fr)]">
        <section className="surface min-w-0 p-4 sm:p-5" aria-labelledby="structure-tree-title">
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <label className="min-w-0 flex-1">
                <span className="label">Buscar area, proceso, codigo o responsable</span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
                  <input className="field pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. Embarques, APO-LOG o Mejora Continua" type="search" />
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button className="icon-button" type="button" onClick={() => setExpanded(new Set())} title="Contraer todo" aria-label="Contraer todo"><ChevronsDownUp className="h-4 w-4" aria-hidden /></button>
                <button className="icon-button" type="button" onClick={() => {
                  const ids = new Set<string>();
                  walkNodes(nodes, ({ node }) => { if (node.children.length) ids.add(node.id); });
                  setExpanded(ids);
                }} title="Expandir todo" aria-label="Expandir todo"><ChevronsUpDown className="h-4 w-4" aria-hidden /></button>
                <button className="btn btn-primary" type="button" onClick={() => openCreate()}><Plus className="h-4 w-4" aria-hidden />Agregar</button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{countNodes(nodes)} elementos en {currentPlant.name}</span><span>·</span><span>Selecciona una fila para revisar responsables</span>
            </div>
          </div>

          <h3 id="structure-tree-title" className="sr-only">Arbol de estructura organizacional</h3>
          <div role="tree" aria-label={`Estructura de ${currentPlant.name}`}>
            {visibleNodes.length ? visibleNodes.map((node) => renderNode(node)) : (
              <div className="py-10 text-center">
                <Search className="mx-auto h-7 w-7 text-slate-400" aria-hidden />
                <p className="mt-3 font-bold text-ink">No encontramos esa area</p>
                <p className="mt-1 text-sm text-slate-500">Prueba con el nombre, codigo, correo o responsable.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="surface min-w-0 p-5 xl:sticky xl:top-6" aria-live="polite">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-panel px-2 py-1 text-xs font-extrabold text-slate-700">{nodeTypeLabels[selected.node.type]}</span>
                <code className="text-xs font-bold text-brand-700">{selected.node.code}</code>
                <span className={`rounded px-2 py-1 text-[10px] font-extrabold ${selected.node.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{selected.node.active ? "Activo" : "Inactivo"}</span>
              </div>
              <h3 className="mt-3 break-words text-xl font-extrabold text-ink">{selected.node.name}</h3>
              <p className="mt-1 break-words text-xs leading-5 text-slate-500">{selected.path.map((node) => node.name).join(" › ")}</p>

              <dl className="mt-5 grid gap-4">
                <div className="border-b border-line pb-3"><dt className="text-xs font-bold text-slate-500">Planta</dt><dd className="mt-1 font-extrabold text-ink">{currentPlant.name}</dd></div>
                <div className="border-b border-line pb-3"><dt className="flex items-center gap-2 text-xs font-bold text-slate-500"><UserRound className="h-4 w-4" aria-hidden />Responsable</dt><dd className="mt-1 break-words font-bold text-ink">{selected.node.responsible}</dd></div>
                <div className="border-b border-line pb-3"><dt className="text-xs font-bold text-slate-500">Jefe directo o gerente</dt><dd className="mt-1 break-words font-bold text-ink">{selected.node.manager}</dd></div>
                <div className="border-b border-line pb-3">
                  <dt className="flex items-center gap-2 text-xs font-bold text-slate-500"><Mail className="h-4 w-4" aria-hidden />Quien recibe ideas y correos</dt>
                  <dd className="mt-1 break-words font-bold text-ink">{selected.node.routingUser?.name ?? "Pendiente de asignar"}</dd>
                  {selected.node.routingUser ? <dd className="mt-0.5 break-all text-xs text-slate-500">{selected.node.routingUser.email}</dd> : null}
                </div>
                <div className="border-b border-line pb-3"><dt className="text-xs font-bold text-slate-500">Contenido</dt><dd className="mt-1 font-bold text-ink">{selected.node.children.length ? `${selected.node.children.length} elementos dependientes` : "Sin subdivisiones registradas"}</dd></div>
                <div>
                  <dt className="flex items-center gap-2 text-xs font-bold text-slate-500"><QrCode className="h-4 w-4" aria-hidden />QR de captura</dt>
                  <dd className="mt-1 font-bold text-ink">{selected.node.qrEnabled ? `Habilitado · ${selected.node.captureArea?.code ?? "en preparacion"}` : "No requerido"}</dd>
                  {selected.node.qrEnabled && selected.node.captureArea ? <a className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-brand-700 hover:underline" href={`/captura/${selected.node.captureArea.code}`} rel="noreferrer" target="_blank">Probar formulario <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a> : null}
                </div>
              </dl>

              {selected.node.qrEnabled && !selected.node.routingUser ? (
                <div className="mt-5 border-l-4 border-amber-500 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  <strong className="block">Falta asignar el seguimiento</strong>
                  El QR funciona, pero los avisos no tendran destinatario hasta elegir un usuario activo.
                </div>
              ) : null}

              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <button className="btn btn-secondary" type="button" onClick={openEdit}><Pencil className="h-4 w-4" aria-hidden />Editar</button>
                <button className="btn btn-secondary" type="button" onClick={() => openCreate(selected.node.id)}><Plus className="h-4 w-4" aria-hidden />Agregar dentro</button>
              </div>
            </>
          ) : <p className="text-sm text-slate-600">Selecciona un elemento de la estructura.</p>}
        </aside>
      </div>

      <dialog ref={dialogRef} className="org-dialog w-[min(92vw,720px)] max-h-[calc(100vh-2rem)] overflow-y-auto border border-line bg-white p-0 shadow-soft">
        {editor ? (
          <form className="p-5 sm:p-6" onSubmit={saveEditor}>
            <input name="unitId" type="hidden" value={editor.nodeId ?? ""} />
            <input name="plantId" type="hidden" value={currentPlant.id} />
            <input name="parentId" type="hidden" value={editor.parentId ?? ""} />
            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-brand-700">{currentPlant.name} · {plant}</p>
                <h3 className="mt-1 text-xl font-extrabold text-ink">{editor.mode === "edit" ? "Editar estructura" : "Agregar elemento"}</h3>
              </div>
              <button className="icon-button" disabled={isSaving} type="button" onClick={closeEditor} aria-label="Cerrar"><X className="h-5 w-5" aria-hidden /></button>
            </div>

            {message && messageTone === "error" ? (
              <div className="alert alert-danger mt-4" role="alert"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{message}</span></div>
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label><span className="label">Tipo</span><select className="field" name="type" value={values.type} onChange={(event) => setValues((current) => ({ ...current, type: event.target.value as OrgNodeType }))}><option value="MACROPROCESO">Macroproceso</option><option value="DEPARTAMENTO">Departamento</option><option value="AREA">Area</option><option value="PROCESO">Proceso o equipo</option></select></label>
              <label><span className="label">Pertenece a</span><select className="field" disabled={editor.mode === "edit"} value={editor.parentId ?? ""} onChange={(event) => setEditor((current) => current ? ({ ...current, parentId: event.target.value || null }) : current)}><option value="">Raiz de {currentPlant.name}</option>{parentOptions.map((option) => <option key={option.node.id} value={option.node.id}>{option.path.map((node) => node.name).join(" › ")}</option>)}</select>{editor.mode === "edit" ? <span className="helper-text">La ubicacion se conserva para proteger el historial.</span> : null}</label>
              <label><span className="label">Nombre</span><input className="field" name="name" required value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Almacen de secos" /></label>
              <label><span className="label">Codigo</span><input className="field uppercase" maxLength={32} name="code" pattern="[A-Za-z0-9-]{2,32}" required value={values.code} onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder={`${plant}-LOG-SEC`} /></label>
              <label><span className="label">Responsable o puesto</span><input className="field" name="responsible" required value={values.responsible} onChange={(event) => setValues((current) => ({ ...current, responsible: event.target.value }))} placeholder="Nombre o puesto responsable" /></label>
              <label><span className="label">Jefe directo o gerente</span><input className="field" name="manager" required value={values.manager} onChange={(event) => setValues((current) => ({ ...current, manager: event.target.value }))} placeholder="Nombre o puesto superior" /></label>
              <label className="sm:col-span-2"><span className="label">Usuario que recibe las ideas y correos</span><select className="field" name="routingUserId" value={values.routingUserId} onChange={(event) => setValues((current) => ({ ...current, routingUserId: event.target.value }))}><option value="">Pendiente de asignar</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select><span className="helper-text">El correo se toma del directorio de usuarios; si cambia ahi, se actualiza aqui automaticamente.</span></label>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 border border-line bg-panel p-4 text-sm font-bold text-ink"><input checked={values.qrEnabled} name="qrEnabled" onChange={(event) => setValues((current) => ({ ...current, qrEnabled: event.target.checked }))} type="checkbox" />Habilitar QR de captura</label>
              <label className="flex items-center gap-3 border border-line bg-panel p-4 text-sm font-bold text-ink"><input checked={values.active} name="active" onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))} type="checkbox" />Elemento activo</label>
            </div>

            {values.qrEnabled && !values.routingUserId ? <div className="mt-4 border-l-4 border-amber-500 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">Puedes guardar el QR, pero debes asignar un usuario para que alguien reciba y atienda las ideas.</div> : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button className="btn btn-secondary" disabled={isSaving} type="button" onClick={closeEditor}>Cancelar</button>
              <button className="btn btn-primary" disabled={isSaving} type="submit">{isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}{isSaving ? "Guardando..." : "Guardar en el sistema"}</button>
            </div>
          </form>
        ) : null}
      </dialog>
    </>
  );
}
