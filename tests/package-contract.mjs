import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = mkdtempSync(join(tmpdir(), "vanilla-sonner-package-"));

try {
  const packed = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", fixture], {
      cwd: root,
      encoding: "utf8",
    }),
  );
  const tarball = join(fixture, packed[0].filename);
  writeFileSync(
    join(fixture, "package.json"),
    JSON.stringify({ name: "package-contract", private: true, type: "module" }),
  );
  execFileSync(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball],
    { cwd: fixture, stdio: "pipe" },
  );

  const esm = join(fixture, "consumer.mjs");
  writeFileSync(
    esm,
    `import { createToaster, toast, Toaster } from "vanilla-sonner";
if (typeof toast !== "function") throw new Error("Missing toast export");
if (typeof createToaster !== "function") throw new Error("Missing createToaster export");
if (typeof Toaster !== "function") throw new Error("Missing Toaster export");
if (typeof toast.loading !== "function" || typeof toast.done !== "function") {
  throw new Error("Missing advanced lifecycle methods");
}
`,
  );
  execFileSync(process.execPath, [esm], { cwd: fixture, stdio: "pipe" });

  const cjs = join(fixture, "consumer.cjs");
  writeFileSync(
    cjs,
    `const pkg = require("vanilla-sonner");
if (typeof pkg.toast !== "function") throw new Error("Missing CommonJS toast export");
if (!require.resolve("vanilla-sonner/style.css")) throw new Error("Missing style export");
`,
  );
  execFileSync(process.execPath, [cjs], { cwd: fixture, stdio: "pipe" });

  const types = join(fixture, "consumer.ts");
  writeFileSync(
    types,
    `import { toast, type ToastAPI, type ToastCloseReason } from "vanilla-sonner";
const api: ToastAPI = toast;
const id: string = api.loading("Loading", { progress: 0.2, important: true });
const changed: boolean = api.done(id, { message: "Done" });
const reason: ToastCloseReason = "programmatic";
void changed;
void reason;
`,
  );
  execFileSync(
    join(root, "node_modules", ".bin", "tsc"),
    [
      "--noEmit",
      "--strict",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--target",
      "ES2022",
      "--lib",
      "ES2024,DOM",
      types,
    ],
    { cwd: fixture, stdio: "pipe" },
  );

  const installedPackage = JSON.parse(
    readFileSync(
      join(fixture, "node_modules", "vanilla-sonner", "package.json"),
      "utf8",
    ),
  );
  assert.equal(installedPackage.version, "0.7.0");
  console.log("Installed package contracts passed");
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
