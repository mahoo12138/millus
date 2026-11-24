/**
 * Reactive SVG Renderer for SceneGraph
 * Supports Clean, Sketch & Blueprint presets, Syntax-Highlighted Code Blocks,
 * Sub-Anchor Focus Highlighting, Animated Data Flows, scoped <defs> IDs, and strict attribute escaping.
 */

import {
  coerceFiniteNumber,
  sanitizeSvgPathD,
  SEMANTIC_TONES,
  type BoundingBox,
  type PrimitiveDecoration,
  type SceneEdge,
  type SceneGraph,
  type SceneNode,
} from "../schema/spec.ts";
import { getTonePalette, normalizeTone } from "./theme-observer.ts";
import {
  generateRoughEdgeCompanionPath,
  generateRoughEllipseStrokePath,
  generateRoughLinePath,
  generateRoughPolygonStrokePath,
  generateRoughRectStrokePath,
} from "./rough-adapter.ts";

export interface RenderSvgOptions {
  /** Unique prefix for SVG <defs> IDs (markers, patterns, filters, clipPaths) to avoid multi-SVG collisions */
  idPrefix?: string;
  /** Embed CSS custom property defaults (light + dark media query & theme attribute rules) for SSR zero-flash */
  includeCssVarDefaults?: boolean;
}

function escapeXml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(val: unknown): string {
  return escapeXml(val);
}

function safeNum(val: unknown, fallback = 0): number {
  const n = coerceFiniteNumber(val);
  return n !== undefined ? n : fallback;
}

function sanitizeIdToken(raw: string): string {
  return raw.replace(/[^A-Za-z0-9_-]/g, "_");
}

