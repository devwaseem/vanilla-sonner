import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "Sonner",
      fileName: (format) => `sonner.${format}.min.js`,
      formats: ["es", "umd"],
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        exports: "named",
      },
    },
  },
  plugins: [],
});
