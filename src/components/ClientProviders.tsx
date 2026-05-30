"use client";

import type { ReactNode } from "react";
import InstalledPluginsProvider from "./InstalledPluginsProvider";

/**
 * Client-side providers wrapper.
 * Keeps layout.tsx as a server component while providing
 * client contexts to the tree.
 * ThemeProvider is lifted up to layout.tsx so it wraps the Header too.
 */
export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <InstalledPluginsProvider>
      {children}
    </InstalledPluginsProvider>
  );
}
