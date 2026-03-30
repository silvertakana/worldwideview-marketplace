"use client";
import { useState } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

export default function SubmitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setError("");

    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    try {
      const res = await fetch("/api/plugins/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Submission failed");
      }

      setSuccess(true);
      form.reset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`container ${styles.container}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Submit a Plugin</h1>
        <p className={styles.subtitle}>
          Publish your custom data layer to the WorldWideView marketplace.
          Submissions are reviewed before becoming publicly visible.
        </p>
      </div>

      {success && (
        <div className={styles.successBox}>
          <h3>Plugin Submitted Successfully!</h3>
          <p>Thank you. Your plugin is now pending review.</p>
          <button className={styles.submitBtn} onClick={() => setSuccess(false)}>Submit Another</button>
        </div>
      )}

      {!success && (
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.fieldGroup}>
            <label htmlFor="npmPackage">NPM Package Name</label>
            <input className={styles.input} type="text" id="npmPackage" name="npmPackage" required placeholder="e.g. @worldwideview/wwv-plugin-awesome" />
            <p className={styles.fieldHint} style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
              Ensure your package is published publicly and contains the <code>worldwideview</code> metadata object in its package.json.
            </p>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Submitting..." : "Submit Plugin"}
          </button>
        </form>
      )}
    </main>
  );
}
