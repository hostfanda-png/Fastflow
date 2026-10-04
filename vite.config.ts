import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl =
    env.VITE_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    process.env.LARAVEL_BACKEND_URL ||
    'http://127.0.0.1:8000';

  const proxyConfig = {
    '/api': {
      target: backendUrl,
      changeOrigin: true,
      secure: false,
      headers: {
        Accept: 'application/json',
      },
    },
    '/sanctum': {
      target: backendUrl,
      changeOrigin: true,
      secure: false,
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: proxyConfig,
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      proxy: proxyConfig,
    },
  };
});
