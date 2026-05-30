"use client";

import styles from "./AvatarInitials.module.css";

interface Props {
  /** Email or display name used to derive the initials and background hue. */
  name: string;
  /** Optional CSS class to override default size (defaults to 72px). */
  className?: string;
}

/**
 * Renders a circular avatar showing up to two initials derived from `name`.
 * The background hue is deterministically seeded from the name string so the
 * same user always sees the same color without any server round-trip.
 * Uses accent-relative HSL so it looks correct in both light and dark themes.
 */
export default function AvatarInitials({ name, className }: Props) {
  const initials = deriveInitials(name);
  const hue = hashHue(name);

  return (
    <div
      className={className ?? styles.avatar}
      style={{ "--avatar-hue": String(hue) } as React.CSSProperties}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

/** Extracts up to two uppercase initials from a name or email address. */
function deriveInitials(name: string): string {
  // Strip domain portion from emails so "alice@example.com" -> "A"
  const local = name.split("@")[0];
  const parts = local.split(/[\s._\-+]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Produces a stable hue value 0-359 from an arbitrary string. */
function hashHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}
