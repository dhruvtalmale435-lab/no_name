import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const pages = loadEnv(mode, ".", "GITHUB_PAGES").GITHUB_PAGES === "true";
  return {
    base: pages ? "/no_name/" : "/",
    define: { __STATIC_PREVIEW__: JSON.stringify(pages) },
    plugins: [react()],
    server: { hmr: true },
    build: { outDir: "dist" },
  };
});
