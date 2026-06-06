import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
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
    server: {
      headers: {
        // Allow 'unsafe-eval' in dev mode — Vite 7's module transform pipeline
        // uses eval-based source maps for HMR; the TipTap/ProseMirror editor
        // also uses new Function() for schema accessors.
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          "connect-src 'self' ws: wss: https:",
          "worker-src 'self' blob:",
        ].join('; '),
      },
    },
  }
});
