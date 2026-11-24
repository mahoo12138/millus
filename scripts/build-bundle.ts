/**
 * Multi-entry ESM + TypeScript Declaration (.d.ts) + Browser Bundle Builder
 * Uses esbuild & tsc (devDependencies only; runtime remains zero-dependency).
 *
 * Outputs:
 *   - dist/index.js & dist/index.d.ts                        (main runtime + compiler + schema entry)
 *   - dist/millus.bundle.js                                  (standalone browser ESM bundle; runtime + compiler only)
 *   - dist/integrations/remark-plugin.js & .d.ts             (millus/remark entry)
 *   - dist/schema/ai-prompt.js & .d.ts                       (millus/prompt entry)
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import * as esbuild from "esbuild";

const rootDir = path.resolve(import.meta.dirname, "..");
const distDir = path.join(rootDir, "dist");

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

// 1. Multi-entry ESM bundles for package exports (".", "./remark", "./prompt")
await esbuild.build({
  entryPoints: {
    index: path.join(rootDir, "src/index.ts"),
    "integrations/remark-plugin": path.join(
      rootDir,
      "src/integrations/remark-plugin.ts"
    ),
    "schema/ai-prompt": path.join(rootDir, "src/schema/ai-prompt.ts"),
  },
  outdir: distDir,
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: false,
  logLevel: "info",
});

// 2. Standalone browser bundle (runtime + compiler + spec only; excludes remark plugin & AI prompt)
await esbuild.build({
  entryPoints: [path.join(rootDir, "src/index.ts")],
  outfile: path.join(distDir, "millus.bundle.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  banner: {
    js: [
      "/**",
      " * millus - Standalone Browser ESM Bundle",
      " * Auto-registers <ai-illustration> CustomElement",
      " */",
    ].join("\n"),
  },
  logLevel: "info",
});

// 3. Emit TypeScript declaration files (.d.ts)
const tscBin = path.join(
  rootDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc"
);
execFileSync(tscBin, ["-p", path.join(rootDir, "tsconfig.json")], {
  cwd: rootDir,
  stdio: "inherit",
});

// Rewrite relative `.ts` specifiers in emitted `.d.ts` files to `.js` so consumers using
// moduleResolution "node16" / "nodenext" / "bundler" can resolve declarations cleanly.
function rewriteDtsRelativeExtensions(dir: string): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteDtsRelativeExtensions(full);
    } else if (entry.name.endsWith(".d.ts")) {
      const content = fs.readFileSync(full, "utf8");
      const rewritten = content.replace(
        /(from\s+["']\.\.?\/[^"']+?)\.ts(["'])/g,
        "$1.js$2"
      );
      if (rewritten !== content) {
        fs.writeFileSync(full, rewritten, "utf8");
      }
    }
  }
}
rewriteDtsRelativeExtensions(distDir);

const outputs = [
  "dist/index.js",
  "dist/index.d.ts",
  "dist/millus.bundle.js",
  "dist/integrations/remark-plugin.js",
  "dist/integrations/remark-plugin.d.ts",
  "dist/schema/ai-prompt.js",
  "dist/schema/ai-prompt.d.ts",
];

for (const rel of outputs) {
  const full = path.join(rootDir, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Expected build output missing: ${rel}`);
  }
  const kb = (fs.statSync(full).size / 1024).toFixed(1);
  console.log(`✅ Built ${rel} (${kb} KB)`);
}