const SAFE_COLOR_PATTERN = /^[A-Za-z0-9#(),.%\s_\-/]+$/;

function sanitizeColor(val: unknown, fallback = "none"): string {
  if (typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (!trimmed) return fallback;
  if (/url\s*\(/i.test(trimmed) || !SAFE_COLOR_PATTERN.test(trimmed)) {
    return fallback;
  }
  return escapeAttr(trimmed);
}

const SAFE_DASHARRAY_PATTERN = /^(?:none|[0-9.,\s%]+)$/;

function sanitizeDasharray(val: unknown): string {
  if (typeof val !== "string") return "";
  const trimmed = val.trim();
  if (!trimmed || !SAFE_DASHARRAY_PATTERN.test(trimmed)) return "";
  return escapeAttr(trimmed);
}

function sanitizeMarkerRef(val: unknown): string {
  if (typeof val !== "string") return "";
  const trimmed = val.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return "";
  return trimmed;
}

function computeSceneIdPrefix(scene: SceneGraph): string {
  let h = 2166136261 >>> 0;
  const feed = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  };
  feed(scene.title || "");
  feed("|");
  feed(scene.preset);
  feed("|");
  feed(scene.theme.mode);
  feed("|");
  feed(scene.background);
  feed("|");
  feed(`${scene.width}x${scene.height}`);
  feed("|");
  feed(scene.theme.colors.bg);
  feed("|");
  feed(scene.theme.colors.tones.primary?.main || "");
  for (const n of scene.nodes) {
    feed(`|n:${n.id}:${n.type}:${Math.round(n.x)},${Math.round(n.y)}`);
  }
  for (const e of scene.edges) {
    feed(`|e:${e.id}:${e.from}->${e.to}`);
  }
  return `ill-${(h >>> 0).toString(36)}`;
}

const ICON_PATHS: Record<string, string> = {
  cpu: `<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>`,
  layers: `<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`,
  database: `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>`,
  cloud: `<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>`,
  lock: `<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
  sparkles: `<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>`,
  terminal: `<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>`,
  code: `<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>`,
  server: `<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>`,
  globe: `<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,
  zap: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
  check: `<polyline points="20 6 9 17 4 12"/>`,
  git: `<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/>`,
  key: `<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>`,
  box: `<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>`,
  activity: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
  "hard-drive": `<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>`,
  wifi: `<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>`,
  sliders: `<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>`,
  send: `<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>`,
};

function renderIconSvg(
  name: string,
  x: number,
  y: number,
  size: number,
  strokeColor: string
): string {
  const key = String(name || "cpu").toLowerCase();
  const inner = Object.prototype.hasOwnProperty.call(ICON_PATHS, key)
    ? ICON_PATHS[key]
    : ICON_PATHS.cpu;
  const sx = safeNum(x);
  const sy = safeNum(y);
  const scale = safeNum(size, 16) / 24;
  return `<g transform="translate(${sx.toFixed(1)}, ${sy.toFixed(1)}) scale(${scale.toFixed(3)})" fill="none" stroke="${sanitizeColor(strokeColor, "currentColor")}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
}

function renderDecoration(
  dec: PrimitiveDecoration,
  rough: boolean,
  nodeId: string,
  idx: number,
  roughness: number,
  prefix: string
): string {
  switch (dec.kind) {
    case "rect":
      return `<rect x="${safeNum(dec.x)}" y="${safeNum(dec.y)}" width="${safeNum(dec.width)}" height="${safeNum(dec.height)}" rx="${safeNum(dec.rx)}" fill="${sanitizeColor(dec.fill, "none")}" stroke="${sanitizeColor(dec.stroke, "none")}" stroke-width="${safeNum(dec.strokeWidth)}" />`;

    case "code-line":
    case "table-cell":
      return `<rect class="ai-ill-subanchor" data-anchor-id="${escapeAttr(dec.anchorId || "")}" x="${safeNum(dec.x)}" y="${safeNum(dec.y)}" width="${safeNum(dec.width)}" height="${safeNum(dec.height)}" rx="${safeNum(dec.rx, dec.kind === "code-line" ? 3 : 0)}" fill="${sanitizeColor(dec.fill, "transparent")}" />`;

    case "circle":
      return `<circle cx="${safeNum(dec.x)}" cy="${safeNum(dec.y)}" r="${safeNum(dec.r, 4)}" fill="${sanitizeColor(dec.fill, "none")}" stroke="${sanitizeColor(dec.stroke, "none")}" />`;

    case "line": {
      const dash = sanitizeDasharray(dec.strokeDasharray);
      const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
      const safeMarker = sanitizeMarkerRef(dec.markerEnd);
      const markerEndAttr = safeMarker
        ? ` marker-end="url(#${prefix}-marker-${safeMarker})"`
        : "";
      const x1 = safeNum(dec.x);
      const y1 = safeNum(dec.y);
      const x2 = safeNum(dec.x2, x1);
      const y2 = safeNum(dec.y2, y1);
      if (rough && !dash && !safeMarker) {
        const d = sanitizeSvgPathD(
          generateRoughLinePath(x1, y1, x2, y2, `${nodeId}_line_${idx}`, roughness * 0.65)
        );
        return `<path d="${escapeAttr(d)}" fill="none" stroke="${sanitizeColor(dec.stroke, "currentColor")}" stroke-width="${safeNum(dec.strokeWidth, 1)}" />`;
      }
      const linecapAttr = safeMarker ? ` stroke-linecap="round"` : "";
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${sanitizeColor(dec.stroke, "currentColor")}" stroke-width="${safeNum(dec.strokeWidth, 1)}"${linecapAttr}${dashAttr}${markerEndAttr} />`;
    }

    case "path": {
      const dash = sanitizeDasharray(dec.strokeDasharray);
      const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
      const safeMarker = sanitizeMarkerRef(dec.markerEnd);
      const markerEndAttr = safeMarker
        ? ` marker-end="url(#${prefix}-marker-${safeMarker})"`
        : "";
      const safeD = sanitizeSvgPathD(dec.d);
      if (!safeD) return "";
      return `<path d="${escapeAttr(safeD)}" fill="${sanitizeColor(dec.fill, "none")}" stroke="${sanitizeColor(dec.stroke, "currentColor")}" stroke-width="${safeNum(dec.strokeWidth, 1.5)}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}${markerEndAttr} />`;
    }

    case "icon":
      return renderIconSvg(
        dec.iconName || "cpu",
        safeNum(dec.x),
        safeNum(dec.y),
        safeNum(dec.width, 16),
        dec.stroke || "currentColor"
      );

    case "text": {
      const textAnchor =
        dec.textAnchor === "middle" || dec.textAnchor === "end"
          ? dec.textAnchor
          : "start";
      const fontWeight = escapeAttr(dec.fontWeight ?? 400);
      const fontSize = safeNum(dec.fontSize, 12);
      const fontFamily = escapeAttr(dec.fontFamily || "sans-serif");
      const textColor = sanitizeColor(dec.textColor, "currentColor");

      if (dec.tokens && dec.tokens.length > 0) {
        const tspans = dec.tokens
          .map((tok) => {
            const fillAttr = tok.color
              ? ` fill="${sanitizeColor(tok.color, "currentColor")}"`
              : "";
            const weightAttr = tok.fontWeight
              ? ` font-weight="${escapeAttr(tok.fontWeight)}"`
              : "";
            return `<tspan${fillAttr}${weightAttr}>${escapeXml(tok.text)}</tspan>`;
          })
          .join("");
        return `<text xml:space="preserve" x="${safeNum(dec.x)}" y="${safeNum(dec.y)}" fill="${textColor}" font-family="${fontFamily}" font-size="${fontSize}px" font-weight="${fontWeight}" text-anchor="${textAnchor}">${tspans}</text>`;
      }
      return `<text x="${safeNum(dec.x)}" y="${safeNum(dec.y)}" fill="${textColor}" font-family="${fontFamily}" font-size="${fontSize}px" font-weight="${fontWeight}" text-anchor="${textAnchor}">${escapeXml(dec.text || "")}</text>`;
    }

    default:
      return "";
  }
}

