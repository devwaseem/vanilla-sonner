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
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3,
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        exports: "named",
      },
    },
  },
  plugins: [cssnano({ preset: "default" })],
});
