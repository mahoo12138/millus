/**
 * Zero-dependency bundler using Node 22 native module.stripTypeScriptTypes
 * Produces dist/ai-illustration.bundle.js for direct browser / Playground usage.
 */

import fs from "node:fs";
import path from "node:path";
import module from "node:module";

const rootDir = path.resolve(import.meta.dirname, "..");

const orderedFiles = [
  "src/schema/spec.ts",
  "src/schema/ai-prompt.ts",
  "src/runtime/theme-observer.ts",
  "src/runtime/text-measurer.ts",
  "src/runtime/rough-adapter.ts",
  "src/compiler/layout-solver.ts",
  "src/compiler/edge-router.ts",
  "src/compiler/adjacency-builder.ts",
  "src/compiler/index.ts",
  "src/runtime/svg-dom-renderer.ts",
  "src/runtime/web-component.ts",
  "src/integrations/remark-plugin.ts",
];

const chunks: string[] = [
  "/**",
  " * millus - Standalone Browser & ESM Bundle",
  " * Auto-registers <ai-illustration> & <m-illus> CustomElements",
  " */",
];

for (const relPath of orderedFiles) {
  const fullPath = path.join(rootDir, relPath);
  const tsSource = fs.readFileSync(fullPath, "utf8");
  const jsSource = module.stripTypeScriptTypes(tsSource);

  // Strip local relative import lines
  const cleaned = jsSource
    .replace(/^\s*import\s+[\s\S]*?from\s+["']\..*?["'];?\s*$/gm, "")
    .trim();

  chunks.push(`// --- ${relPath} ---\n${cleaned}`);
}

chunks.push(`\n// Auto-register <ai-illustration> Web Component\nregisterAiIllustrationElement();`);

const distDir = path.join(rootDir, "dist");
fs.mkdirSync(distDir, { recursive: true });
const outFile = path.join(distDir, "millus.bundle.js");
fs.writeFileSync(outFile, chunks.join("\n\n") + "\n", "utf8");

console.log(`✅ Built standalone bundle: ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(1)} KB)`);
