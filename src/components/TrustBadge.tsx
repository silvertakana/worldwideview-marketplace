import { ShieldCheck, ShieldAlert } from "lucide-react";
import styles from "./TrustBadge.module.css";

interface TrustBadgeProps {
  trust: "built-in" | "verified" | "unverified";
}

export default function TrustBadge({ trust }: TrustBadgeProps) {
  if (trust === "built-in" || trust === "verified") {
    const label = trust === "built-in" ? "Official" : "Verified";
    return (
      <span className={styles.verified}>
        <ShieldCheck size={13} />
        {label}
      </span>
    );
  }

  return (
    <span className={styles.unverified}>
      <ShieldAlert size={13} />
      Unverified
    </span>
  );
}
