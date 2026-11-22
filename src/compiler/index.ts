/**
 * Unified Compiler Entry Point: IllustrationSpec + Theme -> Normalized SceneGraph
 */

import type {
  IllustrationSpec,
  ResolvedThemeTokens,
  SceneGraph,
} from "../schema/spec.ts";
import { TextMeasurer } from "../runtime/text-measurer.ts";
import { HybridLayoutSolver, type LayoutOptions } from "./layout-solver.ts";
import { routeConnections } from "./edge-router.ts";
import { buildFocusAdjacency } from "./adjacency-builder.ts";

export function compileIllustration(
  spec: IllustrationSpec,
  theme: ResolvedThemeTokens,
  options: LayoutOptions = {},
  measurer = new TextMeasurer()
): SceneGraph {
  const layoutSolver = new HybridLayoutSolver(measurer, theme);
  const layoutResult = layoutSolver.solve(spec, options);

  const edges = routeConnections(
    spec.connections,
    layoutResult.anchorRegistry,
    theme,
    measurer,
    options.compactViewport ?? false
  );

  const adjacency = buildFocusAdjacency(layoutResult.nodes, edges);

  return {
    title: spec.title,
    width: layoutResult.width,
    height: layoutResult.height,
    viewBox: [0, 0, layoutResult.width, layoutResult.height],
    background: spec.canvas?.background || "dots",
    preset: theme.geometry.preset,
    theme,
    anchorRegistry: layoutResult.anchorRegistry,
    nodes: layoutResult.nodes,
    edges,
    adjacency,
  };
}
