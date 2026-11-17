import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Consumir @pg/contracts desde su código TypeScript
  resolve: { conditions: ['source', 'module', 'browser', 'development|production'] },
  server: { port: 5173 },
});
