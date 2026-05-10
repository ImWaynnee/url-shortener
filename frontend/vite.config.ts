import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@src': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: Number(process.env.VITE_PORT) || 7777,
    strictPort: true,
  },
});
