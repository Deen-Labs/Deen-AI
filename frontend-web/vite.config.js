import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'rewrite-deen-ai-dev',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url || '';
          const urlPath = rawUrl.split('?')[0];
          if (
            urlPath.toLowerCase() === '/deen-ai' ||
            urlPath.toLowerCase() === '/deen-ai/' ||
            urlPath.toLowerCase() === '/deenhub' ||
            urlPath.toLowerCase() === '/deenhub/'
          ) {
            req.url = '/Deen-AI/index.html' + (rawUrl.includes('?') ? '?' + rawUrl.split('?')[1] : '');
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url || '';
          const urlPath = rawUrl.split('?')[0];
          if (
            urlPath.toLowerCase() === '/deen-ai' ||
            urlPath.toLowerCase() === '/deen-ai/' ||
            urlPath.toLowerCase() === '/deenhub' ||
            urlPath.toLowerCase() === '/deenhub/'
          ) {
            req.url = '/Deen-AI/index.html' + (rawUrl.includes('?') ? '?' + rawUrl.split('?')[1] : '');
          }
          next();
        });
      },
    },
  ],
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        deenAi: resolve(__dirname, 'Deen-AI/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: ['**/*.apk', '**/assets/*.apk', '**/.git/**'],
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
});