function renderNodeShape(
  node: SceneNode,
  roughness: number,
  prefix: string
): string {
  const { style, shape } = node;
  const w = safeNum(node.width);
  const h = safeNum(node.height);
  if (shape === "none" || style.variant === "ghost") return "";

  const fill = sanitizeColor(style.fill, "none");
  const stroke = sanitizeColor(style.stroke, "none");
  const strokeWidth = safeNum(style.strokeWidth, 1.5);
  const radius = Math.max(0, safeNum(style.radius, 0));
  const dash = sanitizeDasharray(style.strokeDasharray);
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
  const filterAttr =
    style.elevation === "md"
      ? ` filter="url(#${prefix}-shadow-md)"`
      : style.elevation === "sm"
      ? ` filter="url(#${prefix}-shadow-sm)"`
      : "";

  if (shape === "cylinder") {
    const ry = Math.min(13, Math.max(8, Math.round(h * 0.16)));
    const bodyD = `M 0 ${ry} A ${w / 2} ${ry} 0 0 1 ${w} ${ry} L ${w} ${h - ry} A ${w / 2} ${ry} 0 0 1 0 ${h - ry} Z`;
    const topCapD = `M 0 ${ry} A ${w / 2} ${ry} 0 0 0 ${w} ${ry}`;
    const ring2D =
      h >= 68
        ? `<path d="M 0 ${ry + 8} A ${w / 2} ${ry} 0 0 0 ${w} ${ry + 8}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth * 0.75}" opacity="0.55" />`
        : "";
    if (style.rough) {
      const topRough = generateRoughEllipseStrokePath(
        w / 2,
        ry,
        w / 2 - 1,
        ry - 1,
        `${node.id}_cyl_top`,
        roughness * 0.85
      );
      const leftRough = generateRoughLinePath(
        1,
        ry,
        1,
        h - ry,
        `${node.id}_cyl_l`,
        roughness * 0.85
      );
      const rightRough = generateRoughLinePath(
        w - 1,
        ry,
        w - 1,
        h - ry,
        `${node.id}_cyl_r`,
        roughness * 0.85
      );
      return `<path d="${bodyD}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}${filterAttr} /><path d="${escapeAttr(`${topRough} ${leftRough} ${rightRough}`)}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth * 0.9}" />${ring2D}`;
    }
    return `<path d="${bodyD}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}${filterAttr} /><path d="${topCapD}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" />${ring2D}`;
  }

  if (shape === "queue") {
    const rx = Math.min(13, Math.max(8, Math.round(w * 0.1)));
    const bodyD = `M ${rx} 0 L ${w - rx} 0 A ${rx} ${h / 2} 0 0 1 ${w - rx} ${h} L ${rx} ${h} A ${rx} ${h / 2} 0 0 1 ${rx} 0 Z`;
    const rightCapD = `M ${w - rx} 0 A ${rx} ${h / 2} 0 0 0 ${w - rx} ${h}`;
    return `<path d="${bodyD}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}${filterAttr} /><path d="${rightCapD}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
  }

  if (style.rough) {
    if (shape === "circle" || shape === "ellipse") {
      const d = generateRoughEllipseStrokePath(
        w / 2,
        h / 2,
        w / 2 - 2,
        h / 2 - 2,
        node.id,
        roughness
      );
      return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 2}" ry="${h / 2 - 2}" fill="${fill}" stroke="none"${filterAttr} /><path d="${escapeAttr(d)}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr} />`;
    }

    if (shape === "diamond") {
      const pts: [number, number][] = [
        [w / 2, 0],
        [w, h / 2],
        [w / 2, h],
        [0, h / 2],
      ];
      const polyStr = pts.map((p) => `${p[0]},${p[1]}`).join(" ");
      const d = generateRoughPolygonStrokePath(pts, node.id, roughness);
      return `<polygon points="${polyStr}" fill="${fill}" stroke="none"${filterAttr} /><path d="${escapeAttr(d)}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr} />`;
    }

    if (shape === "polygon" && node.polygonPoints && node.polygonPoints.length > 0) {
      const safePts: [number, number][] = node.polygonPoints.map((p) => [
        safeNum(p[0]),
        safeNum(p[1]),
      ]);
      const polyStr = safePts.map((p) => `${p[0]},${p[1]}`).join(" ");
      const d = generateRoughPolygonStrokePath(safePts, node.id, roughness);
      return `<polygon points="${polyStr}" fill="${fill}" stroke="none"${filterAttr} /><path d="${escapeAttr(d)}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr} />`;
    }

    // Default rough rect
    const d = generateRoughRectStrokePath(0, 0, w, h, node.id, roughness);
    return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${Math.min(radius, 6)}" fill="${fill}" stroke="none"${filterAttr} /><path d="${escapeAttr(d)}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr} />`;
  }

  // Clean vector shapes
  if (shape === "circle" || shape === "ellipse") {
    return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}${filterAttr} />`;
  }

  if (shape === "diamond") {
    const pts = `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`;
    return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"${dashAttr}${filterAttr} />`;
  }

  if (shape === "polygon" && node.polygonPoints && node.polygonPoints.length > 0) {
    const pts = node.polygonPoints
      .map((p) => `${safeNum(p[0])},${safeNum(p[1])}`)
      .join(" ");
    return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"${dashAttr}${filterAttr} />`;
  }

  if (shape === "path" && node.pathD) {
    const safeD = sanitizeSvgPathD(node.pathD);
    if (!safeD) return "";
    return `<path d="${escapeAttr(safeD)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}${filterAttr} />`;
  }

  return `<rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}${filterAttr} />`;
}

