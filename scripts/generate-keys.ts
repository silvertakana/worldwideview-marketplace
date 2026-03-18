/**
 * One-time script to generate an Ed25519 key pair for registry signing.
 * Run: npx tsx scripts/generate-keys.ts
 *
 * Output:
 *   REGISTRY_PRIVATE_KEY=<base64>  → add to .env (marketplace only)
 *   Public key (base64)            → hardcode in both marketplace + WWV
 */
import { generateKeyPairSync } from "crypto";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");

const privB64 = privateKey
  .export({ type: "pkcs8", format: "der" })
  .toString("base64");

const pubB64 = publicKey
  .export({ type: "spki", format: "der" })
  .toString("base64");

console.log("=== Ed25519 Key Pair ===\n");
console.log(`REGISTRY_PRIVATE_KEY=${privB64}\n`);
console.log(`Public key (hardcode in both codebases):\n${pubB64}\n`);
