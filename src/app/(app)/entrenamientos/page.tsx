import { Prisma, TrainingEnrollmentStatus } from "@prisma/client";
import Link from "next/link";
import {
  Award,
  Ban,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Filter,
  Plus,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  UsersRound,
  WalletCards,
  X
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { ParticipantMultiSelect } from "@/components/participant-multi-select";
import { ProbocaCoin } from "@/components/proboca-coin";
import { SearchablePicker } from "@/components/searchable-picker";
import { SectionHeading } from "@/components/section-heading";
import { TrainingAttendanceTable } from "@/components/training-attendance-table";
import { requireUser } from "@/lib/auth";
import { getParticipantBalances } from "@/lib/coins";
import { prisma } from "@/lib/prisma";
import {
  bulkEnrollParticipantsAction,
  bulkUpdateTrainingEnrollmentsAction,
  createParticipantAction,
  createTrainingProgramAction,
  createTrainingSessionAction,
  deleteInactiveParticipantAction,
  toggleTrainingProgramAction,
  updateParticipantActiveAction
} from "./actions";

type TrainingPageProps = {
  searchParams: Promise<{
    count?: string;
    directory?: string;
    error?: string;
    participant?: string;
    peoplePage?: string;
    peopleQ?: string;
    peopleStatus?: string;
    rosterPage?: string;
    rosterQ?: string;
    rosterStatus?: string;
    session?: string;
    sessionPage?: string;
    sessionQ?: string;
    success?: string;
    view?: string;
  }>;
};

type TrainingWorkspaceView = "operation" | "setup" | "directory";
type TrainingDirectoryView = "programs" | "people";

const sessionPageSize = 15;
const rosterPageSize = 40;
const peoplePageSize = 30;

function positivePage(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(value);
}

function trainingView(value?: string): TrainingWorkspaceView {
  if (value === "setup" || value === "directory") return value;
  return "operation";
}

function directoryView(value?: string): TrainingDirectoryView {
  return value === "people" ? "people" : "programs";
}

function Metric({
  icon,
  label,
  value,
  note
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <div className="border-l-2 border-brand-500 px-4 py-2">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function WorkspaceTab({
  active,
  count,
  href,
  icon,
  label
}: {
  active: boolean;
  count?: number;
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={
        "flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-extrabold transition sm:px-4 " +
        (active
          ? "border-brand-500 text-brand-700"
          : "border-transparent text-slate-600 hover:border-slate-300 hover:text-ink")
      }
      href={href}
    >
      {icon}
      <span>{label}</span>
      {typeof count === "number" ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] tabular-nums text-slate-600">
          {count.toLocaleString("es-MX")}
        </span>
      ) : null}
    </Link>
  );
}

function messageFor(query: Awaited<TrainingPageProps["searchParams"]>) {
  const count = Math.max(0, Number(query.count) || 0);
  const successMessages: Record<string, string> = {
    programa: "El entrenamiento quedo disponible para crear sesiones.",
    programa_activado: "El entrenamiento volvio a quedar activo.",
    programa_pausado: "El entrenamiento se pauso sin perder su historial.",
    sesion: "La sesion fue creada correctamente.",
    participante: "La persona quedo registrada en el directorio de ProbocaCoins.",
    inscripciones:
      count +
      " " +
      (count === 1 ? "persona fue inscrita" : "personas fueron inscritas") +
      " en la sesion.",
    completados:
      count +
      " " +
      (count === 1 ? "entrenamiento fue completado" : "entrenamientos fueron completados") +
      " y sus ProbocaCoins quedaron registradas.",
    cancelados:
      count +
      " " +
      (count === 1 ? "inscripcion fue cancelada" : "inscripciones fueron canceladas") +
      ".",
    participante_activado: "La persona volvio a quedar disponible para entrenamientos y movimientos.",
    participante_retirado: "La persona fue retirada del directorio activo sin perder su historial.",
    participante_eliminado: "El registro inactivo y sin historial fue eliminado definitivamente."
  };
  const errorMessages: Record<string, string> = {
    programa: "Revisa el nombre y asigna un valor mayor a cero.",
    programa_duplicado: "Ya existe un entrenamiento con ese nombre.",
    sesion: "Selecciona un entrenamiento activo y una fecha valida.",
    planta_area: "La planta y el area seleccionadas no corresponden entre si.",
    participante: "La persona seleccionada ya no existe o no esta disponible.",
    participante_duplicado: "El numero de empleado ya pertenece a otra persona.",
    empleado_formato: "Usa de 1 a 5 digitos para el numero de empleado. Si escribes 123, se guardara como 00123.",
    participante_historial: "Esta persona tiene ideas, entrenamientos o movimientos. Debe permanecer archivada para conservar la trazabilidad.",
    cuenta_vinculada: "Esta persona tiene una cuenta de acceso. Administrala desde Configuracion > Usuarios.",
    inscripcion: "Selecciona al menos una persona disponible para la sesion.",
    ya_completado: "Esa persona ya completo el entrenamiento.",
    estado: "No fue posible cambiar el estado de las inscripciones.",
    sin_pendientes: "No hay inscripciones pendientes que coincidan con la seleccion.",
    completado_no_cancelable: "Un entrenamiento completado conserva su premio. Registra un ajuste financiero si necesitas corregirlo."
  };
  return {
    error: query.error ? errorMessages[query.error] ?? "Revisa la informacion capturada." : null,
    success: query.success ? successMessages[query.success] ?? "Cambio guardado correctamente." : null
  };
}

export default async function TrainingPage({ searchParams }: TrainingPageProps) {
  const currentUser = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const query = await searchParams;
  const selectedSessionId = query.session || "";
  const activeView = selectedSessionId ? "operation" : trainingView(query.view);
  const activeDirectoryView = directoryView(query.directory);
  const sessionPage = positivePage(query.sessionPage);
  const rosterPage = positivePage(query.rosterPage);
  const peoplePage = positivePage(query.peoplePage);
  const sessionSearch = query.sessionQ?.trim() ?? "";
  const rosterSearch = query.rosterQ?.trim() ?? "";
  const peopleSearch = query.peopleQ?.trim() ?? "";
  const peopleActive = query.peopleStatus !== "inactive";
  const rosterStatus = Object.values(TrainingEnrollmentStatus).includes(
    query.rosterStatus as TrainingEnrollmentStatus
  )
    ? query.rosterStatus as TrainingEnrollmentStatus
    : undefined;
  const needsSetupData = activeView === "setup";
  const needsDirectoryPeople = activeView === "directory" && activeDirectoryView === "people";

  const sessionWhere: Prisma.TrainingSessionWhereInput = sessionSearch
    ? {
        OR: [
          { program: { name: { contains: sessionSearch } } },
          { trainerName: { contains: sessionSearch } },
          { notes: { contains: sessionSearch } }
        ]
      }
    : {};
  const peopleWhere: Prisma.ParticipantWhereInput = {
    active: peopleActive,
    ...(peopleSearch
      ? {
          OR: [
            { name: { contains: peopleSearch } },
            { employeeNumber: { contains: peopleSearch } },
            { email: { contains: peopleSearch } },
            { jobTitle: { contains: peopleSearch } }
          ]
        }
      : {})
  };

  const [
    programs,
    sessionCount,
    sessions,
    activeParticipantOptions,
    users,
    plants,
    orgUnits,
    completedEnrollments,
    registeredEnrollments,
    trainingCoinTotals,
    activeParticipantCount,
    peopleCount,
    directoryParticipants
  ] = await Promise.all([
    prisma.trainingProgram.findMany({
      include: { _count: { select: { sessions: true } } },
      orderBy: [{ active: "desc" }, { name: "asc" }]
    }),
    prisma.trainingSession.count({ where: sessionWhere }),
    activeView === "operation"
      ? prisma.trainingSession.findMany({
          where: sessionWhere,
          include: {
            program: true,
            plant: true,
            orgUnit: true,
            _count: { select: { enrollments: true } }
          },
          orderBy: [{ sessionDate: "desc" }, { createdAt: "desc" }],
          skip: (sessionPage - 1) * sessionPageSize,
          take: sessionPageSize
        })
      : Promise.resolve([]),
    selectedSessionId
      ? prisma.participant.findMany({
          where: { active: true },
          select: {
            id: true,
            name: true,
            employeeNumber: true,
            email: true,
            orgUnit: { select: { name: true, plant: { select: { code: true } } } }
          },
          orderBy: { name: "asc" }
        })
      : Promise.resolve([]),
    needsSetupData
      ? prisma.user.findMany({
          where: { active: true },
          include: { participant: { select: { id: true } } },
          orderBy: { name: "asc" }
        })
      : Promise.resolve([]),
    needsSetupData
      ? prisma.plant.findMany({ where: { active: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    needsSetupData
      ? prisma.orgUnit.findMany({
          where: { active: true },
          include: { plant: { select: { code: true } } },
          orderBy: [{ plant: { code: "asc" } }, { name: "asc" }]
        })
      : Promise.resolve([]),
    prisma.trainingEnrollment.count({ where: { status: "COMPLETED" } }),
    prisma.trainingEnrollment.count({ where: { status: "REGISTERED" } }),
    prisma.trainingEnrollment.aggregate({ _sum: { coinsAwarded: true } }),
    prisma.participant.count({ where: { active: true } }),
    needsDirectoryPeople ? prisma.participant.count({ where: peopleWhere }) : Promise.resolve(0),
    needsDirectoryPeople
      ? prisma.participant.findMany({
          where: peopleWhere,
          include: {
            orgUnit: { select: { name: true, code: true, plant: { select: { code: true } } } },
            user: { select: { id: true, email: true, active: true } },
            _count: { select: { ideas: true, enrollments: true, coinTransactions: true } }
          },
          orderBy: { name: "asc" },
          skip: (peoplePage - 1) * peoplePageSize,
          take: peoplePageSize
        })
      : Promise.resolve([])
  ]);

  const statusSessionIds = Array.from(
    new Set(sessions.map((session) => session.id).concat(selectedSessionId ? [selectedSessionId] : []))
  );
  const sessionGroups = statusSessionIds.length
    ? await prisma.trainingEnrollment.groupBy({
        by: ["sessionId", "status"],
        where: { sessionId: { in: statusSessionIds } },
        _count: { _all: true }
      })
    : [];
  const sessionStatusCounts = new Map(
    sessionGroups.map((row) => [row.sessionId + ":" + row.status, row._count._all])
  );

  const selectedSession = selectedSessionId
    ? await prisma.trainingSession.findUnique({
        where: { id: selectedSessionId },
        include: { program: true, plant: true, orgUnit: true }
      })
    : null;

  let rosterRows: Array<{
    id: string;
    coinsAwarded: number;
    status: TrainingEnrollmentStatus;
    participant: { name: string; employeeNumber: string | null; email: string | null };
  }> = [];
  let rosterCount = 0;
  let pendingInSession = 0;
  let excludedParticipantIds = new Set<string>();
  if (selectedSession) {
    const rosterWhere: Prisma.TrainingEnrollmentWhereInput = {
      sessionId: selectedSession.id,
      ...(rosterStatus ? { status: rosterStatus } : {}),
      ...(rosterSearch
        ? {
            participant: {
              is: {
                OR: [
                  { name: { contains: rosterSearch } },
                  { employeeNumber: { contains: rosterSearch } },
                  { email: { contains: rosterSearch } }
                ]
              }
            }
          }
        : {})
    };
    const [count, rows, pending, unavailable] = await Promise.all([
      prisma.trainingEnrollment.count({ where: rosterWhere }),
      prisma.trainingEnrollment.findMany({
        where: rosterWhere,
        include: {
          participant: { select: { name: true, employeeNumber: true, email: true } }
        },
        orderBy: { participant: { name: "asc" } },
        skip: (rosterPage - 1) * rosterPageSize,
        take: rosterPageSize
      }),
      prisma.trainingEnrollment.count({
        where: {
          sessionId: selectedSession.id,
          status: TrainingEnrollmentStatus.REGISTERED
        }
      }),
      prisma.trainingEnrollment.findMany({
        where: {
          sessionId: selectedSession.id,
          status: { not: TrainingEnrollmentStatus.CANCELLED }
        },
        select: { participantId: true }
      })
    ]);
    rosterCount = count;
    rosterRows = rows;
    pendingInSession = pending;
    excludedParticipantIds = new Set(unavailable.map((enrollment) => enrollment.participantId));
  }

  const availableParticipants = activeParticipantOptions
    .filter((participant) => !excludedParticipantIds.has(participant.id))
    .map((participant) => ({
      id: participant.id,
      name: participant.name,
      employeeNumber: participant.employeeNumber,
      email: participant.email,
      area: participant.orgUnit?.name ?? "Sin area",
      plant: participant.orgUnit?.plant.code ?? "General"
    }));
  const balances = needsDirectoryPeople
    ? await getParticipantBalances(directoryParticipants.map((participant) => participant.id))
    : new Map<string, number>();
  const unlinkedUsers = users.filter((user) => !user.participant);
  const messages = messageFor(query);
  const trainingCoins = trainingCoinTotals._sum.coinsAwarded ?? 0;
  const selectedCompleted = selectedSession
    ? sessionStatusCounts.get(selectedSession.id + ":COMPLETED") ?? 0
    : 0;
  const selectedCancelled = selectedSession
    ? sessionStatusCounts.get(selectedSession.id + ":CANCELLED") ?? 0
    : 0;
  const selectedTotal = selectedCompleted + pendingInSession + selectedCancelled;
  const potentialCoins = selectedSession ? pendingInSession * selectedSession.program.coinValue : 0;

  return (
    <>
      <PageHeader
        eyebrow="Desarrollo de personas - ProbocaCoins"
        title="Entrenamientos"
        description="Opera sesiones, asistencia y recompensas desde un solo espacio."
        actions={
          <Link className="btn btn-secondary" href="/probocacoins">
            <WalletCards className="h-4 w-4" aria-hidden />
            Ver finanzas
          </Link>
        }
      />

      {messages.error ? (
        <div className="alert alert-danger mb-5">
          <Ban className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <span className="font-bold">{messages.error}</span>
        </div>
      ) : null}
      {messages.success ? (
        <div className="alert alert-success mb-5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <span className="font-bold">{messages.success}</span>
        </div>
      ) : null}

      {/*
        Una sola barra. Antes eran dos anidadas —la de arriba abria "Programas y personas"
        y adentro aparecia otra con Programas y Personas—, asi que llegar al catalogo
        costaba dos clics en dos niveles distintos. Subir las dos subpestanas aqui quita un
        nivel entero de navegacion sin tocar los datos que carga cada vista.
      */}
      <nav
        aria-label="Vistas de entrenamientos"
        className="mb-6 flex overflow-x-auto border-b border-line"
      >
        <WorkspaceTab
          active={activeView === "operation"}
          count={registeredEnrollments}
          href="/entrenamientos?view=operation"
          icon={<ClipboardCheck className="h-4 w-4" aria-hidden />}
          label="Sesiones"
        />
        <WorkspaceTab
          active={activeView === "setup"}
          href="/entrenamientos?view=setup"
          icon={<Plus className="h-4 w-4" aria-hidden />}
          label="Preparar"
        />
        <WorkspaceTab
          active={activeView === "directory" && activeDirectoryView === "programs"}
          count={programs.length}
          href="/entrenamientos?view=directory&directory=programs"
          icon={<Award className="h-4 w-4" aria-hidden />}
          label="Programas"
        />
        <WorkspaceTab
          active={activeView === "directory" && activeDirectoryView === "people"}
          count={activeParticipantCount}
          href="/entrenamientos?view=directory&directory=people"
          icon={<UsersRound className="h-4 w-4" aria-hidden />}
          label="Personas"
        />
      </nav>

      {activeView === "operation" ? (
        <>
          <section
            aria-label="Resumen de entrenamientos"
            className="mb-7 grid gap-3 border-y border-line py-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Metric
              icon={<BookOpenCheck className="h-4 w-4" aria-hidden />}
              label="Programas activos"
              value={programs.filter((program) => program.active).length}
              note={programs.length.toLocaleString("es-MX") + " configurados"}
            />
            <Metric
              icon={<CalendarDays className="h-4 w-4" aria-hidden />}
              label="Sesiones"
              value={sessionCount}
              note={registeredEnrollments.toLocaleString("es-MX") + " inscripciones pendientes"}
            />
            <Metric
              icon={<UsersRound className="h-4 w-4" aria-hidden />}
              label="Completados"
              value={completedEnrollments.toLocaleString("es-MX")}
              note={activeParticipantCount.toLocaleString("es-MX") + " personas activas"}
            />
            <Metric
              icon={<CircleDollarSign className="h-4 w-4" aria-hidden />}
              label="Entregadas"
              value={trainingCoins.toLocaleString("es-MX")}
              note="ProbocaCoins por entrenamientos"
            />
          </section>

          <section
            aria-label="Operacion de sesiones"
            className="grid min-w-0 gap-8 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)] xl:gap-0"
          >
            <div className="min-w-0 xl:border-r xl:border-line xl:pr-6">
              <SectionHeading
                count={sessionCount}
                title="Sesiones"
                description="Agenda y estado de asistencia."
              />
              <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]" method="get">
                <input name="view" type="hidden" value="operation" />
                <label>
                  <span className="sr-only">Buscar sesion</span>
                  <span className="relative block">
                    <Search
                      className="pointer-events-none absolute left-3 top-[14px] h-4 w-4 text-slate-400"
                      aria-hidden
                    />
                    <input
                      className="field pl-9"
                      defaultValue={sessionSearch}
                      name="sessionQ"
                      placeholder="Entrenamiento, instructor o nota"
                    />
                  </span>
                </label>
                <button className="btn btn-secondary" type="submit">
                  <Filter className="h-4 w-4" aria-hidden />
                  Buscar
                </button>
              </form>

              {!sessions.length ? (
                <div className="border-y border-dashed border-line px-4 py-10 text-center">
                  <CalendarDays className="mx-auto h-7 w-7 text-slate-400" aria-hidden />
                  <p className="mt-3 text-sm font-extrabold text-ink">No hay sesiones con estos filtros</p>
                  <Link className="btn btn-primary mt-4" href="/entrenamientos?view=setup">
                    <Plus className="h-4 w-4" aria-hidden />
                    Preparar sesion
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-line border-y border-line">
                  {sessions.map((session) => {
                    const completed = sessionStatusCounts.get(session.id + ":COMPLETED") ?? 0;
                    const pending = sessionStatusCounts.get(session.id + ":REGISTERED") ?? 0;
                    const cancelled = sessionStatusCounts.get(session.id + ":CANCELLED") ?? 0;
                    // Misma regla que Kaizen: lo cancelado tambien cierra, si no una sesion con
                    // bajas jamas llegaria al 100% y la barra contradiria al rotulo.
                    const resolved = completed + cancelled;
                    const enrolled = resolved + pending;
                    const isSelected = selectedSession?.id === session.id;
                    const href =
                      "/entrenamientos?view=operation&session=" +
                      session.id +
                      (sessionSearch ? "&sessionQ=" + encodeURIComponent(sessionSearch) : "");
                    return (
                      <Link
                        aria-current={isSelected ? "page" : undefined}
                        className={
                          "group grid min-h-[76px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-l-4 px-3 py-3 transition " +
                          (isSelected
                            ? "border-brand-500 bg-red-50"
                            : "border-transparent hover:border-slate-300 hover:bg-slate-50")
                        }
                        href={href}
                        key={session.id}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-extrabold text-ink">
                            {session.program.name}
                          </span>
                          <span className="mt-1 block truncate text-xs text-slate-500">
                            {formatDate(session.sessionDate)} - {session.plant?.code ?? "General"} -{" "}
                            {session.orgUnit?.name ?? "Todas las areas"}
                          </span>
                          {/* Tres numeros sueltos no contestaban la pregunta real de la
                              sesion: si ya se acabo. La barra la contesta de un vistazo. */}
                          {enrolled ? (
                            <span className="training-progress mt-2">
                              <span>
                                <i style={{ width: `${Math.round((resolved / enrolled) * 100)}%` }} />
                              </span>
                              <strong>{resolved}/{enrolled}</strong>
                              {pending ? <em>{pending} por cerrar</em> : <em className="is-done">Completa</em>}
                            </span>
                          ) : (
                            <span className="training-progress mt-2"><em>Sin inscritos</em></span>
                          )}
                        </span>
                        <ChevronRight
                          className={"h-4 w-4 " + (isSelected ? "text-brand-700" : "text-slate-400")}
                          aria-hidden
                        />
                      </Link>
                    );
                  })}
                </div>
              )}
              <Pagination
                currentPage={sessionPage}
                pageSize={sessionPageSize}
                path="/entrenamientos"
                query={{ view: "operation", sessionQ: sessionSearch || undefined }}
                totalItems={sessionCount}
                totalPages={Math.max(1, Math.ceil(sessionCount / sessionPageSize))}
                pageParam="sessionPage"
              />
            </div>

            <div className="min-w-0 xl:pl-6">
              <SectionHeading
                title="Operacion de sesion"
                description="Asistencia, inscripcion y ProbocaCoins."
                tone="red"
              />
              {selectedSession ? (
                <div className="min-w-0">
                  <div className="border-l-4 border-brand-500 bg-slate-950 px-4 py-4 text-white sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[11px] font-extrabold uppercase text-red-300">
                          Sesion seleccionada
                        </p>
                        <h3 className="mt-1 truncate text-xl font-extrabold">
                          {selectedSession.program.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-300">
                          {formatDate(selectedSession.sessionDate)} -{" "}
                          {selectedSession.plant?.code ?? "General"} -{" "}
                          {selectedSession.orgUnit?.name ?? "Todas las areas"}
                        </p>
                      </div>
                      <Link className="btn btn-secondary" href="/entrenamientos?view=operation">
                        <X className="h-4 w-4" aria-hidden />
                        Cerrar
                      </Link>
                    </div>
                  </div>

                  <div className="grid border-x border-b border-line sm:grid-cols-2 lg:grid-cols-4">
                    <div className="border-b border-line px-4 py-3 sm:border-r lg:border-b-0">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Inscritos</p>
                      <p className="mt-1 text-xl font-extrabold tabular-nums text-ink">{selectedTotal}</p>
                    </div>
                    <div className="border-b border-line px-4 py-3 lg:border-b-0 lg:border-r">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Pendientes</p>
                      <p className="mt-1 text-xl font-extrabold tabular-nums text-amber-700">
                        {pendingInSession}
                      </p>
                    </div>
                    <div className="border-b border-line px-4 py-3 sm:border-r sm:border-b-0">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Premio por persona</p>
                      <p className="mt-1 flex items-center gap-2 text-xl font-extrabold tabular-nums text-ink">
                        <ProbocaCoin size="sm" />
                        {selectedSession.program.coinValue}
                      </p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Por entregar</p>
                      <p className="mt-1 flex items-center gap-2 text-xl font-extrabold tabular-nums text-brand-700">
                        <ProbocaCoin size="sm" />
                        {potentialCoins.toLocaleString("es-MX")}
                      </p>
                    </div>
                  </div>

                  <details className="details-panel mt-5">
                    <summary>
                      <span className="flex min-w-0 items-center gap-2">
                        <UserPlus className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
                        <span className="truncate">Inscribir personas</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          {availableParticipants.length.toLocaleString("es-MX")} disponibles
                        </span>
                      </span>
                    </summary>
                    <div className="px-4 pb-4">
                      <ParticipantMultiSelect
                        action={bulkEnrollParticipantsAction}
                        participants={availableParticipants}
                        sessionId={selectedSession.id}
                      />
                    </div>
                  </details>

                  <div className="mt-6">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-base font-extrabold text-ink">Lista de asistencia</p>
                        <p className="text-xs text-slate-500">
                          {rosterCount.toLocaleString("es-MX")} resultados con los filtros actuales.
                        </p>
                      </div>
                    </div>
                    <form
                      className="mb-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_190px_auto]"
                      method="get"
                    >
                      <input name="view" type="hidden" value="operation" />
                      <input name="session" type="hidden" value={selectedSession.id} />
                      <label>
                        <span className="sr-only">Buscar inscrito</span>
                        <span className="relative block">
                          <Search
                            className="pointer-events-none absolute left-3 top-[14px] h-4 w-4 text-slate-400"
                            aria-hidden
                          />
                          <input
                            className="field pl-9"
                            defaultValue={rosterSearch}
                            name="rosterQ"
                            placeholder="Nombre, numero o correo"
                          />
                        </span>
                      </label>
                      <label>
                        <span className="sr-only">Estado</span>
                        <select
                          className="field"
                          defaultValue={rosterStatus ?? ""}
                          name="rosterStatus"
                        >
                          <option value="">Todos los estados</option>
                          <option value="REGISTERED">Pendientes</option>
                          <option value="COMPLETED">Completados</option>
                          <option value="CANCELLED">Cancelados</option>
                        </select>
                      </label>
                      <button className="btn btn-secondary" type="submit">
                        <Filter className="h-4 w-4" aria-hidden />
                        Filtrar
                      </button>
                    </form>
                    {!rosterRows.length ? (
                      <p className="border-y border-line py-8 text-center text-sm text-slate-500">
                        No hay inscripciones con estos filtros.
                      </p>
                    ) : (
                      <TrainingAttendanceTable
                        action={bulkUpdateTrainingEnrollmentsAction}
                        enrollments={rosterRows}
                        pendingTotal={pendingInSession}
                        sessionId={selectedSession.id}
                      />
                    )}
                    <Pagination
                      currentPage={rosterPage}
                      pageSize={rosterPageSize}
                      path="/entrenamientos"
                      query={{
                        view: "operation",
                        session: selectedSession.id,
                        rosterQ: rosterSearch || undefined,
                        rosterStatus
                      }}
                      totalItems={rosterCount}
                      totalPages={Math.max(1, Math.ceil(rosterCount / rosterPageSize))}
                      pageParam="rosterPage"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[360px] flex-col items-center justify-center border-y border-dashed border-line px-6 text-center">
                  <ClipboardCheck className="h-9 w-9 text-slate-400" aria-hidden />
                  <p className="mt-4 text-base font-extrabold text-ink">Selecciona una sesion</p>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    La asistencia y el impacto de ProbocaCoins apareceran aqui.
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}

      {activeView === "setup" ? (
        <section aria-label="Preparar entrenamientos" className="mx-auto max-w-5xl">
          <SectionHeading
            title="Preparacion"
            description="Programas, sesiones y altas de participantes."
            tone="red"
          />
          <div className="grid gap-3">
            <details className="details-panel" open={!programs.length}>
              <summary>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-red-50 text-sm font-extrabold text-brand-700">
                    1
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-ink">Crear programa</span>
                    <span className="block truncate text-xs font-normal text-slate-500">
                      Nombre, valor y recompensa al completar
                    </span>
                  </span>
                </span>
              </summary>
              <form
                action={createTrainingProgramAction}
                className="grid gap-4 p-4 md:grid-cols-2"
              >
                <label>
                  <span className="label">Nombre del entrenamiento</span>
                  <input className="field" name="name" placeholder="Ej. White Belt" required />
                </label>
                <label>
                  <span className="label">ProbocaCoins al completar</span>
                  <input
                    className="field"
                    min={1}
                    name="coinValue"
                    placeholder="100"
                    required
                    type="number"
                  />
                </label>
                <label className="md:col-span-2">
                  <span className="label">Descripcion</span>
                  <textarea className="field min-h-20" name="description" />
                </label>
                <div className="md:col-span-2 md:flex md:justify-end">
                  <button className="btn btn-primary" type="submit">
                    <Plus className="h-4 w-4" aria-hidden />
                    Crear programa
                  </button>
                </div>
              </form>
            </details>

            <details
              className="details-panel"
              open={Boolean(programs.length && !sessionCount)}
            >
              <summary>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-red-50 text-sm font-extrabold text-brand-700">
                    2
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-ink">Programar sesion</span>
                    <span className="block truncate text-xs font-normal text-slate-500">
                      Fecha, instructor, planta y area
                    </span>
                  </span>
                </span>
              </summary>
              <form
                action={createTrainingSessionAction}
                className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3"
              >
                <label>
                  <span className="label">Entrenamiento</span>
                  <select className="field" name="programId" required>
                    <option value="">Seleccionar</option>
                    {programs
                      .filter((program) => program.active)
                      .map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.name} - {program.coinValue} coins
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <span className="label">Fecha</span>
                  <input className="field" name="sessionDate" required type="date" />
                </label>
                <label>
                  <span className="label">Instructor</span>
                  <input className="field" name="trainerName" />
                </label>
                <label>
                  <span className="label">Planta</span>
                  <select className="field" name="plantId">
                    <option value="">Sin planta especifica</option>
                    {plants.map((plant) => (
                      <option key={plant.id} value={plant.id}>
                        {plant.code} - {plant.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label">Area</span>
                  <select className="field" name="orgUnitId">
                    <option value="">General</option>
                    {orgUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.plant.code} - {unit.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label">Notas</span>
                  <textarea className="field min-h-16" name="notes" />
                </label>
                <div className="md:col-span-2 md:flex md:justify-end xl:col-span-3">
                  <button className="btn btn-primary" type="submit">
                    <Plus className="h-4 w-4" aria-hidden />
                    Crear sesion
                  </button>
                </div>
              </form>
            </details>

            <details
              className="details-panel"
              open={Boolean(programs.length && sessionCount && !activeParticipantCount)}
            >
              <summary>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-red-50 text-sm font-extrabold text-brand-700">
                    3
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-ink">Registrar persona</span>
                    <span className="block truncate text-xs font-normal text-slate-500">
                      Cuenta, numero de empleado y area
                    </span>
                  </span>
                </span>
              </summary>
              <form action={createParticipantAction} className="grid gap-4 p-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <SearchablePicker
                    label="Cuenta existente"
                    name="userId"
                    options={unlinkedUsers.map((user) => ({
                      value: user.id,
                      label: user.name,
                      description: user.email,
                      searchText: user.employeeNumber ?? ""
                    }))}
                    placeholder="Buscar cuenta por nombre o correo"
                    helpText="Si eliges una cuenta, los datos siguientes son opcionales."
                  />
                </div>
                <label>
                  <span className="label">Nombre completo</span>
                  <input
                    className="field"
                    name="name"
                    placeholder="Para colaboradores sin cuenta"
                  />
                </label>
                <label>
                  <span className="label">Numero de empleado</span>
                  <input
                    className="field"
                    inputMode="numeric"
                    maxLength={5}
                    name="employeeNumber"
                    pattern="[0-9]{1,5}"
                    placeholder="Ej. 00123"
                  />
                  <span className="helper-text">Hasta 5 digitos; 123 se guarda como 00123.</span>
                </label>
                <label>
                  <span className="label">Puesto</span>
                  <input className="field" name="jobTitle" />
                </label>
                <label>
                  <span className="label">Correo</span>
                  <input className="field" name="email" type="email" />
                </label>
                <label className="md:col-span-2">
                  <span className="label">Area</span>
                  <select className="field" name="orgUnitId">
                    <option value="">Sin area asignada</option>
                    {orgUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.plant.code} - {unit.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="md:col-span-2 md:flex md:justify-end">
                  <button className="btn btn-primary" type="submit">
                    <UserPlus className="h-4 w-4" aria-hidden />
                    Registrar persona
                  </button>
                </div>
              </form>
            </details>
          </div>
        </section>
      ) : null}

      {activeView === "directory" ? (
        <section aria-label="Programas y personas">
          {activeDirectoryView === "programs" ? (
            <div className="mx-auto max-w-5xl">
              <div className="hidden grid-cols-[minmax(0,1fr)_130px_130px_auto] gap-4 border-b border-line px-3 py-2 text-[11px] font-extrabold uppercase text-slate-500 md:grid">
                <span>Programa</span>
                <span>Sesiones</span>
                <span>ProbocaCoins</span>
                <span className="text-right">Estado</span>
              </div>
              <div className="divide-y divide-line border-b border-line">
                {programs.map((program) => (
                  <div
                    className="grid gap-3 px-3 py-4 md:grid-cols-[minmax(0,1fr)_130px_130px_auto] md:items-center"
                    key={program.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-ink">{program.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {program.description ?? "Sin descripcion"}
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-slate-600">
                      {program._count.sessions}
                      <span className="ml-1 text-xs font-normal md:hidden">sesiones</span>
                    </p>
                    <p className="flex items-center gap-2 text-sm font-extrabold tabular-nums text-ink">
                      <ProbocaCoin size="sm" />
                      {program.coinValue}
                    </p>
                    <form action={toggleTrainingProgramAction} className="md:text-right">
                      <input name="programId" type="hidden" value={program.id} />
                      <input name="active" type="hidden" value={String(!program.active)} />
                      <button className="btn btn-secondary" type="submit">
                        {program.active ? "Pausar" : "Activar"}
                      </button>
                    </form>
                  </div>
                ))}
                {!programs.length ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-bold text-slate-500">No hay programas registrados.</p>
                    <Link className="btn btn-primary mt-4" href="/entrenamientos?view=setup">
                      <Plus className="h-4 w-4" aria-hidden />
                      Crear programa
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div>
              <form
                className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_auto]"
                method="get"
              >
                <input name="view" type="hidden" value="directory" />
                <input name="directory" type="hidden" value="people" />
                <label>
                  <span className="sr-only">Buscar persona</span>
                  <span className="relative block">
                    <Search
                      className="pointer-events-none absolute left-3 top-[14px] h-4 w-4 text-slate-400"
                      aria-hidden
                    />
                    <input
                      className="field pl-9"
                      defaultValue={peopleSearch}
                      name="peopleQ"
                      placeholder="Nombre, numero o correo"
                    />
                  </span>
                </label>
                <label>
                  <span className="sr-only">Estado del participante</span>
                  <select
                    className="field"
                    defaultValue={peopleActive ? "active" : "inactive"}
                    name="peopleStatus"
                  >
                    <option value="active">Activos</option>
                    <option value="inactive">Retirados</option>
                  </select>
                </label>
                <button className="btn btn-secondary" type="submit">
                  <Filter className="h-4 w-4" aria-hidden />
                  Filtrar
                </button>
              </form>

              <div className="divide-y divide-line border-y border-line">
                {directoryParticipants.map((participant) => {
                  const historyCount =
                    participant._count.ideas +
                    participant._count.enrollments +
                    participant._count.coinTransactions;
                  const organization = participant.orgUnit
                    ? participant.orgUnit.plant.code + " / " + participant.orgUnit.name
                    : participant.jobTitle ?? "Sin area";
                  return (
                    <div className="flex flex-wrap items-center gap-3 px-2 py-3" key={participant.id}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-slate-950 text-xs font-extrabold text-white">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-44 flex-1">
                        <span className="block truncate text-sm font-extrabold text-ink">
                          {participant.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {participant.employeeNumber ??
                            participant.email ??
                            participant.user?.email ??
                            "Sin identificador"}{" "}
                          - {organization}
                        </span>
                      </span>
                      <Link
                        className="shrink-0 text-right"
                        href={"/probocacoins?participant=" + participant.id}
                      >
                        <span className="flex items-center justify-end gap-1.5 font-extrabold tabular-nums text-ink">
                          <ProbocaCoin size="sm" />
                          {(balances.get(participant.id) ?? 0).toLocaleString("es-MX")}
                        </span>
                        <span className="block text-[10px] font-bold uppercase text-slate-500">
                          Ver saldo
                        </span>
                      </Link>
                      {currentUser.role === "ADMIN" ? (
                        participant.user ? (
                          <Link
                            className="btn btn-secondary"
                            href={"/configuracion?user=" + participant.user.id + "#usuarios"}
                          >
                            Administrar acceso
                          </Link>
                        ) : (
                          <div className="flex gap-2">
                            <form action={updateParticipantActiveAction}>
                              <input name="participantId" type="hidden" value={participant.id} />
                              <input name="active" type="hidden" value={String(!participant.active)} />
                              <button className="btn btn-secondary" type="submit">
                                {participant.active ? (
                                  <>
                                    <UserMinus className="h-4 w-4" aria-hidden />
                                    Retirar
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="h-4 w-4" aria-hidden />
                                    Reactivar
                                  </>
                                )}
                              </button>
                            </form>
                            {!participant.active && !historyCount ? (
                              <form action={deleteInactiveParticipantAction}>
                                <input name="participantId" type="hidden" value={participant.id} />
                                <button
                                  className="icon-button text-rose-700"
                                  title="Eliminar definitivamente"
                                  type="submit"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden />
                                </button>
                              </form>
                            ) : null}
                          </div>
                        )
                      ) : null}
                    </div>
                  );
                })}
                {!directoryParticipants.length ? (
                  <p className="py-10 text-center text-sm text-slate-500">
                    No hay personas con estos filtros.
                  </p>
                ) : null}
              </div>
              <Pagination
                currentPage={peoplePage}
                pageSize={peoplePageSize}
                path="/entrenamientos"
                query={{
                  view: "directory",
                  directory: "people",
                  peopleQ: peopleSearch || undefined,
                  peopleStatus: peopleActive ? "active" : "inactive"
                }}
                totalItems={peopleCount}
                totalPages={Math.max(1, Math.ceil(peopleCount / peoplePageSize))}
                pageParam="peoplePage"
              />
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
