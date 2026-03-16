declare module "astro:actions" {
	type Actions = typeof import("C:/Users/steve/projects/steveackleyorg/src/actions/index.ts")["server"];

	export const actions: Actions;
}