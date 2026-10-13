/* =====================================================================
   PATCH: make the vendored @hatch/space-sdk loadable by Node's ESM
   loader (runs as the root package's postinstall).

   The SDK is authored for the Muse runtime's Bun environment, and
   its dist/*.js files use bundler-style EXTENSIONLESS relative
   specifiers (e.g. `from "./server-contract"` in dist/index.js).
   Bun resolves those; Node's ESM loader does not — on Vercel the
   function died with "Cannot find module
   '.../node_modules/@hatch/space-sdk/dist/server-contract'".

   This script rewrites, inside node_modules/@hatch/space-sdk/dist,
   every relative import/export/dynamic-import specifier that has no
   extension AND whose "<specifier>.js" target actually exists, to
   the explicit ".js" form. Rules are deliberately conservative:

   - bare specifiers (packages, node:*) are never touched;
   - specifiers that already carry an extension are never touched
     (which also makes the script idempotent);
   - a specifier is only rewritten when the .js file it would point
     at exists on disk next to the importing file, so references
     that leave the package or name non-JS assets are left alone.

   It no-ops (exit 0) when the SDK is not installed or its layout
   changed — a failed patch must never break `bun install` itself;
   the Vercel function would then fail loudly at runtime instead.
   ===================================================================== */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const distDir = resolve("node_modules/@hatch/space-sdk/dist");
if (!existsSync(distDir)) {
  console.log("[patch-sdk-esm] @hatch/space-sdk not installed — skipping");
  process.exit(0);
}

const SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.\.?\/[^"']+)\2/g;
let patchedFiles = 0;
let patchedSpecifiers = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile() && entry.name.endsWith(".js")) patchFile(path);
  }
}

function patchFile(path) {
  const source = readFileSync(path, "utf8");
  const dir = dirname(path);
  const out = source.replace(SPECIFIER, (match, prefix, quote, spec) => {
    if (/\.[a-z0-9]+$/i.test(spec)) return match; // already has an extension
    if (!existsSync(join(dir, spec + ".js"))) return match; // not a JS sibling
    patchedSpecifiers++;
    return `${prefix}${quote}${spec}.js${quote}`;
  });
  if (out !== source) {
    writeFileSync(path, out);
    patchedFiles++;
  }
}

walk(distDir);
console.log(
  `[patch-sdk-esm] patched ${patchedSpecifiers} specifier(s) in ${patchedFiles} file(s) under ${distDir}`,
);