function renderCalloutConnector(
  node: SceneNode,
  anchorRegistry: Record<string, BoundingBox>
): string {
  if (!node.calloutTail) return "";
  const targetBox = anchorRegistry[node.calloutTail.targetId];
  if (!targetBox) return "";
  const ownerBox =
    targetBox.ownerNodeId && anchorRegistry[targetBox.ownerNodeId]
      ? anchorRegistry[targetBox.ownerNodeId]
      : targetBox;
  const side = node.calloutTail.side;
  const stroke = sanitizeColor(node.style.stroke, "currentColor");

  // When a top/bottom callout targets an interior sub-anchor (e.g. mdx_source.line_2),
  // route around the left edge of ownerBox so the leader line never strikes through header/code text.
  if (
    (side === "top" && targetBox.y > ownerBox.y + 4) ||
    (side === "bottom" &&
      targetBox.y + targetBox.height < ownerBox.y + ownerBox.height - 4)
  ) {
    const startY = side === "top" ? node.y + node.height : node.y;
    const r = safeNum(node.style.radius, 8) || 8;
    const minFlatBottomX = node.x + r + 4;
    const maxFlatBottomX = node.x + node.width - r - 4;
    const gutterX = Math.max(8, ownerBox.x - 12);
    const endX = ownerBox.x;
    const endY = targetBox.y + targetBox.height / 2;
    const cornerR = 4;
    const vDir = endY >= startY ? 1 : -1;

    let d: string;
    if (gutterX >= minFlatBottomX && gutterX <= maxFlatBottomX) {
      d = `M ${gutterX.toFixed(1)} ${startY.toFixed(1)} L ${gutterX.toFixed(1)} ${(endY - vDir * cornerR).toFixed(1)} Q ${gutterX.toFixed(1)} ${endY.toFixed(1)} ${(gutterX + cornerR).toFixed(1)} ${endY.toFixed(1)} L ${endX.toFixed(1)} ${endY.toFixed(1)}`;
    } else {
      const attachY = node.y + node.height / 2;
      const effGutterX = Math.max(8, Math.min(node.x, ownerBox.x) - 12);
      const vDir2 = endY >= attachY ? 1 : -1;
      d = `M ${node.x.toFixed(1)} ${attachY.toFixed(1)} L ${(effGutterX + cornerR).toFixed(1)} ${attachY.toFixed(1)} Q ${effGutterX.toFixed(1)} ${attachY.toFixed(1)} ${effGutterX.toFixed(1)} ${(attachY + vDir2 * cornerR).toFixed(1)} L ${effGutterX.toFixed(1)} ${(endY - vDir2 * cornerR).toFixed(1)} Q ${effGutterX.toFixed(1)} ${endY.toFixed(1)} ${(effGutterX + cornerR).toFixed(1)} ${endY.toFixed(1)} L ${endX.toFixed(1)} ${endY.toFixed(1)}`;
    }
    return `<g class="ai-ill-callout-link" data-node-id="${escapeAttr(node.id)}">
    <path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="3 3" stroke-linejoin="round" />
    <circle cx="${endX.toFixed(1)}" cy="${endY.toFixed(1)}" r="3.5" fill="${stroke}" />
  </g>`;
  }

  const startX =
    side === "left"
      ? node.x + node.width
      : side === "right"
      ? node.x
      : node.x + node.width / 2;
  const startY =
    side === "top"
      ? node.y + node.height
      : side === "bottom"
      ? node.y
      : node.y + node.height / 2;

  const endX =
    side === "left"
      ? targetBox.x
      : side === "right"
      ? targetBox.x + targetBox.width
      : targetBox.x + targetBox.width / 2;
  const endY =
    side === "top"
      ? targetBox.y
      : side === "bottom"
      ? targetBox.y + targetBox.height
      : targetBox.y + targetBox.height / 2;

  return `<g class="ai-ill-callout-link" data-node-id="${escapeAttr(node.id)}">
    <line x1="${startX.toFixed(1)}" y1="${startY.toFixed(1)}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="3 3" />
    <circle cx="${endX.toFixed(1)}" cy="${endY.toFixed(1)}" r="3.5" fill="${stroke}" />
  </g>`;
}

