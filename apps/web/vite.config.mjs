import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Browser requests remain same-origin; only Vite talks to the Node server.
const backend = process.env.UPAY_WEB_BACKEND || 'http://127.0.0.1:8004';
export default defineConfig({
  root: __dirname,
  base: '/assets/react-study/',
  server: {
    host: '0.0.0.0', allowedHosts: ['.e2b.app', 'localhost'],
    proxy: {
      '^/assets/(?!react-study/)': backend,
      '/legacy': {target: backend, rewrite: path => path.replace(/^\/legacy/, '') || '/'},
      '/api': backend,
      '/sw.js': backend,
    },
  },
  build: {outDir:'../../assets/react-study', emptyOutDir:true},
});
