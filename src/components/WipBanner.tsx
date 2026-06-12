"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import styles from "./WipBanner.module.css";

/** Dismissible info banner shown while the marketplace is under active development. */
export default function WipBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div role="status" aria-label="Work in progress notice" className={styles.banner}>
      <Info size={14} className={styles.icon} aria-hidden="true" />
      <span className={styles.text}>
        This marketplace is under active development. Features may be
        incomplete or change without notice.
      </span>
      <button
        type="button"
        className={styles.close}
        onClick={() => setVisible(false)}
        aria-label="Dismiss banner"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
