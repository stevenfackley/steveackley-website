// frontend/src/lib/stores.ts

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// User store (we will use this later for login)
export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}
export const user = writable<User | null>(null);


// --- THIS IS THE IMPORTANT PART ---
// Theme store: Manages 'light' or 'dark'
const initialTheme = browser ? window.localStorage.getItem('theme') : 'light';

export const theme = writable<'light' | 'dark'>(initialTheme as 'light' | 'dark' || 'light');

// When the theme store changes, we update two things:
// 1. localStorage so the theme persists across visits.
// 2. The class on the main <html> element.
theme.subscribe((value) => {
  if (browser) {
    window.localStorage.setItem('theme', value);
    
    // This is the line that actually enables dark mode in Tailwind
    document.documentElement.classList.toggle('dark', value === 'dark');
    
    // This line is for daisyUI, which you have installed
    document.documentElement.setAttribute('data-theme', value);
  }
});