function renderSceneNodeTree(
  node: SceneNode,
  roughness: number,
  anchorRegistry: Record<string, BoundingBox>,
  prefix: string
): string {
  const decsSvg = node.decorations
    .map((dec, idx) =>
      renderDecoration(dec, node.style.rough, node.id, idx, roughness, prefix)
    )
    .join("");

  // Note: child.x and child.y are already converted to world coordinates in LayoutSolver
  const childrenSvg = node.children
    .map((child) =>
      renderSceneNodeTree(child, roughness, anchorRegistry, prefix)
    )
    .join("");

  const calloutLink = renderCalloutConnector(node, anchorRegistry);

  const { style, shape } = node;
  const w = safeNum(node.width);
  const h = safeNum(node.height);
  const nx = safeNum(node.x);
  const ny = safeNum(node.y);
  const opacity = Math.max(0, Math.min(1, safeNum(style.opacity, 1)));
  const radius = Math.max(0, safeNum(style.radius, 0));

  if (
    shape === "rect" &&
    style.variant !== "ghost" &&
    node.decorations.length > 0 &&
    radius > 0
  ) {
    const clipId = `${prefix}-clip-${sanitizeIdToken(node.id)}`;
    const r = style.rough ? Math.min(radius, 6) : radius;
    const fill = sanitizeColor(style.fill, "none");
    const stroke = sanitizeColor(style.stroke, "none");
    const strokeWidth = safeNum(style.strokeWidth, 1.5);
    const dash = sanitizeDasharray(style.strokeDasharray);
    const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
    const filterAttr =
      style.elevation === "md"
        ? ` filter="url(#${prefix}-shadow-md)"`
        : style.elevation === "sm"
        ? ` filter="url(#${prefix}-shadow-sm)"`
        : "";

    const bgSvg = style.rough
      ? `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${r}" fill="${fill}" stroke="none"${filterAttr} />`
      : `<rect x="0" y="0" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="none"${filterAttr} />`;

    const borderSvg = style.rough
      ? `<path d="${escapeAttr(generateRoughRectStrokePath(0, 0, w, h, node.id, roughness))}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr} />`
      : `<rect x="0" y="0" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr} />`;

    return `${calloutLink}<g class="ai-ill-node" data-node-id="${escapeAttr(node.id)}" data-node-type="${escapeAttr(node.type)}" transform="translate(${nx.toFixed(1)}, ${ny.toFixed(1)})" opacity="${opacity}">
    <clipPath id="${clipId}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" /></clipPath>
    ${bgSvg}
    <g clip-path="url(#${clipId})">${decsSvg}</g>
    ${borderSvg}
  </g>${childrenSvg}`;
  }

  const shapeSvg = renderNodeShape(node, roughness, prefix);

  return `${calloutLink}<g class="ai-ill-node" data-node-id="${escapeAttr(node.id)}" data-node-type="${escapeAttr(node.type)}" transform="translate(${nx.toFixed(1)}, ${ny.toFixed(1)})" opacity="${opacity}">
    ${shapeSvg}
    ${decsSvg}
  </g>${childrenSvg}`;
}

function buildTrimmedHaloPathD(edge: SceneEdge, safePathD: string): string | null {
  if (edge.points.length < 3 || !safePathD.startsWith("M ")) return null;
  const p0 = edge.points[0];
  const p1 = edge.points[1];
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const len = Math.hypot(dx, dy);
  if (len <= 10) return null;
  const trim = Math.min(6, len * 0.35);
  const nx = p0[0] + (dx / len) * trim;
  const ny = p0[1] + (dy / len) * trim;
  return safePathD.replace(
    /^M\s+[-0-9.]+\s+[-0-9.]+/,
    `M ${nx.toFixed(1)} ${ny.toFixed(1)}`
  );
}

