"use client";

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

  return (
    <button
      className={styles.toggle}
      onClick={() => setTheme(NEXT[theme])}
      aria-label={`Switch theme (current: ${theme})`}
      title={`Theme: ${theme}`}
    >
      {ICONS[theme]}
    </button>
  );
}
