/**
 * Builds the bidirectional focus adjacency graph for hover highlighting
 * across nodes, code-block lines, table cells, callouts, and edges.
 */

import type {
  FocusAdjacencyEntry,
  SceneEdge,
  SceneNode,
} from "../schema/spec.ts";

export function buildFocusAdjacency(
  nodes: SceneNode[],
  edges: SceneEdge[]
): Record<string, FocusAdjacencyEntry> {
  const map: Record<string, FocusAdjacencyEntry> = {};

  const ensureEntry = (key: string): FocusAdjacencyEntry => {
    if (!map[key]) {
      map[key] = {
        nodeIds: new Set<string>(),
        anchorIds: new Set<string>(),
        edgeIds: new Set<string>(),
      };
    }
    return map[key];
  };

  const registerNodeTree = (node: SceneNode) => {
    const entry = ensureEntry(node.id);
    entry.nodeIds.add(node.id);

    for (const sub of node.subAnchors) {
      const subEntry = ensureEntry(sub.anchorId);
      subEntry.nodeIds.add(node.id);
      subEntry.anchorIds.add(sub.anchorId);
    }

    if (node.calloutTail) {
      const targetId = node.calloutTail.targetId;
      const targetOwner = targetId.split(".")[0];
      entry.nodeIds.add(targetOwner);
      entry.anchorIds.add(targetId);

      const targetEntry = ensureEntry(targetId);
      targetEntry.nodeIds.add(node.id);
      targetEntry.nodeIds.add(targetOwner);
      targetEntry.anchorIds.add(targetId);

      const ownerEntry = ensureEntry(targetOwner);
      ownerEntry.nodeIds.add(node.id);
      ownerEntry.anchorIds.add(targetId);
    }

    for (const child of node.children) {
      registerNodeTree(child);
    }
  };

  for (const n of nodes) {
    registerNodeTree(n);
  }

  for (const edge of edges) {
    const keys = new Set<string>([
      edge.id,
      edge.from,
      edge.to,
      edge.fromOwnerId,
      edge.toOwnerId,
    ]);

    for (const key of keys) {
      const entry = ensureEntry(key);
      entry.edgeIds.add(edge.id);
      entry.nodeIds.add(edge.fromOwnerId);
      entry.nodeIds.add(edge.toOwnerId);
      entry.anchorIds.add(edge.from);
      entry.anchorIds.add(edge.to);
    }
  }

  return map;
}
