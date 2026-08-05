import Link from "next/link";
import {
  Award,
  Ban,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Plus,
  UserPlus,
  UsersRound,
  WalletCards
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProbocaCoin } from "@/components/proboca-coin";
import { SectionHeading } from "@/components/section-heading";
import { requireUser } from "@/lib/auth";
import { getParticipantBalances } from "@/lib/coins";
import { prisma } from "@/lib/prisma";
import {
  createParticipantAction,
  createTrainingProgramAction,
  createTrainingSessionAction,
  enrollParticipantAction,
  toggleTrainingProgramAction,
  updateTrainingEnrollmentStatusAction
} from "./actions";

type TrainingPageProps = {
  searchParams: Promise<{
    error?: string;
    participant?: string;
    session?: string;
    success?: string;
  }>;
};

const successMessages: Record<string, string> = {
  programa: "El entrenamiento quedo disponible para crear sesiones.",
  programa_activado: "El entrenamiento volvio a quedar activo.",
  programa_pausado: "El entrenamiento se pauso sin perder su historial.",
  sesion: "La sesion fue creada correctamente.",
  participante: "La persona quedo registrada en el directorio de ProbocaCoins.",
  inscripcion: "La persona fue agregada a la sesion.",
  completado: "Entrenamiento completado y ProbocaCoins entregadas automaticamente.",
  cancelado: "La inscripcion fue cancelada sin otorgar ProbocaCoins."
};

