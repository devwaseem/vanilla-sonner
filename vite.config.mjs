import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "Sonner",
      fileName: (format) =>
        format === "es"
          ? "vanilla-sonner.es.min.mjs"
          : "vanilla-sonner.umd.min.js",
      cssFileName: "vanilla-sonner.min",
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
