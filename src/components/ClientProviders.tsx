"use client";

import type { ReactNode } from "react";
import ThemeProvider from "./ThemeProvider";
import InstalledPluginsProvider from "./InstalledPluginsProvider";

/**
 * Client-side providers wrapper.
 * Keeps layout.tsx as a server component while providing
 * client contexts (theme + installed plugins) to the tree.
 */
export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <InstalledPluginsProvider>
        {children}
      </InstalledPluginsProvider>
    </ThemeProvider>
  );
}
