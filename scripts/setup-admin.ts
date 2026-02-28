#!/usr/bin/env tsx
/**
 * Setup Admin User Script
 * Run: npm run setup:admin
 *
 * Creates or updates the admin user in the database using env vars:
 *   ADMIN_EMAIL, ADMIN_PASSWORD_HASH (or prompts for password)
 */
import "dotenv/config";
import { PrismaClient } from "../prisma/generated/client.js";
import { PrismaPpg } from "@prisma/adapter-ppg";
import { hash } from "bcryptjs";
import * as readline from "readline";

const adapter = new PrismaPpg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer); });
  });
}

async function main() {
  const email = process.env.ADMIN_EMAIL ?? (await prompt("Admin email: "));
  let passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!passwordHash || passwordHash.startsWith("$2b$12$replace")) {
    const password = await prompt("Admin password (will be hashed): ");
    if (password.length < 8) { console.error("Password must be at least 8 characters"); process.exit(1); }
    console.log("Hashing password...");
    passwordHash = await hash(password, 12);
    console.log("\nGenerated hash. Add this to your .env.local file:");
    console.log(`ADMIN_PASSWORD_HASH="${passwordHash}"`);
    console.log("\nFor production, set the ADMIN_PASSWORD_HASH GitHub Secret to:");
    console.log(passwordHash);
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { passwordHash, name: "Steve Ackley" } });
    console.log(`\nUpdated admin user: ${email}`);
  } else {
    await prisma.user.create({ data: { email, passwordHash, name: "Steve Ackley" } });
    console.log(`\nCreated admin user: ${email}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
