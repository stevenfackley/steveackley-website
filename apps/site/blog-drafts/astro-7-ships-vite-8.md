<!--
Admin form fields:
  Title:    Astro 7 ships Vite 8, and Rolldown ate my Tailwind import
  Slug:     astro-7-ships-vite-8 (auto-derived)
  Excerpt:  I expected the Astro 6 to 7 bump to bring Vite 6. It brought Vite 8, which bundles with Rolldown instead of esbuild, which resolves `@import "tailwindcss"` as a filesystem path. One ENOENT, one plugin swap, done.
  Cover:    (none)
  Body:     everything below this comment
-->

Two Dependabot PRs had been sitting open on this site for a while: #186 for the Astro 6 to 7 group and #190 for `@vitejs/plugin-react` 5 to 6. Major bumps don't auto-merge here, so they wait for me, and I'd deferred them twice.

They waited because of a rule I wrote for myself: this repo auto-merges semver patches and nothing else. Minors and majors sit until a person does them. That rule works, and the cost of it is exactly this, a pile of framework majors that eventually needs an afternoon.

I finally did both by hand in PR #196. Five files changed, +1955/−558, almost all of it lockfile. One real failure, and it took longer to diagnose than it took to fix.

## The bumps

```
astro                  ^6.4.8  → ^7.0.4
@astrojs/react         ^5.0.7  → ^6.0.0
@astrojs/node          ^10.1.4 → ^11.0.0
@astrojs/mdx           ^6.0.3  → ^7.0.0
@vitejs/plugin-react   ^5.2.0  → ^6.0.3
vite (root override)   ^7.3.2  → ^8.0.0
```

That last line is the surprise. I'd budgeted this migration assuming Astro 7 would land on Vite 6, because that's what the version arithmetic in my head said. It ships Vite 8. And `@vitejs/plugin-react` 6 wants Vite 8 as a peer, so the root override had to move too, which is how a routine framework bump turned into a bundler swap.

Check what the framework actually pins before you plan the work. My mental model was a major behind on a dependency I don't name in my own package.json.

The override is worth a note of its own. This is an npm workspaces monorepo, and Vite arrives as a transitive dependency of several packages that each have their own peer range. Left alone, npm is entitled to install more than one copy, and two Vite instances in one build is a class of bug that presents as "the plugin didn't run" rather than as an error. So the root package.json pins one Vite for the whole tree. That pin is invisible in day-to-day work and load-bearing during a major bump: when `@vitejs/plugin-react` 6 required Vite 8 as a peer, the override was the single line that had to move, and it moved the bundler for every workspace at once.

## The failure

Build died immediately:

```
ENOENT: no such file or directory, open '/…/apps/site/tailwindcss'
```

That path is nonsense. There is no `apps/site/tailwindcss`. There has never been an `apps/site/tailwindcss`. The string comes from my global stylesheet, which starts with the Tailwind 4 entry point:

```css
@import "tailwindcss";
```

Vite 8 bundles with Rolldown instead of esbuild. Rolldown resolves that CSS `@import` specifier as a filesystem path relative to the importing file, rather than walking `node_modules` the way esbuild did. `@tailwindcss/postcss` had been the thing intercepting the bare specifier before the bundler ever saw it, and in the new pipeline it wasn't getting a chance.

Once you know that sentence, the error reads perfectly. Before you know it, you're staring at a path that doesn't exist and wondering which of six major bumps invented it.

## How I got there

The diagnosis was slower than it should have been because the error names a file, and a missing file is the most misleading possible framing for a resolution-strategy change. My first three moves were all wrong in the same way.

I searched the repo for the literal string `apps/site/tailwindcss`, assuming a bad path had been written somewhere. Nothing, because nothing wrote it. The bundler composed it out of a bare specifier and the importing file's directory.

I checked whether `node_modules/tailwindcss` existed. It did, correctly installed, which made the ENOENT look like a broken install and cost me a `rm -rf node_modules` and a reinstall that changed nothing.

I started bisecting the six version bumps, reverting the Astro majors one at a time. That would have found it eventually and it's the expensive path, because each attempt is a full install and build.

What actually cracked it was reading the failing path as a *shape* instead of a location. `<directory of the importing file>` + `<the exact text inside my @import>` is what relative filesystem resolution produces. Nothing in my configuration produces that string; a resolver treating a bare specifier as a relative path does. That points at the resolver, the resolver changed in this diff, and the change is named in the Vite 8 release notes.

The general lesson: when an error names a path that could not have been written by anyone, stop looking for who wrote it and work out what concatenated it.

## The fix

Swap the PostCSS plugin for the Vite plugin, so Tailwind resolves inside the bundler instead of in a preprocessing step ahead of it.

```js
// astro.config.mjs
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
```

Then clear the Tailwind entry out of `postcss.config.mjs` so the two aren't both trying to own the same `@import`. That's the entire change. `@tailwindcss/vite` is the documented path for Tailwind 4 in a Vite project and always was; the PostCSS route was a holdover from how the project got set up, and it worked right up until the bundler underneath it changed.

## What did not break

I want this list on the record, because most of the migration time went into ruling things out and none of it produced a diff. Every one of these was a live hypothesis while I was chasing an ENOENT with no stack trace worth reading.

- **`astro:transitions` internals.** No private imports, nothing reaching into the view-transitions implementation.
- **Reserved filename conflicts.** Astro 7 tightened some naming rules. No page in `src/pages` collided.
- **Experimental flags.** None enabled, so none removed or renamed under me.
- **`@astrojs/db`.** Not used here. The database layer is Drizzle against Postgres directly, which meant the Astro majors couldn't touch it.
- **remark and rehype plugins.** The MDX pipeline came through the `@astrojs/mdx` 6 to 7 bump unchanged.

If you're doing this migration, check the Tailwind entry point first and save yourself the tour.

## The residual

`@vitejs/plugin-react` 6 emits deprecation warnings for `esbuild` and `optimizeDeps.esbuildOptions`, both superseded by the oxc and `rolldownOptions` equivalents. That's upstream config the plugin is passing through, not mine, and it doesn't block the build. It'll go away on a plugin release.

## On reviewing a 2,500-line diff that's mostly lockfile

+1955/−558 across five files sounds like a big change and isn't. Four of the five files are one-line-ish: three version ranges in package.json files, the plugin wiring in `astro.config.mjs`, the removed entry in `postcss.config.mjs`. The fifth is `package-lock.json`, and it's the entire rest of the diff.

There's no useful way to read a lockfile diff line by line, so I don't pretend to. What I check instead is narrow and quick: that no package appears at two major versions where it should appear at one, that nothing unexpected showed up as a new direct dependency, and that the install is reproducible from a clean checkout on CI rather than from my machine's cache. The last one catches the failure mode I've been bitten by before, where a lockfile written on Windows resolves differently on a Linux runner and the build is green locally and red in CI for reasons that look like the code.

The review that matters for a bump like this happens in the browser and the test suite, not the diff.

## Verification

Build green. Dark mode and Tailwind rendering correct in the browser, which is the check that actually matters after touching the CSS pipeline, because a broken Tailwind resolve can also fail quietly by producing an empty stylesheet instead of an ENOENT. React island hydration confirmed on the three places I have islands: the bento dashboard, the admin surfaces, and the blog editor. Full test suite passing.

## The takeaway

The bundler swap was invisible in the changelog line I was reading and was the only thing that broke. Framework majors bring transitive majors, and the transitive ones are where the behavior lives. When a major bump fails on a path that doesn't exist, ask what changed about resolution before you ask what changed about your code.
