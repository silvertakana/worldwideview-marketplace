import styles from "./Footer.module.css";

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
      </div>
    </footer>
  );
}
