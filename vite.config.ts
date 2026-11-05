import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site from /camo-generator/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/camo-generator/' : '/',
}));
