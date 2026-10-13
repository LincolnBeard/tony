/* =====================================================================
   PATCH: make extensionless relative specifiers resolvable by Node's
   ESM loader (runs as the root package's postinstall).

   Two codebases in this repo are authored for Bun, whose resolver
   accepts bundler-style EXTENSIONLESS relative specifiers
   (`from "./schema"`). Node's ESM loader does not — on Vercel the
   function died with "Cannot find module '/var/task/server/src/...'".

   PASS A — the vendored @hatch/space-sdk (node_modules, not committed):
   rewrites relative specifiers inside the SDK's dist tree (all .js
   files under node_modules/@hatch/space-sdk/dist) to explicit ".js"
   form.

   PASS B — this repo's own TypeScript sources (all .ts files under
   api/ and server/): rewrites extensionless relative specifiers to
   explicit ".js" form when the "<specifier>.ts" sibling exists on
   disk. This exists because server/src/actions.ts is too large to
   move through the owner's sync channel reliably, so its specifiers
   cannot be guaranteed correct in the committed tree — instead every
   install self-heals the checkout before Vercel compiles anything.
   On Vercel the checkout is ephemeral, so rewriting it at install
   time is safe; anywhere else the pass is a no-op once the sources
   are already in explicit form.

   Rules (both passes) are deliberately conservative:
   - bare specifiers (packages, node:*) are never touched;
   - specifiers that already carry an extension (.js/.json/.mjs/.css/
     ...) are never touched, which also makes the script idempotent;
   - a specifier is rewritten only when the sibling file it would
     point at (<specifier>.js for pass A, <specifier>.ts for pass B)
     actually exists next to the importing file, so references that
     leave the tree or name non-code assets are left alone;
   - pass B never enters node_modules or dist directories and never
     touches declaration files (*.d.ts).

   A missing target tree is a skip, never a failure — a failed patch
   must not break `bun install` itself; the function would then fail
   loudly at runtime instead.
   ===================================================================== */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.\.?\/[^"']+)\2/g;

function patchFile(path, siblingExt) {
  const source = readFileSync(path, "utf8");
  const dir = dirname(path);
  let count = 0;
  const out = source.replace(SPECIFIER, (match, prefix, quote, spec) => {
    if (/\.[a-z0-9]+$/i.test(spec)) return match; // already has an extension
    if (!existsSync(join(dir, spec + siblingExt))) return match; // no sibling to point at
    count++;
    return `${prefix}${quote}${spec}.js${quote}`;
  });
  if (out !== source) writeFileSync(path, out);
  return count;
}

function walk(dir, fileExt, siblingExt, skipDirs, acc) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) walk(path, fileExt, siblingExt, skipDirs, acc);
    } else if (
      entry.isFile() &&
      entry.name.endsWith(fileExt) &&
      !entry.name.endsWith(".d.ts")
    ) {
      const n = patchFile(path, siblingExt);
      if (n > 0) {
        acc.files++;
        acc.specifiers += n;
      }
    }
  }
}

/* ---- Pass A: vendored SDK in node_modules ---- */
const distDir = resolve("node_modules/@hatch/space-sdk/dist");
if (!existsSync(distDir)) {
  console.log("[patch-sdk-esm] @hatch/space-sdk not installed — skipping SDK pass");
} else {
  const acc = { files: 0, specifiers: 0 };
  walk(distDir, ".js", ".js", new Set(), acc);
  console.log(
    `[patch-sdk-esm] SDK pass: patched ${acc.specifiers} specifier(s) in ${acc.files} file(s) under ${distDir}`,
  );
}

/* ---- Pass B: this repo's own TS sources (api/, server/) ---- */
for (const tree of ["api", "server"]) {
  const root = resolve(tree);
  if (!existsSync(root)) {
    console.log(`[patch-sdk-esm] ${tree}/ not found — skipping source pass for it`);
    continue;
  }
  const acc = { files: 0, specifiers: 0 };
  walk(root, ".ts", ".ts", new Set(["node_modules", "dist"]), acc);
  console.log(
    `[patch-sdk-esm] source pass (${tree}/): patched ${acc.specifiers} specifier(s) in ${acc.files} file(s)`,
  );
}
