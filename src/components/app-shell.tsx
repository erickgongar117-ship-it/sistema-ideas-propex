"use client";

import type { Role } from "@prisma/client";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Archive,
  Bell,
  Building2,
  CalendarRange,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Coins,
  Crown,
  Database,
  Download,
  Footprints,
  FileSpreadsheet,
  FolderKanban,
  Gauge,
  GraduationCap,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  QrCode,
  Settings,
  ShieldCheck,
  UserCheck,
  Wrench,
  X
} from "lucide-react";
import { logoutAction } from "@/app/actions";
import { ThemeSelector } from "@/components/theme-selector";
import { WorkspacePeriodControl, WorkspaceSearch } from "@/components/workspace-controls";
import { roleLabels } from "@/lib/domain";

type ShellUser = {
  name: string;
  email: string;
  role: Role;
  kaizenAccess: boolean;
  genbaAccess: boolean;
  jobTitle: string | null;
  responsibilities: string[];
};

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  roles: Role[];
  requiresReviewAccess?: boolean;
  requiresModule?: "kaizen" | "genba";
  group: "work" | "control" | "system";
};

type NavGroup = NavItem["group"];

const allRoles: Role[] = ["ADMIN", "DIRECCION", "GERENTE", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO", "COLABORADOR"];
const executiveRoles: Role[] = ["ADMIN", "DIRECCION", "GERENTE", "MEJORA_CONTINUA"];

const ideaNav: NavItem[] = [
  { href: "/panorama", label: "Panorama PROpEx", shortLabel: "Panorama", icon: LayoutDashboard, roles: executiveRoles, group: "work" },
  { href: "/dashboard", label: "Hoy", shortLabel: "Hoy", icon: LayoutDashboard, roles: executiveRoles, group: "work" },
  { href: "/seguimientos", label: "Mis seguimientos", shortLabel: "Pendientes", icon: ListChecks, roles: allRoles, group: "work" },
  { href: "/supervisor", label: "Bandeja de aprobaciones", shortLabel: "Aprobar", icon: UserCheck, roles: allRoles, requiresReviewAccess: true, group: "work" },
  { href: "/validaciones/calidad", label: "Calidad e inocuidad", shortLabel: "Calidad", icon: ShieldCheck, roles: ["ADMIN", "CALIDAD"], group: "work" },
  { href: "/validaciones/seguridad", label: "Seguridad industrial", shortLabel: "Seguridad", icon: ClipboardCheck, roles: ["ADMIN", "SEGURIDAD"], group: "work" },
  { href: "/validaciones/mantenimiento", label: "Mantenimiento", icon: Wrench, roles: ["ADMIN", "MANTENIMIENTO"], group: "work" },
  { href: "/mejora", label: "Mejora Continua", shortLabel: "Mejora", icon: Gauge, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "work" },
  { href: "/implementacion", label: "Implementación", shortLabel: "Avances", icon: ListChecks, roles: ["ADMIN", "MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR"], group: "work" },
  { href: "/ideas", label: "Todas las ideas", shortLabel: "Ideas", icon: ClipboardList, roles: executiveRoles, group: "control" },
  { href: "/ideas/repositorio", label: "Repositorio de ideas", shortLabel: "Historico", icon: Archive, roles: executiveRoles, group: "control" },
  { href: "/kanban", label: "Flujo Kanban", shortLabel: "Kanban", icon: KanbanSquare, roles: executiveRoles, group: "control" },
  { href: "/vencidas", label: "Compromisos vencidos", shortLabel: "Vencidas", icon: BarChart3, roles: executiveRoles, group: "control" },
  { href: "/qr", label: "QR por planta", shortLabel: "QR", icon: QrCode, roles: executiveRoles, group: "system" },
  { href: "/reportes", label: "Reportes", icon: Download, roles: executiveRoles, group: "system" },
  { href: "/entrenamientos", label: "Entrenamientos", shortLabel: "Cursos", icon: GraduationCap, roles: executiveRoles, group: "system" },
  { href: "/probocacoins", label: "Finanzas ProbocaCoins", shortLabel: "Coins", icon: Coins, roles: executiveRoles, group: "system" },
  { href: "/notificaciones", label: "Notificaciones", shortLabel: "Avisos", icon: Bell, roles: allRoles, group: "system" },
  { href: "/auditoria", label: "Auditoría", icon: BarChart3, roles: executiveRoles, group: "system" },
  { href: "/configuracion/estructura", label: "Estructura organizacional", shortLabel: "Estructura", icon: Network, roles: ["ADMIN"], group: "system" },
  { href: "/configuracion/datos", label: "Control de datos", shortLabel: "Datos", icon: Database, roles: ["ADMIN"], group: "system" },
  { href: "/configuracion/migracion-2026", label: "Migracion Excel 2026", shortLabel: "Migracion", icon: FileSpreadsheet, roles: ["ADMIN"], group: "system" },
  { href: "/configuracion", label: "Configuración", shortLabel: "Ajustes", icon: Settings, roles: ["ADMIN"], group: "system" }
];

const kaizenNav: NavItem[] = [
  { href: "/kaizen", label: "Panel de proyectos", shortLabel: "Kaizen", icon: LayoutDashboard, roles: allRoles, group: "work" },
  { href: "/kaizen/repositorio", label: "Repositorio Kaizen", shortLabel: "Historico", icon: Archive, roles: allRoles, group: "control" },
  { href: "/kaizen/nuevo", label: "Nuevo proyecto", shortLabel: "Nuevo", icon: Plus, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "work" },
  { href: "/kaizen/gantt", label: "Calendario Gantt", shortLabel: "Gantt", icon: CalendarRange, roles: allRoles, group: "control" },
  { href: "/kaizen/kanban", label: "Kanban por proyecto", shortLabel: "Kanban", icon: FolderKanban, roles: allRoles, group: "control" }
];

const genbaNav: NavItem[] = [
  { href: "/genba", label: "Panel de recorridos", shortLabel: "GENBA", icon: LayoutDashboard, roles: allRoles, group: "work" },
  { href: "/genba/repositorio", label: "Repositorio GENBA", shortLabel: "Historico", icon: Archive, roles: allRoles, group: "control" },
  { href: "/genba/nuevo", label: "Nuevo recorrido", shortLabel: "Nuevo", icon: Plus, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "work" },
  { href: "/genba/kanban", label: "Kanban por recorrido", shortLabel: "Kanban", icon: FolderKanban, roles: allRoles, group: "control" }
];

// El orden importa: es el que ve la gente al abrir el menu, y lo fijo el usuario.
//
// "Panel ejecutivo" va primero, pero solo lo alcanzan los roles directivos, asi que para un
// supervisor u operador la lista arranca en "Mi trabajo" sin necesidad de una segunda lista.
// Un solo arreglo sirve para las dos reglas.
const unifiedNav: NavItem[] = [
  { href: "/panorama", label: "Panel ejecutivo", shortLabel: "Panel", icon: LayoutDashboard, roles: executiveRoles, group: "work" },
  { href: "/seguimientos", label: "Mi trabajo", shortLabel: "Mi trabajo", icon: ListChecks, roles: allRoles, group: "work" },
  { href: "/dashboard", label: "Ideas de mejora", shortLabel: "Ideas", icon: ClipboardList, roles: executiveRoles, group: "work" },
  { href: "/kaizen", label: "Proyectos Kaizen", shortLabel: "Kaizen", icon: FolderKanban, roles: allRoles, requiresModule: "kaizen", group: "work" },
  { href: "/genba", label: "Recorridos GENBA", shortLabel: "GENBA", icon: Footprints, roles: allRoles, requiresModule: "genba", group: "work" },
  { href: "/entrenamientos", label: "Entrenamientos", shortLabel: "Cursos", icon: GraduationCap, roles: executiveRoles, group: "work" },
  { href: "/probocacoins", label: "ProbocaCoins", shortLabel: "Coins", icon: Coins, roles: executiveRoles, group: "work" },

  { href: "/supervisor", label: "Aprobaciones", shortLabel: "Aprobar", icon: UserCheck, roles: allRoles, requiresReviewAccess: true, group: "control" },
  { href: "/validaciones/ejecutivas", label: "Validaciones ejecutivas", shortLabel: "Ejecutivas", icon: Crown, roles: ["GERENTE", "DIRECCION"], group: "control" },
  { href: "/validaciones/calidad", label: "Validaciones de calidad", shortLabel: "Calidad", icon: ShieldCheck, roles: ["ADMIN", "CALIDAD"], group: "control" },
  { href: "/validaciones/seguridad", label: "Validaciones de seguridad", shortLabel: "Seguridad", icon: ClipboardCheck, roles: ["ADMIN", "SEGURIDAD"], group: "control" },
  { href: "/validaciones/mantenimiento", label: "Validaciones tecnicas", icon: Wrench, roles: ["ADMIN", "MANTENIMIENTO"], group: "control" },
  { href: "/mejora", label: "Clasificar y cerrar ideas", shortLabel: "Mejora", icon: Gauge, roles: ["ADMIN", "MEJORA_CONTINUA"], group: "control" },
  { href: "/implementacion", label: "Implementacion de ideas", shortLabel: "Avances", icon: ListChecks, roles: ["ADMIN", "MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR"], group: "control" },
  { href: "/vencidas", label: "Compromisos vencidos", icon: BarChart3, roles: executiveRoles, group: "control" },
  { href: "/reportes", label: "Reportes y Excel", icon: Download, roles: executiveRoles, group: "control" },

  { href: "/qr", label: "Codigos QR", shortLabel: "QR", icon: QrCode, roles: executiveRoles, group: "system" },
  { href: "/auditoria", label: "Auditoria", icon: BarChart3, roles: executiveRoles, group: "system" },
  { href: "/configuracion/estructura", label: "Organizacion y personas", shortLabel: "Estructura", icon: Network, roles: ["ADMIN"], group: "system" },
  { href: "/configuracion/datos", label: "Control de datos", shortLabel: "Datos", icon: Database, roles: ["ADMIN"], group: "system" },
  { href: "/configuracion/migracion-2026", label: "Migracion Excel 2026", shortLabel: "Migracion", icon: FileSpreadsheet, roles: ["ADMIN"], group: "system" },
  { href: "/configuracion", label: "Configuracion", shortLabel: "Ajustes", icon: Settings, roles: ["ADMIN"], group: "system" }
];

// La paleta por rol vive en tokens de globals.css, no aqui. Antes estaba escrita dos veces
// —en :root y en este componente cliente— y las dos copias podian separarse sin que nadie
// lo notara. Estos valores solo se inyectan en --role-accent y --role-soft, asi que `var()`
// se resuelve igual y ademas sigue al tema.
const roleTheme: Record<Role, { accent: string; soft: string; home: string; context: string }> = {
  ADMIN: { accent: "var(--brand-black)", soft: "var(--brand-black-soft)", home: "/dashboard", context: "Control del sistema" },
  DIRECCION: { accent: "var(--brand-red)", soft: "var(--brand-red-soft)", home: "/panorama", context: "Visión ejecutiva" },
  GERENTE: { accent: "var(--brand-black)", soft: "var(--brand-black-soft)", home: "/panorama", context: "Portafolio gerencial" },
  MEJORA_CONTINUA: { accent: "var(--brand-black)", soft: "var(--brand-black-soft)", home: "/panorama", context: "Seguimiento global" },
  SUPERVISOR: { accent: "var(--supervisor)", soft: "var(--supervisor-soft)", home: "/seguimientos", context: "Seguimiento de tu área" },
  CALIDAD: { accent: "var(--quality)", soft: "var(--quality-soft)", home: "/seguimientos", context: "Calidad e inocuidad" },
  SEGURIDAD: { accent: "var(--safety)", soft: "var(--safety-soft)", home: "/seguimientos", context: "Seguridad industrial" },
  MANTENIMIENTO: { accent: "var(--maintenance)", soft: "var(--maintenance-soft)", home: "/seguimientos", context: "Factibilidad técnica" },
  COLABORADOR: { accent: "var(--brand-red)", soft: "var(--brand-red-soft)", home: "/seguimientos", context: "Trabajo asignado" }
};

const groupLabels = {
  work: "Trabajo",
  control: "Bandejas y control",
  system: "Administracion"
};

function isCurrentPath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  if (["/ideas", "/kaizen", "/genba"].includes(href)) {
    const suffix = pathname.startsWith(`${href}/`) ? pathname.slice(href.length + 1) : "";
    const reservedViews = new Set(["repositorio", "nuevo", "gantt", "kanban"]);
    return Boolean(suffix && !suffix.includes("/") && !reservedViews.has(suffix));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NotificationBadge({ count }: { count: number }) {
  if (!count) return null;
  return <span className="nav-count">{count > 99 ? "99+" : count}</span>;
}

function NavigationLink({ item, pathname, pendingNotifications, collapsed = false, onNavigate }: { item: NavItem; pathname: string; pendingNotifications: number; collapsed?: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  const active = isCurrentPath(pathname, item.href);
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`app-nav-link ${active ? "is-active" : ""}`}
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
    >
      <span className="app-nav-icon">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.href === "/notificaciones" ? <NotificationBadge count={pendingNotifications} /> : null}
    </Link>
  );
}

