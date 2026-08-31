import type { ExecutiveValidationStatus } from "@prisma/client";
import Link from "next/link";
import {
  ArrowRight,
  CircleAlert,
  Clock3,
  Crown,
  Search,
  Send,
  ShieldCheck
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import {
  executiveValidationRequestScopeFor,
  executiveValidationStatusLabels,
  isCeoUser
} from "@/lib/executive-validation";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Validaciones ejecutivas" };

type PageProps = { searchParams: Promise<{ q?: string }> };

const statusTone: Record<ExecutiveValidationStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-900",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-800",
  MORE_INFO: "border-blue-200 bg-blue-50 text-blue-800",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-700"
};

function ExecutiveStatus({ status }: { status: ExecutiveValidationStatus }) {
  return (
    <span className={`inline-flex min-h-7 w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${statusTone[status]}`}>
      {executiveValidationStatusLabels[status]}
    </span>
  );
}

function dateTime(value: Date) {
  return value.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export default async function ExecutiveValidationsPage({ searchParams }: PageProps) {
  const user = await requireUser(["GERENTE", "DIRECCION"]);
  const { q = "" } = await searchParams;
  const query = q.trim();
  const requestScope = await executiveValidationRequestScopeFor(user);

  const ideaSearch = query ? {
    OR: [
      { folio: { contains: query } },
      { collaboratorName: { contains: query } },
      { problem: { contains: query } },
      { area: { is: { name: { contains: query } } } }
    ]
  } : {};

  const [received, requested, eligibleIdeas] = await Promise.all([
    prisma.executiveValidation.findMany({
      where: { assignedToId: user.id },
      include: {
        idea: { include: { area: true } },
        requestedBy: { select: { id: true, name: true, jobTitle: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 80
    }),
    prisma.executiveValidation.findMany({
      where: { requestedById: user.id },
      include: {
        idea: { include: { area: true } },
        assignedTo: { select: { id: true, name: true, email: true, jobTitle: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 80
    }),
    requestScope ? prisma.idea.findMany({
      where: { AND: [requestScope, ideaSearch] },
      include: {
        area: { include: { organizationUnit: { include: { plant: true } } } },
        executiveValidations: {
          where: { status: { not: "CANCELLED" } },
          select: {
            id: true,
            status: true,
            assignedTo: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 30
    }) : []
  ]);

  const pendingReceived = received.filter((item) => item.status === "PENDING");
  const waitingRequested = requested.filter((item) => item.status === "PENDING");
  const needsAttention = requested.filter((item) => ["MORE_INFO", "REJECTED"].includes(item.status));
  const isCeo = isCeoUser(user);

  return (
    <>
      <PageHeader
        title="Validaciones ejecutivas"
        description={isCeo
          ? "Solicitudes que Dirección envió al CEO para decisión y seguimiento."
          : user.role === "GERENTE"
            ? "Solicita y da seguimiento al visto bueno de Dirección o CEO para ideas de tus áreas."
            : "Responde solicitudes gerenciales y, cuando corresponda, solicita la decisión del CEO."}
      />

      <section aria-label="Resumen de validaciones" className="grid gap-3 sm:grid-cols-3">
        <article className="surface rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Clock3 className="h-5 w-5" aria-hidden /></span>
            <strong className="text-2xl font-black tabular-nums text-ink">{pendingReceived.length}</strong>
          </div>
          <p className="mt-3 text-sm font-extrabold text-ink">Esperan mi decisión</p>
          <p className="mt-1 text-xs text-slate-500">Requieren respuesta ejecutiva.</p>
        </article>
        <article className="surface rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Send className="h-5 w-5" aria-hidden /></span>
            <strong className="text-2xl font-black tabular-nums text-ink">{waitingRequested.length}</strong>
          </div>
          <p className="mt-3 text-sm font-extrabold text-ink">Enviadas y pendientes</p>
          <p className="mt-1 text-xs text-slate-500">Aún no reciben respuesta.</p>
        </article>
        <article className="surface rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-700"><CircleAlert className="h-5 w-5" aria-hidden /></span>
            <strong className="text-2xl font-black tabular-nums text-ink">{needsAttention.length}</strong>
          </div>
          <p className="mt-3 text-sm font-extrabold text-ink">Requieren seguimiento</p>
          <p className="mt-1 text-xs text-slate-500">Pidieron información o rechazaron.</p>
        </article>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-ink">Pendientes para mí</h2>
            <p className="mt-1 text-sm text-slate-500">Abre el expediente para aprobar, rechazar o pedir información.</p>
          </div>
          <span className="text-xs font-extrabold uppercase text-slate-500">{pendingReceived.length} pendientes</span>
        </div>
        {pendingReceived.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Idea</th><th>Solicita</th><th>Decisión requerida</th><th>Recibida</th><th><span className="sr-only">Acción</span></th></tr></thead>
              <tbody>
                {pendingReceived.map((validation) => (
                  <tr key={validation.id}>
                    <td><Link className="font-extrabold text-brand-700 hover:underline" href={`/ideas/${validation.ideaId}`}>{validation.idea.folio}</Link><span className="mt-0.5 block text-xs text-slate-500">{validation.idea.area.name}</span></td>
                    <td><span className="font-bold text-slate-800">{validation.requestedBy.name}</span><span className="mt-0.5 block text-xs text-slate-500">{validation.requestedBy.jobTitle ?? "Gerencia / Dirección"}</span></td>
                    <td className="max-w-md"><p className="line-clamp-2 text-sm text-slate-700">{validation.requestNote}</p></td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{dateTime(validation.createdAt)}</td>
                    <td><Link className="btn btn-primary whitespace-nowrap" href={`/ideas/${validation.ideaId}`}><ShieldCheck className="h-4 w-4" aria-hidden />Responder</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No tienes decisiones ejecutivas pendientes" description="Las nuevas solicitudes aparecerán aquí y también generarán una notificación." />}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-ink">Solicitadas por mí</h2>
            <p className="mt-1 text-sm text-slate-500">Historial y respuesta de cada director o del CEO.</p>
          </div>
          <span className="text-xs font-extrabold uppercase text-slate-500">{requested.length} solicitudes</span>
        </div>
        {requested.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Idea</th><th>Destinatario</th><th>Estado</th><th>Último cambio</th><th><span className="sr-only">Acción</span></th></tr></thead>
              <tbody>
                {requested.map((validation) => (
                  <tr key={validation.id}>
                    <td><Link className="font-extrabold text-brand-700 hover:underline" href={`/ideas/${validation.ideaId}`}>{validation.idea.folio}</Link><span className="mt-0.5 block text-xs text-slate-500">{validation.idea.area.name}</span></td>
                    <td><span className="font-bold text-slate-800">{validation.assignedTo.name}</span><span className="mt-0.5 block text-xs text-slate-500">{isCeoUser(validation.assignedTo) ? "CEO" : validation.assignedTo.jobTitle ?? "Dirección"}</span></td>
                    <td><ExecutiveStatus status={validation.status} /></td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{dateTime(validation.updatedAt)}</td>
                    <td><Link className="btn btn-ghost whitespace-nowrap" href={`/ideas/${validation.ideaId}`}>Dar seguimiento<ArrowRight className="h-4 w-4" aria-hidden /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Aún no has solicitado validaciones" description="Selecciona una idea de tu alcance para solicitar el visto bueno correspondiente." />}
      </section>

      {!isCeo && requestScope ? (
        <section className="mt-8">
          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-ink">Ideas que puedo escalar</h2>
              <p className="mt-1 text-sm text-slate-500">Solo aparecen ideas abiertas dentro de tu alcance autorizado.</p>
            </div>
            <form className="flex w-full max-w-md gap-2" method="get">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <span className="sr-only">Buscar idea</span>
                <input className="field pl-9" defaultValue={query} name="q" placeholder="Folio, persona, área o problema" />
              </label>
              <button className="btn btn-secondary" type="submit">Buscar</button>
            </form>
          </div>
          {eligibleIdeas.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Idea</th><th>Área y planta</th><th>Estado</th><th>Validación vigente</th><th><span className="sr-only">Acción</span></th></tr></thead>
                <tbody>
                  {eligibleIdeas.map((idea) => {
                    const activeValidation = idea.executiveValidations[0];
                    return (
                      <tr key={idea.id}>
                        <td><Link className="font-extrabold text-brand-700 hover:underline" href={`/ideas/${idea.id}`}>{idea.folio}</Link><span className="mt-0.5 block max-w-sm truncate text-xs text-slate-500">{idea.problem}</span></td>
                        <td><span className="font-bold text-slate-800">{idea.area.name}</span><span className="mt-0.5 block text-xs text-slate-500">{idea.area.organizationUnit?.plant.name ?? "Planta sin asignar"}</span></td>
                        <td><StatusPill status={idea.status} /></td>
                        <td>{activeValidation ? <span className="text-xs text-slate-600">{activeValidation.assignedTo.name}<span className="mt-1 block"><ExecutiveStatus status={activeValidation.status} /></span></span> : <span className="text-xs font-bold text-slate-500">Sin solicitud</span>}</td>
                        <td><Link className="btn bg-slate-950 text-white hover:bg-slate-800 whitespace-nowrap" href={`/ideas/${idea.id}`}><Crown className="h-4 w-4" aria-hidden />{activeValidation ? "Abrir expediente" : "Solicitar visto bueno"}</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No encontramos ideas abiertas" description={query ? "Prueba con otro folio, persona o área." : "No hay ideas abiertas dentro de tu alcance para escalar."} />}
        </section>
      ) : null}
    </>
  );
}
