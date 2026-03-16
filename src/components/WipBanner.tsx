import styles from "./WipBanner.module.css";

export default function WipBanner() {
  return (
    <div role="status" aria-label="Work in progress" className={styles.banner}>
      <span className={styles.icon}>🚧</span>
      <span className={styles.text}>
        This marketplace is under active development — features may be
        incomplete or change without notice.
      </span>
      <span className={styles.icon}>🚧</span>
    </div>
  );
}
