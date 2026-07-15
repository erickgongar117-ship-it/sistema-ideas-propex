import Link from "next/link";
import { AlertTriangle, Bell, Download, FileSpreadsheet, Play } from "lucide-react";
import { runRemindersAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const [ideaCount, notificationCount, overdueCount] = await Promise.all([
    prisma.idea.count(),
    prisma.notificationOutbox.count({ where: { status: { in: ["PENDING", "ERROR"] } } }),
    prisma.idea.count({ where: { status: "VENCIDA" } })
  ]);

  const tools = [
    { title: "Base completa de ideas", value: ideaCount, detail: "Incluye validaciones, responsables, fechas, ProbocaCoins y comentarios.", icon: FileSpreadsheet, color: "bg-emerald-50 text-emerald-700", action: <Link className="btn btn-primary w-full" href="/api/export"><Download className="h-4 w-4" aria-hidden />Descargar Excel</Link> },
    { title: "Notificaciones pendientes", value: notificationCount, detail: "Mensajes pendientes o que requieren un nuevo intento.", icon: Bell, color: "bg-blue-50 text-blue-700", action: <Link className="btn btn-secondary w-full" href="/notificaciones">Abrir notificaciones</Link> },
    { title: "Compromisos vencidos", value: overdueCount, detail: "Ejecuta la revisión para actualizar semáforos y generar avisos.", icon: AlertTriangle, color: "bg-rose-50 text-rose-700", action: <form action={runRemindersAction}><button className="btn btn-secondary w-full" type="submit"><Play className="h-4 w-4" aria-hidden />Revisar vencimientos</button></form> }
  ];

  return (
    <>
      <PageHeader eyebrow="Herramientas · Información y control" title="Reportes y automatizaciones" description="Descarga la información del programa y ejecuta tareas de seguimiento." />
      <section className="grid gap-4 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <article className="surface flex min-h-[270px] flex-col rounded-lg p-5" key={tool.title}>
              <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${tool.color}`}><Icon className="h-5 w-5" aria-hidden /></span>
              <h2 className="mt-5 text-base font-extrabold text-ink">{tool.title}</h2>
              <p className="mt-2 text-4xl font-extrabold text-ink">{tool.value}</p>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{tool.detail}</p>
              <div className="mt-5">{tool.action}</div>
            </article>
          );
        })}
      </section>
    </>
  );
}
