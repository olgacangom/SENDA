import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5174,
    host: true,
    allowedHosts: [
      'senda.sendaproject.es',
      '192.168.20.84',
      'localhost',
      'senda01.int.local',
    ],
  },
});