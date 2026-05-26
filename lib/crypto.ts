// lib/crypto.ts
// Enkripsi/dekripsi AES-256-GCM untuk menyimpan credentials
// dan session cookies secara aman di database.

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY tidak dikonfigurasi.");
  // Key harus 64 hex chars (= 32 bytes)
  if (key.length !== 64) throw new Error("TOKEN_ENCRYPTION_KEY harus 64 karakter hex (32 bytes).");
  return Buffer.from(key, "hex");
}

/**
 * Mengenkripsi plaintext menggunakan AES-256-GCM.
 * Output: base64 string berformat "iv:authTag:ciphertext"
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Mendekripsi ciphertext yang dihasilkan oleh fungsi encrypt().
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(":");

  if (!ivB64 || !authTagB64 || !encryptedB64) {
    throw new Error("Format ciphertext tidak valid.");
  }

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted) + decipher.final("utf8");
}

/**
 * Generate key acak 32 byte (64 hex chars) untuk TOKEN_ENCRYPTION_KEY.
 * Jalankan sekali saat setup: node -e "require('./lib/crypto').generateKey()"
 */
export function generateKey(): string {
  const key = crypto.randomBytes(32).toString("hex");
  console.log("TOKEN_ENCRYPTION_KEY=" + key);
  return key;
}
