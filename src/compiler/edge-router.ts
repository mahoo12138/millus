/**
 * Semantic Anchor Resolver & Obstacle-Aware Edge Router
 * Features:
 *  - Port Multiplexing & Crossing-Minimizing Port Ordering
 *  - Exact Geometric Perimeter Projection (Rect, Diamond, Circle, Ellipse)
 *  - Hanan-Grid Dijkstra Obstacle-Avoiding Orthogonal Routing
 *  - Self-Loop Routing (Single-Side & Corner Loops)
 *  - Corridor-Aware Label Placement & Multi-Label / Node Collision Avoidance
 */

import type {
  BoundingBox,
  ConnectionSpec,
  ResolvedThemeTokens,
  SceneEdge,
} from "../schema/spec.ts";
import { TextMeasurer } from "../runtime/text-measurer.ts";

type PortSide = "top" | "bottom" | "left" | "right" | "center";

interface ParsedEndpoint {
  targetId: string;
  side?: PortSide;
  ratio: number; // 0..1 along the side, default 0.5
  explicitRatio: boolean;
}

interface CorridorBounds {
  horiz?: [number, number]; // [left, right]
  vert?: [number, number]; // [top, bottom]
}

interface PreparedEdgeItem {
  conn: ConnectionSpec;
  idx: number;
  id: string;
  fromParsed: ParsedEndpoint;
  toParsed: ParsedEndpoint;
  fromBox: BoundingBox;
  toBox: BoundingBox;
  fromOwnerId: string;
  toOwnerId: string;
  isExternal: boolean;
  isSelfLoop: boolean;
  isFromSubAnchor: boolean;
  isToSubAnchor: boolean;
  ownerFromBox: BoundingBox;
  ownerToBox: BoundingBox;
  outerFromBox: BoundingBox;
  outerToBox: BoundingBox;
  corridor: CorridorBounds;
  fromSide: PortSide;
  toSide: PortSide;
  fromRatio: number;
  toRatio: number;
  fromMultiplexed: boolean;
  toMultiplexed: boolean;
  corridorOffset: number;
}

function parseEndpoint(raw: string): ParsedEndpoint {
  const [targetId, anchorPart] = raw.split("@");
  if (!anchorPart) {
    return { targetId: targetId.trim(), ratio: 0.5, explicitRatio: false };
  }
  const [sideStr, pctStr] = anchorPart.split(":");
  let ratio = 0.5;
  let explicitRatio = false;
  if (pctStr && pctStr.endsWith("%")) {
    const val = parseFloat(pctStr);
    if (!Number.isNaN(val)) {
      ratio = Math.max(0.08, Math.min(0.92, val / 100));
      explicitRatio = true;
    }
  }
  const normalizedSide = sideStr.trim().toLowerCase();
  const validSides: PortSide[] = ["top", "bottom", "left", "right", "center"];
  const side = validSides.includes(normalizedSide as PortSide)
    ? (normalizedSide as PortSide)
    : undefined;

  return {
    targetId: targetId.trim(),
    side,
    ratio,
    explicitRatio,
  };
}

function resolveOuterContainers(
  fromBox: BoundingBox,
  toBox: BoundingBox,
  registry: Record<string, BoundingBox>
): {
  ownerFromBox: BoundingBox;
  ownerToBox: BoundingBox;
  outerFromBox: BoundingBox;
  outerToBox: BoundingBox;
} {
  const ownerFromBox =
    fromBox.ownerNodeId && registry[fromBox.ownerNodeId]
      ? registry[fromBox.ownerNodeId]
      : fromBox;
  const ownerToBox =
    toBox.ownerNodeId && registry[toBox.ownerNodeId]
      ? registry[toBox.ownerNodeId]
      : toBox;

  const collectAncestors = (box: BoundingBox): Set<string> => {
    const set = new Set<string>();
    if (box.ownerNodeId) set.add(box.ownerNodeId);
    let currId = box.parentGroupId;
    while (currId && registry[currId]) {
      set.add(currId);
      currId = registry[currId].parentGroupId;
    }
    return set;
  };

  const fromAncestors = collectAncestors(ownerFromBox);
  const toAncestors = collectAncestors(ownerToBox);

  let outerFromBox = ownerFromBox;
  while (
    outerFromBox.parentGroupId &&
    !toAncestors.has(outerFromBox.parentGroupId) &&
    registry[outerFromBox.parentGroupId]
  ) {
    outerFromBox = registry[outerFromBox.parentGroupId];
  }

  let outerToBox = ownerToBox;
  while (
    outerToBox.parentGroupId &&
    !fromAncestors.has(outerToBox.parentGroupId) &&
    registry[outerToBox.parentGroupId]
  ) {
    outerToBox = registry[outerToBox.parentGroupId];
  }

  return { ownerFromBox, ownerToBox, outerFromBox, outerToBox };
}

function computeCorridorBounds(
  outerFromBox: BoundingBox,
  outerToBox: BoundingBox
): CorridorBounds {
  const bounds: CorridorBounds = {};

  if (outerToBox.x >= outerFromBox.x + outerFromBox.width - 1) {
    bounds.horiz = [outerFromBox.x + outerFromBox.width, outerToBox.x];
  } else if (outerFromBox.x >= outerToBox.x + outerToBox.width - 1) {
    bounds.horiz = [outerToBox.x + outerToBox.width, outerFromBox.x];
  }

  if (outerToBox.y >= outerFromBox.y + outerFromBox.height - 1) {
    bounds.vert = [outerFromBox.y + outerFromBox.height, outerToBox.y];
  } else if (outerFromBox.y >= outerToBox.y + outerToBox.height - 1) {
    bounds.vert = [outerToBox.y + outerToBox.height, outerFromBox.y];
  }

  return bounds;
}

function chooseAutoSides(
  fromBox: BoundingBox,
  toBox: BoundingBox,
  outerFromBox: BoundingBox,
  outerToBox: BoundingBox,
  isSelfLoop: boolean
): { fromSide: PortSide; toSide: PortSide } {
  if (isSelfLoop) {
    return { fromSide: "right", toSide: "top" };
  }

  const refFrom = outerFromBox !== outerToBox ? outerFromBox : fromBox;
  const refTo = outerFromBox !== outerToBox ? outerToBox : toBox;

  const fromCx = refFrom.x + refFrom.width / 2;
  const fromCy = refFrom.y + refFrom.height / 2;
  const toCx = refTo.x + refTo.width / 2;
  const toCy = refTo.y + refTo.height / 2;

  const dx = toCx - fromCx;
  const dy = toCy - fromCy;

  const horizGap =
    dx > 0
      ? refTo.x - (refFrom.x + refFrom.width)
      : refFrom.x - (refTo.x + refTo.width);
  const vertGap =
    dy > 0
      ? refTo.y - (refFrom.y + refFrom.height)
      : refFrom.y - (refTo.y + refTo.height);

  if (horizGap >= vertGap) {
    return dx >= 0
      ? { fromSide: "right", toSide: "left" }
      : { fromSide: "left", toSide: "right" };
  } else {
    return dy >= 0
      ? { fromSide: "bottom", toSide: "top" }
      : { fromSide: "top", toSide: "bottom" };
  }
}

/**
 * Resolves port coordinate on a box or sub-anchor, projecting interior sub-anchors onto the
 * owner node's outer boundary and snapping to non-rectangular geometric perimeters (diamond, circle, ellipse).
 */
