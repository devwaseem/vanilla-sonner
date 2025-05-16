import { defineConfig } from "vite";
import vitePluginString from "vite-plugin-string";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.js",
      name: "Sonner",
      fileName: (format) => `sonner.${format}.min.js`,
      formats: ["es", "umd"],
    },
    minify: "terser",
    rollupOptions: {
      output: {
        exports: "named",
      },
    },
  },
  plugins: [
    vitePluginString({
      include: ["src/templates/**/*.html"],
    }),
  ],
});
