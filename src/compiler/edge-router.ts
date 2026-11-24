/**
 * Semantic Anchor Resolver & Obstacle-Aware Edge Router
 * Features:
 *  - Port Multiplexing & Crossing-Minimizing Port Ordering
 *  - Exact Geometric Perimeter Projection (Rect, Diamond, Circle, Ellipse)
 *  - Hanan-Grid Dijkstra Obstacle-Avoiding Orthogonal Routing
 *  - Self-Loop Routing (Single-Side & Corner Loops)
 *  - Corridor-Aware Label Placement & Multi-Label / Node Collision Avoidance
 */

import {
  coerceFiniteNumber,
  VALID_MARKER_TYPES,
  type BoundingBox,
  type ConnectionSpec,
  type ResolvedThemeTokens,
  type SceneEdge,
} from "../schema/spec.ts";
import { TextMeasurer } from "../runtime/text-measurer.ts";
import { getTonePalette, normalizeTone } from "../runtime/theme-observer.ts";

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
  corridorBundleIndex: number;
  corridorBundleSize: number;
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

  const isShapeSideCurved = (
    shape: BoundingBox["shape"],
    side: PortSide
  ): boolean => {
    if (!shape || shape === "rect") return false;
    // Queue has flat horizontal top/bottom edges; cylinder has flat vertical left/right walls
    if (shape === "queue" && (side === "top" || side === "bottom")) return false;
    if (shape === "cylinder" && (side === "left" || side === "right")) return false;
    return true;
  };

  const fixedFrom =
    fromFixedRatio || isShapeSideCurved(fromBox.shape, fromSide);
  const fixedTo =
    toFixedRatio || isShapeSideCurved(toBox.shape, toSide);

  if (isOppositeHoriz) {
    const dy = Math.abs(p1[1] - p2[1]);
    if (dy > 0.5 && dy <= 40) {
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
    if (dx > 0.5 && dx <= 84) {
      const m1 = isFromSubAnchor
        ? Math.min(10, fromBox.width * 0.2)
        : Math.min(20, fromBox.width * 0.2);
      const m2 = isToSubAnchor
        ? Math.min(10, toBox.width * 0.2)
        : Math.min(20, toBox.width * 0.2);
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
  registry: Record<string, BoundingBox>,
  fromSide?: PortSide,
  toSide?: PortSide
): { paddedObstacles: BoundingBox[]; rawObstacles: BoundingBox[] } {
  const paddedObstacles: BoundingBox[] = [];
  const rawObstacles: BoundingBox[] = [];

  // Only inset endpoint owner boxes on the side where their port attaches,
  // while keeping perpendicular edges flush/padded so detours never graze along an endpoint's top/bottom/side borders.
  const shrink = 3;
  const makeEndpointObstacle = (
    box: BoundingBox,
    portSide?: PortSide
  ): BoundingBox => {
    const leftPad = portSide === "left" ? -shrink : 4;
    const rightPad = portSide === "right" ? -shrink : 4;
    const topPad = portSide === "top" ? -shrink : 4;
    const botPad = portSide === "bottom" ? -shrink : 4;
    return {
      x: box.x - leftPad,
      y: box.y - topPad,
      width: Math.max(2, box.width + leftPad + rightPad),
      height: Math.max(2, box.height + topPad + botPad),
    };
  };
  if (ownerFromBox.width > shrink * 2 && ownerFromBox.height > shrink * 2) {
    paddedObstacles.push(makeEndpointObstacle(ownerFromBox, fromSide));
    rawObstacles.push(ownerFromBox);
  }
  if (
    ownerToBox !== ownerFromBox &&
    ownerToBox.width > shrink * 2 &&
    ownerToBox.height > shrink * 2
  ) {
    paddedObstacles.push(makeEndpointObstacle(ownerToBox, toSide));
    rawObstacles.push(ownerToBox);
  }

  const pad = 8;
  for (const [key, box] of Object.entries(registry)) {
    // Only consider primary node boxes, not sub-anchors
    if (box.ownerNodeId && box.ownerNodeId !== key) continue;
    if (key === fromOwnerId || key === toOwnerId) continue;

    // Skip container groups that enclose either endpoint or child nodes inside either endpoint,
    // but protect the enclosing container's top header bar (36px) so internal edges never route across group titles.
    if (
      boxContainsBox(box, ownerFromBox) ||
      boxContainsBox(box, ownerToBox) ||
      boxContainsBox(ownerFromBox, box) ||
      boxContainsBox(ownerToBox, box)
    ) {
      const containsFrom = boxContainsBox(box, ownerFromBox);
      const containsTo = boxContainsBox(box, ownerToBox);
      const isHorizFrom =
        containsFrom && (fromSide === "left" || fromSide === "right");
      const isHorizTo =
        containsTo && (toSide === "left" || toSide === "right");
      if (
        (isHorizFrom || isHorizTo) &&
        (!containsFrom || ownerFromBox.y >= box.y + 36) &&
        (!containsTo || ownerToBox.y >= box.y + 36) &&
        box.height > 64
      ) {
        const headerObs: BoundingBox = {
          x: box.x + 4,
          y: box.y,
          width: Math.max(20, box.width - 8),
          height: 44,
        };
        rawObstacles.push(headerObs);
        paddedObstacles.push({
          x: headerObs.x - pad,
          y: headerObs.y - pad,
          width: headerObs.width + pad * 2,
          height: headerObs.height + pad * 2,
        });
      }
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

interface RoutedSegment {
  axis: "h" | "v";
  coord: number;
  min: number;
  max: number;
}

function collectContainerBoxes(
  registry: Record<string, BoundingBox>
): { containerBoxes: BoundingBox[]; containerHeaderObstacles: BoundingBox[] } {
  const primaries: Array<{ key: string; box: BoundingBox }> = [];
  for (const [key, box] of Object.entries(registry)) {
    if (box.ownerNodeId && box.ownerNodeId !== key) continue;
    primaries.push({ key, box });
  }
  const containerBoxes: BoundingBox[] = [];
  const containerHeaderObstacles: BoundingBox[] = [];
  for (const p of primaries) {
    const hasChild = primaries.some(
      (other) => other.key !== p.key && boxContainsBox(p.box, other.box)
    );
    if (hasChild) {
      containerBoxes.push(p.box);
      if (p.box.height > 64) {
        containerHeaderObstacles.push({
          x: p.box.x + 6,
          y: p.box.y + 4,
          width: Math.max(20, p.box.width - 12),
          height: 36,
        });
      }
    }
  }
  return { containerBoxes, containerHeaderObstacles };
}

function extractOrthogonalSegments(pts: [number, number][]): RoutedSegment[] {
  const segs: RoutedSegment[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (Math.abs(a[1] - b[1]) <= 0.5 && Math.abs(b[0] - a[0]) > 2) {
      segs.push({
        axis: "h",
        coord: (a[1] + b[1]) / 2,
        min: Math.min(a[0], b[0]),
        max: Math.max(a[0], b[0]),
      });
    } else if (Math.abs(a[0] - b[0]) <= 0.5 && Math.abs(b[1] - a[1]) > 2) {
      segs.push({
        axis: "v",
        coord: (a[0] + b[0]) / 2,
        min: Math.min(a[1], b[1]),
        max: Math.max(a[1], b[1]),
      });
    }
  }
  return segs;
}

function segmentOverlapsRouted(
  axis: "h" | "v",
  coord: number,
  min: number,
  max: number,
  routedSegments: RoutedSegment[],
  tol = 9
): boolean {
  for (const seg of routedSegments) {
    if (seg.axis !== axis) continue;
    if (Math.abs(seg.coord - coord) < tol) {
      if (Math.min(max, seg.max) > Math.max(min, seg.min) + 2) {
        return true;
      }
    }
  }
  return false;
}

function segmentCoincidesWithContainerBorder(
  axis: "h" | "v",
  coord: number,
  min: number,
  max: number,
  containerBoxes: BoundingBox[],
  tol = 9
): boolean {
  for (const c of containerBoxes) {
    if (axis === "v") {
      if (
        (Math.abs(coord - c.x) < tol ||
          Math.abs(coord - (c.x + c.width)) < tol) &&
        max > c.y - 4 &&
        min < c.y + c.height + 4
      ) {
        return true;
      }
    } else {
      if (
        (Math.abs(coord - c.y) < tol ||
          Math.abs(coord - (c.y + c.height)) < tol) &&
        max > c.x - 4 &&
        min < c.x + c.width + 4
      ) {
        return true;
      }
    }
  }
  return false;
}

function polylineHasTrackOrBorderCollision(
  pts: [number, number][],
  routedSegments: RoutedSegment[],
  containerBoxes: BoundingBox[]
): boolean {
  const segs = extractOrthogonalSegments(pts);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    // Skip very short endpoint port stubs (< 14px) attached directly to ports
    if ((i === 0 || i === segs.length - 1) && s.max - s.min < 14) continue;
    if (
      segmentOverlapsRouted(s.axis, s.coord, s.min, s.max, routedSegments, 8)
    ) {
      return true;
    }
    if (
      segmentCoincidesWithContainerBorder(
        s.axis,
        s.coord,
        s.min,
        s.max,
        containerBoxes,
        8
      )
    ) {
      return true;
    }
  }
  return false;
}

class StateMinHeap {
  private states: number[] = [];
  private keys: number[] = [];

  get size(): number {
    return this.states.length;
  }

  push(state: number, key: number): void {
    let i = this.states.length;
    this.states.push(state);
    this.keys.push(key);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= key) break;
      this.states[i] = this.states[p];
      this.keys[i] = this.keys[p];
      i = p;
    }
    this.states[i] = state;
    this.keys[i] = key;
  }

  pop(): number {
    const top = this.states[0];
    const lastState = this.states.pop()!;
    const lastKey = this.keys.pop()!;
    const len = this.states.length;
    if (len > 0) {
      let i = 0;
      while (true) {
        const l = (i << 1) + 1;
        if (l >= len) break;
        let smallest = l;
        const r = l + 1;
        if (r < len && this.keys[r] < this.keys[l]) {
          smallest = r;
        }
        if (lastKey <= this.keys[smallest]) break;
        this.states[i] = this.states[smallest];
        this.keys[i] = this.keys[smallest];
        i = smallest;
      }
      this.states[i] = lastState;
      this.keys[i] = lastKey;
    }
    return top;
  }
}

function lowerBound(arr: number[], target: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(arr: number[], target: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const EDGE_BLOCKED = 1;
const EDGE_ROUTED_OVERLAP = 2;
const EDGE_BORDER_COINCIDE = 4;

function runGridAStarOrthogonalPath(
  p1: [number, number],
  side1: PortSide,
  p2: [number, number],
  side2: PortSide,
  s1: [number, number],
  s2: [number, number],
  n1x: number,
  n1y: number,
  n2x: number,
  n2y: number,
  rawObstacles: BoundingBox[],
  paddedObstacles: BoundingBox[],
  routedSegments: RoutedSegment[],
  containerBoxes: BoundingBox[],
  pruneRoi: boolean
): [number, number][] | null {
  let activeRawObstacles = rawObstacles;
  let activePaddedObstacles = paddedObstacles;
  let activeContainerBoxes = containerBoxes;
  let activeRoutedSegments = routedSegments;
  let roiMinX = -Infinity;
  let roiMaxX = Infinity;
  let roiMinY = -Infinity;
  let roiMaxY = Infinity;

  if (pruneRoi) {
    const basePad = 140;
    roiMinX = Math.min(p1[0], p2[0], s1[0], s2[0]) - basePad;
    roiMaxX = Math.max(p1[0], p2[0], s1[0], s2[0]) + basePad;
    roiMinY = Math.min(p1[1], p2[1], s1[1], s2[1]) - basePad;
    roiMaxY = Math.max(p1[1], p2[1], s1[1], s2[1]) + basePad;

    // Expand ROI transitively (up to 2 passes) to encompass any obstacle/container intersecting the corridor
    const expandBoxes = [...rawObstacles, ...containerBoxes];
    const margin = 56;
    for (let pass = 0; pass < 2; pass++) {
      let expanded = false;
      for (const b of expandBoxes) {
        if (
          b.x <= roiMaxX &&
          b.x + b.width >= roiMinX &&
          b.y <= roiMaxY &&
          b.y + b.height >= roiMinY
        ) {
          if (b.x - margin < roiMinX) {
            roiMinX = b.x - margin;
            expanded = true;
          }
          if (b.x + b.width + margin > roiMaxX) {
            roiMaxX = b.x + b.width + margin;
            expanded = true;
          }
          if (b.y - margin < roiMinY) {
            roiMinY = b.y - margin;
            expanded = true;
          }
          if (b.y + b.height + margin > roiMaxY) {
            roiMaxY = b.y + b.height + margin;
            expanded = true;
          }
        }
      }
      if (!expanded) break;
    }

    const boxInRoi = (b: BoundingBox) =>
      b.x <= roiMaxX &&
      b.x + b.width >= roiMinX &&
      b.y <= roiMaxY &&
      b.y + b.height >= roiMinY;

    activeRawObstacles = rawObstacles.filter(boxInRoi);
    activePaddedObstacles = paddedObstacles.filter(boxInRoi);
    activeContainerBoxes = containerBoxes.filter(boxInRoi);
    activeRoutedSegments = routedSegments.filter((seg) =>
      seg.axis === "h"
        ? seg.coord >= roiMinY - 16 &&
          seg.coord <= roiMaxY + 16 &&
          seg.max >= roiMinX - 16 &&
          seg.min <= roiMaxX + 16
        : seg.coord >= roiMinX - 16 &&
          seg.coord <= roiMaxX + 16 &&
          seg.max >= roiMinY - 16 &&
          seg.min <= roiMaxY + 16
    );
  }

  const clearances = [18, 32];
  const xSet = new Set<number>([
    Math.round(p1[0]),
    Math.round(p2[0]),
    Math.round(p1[0] + n1x * 12),
    Math.round(p2[0] + n2x * 12),
    Math.round(s1[0]),
    Math.round(s2[0]),
    Math.round((s1[0] + s2[0]) / 2),
  ]);
  const ySet = new Set<number>([
    Math.round(p1[1]),
    Math.round(p2[1]),
    Math.round(p1[1] + n1y * 12),
    Math.round(p2[1] + n2y * 12),
    Math.round(s1[1]),
    Math.round(s2[1]),
    Math.round((s1[1] + s2[1]) / 2),
  ]);

  const addX = (v: number) => {
    const r = Math.round(v);
    if (r >= roiMinX && r <= roiMaxX) xSet.add(r);
  };
  const addY = (v: number) => {
    const r = Math.round(v);
    if (r >= roiMinY && r <= roiMaxY) ySet.add(r);
  };

  for (const b of activeRawObstacles) {
    for (const cl of clearances) {
      addX(b.x - cl);
      addX(b.x + b.width + cl);
      addY(b.y - cl);
      addY(b.y + b.height + cl);
    }
  }

  for (const c of activeContainerBoxes) {
    for (const cl of clearances) {
      addX(c.x - cl);
      addX(c.x + c.width + cl);
      addY(c.y - cl);
      addY(c.y + c.height + cl);
    }
  }

  // Add shifted alternate parallel tracks around already-routed segments so edges fan into parallel lanes
  for (const seg of activeRoutedSegments) {
    if (seg.axis === "v") {
      addX(seg.coord - 14);
      addX(seg.coord + 14);
    } else {
      addY(seg.coord - 14);
      addY(seg.coord + 14);
    }
  }

  const baseXs = Array.from(xSet).sort((a, b) => a - b);
  const baseYs = Array.from(ySet).sort((a, b) => a - b);
  if (baseXs.length <= 64) {
    for (let i = 0; i < baseXs.length - 1; i++) {
      if (baseXs[i + 1] - baseXs[i] > 24) {
        xSet.add(Math.round((baseXs[i] + baseXs[i + 1]) / 2));
      }
    }
  }
  if (baseYs.length <= 64) {
    for (let i = 0; i < baseYs.length - 1; i++) {
      if (baseYs[i + 1] - baseYs[i] > 24) {
        ySet.add(Math.round((baseYs[i] + baseYs[i + 1]) / 2));
      }
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

  const startXi = lowerBound(xs, s1[0]);
  const startYi = lowerBound(ys, s1[1]);
  const endXi = lowerBound(xs, s2[0]);
  const endYi = lowerBound(ys, s2[1]);
  if (
    startXi >= nx ||
    xs[startXi] !== s1[0] ||
    startYi >= ny ||
    ys[startYi] !== s1[1] ||
    endXi >= nx ||
    xs[endXi] !== s2[0] ||
    endYi >= ny ||
    ys[endYi] !== s2[1]
  ) {
    return null;
  }

  // Precompute obstacle blockage, routed track overlap, and container border flags on grid edges
  const hStride = Math.max(0, nx - 1);
  const hEdgeFlags = new Uint8Array(ny * hStride);
  const vEdgeFlags = new Uint8Array(Math.max(0, ny - 1) * nx);

  for (const obs of activePaddedObstacles) {
    const bx1 = obs.x;
    const bx2 = obs.x + obs.width;
    const by1 = obs.y;
    const by2 = obs.y + obs.height;

    if (hStride > 0) {
      const yiStart = upperBound(ys, by1);
      const yiEnd = lowerBound(ys, by2);
      const xiStart = Math.max(0, upperBound(xs, bx1) - 1);
      const xiEnd = Math.min(hStride, lowerBound(xs, bx2));
      for (let yi = yiStart; yi < yiEnd; yi++) {
        const rowOff = yi * hStride;
        for (let xi = xiStart; xi < xiEnd; xi++) {
          if (xs[xi + 1] > bx1 && xs[xi] < bx2) {
            hEdgeFlags[rowOff + xi] |= EDGE_BLOCKED;
          }
        }
      }
    }

    if (ny > 1) {
      const xiStart = upperBound(xs, bx1);
      const xiEnd = lowerBound(xs, bx2);
      const yiStart = Math.max(0, upperBound(ys, by1) - 1);
      const yiEnd = Math.min(ny - 1, lowerBound(ys, by2));
      for (let yi = yiStart; yi < yiEnd; yi++) {
        if (ys[yi + 1] > by1 && ys[yi] < by2) {
          const rowOff = yi * nx;
          for (let xi = xiStart; xi < xiEnd; xi++) {
            vEdgeFlags[rowOff + xi] |= EDGE_BLOCKED;
          }
        }
      }
    }
  }

  for (const seg of activeRoutedSegments) {
    if (seg.axis === "h" && hStride > 0) {
      const yiStart = upperBound(ys, seg.coord - 10);
      const yiEnd = lowerBound(ys, seg.coord + 10);
      const xiStart = Math.max(0, upperBound(xs, seg.min + 2) - 1);
      const xiEnd = Math.min(hStride, lowerBound(xs, seg.max - 2));
      for (let yi = yiStart; yi < yiEnd; yi++) {
        if (Math.abs(ys[yi] - seg.coord) >= 10) continue;
        const rowOff = yi * hStride;
        for (let xi = xiStart; xi < xiEnd; xi++) {
          if (Math.min(xs[xi + 1], seg.max) > Math.max(xs[xi], seg.min) + 2) {
            hEdgeFlags[rowOff + xi] |= EDGE_ROUTED_OVERLAP;
          }
        }
      }
    } else if (seg.axis === "v" && ny > 1) {
      const xiStart = upperBound(xs, seg.coord - 10);
      const xiEnd = lowerBound(xs, seg.coord + 10);
      const yiStart = Math.max(0, upperBound(ys, seg.min + 2) - 1);
      const yiEnd = Math.min(ny - 1, lowerBound(ys, seg.max - 2));
      for (let yi = yiStart; yi < yiEnd; yi++) {
        if (Math.min(ys[yi + 1], seg.max) <= Math.max(ys[yi], seg.min) + 2) {
          continue;
        }
        const rowOff = yi * nx;
        for (let xi = xiStart; xi < xiEnd; xi++) {
          if (Math.abs(xs[xi] - seg.coord) < 10) {
            vEdgeFlags[rowOff + xi] |= EDGE_ROUTED_OVERLAP;
          }
        }
      }
    }
  }

  for (const c of activeContainerBoxes) {
    if (hStride > 0) {
      const xiStart = Math.max(0, upperBound(xs, c.x - 4) - 1);
      const xiEnd = Math.min(hStride, lowerBound(xs, c.x + c.width + 4));
      for (const borderY of [c.y, c.y + c.height]) {
        const yiStart = upperBound(ys, borderY - 10);
        const yiEnd = lowerBound(ys, borderY + 10);
        for (let yi = yiStart; yi < yiEnd; yi++) {
          if (Math.abs(ys[yi] - borderY) >= 10) continue;
          const rowOff = yi * hStride;
          for (let xi = xiStart; xi < xiEnd; xi++) {
            if (xs[xi + 1] > c.x - 4 && xs[xi] < c.x + c.width + 4) {
              hEdgeFlags[rowOff + xi] |= EDGE_BORDER_COINCIDE;
            }
          }
        }
      }
    }

    if (ny > 1) {
      const yiStart = Math.max(0, upperBound(ys, c.y - 4) - 1);
      const yiEnd = Math.min(ny - 1, lowerBound(ys, c.y + c.height + 4));
      for (const borderX of [c.x, c.x + c.width]) {
        const xiStart = upperBound(xs, borderX - 10);
        const xiEnd = lowerBound(xs, borderX + 10);
        for (let yi = yiStart; yi < yiEnd; yi++) {
          if (ys[yi + 1] <= c.y - 4 || ys[yi] >= c.y + c.height + 4) continue;
          const rowOff = yi * nx;
          for (let xi = xiStart; xi < xiEnd; xi++) {
            if (Math.abs(xs[xi] - borderX) < 10) {
              vEdgeFlags[rowOff + xi] |= EDGE_BORDER_COINCIDE;
            }
          }
        }
      }
    }
  }

  // Directions: 0 = horiz, 1 = vert
  const initDir = side1 === "left" || side1 === "right" ? 0 : 1;
  const targetDir = side2 === "left" || side2 === "right" ? 0 : 1;
  const stateCount = nx * ny * 2;
  const dist = new Float64Array(stateCount).fill(Infinity);
  const parent = new Int32Array(stateCount).fill(-1);
  const visited = new Uint8Array(stateCount);

  const encode = (xi: number, yi: number, dir: number) =>
    (yi * nx + xi) * 2 + dir;

  const endX = xs[endXi];
  const endY = ys[endYi];
  const startState = encode(startXi, startYi, initDir);
  dist[startState] = 0;

  const heap = new StateMinHeap();
  heap.push(
    startState,
    Math.abs(xs[startXi] - endX) + Math.abs(ys[startYi] - endY)
  );

  const bendPenalty = 85;
  const dxs = [1, -1, 0, 0];
  const dys = [0, 0, 1, -1];
  const dirs = [0, 0, 1, 1];

  while (heap.size > 0) {
    const u = heap.pop();
    if (visited[u]) continue;
    visited[u] = 1;
    const bestD = dist[u];

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
      const flags =
        vDir === 0
          ? hEdgeFlags[uYi * hStride + (uXi < vXi ? uXi : vXi)]
          : vEdgeFlags[(uYi < vYi ? uYi : vYi) * nx + uXi];

      if ((flags & EDGE_BLOCKED) !== 0) {
        continue;
      }

      const vx = xs[vXi];
      const vy = ys[vYi];
      const segLen = vDir === 0 ? Math.abs(vx - ux) : Math.abs(vy - uy);

      let extraCost = uDir !== vDir ? bendPenalty : 0;
      if (vXi === endXi && vYi === endYi && vDir !== targetDir) {
        extraCost += bendPenalty;
      }

      // Penalize overlapping previously routed edge segments (track reservation)
      if ((flags & EDGE_ROUTED_OVERLAP) !== 0) {
        extraCost += 480 + segLen * 3;
      }

      // Penalize riding directly on top of a Group/Window container border
      if ((flags & EDGE_BORDER_COINCIDE) !== 0) {
        extraCost += 650 + segLen * 4;
      }

      const vState = encode(vXi, vYi, vDir);
      const nextDist = bestD + segLen + extraCost;
      if (nextDist < dist[vState]) {
        dist[vState] = nextDist;
        parent[vState] = u;
        const h = Math.abs(vx - endX) + Math.abs(vy - endY);
        heap.push(vState, nextDist + h);
      }
    }
  }

  const endState0 = encode(endXi, endYi, 0);
  const endState1 = encode(endXi, endYi, 1);
  let curr = dist[endState0] <= dist[endState1] ? endState0 : endState1;
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

/**
 * Finds a minimum-bend, shortest-path orthogonal route from p1 to p2 on a Hanan visibility grid
 * avoiding all intermediate and endpoint obstacle bounding boxes, container borders, and previously routed tracks.
 * Uses binary-heap A* search over ROI-pruned precomputed edge tables (O(E log V)).
 */
function findObstacleFreeOrthogonalPath(
  p1: [number, number],
  side1: PortSide,
  p2: [number, number],
  side2: PortSide,
  rawObstacles: BoundingBox[],
  paddedObstacles: BoundingBox[],
  stub = 20,
  routedSegments: RoutedSegment[] = [],
  containerBoxes: BoundingBox[] = []
): [number, number][] | null {
  const [n1x, n1y] = getNormalVector(side1);
  const [n2x, n2y] = getNormalVector(side2);

  const computeCleanStub = (
    p: [number, number],
    side: PortSide,
    nx: number,
    ny: number
  ): [number, number] => {
    let s: [number, number] = [p[0] + nx * stub, p[1] + ny * stub];
    // If stub lands right on an enclosing container border (e.g. group pad=20 == stub=20), push it cleanly outside
    for (const c of containerBoxes) {
      const pInside =
        p[0] > c.x + 2 &&
        p[0] < c.x + c.width - 2 &&
        p[1] > c.y + 2 &&
        p[1] < c.y + c.height - 2;
      if (!pInside) continue;
      if (side === "right" && Math.abs(s[0] - (c.x + c.width)) < 12) {
        const pushed: [number, number] = [c.x + c.width + 18, p[1]];
        if (!polylineHitsObstacles([p, pushed], paddedObstacles)) s = pushed;
      } else if (side === "left" && Math.abs(s[0] - c.x) < 12) {
        const pushed: [number, number] = [c.x - 18, p[1]];
        if (!polylineHitsObstacles([p, pushed], paddedObstacles)) s = pushed;
      } else if (side === "bottom" && Math.abs(s[1] - (c.y + c.height)) < 12) {
        const pushed: [number, number] = [p[0], c.y + c.height + 18];
        if (!polylineHitsObstacles([p, pushed], paddedObstacles)) s = pushed;
      } else if (side === "top" && Math.abs(s[1] - c.y) < 12) {
        const pushed: [number, number] = [p[0], c.y - 18];
        if (!polylineHitsObstacles([p, pushed], paddedObstacles)) s = pushed;
      }
    }
    if (
      pointInsideAnyObstacle(s, paddedObstacles) ||
      polylineHitsObstacles([p, s], paddedObstacles)
    ) {
      const shortStub: [number, number] = [p[0] + nx * 8, p[1] + ny * 8];
      s = !polylineHitsObstacles([p, shortStub], paddedObstacles)
        ? shortStub
        : p;
    } else if (routedSegments.length > 0) {
      // If the default 20px stub lands directly on top of a previously routed perpendicular track,
      // step back to a 10px stub so search can branch onto a clean parallel lane right away.
      const perpAxis: "h" | "v" = side === "top" || side === "bottom" ? "h" : "v";
      const sCoord = perpAxis === "h" ? s[1] : s[0];
      const sPerp = perpAxis === "h" ? s[0] : s[1];
      const hitsPerpTrack = routedSegments.some(
        (seg) =>
          seg.axis === perpAxis &&
          Math.abs(seg.coord - sCoord) < 10 &&
          sPerp >= seg.min - 24 &&
          sPerp <= seg.max + 24
      );
      if (hitsPerpTrack) {
        const shortStub: [number, number] = [p[0] + nx * 10, p[1] + ny * 10];
        if (!polylineHitsObstacles([p, shortStub], paddedObstacles)) {
          s = shortStub;
        }
      }
    }
    return s;
  };

  const s1 = computeCleanStub(p1, side1, n1x, n1y);
  const s2 = computeCleanStub(p2, side2, n2x, n2y);

  const pruned = runGridAStarOrthogonalPath(
    p1,
    side1,
    p2,
    side2,
    s1,
    s2,
    n1x,
    n1y,
    n2x,
    n2y,
    rawObstacles,
    paddedObstacles,
    routedSegments,
    containerBoxes,
    true
  );
  if (pruned) return pruned;

  return runGridAStarOrthogonalPath(
    p1,
    side1,
    p2,
    side2,
    s1,
    s2,
    n1x,
    n1y,
    n2x,
    n2y,
    rawObstacles,
    paddedObstacles,
    routedSegments,
    containerBoxes,
    false
  );
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
  obstacles: BoundingBox[],
  labelW = 80,
  labelH = 22
): [number, number] {
  if (pts.length === 0) return [0, 0];
  if (pts.length === 1) return pts[0];

  let bestMid: [number, number] = [
    (pts[0][0] + pts[1][0]) / 2,
    (pts[0][1] + pts[1][1]) / 2,
  ];
  let bestScore = -Infinity;

  const sampleRatios = [0.5, 0.38, 0.62, 0.26, 0.74];

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 8) continue;
    const isInteriorSeg = pts.length >= 4 && i > 0 && i < pts.length - 2;

    for (const r of sampleRatios) {
      const pt: [number, number] = [
        a[0] + (b[0] - a[0]) * r,
        a[1] + (b[1] - a[1]) * r,
      ];
      const lBox: BoundingBox = {
        x: pt[0] - labelW / 2,
        y: pt[1] - labelH / 2,
        width: labelW,
        height: labelH,
      };
      const ptHits = pointInsideAnyObstacle(pt, obstacles);
      let boxHitCount = 0;
      for (const obs of obstacles) {
        if (boxesOverlap(lBox, obs, 2)) {
          boxHitCount++;
        }
      }
      const centerBias = 1 - Math.abs(r - 0.5) * 0.4;
      const score =
        len * centerBias +
        (isInteriorSeg ? 35 : 0) -
        (ptHits ? 2000 : 0) -
        boxHitCount * 900;
      if (score > bestScore) {
        bestScore = score;
        bestMid = pt;
      }
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

function resolveAnchorBoxWithFallback(
  targetId: string,
  anchorRegistry: Record<string, BoundingBox>
): { resolvedId: string; box: BoundingBox | undefined } {
  if (anchorRegistry[targetId]) {
    return { resolvedId: targetId, box: anchorRegistry[targetId] };
  }
  const dotIdx = targetId.indexOf(".");
  if (dotIdx > 0) {
    const baseId = targetId.slice(0, dotIdx);
    const subId = targetId.slice(dotIdx + 1);
    // 1-indexed field_N fallback for 0-indexed bitfield sub-anchors (field_0 .. field_{N-1})
    const fieldMatch = subId.match(/^field_(\d+)$/);
    if (fieldMatch) {
      const oneBasedIdx = parseInt(fieldMatch[1], 10) - 1;
      const zeroBasedId = `${baseId}.field_${oneBasedIdx}`;
      if (oneBasedIdx >= 0 && anchorRegistry[zeroBasedId]) {
        return { resolvedId: zeroBasedId, box: anchorRegistry[zeroBasedId] };
      }
    }
    if (anchorRegistry[baseId]) {
      return { resolvedId: baseId, box: anchorRegistry[baseId] };
    }
  }
  return { resolvedId: targetId, box: undefined };
}

export function routeConnections(
  connections: ConnectionSpec[] | undefined,
  anchorRegistry: Record<string, BoundingBox>,
  theme: ResolvedThemeTokens,
  measurer: TextMeasurer,
  compact = false
): SceneEdge[] {
  if (!connections || connections.length === 0) return [];

  const { containerBoxes, containerHeaderObstacles } =
    collectContainerBoxes(anchorRegistry);

  // Pass 1: Resolve endpoints, containers, sides, and collect port groups for Port Multiplexing
  const prepared: PreparedEdgeItem[] = [];
  let compactSkipSideToggle = 0;

  connections.forEach((conn, idx) => {
    const id = conn.id || `edge_${idx + 1}`;
    const fromParsed = parseEndpoint(conn.from);
    const toParsed = parseEndpoint(conn.to);

    const fromResolved = resolveAnchorBoxWithFallback(
      fromParsed.targetId,
      anchorRegistry
    );
    const toResolved = resolveAnchorBoxWithFallback(
      toParsed.targetId,
      anchorRegistry
    );
    fromParsed.targetId = fromResolved.resolvedId;
    toParsed.targetId = toResolved.resolvedId;

    const fromBox = fromResolved.box;
    const toBox = toResolved.box;
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

    const isSideBlockedBySibling = (
      box: BoundingBox,
      ownerId: string,
      side: PortSide
    ): boolean => {
      if (side === "center") return false;
      const [nx, ny] = getNormalVector(side);
      const probePt: [number, number] = [
        box.x + box.width / 2 + nx * 22,
        box.y + box.height / 2 + ny * 22,
      ];
      if (side === "top") probePt[1] = box.y - 18;
      else if (side === "bottom") probePt[1] = box.y + box.height + 18;
      else if (side === "left") probePt[0] = box.x - 18;
      else if (side === "right") probePt[0] = box.x + box.width + 18;

      for (const [k, other] of Object.entries(anchorRegistry)) {
        if (other.ownerNodeId && other.ownerNodeId !== k) continue;
        if (k === ownerId) continue;
        if (boxContainsBox(other, box) || boxContainsBox(box, other)) continue;
        if (
          probePt[0] >= other.x - 4 &&
          probePt[0] <= other.x + other.width + 4 &&
          probePt[1] >= other.y - 4 &&
          probePt[1] <= other.y + other.height + 4
        ) {
          return true;
        }
      }
      return false;
    };

    const pickUnblockedSide = (
      preferred: PortSide,
      box: BoundingBox,
      ownerId: string,
      otherBox: BoundingBox
    ): PortSide => {
      if (!isSideBlockedBySibling(box, ownerId, preferred)) return preferred;
      const cx1 = box.x + box.width / 2;
      const cy1 = box.y + box.height / 2;
      const cx2 = otherBox.x + otherBox.width / 2;
      const cy2 = otherBox.y + otherBox.height / 2;
      const altCandidates: PortSide[] =
        preferred === "top" || preferred === "bottom"
          ? cx2 >= cx1
            ? ["right", "left"]
            : ["left", "right"]
          : cy2 >= cy1
          ? ["bottom", "top"]
          : ["top", "bottom"];
      for (const alt of altCandidates) {
        if (!isSideBlockedBySibling(box, ownerId, alt)) return alt;
      }
      return preferred;
    };

    // Intentional reflow behavior: in compact vertical mode, desktop horizontal ports (@right/@left)
    // would force awkward wrap-arounds after nodes are stacked vertically, so ports are automatically
    // re-selected to match the reflowed vertical geometry.
    let fromSide = compact
      ? pickUnblockedSide(
          autoSides.fromSide,
          ownerFromBox,
          fromOwnerId,
          ownerToBox
        )
      : fromParsed.side || autoSides.fromSide;
    let toSide = compact
      ? pickUnblockedSide(
          autoSides.toSide,
          ownerToBox,
          toOwnerId,
          ownerFromBox
        )
      : toParsed.side || autoSides.toSide;

    // In compact vertical mode, detect skip-level (leapfrog) vertical edges where another node sits directly
    // between ownerFromBox and ownerToBox. Convert them from 4-bend S-hooks into clean 2-bend outer C-brackets
    // (left->left or right->right), alternating sides for balanced visual symmetry.
    if (
      compact &&
      !isSelfLoop &&
      ((fromSide === "bottom" && toSide === "top") ||
        (fromSide === "top" && toSide === "bottom"))
    ) {
      const upperBox =
        ownerFromBox.y <= ownerToBox.y ? ownerFromBox : ownerToBox;
      const lowerBox =
        ownerFromBox.y <= ownerToBox.y ? ownerToBox : ownerFromBox;
      const bandTop = upperBox.y + upperBox.height + 2;
      const bandBot = lowerBox.y - 2;
      if (bandBot > bandTop + 16) {
        const cx1 = upperBox.x + upperBox.width / 2;
        const cx2 = lowerBox.x + lowerBox.width / 2;
        const xSpanMin = Math.min(cx1, cx2) - 24;
        const xSpanMax = Math.max(cx1, cx2) + 24;
        let hasIntermediateBlocker = false;
        for (const [k, other] of Object.entries(anchorRegistry)) {
          if (other.ownerNodeId && other.ownerNodeId !== k) continue;
          if (k === fromOwnerId || k === toOwnerId) continue;
          if (
            boxContainsBox(other, ownerFromBox) ||
            boxContainsBox(other, ownerToBox) ||
            boxContainsBox(ownerFromBox, other) ||
            boxContainsBox(ownerToBox, other)
          ) {
            continue;
          }
          if (
            other.y < bandBot &&
            other.y + other.height > bandTop &&
            other.x < xSpanMax &&
            other.x + other.width > xSpanMin
          ) {
            hasIntermediateBlocker = true;
            break;
          }
        }

        if (hasIntermediateBlocker) {
          // Prefer alternating left/right outer channels, respecting explicit sub-anchor side hint if available
          const preferredSkipSide: PortSide =
            compactSkipSideToggle % 2 === 0 ? "left" : "right";
          const altSkipSide: PortSide =
            preferredSkipSide === "left" ? "right" : "left";
          const chosenSide =
            !isSideBlockedBySibling(ownerFromBox, fromOwnerId, preferredSkipSide) &&
            !isSideBlockedBySibling(ownerToBox, toOwnerId, preferredSkipSide)
              ? preferredSkipSide
              : !isSideBlockedBySibling(ownerFromBox, fromOwnerId, altSkipSide) &&
                !isSideBlockedBySibling(ownerToBox, toOwnerId, altSkipSide)
              ? altSkipSide
              : null;
          if (chosenSide) {
            fromSide = chosenSide;
            toSide = chosenSide;
            compactSkipSideToggle++;
          }
        }
      }
    }

    // In compact mode, if fromSide had to detour horizontally (left/right) around a stacked sibling
    // and toSide is "top" directly under an enclosing container's title bar, match the horizontal side
    // so the edge forms a clean outside C-bracket instead of penetrating the target group's header.
    if (
      compact &&
      !isSelfLoop &&
      (fromSide === "left" || fromSide === "right") &&
      toSide === "top"
    ) {
      const targetUnderContainerHeader = containerBoxes.some(
        (c) =>
          boxContainsBox(c, ownerToBox) &&
          !boxContainsBox(c, ownerFromBox) &&
          ownerToBox.y >= c.y + 36
      );
      if (
        targetUnderContainerHeader &&
        !isSideBlockedBySibling(ownerToBox, toOwnerId, fromSide)
      ) {
        toSide = fromSide;
      }
    }

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
      corridorBundleIndex: 0,
      corridorBundleSize: 1,
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

  // Pass 1b-2: Same-Owner-Side De-crowding (when a whole-node port and a sub-anchor port share the same owner side)
  const ownerSideGroups = new Map<string, PortSlotEntry[]>();
  for (const item of prepared) {
    if (!item.fromParsed.explicitRatio && item.fromSide !== "center") {
      const oKey = `${item.fromOwnerId}::${item.fromSide}`;
      const isHoriz = item.fromSide === "left" || item.fromSide === "right";
      const otherCoord = isHoriz
        ? item.toBox.y + item.toBox.height / 2
        : item.toBox.x + item.toBox.width / 2;
      const list = ownerSideGroups.get(oKey) || [];
      list.push({ item, end: "from", sortCoord: otherCoord });
      ownerSideGroups.set(oKey, list);
    }
    if (!item.toParsed.explicitRatio && item.toSide !== "center") {
      const oKey = `${item.toOwnerId}::${item.toSide}`;
      const isHoriz = item.toSide === "left" || item.toSide === "right";
      const otherCoord = isHoriz
        ? item.fromBox.y + item.fromBox.height / 2
        : item.fromBox.x + item.fromBox.width / 2;
      const list = ownerSideGroups.get(oKey) || [];
      list.push({ item, end: "to", sortCoord: otherCoord });
      ownerSideGroups.set(oKey, list);
    }
  }

  ownerSideGroups.forEach((entries) => {
    if (entries.length <= 1) return;
    // Only de-crowd when whole-node ports and sub-anchor ports share the same owner side;
    // pure whole-node fan-out is already symmetrically multiplexed by Pass 1b.
    const hasSub = entries.some((e) =>
      e.end === "from" ? e.item.isFromSubAnchor : e.item.isToSubAnchor
    );
    const hasWhole = entries.some(
      (e) => !(e.end === "from" ? e.item.isFromSubAnchor : e.item.isToSubAnchor)
    );
    if (!hasSub || !hasWhole) return;
    const getCoord = (e: PortSlotEntry): number => {
      const side = e.end === "from" ? e.item.fromSide : e.item.toSide;
      const box = e.end === "from" ? e.item.fromBox : e.item.toBox;
      const ratio = e.end === "from" ? e.item.fromRatio : e.item.toRatio;
      const isHoriz = side === "left" || side === "right";
      return isHoriz ? box.y + box.height * ratio : box.x + box.width * ratio;
    };

    for (const e of entries) {
      const isSub =
        e.end === "from" ? e.item.isFromSubAnchor : e.item.isToSubAnchor;
      if (isSub) continue;
      const ownerBox =
        e.end === "from" ? e.item.outerFromBox : e.item.outerToBox;
      const side = e.end === "from" ? e.item.fromSide : e.item.toSide;
      const isHoriz = side === "left" || side === "right";
      const start = isHoriz ? ownerBox.y : ownerBox.x;
      const span = isHoriz ? ownerBox.height : ownerBox.width;
      if (span <= 40) continue;

      // Project desired coordinate toward target center, clamped to [0.18, 0.82]
      let targetRatio = Math.max(
        0.18,
        Math.min(0.82, (e.sortCoord - start) / span)
      );
      let candidateCoord = start + span * targetRatio;

      // Ensure at least 44px separation from all sibling sub-anchor ports on the same owner side
      for (const other of entries) {
        if (other === e) continue;
        const otherCoord = getCoord(other);
        if (Math.abs(candidateCoord - otherCoord) < 44) {
          const dir =
            e.sortCoord >= other.sortCoord
              ? 1
              : -1;
          const shifted = otherCoord + dir * 48;
          targetRatio = Math.max(
            0.15,
            Math.min(0.85, (shifted - start) / span)
          );
          candidateCoord = start + span * targetRatio;
        }
      }

      if (e.end === "from") {
        e.item.fromRatio = targetRatio;
        e.item.fromMultiplexed = true;
      } else {
        e.item.toRatio = targetRatio;
        e.item.toMultiplexed = true;
      }
    }
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
  corridorGroups.forEach((allItems, key) => {
    if (allItems.length <= 1) return;
    const isHorizCorridor = key.startsWith("H::");

    // Partition items in the same corridor into connected components whose perpendicular spans overlap,
    // so e.g. a left-branch edge doesn't get pushed off-center by 3 right-branch edges in the same vertical gap.
    const getPerpSpan = (it: PreparedEdgeItem): [number, number] => {
      if (isHorizCorridor) {
        const y1 = it.fromBox.y + it.fromBox.height * it.fromRatio;
        const y2 = it.toBox.y + it.toBox.height * it.toRatio;
        return [Math.min(y1, y2) - 18, Math.max(y1, y2) + 18];
      }
      const x1 = it.fromBox.x + it.fromBox.width * it.fromRatio;
      const x2 = it.toBox.x + it.toBox.width * it.toRatio;
      return [Math.min(x1, x2) - 24, Math.max(x1, x2) + 24];
    };

    const spans = allItems.map(getPerpSpan);
    const visitedComp = new Array<boolean>(allItems.length).fill(false);
    const components: PreparedEdgeItem[][] = [];

    for (let i = 0; i < allItems.length; i++) {
      if (visitedComp[i]) continue;
      const comp: PreparedEdgeItem[] = [];
      const stack = [i];
      visitedComp[i] = true;
      while (stack.length > 0) {
        const idx = stack.pop()!;
        comp.push(allItems[idx]);
        const [aMin, aMax] = spans[idx];
        for (let j = 0; j < allItems.length; j++) {
          if (visitedComp[j]) continue;
          const [bMin, bMax] = spans[j];
          if (Math.min(aMax, bMax) >= Math.max(aMin, bMin)) {
            visitedComp[j] = true;
            stack.push(j);
          }
        }
      }
      components.push(comp);
    }

    for (const items of components) {
      if (items.length <= 1) continue;
      let railStep = 16;

      if (isHorizCorridor) {
        // Planar PCB bus ordering: if edges generally go upward (toY < fromY), sort top-to-bottom
        // so the top edge bends first (leftmost rail) and bottom edge bends last (rightmost rail), minimizing crossings.
        let sumDy = 0;
        for (const it of items) {
          const fy = it.fromBox.y + it.fromBox.height * it.fromRatio;
          const ty = it.toBox.y + it.toBox.height * it.toRatio;
          sumDy += ty - fy;
        }
        const goingUp = sumDy <= 0;
        items.sort((a, b) => {
          const ay = a.fromBox.y + a.fromBox.height * a.fromRatio;
          const by = b.fromBox.y + b.fromBox.height * b.fromRatio;
          return goingUp ? ay - by : by - ay;
        });
      } else {
        let sumDx = 0;
        for (const it of items) {
          const fx = it.fromBox.x + it.fromBox.width * it.fromRatio;
          const tx = it.toBox.x + it.toBox.width * it.toRatio;
          sumDx += tx - fx;
        }
        const goingLeft = sumDx <= 0;
        items.sort((a, b) => {
          const ax = a.fromBox.x + a.fromBox.width * a.fromRatio;
          const bx = b.fromBox.x + b.fromBox.width * b.fromRatio;
          return goingLeft ? ax - bx : bx - ax;
        });

        // In vertical corridors with multiple labeled horizontal rails, spread rails generously (up to 28px pitch)
        // so 22px-tall labels have breathing room and stay centered directly on their horizontal rail.
        const vBounds = items[0].corridor.vert;
        if (vBounds) {
          const avail = vBounds[1] - vBounds[0] - 38;
          if (avail > 0) {
            railStep = Math.max(
              16,
              Math.min(28, Math.floor(avail / (items.length - 1)))
            );
          }
        }
      }

      items.forEach((it, i) => {
        it.corridorOffset = (i - (items.length - 1) / 2) * railStep;
        it.corridorBundleIndex = i;
        it.corridorBundleSize = items.length;
      });
    }
  });

  // Pass 2: Route paths and place labels
  const edges: SceneEdge[] = [];
  const routedSegments: RoutedSegment[] = [];
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
      corridorBundleIndex,
      corridorBundleSize,
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
    const cornerRadius = Math.max(0, coerceFiniteNumber(conn.cornerRadius) ?? 8);
    const stub = Math.max(0, coerceFiniteNumber(conn.stub) ?? 20);
    const startMarker =
      conn.startMarker && VALID_MARKER_TYPES.has(conn.startMarker)
        ? conn.startMarker
        : "none";
    const endMarker =
      conn.endMarker && VALID_MARKER_TYPES.has(conn.endMarker)
        ? conn.endMarker
        : "arrow";
    const hasStartArrow = startMarker === "arrow";
    const hasEndArrow = endMarker === "arrow";
    // Unified arrow pullback standard: 7.0px marker tip extension (9.5 - 2.5) + 0.7px target border half-stroke (1.5px / 2)
    // so the arrowhead tip kisses the outer edge of the target border without overlapping across the border stroke.
    const ARROW_PULLBACK = 7.7;

    const pullbackPolyline = (
      pts: [number, number][]
    ): [number, number][] => {
      if (pts.length < 2 || (!hasStartArrow && !hasEndArrow)) return pts;
      const copy = pts.map((pt) => [pt[0], pt[1]] as [number, number]);
      if (hasStartArrow) {
        const dx = copy[1][0] - copy[0][0];
        const dy = copy[1][1] - copy[0][1];
        const len = Math.hypot(dx, dy);
        if (len > 4) {
          const pull = Math.min(ARROW_PULLBACK, len * 0.45);
          copy[0][0] += (dx / len) * pull;
          copy[0][1] += (dy / len) * pull;
        }
      }
      if (hasEndArrow) {
        const lastIdx = copy.length - 1;
        const dx = copy[lastIdx][0] - copy[lastIdx - 1][0];
        const dy = copy[lastIdx][1] - copy[lastIdx - 1][1];
        const len = Math.hypot(dx, dy);
        if (len > 4) {
          const pull = Math.min(ARROW_PULLBACK, len * 0.45);
          copy[lastIdx][0] -= (dx / len) * pull;
          copy[lastIdx][1] -= (dy / len) * pull;
        }
      }
      return copy;
    };

    const { paddedObstacles, rawObstacles } = buildEdgeObstacles(
      fromOwnerId,
      toOwnerId,
      ownerFromBox,
      ownerToBox,
      anchorRegistry,
      fromSide,
      toSide
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
      pathD = buildRoundedPolylinePath(pullbackPolyline(points), cornerRadius);
    } else if (routing === "straight") {
      const renderPts = pullbackPolyline([p1, p2]);
      pathD = `M ${renderPts[0][0].toFixed(1)} ${renderPts[0][1].toFixed(1)} L ${renderPts[1][0].toFixed(1)} ${renderPts[1][1].toFixed(1)}`;
    } else if (routing === "curved") {
      if (
        (Math.abs(p1[0] - p2[0]) <= 1 || Math.abs(p1[1] - p2[1]) <= 1) &&
        !polylineHitsObstacles([p1, p2], paddedObstacles)
      ) {
        const renderPts = pullbackPolyline([p1, p2]);
        pathD = `M ${renderPts[0][0].toFixed(1)} ${renderPts[0][1].toFixed(1)} L ${renderPts[1][0].toFixed(1)} ${renderPts[1][1].toFixed(1)}`;
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
          coerceFiniteNumber(conn.curveOffset) ??
          Math.max(28, Math.min(120, primarySpan * 0.45));
        const c1: [number, number] = [
          p1[0] + n1x * controlLen,
          p1[1] + n1y * controlLen,
        ];
        const c2: [number, number] = [
          p2[0] + n2x * controlLen,
          p2[1] + n2y * controlLen,
        ];
        const renderP1: [number, number] = hasStartArrow
          ? [p1[0] + n1x * ARROW_PULLBACK, p1[1] + n1y * ARROW_PULLBACK]
          : p1;
        const renderP2: [number, number] = hasEndArrow
          ? [p2[0] + n2x * ARROW_PULLBACK, p2[1] + n2y * ARROW_PULLBACK]
          : p2;
        bezierControls = [c1, c2];
        pathD = `M ${renderP1[0].toFixed(1)} ${renderP1[1].toFixed(1)} C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${renderP2[0].toFixed(1)} ${renderP2[1].toFixed(1)}`;
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

      if (
        polylineHitsObstacles(points, paddedObstacles) ||
        polylineHasTrackOrBorderCollision(points, routedSegments, containerBoxes)
      ) {
        const detour = findObstacleFreeOrthogonalPath(
          p1,
          fromSide,
          p2,
          toSide,
          rawObstacles,
          paddedObstacles,
          stub,
          routedSegments,
          containerBoxes
        );
        if (detour && detour.length >= 2) {
          points = detour;
          usedObstacleDetour = true;
        }
      }

      pathD = buildRoundedPolylinePath(pullbackPolyline(points), cornerRadius);
    }

    const tone = normalizeTone(conn.tone, "neutral");
    const stroke =
      tone === "neutral"
        ? theme.colors.textMuted
        : getTonePalette(theme, tone).main;

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
        anchorPt = findLongestClearSegmentMidpoint(
          points,
          paddedObstacles,
          labelW,
          labelH
        );
      } else if (usedObstacleDetour && !hasExplicitPos) {
        anchorPt = findLongestClearSegmentMidpoint(
          points,
          rawObstacles,
          labelW,
          labelH
        );
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
        const isHorizZBend =
          (fromSide === "left" || fromSide === "right") &&
          (toSide === "left" || toSide === "right");
        if (isHorizZBend && corridorBundleSize >= 2) {
          // Stagger labels onto unobstructed horizontal arms for outer edges of a parallel Z-bend bundle
          const seg0Len = Math.hypot(
            points[1][0] - points[0][0],
            points[1][1] - points[0][1]
          );
          const seg2Len = Math.hypot(
            points[3][0] - points[2][0],
            points[3][1] - points[2][1]
          );
          const minArmLen = Math.min(labelW * 0.65, 68);
          if (corridorBundleIndex === 0 && seg2Len >= minArmLen) {
            // Leftmost rail -> longest target-side horizontal arm
            anchorPt = [
              (points[2][0] + points[3][0]) / 2,
              (points[2][1] + points[3][1]) / 2,
            ];
          } else if (
            corridorBundleIndex === corridorBundleSize - 1 &&
            seg0Len >= minArmLen
          ) {
            // Rightmost rail -> longest source-side horizontal arm
            anchorPt = [
              (points[0][0] + points[1][0]) / 2,
              (points[0][1] + points[1][1]) / 2,
            ];
          } else {
            anchorPt = [
              (points[1][0] + points[2][0]) / 2,
              (points[1][1] + points[2][1]) / 2,
            ];
          }
        } else {
          anchorPt = [
            (points[1][0] + points[2][0]) / 2,
            (points[1][1] + points[2][1]) / 2,
          ];
        }
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
        // Only clamp along the axis parallel to the segment carrying the label so the label
        // stays strictly centered ON its own line (never detached vertically off a horizontal rail).
        const is4PtHorizMiddleRail =
          points.length === 4 && Math.abs(points[1][1] - points[2][1]) <= 0.5;
        const is4PtVertMiddleRail =
          points.length === 4 && Math.abs(points[1][0] - points[2][0]) <= 0.5;

        if (
          corridor.horiz &&
          !is4PtVertMiddleRail &&
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
          !is4PtHorizMiddleRail &&
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

      const labelObstacles: BoundingBox[] = [
        ...rawObstacles,
        ...containerHeaderObstacles,
      ];

      const countBoxHits = (
        box: BoundingBox,
        list: BoundingBox[],
        pad = 2
      ): number => {
        let hits = 0;
        for (const obs of list) {
          if (boxesOverlap(box, obs, pad)) hits++;
        }
        return hits;
      };

      const countOtherEdgeSegHits = (box: BoundingBox): number => {
        let hits = 0;
        for (const seg of routedSegments) {
          if (seg.axis === "h") {
            if (
              seg.coord >= box.y - 2 &&
              seg.coord <= box.y + box.height + 2 &&
              seg.max >= box.x - 2 &&
              seg.min <= box.x + box.width + 2
            ) {
              hits++;
            }
          } else {
            if (
              seg.coord >= box.x - 2 &&
              seg.coord <= box.x + box.width + 2 &&
              seg.max >= box.y - 2 &&
              seg.min <= box.y + box.height + 2
            ) {
              hits++;
            }
          }
        }
        return hits;
      };

      // Strict On-Polyline Label Placement:
      // If the initial label position hits any node, container header, previously placed label,
      // or another edge's path segment/corner, slide strictly along THIS edge's polyline so the label
      // NEVER floats off its own line and avoids visually merging over a neighboring edge.
      const prevRoutedCount = routedSegments.length;
      const isStaggeredBundle = corridorBundleSize >= 2 && points.length === 4;
      const otherSegHitsInit = isStaggeredBundle
        ? 0
        : countOtherEdgeSegHits(candidateBox);
      if (
        !conn.labelOffset &&
        (countBoxHits(candidateBox, labelObstacles, 1) > 0 ||
          countBoxHits(candidateBox, placedLabelBoxes, 4) > 0 ||
          otherSegHitsInit > 0)
      ) {
        const prefX = candidateBox.x + labelW / 2;
        const prefY = candidateBox.y + labelH / 2;
        const sampleRatios = [
          0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.18, 0.82, 0.12, 0.88,
        ];
        const endA = points[0];
        const endB = points[points.length - 1];

        let bestBox: { x: number; y: number } | null = null;
        let bestScore = -Infinity;

        for (let i = 0; i < points.length - 1; i++) {
          const a = points[i];
          const b = points[i + 1];
          const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (segLen < 12) continue;
          const isHorizSeg = Math.abs(a[1] - b[1]) <= 0.5;
          const isVertSeg = Math.abs(a[0] - b[0]) <= 0.5;
          const isSteepSeg =
            isVertSeg || Math.abs(b[1] - a[1]) >= Math.abs(b[0] - a[0]) * 0.7;
          const isInteriorSeg =
            points.length >= 4 && i > 0 && i < points.length - 2;

          for (const r of sampleRatios) {
            const pt: [number, number] = [
              a[0] + (b[0] - a[0]) * r,
              a[1] + (b[1] - a[1]) * r,
            ];
            // Always keep the edge segment passing inside the label pill (center first, or slight lateral shift on steep/vertical segments)
            const xOffsets =
              isSteepSeg && labelW > 48
                ? [0, -Math.min(labelW * 0.32, 36), Math.min(labelW * 0.32, 36)]
                : [0];

            for (const xOff of xOffsets) {
              const testBox: BoundingBox = {
                x: pt[0] - labelW / 2 + xOff,
                y: pt[1] - labelH / 2,
                width: labelW,
                height: labelH,
              };
              const obsHits = countBoxHits(testBox, labelObstacles, 1);
              const lblHits = countBoxHits(testBox, placedLabelBoxes, 4);
              const otherHits =
                prevRoutedCount > 0 ? countOtherEdgeSegHits(testBox) : 0;
              const nearEnd =
                Math.hypot(pt[0] - endA[0], pt[1] - endA[1]) < 18 ||
                Math.hypot(pt[0] - endB[0], pt[1] - endB[1]) < 18;
              const distToPref = Math.hypot(
                testBox.x + labelW / 2 - prefX,
                testBox.y + labelH / 2 - prefY
              );

              const score =
                Math.min(segLen, 160) * 0.45 +
                (isInteriorSeg ? 25 : 0) +
                (isHorizSeg && segLen >= labelW * 0.65 ? 20 : 0) -
                (xOff !== 0 ? 18 : 0) -
                obsHits * 3000 -
                lblHits * 2500 -
                otherHits * 900 -
                (nearEnd ? 350 : 0) -
                distToPref * 0.08;

              if (score > bestScore) {
                bestScore = score;
                bestBox = { x: testBox.x, y: testBox.y };
              }
            }
          }
        }

        if (bestBox) {
          candidateBox.x = bestBox.x;
          candidateBox.y = bestBox.y;
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
      startMarker,
      endMarker,
      animation: {
        type: animType,
        durationSec,
      },
    });

    // Reserve orthogonal tracks of this routed edge AFTER label placement so labels only avoid OTHER edges
    routedSegments.push(...extractOrthogonalSegments(points));
  }

  return edges;
}
