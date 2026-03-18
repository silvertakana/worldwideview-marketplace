import { createPrivateKey, createPublicKey, sign, verify } from "crypto";

/** Public key for verifying the signed registry (shared with WWV). */
export const REGISTRY_PUBLIC_KEY =
  "MCowBQYDK2VwAyEAkYDmLpCrHu1fnsu8CCdICOHg3IUGuDDkA4fpUeJANJk=";

/** Sign data with the registry private key (from env). */
export function signRegistry(data: string): string {
  const privKeyB64 = process.env.REGISTRY_PRIVATE_KEY;
  if (!privKeyB64) throw new Error("REGISTRY_PRIVATE_KEY not set");

  const keyObj = createPrivateKey({
    key: Buffer.from(privKeyB64, "base64"),
    format: "der",
    type: "pkcs8",
  });

  const signature = sign(null, Buffer.from(data), keyObj);
  return signature.toString("base64");
}

/** Verify a registry signature against the hardcoded public key. */
export function verifyRegistrySignature(
  data: string,
  signatureB64: string,
): boolean {
  const keyObj = createPublicKey({
    key: Buffer.from(REGISTRY_PUBLIC_KEY, "base64"),
    format: "der",
    type: "spki",
  });

  return verify(null, Buffer.from(data), keyObj, Buffer.from(signatureB64, "base64"));
}
