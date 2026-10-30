import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// vite.config.js — Vite configuration.
// react(): JSX support + fast refresh. tailwindcss(): official Tailwind CSS v4 plugin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
