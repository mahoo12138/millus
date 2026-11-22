/**
 * @ai-illustrate/core - Main Entry Point
 */

export * from "./schema/spec.ts";
export * from "./schema/ai-prompt.ts";
export * from "./compiler/index.ts";
export * from "./compiler/layout-solver.ts";
export * from "./compiler/edge-router.ts";
export * from "./compiler/adjacency-builder.ts";
export * from "./runtime/theme-observer.ts";
export * from "./runtime/text-measurer.ts";
export * from "./runtime/rough-adapter.ts";
export * from "./runtime/svg-dom-renderer.ts";
export * from "./runtime/web-component.ts";
export * from "./integrations/remark-plugin.ts";

import { registerAiIllustrationElement } from "./runtime/web-component.ts";

// Auto-register <ai-illustration> in browser environments
registerAiIllustrationElement();
