export interface PluginSubmitWebhookPayload {
  event: "plugin.submitted";
  timestamp: string; // ISO 8601 UTC
  plugin: {
    id: string;
    name: string;
    npmPackage: string;
    version: string; // resolved version from npm metadata (or "unknown")
    description: string; // from npm metadata
    category: string;
    icon: string;
  };
  submittedBy: {
    email: string | null;
    name: string | null;
  };
  adminUrl: string; // NEXT_PUBLIC_APP_URL + "/admin" or just "/admin" if not set
}

/**
 * Fire-and-forget webhook notification sent when a plugin is submitted.
 *
 * - No-op when SUBMIT_WEBHOOK_URL is not set.
 * - Includes X-WWV-Webhook-Secret header when SUBMIT_WEBHOOK_SECRET is set.
 * - Times out after 10 seconds.
 * - Never throws — all errors are silently console.warn'd.
 *
 * Usage: void firePluginSubmitWebhook(payload)
 */
export async function firePluginSubmitWebhook(
  payload: PluginSubmitWebhookPayload
): Promise<void> {
  const webhookUrl = process.env.SUBMIT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const secret = process.env.SUBMIT_WEBHOOK_SECRET;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) {
    headers["X-WWV-Webhook-Secret"] = secret;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    console.warn("[firePluginSubmitWebhook] Delivery failed:", err);
  } finally {
    clearTimeout(timeoutId);
  }
}
