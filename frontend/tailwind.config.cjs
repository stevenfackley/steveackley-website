// frontend/tailwind.config.cjs

/** @type {import('tailwindcss').Config}*/
const config = {
  content: ["./src/**/*.{html,js,svelte,ts}"],

  // Add this line to enable class-based dark mode
  darkMode: "class",

  theme: {
    extend: {},
  },

  plugins: [require("daisyui")],

  // Optional: Add a theme for daisyUI
  daisyui: {
    themes: ["light", "dark"],
  },
};

module.exports = config;