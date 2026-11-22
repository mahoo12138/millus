/**
 * Reactive SVG Renderer for SceneGraph
 * Supports Clean & Sketch presets, Sub-Anchor Focus Highlighting, and Animated Data Flows.
 */

import type {
  BoundingBox,
  PrimitiveDecoration,
  SceneEdge,
  SceneGraph,
  SceneNode,
  SemanticTone,
} from "../schema/spec.ts";
import {
  generateRoughEllipseStrokePath,
  generateRoughPolygonStrokePath,
  generateRoughRectStrokePath,
} from "./rough-adapter.ts";

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
};

function renderIconSvg(
  name: string,
  x: number,
  y: number,
  size: number,
  strokeColor: string
): string {
  const key = name.toLowerCase();
  const inner = ICON_PATHS[key] || ICON_PATHS.cpu;
  const scale = size / 24;
  return `<g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${scale.toFixed(3)})" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
}

function renderDecoration(dec: PrimitiveDecoration): string {
  switch (dec.kind) {
    case "rect":
      return `<rect x="${dec.x}" y="${dec.y}" width="${dec.width || 0}" height="${dec.height || 0}" rx="${dec.rx || 0}" fill="${dec.fill || "none"}" stroke="${dec.stroke || "none"}" stroke-width="${dec.strokeWidth || 0}" />`;

    case "code-line":
    case "table-cell":
      return `<rect class="ai-ill-subanchor" data-anchor-id="${escapeXml(dec.anchorId || "")}" x="${dec.x}" y="${dec.y}" width="${dec.width || 0}" height="${dec.height || 0}" rx="${dec.rx || 3}" fill="${dec.fill || "transparent"}" />`;

    case "circle":
      return `<circle cx="${dec.x}" cy="${dec.y}" r="${dec.r || 4}" fill="${dec.fill || "none"}" stroke="${dec.stroke || "none"}" />`;

    case "line":
      return `<line x1="${dec.x}" y1="${dec.y}" x2="${dec.x2 ?? dec.x}" y2="${dec.y2 ?? dec.y}" stroke="${dec.stroke || "currentColor"}" stroke-width="${dec.strokeWidth || 1}" />`;

    case "icon":
      return renderIconSvg(
        dec.iconName || "cpu",
        dec.x,
        dec.y,
        dec.width || 16,
        dec.stroke || "currentColor"
      );

    case "text":
      return `<text x="${dec.x}" y="${dec.y}" fill="${dec.textColor || "currentColor"}" font-family="${escapeXml(dec.fontFamily || "sans-serif")}" font-size="${dec.fontSize || 12}px" font-weight="${dec.fontWeight || 400}" text-anchor="${dec.textAnchor || "start"}">${escapeXml(dec.text || "")}</text>`;

    default:
      return "";
  }
}

function renderNodeShape(node: SceneNode, roughness: number): string {
  const { width: w, height: h, style, shape } = node;
  if (shape === "none" || style.variant === "ghost") return "";

  const dashAttr = style.strokeDasharray
    ? ` stroke-dasharray="${style.strokeDasharray}"`
    : "";
  const filterAttr =
    style.elevation === "md"
      ? ` filter="url(#ill-shadow-md)"`
      : style.elevation === "sm"
      ? ` filter="url(#ill-shadow-sm)"`
      : "";

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
      return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 2}" ry="${h / 2 - 2}" fill="${style.fill}" stroke="none"${filterAttr} /><path d="${d}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr} />`;
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
      return `<polygon points="${polyStr}" fill="${style.fill}" stroke="none"${filterAttr} /><path d="${d}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr} />`;
    }

    if (shape === "polygon" && node.polygonPoints) {
      const polyStr = node.polygonPoints.map((p) => `${p[0]},${p[1]}`).join(" ");
      const d = generateRoughPolygonStrokePath(
        node.polygonPoints,
        node.id,
        roughness
      );
      return `<polygon points="${polyStr}" fill="${style.fill}" stroke="none"${filterAttr} /><path d="${d}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr} />`;
    }

    // Default rough rect
    const d = generateRoughRectStrokePath(0, 0, w, h, node.id, roughness);
    return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${Math.min(style.radius, 6)}" fill="${style.fill}" stroke="none"${filterAttr} /><path d="${d}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr} />`;
  }

  // Clean vector shapes
  if (shape === "circle" || shape === "ellipse") {
    return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr}${filterAttr} />`;
  }

  if (shape === "diamond") {
    const pts = `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`;
    return `<polygon points="${pts}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" stroke-linejoin="round"${dashAttr}${filterAttr} />`;
  }

  if (shape === "polygon" && node.polygonPoints) {
    const pts = node.polygonPoints.map((p) => `${p[0]},${p[1]}`).join(" ");
    return `<polygon points="${pts}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" stroke-linejoin="round"${dashAttr}${filterAttr} />`;
  }

  if (shape === "path" && node.pathD) {
    return `<path d="${node.pathD}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}${filterAttr} />`;
  }

  return `<rect x="0" y="0" width="${w}" height="${h}" rx="${style.radius}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr}${filterAttr} />`;
}

