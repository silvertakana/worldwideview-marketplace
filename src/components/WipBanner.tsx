"use client";

import { useState } from "react";
import styles from "./WipBanner.module.css";

export default function WipBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div role="status" aria-label="Work in progress" className={styles.banner}>
      <span className={styles.icon}>🚧</span>
      <span className={styles.text}>
        This marketplace is under active development — features may be
        incomplete or change without notice.
      </span>
      <span className={styles.icon}>🚧</span>
      <button
        type="button"
        className={styles.close}
        onClick={() => setVisible(false)}
        aria-label="Dismiss banner"
      >
        ✕
      </button>
    </div>
  );
}
