/**
 * Seed Admin User — runs at container startup via entrypoint.sh
 *
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD_HASH from env vars (populated from
 * Docker secrets by the entrypoint). Upserts the admin user in Postgres.
 *
 * This is idempotent — safe to run on every container start.
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!email || !passwordHash) {
    console.log(
      "  ADMIN_EMAIL or ADMIN_PASSWORD_HASH not set, skipping admin seed."
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Only update if the hash actually changed or role needs fixing
    if (existing.passwordHash !== passwordHash || existing.role !== "ADMIN") {
      await prisma.user.update({
        where: { email },
        data: { passwordHash, name: "Steve Ackley", role: "ADMIN" },
      });
      console.log(`  ✓ Updated admin user: ${email}`);
    } else {
      console.log(`  ✓ Admin user up to date: ${email}`);
    }
  } else {
    await prisma.user.create({
      data: { email, passwordHash, name: "Steve Ackley", role: "ADMIN" },
    });
    console.log(`  ✓ Created admin user: ${email}`);
  }
}

main()
  .catch((e) => {
    console.error("  ✗ Admin seed error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