function renderCalloutConnector(
  node: SceneNode,
  anchorRegistry: Record<string, BoundingBox>
): string {
  if (!node.calloutTail) return "";
  const targetBox = anchorRegistry[node.calloutTail.targetId];
  if (!targetBox) return "";

  const startX = node.x + node.width / 2;
  const startY =
    node.calloutTail.side === "top"
      ? node.y + node.height
      : node.calloutTail.side === "bottom"
      ? node.y
      : node.y + node.height / 2;

  const endX = targetBox.x + targetBox.width / 2;
  const endY =
    node.calloutTail.side === "top"
      ? targetBox.y
      : node.calloutTail.side === "bottom"
      ? targetBox.y + targetBox.height
      : targetBox.y + targetBox.height / 2;

  return `<g class="ai-ill-callout-link" data-node-id="${escapeXml(node.id)}">
    <line x1="${startX.toFixed(1)}" y1="${startY.toFixed(1)}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}" stroke="${node.style.stroke}" stroke-width="1.5" stroke-dasharray="3 3" />
    <circle cx="${endX.toFixed(1)}" cy="${endY.toFixed(1)}" r="3.5" fill="${node.style.stroke}" />
  </g>`;
}

function renderSceneNodeTree(
  node: SceneNode,
  roughness: number,
  anchorRegistry: Record<string, BoundingBox>
): string {
  const shapeSvg = renderNodeShape(node, roughness);
  const decsSvg = node.decorations.map(renderDecoration).join("");

  // Note: child.x and child.y are already converted to world coordinates in LayoutSolver
  const childrenSvg = node.children
    .map((child) => renderSceneNodeTree(child, roughness, anchorRegistry))
    .join("");

  const calloutLink = renderCalloutConnector(node, anchorRegistry);

  return `${calloutLink}<g class="ai-ill-node" data-node-id="${escapeXml(node.id)}" data-node-type="${node.type}" transform="translate(${node.x.toFixed(1)}, ${node.y.toFixed(1)})" opacity="${node.style.opacity}">
    ${shapeSvg}
    ${decsSvg}
  </g>${childrenSvg}`;
}

function renderEdge(edge: SceneEdge, scene: SceneGraph): string {
  const markerEnd =
    edge.endMarker !== "none"
      ? ` marker-end="url(#ill-marker-${edge.endMarker}-${edge.tone})"`
      : "";
  const markerStart =
    edge.startMarker !== "none"
      ? ` marker-start="url(#ill-marker-${edge.startMarker}-${edge.tone})"`
      : "";

  const isFlowAnim = edge.animation.type === "flow";
  const dashVal = isFlowAnim ? "7 5" : edge.strokeDasharray;
  const dashAttr = dashVal ? ` stroke-dasharray="${dashVal}"` : "";
  const flowClass = isFlowAnim ? " ai-ill-edge-flow" : "";

  let pulseParticles = "";
  if (
    edge.animation.type === "pulse" ||
    edge.animation.type === "bidirectional"
  ) {
    const dur = `${edge.animation.durationSec}s`;
    pulseParticles += `<circle r="3.8" fill="${edge.stroke}" filter="url(#ill-glow)">
      <animateMotion dur="${dur}" repeatCount="indefinite" path="${edge.pathD}" />
    </circle>`;

    if (edge.animation.type === "bidirectional") {
      pulseParticles += `<circle r="3.2" fill="${edge.stroke}" opacity="0.8">
        <animateMotion dur="${dur}" keyPoints="1;0" keyTimes="0;1" calcMode="linear" repeatCount="indefinite" path="${edge.pathD}" />
      </circle>`;
    }
  }

  let labelSvg = "";
  if (edge.label && edge.labelBox) {
    const lb = edge.labelBox;
    const labelStroke =
      edge.tone === "neutral"
        ? scene.theme.colors.border
        : scene.theme.colors.tones[edge.tone].softBorder;
    labelSvg = `<g class="ai-ill-edge-label">
      <rect x="${lb.x.toFixed(1)}" y="${lb.y.toFixed(1)}" width="${lb.width.toFixed(1)}" height="${lb.height.toFixed(1)}" rx="11" fill="${scene.theme.colors.surfaceElevated}" stroke="${labelStroke}" stroke-width="1" filter="url(#ill-shadow-sm)" />
      <text x="${(lb.x + lb.width / 2).toFixed(1)}" y="${(lb.y + lb.height / 2 + 3.8).toFixed(1)}" fill="${edge.tone === "neutral" ? scene.theme.colors.textMuted : edge.stroke}" font-family="${escapeXml(scene.theme.typography.fontSans)}" font-size="11px" font-weight="600" text-anchor="middle">${escapeXml(edge.label)}</text>
    </g>`;
  }

  return `<g class="ai-ill-edge" data-edge-id="${escapeXml(edge.id)}" data-from="${escapeXml(edge.from)}" data-to="${escapeXml(edge.to)}">
    <!-- Invisible wider hit target for easy hover -->
    <path d="${edge.pathD}" fill="none" stroke="transparent" stroke-width="14" />
    <path class="ai-ill-edge-path${flowClass}" d="${edge.pathD}" fill="none" stroke="${edge.stroke}" stroke-width="${edge.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}${markerStart}${markerEnd} />
    ${pulseParticles}
    ${labelSvg}
  </g>`;
}

