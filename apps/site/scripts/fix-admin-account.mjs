/**
 * fix-admin-account.mjs
 *
 * Creates the missing Account row that better-auth needs for email/password login.
 *
 * better-auth stores credentials in the Account table (providerId = "credential").
 * The password hash format is: `<salt_hex>:<key_hex>`
 * using scrypt with N=16384, r=16, p=1, dkLen=64  (from better-auth/dist/crypto/password.mjs)
 *
 * Usage (run from WSL):
 *   node scripts/fix-admin-account.mjs <newPassword>
 *   node scripts/fix-admin-account.mjs MyNewPassword123
 */

import "dotenv/config";
import postgres from "postgres";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import * as readline from "readline";

const scryptAsync = promisify(scrypt);

// Must match better-auth's config exactly
async function hashPassword(password) {
  const saltBytes = randomBytes(16);
  const saltHex = saltBytes.toString("hex");
  // normalize NFKC like better-auth does
  const normalized = password.normalize("NFKC");
  const key = await scryptAsync(normalized, saltHex, 64, { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 });
  return `${saltHex}:${key.toString("hex")}`;
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a); }));
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) { console.error("❌  ADMIN_EMAIL not set in environment"); process.exit(1); }

  const password = process.argv[2] ?? await prompt(`New password for ${email}: `);
  if (password.length < 8) { console.error("❌  Password must be at least 8 characters"); process.exit(1); }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error("❌  DATABASE_URL not set"); process.exit(1); }

  console.log(`\n📧  Email : ${email}`);
  console.log("🔑  Hashing password with scrypt (N=16384, r=16, p=1, dkLen=64)…");

  const hashedPw = await hashPassword(password);
  console.log(`✓  Hash  : ${hashedPw.substring(0, 40)}…`);

  const sql = postgres(dbUrl, { max: 1 });

  try {
    // Find the user
    const [user] = await sql`SELECT id FROM "User" WHERE email = ${email} LIMIT 1`;
    if (!user) { console.error(`❌  No User row found for: ${email}`); process.exit(1); }
    console.log(`✓  User  : ${user.id}`);

    // Upsert credential Account row
    const [existing] = await sql`
      SELECT id FROM "Account"
      WHERE "userId" = ${user.id} AND "providerId" = 'credential'
      LIMIT 1
    `;

    if (existing) {
      await sql`
        UPDATE "Account"
        SET password = ${hashedPw}, "updatedAt" = NOW()
        WHERE id = ${existing.id}
      `;
      console.log(`✓  Updated existing credential Account row`);
    } else {
      const newId = crypto.randomUUID();
      await sql`
        INSERT INTO "Account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
        VALUES (${newId}, ${user.id}, ${email}, 'credential', ${hashedPw}, NOW(), NOW())
      `;
      console.log(`✓  Created new credential Account row`);
    }

    // Keep User.passwordHash in sync too
    await sql`
      UPDATE "User"
      SET "passwordHash" = ${hashedPw}, "emailVerified" = true, role = 'ADMIN'
      WHERE id = ${user.id}
    `;
    console.log(`✓  User.passwordHash updated`);

    console.log(`\n✅  Done! Sign in at /admin/login`);
    console.log(`   Email   : ${email}`);
    console.log(`   Password: ${password}`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => { console.error("❌ ", e.message); process.exit(1); });
