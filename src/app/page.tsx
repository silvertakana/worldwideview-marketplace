import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.hero}>
      <span className={styles.badge}>Marketplace</span>
      <h1>WorldWideView Marketplace</h1>
      <p>
        Browse, publish, and install data source plugins for the real-time 3D
        globe intelligence platform.
      </p>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>7</span>
          <span className={styles.statLabel}>Plugins</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>5</span>
          <span className={styles.statLabel}>Categories</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>3</span>
          <span className={styles.statLabel}>Formats</span>
        </div>
      </div>
    </main>
  );
}
