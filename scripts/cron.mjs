/**
 * Lightweight daemon to trigger the NPM sync job inside the Docker container.
 * Runs independently of the Next.js server threads to ensure single execution.
 */

// Define interval in milliseconds (default: 1 minute = 60000ms)
const INTERVAL_MS = parseInt(process.env.NPM_SYNC_INTERVAL_MS || '60000', 10);
const TARGET_URL = `http://127.0.0.1:${process.env.PORT || '3000'}/api/cron/sync-npm`;

console.log(`[Cron Daemon] Started. Will ping ${TARGET_URL} every ${INTERVAL_MS / 1000 / 60} minutes.`);

// Boot delay: Wait 30 seconds for the Next.js database and server to fully initialize
setTimeout(async () => {
    console.log("[Cron Daemon] Running initial boot sync...");
    await runSync();
    
    // Set up the recurring interval
    setInterval(runSync, INTERVAL_MS);
}, 30000);

async function runSync() {
    try {
        const res = await fetch(TARGET_URL);
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
