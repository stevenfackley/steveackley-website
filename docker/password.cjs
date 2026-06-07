/**
 * Password hashing for the admin seed — must match Better Auth exactly.
 *
 * Better Auth (@better-auth/utils/password) stores credentials as
 *   `<saltHex>:<keyHex>`
 * using scrypt with N=16384, r=16, p=1, dkLen=64 and the salt passed as its
 * hex *string*. The password is NFKC-normalized first. Reproduced here so the
 * container seed can provision a credential row Better Auth can verify.
 *
 * Pure node:crypto — no DB, no deps — so it stays trivially testable.
 */
const { randomBytes, scrypt } = require("node:crypto");
const { promisify } = require("node:util");

const scryptAsync = promisify(scrypt);

const SCRYPT_PARAMS = { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 };
const KEY_LEN = 64;

async function hashPassword(password) {
  const saltHex = randomBytes(16).toString("hex");
  const normalized = password.normalize("NFKC");
  const key = await scryptAsync(normalized, saltHex, KEY_LEN, SCRYPT_PARAMS);
  return `${saltHex}:${key.toString("hex")}`;
}

function isScryptHash(value) {
  return typeof value === "string" && /^[0-9a-f]+:[0-9a-f]+$/i.test(value);
}

module.exports = { hashPassword, isScryptHash };
