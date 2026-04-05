import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import astroParser from "astro-eslint-parser";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs["flat/recommended"],
  {
    files: ["**/*.astro"],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".astro"],
      },
    },
  },
  {
    ignores: [
      "dist/**",
      ".astro/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "test-*.js",
    ],
  },
];
