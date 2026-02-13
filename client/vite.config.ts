import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: '/', // Capacitor WebView에서 https://localhost/ 기준으로 리소스 로드
  envDir: path.resolve(__dirname, '..'),
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  define: mode === 'device' ? {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 'http://10.140.140.147:3001'
    ),
  } : undefined,
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
}));
