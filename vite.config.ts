import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('/node_modules/katex/')) {
            return 'vendor-katex';
          }
          if (
            normalized.includes('/node_modules/framer-motion/') ||
            normalized.includes('/node_modules/motion-dom/') ||
            normalized.includes('/node_modules/motion-utils/')
          ) {
            return 'vendor-motion';
          }
          if (
            normalized.includes('/node_modules/recharts/') ||
            normalized.includes('/node_modules/d3-') ||
            normalized.includes('/node_modules/victory-vendor/')
          ) {
            return 'vendor-charts';
          }
        },
      },
    },
  },
});
