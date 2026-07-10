"use client";

import type { Role } from "@prisma/client";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Menu,
  QrCode,
  Settings,
  ShieldCheck,
  UserCheck,
  Wrench,
  X
} from "lucide-react";
import { logoutAction } from "@/app/actions";
import { roleLabels } from "@/lib/domain";

type ShellUser = {
  name: string;
  email: string;
  role: Role;
};

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  roles: Role[];
  group: "work" | "control" | "system";
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Panel general", shortLabel: "Inicio", icon: LayoutDashboard, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "work" },
  { href: "/supervisor", label: "Bandeja de supervisor", shortLabel: "Bandeja", icon: UserCheck, roles: ["ADMIN", "SUPERVISOR"], group: "work" },
  { href: "/validaciones/calidad", label: "Calidad e inocuidad", shortLabel: "Calidad", icon: ShieldCheck, roles: ["ADMIN", "CALIDAD"], group: "work" },
  { href: "/validaciones/seguridad", label: "Seguridad industrial", shortLabel: "Seguridad", icon: ClipboardCheck, roles: ["ADMIN", "SEGURIDAD"], group: "work" },
  { href: "/validaciones/mantenimiento", label: "Mantenimiento", icon: Wrench, roles: ["ADMIN", "MANTENIMIENTO"], group: "work" },
  { href: "/mejora", label: "Mejora Continua", shortLabel: "Mejora", icon: Gauge, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "work" },
  { href: "/implementacion", label: "Implementación", shortLabel: "Avances", icon: ListChecks, roles: ["ADMIN", "MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR"], group: "work" },
  { href: "/ideas", label: "Todas las ideas", shortLabel: "Ideas", icon: ClipboardList, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "control" },
  { href: "/kanban", label: "Flujo Kanban", shortLabel: "Kanban", icon: KanbanSquare, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "control" },
  { href: "/vencidas", label: "Compromisos vencidos", shortLabel: "Vencidas", icon: BarChart3, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "control" },
  { href: "/qr", label: "QR por área", shortLabel: "QR", icon: QrCode, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "system" },
  { href: "/reportes", label: "Reportes", icon: Download, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "system" },
  { href: "/notificaciones", label: "Notificaciones", shortLabel: "Avisos", icon: Bell, roles: ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO"], group: "system" },
  { href: "/auditoria", label: "Auditoría", icon: BarChart3, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "system" },
  { href: "/configuracion", label: "Configuración", shortLabel: "Ajustes", icon: Settings, roles: ["ADMIN"], group: "system" }
];

const roleTheme: Record<Role, { accent: string; soft: string; home: string; context: string }> = {
  ADMIN: { accent: "#171a18", soft: "#eef0ef", home: "/dashboard", context: "Control del sistema" },
  MEJORA_CONTINUA: { accent: "#171a18", soft: "#eef0ef", home: "/dashboard", context: "Seguimiento global" },
  SUPERVISOR: { accent: "#14835f", soft: "#e9f6f0", home: "/supervisor", context: "Seguimiento de tu área" },
  CALIDAD: { accent: "#d32236", soft: "#fff0f2", home: "/validaciones/calidad", context: "Calidad e inocuidad" },
  SEGURIDAD: { accent: "#626a70", soft: "#f0f2f3", home: "/validaciones/seguridad", context: "Seguridad industrial" },
  MANTENIMIENTO: { accent: "#176fc1", soft: "#edf5fc", home: "/validaciones/mantenimiento", context: "Factibilidad técnica" },
  COLABORADOR: { accent: "#e21d2b", soft: "#fff1f2", home: "/", context: "Captura pública" }
};

const groupLabels = {
  work: "Trabajo pendiente",
  control: "Seguimiento",
  system: "Herramientas"
};

function isCurrentPath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NotificationBadge({ count }: { count: number }) {
  if (!count) return null;
  return <span className="nav-count">{count > 99 ? "99+" : count}</span>;
}

function NavigationLink({ item, pathname, pendingNotifications, onNavigate }: { item: NavItem; pathname: string; pendingNotifications: number; onNavigate?: () => void }) {
  const Icon = item.icon;
  const active = isCurrentPath(pathname, item.href);
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`app-nav-link ${active ? "is-active" : ""}`}
      href={item.href}
      onClick={onNavigate}
    >
      <span className="app-nav-icon">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.href === "/notificaciones" ? <NotificationBadge count={pendingNotifications} /> : null}
    </Link>
  );
}

function BrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="flex min-w-0 items-center gap-3" href="/">
      <span className={`flex shrink-0 items-center justify-center border border-slate-200 bg-white ${compact ? "h-10 w-[84px] p-1.5" : "h-12 w-[102px] p-2"}`}>
        <Image alt="Proboca" className="h-auto w-full object-contain" height={72} priority width={216} src="/brand/proboca-logo.png" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-red-600">PROpEx</span>
        <span className="block truncate text-sm font-extrabold text-slate-950">Ideas de Mejora</span>
      </span>
    </Link>
  );
}

export function AppShell({ user, children, pendingNotifications }: { user: ShellUser; children: ReactNode; pendingNotifications: number }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = roleTheme[user.role];
  const visibleNav = useMemo(() => nav.filter((item) => item.roles.includes(user.role)), [user.role]);
  const mobileItems = useMemo(() => {
    const preferred = [theme.home, user.role === "ADMIN" || user.role === "MEJORA_CONTINUA" ? "/ideas" : "/implementacion", "/notificaciones"];
    return preferred.map((href) => visibleNav.find((item) => item.href === href)).filter((item): item is NavItem => Boolean(item)).filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href) === index).slice(0, 3);
  }, [theme.home, user.role, visibleNav]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const shellStyle = {
    "--role-accent": theme.accent,
    "--role-soft": theme.soft
  } as CSSProperties;

  const navigation = (onNavigate?: () => void) => (
    <nav aria-label="Navegacion principal" className="space-y-5">
      {(["work", "control", "system"] as const).map((group) => {
        const items = visibleNav.filter((item) => item.group === group);
        if (!items.length) return null;
        return (
          <div key={group}>
            <p className="nav-group-label">{groupLabels[group]}</p>
            <div className="mt-1.5 space-y-1">
              {items.map((item) => (
                <NavigationLink item={item} key={item.href} onNavigate={onNavigate} pathname={pathname} pendingNotifications={pendingNotifications} />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="app-shell" style={shellStyle}>
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <BrandBlock />
        </div>
        <div className="app-sidebar-scroll">{navigation()}</div>
        <div className="app-sidebar-footer">
          <Link className="user-summary" href="/notificaciones">
            <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-extrabold text-slate-950">{user.name}</span>
              <span className="block truncate text-xs text-slate-500">{roleLabels[user.role]}</span>
            </span>
            <Bell className="h-4 w-4 text-slate-500" aria-hidden />
          </Link>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="role-chip">{theme.context}</span>
            <form action={logoutAction}>
              <button aria-label="Cerrar sesion" className="icon-button" title="Cerrar sesion" type="submit">
                <LogOut className="h-[18px] w-[18px]" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="app-content">
        <header className="mobile-topbar">
          <BrandBlock compact />
          <div className="flex items-center gap-2">
            <Link aria-label={`${pendingNotifications} notificaciones pendientes`} className="icon-button relative" href="/notificaciones">
              <Bell className="h-5 w-5" aria-hidden />
              {pendingNotifications ? <span className="notification-dot" /> : null}
            </Link>
            <button aria-expanded={menuOpen} aria-label="Abrir menu" className="icon-button" onClick={() => setMenuOpen(true)} type="button">
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        <main className="app-main">{children}</main>
      </div>

      <nav aria-label="Accesos rapidos" className="mobile-bottom-nav">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = isCurrentPath(pathname, item.href);
          return (
            <Link aria-current={active ? "page" : undefined} className={`mobile-bottom-link ${active ? "is-active" : ""}`} href={item.href} key={item.href}>
              <span className="relative">
                <Icon className="h-5 w-5" aria-hidden />
                {item.href === "/notificaciones" && pendingNotifications ? <span className="notification-dot -right-1 -top-1" /> : null}
              </span>
              <span>{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
        <button className={`mobile-bottom-link ${menuOpen ? "is-active" : ""}`} onClick={() => setMenuOpen(true)} type="button">
          <Menu className="h-5 w-5" aria-hidden />
          <span>Menu</span>
        </button>
      </nav>

      {menuOpen ? (
        <div className="mobile-drawer-layer" role="presentation">
          <button aria-label="Cerrar menu" className="mobile-drawer-backdrop" onClick={() => setMenuOpen(false)} type="button" />
          <aside aria-label="Menu movil" className="mobile-drawer">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <BrandBlock compact />
              <button aria-label="Cerrar menu" className="icon-button" onClick={() => setMenuOpen(false)} type="button">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="border-b border-slate-200 p-4">
              <p className="text-sm font-extrabold text-slate-950">{user.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{roleLabels[user.role]} · {theme.context}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{navigation(() => setMenuOpen(false))}</div>
            <form action={logoutAction} className="border-t border-slate-200 p-4">
              <button className="btn btn-secondary w-full" type="submit">
                <LogOut className="h-4 w-4" aria-hidden />
                Cerrar sesion
              </button>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
