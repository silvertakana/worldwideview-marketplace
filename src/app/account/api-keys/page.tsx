import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ApiKeyList } from "./ApiKeyList";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const authHost = process.env.NEXT_PUBLIC_AUTH_HOST_URL!;
    redirect(`${authHost}/login?next=${encodeURIComponent("/account/api-keys")}`);
  }

  const marketplaceUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
  });

  if (!marketplaceUser) {
    redirect("/");
  }

  const apiKeys = await prisma.marketplaceApiKey.findMany({
    where: {
      userId: marketplaceUser.id,
      revokedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      keyPrefix: true,
      name: true,
      createdAt: true,
    },
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>API Keys</h1>
        <p className={styles.subtitle}>
          Manage API keys used to authenticate your WorldWideView instance.
        </p>
      </div>

      {apiKeys.length > 0 ? (
        <ApiKeyList keys={apiKeys} />
      ) : (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔑</span>
          <h2 className={styles.emptyTitle}>No API Keys</h2>
          <p className={styles.emptyDesc}>
            You haven&apos;t generated any API keys yet. Connect your
            WorldWideView instance from the OAuth flow to create one.
          </p>
        </div>
      )}
    </div>
  );
}
