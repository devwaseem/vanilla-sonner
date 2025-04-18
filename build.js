const esbuild = require("esbuild");
const fs = require("fs-extra");

async function build() {
  // Bundle JS
  await esbuild.build({
    entryPoints: ["src/index.js", "src/toaster.js", "src/toast.js"],
    entryNames: "[name]",
    bundle: true,
    format: "esm",
    outdir: "dist",
    minify: true,
    sourcemap: false,
  });

  // Copy CSS separately
  await fs.copy("src/style.css", "dist/style.css");

  console.log("Build complete");
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
