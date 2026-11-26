import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  site: 'https://steveackley.org',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), mdx()],
  // checkOrigin (Astro's CSRF guard) is disabled because the site runs behind a
  // Cloudflare Tunnel that terminates TLS and forwards plain HTTP to the container.
  // Astro then computes url.origin as http://… while the browser sends an https
  // Origin header, so every form POST (image upload, admin saves) was rejected with
  // "Cross-site POST form submissions are forbidden" (403). CSRF is still covered:
  // Better Auth session cookies are SameSite=Lax + Secure, so a cross-site POST
  // never carries the admin session. Re-enable once the tunnel forwards
  // X-Forwarded-Proto: https so Astro computes the correct https origin.
  security: {
    checkOrigin: false,
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
    // Pin JSX runtime to automatic. Without this, dep-resolution drift can flip
    // esbuild to the default 'transform' (classic), which emits React.createElement
    // without auto-importing React and breaks client-only React islands.
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'react',
    },
    ssr: {
      noExternal: ['@tiptap/*', 'better-auth', /^better-auth\/.*/],
    },
    build: {
      // Vite writes any asset under 4 KB into the CSS as a base64 data: URI. Six JetBrains
      // Mono subset files are that small, and the policy in src/middleware.ts is
      // font-src 'self', so the browser refused each one on every page. Keep fonts as files.
      // Returning nothing leaves every other asset on the default rule.
      assetsInlineLimit: (filePath) => (/\.(woff2?|ttf|otf|eot)$/i.test(filePath) ? false : undefined),
    },
    server: {
      headers: {
        // Allow 'unsafe-eval' in dev mode — Vite 8's module transform pipeline
        // uses eval-based source maps for HMR; the TipTap/ProseMirror editor
        // also uses new Function() for schema accessors.
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self'",
          "img-src 'self' data: blob: https:",
          "connect-src 'self' ws: wss: https:",
          "worker-src 'self' blob:",
        ].join('; '),
      },
    },
  }
});
