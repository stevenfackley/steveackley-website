import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
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
      },
    },
    ssr: {
      noExternal: ['@tiptap/*']
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