const errorMessages: Record<string, string> = {
  programa: "Revisa el nombre y asigna un valor mayor a cero.",
  programa_duplicado: "Ya existe un entrenamiento con ese nombre.",
  sesion: "Selecciona un entrenamiento activo y una fecha valida.",
  planta_area: "La planta y el area seleccionadas no corresponden entre si.",
  participante_duplicado: "El numero de empleado ya pertenece a otra persona.",
  inscripcion: "No fue posible registrar a la persona en esta sesion.",
  ya_completado: "Esa persona ya completo el entrenamiento.",
  estado: "No fue posible cambiar el estado de la inscripcion.",
  completado_no_cancelable: "Una inscripcion completada conserva su premio. Registra un ajuste en ProbocaCoins si necesitas corregirla."
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(value);
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string | number; note: string }) {
  return (
    <div className="border-l-2 border-brand-500 px-4 py-2">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-500">{icon}{label}</div>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function EnrollmentStatus({ status }: { status: "REGISTERED" | "COMPLETED" | "CANCELLED" }) {
  const styles = status === "COMPLETED"
    ? "bg-emerald-50 text-emerald-800"
    : status === "CANCELLED"
      ? "bg-slate-100 text-slate-600"
      : "bg-amber-50 text-amber-800";
  const label = status === "COMPLETED" ? "Completado" : status === "CANCELLED" ? "Cancelado" : "Inscrito";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${styles}`}>{label}</span>;
}

export default async function TrainingPage({ searchParams }: TrainingPageProps) {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const query = await searchParams;
  const [programs, sessions, participants, users, plants, orgUnits, completedEnrollments, registeredEnrollments, trainingCoinTotals] = await Promise.all([
    prisma.trainingProgram.findMany({
      include: { _count: { select: { sessions: true } } },
      orderBy: [{ active: "desc" }, { name: "asc" }]
    }),
    prisma.trainingSession.findMany({
      include: {
        program: true,
        plant: true,
        orgUnit: true,
        enrollments: {
          include: { participant: true },
          orderBy: { participant: { name: "asc" } }
        }
      },
      orderBy: [{ sessionDate: "desc" }, { createdAt: "desc" }],
      take: 60
    }),
    prisma.participant.findMany({
      where: { active: true },
      include: {
        orgUnit: { select: { name: true, code: true } },
        user: { select: { email: true } },
        _count: { select: { enrollments: true } }
      },
      orderBy: { name: "asc" }
    }),
    prisma.user.findMany({
      where: { active: true },
      include: { participant: { select: { id: true } } },
      orderBy: { name: "asc" }
    }),
    prisma.plant.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.orgUnit.findMany({
      where: { active: true },
      include: { plant: { select: { code: true } } },
      orderBy: [{ plant: { code: "asc" } }, { name: "asc" }]
    }),
    prisma.trainingEnrollment.count({ where: { status: "COMPLETED" } }),
    prisma.trainingEnrollment.count({ where: { status: "REGISTERED" } }),
    prisma.trainingEnrollment.aggregate({ _sum: { coinsAwarded: true } })
  ]);

  const balances = await getParticipantBalances(participants.map((participant) => participant.id));
  const trainingCoins = trainingCoinTotals._sum.coinsAwarded ?? 0;
  const unlinkedUsers = users.filter((user) => !user.participant);
  const errorMessage = query.error ? errorMessages[query.error] ?? "Revisa la informacion capturada." : null;
  const successMessage = query.success ? successMessages[query.success] ?? "Cambio guardado correctamente." : null;

  return (
    <>
      <PageHeader
        eyebrow="Desarrollo de personas - ProbocaCoins"
        title="Entrenamientos"
        description="Programa sesiones, registra participantes y entrega ProbocaCoins al confirmar cada entrenamiento."
        actions={<Link className="btn btn-secondary" href="/probocacoins"><WalletCards className="h-4 w-4" aria-hidden />Ver finanzas</Link>}
      />

      {errorMessage ? <div className="alert alert-danger mb-5"><Ban className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{errorMessage}</span></div> : null}
      {successMessage ? <div className="alert alert-success mb-5"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{successMessage}</span></div> : null}

      <section className="mb-7 grid gap-3 border-y border-line py-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de entrenamientos">
        <Metric icon={<BookOpenCheck className="h-4 w-4" aria-hidden />} label="Programas" value={programs.filter((program) => program.active).length} note={`${programs.length} configurados`} />
        <Metric icon={<CalendarDays className="h-4 w-4" aria-hidden />} label="Sesiones" value={sessions.length} note={`${registeredEnrollments} inscripciones pendientes`} />
        <Metric icon={<UsersRound className="h-4 w-4" aria-hidden />} label="Completados" value={completedEnrollments} note={`${participants.length} personas en directorio`} />
        <Metric icon={<CircleDollarSign className="h-4 w-4" aria-hidden />} label="Entregadas" value={trainingCoins.toLocaleString("es-MX")} note="ProbocaCoins por entrenamientos" />
      </section>

      <section className="mb-8" aria-labelledby="training-setup-title">
        <SectionHeading
          title="Preparar entrenamiento"
          description="Configura el catalogo, la fecha y las personas antes de tomar asistencia."
          tone="red"
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <details className="details-panel" open={!programs.length}>
            <summary><span className="flex items-center gap-2"><Award className="h-4 w-4 text-brand-700" aria-hidden />Nuevo programa</span></summary>
            <form action={createTrainingProgramAction} className="grid gap-3 p-4">
              <label><span className="label">Nombre del entrenamiento</span><input className="field" name="name" placeholder="Ej. White Belt" required /></label>
              <label><span className="label">Descripcion</span><textarea className="field min-h-20" name="description" placeholder="Competencia o alcance del entrenamiento" /></label>
              <label><span className="label">ProbocaCoins al completar</span><input className="field" min={1} name="coinValue" placeholder="100" required type="number" /></label>
              <button className="btn btn-primary" type="submit"><Plus className="h-4 w-4" aria-hidden />Crear programa</button>
            </form>
          </details>

          <details className="details-panel" open={Boolean(programs.length && !sessions.length)}>
            <summary><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand-700" aria-hidden />Nueva sesion</span></summary>
            <form action={createTrainingSessionAction} className="grid gap-3 p-4">
              <label><span className="label">Entrenamiento</span><select className="field" name="programId" required><option value="">Seleccionar</option>{programs.filter((program) => program.active).map((program) => <option key={program.id} value={program.id}>{program.name} - {program.coinValue} coins</option>)}</select></label>
              <label><span className="label">Fecha</span><input className="field" name="sessionDate" required type="date" /></label>
              <label><span className="label">Instructor</span><input className="field" name="trainerName" placeholder="Nombre del instructor" /></label>
              <label><span className="label">Planta</span><select className="field" name="plantId"><option value="">Sin planta especifica</option>{plants.map((plant) => <option key={plant.id} value={plant.id}>{plant.code} - {plant.name}</option>)}</select></label>
              <label><span className="label">Area</span><select className="field" name="orgUnitId"><option value="">General</option>{orgUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.plant.code} - {unit.name}</option>)}</select></label>
              <label><span className="label">Notas</span><textarea className="field min-h-16" name="notes" /></label>
              <button className="btn btn-primary" type="submit"><Plus className="h-4 w-4" aria-hidden />Crear sesion</button>
            </form>
          </details>

          <details className="details-panel" open={!participants.length}>
            <summary><span className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-brand-700" aria-hidden />Registrar persona</span></summary>
            <form action={createParticipantAction} className="grid gap-3 p-4">
              <label><span className="label">Cuenta existente</span><select className="field" name="userId"><option value="">Registrar colaborador sin acceso</option>{unlinkedUsers.map((user) => <option key={user.id} value={user.id}>{user.name} - {user.email}</option>)}</select><span className="helper-text">Si eliges una cuenta, los datos siguientes son opcionales.</span></label>
              <label><span className="label">Nombre completo</span><input className="field" name="name" placeholder="Para colaboradores sin cuenta" /></label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <label><span className="label">Numero de empleado</span><input className="field" name="employeeNumber" /></label>
                <label><span className="label">Puesto</span><input className="field" name="jobTitle" /></label>
              </div>
              <label><span className="label">Correo</span><input className="field" name="email" type="email" /></label>
              <label><span className="label">Area</span><select className="field" name="orgUnitId"><option value="">Sin area asignada</option>{orgUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.plant.code} - {unit.name}</option>)}</select></label>
              <button className="btn btn-primary" type="submit"><UserPlus className="h-4 w-4" aria-hidden />Registrar persona</button>
            </form>
          </details>
        </div>
      </section>

      <section className="mb-8" aria-labelledby="training-sessions-title">
        <SectionHeading count={sessions.length} title="Sesiones y asistencia" description="Abre una sesion para inscribir personas y confirmar sus resultados." />
        {!sessions.length ? (
          <div className="surface border-dashed p-8 text-center text-sm text-slate-500">Crea el primer programa y despues agenda una sesion.</div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((session, index) => {
              const enrolledIds = new Set(session.enrollments.map((enrollment) => enrollment.participantId));
              const availableParticipants = participants.filter((participant) => !enrolledIds.has(participant.id));
              const completed = session.enrollments.filter((enrollment) => enrollment.status === "COMPLETED").length;
              return (
                <details className="details-panel" key={session.id} open={query.session === session.id || (!query.session && index === 0)}>
                  <summary>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold text-ink">{session.program.name}</span>
                      <span className="mt-0.5 block text-xs font-normal text-slate-500">{formatDate(session.sessionDate)} - {session.plant?.code ?? "General"} - {session.orgUnit?.name ?? "Todas las areas"}</span>
                    </span>
                    <span className="ml-auto hidden items-center gap-2 pr-2 sm:flex"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-700">{completed}/{session.enrollments.length} completados</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-800">{session.program.coinValue} coins</span></span>
                  </summary>
                  <div className="border-t border-line p-4">
                    <div className="mb-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-3">
                      <p><span className="label">Instructor</span>{session.trainerName ?? "Sin especificar"}</p>
                      <p><span className="label">Asistencia</span>{session.enrollments.length} personas</p>
                      <p><span className="label">Notas</span>{session.notes ?? "Sin notas"}</p>
                    </div>

                    <form action={enrollParticipantAction} className="mb-4 grid gap-2 border-y border-line py-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <input name="sessionId" type="hidden" value={session.id} />
                      <label><span className="label">Agregar participante</span><select className="field" disabled={!availableParticipants.length} name="participantId" required><option value="">{availableParticipants.length ? "Seleccionar persona" : "Todas las personas ya estan registradas"}</option>{availableParticipants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}{participant.employeeNumber ? ` - ${participant.employeeNumber}` : ""}</option>)}</select></label>
                      <button className="btn btn-secondary" disabled={!availableParticipants.length} type="submit"><Plus className="h-4 w-4" aria-hidden />Inscribir</button>
                    </form>

                    {!session.enrollments.length ? <p className="py-4 text-center text-sm text-slate-500">Aun no hay participantes en esta sesion.</p> : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                          <thead className="border-b border-line text-[10px] font-extrabold uppercase text-slate-500"><tr><th className="px-2 py-2">Persona</th><th className="px-2 py-2">Estado</th><th className="px-2 py-2 text-right">ProbocaCoins</th><th className="px-2 py-2 text-right">Acciones</th></tr></thead>
                          <tbody className="divide-y divide-line">
                            {session.enrollments.map((enrollment) => (
                              <tr key={enrollment.id}>
                                <td className="px-2 py-3"><p className="font-extrabold text-ink">{enrollment.participant.name}</p><p className="text-xs text-slate-500">{enrollment.participant.employeeNumber ?? enrollment.participant.email ?? "Sin identificador"}</p></td>
                                <td className="px-2 py-3"><EnrollmentStatus status={enrollment.status} /></td>
                                <td className="px-2 py-3 text-right font-extrabold tabular-nums text-ink">{enrollment.coinsAwarded || "-"}</td>
                                <td className="px-2 py-3">
                                  <div className="flex justify-end gap-2">
                                    {enrollment.status === "REGISTERED" ? <>
                                      <form action={updateTrainingEnrollmentStatusAction}><input name="enrollmentId" type="hidden" value={enrollment.id} /><input name="status" type="hidden" value="COMPLETED" /><button className="btn btn-success" type="submit"><CheckCircle2 className="h-4 w-4" aria-hidden />Completar</button></form>
                                      <form action={updateTrainingEnrollmentStatusAction}><input name="enrollmentId" type="hidden" value={enrollment.id} /><input name="status" type="hidden" value="CANCELLED" /><button className="btn btn-secondary" title="Cancelar inscripcion" type="submit"><Ban className="h-4 w-4" aria-hidden /></button></form>
                                    </> : null}
                                    {enrollment.status === "CANCELLED" ? <form action={enrollParticipantAction}><input name="sessionId" type="hidden" value={session.id} /><input name="participantId" type="hidden" value={enrollment.participantId} /><button className="btn btn-secondary" type="submit">Reactivar</button></form> : null}
                                    {enrollment.status === "COMPLETED" ? <span className="flex items-center gap-2 text-xs font-bold text-emerald-700"><ProbocaCoin size="sm" />Premio entregado</span> : null}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]" aria-labelledby="training-catalog-title">
        <div>
          <SectionHeading count={programs.length} title="Catalogo de entrenamientos" description="El valor se toma al momento de completar la inscripcion." />
          <div className="divide-y divide-line border-y border-line">
            {programs.map((program) => (
              <div className="flex items-center gap-4 py-3" key={program.id}>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-ink">{program.name}</p><p className="truncate text-xs text-slate-500">{program.description ?? "Sin descripcion"} - {program._count.sessions} sesiones</p></div>
                <span className="shrink-0 font-extrabold tabular-nums text-amber-700">{program.coinValue} coins</span>
                <form action={toggleTrainingProgramAction}><input name="programId" type="hidden" value={program.id} /><input name="active" type="hidden" value={String(!program.active)} /><button className="btn btn-secondary" type="submit">{program.active ? "Pausar" : "Activar"}</button></form>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionHeading count={participants.length} title="Directorio de participantes" description="Saldo consolidado sin importar el origen del premio." />
          <div className="max-h-[420px] divide-y divide-line overflow-y-auto border-y border-line">
            {participants.map((participant) => (
              <Link className="flex items-center gap-3 py-3 hover:bg-slate-50" href={`/probocacoins?participant=${participant.id}`} key={participant.id}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-slate-950 text-xs font-extrabold text-white">{participant.name.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-ink">{participant.name}</span><span className="block truncate text-xs text-slate-500">{participant.orgUnit?.name ?? participant.jobTitle ?? "Sin area"} - {participant._count.enrollments} inscripciones</span></span>
                <span className="shrink-0 text-right"><span className="block font-extrabold tabular-nums text-ink">{(balances.get(participant.id) ?? 0).toLocaleString("es-MX")}</span><span className="block text-[10px] font-bold uppercase text-slate-500">saldo</span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
