// Single source of truth lives in the shared package. This file used to be a
// hand-synced duplicate; it now re-exports so drizzle-kit (which reads this path
// via drizzle.config.ts) and runtime imports (`@/db/schema`) can't drift.
// NB: relative path, not the `@shared` alias — drizzle-kit's esbuild bundle does
// not resolve tsconfig path aliases.
export * from "../../../../packages/shared/src/db/schema";