export function renderSceneGraphToSvgString(scene: SceneGraph): string {
  const { width, height, theme, background } = scene;
  const tones = Object.keys(theme.colors.tones) as SemanticTone[];

  const markersSvg = tones
    .map((tone) => {
      const col =
        tone === "neutral"
          ? theme.colors.textMuted
          : theme.colors.tones[tone].main;
      return `
        <marker id="ill-marker-arrow-${tone}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M 1 1.8 L 9 5 L 1 8.2 z" fill="${col}" />
        </marker>
        <marker id="ill-marker-dot-${tone}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5">
          <circle cx="5" cy="5" r="3.5" fill="${col}" />
        </marker>
        <marker id="ill-marker-diamond-${tone}" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="6" markerHeight="6" orient="auto">
          <polygon points="6,1 11,6 6,11 1,6" fill="${col}" />
        </marker>`;
    })
    .join("");

  let bgPatternDef = "";
  let bgRectSvg = "";
  if (background !== "transparent") {
    if (background === "dots") {
      bgPatternDef = `<pattern id="ill-bg-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.15" fill="${theme.colors.gridDot}" />
      </pattern>`;
      bgRectSvg = `<rect width="${width}" height="${height}" rx="12" fill="${theme.colors.bg}" /><rect width="${width}" height="${height}" rx="12" fill="url(#ill-bg-dots)" />`;
    } else if (background === "grid") {
      bgPatternDef = `<pattern id="ill-bg-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="${theme.colors.gridDot}" stroke-width="0.75" />
      </pattern>`;
      bgRectSvg = `<rect width="${width}" height="${height}" rx="12" fill="${theme.colors.bg}" /><rect width="${width}" height="${height}" rx="12" fill="url(#ill-bg-grid)" />`;
    } else if (background === "surface") {
      bgRectSvg = `<rect width="${width}" height="${height}" rx="12" fill="${theme.colors.surface}" />`;
    }
  }

  const shadowAlpha = theme.mode === "dark" ? 0.45 : 0.08;
  const shadowAlphaMd = theme.mode === "dark" ? 0.6 : 0.14;

  const nodesSvg = scene.nodes
    .map((n) =>
      renderSceneNodeTree(n, theme.geometry.roughness, scene.anchorRegistry)
    )
    .join("\n");

  const edgesSvg = scene.edges.map((e) => renderEdge(e, scene)).join("\n");

  return `<svg class="ai-ill-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" style="max-width: ${width}px; height: auto; display: block; margin: 0 auto;" role="img" aria-label="${escapeXml(scene.title || "Technical Illustration")}">
  ${scene.title ? `<title>${escapeXml(scene.title)}</title>` : ""}
  <defs>
    ${markersSvg}
    ${bgPatternDef}
    <filter id="ill-shadow-sm" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="${shadowAlpha}" />
    </filter>
    <filter id="ill-shadow-md" x="-12%" y="-12%" width="124%" height="130%">
      <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000000" flood-opacity="${shadowAlphaMd}" />
    </filter>
    <filter id="ill-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <style>
    @keyframes ill-dash-march {
      to { stroke-dashoffset: -24; }
    }
    .ai-ill-edge-flow {
      animation: ill-dash-march 0.9s linear infinite;
    }
    .ai-ill-node, .ai-ill-edge, .ai-ill-subanchor, .ai-ill-callout-link {
      transition: opacity 0.18s ease, filter 0.18s ease, stroke-width 0.18s ease;
    }
    .ai-ill-node {
      cursor: pointer;
    }
    .ai-ill-subanchor {
      cursor: pointer;
    }
    .ai-ill-svg.has-focus .ai-ill-node.is-dimmed,
    .ai-ill-svg.has-focus .ai-ill-edge.is-dimmed,
    .ai-ill-svg.has-focus .ai-ill-callout-link.is-dimmed {
      opacity: 0.2;
      filter: grayscale(35%);
    }
    .ai-ill-svg.has-focus .ai-ill-edge.is-active .ai-ill-edge-path {
      stroke-width: 2.8px;
    }
    .ai-ill-svg.has-focus .ai-ill-subanchor.is-active {
      stroke: ${theme.colors.tones.primary.main};
      stroke-width: 1.5px;
    }
  </style>
  <g class="ai-ill-bg-layer">${bgRectSvg}</g>
  <g class="ai-ill-nodes-layer">${nodesSvg}</g>
  <g class="ai-ill-edges-layer">${edgesSvg}</g>
</svg>`;
}
