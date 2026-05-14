import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';

  const plugins: Plugin[] = [react(), tailwindcss()];

  if (isProduction) {
    // Only load the Cloudflare plugin in production builds.
    // workerd (the Cloudflare Workers runtime) requires macOS 13.5+,
    // so we skip it during local development to avoid compatibility errors.
    const { cloudflare } = require('@cloudflare/vite-plugin');
    plugins.push(cloudflare());
  }

  return {
    plugins,
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});