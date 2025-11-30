import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Ensure all modules resolve to the same React instance
      "react": path.resolve(__dirname, '../../node_modules/react'),
      "react-dom": path.resolve(__dirname, '../../node_modules/react-dom'),
    },
  },
  server: {
    port: 8081, // Admin frontend will run on port 8081
    fs: {
      // Allow serving files from node_modules and the current project root
      allow: [
        '../../node_modules', // For the main monorepo node_modules
        path.resolve(__dirname), // Explicitly allow the current project root (admin-panel/frontend)
      ], 
    },
  },
});