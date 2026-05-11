import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Repo lives at github.com/Pvaliuttto90/Civ → served at /civ/ on Pages.
export default defineConfig({
  plugins: [react()],
  base: '/civ/',
  server: {
    host: true,
    port: 5173,
  },
});
