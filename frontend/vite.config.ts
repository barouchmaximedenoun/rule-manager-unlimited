import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    proxy: {
      '/rules': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      overlay: false, // optionnel, pour éviter des conflits HMR
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'], // force Vite à ne pas dupliquer react
  },
  optimizeDeps: {
    include: ['react', 'react-dom'], // empêche le pré-bundling de react
  },
});