function renderEdge(edge: SceneEdge, scene: SceneGraph, prefix: string): string {
  const safeTone = normalizeTone(edge.tone, "neutral");
  const safeEndMarker = sanitizeMarkerRef(edge.endMarker);
  const safeStartMarker = sanitizeMarkerRef(edge.startMarker);

  const markerEnd =
    safeEndMarker && safeEndMarker !== "none"
      ? ` marker-end="url(#${prefix}-marker-${safeEndMarker}-${safeTone})"`
      : "";
  const markerStart =
    safeStartMarker && safeStartMarker !== "none"
      ? ` marker-start="url(#${prefix}-marker-${safeStartMarker}-${safeTone})"`
      : "";

  const safePathD = sanitizeSvgPathD(edge.pathD);
  if (!safePathD) return "";

  const isFlowAnim = edge.animation.type === "flow";
  const dash = sanitizeDasharray(isFlowAnim ? "7 5" : edge.strokeDasharray);
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
  const flowClass = isFlowAnim ? " ai-ill-edge-flow" : "";
  const stroke = sanitizeColor(edge.stroke, "currentColor");
  const strokeWidth = safeNum(edge.strokeWidth, 1.75);

  let roughCompanionSvg = "";
  if (scene.preset === "sketch" && edge.points.length >= 2) {
    const companionPts = edge.points.map(
      (pt) => [safeNum(pt[0]), safeNum(pt[1])] as [number, number]
    );
    if (edge.endMarker === "arrow" && companionPts.length >= 2) {
      const last = companionPts[companionPts.length - 1];
      const prev = companionPts[companionPts.length - 2];
      const dx = last[0] - prev[0];
      const dy = last[1] - prev[1];
      const len = Math.hypot(dx, dy);
      if (len > 4) {
        const pull = Math.min(7.7, len * 0.45);
        last[0] -= (dx / len) * pull;
        last[1] -= (dy / len) * pull;
      }
    }
    const companionD = sanitizeSvgPathD(
      generateRoughEdgeCompanionPath(
        companionPts,
        `${edge.id}_rough`,
        safeNum(scene.theme.geometry.roughness, 1.25)
      )
    );
    if (companionD) {
      roughCompanionSvg = `<path class="ai-ill-edge-rough" d="${escapeAttr(companionD)}" fill="none" stroke="${stroke}" stroke-width="${(strokeWidth * 0.8).toFixed(2)}" stroke-linecap="round" opacity="0.55"${dashAttr} />`;
    }
  }

  let pulseParticles = "";
  if (
    edge.animation.type === "pulse" ||
    edge.animation.type === "bidirectional"
  ) {
    const dur = `${Math.max(0.2, safeNum(edge.animation.durationSec, 2.0))}s`;
    pulseParticles += `<circle r="3.8" fill="${stroke}" filter="url(#${prefix}-glow)">
      <animateMotion dur="${dur}" repeatCount="indefinite" path="${escapeAttr(safePathD)}" />
    </circle>`;

    if (edge.animation.type === "bidirectional") {
      pulseParticles += `<circle r="3.2" fill="${stroke}" opacity="0.8">
        <animateMotion dur="${dur}" keyPoints="1;0" keyTimes="0;1" calcMode="linear" repeatCount="indefinite" path="${escapeAttr(safePathD)}" />
      </circle>`;
    }
  }

  // Subtle background-colored bridge halo underneath multi-segment paths so crossings remain legible
  const haloD =
    scene.background !== "transparent"
      ? buildTrimmedHaloPathD(edge, safePathD)
      : null;
  const haloColor = sanitizeColor(
    scene.background === "surface"
      ? scene.theme.colors.surface
      : scene.theme.colors.bg,
    "#ffffff"
  );
  const bridgeHaloSvg = haloD
    ? `<path class="ai-ill-edge-halo" d="${escapeAttr(haloD)}" fill="none" stroke="${haloColor}" stroke-width="${(strokeWidth + 3.0).toFixed(2)}" stroke-linecap="butt" stroke-linejoin="round" opacity="0.88" />`
    : "";

  return `<g class="ai-ill-edge" data-edge-id="${escapeAttr(edge.id)}" data-from="${escapeAttr(edge.from)}" data-to="${escapeAttr(edge.to)}">
    <!-- Invisible wider hit target for easy hover -->
    <path d="${escapeAttr(safePathD)}" fill="none" stroke="transparent" stroke-width="14" />
    ${bridgeHaloSvg}
    ${roughCompanionSvg}
    <path class="ai-ill-edge-path${flowClass}" d="${escapeAttr(safePathD)}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}${markerStart}${markerEnd} />
    ${pulseParticles}
  </g>`;
}

function renderEdgeLabel(
  edge: SceneEdge,
  scene: SceneGraph,
  prefix: string
): string {
  if (!edge.label || !edge.labelBox) return "";
  const lb = edge.labelBox;
  const safeTone = normalizeTone(edge.tone, "neutral");
  const labelStroke = sanitizeColor(
    safeTone === "neutral"
      ? scene.theme.colors.border
      : getTonePalette(scene.theme, safeTone).softBorder,
    "#cbd5e1"
  );
  const labelFill = sanitizeColor(scene.theme.colors.surfaceElevated, "#ffffff");
  const textFill = sanitizeColor(
    safeTone === "neutral" ? scene.theme.colors.textMuted : edge.stroke,
    "currentColor"
  );
  const labelRx = scene.preset === "blueprint" ? 3 : 11;
  const lbx = safeNum(lb.x);
  const lby = safeNum(lb.y);
  const lbw = safeNum(lb.width);
  const lbh = safeNum(lb.height);

  return `<g class="ai-ill-edge-label" data-edge-id="${escapeAttr(edge.id)}" data-from="${escapeAttr(edge.from)}" data-to="${escapeAttr(edge.to)}">
    <rect x="${lbx.toFixed(1)}" y="${lby.toFixed(1)}" width="${lbw.toFixed(1)}" height="${lbh.toFixed(1)}" rx="${labelRx}" fill="${labelFill}" stroke="${labelStroke}" stroke-width="1" filter="url(#${prefix}-shadow-sm)" />
    <text x="${(lbx + lbw / 2).toFixed(1)}" y="${(lby + lbh / 2 + 3.8).toFixed(1)}" fill="${textFill}" font-family="${escapeAttr(scene.theme.typography.fontSans)}" font-size="11px" font-weight="600" text-anchor="middle">${escapeXml(edge.label)}</text>
  </g>`;
}