function getProjectedPortPoint(
  box: BoundingBox,
  ownerBox: BoundingBox,
  side: PortSide,
  ratio = 0.5,
  isExternalConnection = true
): [number, number] {
  let px: number;
  let py: number;

  const targetBox = isExternalConnection && ownerBox !== box ? ownerBox : box;
  const shape = targetBox.shape || "rect";

  switch (side) {
    case "top": {
      px = box.x + box.width * ratio;
      py = isExternalConnection ? Math.min(box.y, ownerBox.y) : box.y;
      if (shape === "diamond") {
        const u = Math.min(1, Math.abs(2 * ratio - 1));
        py = targetBox.y + (targetBox.height / 2) * u;
      } else if (shape === "circle" || shape === "ellipse") {
        const u = Math.max(-1, Math.min(1, 2 * ratio - 1));
        py =
          targetBox.y +
          targetBox.height / 2 -
          (targetBox.height / 2) * Math.sqrt(Math.max(0, 1 - u * u));
      }
      break;
    }
    case "bottom": {
      px = box.x + box.width * ratio;
      py = isExternalConnection
        ? Math.max(box.y + box.height, ownerBox.y + ownerBox.height)
        : box.y + box.height;
      if (shape === "diamond") {
        const u = Math.min(1, Math.abs(2 * ratio - 1));
        py = targetBox.y + targetBox.height - (targetBox.height / 2) * u;
      } else if (shape === "circle" || shape === "ellipse") {
        const u = Math.max(-1, Math.min(1, 2 * ratio - 1));
        py =
          targetBox.y +
          targetBox.height / 2 +
          (targetBox.height / 2) * Math.sqrt(Math.max(0, 1 - u * u));
      }
      break;
    }
    case "left": {
      px = isExternalConnection ? Math.min(box.x, ownerBox.x) : box.x;
      py = box.y + box.height * ratio;
      if (shape === "diamond") {
        const u = Math.min(1, Math.abs(2 * ratio - 1));
        px = targetBox.x + (targetBox.width / 2) * u;
      } else if (shape === "circle" || shape === "ellipse") {
        const u = Math.max(-1, Math.min(1, 2 * ratio - 1));
        px =
          targetBox.x +
          targetBox.width / 2 -
          (targetBox.width / 2) * Math.sqrt(Math.max(0, 1 - u * u));
      }
      break;
    }
    case "right": {
      px = isExternalConnection
        ? Math.max(box.x + box.width, ownerBox.x + ownerBox.width)
        : box.x + box.width;
      py = box.y + box.height * ratio;
      if (shape === "diamond") {
        const u = Math.min(1, Math.abs(2 * ratio - 1));
        px = targetBox.x + targetBox.width - (targetBox.width / 2) * u;
      } else if (shape === "circle" || shape === "ellipse") {
        const u = Math.max(-1, Math.min(1, 2 * ratio - 1));
        px =
          targetBox.x +
          targetBox.width / 2 +
          (targetBox.width / 2) * Math.sqrt(Math.max(0, 1 - u * u));
      }
      break;
    }
    case "center":
    default:
      px = box.x + box.width / 2;
      py = box.y + box.height / 2;
      break;
  }

  return [px, py];
}

/**
 * Aligns facing ports along the cross-axis when two connected boxes overlap on that axis
 * and neither side is multiplexed or fixed to a non-rectangular vertex.
 */
function alignFacingPorts(
  p1: [number, number],
  p2: [number, number],
  fromBox: BoundingBox,
  toBox: BoundingBox,
  fromSide: PortSide,
  toSide: PortSide,
  fromFixedRatio: boolean,
  toFixedRatio: boolean,
  isFromSubAnchor: boolean,
  isToSubAnchor: boolean
): void {
  const isOppositeHoriz =
    (fromSide === "right" && toSide === "left") ||
    (fromSide === "left" && toSide === "right");
  const isOppositeVert =
    (fromSide === "bottom" && toSide === "top") ||
    (fromSide === "top" && toSide === "bottom");

  const fixedFrom =
    fromFixedRatio || Boolean(fromBox.shape && fromBox.shape !== "rect");
  const fixedTo =
    toFixedRatio || Boolean(toBox.shape && toBox.shape !== "rect");

  if (isOppositeHoriz) {
    const dy = Math.abs(p1[1] - p2[1]);
    if (dy > 0.5 && dy <= 32) {
      const m1 = isFromSubAnchor
        ? Math.min(4, fromBox.height * 0.2)
        : Math.min(16, fromBox.height * 0.22);
      const m2 = isToSubAnchor
        ? Math.min(4, toBox.height * 0.2)
        : Math.min(16, toBox.height * 0.22);
      const min1 = fixedFrom ? p1[1] : fromBox.y + m1;
      const max1 = fixedFrom ? p1[1] : fromBox.y + fromBox.height - m1;
      const min2 = fixedTo ? p2[1] : toBox.y + m2;
      const max2 = fixedTo ? p2[1] : toBox.y + toBox.height - m2;

      const overlapMin = Math.max(min1, min2);
      const overlapMax = Math.min(max1, max2);
      if (overlapMin <= overlapMax) {
        const preferred =
          (isFromSubAnchor || fixedFrom) && !(isToSubAnchor || fixedTo)
            ? p1[1]
            : (isToSubAnchor || fixedTo) && !(isFromSubAnchor || fixedFrom)
            ? p2[1]
            : (p1[1] + p2[1]) / 2;
        const alignedY = Math.max(overlapMin, Math.min(overlapMax, preferred));
        p1[1] = alignedY;
        p2[1] = alignedY;
      }
    }
  } else if (isOppositeVert) {
    const dx = Math.abs(p1[0] - p2[0]);
    if (dx > 0.5 && dx <= 32) {
      const m1 = isFromSubAnchor
        ? Math.min(6, fromBox.width * 0.2)
        : Math.min(18, fromBox.width * 0.2);
      const m2 = isToSubAnchor
        ? Math.min(6, toBox.width * 0.2)
        : Math.min(18, toBox.width * 0.2);
      const min1 = fixedFrom ? p1[0] : fromBox.x + m1;
      const max1 = fixedFrom ? p1[0] : fromBox.x + fromBox.width - m1;
      const min2 = fixedTo ? p2[0] : toBox.x + m2;
      const max2 = fixedTo ? p2[0] : toBox.x + toBox.width - m2;

      const overlapMin = Math.max(min1, min2);
      const overlapMax = Math.min(max1, max2);
      if (overlapMin <= overlapMax) {
        const preferred =
          (isFromSubAnchor || fixedFrom) && !(isToSubAnchor || fixedTo)
            ? p1[0]
            : (isToSubAnchor || fixedTo) && !(isFromSubAnchor || fixedFrom)
            ? p2[0]
            : (p1[0] + p2[0]) / 2;
        const alignedX = Math.max(overlapMin, Math.min(overlapMax, preferred));
        p1[0] = alignedX;
        p2[0] = alignedX;
      }
    }
  }
}

function getNormalVector(side: PortSide): [number, number] {
  switch (side) {
    case "top":
      return [0, -1];
    case "bottom":
      return [0, 1];
    case "left":
      return [-1, 0];
    case "right":
      return [1, 0];
    default:
      return [0, 0];
  }
}

/**
 * Removes duplicate consecutive points and merges collinear intermediate waypoints
 */
