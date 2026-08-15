"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle() {
  const { resolved, setTheme } = useTheme();

  // Client-only mount detection without effect-driven setState: the subscribe
  // function never changes, and the snapshot differs only between server
  // (false) and client (true), so no state update is ever needed.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) return <div className={styles.placeholder} aria-hidden="true" />;

  const isDark = resolved === "dark";

  return (
    <button
      className={styles.toggle}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
