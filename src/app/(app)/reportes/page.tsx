import Link from "next/link";
import { Download, FileSpreadsheet } from "lucide-react";
import { runRemindersAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const [ideaCount, notificationCount, overdueCount] = await Promise.all([
    prisma.idea.count(),
    prisma.notificationOutbox.count({ where: { status: { in: ["PENDING", "ERROR"] } } }),
    prisma.idea.count({ where: { status: "VENCIDA" } })
  ]);

  return (
    <>
      <PageHeader title="Reportes y exportacion" description="Excel completo, notificaciones pendientes y recordatorios." />
      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface rounded-lg p-5">
          <FileSpreadsheet className="h-8 w-8 text-brand-500" aria-hidden />
          <h2 className="mt-3 text-lg font-black text-ink">Base completa</h2>
          <p className="mt-1 text-sm text-slate-600">{ideaCount} ideas disponibles para exportar.</p>
          <Link className="btn btn-primary mt-4 w-full" href="/api/export">
            <Download className="h-4 w-4" aria-hidden />
            Exportar Excel
          </Link>
        </div>
        <div className="surface rounded-lg p-5">
          <h2 className="text-lg font-black text-ink">Notificaciones</h2>
          <p className="mt-2 text-4xl font-black text-ink">{notificationCount}</p>
          <p className="text-sm text-slate-600">Pendientes o con error.</p>
          <Link className="btn btn-secondary mt-4 w-full" href="/notificaciones">
            Ver pendientes
          </Link>
        </div>
        <div className="surface rounded-lg p-5">
          <h2 className="text-lg font-black text-ink">Vencimientos</h2>
          <p className="mt-2 text-4xl font-black text-ink">{overdueCount}</p>
          <p className="text-sm text-slate-600">Ideas con semaforo rojo.</p>
          <form action={runRemindersAction} className="mt-4">
            <button className="btn btn-secondary w-full" type="submit">
              Ejecutar recordatorios
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
