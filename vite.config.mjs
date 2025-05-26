import { defineConfig } from "vite";
import cssnano from "cssnano";

export default defineConfig({
  build: {
    lib: {
      entry: "src/sonner.ts",
      name: "Sonner",
      fileName: (format) => `sonner.${format}.min.js`,
      formats: ["es", "umd"],
    },
    minify: true,
    rollupOptions: {
      output: {
        exports: "named",
      },
    },
  },
  plugins: [cssnano({ preset: "default" })],
});
