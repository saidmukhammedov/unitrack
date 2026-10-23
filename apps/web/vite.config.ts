import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@unitrack/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      '@unitrack/academic-core': path.resolve(__dirname, '../../packages/academic-core/src'),
      '@unitrack/i18n': path.resolve(__dirname, '../../packages/i18n/src'),
      '@unitrack/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
    },
  },
  server: {
    port: 5173,
  },
});
