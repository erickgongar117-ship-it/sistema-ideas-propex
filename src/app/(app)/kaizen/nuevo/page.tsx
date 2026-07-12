import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderPlus, Save } from "lucide-react";
import { createKaizenProjectAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { requireKaizenAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

type NewKaizenProps = { searchParams: Promise<{ error?: string }> };

export default async function NewKaizenPage({ searchParams }: NewKaizenProps) {
  const { canManage } = await requireKaizenAccess();
  if (!canManage) redirect("/kaizen");
  const query = await searchParams;
  const users = await prisma.user.findMany({ where: { active: true, role: { not: "COLABORADOR" } }, orderBy: { name: "asc" } });
  const today = new Date();
  const defaultEnd = new Date(today.getTime() + 60 * 86400000);

  return (
    <>
      <PageHeader eyebrow="Proyectos Kaizen · Alta" title="Crear proyecto Kaizen" description="El folio se asignará automáticamente y la carpeta quedará en espera del Project Charter." actions={<Link className="btn btn-secondary" href="/kaizen"><ArrowLeft className="h-4 w-4" aria-hidden />Volver</Link>} />
      {query.error ? <div className="alert alert-danger mb-5">Revisa los campos y confirma que la fecha final sea posterior a la fecha de inicio.</div> : null}
      <form action={createKaizenProjectAction} className="surface overflow-hidden rounded-lg">
        <div className="border-l-4 border-amber-500 p-5 sm:p-6">
          <SectionHeading description="Nombre, objetivo y dueño del resultado." title="Definición del proyecto" tone="dark" />
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="lg:col-span-2"><span className="label">Nombre del Kaizen *</span><input className="field" name="title" placeholder="Ejemplo: Reducir tiempos de cambio en P1" required /></label>
            <label><span className="label">Planta</span><select className="field" defaultValue="Apodaca" name="plant"><option>Apodaca</option><option>El Carmen</option><option>Otra</option></select></label>
            <label><span className="label">Área / proceso *</span><input className="field" name="area" placeholder="Línea, departamento o proceso" required /></label>
            <label className="lg:col-span-2"><span className="label">Objetivo *</span><textarea className="field min-h-24" name="objective" placeholder="Resultado concreto que se busca alcanzar" required /></label>
            <label className="lg:col-span-2"><span className="label">Alcance</span><textarea className="field min-h-20" name="scope" placeholder="Qué incluye y qué no incluye el proyecto" /></label>
            <label><span className="label">Líder / responsable *</span><select className="field" name="leaderId" required defaultValue=""><option value="">Seleccionar</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3"><label><span className="label">Inicio *</span><input className="field" defaultValue={today.toISOString().slice(0, 10)} name="startDate" type="date" required /></label><label><span className="label">Cierre esperado *</span><input className="field" defaultValue={defaultEnd.toISOString().slice(0, 10)} name="endDate" type="date" required /></label></div>
          </div>
        </div>

        <div className="border-t border-line p-5 sm:p-6">
          <SectionHeading description="Campos tomados del control actual de Kaizen; pueden completarse después." title="Indicador y beneficio" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label><span className="label">Valor actual</span><input className="field" name="baselineValue" step="any" type="number" /></label>
            <label><span className="label">Meta</span><input className="field" name="targetValue" step="any" type="number" /></label>
            <label><span className="label">Resultado real</span><input className="field" name="currentValue" step="any" type="number" /></label>
            <label><span className="label">Unidad</span><input className="field" name="unit" placeholder="%, minutos, kg, MOD..." /></label>
            <label><span className="label">Ahorro estimado</span><input className="field" min="0" name="estimatedSavings" step="any" type="number" /></label>
            <label><span className="label">Ahorro real</span><input className="field" min="0" name="realSavings" step="any" type="number" /></label>
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-line bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><FolderPlus className="h-5 w-5 text-amber-300" aria-hidden /><p className="text-sm font-bold">Se generará el siguiente número Kaizen disponible.</p></div>
          <button className="btn bg-amber-500 text-slate-950 hover:bg-amber-400" type="submit"><Save className="h-4 w-4" aria-hidden />Crear carpeta Kaizen</button>
        </footer>
      </form>
    </>
  );
}
