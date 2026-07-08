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
import type { Role, User } from "@prisma/client";
import type { ComponentType } from "react";
import { logoutAction } from "@/app/actions";
import { roleLabels } from "@/lib/domain";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  roles: Role[];
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MEJORA_CONTINUA"] },
  { href: "/supervisor", label: "Supervisor", icon: UserCheck, roles: ["ADMIN", "SUPERVISOR"] },
  { href: "/validaciones/calidad", label: "Calidad", icon: ShieldCheck, roles: ["ADMIN", "CALIDAD"] },
  { href: "/validaciones/seguridad", label: "Seguridad", icon: ClipboardCheck, roles: ["ADMIN", "SEGURIDAD"] },
  { href: "/validaciones/mantenimiento", label: "Mantenimiento", icon: Wrench, roles: ["ADMIN", "MANTENIMIENTO"] },
  { href: "/mejora", label: "Mejora Continua", icon: Gauge, roles: ["ADMIN", "MEJORA_CONTINUA"] },
  { href: "/implementacion", label: "Implementacion", icon: ListChecks, roles: ["ADMIN", "MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR"] },
  { href: "/ideas", label: "Tabla maestra", icon: ClipboardList, roles: ["ADMIN", "MEJORA_CONTINUA"] },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare, roles: ["ADMIN", "MEJORA_CONTINUA"] },
  { href: "/qr", label: "QR por area", icon: QrCode, roles: ["ADMIN", "MEJORA_CONTINUA"] },
  { href: "/reportes", label: "Reportes", icon: Download, roles: ["ADMIN", "MEJORA_CONTINUA"] },
  { href: "/notificaciones", label: "Notificaciones", icon: Bell, roles: ["ADMIN", "MEJORA_CONTINUA"] },
  { href: "/auditoria", label: "Auditoria", icon: BarChart3, roles: ["ADMIN", "MEJORA_CONTINUA"] },
  { href: "/configuracion", label: "Configuracion", icon: Settings, roles: ["ADMIN"] }
];

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const visibleNav = nav.filter((item) => item.roles.includes(user.role));

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
          {visibleNav.map((item) => {
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
