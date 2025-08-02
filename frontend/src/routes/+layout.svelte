<script lang="ts">
	import '../app.css';
	import { Toaster } from 'svelte-sonner';
	import Header from '$lib/components/Header.svelte';

	// Initialize the theme store. The logic in stores.ts handles the rest.
	import { theme } from '$lib/stores';
	$theme; // This subscription ensures the theme logic runs on load
</script>

<Toaster position="top-right" richColors />

<div class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
	<Header />
	<main class="flex-grow container mx-auto p-4 md:p-8">
		<slot />
	</main>
	<footer class="footer footer-center p-4 bg-base-300 text-base-content">
		<div>
			<p>Copyright © {new Date().getFullYear()} - All rights reserved by Steve Ackley</p>
		</div>
	</footer>
</div>