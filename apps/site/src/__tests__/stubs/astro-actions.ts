/**
 * Stand-in for Astro's `astro:actions` virtual module, which only exists
 * inside an Astro build. vitest.config.ts aliases the id to this file so
 * jsdom component tests can import islands that call actions (jsdom runs
 * Vite's browser transform, which must resolve every import). Tests still
 * vi.mock("astro:actions") with the behaviour they need.
 */
export const actions: Record<string, unknown> = {};

export function defineAction<T>(def: T): T {
  return def;
}

export class ActionError extends Error {}
