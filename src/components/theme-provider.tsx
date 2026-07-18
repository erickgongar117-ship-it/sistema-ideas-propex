"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableColorScheme
      enableSystem
      storageKey="propex-theme"
      themes={["light", "dark"]}
    >
      {children}
    </NextThemesProvider>
  );
}
