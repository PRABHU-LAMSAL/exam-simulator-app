import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Get base path from environment variable or use default
// For GitHub Pages: use your repository name (e.g., '/exam-simulator-app/')
// For root domain: use '/'
const base = process.env.VITE_BASE || './';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: base,
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild', // Use esbuild (default, no extra dependencies needed)
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
});