function BrandBlock({ compact = false, collapsed = false }: { compact?: boolean; collapsed?: boolean }) {
  if (collapsed) {
    return (
      <Link aria-label="PROpEx - Inicio" className="collapsed-brand" href="/">
        <Image alt="Mejora Continua" className="h-full w-full object-contain" height={64} priority width={64} src="/brand/mejora-continua-logo-rojo.png" />
      </Link>
    );
  }
  return (
    <Link className="flex min-w-0 items-center gap-3" href="/">
      <span className={`brand-logo-surface flex shrink-0 items-center justify-center border border-slate-200 bg-white ${compact ? "h-10 w-[84px] p-1.5" : "h-12 w-[102px] p-2"}`}>
        <Image alt="Proboca" className="h-auto w-full object-contain" height={72} priority width={216} src="/brand/proboca-logo.png" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-700">PROpEx</span>
        <span className="block truncate text-sm font-extrabold text-slate-950">Mejora Operativa</span>
      </span>
    </Link>
  );
}

function ModuleSwitcher({ home, access, compact = false, onNavigate }: { home: string; access: { kaizen: boolean; genba: boolean }; compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const modules = [
    { href: home, label: "Ideas", icon: ClipboardList, active: !pathname.startsWith("/kaizen") && !pathname.startsWith("/genba"), visible: true },
    { href: "/kaizen", label: "Kaizen", icon: FolderKanban, active: pathname.startsWith("/kaizen"), visible: access.kaizen },
    { href: "/genba", label: "GENBA", icon: Footprints, active: pathname.startsWith("/genba"), visible: access.genba }
  ].filter((item) => item.visible);
  return (
    <nav aria-label="Cambiar de módulo" className={`module-switcher ${compact ? "is-compact" : ""}`}>
      {modules.map((item) => {
        const Icon = item.icon;
        return <Link aria-current={item.active ? "page" : undefined} className={`module-switcher-link ${item.active ? "is-active" : ""}`} href={item.href} key={item.label} onClick={onNavigate}><Icon className="h-4 w-4" aria-hidden /><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}

function CreateMenu({ canManage, moduleAccess }: { canManage: boolean; moduleAccess: { kaizen: boolean; genba: boolean } }) {
  const options = [
    { href: "/#areas", label: "Idea de mejora", detail: "Captura por area", icon: ClipboardList, visible: true },
    { href: "/kaizen/nuevo", label: "Proyecto Kaizen", detail: "Crear proyecto", icon: FolderKanban, visible: canManage && moduleAccess.kaizen },
    { href: "/genba/nuevo", label: "Recorrido GENBA", detail: "Programar recorrido", icon: Footprints, visible: canManage && moduleAccess.genba },
    { href: "/entrenamientos", label: "Entrenamiento", detail: "Programa o sesion", icon: GraduationCap, visible: canManage }
  ].filter((option) => option.visible);

  return (
    <details className="workspace-create">
      <summary className="btn btn-primary">
        <Plus className="h-4 w-4" aria-hidden />
        <span>Crear</span>
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </summary>
      <div className="workspace-create-menu">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <Link href={option.href} key={option.href}>
              <span><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
              <span><strong>{option.label}</strong><small>{option.detail}</small></span>
            </Link>
          );
        })}
      </div>
    </details>
  );
}

export function AppShell({ user, children, pendingNotifications, moduleAccess, canReviewIdeas }: { user: ShellUser; children: ReactNode; pendingNotifications: number; moduleAccess: { kaizen: boolean; genba: boolean }; canReviewIdeas: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<NavGroup, boolean>>({
    work: true,
    control: false,
    system: false
  });
  const mobileDrawerRef = useRef<HTMLElement | null>(null);
  const roleBaseTheme = roleTheme[user.role];
  const currentModule = pathname.startsWith("/kaizen") ? "kaizen" : pathname.startsWith("/genba") ? "genba" : "ideas";
  const theme = currentModule === "kaizen"
    ? { ...roleBaseTheme, accent: "var(--warning)", soft: "var(--warning-soft)", context: "Proyectos Kaizen", home: "/kaizen" }
    : currentModule === "genba"
      ? { ...roleBaseTheme, accent: "var(--brand-red)", soft: "var(--brand-red-soft)", context: "Recorridos GENBA", home: "/genba" }
      : roleBaseTheme;
  const visibleNav = useMemo(() => {
    return unifiedNav.filter((item) => {
      if (!item.roles.includes(user.role) || (item.requiresReviewAccess && !canReviewIdeas)) return false;
      if (item.requiresModule === "kaizen" && !moduleAccess.kaizen) return false;
      if (item.requiresModule === "genba" && !moduleAccess.genba) return false;
      return true;
    });
  }, [canReviewIdeas, moduleAccess.genba, moduleAccess.kaizen, user.role]);
  const searchableNav = useMemo(() => {
    const catalog = [...visibleNav, ...ideaNav, ...kaizenNav, ...genbaNav].filter((item) => {
      if (!item.roles.includes(user.role) || (item.requiresReviewAccess && !canReviewIdeas)) return false;
      if (item.href.startsWith("/kaizen") && !moduleAccess.kaizen) return false;
      if (item.href.startsWith("/genba") && !moduleAccess.genba) return false;
      return true;
    });
    return catalog.filter((item, index) => catalog.findIndex((candidate) => candidate.href === item.href) === index);
  }, [canReviewIdeas, moduleAccess.genba, moduleAccess.kaizen, user.role, visibleNav]);
  const mobileItems = useMemo(() => {
    const preferred = [roleBaseTheme.home, "/seguimientos", "/kaizen", "/genba", "/notificaciones"];
    return preferred.map((href) => visibleNav.find((item) => item.href === href)).filter((item): item is NavItem => Boolean(item)).filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href) === index).slice(0, 3);
  }, [roleBaseTheme.home, visibleNav]);
  const activeItem = [...searchableNav].sort((a, b) => b.href.length - a.href.length).find((item) => isCurrentPath(pathname, item.href));
  const showPeriodControl = pathname === "/dashboard" || pathname === "/kaizen" || pathname === "/genba";
  const searchItems = useMemo(() => searchableNav.map((item) => ({ href: item.href, label: item.label, group: groupLabels[item.group] })), [searchableNav]);
  const canManagePrograms = user.role === "ADMIN" || user.role === "MEJORA_CONTINUA";

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem("propex-sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const activeGroup = visibleNav.find((item) => isCurrentPath(pathname, item.href))?.group ?? "work";
    setExpandedGroups({
      work: activeGroup === "work",
      control: activeGroup === "control",
      system: activeGroup === "system"
    });
  }, [pathname, visibleNav]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const inertTargets = [".app-sidebar", ".app-content", ".mobile-bottom-nav"]
      .map((selector) => document.querySelector<HTMLElement>(selector))
      .filter((target): target is HTMLElement => Boolean(target));
    document.body.style.overflow = "hidden";
    inertTargets.forEach((target) => target.setAttribute("inert", ""));
    const drawer = mobileDrawerRef.current;
    const focusTimer = window.setTimeout(() => drawer?.querySelector<HTMLElement>("button, a[href], input, select")?.focus(), 20);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawer) return;
      const focusable = [...drawer.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      inertTargets.forEach((target) => target.removeAttribute("inert"));
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [menuOpen]);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("propex-sidebar-collapsed", String(next));
      return next;
    });
  };

  const toggleGroup = (group: NavGroup) => {
    setExpandedGroups((current) => ({
      work: group === "work" ? !current.work : false,
      control: group === "control" ? !current.control : false,
      system: group === "system" ? !current.system : false
    }));
  };

  const shellStyle = {
    "--role-accent": theme.accent,
    "--role-soft": theme.soft
  } as CSSProperties;

  const navigation = (onNavigate?: () => void, collapsed = false) => (
    <nav aria-label="Navegacion principal" className="space-y-2">
      {(["work", "control", "system"] as const).map((group) => {
        const items = visibleNav.filter((item) => item.group === group);
        if (!items.length) return null;
        const expanded = collapsed || expandedGroups[group];
        return (
          <div className="nav-group" key={group}>
            {!collapsed ? (
              <button
                aria-expanded={expanded}
                className="nav-group-toggle"
                onClick={() => toggleGroup(group)}
                type="button"
              >
                <span>{groupLabels[group]}</span>
                <span className="nav-group-meta">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
                </span>
              </button>
            ) : null}
            {expanded ? <div className={`${collapsed ? "" : "mt-1"} space-y-1`}>
              {items.map((item) => (
                <NavigationLink collapsed={collapsed} item={item} key={item.href} onNavigate={onNavigate} pathname={pathname} pendingNotifications={pendingNotifications} />
              ))}
            </div> : null}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className={`app-shell ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`} data-module={currentModule} data-role={user.role} style={shellStyle}>
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <div className="sidebar-brand-row">
            <BrandBlock collapsed={sidebarCollapsed} />
            <button
              aria-label={sidebarCollapsed ? "Expandir navegación" : "Contraer navegación"}
              className="icon-button sidebar-collapse-button"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expandir navegación" : "Contraer navegación"}
              type="button"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden /> : <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden />}
            </button>
          </div>
        </div>
        <div className="app-sidebar-scroll">{navigation(undefined, sidebarCollapsed)}</div>
        <div className="app-sidebar-footer">
          <Link className="user-summary" href="/notificaciones">
            <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-extrabold text-slate-950">{user.name}</span>
              <span className="block truncate text-xs text-slate-500">{user.jobTitle ?? roleLabels[user.role]}</span>
              {user.responsibilities[0] ? <span className="mt-0.5 block truncate text-[10px] font-bold text-slate-400">{user.responsibilities[0]}</span> : null}
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
        <header className="workspace-topbar">
          <div className="workspace-topbar-context">
            <span className="workspace-context-mark" />
            <span className="min-w-0">
              <span className="block text-[10px] font-extrabold uppercase text-slate-500">{theme.context}</span>
              <span className="mt-0.5 block truncate text-sm font-extrabold text-ink">{activeItem?.label ?? "Espacio de trabajo"}</span>
            </span>
          </div>
          <div className="workspace-topbar-actions">
            <WorkspaceSearch items={searchItems} />
            {showPeriodControl ? <WorkspacePeriodControl /> : null}
            <CreateMenu canManage={canManagePrograms} moduleAccess={moduleAccess} />
            <ThemeSelector />
            <Link aria-label={`${pendingNotifications} notificaciones pendientes`} className="icon-button relative" href="/notificaciones" title="Notificaciones">
              <Bell className="h-[18px] w-[18px]" aria-hidden />
              {pendingNotifications ? <span className="notification-dot" /> : null}
            </Link>
            <details className="workspace-profile">
              <summary aria-label="Abrir perfil" title="Perfil de usuario">
                <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
                <span className="workspace-profile-copy">
                  <span className="block max-w-36 truncate text-xs font-extrabold text-ink">{user.name}</span>
                  <span className="mt-0.5 block max-w-36 truncate text-[10px] text-slate-500">{user.jobTitle ?? roleLabels[user.role]}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
              </summary>
              <div className="workspace-profile-menu">
                <p className="truncate text-sm font-extrabold text-ink">{user.name}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
                <p className="mt-3 border-t border-line pt-3 text-[11px] font-extrabold text-ink">{roleLabels[user.role]}</p>
                {user.responsibilities.length ? (
                  <div className="mt-3 border-t border-line pt-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-500"><Building2 className="h-3.5 w-3.5" aria-hidden />Responsable de</p>
                    <ul className="mt-2 space-y-1.5 text-xs font-bold text-ink">
                      {user.responsibilities.slice(0, 6).map((responsibility) => <li className="leading-4" key={responsibility}>{responsibility}</li>)}
                    </ul>
                  </div>
                ) : <p className="mt-3 border-t border-line pt-3 text-[11px] font-bold text-slate-500">{theme.context}</p>}
                <form action={logoutAction} className="mt-3">
                  <button className="btn btn-secondary w-full" type="submit"><LogOut className="h-4 w-4" aria-hidden />Cerrar sesión</button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <header className="mobile-topbar">
          <BrandBlock compact />
          <div className="flex items-center gap-2">
            <Link aria-label="Nueva idea" className="icon-button" href="/#areas">
              <Plus className="h-5 w-5" aria-hidden />
            </Link>
            <Link aria-label={`${pendingNotifications} notificaciones pendientes`} className="icon-button relative" href="/notificaciones">
              <Bell className="h-5 w-5" aria-hidden />
              {pendingNotifications ? <span className="notification-dot" /> : null}
            </Link>
            <button aria-controls="mobile-navigation-dialog" aria-expanded={menuOpen} aria-label="Abrir menu" className="icon-button" onClick={() => setMenuOpen(true)} type="button">
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
        <button aria-controls="mobile-navigation-dialog" aria-expanded={menuOpen} className={`mobile-bottom-link ${menuOpen ? "is-active" : ""}`} onClick={() => setMenuOpen(true)} type="button">
          <Menu className="h-5 w-5" aria-hidden />
          <span>Menu</span>
        </button>
      </nav>

      {menuOpen ? (
        <div className="mobile-drawer-layer" role="presentation">
          <button aria-label="Cerrar menu" className="mobile-drawer-backdrop" onClick={() => setMenuOpen(false)} type="button" />
          <aside aria-label="Menu movil" aria-modal="true" className="mobile-drawer" id="mobile-navigation-dialog" ref={mobileDrawerRef} role="dialog">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <BrandBlock compact />
              <button aria-label="Cerrar menu" className="icon-button" onClick={() => setMenuOpen(false)} type="button">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="border-b border-slate-200 p-4">
              <p className="text-sm font-extrabold text-slate-950">{user.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{user.jobTitle ?? roleLabels[user.role]} · {user.responsibilities[0] ?? theme.context}</p>
              <Link className="btn btn-primary mt-3 w-full" href="/#areas" onClick={() => setMenuOpen(false)}><Plus className="h-4 w-4" aria-hidden />Nueva idea</Link>
              <div className="mobile-workspace-preferences">
                <WorkspaceSearch fullWidth items={searchItems} />
                {showPeriodControl ? <WorkspacePeriodControl fullWidth /> : null}
                <ThemeSelector showLabel />
              </div>
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
