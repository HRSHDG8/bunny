import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root,
  plugins: [viteSingleFile()],
  build: {
    outDir: fileURLToPath(new URL("../../public/mcp-apps", import.meta.url)),
    emptyOutDir: false,
    cssMinify: true,
    minify: true,
    rollupOptions: {
      input: "rentals.html",
    },
  },
});
