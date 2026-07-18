"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

const themeOptions = [
  { value: "light", label: "Tema claro", description: "Superficies ejecutivas", icon: Sun },
  { value: "dark", label: "Tema oscuro", description: "Centro de comando", icon: Moon },
  { value: "system", label: "Usar sistema", description: "Sigue tu dispositivo", icon: Monitor }
] as const;

export function ThemeSelector({ showLabel = false }: { showLabel?: boolean }) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => setMounted(true), []);

  const selectedTheme = themeOptions.some((option) => option.value === theme) ? theme : "system";
  const ActiveIcon = mounted && resolvedTheme === "dark" ? Moon : Sun;

  const selectTheme = (value: "light" | "dark" | "system") => {
    setTheme(value);
    if (detailsRef.current) detailsRef.current.open = false;
  };

  return (
    <details className={`theme-selector ${showLabel ? "theme-selector-labeled" : ""}`} ref={detailsRef}>
      <summary
        aria-label="Seleccionar tema de interfaz"
        className={showLabel ? "theme-selector-trigger" : "icon-button"}
        title="Tema de interfaz"
      >
        <ActiveIcon className="h-[18px] w-[18px]" aria-hidden />
        {showLabel ? <span>Tema</span> : null}
      </summary>
      <div className="theme-selector-menu" role="menu">
        <p className="theme-selector-title">Apariencia</p>
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const active = mounted && selectedTheme === option.value;
          return (
            <button
              aria-pressed={active}
              className={`theme-selector-option ${active ? "is-active" : ""}`}
              key={option.value}
              onClick={() => selectTheme(option.value)}
              role="menuitem"
              type="button"
            >
              <span className="theme-selector-option-icon"><Icon className="h-4 w-4" aria-hidden /></span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-extrabold">{option.label}</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">{option.description}</span>
              </span>
              {active ? <Check className="h-4 w-4 text-brand-500" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </details>
  );
}
