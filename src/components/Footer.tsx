import styles from "./Footer.module.css";

const legalBase = process.env.NEXT_PUBLIC_LEGAL_URL ?? "https://worldwideview.dev/legal";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.brand}>
          Built for{" "}
          <a
            href="https://github.com/silvertakana/worldwideview"
            target="_blank"
            rel="noopener noreferrer"
          >
            WorldWideView
          </a>
        </span>
        <span className={styles.license}>
          © {year} WorldWideView · Business Source License 1.1
        </span>
        <span className={styles.legal}>
          <a
            href={`${legalBase}/privacy-policy`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
          {" · "}
          <a
            href={`${legalBase}/marketplace-terms`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms
          </a>
        </span>
      </div>
    </footer>
  );
}
