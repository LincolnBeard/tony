// Standalone client bundle for the demo export.
//
// The SDK's own builder (@hatch/space-sdk/build) only runs inside the
// Muse runtime — by design, so a hand-run build can never pretend to
// be a published Space. This script does NOT try to bypass that guard;
// it reproduces the canonical Bun.build() configuration the SDK
// documents (entrypoint, outdir, NODE_ENV define, asset naming,
// tailwind plugin, asset-URL fixup) so the demo can be built and
// served anywhere Bun runs. The result is the same production-mode
// React bundle, minus the runtime's registration/publish pipeline.

import { cp, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import tailwindPlugin from "bun-plugin-tailwind";

const ENTRY = "./client/index.html";
const OUTDIR = "./client/dist";
const PDFJS_ASSET_ROOT = "./assets/pdfjs/";

if (typeof Bun === "undefined" || typeof Bun.build !== "function") {
  throw new Error("build-standalone.mjs must run under Bun");
}

await rm(OUTDIR, { force: true, recursive: true });
const result = await Bun.build({
  entrypoints: [ENTRY],
  outdir: OUTDIR,
  minify: true,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  naming: {
    asset: "assets/[name]-[hash].[ext]",
    chunk: "assets/[name]-[hash].[ext]",
    entry: "[name].[ext]",
  },
  plugins: [tailwindPlugin],
});
if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  throw new Error("client build failed; see logged diagnostics");
}

// Bun writes imported assets to `assets/<name>-<hash>.<ext>` but emits
// the import URL as a bare `./<name>-<hash>.<ext>`; re-prefix those to
// `./assets/...` so they resolve when served from the app root (same
// fixup the canonical build performs; idempotent).
const assetFiles = result.outputs
  .filter((output) => output.kind === "asset")
  .map((output) => basename(output.path));
let needsPdfjsAssets = false;
for (const output of result.outputs) {
  if (!/\.(js|css|html)$/.test(output.path)) {
    continue;
  }
  let text = await output.text();
  needsPdfjsAssets ||= text.includes(PDFJS_ASSET_ROOT);
  let changed = false;
  for (const name of assetFiles) {
    const bare = `./${name}`;
    if (text.includes(bare)) {
      text = text.split(bare).join(`./assets/${name}`);
      changed = true;
    }
  }
  if (changed) {
    await Bun.write(output.path, text);
  }
}
if (needsPdfjsAssets) {
  await cp(
    join("node_modules", "@hatch", "space-sdk", "dist", "pdfjs-assets"),
    join(OUTDIR, "assets", "pdfjs"),
    { recursive: true },
  );
}

console.log(`Client built → ${OUTDIR} (${result.outputs.length} outputs)`);
