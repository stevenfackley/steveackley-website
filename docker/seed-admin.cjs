/**
 * Seed Admin User — runs at container startup via entrypoint.sh
 * (Drizzle version)
 */
const postgres = require("postgres");
const { drizzle } = require("drizzle-orm/postgres-js");

// Minimal schema for seeding
const { pgTable, text, boolean, pgEnum, timestamp } = require("drizzle-orm/pg-core");
const { eq } = require("drizzle-orm");

const roleEnum = pgEnum("Role", ["ADMIN", "CLIENT"]);
const users = pgTable("User", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash"),
  name: text("name"),
  role: roleEnum("role").notNull().default("CLIENT"),
  emailVerified: boolean("emailVerified").notNull().default(false),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const dbUrl = process.env.DATABASE_URL;

  if (!email || !passwordHash || !dbUrl) {
    console.log("  ADMIN_EMAIL, ADMIN_PASSWORD_HASH or DATABASE_URL not set, skipping admin seed.");
    return;
  }

  const queryClient = postgres(dbUrl, { max: 1 });
  const db = drizzle(queryClient);

  try {
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existing) {
      if (existing.passwordHash !== passwordHash || existing.role !== "ADMIN") {
        await db
          .update(users)
          .set({ passwordHash, name: "Steve Ackley", role: "ADMIN", emailVerified: true, updatedAt: new Date() })
          .where(eq(users.email, email));
        console.log(`  ✓ Updated admin user: ${email}`);
      } else {
        console.log(`  ✓ Admin user up to date: ${email}`);
      }
    } else {
      await db.insert(users).values({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        email,
        passwordHash,
        name: "Steve Ackley",
        role: "ADMIN",
        emailVerified: true,
      });
      console.log(`  ✓ Created admin user: ${email}`);
    }
  } finally {
    await queryClient.end();
  }
}

main().catch((e) => {
  console.error("  ✗ Admin seed error:", e.message);
  process.exit(1);
});
