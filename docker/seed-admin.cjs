/**
 * Seed Admin User — runs at container startup via entrypoint.sh
 *
 * Better Auth (emailAndPassword) reads the credential from the Account table
 * (providerId = 'credential', password = scrypt `<salt>:<key>`), NOT from
 * User.passwordHash. The previous version of this script only wrote the dead
 * User.passwordHash column, so deploys never actually provisioned a working
 * login. This version upserts the Better Auth Account credential.
 *
 * Credential source (first match wins):
 *   1. ADMIN_PASSWORD       — plaintext, hashed here with scrypt
 *   2. ADMIN_PASSWORD_HASH  — only if already in scrypt `salt:key` format
 * A legacy bcrypt ADMIN_PASSWORD_HASH cannot be used by Better Auth; in that
 * case the User row is still ensured but the script warns that login will not
 * work until ADMIN_PASSWORD is provided.
 */
const postgres = require("postgres");
const { randomUUID } = require("node:crypto");
const { hashPassword, isScryptHash } = require("./password.cjs");

const ADMIN_NAME = "Steve Ackley";

async function resolveCredentialHash() {
  const plaintext = process.env.ADMIN_PASSWORD;
  if (plaintext) {
    return hashPassword(plaintext);
  }
  const legacy = process.env.ADMIN_PASSWORD_HASH;
  if (isScryptHash(legacy)) {
    return legacy;
  }
  return null;
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const dbUrl = process.env.DATABASE_URL;

  if (!email || !dbUrl) {
    console.log("  ADMIN_EMAIL or DATABASE_URL not set, skipping admin seed.");
    return;
  }

  const credentialHash = await resolveCredentialHash();
  if (!credentialHash) {
    console.log(
      "  ⚠ No usable admin password: set ADMIN_PASSWORD (plaintext). " +
        "A bcrypt ADMIN_PASSWORD_HASH is NOT usable by Better Auth — login will " +
        "not work until ADMIN_PASSWORD is provided. Ensuring User row only."
    );
  }

  const sql = postgres(dbUrl, { max: 1 });

  try {
    // ── Upsert the User row ──────────────────────────────────────────────────
    const [existingUser] = await sql`
      SELECT id FROM "User" WHERE email = ${email} LIMIT 1
    `;

    let userId;
    if (existingUser) {
      userId = existingUser.id;
      await sql`
        UPDATE "User"
        SET name = ${ADMIN_NAME},
            role = 'ADMIN',
            "emailVerified" = true,
            "passwordHash" = COALESCE(${credentialHash}, "passwordHash"),
            "updatedAt" = NOW()
        WHERE id = ${userId}
      `;
      console.log(`  ✓ Updated admin user: ${email}`);
    } else {
      userId = randomUUID();
      await sql`
        INSERT INTO "User" (id, email, name, role, "emailVerified", "passwordHash", "createdAt", "updatedAt")
        VALUES (${userId}, ${email}, ${ADMIN_NAME}, 'ADMIN', true, ${credentialHash}, NOW(), NOW())
      `;
      console.log(`  ✓ Created admin user: ${email}`);
    }

    if (!credentialHash) {
      return; // User ensured; nothing to provision for login.
    }

    // ── Upsert the Better Auth credential Account row ────────────────────────
    const [existingAccount] = await sql`
      SELECT id FROM "Account"
      WHERE "userId" = ${userId} AND "providerId" = 'credential'
      LIMIT 1
    `;

    if (existingAccount) {
      await sql`
        UPDATE "Account"
        SET password = ${credentialHash}, "updatedAt" = NOW()
        WHERE id = ${existingAccount.id}
      `;
      console.log("  ✓ Updated Better Auth credential account");
    } else {
      await sql`
        INSERT INTO "Account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${userId}, ${email}, 'credential', ${credentialHash}, NOW(), NOW())
      `;
      console.log("  ✓ Created Better Auth credential account");
    }
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error("  ✗ Admin seed error:", e.message);
  process.exit(1);
});
