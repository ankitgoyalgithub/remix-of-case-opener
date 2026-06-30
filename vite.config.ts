import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  plugins: [
    react(),
    // lovable-tagger rewrites the JSX dev runtime to wrap every element's ref
    // with a fresh inline callback each render, so React detaches/re-attaches
    // refs on every commit. That ref churn breaks tooling that relies on stable
    // element handles (browser automation, some ref-based libraries) and adds
    // render jank. It's only needed for Lovable.dev's visual "click-to-edit"
    // editor, so keep it OFF for normal local dev and opt in explicitly with
    // `LOVABLE_TAGGER=1 npm run dev` when using the Lovable editor.
    mode === "development" && process.env.LOVABLE_TAGGER === "1" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