const SSR_CSS_VAR_DEFAULTS = `
    .ai-ill-svg {
      --_ill-bg: #ffffff;
      --_ill-blueprint-bg: #e0f2fe;
      --_ill-surface: #f8fafc;
      --_ill-surface-elevated: #ffffff;
      --_ill-code-bg: #0f172a;
      --_ill-text: #0f172a;
      --_ill-text-muted: #64748b;
      --_ill-border: #cbd5e1;
      --_ill-neutral: #64748b;
      --_ill-primary: #3b82f6;
      --_ill-secondary: #8b5cf6;
      --_ill-accent: #06b6d4;
      --_ill-success: #10b981;
      --_ill-warning: #f59e0b;
      --_ill-danger: #ef4444;
      --_ill-info: #0ea5e9;
    }
    @media (prefers-color-scheme: dark) {
      .ai-ill-svg {
        --_ill-bg: #0b0f19;
        --_ill-blueprint-bg: #082046;
        --_ill-surface: #131b2e;
        --_ill-surface-elevated: #1a243b;
        --_ill-code-bg: #080c14;
        --_ill-text: #f1f5f9;
        --_ill-text-muted: #94a3b8;
        --_ill-border: #2a364f;
        --_ill-neutral: #94a3b8;
        --_ill-primary: #60a5fa;
        --_ill-secondary: #a78bfa;
        --_ill-accent: #22d3ee;
        --_ill-success: #34d399;
        --_ill-warning: #fbbf24;
        --_ill-danger: #f87171;
        --_ill-info: #38bdf8;
      }
    }
    :root.dark .ai-ill-svg,
    [data-theme="dark"] .ai-ill-svg,
    [data-color-mode="dark"] .ai-ill-svg {
      --_ill-bg: #0b0f19;
      --_ill-blueprint-bg: #082046;
      --_ill-surface: #131b2e;
      --_ill-surface-elevated: #1a243b;
      --_ill-code-bg: #080c14;
      --_ill-text: #f1f5f9;
      --_ill-text-muted: #94a3b8;
      --_ill-border: #2a364f;
      --_ill-neutral: #94a3b8;
      --_ill-primary: #60a5fa;
      --_ill-secondary: #a78bfa;
      --_ill-accent: #22d3ee;
      --_ill-success: #34d399;
      --_ill-warning: #fbbf24;
      --_ill-danger: #f87171;
      --_ill-info: #38bdf8;
    }
    :root[data-theme="light"] .ai-ill-svg,
    [data-theme="light"] .ai-ill-svg,
    [data-color-mode="light"] .ai-ill-svg {
      --_ill-bg: #ffffff;
      --_ill-blueprint-bg: #e0f2fe;
      --_ill-surface: #f8fafc;
      --_ill-surface-elevated: #ffffff;
      --_ill-code-bg: #0f172a;
      --_ill-text: #0f172a;
      --_ill-text-muted: #64748b;
      --_ill-border: #cbd5e1;
      --_ill-neutral: #64748b;
      --_ill-primary: #3b82f6;
      --_ill-secondary: #8b5cf6;
      --_ill-accent: #06b6d4;
      --_ill-success: #10b981;
      --_ill-warning: #f59e0b;
      --_ill-danger: #ef4444;
      --_ill-info: #0ea5e9;
    }`;

