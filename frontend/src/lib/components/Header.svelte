<script lang="ts">
	import { page } from '$app/stores';
	import { theme } from '$lib/stores';
	import { Sun, Moon } from 'lucide-svelte'; // Clean icons

	function toggleTheme() {
		theme.update((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
	}
</script>

<header class="navbar bg-base-200 shadow-md px-4">
	<div class="navbar-start">
		<a href="/" class="btn btn-ghost normal-case text-xl font-bold"> SteveAckley.org </a>
	</div>
	<div class="navbar-center hidden lg:flex">
		<ul class="menu menu-horizontal px-1">
			<li><a href="/" class:active={$page.url.pathname === '/'}>Professional</a></li>
			<li><a href="/blog" class:active={$page.url.pathname.startsWith('/blog')}>Blog</a></li>
			</ul>
	</div>
	<div class="navbar-end">
		<button on:click={toggleTheme} class="btn btn-ghost btn-circle" aria-label="Toggle theme">
				{#if $theme === 'light'}
					<Moon class="w-6 h-6" />
				{:else}
					<Sun class="w-6 h-6" />
				{/if}
			</button>
		</div>
</header>