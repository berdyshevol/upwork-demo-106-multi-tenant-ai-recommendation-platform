import crypto from "node:crypto";

/**
 * Bring-Your-Own-Key cookie crypto.
 *
 * The visitor's OpenAI key is never persisted server-side and never sent to the
 * browser in readable form. It lives only inside an HttpOnly cookie, AES-256-GCM
 * encrypted with a server secret, and is decrypted per-request when an AI feature
 * runs. If BYOK_COOKIE_SECRET is rotated, existing cookies simply fail to decrypt
 * and the visitor is re-prompted — no key ever leaks.
 */

export const BYOK_COOKIE = "adviso_openai_key";

function secret(): Buffer {
  const raw = process.env.BYOK_COOKIE_SECRET;
  if (!raw) {
    throw new Error("BYOK_COOKIE_SECRET is not set");
  }
  // Accept base64 (preferred) or any string; always derive a stable 32 bytes.
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptKey(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secret(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptKey(token: string | undefined | null): string | null {
  if (!token) return null;
  try {
    const [ivB64, tagB64, dataB64] = token.split(".");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      secret(),
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

/** Cheap shape check so we reject obvious garbage before spending a request. */
export function looksLikeOpenAIKey(key: string): boolean {
  return /^sk-[A-Za-z0-9_\-]{20,}$/.test(key.trim());
}