export function renderSceneGraphToSvgString(
  scene: SceneGraph,
  options: RenderSvgOptions = {}
): string {
  const { theme, background } = scene;
  const width = Math.max(1, safeNum(scene.width, 320));
  const height = Math.max(1, safeNum(scene.height, 180));
  const rawPrefix = options.idPrefix ? sanitizeIdToken(options.idPrefix) : "";
  const prefix = rawPrefix || computeSceneIdPrefix(scene);

  const markersSvg = SEMANTIC_TONES.map((tone) => {
    const col = sanitizeColor(
      tone === "neutral"
        ? theme.colors.textMuted
        : getTonePalette(theme, tone).main,
      "#64748b"
    );
    return `
        <marker id="${prefix}-marker-arrow-${tone}" viewBox="0 0 10 10" refX="2.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
          <path d="M 0 5 L 3.2 5" stroke="${col}" stroke-width="1.75" stroke-linecap="round" />
          <path d="M 1.4 1.6 L 9.5 5 L 1.4 8.4 L 2.7 5 z" fill="${col}" />
        </marker>
        <marker id="${prefix}-marker-dot-${tone}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5">
          <circle cx="5" cy="5" r="3.5" fill="${col}" />
        </marker>
        <marker id="${prefix}-marker-diamond-${tone}" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="6" markerHeight="6" orient="auto">
          <polygon points="6,1 11,6 6,11 1,6" fill="${col}" />
        </marker>`;
  }).join("");

  let bgPatternDef = "";
  let bgRectSvg = "";
  const isBlueprint = scene.preset === "blueprint";
  const effectiveBg = isBlueprint && background === "dots" ? "grid" : background;
  const safeBg = sanitizeColor(theme.colors.bg, "#ffffff");
  const safeSurface = sanitizeColor(theme.colors.surface, "#f8fafc");
  const safeGridDot = sanitizeColor(theme.colors.gridDot, "#cbd5e1");

  if (effectiveBg !== "transparent") {
    if (effectiveBg === "dots") {
      bgPatternDef = `<pattern id="${prefix}-bg-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.15" fill="${safeGridDot}" />
      </pattern>`;
      bgRectSvg = `<rect width="${width}" height="${height}" rx="12" fill="${safeBg}" /><rect width="${width}" height="${height}" rx="12" fill="url(#${prefix}-bg-dots)" />`;
    } else if (effectiveBg === "grid") {
      bgPatternDef = `<pattern id="${prefix}-bg-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="${safeGridDot}" stroke-width="${isBlueprint ? "0.9" : "0.75"}" />
      </pattern>`;
      const blueprintFrame = isBlueprint
        ? `<rect x="8" y="8" width="${Math.max(0, width - 16)}" height="${Math.max(0, height - 16)}" fill="none" stroke="${safeGridDot}" stroke-width="1" stroke-dasharray="4 4" />`
        : "";
      bgRectSvg = `<rect width="${width}" height="${height}" rx="${isBlueprint ? 4 : 12}" fill="${safeBg}" /><rect width="${width}" height="${height}" rx="${isBlueprint ? 4 : 12}" fill="url(#${prefix}-bg-grid)" />${blueprintFrame}`;
    } else if (effectiveBg === "surface") {
      bgRectSvg = `<rect width="${width}" height="${height}" rx="12" fill="${safeSurface}" />`;
    }
  }

  const shadowAlpha = theme.mode === "dark" ? 0.45 : 0.08;
  const shadowAlphaMd = theme.mode === "dark" ? 0.6 : 0.14;
  const roughness = safeNum(theme.geometry.roughness, 1.25);

  const nodesSvg = scene.nodes
    .map((n) => renderSceneNodeTree(n, roughness, scene.anchorRegistry, prefix))
    .join("\n");

  const edgesSvg = scene.edges
    .map((e) => renderEdge(e, scene, prefix))
    .join("\n");
  const edgeLabelsSvg = scene.edges
    .map((e) => renderEdgeLabel(e, scene, prefix))
    .filter(Boolean)
    .join("\n");

  const activeSubAnchorColor = sanitizeColor(
    getTonePalette(theme, "primary").main,
    "#3b82f6"
  );
  const ssrVarsCss = options.includeCssVarDefaults ? SSR_CSS_VAR_DEFAULTS : "";

  return `<svg class="ai-ill-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" style="max-width: ${width}px; height: auto; display: block; margin: 0 auto;" role="img" aria-label="${escapeAttr(scene.title || "Technical Illustration")}">
  ${scene.title ? `<title>${escapeXml(scene.title)}</title>` : ""}
  <defs>
    ${markersSvg}
    ${bgPatternDef}
    <filter id="${prefix}-shadow-sm" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="${shadowAlpha}" />
    </filter>
    <filter id="${prefix}-shadow-md" x="-12%" y="-12%" width="124%" height="130%">
      <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000000" flood-opacity="${shadowAlphaMd}" />
    </filter>
    <filter id="${prefix}-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <style>${ssrVarsCss}
    @keyframes ill-dash-march {
      to { stroke-dashoffset: -24; }
    }
    .ai-ill-edge-flow {
      animation: ill-dash-march 0.9s linear infinite;
    }
    .ai-ill-node, .ai-ill-edge, .ai-ill-edge-label, .ai-ill-subanchor, .ai-ill-callout-link {
      transition: opacity 0.18s ease, filter 0.18s ease, stroke-width 0.18s ease;
    }
    .ai-ill-node, .ai-ill-edge-label {
      cursor: pointer;
    }
    .ai-ill-subanchor {
      cursor: pointer;
    }
    .ai-ill-svg.has-focus .ai-ill-node.is-dimmed,
    .ai-ill-svg.has-focus .ai-ill-edge.is-dimmed,
    .ai-ill-svg.has-focus .ai-ill-edge-label.is-dimmed,
    .ai-ill-svg.has-focus .ai-ill-callout-link.is-dimmed {
      opacity: 0.2;
      filter: grayscale(35%);
    }
    .ai-ill-svg.has-focus .ai-ill-edge.is-active .ai-ill-edge-path {
      stroke-width: 2.8px;
    }
    .ai-ill-svg.has-focus .ai-ill-edge-label.is-active rect {
      stroke-width: 1.6px;
    }
    .ai-ill-svg.has-focus .ai-ill-subanchor.is-active {
      stroke: ${activeSubAnchorColor};
      stroke-width: 1.5px;
    }
  </style>
  <g class="ai-ill-bg-layer">${bgRectSvg}</g>
  <g class="ai-ill-nodes-layer">${nodesSvg}</g>
  <g class="ai-ill-edges-layer">${edgesSvg}</g>
  <g class="ai-ill-edge-labels-layer">${edgeLabelsSvg}</g>
</svg>`;
}
