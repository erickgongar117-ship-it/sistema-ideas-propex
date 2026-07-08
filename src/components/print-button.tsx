"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="btn btn-secondary" onClick={() => window.print()} title="Imprimir" type="button">
      <Printer className="h-4 w-4" aria-hidden />
      Imprimir
    </button>
  );
}
