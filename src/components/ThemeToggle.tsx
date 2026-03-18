"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import styles from "./ThemeToggle.module.css";

const ICONS: Record<string, string> = {
  light: "☀️",
  dark: "🌙",
  system: "💻",
};

const NEXT: Record<string, "light" | "dark" | "system"> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* Render a stable placeholder during SSR to avoid hydration mismatch */
  const label = mounted ? theme : "system";
  const icon = mounted ? ICONS[theme] : ICONS.system;

  return (
    <button
      className={styles.toggle}
      onClick={() => setTheme(NEXT[theme])}
      aria-label={`Switch theme (current: ${label})`}
      title={`Theme: ${label}`}
    >
      {icon}
    </button>
  );
}
