import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Footprints, Save } from "lucide-react";
import { createGenbaWalkAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { genbaDepartments } from "@/lib/domain";
import { requireGenbaAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

type NewGenbaProps = { searchParams: Promise<{ error?: string }> };

export default async function NewGenbaPage({ searchParams }: NewGenbaProps) {
  const { canManage } = await requireGenbaAccess();
  if (!canManage) redirect("/genba");
  const query = await searchParams;
  const users = await prisma.user.findMany({ where: { active: true, role: { not: "COLABORADOR" } }, orderBy: { name: "asc" } });
  const today = new Date();
  const due = new Date(today.getTime() + 14 * 86400000);

  return (
    <>
      <PageHeader eyebrow="Recorridos GENBA · Registro" title="Crear recorrido GENBA" description="Registra el área, los departamentos presentes y las cinco actividades principales." actions={<Link className="btn btn-secondary" href="/genba"><ArrowLeft className="h-4 w-4" aria-hidden />Volver</Link>} />
      {query.error ? <div className="alert alert-danger mb-5">Completa los datos generales, selecciona departamentos y captura las cinco problemáticas principales.</div> : null}
      <form action={createGenbaWalkAction} className="space-y-5">
        <section className="surface rounded-lg p-5 sm:p-6">
          <SectionHeading description="Identificación del recorrido y responsable de coordinación." title="Datos del GENBA" tone="red" />
          <div className="grid gap-4 lg:grid-cols-2">
            <label><span className="label">Área / zona visitada *</span><input className="field" name="areaName" placeholder="Ejemplo: P1, Embarques, Sanidad" required /></label>
            <label><span className="label">Fecha del recorrido *</span><input className="field" defaultValue={today.toISOString().slice(0, 10)} name="visitDate" type="date" required /></label>
            <label><span className="label">Coordinador *</span><select className="field" defaultValue="" name="coordinatorId" required><option value="">Seleccionar</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <label><span className="label">Notas generales</span><input className="field" name="notes" placeholder="Enfoque, turno o contexto del recorrido" /></label>
          </div>
        </section>

        <section className="surface rounded-lg p-5 sm:p-6">
          <SectionHeading description="Esperado define el comité convocado; asistió calcula automáticamente el cumplimiento." title="Asistencia por departamento" />
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b border-line text-left text-xs uppercase text-slate-500"><th className="px-2 py-3">Departamento</th><th className="w-28 px-2 py-3 text-center">Esperado</th><th className="w-28 px-2 py-3 text-center">Asistió</th></tr></thead><tbody>{genbaDepartments.map((department) => <tr className="border-b border-line last:border-0" key={department}><td className="px-2 py-3 font-extrabold text-slate-700">{department}</td><td className="px-2 py-3 text-center"><input defaultChecked name="expectedDepartments" type="checkbox" value={department} /></td><td className="px-2 py-3 text-center"><input name="attendedDepartments" type="checkbox" value={department} /></td></tr>)}</tbody></table></div>
        </section>

        <section>
          <SectionHeading count={5} description="Puedes agregar actividades adicionales después de crear el recorrido." title="Cinco actividades principales" tone="red" />
          <div className="grid gap-4">
            {Array.from({ length: 5 }, (_, index) => {
              const number = index + 1;
              return <article className="surface rounded-lg p-4 sm:p-5" key={number}><div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-700 text-sm font-extrabold text-white">{number}</span><h2 className="text-sm font-extrabold text-ink">Hallazgo y acción</h2></div><div className="grid gap-3 lg:grid-cols-2"><label><span className="label">Problemática *</span><textarea className="field min-h-24" name={`problem-${number}`} placeholder="Qué condición o problema se observó" required /></label><label><span className="label">Acción propuesta</span><textarea className="field min-h-24" name={`action-${number}`} placeholder="Qué debe hacerse para atenderla" /></label><label><span className="label">Responsable</span><select className="field" defaultValue="" name={`ownerId-${number}`}><option value="">Sin asignar</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label><span className="label">Fecha compromiso</span><input className="field" defaultValue={due.toISOString().slice(0, 10)} name={`dueDate-${number}`} type="date" /></label></div></article>;
            })}
          </div>
        </section>

        <footer className="flex flex-col gap-3 rounded-lg bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Footprints className="h-5 w-5 text-red-300" aria-hidden /><p className="text-sm font-bold">Se asignará automáticamente el siguiente número GENBA.</p></div><button className="btn btn-brand" type="submit"><Save className="h-4 w-4" aria-hidden />Crear recorrido</button></footer>
      </form>
    </>
  );
}