function simplifyPolyline(points: [number, number][]): [number, number][] {
  if (points.length <= 1) return points;

  const deduped: [number, number][] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (
      Math.abs(points[i][0] - prev[0]) > 0.5 ||
      Math.abs(points[i][1] - prev[1]) > 0.5
    ) {
      deduped.push(points[i]);
    }
  }

  if (deduped.length <= 2) return deduped;

  const simplified: [number, number][] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = deduped[i];
    const next = deduped[i + 1];

    const sameX =
      Math.abs(prev[0] - curr[0]) <= 0.5 && Math.abs(curr[0] - next[0]) <= 0.5;
    const sameY =
      Math.abs(prev[1] - curr[1]) <= 0.5 && Math.abs(curr[1] - next[1]) <= 0.5;

    if (sameX || sameY) {
      continue;
    }
    simplified.push(curr);
  }
  simplified.push(deduped[deduped.length - 1]);
  return simplified;
}

/**
 * Converts a polyline of orthogonal points into an SVG path string with rounded corners
 */
function buildRoundedPolylinePath(
  points: [number, number][],
  cornerRadius = 8
): string {
  const pts = simplifyPolyline(points);
  if (pts.length === 0) return "";
  if (pts.length === 1)
    return `M ${Math.round(pts[0][0])} ${Math.round(pts[0][1])}`;

  if (pts.length === 2) {
    return `M ${Math.round(pts[0][0])} ${Math.round(pts[0][1])} L ${Math.round(pts[1][0])} ${Math.round(pts[1][1])}`;
  }

  let d = `M ${Math.round(pts[0][0])} ${Math.round(pts[0][1])}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const pPrev = pts[i - 1];
    const pCurr = pts[i];
    const pNext = pts[i + 1];

    const v1x = pCurr[0] - pPrev[0];
    const v1y = pCurr[1] - pPrev[1];
    const len1 = Math.hypot(v1x, v1y);

    const v2x = pNext[0] - pCurr[0];
    const v2y = pNext[1] - pCurr[1];
    const len2 = Math.hypot(v2x, v2y);

    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);
    if (r < 1) {
      d += ` L ${Math.round(pCurr[0])} ${Math.round(pCurr[1])}`;
      continue;
    }

    const startCornerX = pCurr[0] - (v1x / len1) * r;
    const startCornerY = pCurr[1] - (v1y / len1) * r;
    const endCornerX = pCurr[0] + (v2x / len2) * r;
    const endCornerY = pCurr[1] + (v2y / len2) * r;

    d += ` L ${startCornerX.toFixed(1)} ${startCornerY.toFixed(1)}`;
    d += ` Q ${pCurr[0].toFixed(1)} ${pCurr[1].toFixed(1)} ${endCornerX.toFixed(1)} ${endCornerY.toFixed(1)}`;
  }

  const last = pts[pts.length - 1];
  d += ` L ${Math.round(last[0])} ${Math.round(last[1])}`;
  return d;
}

/**
 * Builds orthogonal waypoints for a self-loop edge (from a node back to itself)
 */
function buildSelfLoopWaypoints(
  p1: [number, number],
  side1: PortSide,
  p2: [number, number],
  side2: PortSide,
  ownerBox: BoundingBox,
  stub = 20
): [number, number][] {
  const loopOut = Math.max(28, stub + 8);
  const [n1x, n1y] = getNormalVector(side1);
  const [n2x, n2y] = getNormalVector(side2);

  if (side1 === side2) {
    if (side1 === "right" || side1 === "left") {
      const outX =
        side1 === "right"
          ? ownerBox.x + ownerBox.width + loopOut
          : ownerBox.x - loopOut;
      return simplifyPolyline([p1, [outX, p1[1]], [outX, p2[1]], p2]);
    }
    const outY =
      side1 === "bottom"
        ? ownerBox.y + ownerBox.height + loopOut
        : ownerBox.y - loopOut;
    return simplifyPolyline([p1, [p1[0], outY], [p2[0], outY], p2]);
  }

  const out1: [number, number] = [
    side1 === "right"
      ? ownerBox.x + ownerBox.width + loopOut
      : side1 === "left"
      ? ownerBox.x - loopOut
      : p1[0] + n1x * loopOut,
    side1 === "bottom"
      ? ownerBox.y + ownerBox.height + loopOut
      : side1 === "top"
      ? ownerBox.y - loopOut
      : p1[1] + n1y * loopOut,
  ];
  const out2: [number, number] = [
    side2 === "right"
      ? ownerBox.x + ownerBox.width + loopOut
      : side2 === "left"
      ? ownerBox.x - loopOut
      : p2[0] + n2x * loopOut,
    side2 === "bottom"
      ? ownerBox.y + ownerBox.height + loopOut
      : side2 === "top"
      ? ownerBox.y - loopOut
      : p2[1] + n2y * loopOut,
  ];

  const isHoriz1 = side1 === "left" || side1 === "right";
  const isHoriz2 = side2 === "left" || side2 === "right";

  if (isHoriz1 !== isHoriz2) {
    const corner: [number, number] = isHoriz1
      ? [out1[0], out2[1]]
      : [out2[0], out1[1]];
    return simplifyPolyline([p1, out1, corner, out2, p2]);
  }

  // Opposite sides on same node (e.g. right -> left): loop around top of node
  const topY = ownerBox.y - loopOut;
  return simplifyPolyline([
    p1,
    out1,
    [out1[0], topY],
    [out2[0], topY],
    out2,
    p2,
  ]);
}

function buildOrthogonalWaypoints(
  p1: [number, number],
  side1: PortSide,
  p2: [number, number],
  side2: PortSide,
  corridor: CorridorBounds,
  outerFromBox: BoundingBox,
  outerToBox: BoundingBox,
  stub = 20,
  corridorOffset = 0
): [number, number][] {
  const [n1x, n1y] = getNormalVector(side1);
  const [n2x, n2y] = getNormalVector(side2);

  const s1: [number, number] = [p1[0] + n1x * stub, p1[1] + n1y * stub];
  const s2: [number, number] = [p2[0] + n2x * stub, p2[1] + n2y * stub];

  const isHoriz1 = side1 === "left" || side1 === "right";
  const isHoriz2 = side2 === "left" || side2 === "right";

  if (isHoriz1 && isHoriz2) {
    if (side1 === "right" && side2 === "right") {
      const maxX =
        Math.max(
          s1[0],
          s2[0],
          outerFromBox.x + outerFromBox.width + stub,
          outerToBox.x + outerToBox.width + stub
        ) + Math.max(0, corridorOffset);
      return simplifyPolyline([p1, [maxX, p1[1]], [maxX, p2[1]], p2]);
    }
    if (side1 === "left" && side2 === "left") {
      const minX =
        Math.min(
          s1[0],
          s2[0],
          outerFromBox.x - stub,
          outerToBox.x - stub
        ) + Math.min(0, corridorOffset);
      return simplifyPolyline([p1, [minX, p1[1]], [minX, p2[1]], p2]);
    }

    const forward =
      (side1 === "right" && side2 === "left" && p2[0] >= p1[0]) ||
      (side1 === "left" && side2 === "right" && p1[0] >= p2[0]);

    if (forward && Math.abs(p1[1] - p2[1]) <= 1) {
      return [p1, p2];
    }

    if (forward) {
      let midX = corridor.horiz
        ? (corridor.horiz[0] + corridor.horiz[1]) / 2 + corridorOffset
        : (s1[0] + s2[0]) / 2 + corridorOffset;
      if (corridor.horiz && corridor.horiz[1] - corridor.horiz[0] > 24) {
        midX = Math.max(
          corridor.horiz[0] + 10,
          Math.min(corridor.horiz[1] - 10, midX)
        );
      }
      return simplifyPolyline([p1, [midX, p1[1]], [midX, p2[1]], p2]);
    }

    // Reverse horizontal connection: step out to s1, route around via midY, step into s2
    const midY =
      (corridor.vert
        ? (corridor.vert[0] + corridor.vert[1]) / 2
        : (p1[1] + p2[1]) / 2) + corridorOffset;
    return simplifyPolyline([
      p1,
      s1,
      [s1[0], midY],
      [s2[0], midY],
      s2,
      p2,
    ]);
  }

  if (!isHoriz1 && !isHoriz2) {
    if (side1 === "bottom" && side2 === "bottom") {
      const maxY =
        Math.max(
          s1[1],
          s2[1],
          outerFromBox.y + outerFromBox.height + stub,
          outerToBox.y + outerToBox.height + stub
        ) + Math.max(0, corridorOffset);
      return simplifyPolyline([p1, [p1[0], maxY], [p2[0], maxY], p2]);
    }
    if (side1 === "top" && side2 === "top") {
      const minY =
        Math.min(
          s1[1],
          s2[1],
          outerFromBox.y - stub,
          outerToBox.y - stub
        ) + Math.min(0, corridorOffset);
      return simplifyPolyline([p1, [p1[0], minY], [p2[0], minY], p2]);
    }

    const forward =
      (side1 === "bottom" && side2 === "top" && p2[1] >= p1[1]) ||
      (side1 === "top" && side2 === "bottom" && p1[1] >= p2[1]);

    if (forward && Math.abs(p1[0] - p2[0]) <= 1) {
      return [p1, p2];
    }

    if (forward) {
      let midY = corridor.vert
        ? (corridor.vert[0] + corridor.vert[1]) / 2 + corridorOffset
        : (s1[1] + s2[1]) / 2 + corridorOffset;
      if (corridor.vert && corridor.vert[1] - corridor.vert[0] > 24) {
        midY = Math.max(
          corridor.vert[0] + 10,
          Math.min(corridor.vert[1] - 10, midY)
        );
      }
      return simplifyPolyline([p1, [p1[0], midY], [p2[0], midY], p2]);
    }

    const midX =
      (corridor.horiz
        ? (corridor.horiz[0] + corridor.horiz[1]) / 2
        : (p1[0] + p2[0]) / 2) + corridorOffset;
    return simplifyPolyline([
      p1,
      s1,
      [midX, s1[1]],
      [midX, s2[1]],
      s2,
      p2,
    ]);
  }

  // Orthogonal L-bends (horizontal -> vertical or vertical -> horizontal)
  if (isHoriz1 && !isHoriz2) {
    const corner: [number, number] = [p2[0], p1[1]];
    const validOut = (corner[0] - p1[0]) * n1x >= stub * 0.4;
    const validIn = (corner[1] - p2[1]) * n2y >= stub * 0.4;
    if (validOut && validIn) {
      return simplifyPolyline([p1, corner, p2]);
    }
    return simplifyPolyline([p1, s1, [s1[0], s2[1]], s2, p2]);
  }

  const corner: [number, number] = [p1[0], p2[1]];
  const validOut = (corner[1] - p1[1]) * n1y >= stub * 0.4;
  const validIn = (corner[0] - p2[0]) * n2x >= stub * 0.4;
  if (validOut && validIn) {
    return simplifyPolyline([p1, corner, p2]);
  }
  return simplifyPolyline([p1, s1, [s2[0], s1[1]], s2, p2]);
}

// ============================================================================
// Obstacle Detection & Hanan Grid Orthogonal A* / Dijkstra Detour Solver
// ============================================================================

function boxContainsBox(outer: BoundingBox, inner: BoundingBox): boolean {
  return (
    outer.x <= inner.x + 1 &&
    outer.y <= inner.y + 1 &&
    outer.x + outer.width >= inner.x + inner.width - 1 &&
    outer.y + outer.height >= inner.y + inner.height - 1
  );
}

function buildEdgeObstacles(
  fromOwnerId: string,
  toOwnerId: string,
  ownerFromBox: BoundingBox,
  ownerToBox: BoundingBox,
  registry: Record<string, BoundingBox>
): { paddedObstacles: BoundingBox[]; rawObstacles: BoundingBox[] } {
  const paddedObstacles: BoundingBox[] = [];
  const rawObstacles: BoundingBox[] = [];

  // Shrink endpoint owner boxes by 3px so ports on their perimeter don't collide,
  // while any segment cutting across their interior is rejected.
  const shrink = 3;
  if (ownerFromBox.width > shrink * 2 && ownerFromBox.height > shrink * 2) {
    paddedObstacles.push({
      x: ownerFromBox.x + shrink,
      y: ownerFromBox.y + shrink,
      width: ownerFromBox.width - shrink * 2,
      height: ownerFromBox.height - shrink * 2,
    });
    rawObstacles.push(ownerFromBox);
  }
  if (
    ownerToBox !== ownerFromBox &&
    ownerToBox.width > shrink * 2 &&
    ownerToBox.height > shrink * 2
  ) {
    paddedObstacles.push({
      x: ownerToBox.x + shrink,
      y: ownerToBox.y + shrink,
      width: ownerToBox.width - shrink * 2,
      height: ownerToBox.height - shrink * 2,
    });
    rawObstacles.push(ownerToBox);
  }

  const pad = 8;
  for (const [key, box] of Object.entries(registry)) {
    // Only consider primary node boxes, not sub-anchors
    if (box.ownerNodeId && box.ownerNodeId !== key) continue;
    if (key === fromOwnerId || key === toOwnerId) continue;

    // Skip container groups that enclose either endpoint or child nodes inside either endpoint
    if (
      boxContainsBox(box, ownerFromBox) ||
      boxContainsBox(box, ownerToBox) ||
      boxContainsBox(ownerFromBox, box) ||
      boxContainsBox(ownerToBox, box)
    ) {
      continue;
    }

    rawObstacles.push(box);
    paddedObstacles.push({
      x: box.x - pad,
      y: box.y - pad,
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    });
  }

  return { paddedObstacles, rawObstacles };
}

function segmentIntersectsBox(
  a: [number, number],
  b: [number, number],
  box: BoundingBox
): boolean {
  const minX = Math.min(a[0], b[0]);
  const maxX = Math.max(a[0], b[0]);
  const minY = Math.min(a[1], b[1]);
  const maxY = Math.max(a[1], b[1]);

  const bx1 = box.x;
  const by1 = box.y;
  const bx2 = box.x + box.width;
  const by2 = box.y + box.height;

  // Axis-aligned orthogonal segment fast check
  if (Math.abs(a[1] - b[1]) <= 0.5) {
    const y = a[1];
    return y > by1 && y < by2 && maxX > bx1 && minX < bx2;
  }
  if (Math.abs(a[0] - b[0]) <= 0.5) {
    const x = a[0];
    return x > bx1 && x < bx2 && maxY > by1 && minY < by2;
  }

  // General Liang-Barsky segment-AABB intersection
  if (maxX <= bx1 || minX >= bx2 || maxY <= by1 || minY >= by2) {
    return false;
  }
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const p = [-dx, dx, -dy, dy];
  const q = [a[0] - bx1, bx2 - a[0], a[1] - by1, by2 - a[1]];

  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-6) {
      if (q[i] <= 0) return false;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return t0 < t1;
}

function polylineHitsObstacles(
  points: [number, number][],
  obstacles: BoundingBox[]
): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    for (const obs of obstacles) {
      if (segmentIntersectsBox(a, b, obs)) {
        return true;
      }
    }
  }
  return false;
}

function pointInsideAnyObstacle(
  pt: [number, number],
  obstacles: BoundingBox[]
): boolean {
  for (const obs of obstacles) {
    if (
      pt[0] > obs.x &&
      pt[0] < obs.x + obs.width &&
      pt[1] > obs.y &&
      pt[1] < obs.y + obs.height
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Finds a minimum-bend, shortest-path orthogonal route from p1 to p2 on a Hanan visibility grid
 * avoiding all intermediate and endpoint obstacle bounding boxes.
 */
function findObstacleFreeOrthogonalPath(
  p1: [number, number],
  side1: PortSide,
  p2: [number, number],
  side2: PortSide,
  rawObstacles: BoundingBox[],
  paddedObstacles: BoundingBox[],
  stub = 20
): [number, number][] | null {
  const [n1x, n1y] = getNormalVector(side1);
  const [n2x, n2y] = getNormalVector(side2);

  let s1: [number, number] = [p1[0] + n1x * stub, p1[1] + n1y * stub];
  if (
    pointInsideAnyObstacle(s1, paddedObstacles) ||
    polylineHitsObstacles([p1, s1], paddedObstacles)
  ) {
    const shortStub: [number, number] = [p1[0] + n1x * 8, p1[1] + n1y * 8];
    s1 = !polylineHitsObstacles([p1, shortStub], paddedObstacles)
      ? shortStub
      : p1;
  }

  let s2: [number, number] = [p2[0] + n2x * stub, p2[1] + n2y * stub];
  if (
    pointInsideAnyObstacle(s2, paddedObstacles) ||
    polylineHitsObstacles([s2, p2], paddedObstacles)
  ) {
    const shortStub: [number, number] = [p2[0] + n2x * 8, p2[1] + n2y * 8];
    s2 = !polylineHitsObstacles([shortStub, p2], paddedObstacles)
      ? shortStub
      : p2;
  }

  const clearance = 18;
  const xSet = new Set<number>([
    Math.round(p1[0]),
    Math.round(p2[0]),
    Math.round(s1[0]),
    Math.round(s2[0]),
    Math.round((s1[0] + s2[0]) / 2),
  ]);
  const ySet = new Set<number>([
    Math.round(p1[1]),
    Math.round(p2[1]),
    Math.round(s1[1]),
    Math.round(s2[1]),
    Math.round((s1[1] + s2[1]) / 2),
  ]);

  for (const b of rawObstacles) {
    xSet.add(Math.round(b.x - clearance));
    xSet.add(Math.round(b.x + b.width + clearance));
    ySet.add(Math.round(b.y - clearance));
    ySet.add(Math.round(b.y + b.height + clearance));
  }

  const baseXs = Array.from(xSet).sort((a, b) => a - b);
  const baseYs = Array.from(ySet).sort((a, b) => a - b);
  for (let i = 0; i < baseXs.length - 1; i++) {
    if (baseXs[i + 1] - baseXs[i] > 16) {
      xSet.add(Math.round((baseXs[i] + baseXs[i + 1]) / 2));
    }
  }
  for (let i = 0; i < baseYs.length - 1; i++) {
    if (baseYs[i + 1] - baseYs[i] > 16) {
      ySet.add(Math.round((baseYs[i] + baseYs[i + 1]) / 2));
    }
  }

  // Ensure exact s1 and s2 coordinates are in the grid
  xSet.add(s1[0]);
  xSet.add(s2[0]);
  ySet.add(s1[1]);
  ySet.add(s2[1]);

  const xs = Array.from(xSet).sort((a, b) => a - b);
  const ys = Array.from(ySet).sort((a, b) => a - b);
  const nx = xs.length;
  const ny = ys.length;

  const startXi = xs.indexOf(s1[0]);
  const startYi = ys.indexOf(s1[1]);
  const endXi = xs.indexOf(s2[0]);
  const endYi = ys.indexOf(s2[1]);
  if (startXi < 0 || startYi < 0 || endXi < 0 || endYi < 0) return null;

  // Directions: 0 = horiz, 1 = vert
  const initDir = side1 === "left" || side1 === "right" ? 0 : 1;
  const targetDir = side2 === "left" || side2 === "right" ? 0 : 1;
  const stateCount = nx * ny * 2;
  const dist = new Float64Array(stateCount).fill(Infinity);
  const parent = new Int32Array(stateCount).fill(-1);
  const visited = new Uint8Array(stateCount);

  const encode = (xi: number, yi: number, dir: number) =>
    (yi * nx + xi) * 2 + dir;

  const startState = encode(startXi, startYi, initDir);
  dist[startState] = 0;

  const bendPenalty = 85;
  const dxs = [1, -1, 0, 0];
  const dys = [0, 0, 1, -1];
  const dirs = [0, 0, 1, 1];

  for (let step = 0; step < stateCount; step++) {
    let u = -1;
    let bestD = Infinity;
    for (let s = 0; s < stateCount; s++) {
      if (!visited[s] && dist[s] < bestD) {
        bestD = dist[s];
        u = s;
      }
    }
    if (u === -1 || bestD === Infinity) break;
    visited[u] = 1;

    const uDir = u & 1;
    const cell = u >> 1;
    const uXi = cell % nx;
    const uYi = (cell / nx) | 0;

    if (uXi === endXi && uYi === endYi) {
      break;
    }

    const ux = xs[uXi];
    const uy = ys[uYi];

    for (let d = 0; d < 4; d++) {
      const vXi = uXi + dxs[d];
      const vYi = uYi + dys[d];
      if (vXi < 0 || vXi >= nx || vYi < 0 || vYi >= ny) continue;

      const vDir = dirs[d];
      const vx = xs[vXi];
      const vy = ys[vYi];

      if (polylineHitsObstacles([[ux, uy], [vx, vy]], paddedObstacles)) {
        continue;
      }

      const segLen = Math.abs(vx - ux) + Math.abs(vy - uy);
      let extraCost = uDir !== vDir ? bendPenalty : 0;
      if (vXi === endXi && vYi === endYi && vDir !== targetDir) {
        extraCost += bendPenalty;
      }

      const vState = encode(vXi, vYi, vDir);
      const nextDist = bestD + segLen + extraCost;
      if (nextDist < dist[vState]) {
        dist[vState] = nextDist;
        parent[vState] = u;
      }
    }
  }

  const endState0 = encode(endXi, endYi, 0);
  const endState1 = encode(endXi, endYi, 1);
  let curr =
    dist[endState0] <= dist[endState1] ? endState0 : endState1;
  if (dist[curr] === Infinity) return null;

  const gridPts: [number, number][] = [];
  while (curr !== -1) {
    const cell = curr >> 1;
    const xi = cell % nx;
    const yi = (cell / nx) | 0;
    gridPts.push([xs[xi], ys[yi]]);
    curr = parent[curr];
  }
  gridPts.reverse();

  return simplifyPolyline([p1, ...gridPts, p2]);
}

// ============================================================================
// Bezier & Polyline Label Evaluation Helpers
// ============================================================================

function evalCubicBezier(
  p0: [number, number],
  c1: [number, number],
  c2: [number, number],
  p3: [number, number],
  t: number
): [number, number] {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const w0 = mt2 * mt;
  const w1 = 3 * mt2 * t;
  const w2 = 3 * mt * t2;
  const w3 = t2 * t;
  return [
    w0 * p0[0] + w1 * c1[0] + w2 * c2[0] + w3 * p3[0],
    w0 * p0[1] + w1 * c1[1] + w2 * c2[1] + w3 * p3[1],
  ];
}

function findBezierTForCoord(
  p0: [number, number],
  c1: [number, number],
  c2: [number, number],
  p3: [number, number],
  targetVal: number,
  axis: 0 | 1
): number {
  const increasing = p3[axis] >= p0[axis];
  let lo = 0.06;
  let hi = 0.94;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const val = evalCubicBezier(p0, c1, c2, p3, mid)[axis];
    if ((increasing && val < targetVal) || (!increasing && val > targetVal)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

function evalPointAlongPolyline(
  pts: [number, number][],
  ratio: number
): [number, number] {
  if (pts.length === 0) return [0, 0];
  if (pts.length === 1) return pts[0];

  const segLens: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(
      pts[i + 1][0] - pts[i][0],
      pts[i + 1][1] - pts[i][1]
    );
    segLens.push(len);
    totalLen += len;
  }

  if (totalLen < 1e-3) return pts[0];
  const targetDist = Math.max(0, Math.min(1, ratio)) * totalLen;
  let acc = 0;
  for (let i = 0; i < segLens.length; i++) {
    const segLen = segLens[i];
    if (acc + segLen >= targetDist || i === segLens.length - 1) {
      const localT = segLen > 1e-3 ? (targetDist - acc) / segLen : 0;
      return [
        pts[i][0] + (pts[i + 1][0] - pts[i][0]) * localT,
        pts[i][1] + (pts[i + 1][1] - pts[i][1]) * localT,
      ];
    }
    acc += segLen;
  }
  return pts[pts.length - 1];
}

function findLongestClearSegmentMidpoint(
  pts: [number, number][],
  obstacles: BoundingBox[]
): [number, number] {
  if (pts.length === 0) return [0, 0];
  if (pts.length === 1) return pts[0];

  let bestMid: [number, number] = [
    (pts[0][0] + pts[1][0]) / 2,
    (pts[0][1] + pts[1][1]) / 2,
  ];
  let bestScore = -Infinity;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const hitObs = pointInsideAnyObstacle(mid, obstacles);
    // Prefer middle segments of a multi-segment route that are long and clear of obstacles
    const isInteriorSeg = pts.length >= 4 && i > 0 && i < pts.length - 2;
    const score =
      len + (isInteriorSeg ? 35 : 0) - (hitObs ? 1000 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestMid = mid;
    }
  }
  return bestMid;
}

function resolveLabelRatio(
  pos: ConnectionSpec["labelPosition"]
): { ratio: number; isExplicit: boolean } {
  if (pos === undefined) return { ratio: 0.5, isExplicit: false };
  if (pos === "start") return { ratio: 0.24, isExplicit: true };
  if (pos === "center") return { ratio: 0.5, isExplicit: true };
  if (pos === "end") return { ratio: 0.76, isExplicit: true };
  if (typeof pos === "number" && !Number.isNaN(pos)) {
    return {
      ratio: Math.max(0.08, Math.min(0.92, pos)),
      isExplicit: true,
    };
  }
  return { ratio: 0.5, isExplicit: false };
}

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  pad = 4
): boolean {
  return (
    a.x - pad < b.x + b.width &&
    a.x + a.width + pad > b.x &&
    a.y - pad < b.y + b.height &&
    a.y + a.height + pad > b.y
  );
}

// ============================================================================
// Main Connection Routing Pipeline
// ============================================================================

export function routeConnections(
  connections: ConnectionSpec[] | undefined,
  anchorRegistry: Record<string, BoundingBox>,
  theme: ResolvedThemeTokens,
  measurer: TextMeasurer,
  compact = false
): SceneEdge[] {
  if (!connections || connections.length === 0) return [];

  // Pass 1: Resolve endpoints, containers, sides, and collect port groups for Port Multiplexing
  const prepared: PreparedEdgeItem[] = [];

  connections.forEach((conn, idx) => {
    const id = conn.id || `edge_${idx + 1}`;
    const fromParsed = parseEndpoint(conn.from);
    const toParsed = parseEndpoint(conn.to);

    const fromBox = anchorRegistry[fromParsed.targetId];
    const toBox = anchorRegistry[toParsed.targetId];
    if (!fromBox || !toBox) {
      return;
    }

    const fromOwnerId = fromBox.ownerNodeId || fromParsed.targetId;
    const toOwnerId = toBox.ownerNodeId || toParsed.targetId;
    const isSelfLoop =
      fromParsed.targetId === toParsed.targetId ||
      (fromOwnerId === toOwnerId && fromBox === toBox);
    const isExternal = fromOwnerId !== toOwnerId;
    const isFromSubAnchor = fromParsed.targetId !== fromOwnerId;
    const isToSubAnchor = toParsed.targetId !== toOwnerId;

    const { ownerFromBox, ownerToBox, outerFromBox, outerToBox } =
      resolveOuterContainers(fromBox, toBox, anchorRegistry);

    const corridor = computeCorridorBounds(outerFromBox, outerToBox);
    const autoSides = chooseAutoSides(
      fromBox,
      toBox,
      outerFromBox,
      outerToBox,
      isSelfLoop
    );

    let fromSide = compact
      ? autoSides.fromSide
      : fromParsed.side || autoSides.fromSide;
    let toSide = compact
      ? autoSides.toSide
      : toParsed.side || autoSides.toSide;

    if (isSelfLoop && !fromParsed.side && toParsed.side) {
      fromSide = toParsed.side === "top" ? "right" : "top";
    } else if (isSelfLoop && fromParsed.side && !toParsed.side) {
      toSide = fromParsed.side;
    }

    prepared.push({
      conn,
      idx,
      id,
      fromParsed,
      toParsed,
      fromBox,
      toBox,
      fromOwnerId,
      toOwnerId,
      isExternal,
      isSelfLoop,
      isFromSubAnchor,
      isToSubAnchor,
      ownerFromBox,
      ownerToBox,
      outerFromBox,
      outerToBox,
      corridor,
      fromSide,
      toSide,
      fromRatio: fromParsed.ratio,
      toRatio: toParsed.ratio,
      fromMultiplexed: false,
      toMultiplexed: false,
      corridorOffset: 0,
    });
  });

  // Pass 1b: Port Multiplexing (distribute edges sharing the same node side & segment)
  interface PortSlotEntry {
    item: PreparedEdgeItem;
    end: "from" | "to";
    sortCoord: number;
  }

  const portGroups = new Map<string, PortSlotEntry[]>();
  const makePortKey = (
    ownerId: string,
    box: BoundingBox,
    side: PortSide
  ): string => {
    const isHoriz = side === "left" || side === "right";
    const segStart = isHoriz ? Math.round(box.y) : Math.round(box.x);
    const segLen = isHoriz ? Math.round(box.height) : Math.round(box.width);
    return `${ownerId}::${side}::${segStart}_${segLen}`;
  };

  for (const item of prepared) {
    if (!item.fromParsed.explicitRatio && item.fromSide !== "center") {
      const key = makePortKey(item.fromOwnerId, item.fromBox, item.fromSide);
      const isHoriz = item.fromSide === "left" || item.fromSide === "right";
      const otherCoord = isHoriz
        ? item.toBox.y + item.toBox.height / 2
        : item.toBox.x + item.toBox.width / 2;
      const list = portGroups.get(key) || [];
      list.push({ item, end: "from", sortCoord: otherCoord });
      portGroups.set(key, list);
    }

    if (!item.toParsed.explicitRatio && item.toSide !== "center") {
      const key = makePortKey(item.toOwnerId, item.toBox, item.toSide);
      const isHoriz = item.toSide === "left" || item.toSide === "right";
      const otherCoord = isHoriz
        ? item.fromBox.y + item.fromBox.height / 2
        : item.fromBox.x + item.fromBox.width / 2;
      const list = portGroups.get(key) || [];
      list.push({ item, end: "to", sortCoord: otherCoord });
      portGroups.set(key, list);
    }
  }

  portGroups.forEach((entries) => {
    if (entries.length <= 1) return;
    entries.sort((a, b) => {
      if (Math.abs(a.sortCoord - b.sortCoord) > 1) {
        return a.sortCoord - b.sortCoord;
      }
      if (a.item.idx !== b.item.idx) return a.item.idx - b.item.idx;
      return a.end === "from" ? -1 : 1;
    });

    const m = entries.length;
    const span = Math.min(0.64, (m - 1) * 0.22);
    const startRatio = 0.5 - span / 2;
    const step = m > 1 ? span / (m - 1) : 0;

    entries.forEach((entry, i) => {
      const r = startRatio + i * step;
      if (entry.end === "from") {
        entry.item.fromRatio = r;
        entry.item.fromMultiplexed = true;
      } else {
        entry.item.toRatio = r;
        entry.item.toMultiplexed = true;
      }
    });
  });

  // Pass 1c: Parallel Corridor Channel Offsetting (separate multiple Z-bends in the same corridor)
  const corridorGroups = new Map<string, PreparedEdgeItem[]>();
  for (const item of prepared) {
    if (item.isSelfLoop || (item.conn.routing && item.conn.routing !== "orthogonal")) {
      continue;
    }
    if (item.corridor.horiz) {
      const k = `H::${Math.round(item.corridor.horiz[0])}_${Math.round(item.corridor.horiz[1])}`;
      const list = corridorGroups.get(k) || [];
      list.push(item);
      corridorGroups.set(k, list);
    } else if (item.corridor.vert) {
      const k = `V::${Math.round(item.corridor.vert[0])}_${Math.round(item.corridor.vert[1])}`;
      const list = corridorGroups.get(k) || [];
      list.push(item);
      corridorGroups.set(k, list);
    }
  }
  corridorGroups.forEach((items) => {
    if (items.length <= 1) return;
    items.forEach((it, i) => {
      it.corridorOffset = (i - (items.length - 1) / 2) * 14;
    });
  });

  // Pass 2: Route paths and place labels
  const edges: SceneEdge[] = [];
  const placedLabelBoxes: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];

  for (const item of prepared) {
    const {
      conn,
      id,
      fromParsed,
      toParsed,
      fromBox,
      toBox,
      fromOwnerId,
      toOwnerId,
      isExternal,
      isSelfLoop,
      isFromSubAnchor,
      isToSubAnchor,
      ownerFromBox,
      ownerToBox,
      outerFromBox,
      outerToBox,
      corridor,
      fromSide,
      toSide,
      fromRatio,
      toRatio,
      fromMultiplexed,
      toMultiplexed,
      corridorOffset,
    } = item;

    const p1 = getProjectedPortPoint(
      fromBox,
      ownerFromBox,
      fromSide,
      fromRatio,
      isExternal
    );
    const p2 = getProjectedPortPoint(
      toBox,
      ownerToBox,
      toSide,
      toRatio,
      isExternal
    );

    if (!isSelfLoop) {
      alignFacingPorts(
        p1,
        p2,
        fromBox,
        toBox,
        fromSide,
        toSide,
        fromParsed.explicitRatio || fromMultiplexed,
        toParsed.explicitRatio || toMultiplexed,
        isFromSubAnchor,
        isToSubAnchor
      );
    }

    const routing = conn.routing || "orthogonal";
    const cornerRadius = conn.cornerRadius ?? 8;
    const stub = conn.stub ?? 20;

    const { paddedObstacles, rawObstacles } = buildEdgeObstacles(
      fromOwnerId,
      toOwnerId,
      ownerFromBox,
      ownerToBox,
      anchorRegistry
    );

    let pathD = "";
    let points: [number, number][] = [p1, p2];
    let bezierControls: [[number, number], [number, number]] | null = null;
    let usedObstacleDetour = false;

    if (isSelfLoop) {
      points = buildSelfLoopWaypoints(
        p1,
        fromSide,
        p2,
        toSide,
        ownerFromBox,
        stub
      );
      pathD = buildRoundedPolylinePath(points, cornerRadius);
    } else if (routing === "straight") {
      pathD = `M ${Math.round(p1[0])} ${Math.round(p1[1])} L ${Math.round(p2[0])} ${Math.round(p2[1])}`;
    } else if (routing === "curved") {
      if (
        (Math.abs(p1[0] - p2[0]) <= 1 || Math.abs(p1[1] - p2[1]) <= 1) &&
        !polylineHitsObstacles([p1, p2], paddedObstacles)
      ) {
        pathD = `M ${Math.round(p1[0])} ${Math.round(p1[1])} L ${Math.round(p2[0])} ${Math.round(p2[1])}`;
        points = [p1, p2];
      } else {
        const [n1x, n1y] = getNormalVector(fromSide);
        const [n2x, n2y] = getNormalVector(toSide);
        const dx = Math.abs(p2[0] - p1[0]);
        const dy = Math.abs(p2[1] - p1[1]);
        const primarySpan =
          (fromSide === "left" || fromSide === "right") &&
          (toSide === "left" || toSide === "right")
            ? dx
            : (fromSide === "top" || fromSide === "bottom") &&
              (toSide === "top" || toSide === "bottom")
            ? dy
            : Math.hypot(dx, dy);
        const controlLen =
          conn.curveOffset ?? Math.max(28, Math.min(120, primarySpan * 0.45));
        const c1: [number, number] = [
          p1[0] + n1x * controlLen,
          p1[1] + n1y * controlLen,
        ];
        const c2: [number, number] = [
          p2[0] + n2x * controlLen,
          p2[1] + n2y * controlLen,
        ];
        bezierControls = [c1, c2];
        pathD = `M ${Math.round(p1[0])} ${Math.round(p1[1])} C ${Math.round(c1[0])} ${Math.round(c1[1])}, ${Math.round(c2[0])} ${Math.round(c2[1])}, ${Math.round(p2[0])} ${Math.round(p2[1])}`;
        points = [
          p1,
          evalCubicBezier(p1, c1, c2, p2, 0.25),
          evalCubicBezier(p1, c1, c2, p2, 0.5),
          evalCubicBezier(p1, c1, c2, p2, 0.75),
          p2,
        ];
      }
    } else {
      points = buildOrthogonalWaypoints(
        p1,
        fromSide,
        p2,
        toSide,
        corridor,
        outerFromBox,
        outerToBox,
        stub,
        corridorOffset
      );

      if (polylineHitsObstacles(points, paddedObstacles)) {
        const detour = findObstacleFreeOrthogonalPath(
          p1,
          fromSide,
          p2,
          toSide,
          rawObstacles,
          paddedObstacles,
          stub
        );
        if (detour && detour.length >= 2) {
          points = detour;
          usedObstacleDetour = true;
        }
      }

      pathD = buildRoundedPolylinePath(points, cornerRadius);
    }

    const tone = conn.tone || "neutral";
    const stroke =
      tone === "neutral"
        ? theme.colors.textMuted
        : theme.colors.tones[tone].main;

    const strokeWidth =
      conn.strokeWidth === "thin"
        ? 1.25
        : conn.strokeWidth === "thick"
        ? 2.5
        : 1.75;

    const strokeDasharray =
      conn.strokeStyle === "dashed"
        ? "6 4"
        : conn.strokeStyle === "dotted"
        ? "2 4"
        : undefined;

    // Corridor & obstacle-aware label placement
    let labelBox: SceneEdge["labelBox"];
    if (conn.label) {
      const labelW =
        Math.ceil(
          measurer.measureLineWidth(
            conn.label,
            11,
            theme.typography.fontSans,
            600
          )
        ) + 18;
      const labelH = 22;
      const { ratio: posRatio, isExplicit: hasExplicitPos } = resolveLabelRatio(
        conn.labelPosition
      );

      let anchorPt: [number, number];

      if (isSelfLoop) {
        anchorPt = findLongestClearSegmentMidpoint(points, paddedObstacles);
      } else if (usedObstacleDetour && !hasExplicitPos) {
        anchorPt = findLongestClearSegmentMidpoint(points, paddedObstacles);
      } else if (bezierControls) {
        const [c1, c2] = bezierControls;
        if (
          corridor.horiz &&
          corridor.horiz[1] > corridor.horiz[0] + 8 &&
          (fromSide === "left" || fromSide === "right") &&
          (toSide === "left" || toSide === "right")
        ) {
          const leftToRight = p2[0] >= p1[0];
          const r = leftToRight ? posRatio : 1 - posRatio;
          const targetX =
            corridor.horiz[0] + (corridor.horiz[1] - corridor.horiz[0]) * r;
          const t = findBezierTForCoord(p1, c1, c2, p2, targetX, 0);
          anchorPt = evalCubicBezier(p1, c1, c2, p2, t);
        } else if (
          corridor.vert &&
          corridor.vert[1] > corridor.vert[0] + 8 &&
          (fromSide === "top" || fromSide === "bottom") &&
          (toSide === "top" || toSide === "bottom")
        ) {
          const topToBottom = p2[1] >= p1[1];
          const r = topToBottom ? posRatio : 1 - posRatio;
          const targetY =
            corridor.vert[0] + (corridor.vert[1] - corridor.vert[0]) * r;
          const t = findBezierTForCoord(p1, c1, c2, p2, targetY, 1);
          anchorPt = evalCubicBezier(p1, c1, c2, p2, t);
        } else {
          anchorPt = evalCubicBezier(p1, c1, c2, p2, posRatio);
        }
      } else if (points.length === 2) {
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        if (
          corridor.horiz &&
          corridor.horiz[1] > corridor.horiz[0] + 8 &&
          Math.abs(dx) >= Math.abs(dy) &&
          Math.abs(dx) > 1
        ) {
          const leftToRight = dx >= 0;
          const r = leftToRight ? posRatio : 1 - posRatio;
          const targetX =
            corridor.horiz[0] + (corridor.horiz[1] - corridor.horiz[0]) * r;
          const t = Math.max(0.08, Math.min(0.92, (targetX - p1[0]) / dx));
          anchorPt = [p1[0] + dx * t, p1[1] + dy * t];
        } else if (
          corridor.vert &&
          corridor.vert[1] > corridor.vert[0] + 8 &&
          Math.abs(dy) > Math.abs(dx) &&
          Math.abs(dy) > 1
        ) {
          const topToBottom = dy >= 0;
          const r = topToBottom ? posRatio : 1 - posRatio;
          const targetY =
            corridor.vert[0] + (corridor.vert[1] - corridor.vert[0]) * r;
          const t = Math.max(0.08, Math.min(0.92, (targetY - p1[1]) / dy));
          anchorPt = [p1[0] + dx * t, p1[1] + dy * t];
        } else {
          anchorPt = [p1[0] + dx * posRatio, p1[1] + dy * posRatio];
        }
      } else if (points.length === 3 && !hasExplicitPos) {
        const len1 = Math.hypot(
          points[1][0] - points[0][0],
          points[1][1] - points[0][1]
        );
        const len2 = Math.hypot(
          points[2][0] - points[1][0],
          points[2][1] - points[1][1]
        );
        anchorPt =
          len1 >= len2
            ? [
                (points[0][0] + points[1][0]) / 2,
                (points[0][1] + points[1][1]) / 2,
              ]
            : [
                (points[1][0] + points[2][0]) / 2,
                (points[1][1] + points[2][1]) / 2,
              ];
      } else if (points.length === 4 && !hasExplicitPos) {
        anchorPt = [
          (points[1][0] + points[2][0]) / 2,
          (points[1][1] + points[2][1]) / 2,
        ];
      } else {
        anchorPt = evalPointAlongPolyline(points, posRatio);
      }

      let lx = anchorPt[0] - labelW / 2;
      let ly = anchorPt[1] - labelH / 2;

      if (conn.labelSide === "top") {
        ly -= labelH / 2 + 6;
      } else if (conn.labelSide === "bottom") {
        ly += labelH / 2 + 6;
      } else if (conn.labelSide === "left") {
        lx -= labelW / 2 + 6;
      } else if (conn.labelSide === "right") {
        lx += labelW / 2 + 6;
      }

      if (conn.labelOffset) {
        lx += conn.labelOffset[0];
        ly += conn.labelOffset[1];
      } else if (!isSelfLoop && !usedObstacleDetour) {
        if (
          corridor.horiz &&
          (fromSide === "left" || fromSide === "right") &&
          (toSide === "left" || toSide === "right")
        ) {
          const minX = corridor.horiz[0] + 6;
          const maxX = corridor.horiz[1] - labelW - 6;
          if (maxX >= minX) {
            lx = Math.max(minX, Math.min(maxX, lx));
          } else {
            lx = (corridor.horiz[0] + corridor.horiz[1] - labelW) / 2;
          }
        }
        if (
          corridor.vert &&
          (fromSide === "top" || fromSide === "bottom") &&
          (toSide === "top" || toSide === "bottom")
        ) {
          const minY = corridor.vert[0] + 6;
          const maxY = corridor.vert[1] - labelH - 6;
          if (maxY >= minY) {
            ly = Math.max(minY, Math.min(maxY, ly));
          } else {
            ly = (corridor.vert[0] + corridor.vert[1] - labelH) / 2;
          }
        }
      }

      const candidateBox = {
        x: lx,
        y: ly,
        width: labelW,
        height: labelH,
      };

      // Avoid overlapping previously placed edge labels
      for (const prev of placedLabelBoxes) {
        if (boxesOverlap(candidateBox, prev, 4)) {
          if (candidateBox.y >= prev.y) {
            candidateBox.y = prev.y + prev.height + 6;
          } else {
            candidateBox.y = prev.y - candidateBox.height - 6;
          }
        }
      }

      placedLabelBoxes.push(candidateBox);
      labelBox = candidateBox;
    }

    // Animation parsing
    let animType: "none" | "flow" | "pulse" | "bidirectional" = "none";
    let durationSec = 2.0;

    if (conn.animation === true) {
      animType = "pulse";
    } else if (conn.animation && typeof conn.animation === "object") {
      animType = conn.animation.type || "pulse";
      durationSec =
        conn.animation.speed === "fast"
          ? 1.1
          : conn.animation.speed === "slow"
          ? 3.4
          : 2.0;
    }

    edges.push({
      id,
      from: fromParsed.targetId,
      to: toParsed.targetId,
      fromOwnerId,
      toOwnerId,
      pathD,
      points,
      label: conn.label,
      labelBox,
      tone,
      stroke,
      strokeWidth,
      strokeDasharray,
      startMarker: conn.startMarker || "none",
      endMarker: conn.endMarker || "arrow",
      animation: {
        type: animType,
        durationSec,
      },
    });
  }

  return edges;
}
