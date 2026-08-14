/**
 * Lightweight daemon to trigger internal cron jobs inside the Docker container.
 * Runs independently of the Next.js server threads to ensure single execution.
 *
 * Jobs:
 *  - NPM sync: refresh plugin metadata from the npm registry (default: every 6 hours)
 *  - Key revocation: revoke retired signing keys after the overlap window (default: every 5 minutes)
 */

// Define intervals in milliseconds (defaults: 6 hours / 5 minutes)
const INTERVAL_MS = parseInt(process.env.NPM_SYNC_INTERVAL_MS || '21600000', 10);
const REVOKE_INTERVAL_MS = parseInt(process.env.REVOKE_INTERVAL_MS || '300000', 10);
const TARGET_URL = `http://127.0.0.1:${process.env.PORT || '3000'}/api/cron/sync-npm`;
const REVOKE_URL = `http://127.0.0.1:${process.env.PORT || '3000'}/api/cron/revoke-retired-keys`;

console.log(`[Cron Daemon] Started. Will ping ${TARGET_URL} every ${INTERVAL_MS / 1000 / 60} minutes.`);
console.log(`[Cron Daemon] Will ping ${REVOKE_URL} every ${REVOKE_INTERVAL_MS / 1000 / 60} minutes.`);

// Boot delay: Wait 30 seconds for the Next.js database and server to fully initialize
setTimeout(async () => {
    console.log("[Cron Daemon] Running initial boot sync...");
    await runSync();
    await runRevoke();
    
    // Set up the recurring intervals
    setInterval(runSync, INTERVAL_MS);
    setInterval(runRevoke, REVOKE_INTERVAL_MS);
}, 30000);

async function runSync() {
    try {
        const headers = process.env.CRON_SECRET
            ? { Authorization: `Bearer ${process.env.CRON_SECRET}` }
            : {};
        const res = await fetch(TARGET_URL, { headers });
        if (res.ok) {
            const data = await res.json();
            console.log(`[Cron Daemon] Success: ${data.processedCount} updated, ${data.failedCount} failed.`);
        } else {
            console.error(`[Cron Daemon] Failed with status ${res.status}`);
        }
    } catch (error) {
        console.error(`[Cron Daemon] Network error hitting sync endpoint:`, error.message);
    }
}

// Revoke retired signing keys that have passed the KEY_OVERLAP_MS window.
// Authenticates with the same CRON_SECRET bearer token the cron routes expect.
// Non-fatal: if CRON_SECRET is not configured the route returns 503 and we log + continue.
async function runRevoke() {
    try {
        const headers = process.env.CRON_SECRET
            ? { Authorization: `Bearer ${process.env.CRON_SECRET}` }
            : {};
        const res = await fetch(REVOKE_URL, { headers });
        if (res.ok) {
            const data = await res.json();
            console.log(`[Cron Daemon] Revoke success: ${data.revokedCount} key(s) revoked.`);
        } else if (res.status === 503) {
            console.log(`[Cron Daemon] Revoke skipped: CRON_SECRET not configured (503). Configure CRON_SECRET to enable key revocation.`);
        } else {
            console.error(`[Cron Daemon] Revoke failed with status ${res.status}`);
        }
    } catch (error) {
        console.error(`[Cron Daemon] Network error hitting revoke endpoint:`, error.message);
    }
}
