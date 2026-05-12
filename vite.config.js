import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Repo is github.com/Pvaliuttto90/Civ. GitHub Pages preserves repo case in
// the URL, so the site is served under /Civ/ (capital C). The base must
// match exactly or every hashed asset request 404s and the page is blank.
export default defineConfig({
  plugins: [react()],
  base: '/Civ/',
  server: {
    host: true,
    port: 5173,
  },
});
