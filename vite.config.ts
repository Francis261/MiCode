import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger"; // Removed lovable-tagger

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react() /* mode === "development" && componentTagger()*/].filter(Boolean), // Removed lovable-tagger
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));