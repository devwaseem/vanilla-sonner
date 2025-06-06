import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/sonner.ts",
      name: "Sonner",
      fileName: (format) => `vanilla-sonner.${format}.min.js`,
      formats: ["es", "umd"],
    },
    minify: true,
    rollupOptions: {
      output: {
        exports: "named",
      },
    },
  },
  plugins: [],
});
