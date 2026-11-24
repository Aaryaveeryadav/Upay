import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Browser requests remain same-origin; only Vite talks to the Node server.
// In production the same files are served by server.js (or Vercel) from
// /assets/app/, and the backend routes are the ones in api/ and server.js.
const backend = process.env.UPAY_WEB_BACKEND || 'http://127.0.0.1:8004';
export default defineConfig({
  root: __dirname,
  base: '/assets/app/',
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app', 'localhost', '.arena.ai'],
    proxy: {
      '^/assets/(?!app/)': backend,
      '/api': backend
    }
  },
  build: {
    outDir: '../../assets/app', emptyOutDir: true,
    // One classic script with stable names: the Node server can serve it from
    // any route, a browser test can run it in JSDOM, and a cache-busting
    // query is not needed for a file whose contents change together.
    modulePreload: false,
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'app.js',
        chunkFileNames: '[name].js',
        assetFileNames: info => String(info.name || '').endsWith('.css') ? 'app.css' : '[name][extname]'
      }
    }
  }
});
