import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Get repository name from environment or use default
// For GitHub Pages: if repo is "my-repo", base should be "/my-repo/"
// For custom domain or root: use "/"
// Set via .env file: VITE_REPO_NAME=your-repo-name
const REPO_NAME = process.env.VITE_REPO_NAME || 'exam-simulator-app';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? `/${REPO_NAME}/` : '/',
  build: {
    outDir: 'dist',
  },
}));



