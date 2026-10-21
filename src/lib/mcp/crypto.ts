import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * High-entropy opaque token. The prefix makes leaked tokens easy to
 * recognise (and to revoke in bulk) without revealing anything.
 */
export function randomToken(prefix: string, bytes = 32) {
  return `${prefix}${randomBytes(bytes).toString("base64url")}`;
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** PKCE S256 challenge for a code verifier. */
export function pkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function timingSafeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return createHash("sha256")
    .update(left)
    .digest()
    .equals(createHash("sha256").update(right).digest());
}

/**
 * AES-256-GCM. The key comes from MCP_TOKEN_ENCRYPTION_KEY (64 hex chars).
 * Format: iv.tag.ciphertext, all base64url.
 */
export function encryptJson(keyHex: string, payload: unknown) {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32)
    throw new Error("MCP_TOKEN_ENCRYPTION_KEY must be 32 bytes of hex.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    body.toString("base64url"),
  ].join(".");
}

export function decryptJson<T>(keyHex: string, ciphertext: string): T {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32)
    throw new Error("MCP_TOKEN_ENCRYPTION_KEY must be 32 bytes of hex.");
  const [ivPart, tagPart, bodyPart] = ciphertext.split(".");
  if (!ivPart || !tagPart || !bodyPart)
    throw new Error("Malformed encrypted payload.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(bodyPart, "base64url")),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString("utf8")) as T;
}
