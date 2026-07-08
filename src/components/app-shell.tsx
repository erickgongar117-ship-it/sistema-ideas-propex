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
  Sparkles,
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
  tone: "dark" | "green" | "red" | "gray" | "blue";
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MEJORA_CONTINUA"], tone: "dark" },
  { href: "/supervisor", label: "Supervisor", icon: UserCheck, roles: ["ADMIN", "SUPERVISOR"], tone: "green" },
  { href: "/validaciones/calidad", label: "Calidad", icon: ShieldCheck, roles: ["ADMIN", "CALIDAD"], tone: "red" },
  { href: "/validaciones/seguridad", label: "Seguridad", icon: ClipboardCheck, roles: ["ADMIN", "SEGURIDAD"], tone: "gray" },
  { href: "/validaciones/mantenimiento", label: "Mantenimiento", icon: Wrench, roles: ["ADMIN", "MANTENIMIENTO"], tone: "blue" },
  { href: "/mejora", label: "Mejora Continua", icon: Gauge, roles: ["ADMIN", "MEJORA_CONTINUA"], tone: "dark" },
  { href: "/implementacion", label: "Implementacion", icon: ListChecks, roles: ["ADMIN", "MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR"], tone: "blue" },
  { href: "/ideas", label: "Tabla maestra", icon: ClipboardList, roles: ["ADMIN", "MEJORA_CONTINUA"], tone: "dark" },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare, roles: ["ADMIN", "MEJORA_CONTINUA"], tone: "dark" },
  { href: "/qr", label: "QR por area", icon: QrCode, roles: ["ADMIN", "MEJORA_CONTINUA"], tone: "dark" },
  { href: "/reportes", label: "Reportes", icon: Download, roles: ["ADMIN", "MEJORA_CONTINUA"], tone: "dark" },
  { href: "/notificaciones", label: "Notificaciones", icon: Bell, roles: ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO"], tone: "dark" },
  { href: "/auditoria", label: "Auditoria", icon: BarChart3, roles: ["ADMIN", "MEJORA_CONTINUA"], tone: "dark" },
  { href: "/configuracion", label: "Configuracion", icon: Settings, roles: ["ADMIN"], tone: "dark" }
];

const roleTheme: Record<Role, { accent: string; badge: string; panel: string; label: string }> = {
  ADMIN: {
    accent: "bg-dept-mejora",
    badge: "bg-slate-950 text-white",
    panel: "border-slate-800 bg-slate-950 text-white",
    label: "Control total"
  },
  MEJORA_CONTINUA: {
    accent: "bg-dept-mejora",
    badge: "bg-slate-950 text-white",
    panel: "border-slate-800 bg-slate-950 text-white",
    label: "Seguimiento global"
  },
  SUPERVISOR: {
    accent: "bg-dept-supervisor",
    badge: "bg-emerald-100 text-emerald-900",
    panel: "border-emerald-200 bg-emerald-50 text-emerald-950",
    label: "Ideas de tu area"
  },
  CALIDAD: {
    accent: "bg-dept-calidad",
    badge: "bg-red-100 text-red-900",
    panel: "border-red-200 bg-red-50 text-red-950",
    label: "Validacion de inocuidad"
  },
  SEGURIDAD: {
    accent: "bg-dept-seguridad",
    badge: "bg-slate-200 text-slate-900",
    panel: "border-slate-300 bg-slate-100 text-slate-950",
    label: "Condiciones seguras"
  },
  MANTENIMIENTO: {
    accent: "bg-dept-mantenimiento",
    badge: "bg-blue-100 text-blue-900",
    panel: "border-blue-200 bg-blue-50 text-blue-950",
    label: "Soporte tecnico"
  },
  COLABORADOR: {
    accent: "bg-brand-500",
    badge: "bg-brand-100 text-brand-900",
    panel: "border-brand-100 bg-brand-50 text-brand-900",
    label: "Captura publica"
  }
};

const toneClass: Record<NavItem["tone"], string> = {
  dark: "text-slate-800 hover:border-slate-900 hover:bg-slate-950 hover:text-white",
  green: "text-emerald-800 hover:border-emerald-600 hover:bg-emerald-600 hover:text-white",
  red: "text-red-800 hover:border-red-600 hover:bg-red-600 hover:text-white",
  gray: "text-slate-700 hover:border-slate-500 hover:bg-slate-600 hover:text-white",
  blue: "text-blue-800 hover:border-blue-600 hover:bg-blue-600 hover:text-white"
};

export function AppShell({
  user,
  children,
  pendingNotifications
}: {
  user: User;
  children: React.ReactNode;
  pendingNotifications: number;
}) {
  const visibleNav = nav.filter((item) => item.roles.includes(user.role));
  const theme = roleTheme[user.role];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[304px_1fr]">
      <aside className="border-b border-line bg-white/95 backdrop-blur lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className={`h-1.5 ${theme.accent}`} />
        <div className="flex items-center justify-between gap-3 border-b border-line p-4 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-24 items-center justify-center rounded-lg border border-line bg-white p-2">
              <img alt="Proboca" className="max-h-10 max-w-full object-contain" src="/brand/proboca-logo.png" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-brand-700">PROpEx</p>
              <h1 className="text-lg font-black text-ink">Ideas de Mejora</h1>
            </div>
          </div>
          <form action={logoutAction} className="lg:hidden">
            <button className="btn btn-secondary" title="Cerrar sesion" type="submit">
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>

        <div className="border-b border-line p-4">
          <div className={`rounded-lg border p-4 ${theme.panel}`}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/80 text-slate-950">
                <Sparkles className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-black">{user.name}</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${theme.badge}`}>
                  {roleLabels[user.role]}
                </span>
                <p className="mt-2 text-xs font-bold opacity-80">{theme.label}</p>
                <Link className="mt-3 inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-black text-slate-950" href="/notificaciones">
                  {pendingNotifications} notificaciones pendientes
                </Link>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-2 lg:overflow-visible">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className={`flex shrink-0 items-center gap-3 rounded-lg border border-transparent bg-white px-3 py-3 text-sm font-black shadow-sm transition ${toneClass[item.tone]}`}
                href={item.href}
                key={item.href}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-current">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span>{item.label}</span>
                  {item.href === "/notificaciones" && pendingNotifications > 0 ? (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">{pendingNotifications}</span>
                  ) : null}
                </span>
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
