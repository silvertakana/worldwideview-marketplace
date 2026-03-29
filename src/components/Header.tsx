"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import styles from "./Header.module.css";

const NAV_LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/manage", label: "My Plugins" },
  { href: "/publish", label: "Publish" },
  { href: "/submit", label: "Submit Plugin" },
  { href: "/docs", label: "Docs" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <img src="/logo/logo-icon.svg" alt="Logo" className={styles.logoImg} />
          WWV Marketplace
        </Link>

        <nav className={styles.nav}>
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navLink} ${
                pathname === href ? styles.navLinkActive : ""
              }`}
            >
              {label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
