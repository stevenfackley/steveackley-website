declare module "astro:actions" {
	type Actions = typeof import("/mnt/c/Users/steve/projects/steveackleyorg/src/actions/index.ts")["server"];

	export const actions: Actions;
}