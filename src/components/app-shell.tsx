import {
  BarChart3,
  Bell,
  ClipboardCheck,
  ClipboardList,
  Download,
  Gauge,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  LogOut,
  QrCode,
  Settings,
  ShieldCheck,
  UserCheck,
  Wrench
} from "lucide-react";
import Link from "next/link";
import type { User } from "@prisma/client";
import { logoutAction } from "@/app/actions";
import { roleLabels } from "@/lib/domain";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/supervisor", label: "Supervisor", icon: UserCheck },
  { href: "/validaciones/calidad", label: "Calidad", icon: ShieldCheck },
  { href: "/validaciones/seguridad", label: "Seguridad", icon: ClipboardCheck },
  { href: "/validaciones/mantenimiento", label: "Mantenimiento", icon: Wrench },
  { href: "/mejora", label: "Mejora Continua", icon: Gauge },
  { href: "/implementacion", label: "Implementacion", icon: ListChecks },
  { href: "/ideas", label: "Tabla maestra", icon: ClipboardList },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/qr", label: "QR por area", icon: QrCode },
  { href: "/reportes", label: "Reportes", icon: Download },
  { href: "/notificaciones", label: "Notificaciones", icon: Bell },
  { href: "/auditoria", label: "Auditoria", icon: BarChart3 },
  { href: "/configuracion", label: "Configuracion", icon: Settings }
];

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-line bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 border-b border-line p-4 lg:block">
          <div>
            <p className="text-xs font-bold uppercase text-brand-700">PROpEx</p>
            <h1 className="text-lg font-black text-ink">Ideas de Mejora</h1>
          </div>
          <form action={logoutAction} className="lg:hidden">
            <button className="btn btn-secondary" title="Cerrar sesion" type="submit">
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>

        <div className="border-b border-line p-4">
          <p className="text-sm font-bold text-ink">{user.name}</p>
          <p className="text-xs text-slate-600">{roleLabels[user.role]}</p>
        </div>

        <nav className="flex gap-1 overflow-x-auto p-3 lg:block lg:space-y-1 lg:overflow-visible">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                href={item.href}
                key={item.href}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <form action={logoutAction} className="hidden p-4 lg:block">
          <button className="btn btn-secondary w-full" type="submit">
            <LogOut className="h-4 w-4" aria-hidden />
            Cerrar sesion
          </button>
        </form>
      </aside>

      <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
