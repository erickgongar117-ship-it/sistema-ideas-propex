"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { matchesPersonSearch } from "@/lib/person-search";

export type SearchablePickerOption = {
  value: string;
  label: string;
  description?: string;
  searchText?: string;
};

type SearchablePickerProps = {
  defaultValue?: string;
  helpText?: string;
  label: string;
  name: string;
  options: SearchablePickerOption[];
  placeholder?: string;
  required?: boolean;
};

export function SearchablePicker({
  defaultValue = "",
  helpText,
  label,
  name,
  options,
  placeholder = "Buscar por nombre o numero",
  required = false
}: SearchablePickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLLabelElement>(null);
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === selectedValue) ?? null;
  const filtered = useMemo(() => {
    if (!search.trim()) return options.slice(0, 60);
    return options.filter((option) => matchesPersonSearch(
      `${option.label} ${option.description ?? ""} ${option.searchText ?? ""}`,
      search
    )).slice(0, 60);
  }, [options, search]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent | FocusEvent) => {
      const target = event.target;
      if (target instanceof Node && !rootRef.current?.contains(target)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  return (
    <label className="relative block" ref={rootRef}>
      <span className="label">{label}</span>
      <input name={name} required={required} type="hidden" value={selectedValue} />
      {selected ? (
        <span className="flex min-h-[44px] items-center gap-3 border border-line bg-white px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-slate-950 text-[10px] font-extrabold text-white">{selected.label.charAt(0).toUpperCase()}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-ink">{selected.label}</span>{selected.description ? <span className="block truncate text-xs text-slate-500">{selected.description}</span> : null}</span>
          <button aria-label={`Quitar ${selected.label}`} className="icon-button h-8 w-8 min-w-8" onClick={() => { setSelectedValue(""); setSearch(""); setOpen(true); }} type="button"><X className="h-4 w-4" aria-hidden /></button>
        </span>
      ) : (
        <span className="relative block">
          <Search className="pointer-events-none absolute left-3 top-[14px] h-4 w-4 text-slate-400" aria-hidden />
          <input
            aria-controls={listId}
            aria-expanded={open}
            autoComplete="off"
            className="field pl-9"
            onChange={(event) => { setSearch(event.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            value={search}
          />
        </span>
      )}
      {open && !selected ? (
        <span className="absolute z-30 mt-1 block max-h-72 w-full overflow-y-auto border border-line bg-white shadow-xl" id={listId} role="listbox">
          {filtered.length ? filtered.map((option) => (
            <button
              className="flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-50 focus:bg-slate-50"
              key={option.value}
              onClick={() => { setSelectedValue(option.value); setSearch(""); setOpen(false); }}
              role="option"
              type="button"
            >
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-ink">{option.label}</span>{option.description ? <span className="block truncate text-xs text-slate-500">{option.description}</span> : null}</span>
              <Check className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            </button>
          )) : <span className="block px-3 py-5 text-center text-sm text-slate-500">No encontramos coincidencias.</span>}
          {options.length > 60 && !search ? <span className="block border-t border-line px-3 py-2 text-xs font-bold text-slate-500">Escribe para buscar entre {options.length.toLocaleString("es-MX")} personas.</span> : null}
        </span>
      ) : null}
      {helpText ? <span className="helper-text">{helpText}</span> : null}
    </label>
  );
}
