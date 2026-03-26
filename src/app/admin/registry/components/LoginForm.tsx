"use client";

import styles from "../page.module.css";

interface LoginFormProps {
  password: string;
  setPassword: (v: string) => void;
  onLogin: (e: React.FormEvent) => void;
  error: string;
}

export function LoginForm({ password, setPassword, onLogin, error }: LoginFormProps) {
  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <h1>🔒 Registry Admin</h1>
        <form onSubmit={onLogin}>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
          />
          <button type="submit" className={styles.btnPrimary}>Login</button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
