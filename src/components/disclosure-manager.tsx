"use client";

import { useEffect } from "react";

const managedDisclosure = "details.details-panel:not([data-keep-open='true'])";

export function DisclosureManager() {
  useEffect(() => {
    const closeOutsidePanels = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      document.querySelectorAll<HTMLDetailsElement>(`${managedDisclosure}[open]`).forEach((panel) => {
        if (!panel.contains(target)) panel.open = false;
      });
    };

    const closePeerPanels = (event: Event) => {
      const openedPanel = event.target;
      if (!(openedPanel instanceof HTMLDetailsElement) || !openedPanel.open || !openedPanel.matches(managedDisclosure)) return;

      document.querySelectorAll<HTMLDetailsElement>(`${managedDisclosure}[open]`).forEach((panel) => {
        if (panel === openedPanel || panel.contains(openedPanel) || openedPanel.contains(panel)) return;
        panel.open = false;
      });
    };

    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      document.querySelectorAll<HTMLDetailsElement>(`${managedDisclosure}[open]`).forEach((panel) => {
        panel.open = false;
      });
    };

    document.addEventListener("pointerdown", closeOutsidePanels);
    document.addEventListener("toggle", closePeerPanels, true);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutsidePanels);
      document.removeEventListener("toggle", closePeerPanels, true);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  return null;
}
