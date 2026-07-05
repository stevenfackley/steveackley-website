#!/usr/bin/env tsx
/**
 * Setup Admin User Script (Drizzle)
 * Run: npm run setup:admin
 *
 * Creates or updates the admin user AND the Better Auth credential (Account
 * row) using env vars ADMIN_EMAIL / ADMIN_PASSWORD (or prompts interactively).
 *
 * Better Auth's emailAndPassword provider reads the credential from the
 * Account table (providerId = "credential", password = scrypt `<salt>:<key>`),
 * NOT from User.passwordHash. The previous version of this script only wrote
 * the dead User.passwordHash column with a bcrypt hash, so running it never
 * actually produced a working login. See docker/seed-admin.cjs, which already
 * carries this same fix for the container-boot seed path.
 */
import "dotenv/config";
import { db, users, accounts } from "../src/db/index.ts";
import { and, eq } from "drizzle-orm";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import * as readline from "readline";

const require = createRequire(import.meta.url);
const { hashPassword, isScryptHash } = require("../../../docker/password.cjs");

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer); });
  });
}

async function main() {
  const email = process.env.ADMIN_EMAIL ?? (await prompt("Admin email: "));

  let credentialHash: string;
  const envHash = process.env.ADMIN_PASSWORD_HASH;
  if (process.env.ADMIN_PASSWORD) {
    credentialHash = await hashPassword(process.env.ADMIN_PASSWORD);
  } else if (envHash && isScryptHash(envHash)) {
    credentialHash = envHash;
  } else {
    if (envHash) {
      console.warn(
        "ADMIN_PASSWORD_HASH is not in Better Auth's scrypt format and will be ignored. Set ADMIN_PASSWORD (plaintext) instead."
      );
    }
    const password = await prompt("Admin password (will be hashed): ");
    if (password.length < 8) {
      console.error("Password must be at least 8 characters");
      process.exit(1);
    }
    console.log("Hashing password...");
    credentialHash = await hashPassword(password);
  }

  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
    await db
      .update(users)
      .set({ passwordHash: credentialHash, name: "Steve Ackley", role: "ADMIN", emailVerified: true })
      .where(eq(users.id, userId));
    console.log(`\nUpdated admin user: ${email}`);
  } else {
    userId = randomUUID();
    await db.insert(users).values({
      id: userId,
      email,
      passwordHash: credentialHash,
      name: "Steve Ackley",
      role: "ADMIN",
      emailVerified: true,
    });
    console.log(`\nCreated admin user: ${email}`);
  }

  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")))
    .limit(1);

  if (existingAccount) {
    await db.update(accounts).set({ password: credentialHash }).where(eq(accounts.id, existingAccount.id));
    console.log("Updated Better Auth credential account");
  } else {
    await db.insert(accounts).values({
      id: randomUUID(),
      userId,
      accountId: email,
      providerId: "credential",
      password: credentialHash,
    });
    console.log("Created Better Auth credential account");
  }
}

main().catch(console.error).finally(() => process.exit(0));
