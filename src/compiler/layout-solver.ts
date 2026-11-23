/**
 * Three-Tier Hybrid Layout Solver & Compound Component Macro Expander
 * Supports:
 *  1. Container Flow Layout (Flex Row/Column & Grid)
 *  2. Sibling Relative Anchor Placement (Topological DAG Solver: rightOf / leftOf / below / above)
 *  3. Absolute Coordinates & Auto-Positioned Callouts
 *  4. Sub-Anchor Registration (code-block lines: id.line_N, table cells: id.cell_R_C)
 *  5. Mobile Responsive Reflow (compactViewport mode)
 */

import type {
  BadgeElementSpec,
  BoundingBox,
  CalloutElementSpec,
  CardElementSpec,
  CodeBlockElementSpec,
  ConnectionSpec,
  ElementSpec,
  GroupElementSpec,
  IconElementSpec,
  IllustrationSpec,
  LayoutConfig,
  PathElementSpec,
  PlaceSpec,
  PolygonElementSpec,
  PrimitiveDecoration,
  RectElementSpec,
  ResolvedThemeTokens,
  SceneNode,
  SemanticTone,
  SubAnchorRenderItem,
  TableCellInput,
  TableElementSpec,
  TerminalElementSpec,
  TextElementSpec,
} from "../schema/spec.ts";
import { TextMeasurer } from "../runtime/text-measurer.ts";
import { mixColors, resolveNodeStyle } from "../runtime/theme-observer.ts";

export interface LayoutOptions {
  compactViewport?: boolean;
}

export interface LayoutResult {
  nodes: SceneNode[];
  anchorRegistry: Record<string, BoundingBox>;
  width: number;
  height: number;
}

function normalizePadding(
  pad: number | [number, number] | [number, number, number, number] | undefined,
  defaultPad: [number, number, number, number]
): [number, number, number, number] {
  if (pad === undefined) return defaultPad;
  if (typeof pad === "number") return [pad, pad, pad, pad];
  if (pad.length === 2) return [pad[0], pad[1], pad[0], pad[1]];
  return pad;
}

export class HybridLayoutSolver {
  private idCounter = 0;
  private measurer: TextMeasurer;
  private theme: ResolvedThemeTokens;
  private connections: ConnectionSpec[] = [];

  constructor(
    measurer: TextMeasurer,
    theme: ResolvedThemeTokens
  ) {
    this.measurer = measurer;
    this.theme = theme;
  }

  solve(spec: IllustrationSpec, options: LayoutOptions = {}): LayoutResult {
    this.idCounter = 0;
    this.connections = spec.connections || [];
    const compact = options.compactViewport ?? false;
    const anchorRegistry: Record<string, BoundingBox> = {};

    // Pass 1: Build and measure all nodes bottom-up (local coordinates)
    const rootSpecs = spec.elements || [];
    const calloutSpecs: CalloutElementSpec[] = [];
    const regularSpecs: ElementSpec[] = [];

    for (const el of rootSpecs) {
      if (
        el.type === "callout" &&
        el.target &&
        el.x === undefined &&
        el.y === undefined &&
        !el.place
      ) {
        calloutSpecs.push(el);
      } else {
        regularSpecs.push(el);
      }
    }

    const rootNodes = regularSpecs.map((el) =>
      this.measureElement(el, compact)
    );

    // Pass 2: Layout root container children (Flex/Grid or Relative/Free)
    const rootLayout: LayoutConfig = spec.canvas?.layout || {
      type: "free",
    };
    this.positionSiblings(rootNodes, regularSpecs, rootLayout, compact);

    // Convert nested child coordinates from parent-relative to world coordinates ONCE
    this.convertTreeToWorldCoordinates(rootNodes, 0, 0);

    // Normalize top-left offset and apply canvas padding
    const canvasPad = normalizePadding(spec.canvas?.padding, [32, 32, 32, 32]);

    // First register preliminary world coordinates so auto-callouts can find their target anchors
    this.shiftAndRegisterWorldBounds(rootNodes, canvasPad, anchorRegistry);

    // Pass 2b: Position auto-targeted callouts relative to their target node or sub-anchor
    const calloutNodes: SceneNode[] = [];
    for (const cSpec of calloutSpecs) {
      const cNode = this.measureElement(cSpec, compact);
      const targetBox = anchorRegistry[cSpec.target!];
      const ownerBox =
        targetBox?.ownerNodeId && anchorRegistry[targetBox.ownerNodeId]
          ? anchorRegistry[targetBox.ownerNodeId]
          : targetBox;
      const side = compact
        ? cSpec.side === "left" || cSpec.side === "right"
          ? "top"
          : cSpec.side || "top"
        : cSpec.side || "top";

      if (targetBox && ownerBox) {
        const gap = 18;
        if (side === "top") {
          cNode.x = targetBox.x + (targetBox.width - cNode.width) / 2;
          cNode.y = Math.min(targetBox.y, ownerBox.y) - cNode.height - gap;
        } else if (side === "bottom") {
          cNode.x = targetBox.x + (targetBox.width - cNode.width) / 2;
          cNode.y =
            Math.max(
              targetBox.y + targetBox.height,
              ownerBox.y + ownerBox.height
            ) + gap;
        } else if (side === "left") {
          cNode.x = Math.min(targetBox.x, ownerBox.x) - cNode.width - gap;
          cNode.y = targetBox.y + (targetBox.height - cNode.height) / 2;
        } else {
          cNode.x =
            Math.max(
              targetBox.x + targetBox.width,
              ownerBox.x + ownerBox.width
            ) + gap;
          cNode.y = targetBox.y + (targetBox.height - cNode.height) / 2;
        }
      }
      this.convertTreeToWorldCoordinates([cNode], 0, 0);
      calloutNodes.push(cNode);
    }

    const allNodes = [...rootNodes, ...calloutNodes];

    // Re-normalize world coordinates so no node has negative X or Y
    let minX = Infinity;
    let minY = Infinity;
    for (const n of allNodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
    }
    if (!Number.isFinite(minX)) minX = 0;
    if (!Number.isFinite(minY)) minY = 0;

    const shiftX = canvasPad[3] - minX;
    const shiftY = canvasPad[0] - minY;

    for (const key of Object.keys(anchorRegistry)) {
      delete anchorRegistry[key];
    }

    for (const node of allNodes) {
      this.translateWorldTree(node, shiftX, shiftY, anchorRegistry);
    }

    let maxX = 0;
    let maxY = 0;
    for (const node of allNodes) {
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    const totalWidth =
      typeof spec.canvas?.width === "number"
        ? spec.canvas.width
        : Math.max(320, Math.ceil(maxX + canvasPad[1]));
    const totalHeight =
      typeof spec.canvas?.height === "number"
        ? spec.canvas.height
        : Math.max(180, Math.ceil(maxY + canvasPad[2]));

    return {
      nodes: allNodes,
      anchorRegistry,
      width: totalWidth,
      height: totalHeight,
    };
  }

  private convertTreeToWorldCoordinates(
    nodes: SceneNode[],
    parentX: number,
    parentY: number
  ): void {
    for (const node of nodes) {
      node.x += parentX;
      node.y += parentY;
      if (node.children.length > 0) {
        this.convertTreeToWorldCoordinates(node.children, node.x, node.y);
      }
    }
  }

  private shiftAndRegisterWorldBounds(
    nodes: SceneNode[],
    canvasPad: [number, number, number, number],
    registry: Record<string, BoundingBox>
  ): void {
    let minX = Infinity;
    let minY = Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
    }
    if (!Number.isFinite(minX)) minX = 0;
    if (!Number.isFinite(minY)) minY = 0;

    const dx = canvasPad[3] - minX;
    const dy = canvasPad[0] - minY;
    for (const n of nodes) {
      this.translateWorldTree(n, dx, dy, registry);
    }
  }

  private translateWorldTree(
    node: SceneNode,
    dx: number,
    dy: number,
    registry: Record<string, BoundingBox>,
    parentGroupId?: string
  ): void {
    node.x += dx;
    node.y += dy;

    registry[node.id] = {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      ownerNodeId: node.id,
      parentGroupId,
      shape: node.shape,
    };

    for (const sub of node.subAnchors) {
      registry[sub.anchorId] = {
        x: node.x + sub.x,
        y: node.y + sub.y,
        width: sub.width,
        height: sub.height,
        ownerNodeId: node.id,
        parentGroupId,
        shape: "rect",
      };
    }

    for (const child of node.children) {
      this.translateWorldTree(child, dx, dy, registry, node.id);
    }
  }

  private nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}_${this.idCounter}`;
  }

  private measureElement(spec: ElementSpec, compact: boolean): SceneNode {
    switch (spec.type) {
      case "card":
        return this.buildCardNode(spec, compact);
      case "code-block":
        return this.buildCodeBlockNode(spec);
      case "terminal":
        return this.buildTerminalNode(spec);
      case "table":
        return this.buildTableNode(spec);
      case "group":
      case "window":
        return this.buildGroupOrWindowNode(spec, compact);
      case "callout":
        return this.buildCalloutNode(spec);
      case "badge":
        return this.buildBadgeNode(spec);
      case "text":
        return this.buildTextNode(spec);
      case "icon":
        return this.buildIconNode(spec);
      case "polygon":
        return this.buildPolygonNode(spec);
      case "path":
        return this.buildPathNode(spec);
      case "rect":
      case "circle":
      case "ellipse":
      case "diamond":
      default:
        return this.buildPrimitiveShapeNode(spec as RectElementSpec);
    }
  }

  // ==========================================================================
  // Compound Component Macro Builders
  // ==========================================================================

  private buildCardNode(spec: CardElementSpec, compact: boolean): SceneNode {
    const id = spec.id || this.nextId("card");
    const style = resolveNodeStyle(spec.style, this.theme, "soft", "neutral");
    const pad = normalizePadding(spec.padding, [14, 16, 14, 16]);
    const fontSans = this.theme.typography.fontSans;
    const fontMono = this.theme.typography.fontMono;

    const titleSize = 14;
    const bodySize = 12;
    const iconOffset = spec.icon ? 24 : 0;
    const titleWidth = this.measurer.measureLineWidth(
      spec.title,
      titleSize,
      fontSans,
      600
    );

    const badgeWidth = spec.badge
      ? this.measurer.measureLineWidth(spec.badge, 10, fontMono, 600, true) + 14
      : 0;

    const headerRowWidth =
      iconOffset + titleWidth + (badgeWidth > 0 ? badgeWidth + 12 : 0);

    const bodyBlock = spec.body
      ? this.measurer.measureBlock(spec.body, {
          fontFamily: fontSans,
          fontSize: bodySize,
          lineHeight: 18,
          maxWidth: typeof spec.width === "number" ? spec.width - pad[1] - pad[3] : 240,
        })
      : null;

    // Optional nested children inside card
    const childSpecs = spec.children || [];
    const childNodes = childSpecs.map((c) => this.measureElement(c, compact));
    let childrenWidth = 0;
    let childrenHeight = 0;
    if (childNodes.length > 0) {
      const cardLayout: LayoutConfig = spec.layout || {
        type: "flex",
        direction: "column",
        gap: 10,
      };
      const box = this.positionSiblings(
        childNodes,
        childSpecs,
        cardLayout,
        compact
      );
      childrenWidth = box.width;
      childrenHeight = box.height;
    }

    const contentWidth = Math.max(
      headerRowWidth,
      bodyBlock ? bodyBlock.width : 0,
      childrenWidth,
      150
    );

    const width =
      typeof spec.width === "number"
        ? spec.width
        : Math.ceil(contentWidth + pad[1] + pad[3]);

    let cursorY = pad[0];
    const decorations: PrimitiveDecoration[] = [];

    // Header icon
    if (spec.icon) {
      decorations.push({
        kind: "icon",
        iconName: spec.icon,
        x: pad[3],
        y: cursorY + 1,
        width: 16,
        height: 16,
        stroke:
          style.variant === "filled"
            ? style.textColor
            : this.theme.colors.tones[style.tone].main,
      });
    }

    // Header title
    decorations.push({
      kind: "text",
      x: pad[3] + iconOffset,
      y: cursorY + 13,
      text: spec.title,
      fontFamily: fontSans,
      fontSize: titleSize,
      fontWeight: 600,
      textColor: style.textColor,
    });

    // Optional Badge pill on top-right
    if (spec.badge) {
      const bx = width - pad[1] - badgeWidth;
      const by = cursorY - 1;
      const tonePalette = this.theme.colors.tones[style.tone];
      decorations.push({
        kind: "rect",
        x: bx,
        y: by,
        width: badgeWidth,
        height: 18,
        rx: 9,
        fill:
          style.variant === "filled"
            ? "rgba(255,255,255,0.22)"
            : mixColors(tonePalette.main, this.theme.colors.bg, 0.22),
        stroke:
          style.variant === "filled" ? "transparent" : tonePalette.softBorder,
        strokeWidth: 1,
      });
      decorations.push({
        kind: "text",
        x: bx + badgeWidth / 2,
        y: by + 12.5,
        text: spec.badge,
        fontFamily: fontMono,
        fontSize: 10,
        fontWeight: 600,
        textColor:
          style.variant === "filled" ? style.textColor : tonePalette.main,
        textAnchor: "middle",
      });
    }

    cursorY += 20;

    if (spec.subtitle) {
      cursorY += 2;
      decorations.push({
        kind: "text",
        x: pad[3],
        y: cursorY + 11,
        text: spec.subtitle,
        fontFamily: fontMono,
        fontSize: 11,
        textColor: style.mutedTextColor,
      });
      cursorY += 16;
    }

    if (bodyBlock && bodyBlock.lines.length > 0) {
      cursorY += 6;
      for (const line of bodyBlock.lines) {
        decorations.push({
          kind: "text",
          x: pad[3],
          y: cursorY + 12,
          text: line.text,
          fontFamily: fontSans,
          fontSize: bodySize,
          textColor: style.mutedTextColor,
        });
        cursorY += bodyBlock.lineHeight;
      }
    }

    if (childNodes.length > 0) {
      cursorY += 10;
      for (const child of childNodes) {
        child.x += pad[3];
        child.y += cursorY;
      }
      cursorY += childrenHeight;
    }

    const height =
      typeof spec.height === "number"
        ? spec.height
        : Math.ceil(cursorY + pad[2]);

    return {
      id,
      type: "card",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      decorations,
      subAnchors: [],
      children: childNodes,
    };
  }

  private buildCodeBlockNode(spec: CodeBlockElementSpec): SceneNode {
    const id = spec.id || this.nextId("code");
    const style = resolveNodeStyle(
      spec.style,
      this.theme,
      "outlined",
      "neutral"
    );
    style.fill = this.theme.colors.codeBg;
    style.stroke =
      style.tone === "neutral"
        ? mixColors(this.theme.colors.border, "#1e293b", 0.5)
        : this.theme.colors.tones[style.tone].softBorder;

    const fontMono = this.theme.typography.fontMono;
    const rawLines = (spec.code || "").replace(/\s+$/, "").split(/\r?\n/);
    const codeFontSize = 12;
    const lineHeight = 22;
    const headerHeight = 32;
    const padX = 14;
    const padBottom = 10;
    const gutterWidth = 26;

    let maxCodeLineW = 140;
    for (const line of rawLines) {
      const w = this.measurer.measureLineWidth(
        line,
        codeFontSize,
        fontMono,
        400,
        true
      );
      maxCodeLineW = Math.max(maxCodeLineW, w);
    }

    const width =
      typeof spec.width === "number"
        ? spec.width
        : Math.ceil(padX * 2 + gutterWidth + maxCodeLineW + 18);
    const height =
      typeof spec.height === "number"
        ? spec.height
        : Math.ceil(headerHeight + 8 + rawLines.length * lineHeight + padBottom);

    const decorations: PrimitiveDecoration[] = [];
    const subAnchors: SubAnchorRenderItem[] = [];

    // Header divider line
    decorations.push({
      kind: "line",
      x: 0,
      y: headerHeight,
      x2: width,
      y2: headerHeight,
      stroke: "#1e293b",
      strokeWidth: 1,
    });

    // macOS window control dots
    const dotColors = ["#ef4444", "#f59e0b", "#10b981"];
    dotColors.forEach((col, i) => {
      decorations.push({
        kind: "circle",
        x: 14 + i * 14,
        y: headerHeight / 2,
        r: 4.2,
        fill: col,
      });
    });

    // Title in header
    if (spec.title) {
      decorations.push({
        kind: "text",
        x: 62,
        y: headerHeight / 2 + 4,
        text: spec.title,
        fontFamily: fontMono,
        fontSize: 11,
        fontWeight: 600,
        textColor: "#94a3b8",
      });
    }

    // Language badge
    if (spec.lang) {
      decorations.push({
        kind: "text",
        x: width - 12,
        y: headerHeight / 2 + 4,
        text: spec.lang.toUpperCase(),
        fontFamily: fontMono,
        fontSize: 10,
        fontWeight: 600,
        textColor: "#64748b",
        textAnchor: "end",
      });
    }

    const highlightSet = new Set(spec.highlightLines || []);
    const highlightTone =
      style.tone === "neutral" ? "primary" : style.tone;
    const highlightColor = this.theme.colors.tones[highlightTone].main;

    rawLines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      const lineY = headerHeight + 6 + idx * lineHeight;
      const isHighlighted = highlightSet.has(lineNum);
      const anchorId = `${id}.line_${lineNum}`;

      // Register sub-anchor for every code line so arrows can point to or from any line!
      subAnchors.push({
        anchorId,
        x: 0,
        y: lineY,
        width,
        height: lineHeight,
        highlight: isHighlighted,
        tone: highlightTone,
      });

      if (isHighlighted) {
        decorations.push({
          kind: "code-line",
          anchorId,
          x: 2,
          y: lineY,
          width: width - 4,
          height: lineHeight,
          fill: mixColors(highlightColor, "#080c14", 0.22),
        });
        // Left accent indicator bar
        decorations.push({
          kind: "rect",
          x: 2,
          y: lineY,
          width: 3,
          height: lineHeight,
          fill: highlightColor,
        });
      } else {
        decorations.push({
          kind: "code-line",
          anchorId,
          x: 2,
          y: lineY,
          width: width - 4,
          height: lineHeight,
          fill: "transparent",
        });
      }

      // Line number
      decorations.push({
        kind: "text",
        x: padX + 14,
        y: lineY + 15,
        text: String(lineNum),
        fontFamily: fontMono,
        fontSize: 11,
        textColor: isHighlighted ? highlightColor : "#475569",
        textAnchor: "end",
      });

      // Code text
      decorations.push({
        kind: "text",
        x: padX + gutterWidth,
        y: lineY + 15,
        text: lineText,
        fontFamily: fontMono,
        fontSize: codeFontSize,
        textColor: isHighlighted ? "#f8fafc" : this.theme.colors.codeText,
      });
    });

    return {
      id,
      type: "code-block",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      decorations,
      subAnchors,
      children: [],
    };
  }

  private buildTerminalNode(spec: TerminalElementSpec): SceneNode {
    const id = spec.id || this.nextId("term");
    const style = resolveNodeStyle(
      spec.style,
      this.theme,
      "outlined",
      "neutral"
    );
    style.fill = "#090d16";
    style.stroke = "#334155";

    const fontMono = this.theme.typography.fontMono;
    const headerHeight = 30;
    const lineHeight = 22;
    const padX = 14;
    const lines = spec.lines || [];

    let maxLineW = 180;
    for (const item of lines) {
      const text =
        typeof item === "string"
          ? item
          : `${item.prompt || "$"} ${item.cmd || ""}${item.output || ""}`;
      maxLineW = Math.max(
        maxLineW,
        this.measurer.measureLineWidth(text, 12, fontMono, 400, true)
      );
    }

    const width =
      typeof spec.width === "number"
        ? spec.width
        : Math.ceil(maxLineW + padX * 2 + 24);
    const height =
      typeof spec.height === "number"
        ? spec.height
        : Math.ceil(headerHeight + 10 + lines.length * lineHeight + 12);

    const decorations: PrimitiveDecoration[] = [
      {
        kind: "line",
        x: 0,
        y: headerHeight,
        x2: width,
        y2: headerHeight,
        stroke: "#1e293b",
        strokeWidth: 1,
      },
    ];

    ["#ef4444", "#f59e0b", "#10b981"].forEach((col, i) => {
      decorations.push({
        kind: "circle",
        x: 14 + i * 14,
        y: headerHeight / 2,
        r: 4,
        fill: col,
      });
    });

    decorations.push({
      kind: "text",
      x: width / 2,
      y: headerHeight / 2 + 4,
      text: spec.title || "bash",
      fontFamily: fontMono,
      fontSize: 11,
      textColor: "#94a3b8",
      textAnchor: "middle",
    });

    const subAnchors: SubAnchorRenderItem[] = [];

    lines.forEach((item, idx) => {
      const lineNum = idx + 1;
      const lineY = headerHeight + 8 + idx * lineHeight;
      const y = lineY + 14;
      const anchorId = `${id}.line_${lineNum}`;
      const itemTone =
        typeof item === "object" && item.tone ? item.tone : undefined;

      subAnchors.push({
        anchorId,
        x: 0,
        y: lineY,
        width,
        height: lineHeight,
        highlight: Boolean(itemTone),
        tone: itemTone,
      });

      decorations.push({
        kind: "code-line",
        anchorId,
        x: 2,
        y: lineY,
        width: width - 4,
        height: lineHeight,
        fill: "transparent",
      });

      if (typeof item === "string") {
        decorations.push({
          kind: "text",
          x: padX,
          y,
          text: item,
          fontFamily: fontMono,
          fontSize: 12,
          textColor: "#e2e8f0",
        });
      } else {
        const promptStr = item.prompt ?? "$";
        if (item.cmd) {
          decorations.push({
            kind: "text",
            x: padX,
            y,
            text: promptStr,
            fontFamily: fontMono,
            fontSize: 12,
            fontWeight: 700,
            textColor: "#34d399",
          });
          decorations.push({
            kind: "text",
            x: padX + 18,
            y,
            text: item.cmd,
            fontFamily: fontMono,
            fontSize: 12,
            textColor: "#f8fafc",
          });
        } else if (item.output) {
          const outColor = item.tone
            ? this.theme.colors.tones[item.tone].main
            : "#94a3b8";
          decorations.push({
            kind: "text",
            x: padX,
            y,
            text: item.output,
            fontFamily: fontMono,
            fontSize: 12,
            textColor: outColor,
          });
        }
      }
    });

    return {
      id,
      type: "terminal",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      decorations,
      subAnchors,
      children: [],
    };
  }

  private buildTableNode(spec: TableElementSpec): SceneNode {
    const id = spec.id || this.nextId("table");
    const style = resolveNodeStyle(
      spec.style,
      this.theme,
      "outlined",
      "neutral"
    );
    const fontSans = this.theme.typography.fontSans;
    const fontMono = this.theme.typography.fontMono;

    const headers = spec.headers || [];
    const rows = spec.rows || [];
    const colCount = Math.max(
      headers.length,
      ...rows.map((r) => r.length),
      1
    );

    const colWidths = new Array<number>(colCount).fill(72);
    const cellPadX = 14;
    const rowHeight = 32;
    const titleBarHeight = spec.title ? 30 : 0;
    const headerHeight = headers.length > 0 ? 32 : 0;

    headers.forEach((h, colIdx) => {
      const w =
        this.measurer.measureLineWidth(h, 12, fontSans, 600) + cellPadX * 2;
      colWidths[colIdx] = Math.max(colWidths[colIdx], w);
    });

    const getCellText = (cell: TableCellInput) =>
      typeof cell === "string" ? cell : cell.text;

    rows.forEach((row) => {
      row.forEach((cell, colIdx) => {
        const text = getCellText(cell);
        const w =
          this.measurer.measureLineWidth(text, 12, fontMono, 500, true) +
          cellPadX * 2;
        colWidths[colIdx] = Math.max(colWidths[colIdx], w);
      });
    });

    const totalWidth = colWidths.reduce((acc, w) => acc + w, 0);
    const totalHeight =
      titleBarHeight + headerHeight + rows.length * rowHeight;

    const decorations: PrimitiveDecoration[] = [];
    const subAnchors: SubAnchorRenderItem[] = [];
    const tonePalette = this.theme.colors.tones[style.tone];

    let cursorY = 0;

    if (spec.title) {
      decorations.push({
        kind: "rect",
        x: 1,
        y: 1,
        width: totalWidth - 2,
        height: titleBarHeight,
        rx: Math.max(0, style.radius - 1),
        fill: tonePalette.softBg,
      });
      decorations.push({
        kind: "text",
        x: cellPadX,
        y: titleBarHeight / 2 + 4,
        text: spec.title,
        fontFamily: fontSans,
        fontSize: 12,
        fontWeight: 600,
        textColor: style.textColor,
      });
      decorations.push({
        kind: "line",
        x: 0,
        y: titleBarHeight,
        x2: totalWidth,
        y2: titleBarHeight,
        stroke: style.stroke,
        strokeWidth: 1,
      });
      cursorY += titleBarHeight;
    }

    if (headers.length > 0) {
      let colX = 0;
      decorations.push({
        kind: "rect",
        x: 1,
        y: cursorY + 1,
        width: totalWidth - 2,
        height: headerHeight - 1,
        fill: this.theme.colors.surface,
      });
      headers.forEach((h, colIdx) => {
        const cw = colWidths[colIdx];
        decorations.push({
          kind: "text",
          x: colX + cellPadX,
          y: cursorY + headerHeight / 2 + 4,
          text: h,
          fontFamily: fontSans,
          fontSize: 11.5,
          fontWeight: 600,
          textColor: style.mutedTextColor,
        });
        colX += cw;
      });
      decorations.push({
        kind: "line",
        x: 0,
        y: cursorY + headerHeight,
        x2: totalWidth,
        y2: cursorY + headerHeight,
        stroke: style.stroke,
        strokeWidth: 1,
      });
      cursorY += headerHeight;
    }

    rows.forEach((row, rIdx) => {
      let colX = 0;
      const rowY = cursorY + rIdx * rowHeight;

      if (rIdx > 0) {
        decorations.push({
          kind: "line",
          x: 0,
          y: rowY,
          x2: totalWidth,
          y2: rowY,
          stroke: this.theme.colors.border,
          strokeWidth: 1,
        });
      }

      for (let cIdx = 0; cIdx < colCount; cIdx++) {
        const cw = colWidths[cIdx];
        const cell = row[cIdx] ?? "";
        const cellText = getCellText(cell);
        const cellTone: SemanticTone | undefined =
          typeof cell === "object" ? cell.tone : undefined;
        const anchorId = `${id}.cell_${rIdx}_${cIdx}`;

        subAnchors.push({
          anchorId,
          x: colX,
          y: rowY,
          width: cw,
          height: rowHeight,
          highlight: Boolean(cellTone),
          tone: cellTone,
        });

        decorations.push({
          kind: "table-cell",
          anchorId,
          x: colX + 1,
          y: rowY + 1,
          width: cw - 2,
          height: rowHeight - 2,
          fill: cellTone
            ? this.theme.colors.tones[cellTone].softBg
            : "transparent",
        });

        if (cIdx > 0) {
          decorations.push({
            kind: "line",
            x: colX,
            y: rowY,
            x2: colX,
            y2: rowY + rowHeight,
            stroke: this.theme.colors.border,
            strokeWidth: 1,
          });
        }

        decorations.push({
          kind: "text",
          x: colX + cellPadX,
          y: rowY + rowHeight / 2 + 4,
          text: cellText,
          fontFamily: fontMono,
          fontSize: 12,
          fontWeight: cellTone ? 600 : 400,
          textColor: cellTone
            ? this.theme.colors.tones[cellTone].main
            : style.textColor,
        });

        colX += cw;
      }
    });

    return {
      id,
      type: "table",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width: totalWidth,
      height: totalHeight,
      style,
      shape: "rect",
      decorations,
      subAnchors,
      children: [],
    };
  }

  private buildGroupOrWindowNode(
    spec: GroupElementSpec,
    compact: boolean
  ): SceneNode {
    const id = spec.id || this.nextId(spec.type);
    const defaultVariant = spec.type === "window" ? "outlined" : "dashed";
    const style = resolveNodeStyle(
      spec.style,
      this.theme,
      defaultVariant,
      "neutral"
    );

    const headerHeight =
      spec.type === "window" ? 36 : spec.title ? 34 : 0;
    const pad = normalizePadding(spec.padding, [18, 20, 20, 20]);

    const childSpecs = spec.children || [];
    const childNodes = childSpecs.map((c) => this.measureElement(c, compact));

    const layout: LayoutConfig = spec.layout || {
      type: "flex",
      direction: "column",
      gap: 16,
    };

    const childrenBox = this.positionSiblings(
      childNodes,
      childSpecs,
      layout,
      compact
    );

    const titleWidth = spec.title
      ? this.measurer.measureLineWidth(
          spec.title,
          12.5,
          this.theme.typography.fontSans,
          600
        ) + 40
      : 0;

    const width =
      typeof spec.width === "number"
        ? spec.width
        : Math.ceil(
            Math.max(childrenBox.width + pad[1] + pad[3], titleWidth, 180)
          );
    const height =
      typeof spec.height === "number"
        ? spec.height
        : Math.ceil(headerHeight + childrenBox.height + pad[0] + pad[2]);

    // Offset children by padding and header
    for (const child of childNodes) {
      child.x += pad[3];
      child.y += headerHeight + pad[0];
    }

    const decorations: PrimitiveDecoration[] = [];
    const tonePalette = this.theme.colors.tones[style.tone];

    if (spec.type === "window") {
      decorations.push({
        kind: "line",
        x: 0,
        y: headerHeight,
        x2: width,
        y2: headerHeight,
        stroke: style.stroke,
        strokeWidth: 1,
      });
      ["#ef4444", "#f59e0b", "#10b981"].forEach((col, i) => {
        decorations.push({
          kind: "circle",
          x: 16 + i * 14,
          y: headerHeight / 2,
          r: 4.2,
          fill: col,
        });
      });
      if (spec.url || spec.title) {
        const barW = Math.min(width - 110, 260);
        const barX = (width - barW) / 2;
        decorations.push({
          kind: "rect",
          x: barX,
          y: 7,
          width: barW,
          height: 22,
          rx: 6,
          fill: this.theme.colors.surface,
          stroke: this.theme.colors.border,
          strokeWidth: 1,
        });
        decorations.push({
          kind: "text",
          x: width / 2,
          y: headerHeight / 2 + 4,
          text: spec.url || spec.title || "",
          fontFamily: this.theme.typography.fontMono,
          fontSize: 11,
          textColor: style.mutedTextColor,
          textAnchor: "middle",
        });
      }
    } else if (spec.title) {
      // Group badge header pill
      const pillW =
        this.measurer.measureLineWidth(
          spec.title,
          12,
          this.theme.typography.fontSans,
          600
        ) + 20;
      decorations.push({
        kind: "rect",
        x: 14,
        y: 10,
        width: pillW,
        height: 22,
        rx: 6,
        fill: tonePalette.softBg,
        stroke: tonePalette.softBorder,
        strokeWidth: 1,
      });
      decorations.push({
        kind: "text",
        x: 24,
        y: 25,
        text: spec.title,
        fontFamily: this.theme.typography.fontSans,
        fontSize: 11.5,
        fontWeight: 600,
        textColor:
          style.tone === "neutral" ? style.textColor : tonePalette.main,
      });
    }

    return {
      id,
      type: spec.type,
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      decorations,
      subAnchors: [],
      children: childNodes,
    };
  }

  private buildCalloutNode(spec: CalloutElementSpec): SceneNode {
    const id = spec.id || this.nextId("callout");
    const style = resolveNodeStyle(spec.style, this.theme, "soft", "warning");
    style.radius = 8;

    const fontSans = this.theme.typography.fontSans;
    const block = this.measurer.measureBlock(spec.text, {
      fontFamily: fontSans,
      fontSize: 11.5,
      lineHeight: 17,
      maxWidth: 210,
    });

    const padX = 12;
    const padY = 8;
    const width =
      typeof spec.width === "number"
        ? spec.width
        : Math.ceil(block.width + padX * 2);
    const height =
      typeof spec.height === "number"
        ? spec.height
        : Math.ceil(block.height + padY * 2);

    const decorations: PrimitiveDecoration[] = [];
    block.lines.forEach((line, idx) => {
      decorations.push({
        kind: "text",
        x: padX,
        y: padY + 12 + idx * block.lineHeight,
        text: line.text,
        fontFamily: fontSans,
        fontSize: 11.5,
        fontWeight: 500,
        textColor: style.textColor,
      });
    });

    return {
      id,
      type: "callout",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      calloutTail: spec.target
        ? {
            targetId: spec.target,
            side: spec.side || "top",
          }
        : undefined,
      decorations,
      subAnchors: [],
      children: [],
    };
  }

  private buildBadgeNode(spec: BadgeElementSpec): SceneNode {
    const id = spec.id || this.nextId("badge");
    const style = resolveNodeStyle(spec.style, this.theme, "filled", "primary");
    style.radius = 999;

    const textW = this.measurer.measureLineWidth(
      spec.text,
      11.5,
      this.theme.typography.fontMono,
      600,
      true
    );
    const width =
      typeof spec.width === "number" ? spec.width : Math.ceil(textW + 24);
    const height = typeof spec.height === "number" ? spec.height : 26;

    return {
      id,
      type: "badge",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      decorations: [
        {
          kind: "text",
          x: width / 2,
          y: height / 2 + 4,
          text: spec.text,
          fontFamily: this.theme.typography.fontMono,
          fontSize: 11.5,
          fontWeight: 600,
          textColor: style.textColor,
          textAnchor: "middle",
        },
      ],
      subAnchors: [],
      children: [],
    };
  }

  private buildTextNode(spec: TextElementSpec): SceneNode {
    const id = spec.id || this.nextId("text");
    const style = resolveNodeStyle(spec.style, this.theme, "ghost", "neutral");
    const sizeMap: Record<string, number> = {
      xs: 11,
      sm: 12,
      md: 14,
      lg: 17,
      xl: 22,
    };
    const fontSize =
      typeof spec.fontSize === "number"
        ? spec.fontSize
        : sizeMap[spec.fontSize || "md"] || 14;
    const fontFamily = spec.mono
      ? this.theme.typography.fontMono
      : this.theme.typography.fontSans;
    const fontWeight =
      spec.fontWeight === "bold"
        ? 700
        : spec.fontWeight === "medium"
        ? 600
        : 400;

    const block = this.measurer.measureBlock(spec.text, {
      fontFamily,
      fontSize,
      fontWeight,
      maxWidth: spec.maxWidth,
      mono: spec.mono,
    });

    const width =
      typeof spec.width === "number" ? spec.width : Math.ceil(block.width + 4);
    const height =
      typeof spec.height === "number"
        ? spec.height
        : Math.ceil(block.height + 4);

    const textColor =
      spec.style?.tone && spec.style.tone !== "neutral"
        ? this.theme.colors.tones[spec.style.tone].main
        : this.theme.colors.text;

    const decorations: PrimitiveDecoration[] = block.lines.map((line, i) => ({
      kind: "text",
      x:
        spec.align === "center"
          ? width / 2
          : spec.align === "right"
          ? width
          : 0,
      y: fontSize + i * block.lineHeight,
      text: line.text,
      fontFamily,
      fontSize,
      fontWeight,
      textColor,
      textAnchor:
        spec.align === "center"
          ? "middle"
          : spec.align === "right"
          ? "end"
          : "start",
    }));

    return {
      id,
      type: "text",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "none",
      decorations,
      subAnchors: [],
      children: [],
    };
  }

  private buildIconNode(spec: IconElementSpec): SceneNode {
    const id = spec.id || this.nextId("icon");
    const style = resolveNodeStyle(spec.style, this.theme, "soft", "primary");
    const iconSize = spec.size || 24;
    const boxSize = iconSize + 20;
    const labelW = spec.label
      ? this.measurer.measureLineWidth(
          spec.label,
          12,
          this.theme.typography.fontSans,
          500
        )
      : 0;
    const width = Math.max(boxSize, labelW + 12);
    const height = spec.label ? boxSize + 22 : boxSize;

    const decorations: PrimitiveDecoration[] = [
      {
        kind: "icon",
        iconName: spec.name,
        x: (width - iconSize) / 2,
        y: (boxSize - iconSize) / 2,
        width: iconSize,
        height: iconSize,
        stroke:
          style.variant === "filled"
            ? style.textColor
            : this.theme.colors.tones[style.tone].main,
      },
    ];

    if (spec.label) {
      decorations.push({
        kind: "text",
        x: width / 2,
        y: boxSize + 15,
        text: spec.label,
        fontFamily: this.theme.typography.fontSans,
        fontSize: 12,
        fontWeight: 500,
        textColor: this.theme.colors.text,
        textAnchor: "middle",
      });
    }

    return {
      id,
      type: "icon",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      decorations,
      subAnchors: [],
      children: [],
    };
  }

  private buildPolygonNode(spec: PolygonElementSpec): SceneNode {
    const id = spec.id || this.nextId("poly");
    const style = resolveNodeStyle(spec.style, this.theme, "soft", "primary");
    const width = typeof spec.width === "number" ? spec.width : 110;
    const height = typeof spec.height === "number" ? spec.height : 100;

    let points = spec.points;
    if (!points || points.length === 0) {
      const sides = Math.max(3, spec.sides || 6);
      const startAngle = sides === 6 ? 0 : -Math.PI / 2;
      const rawPts: [number, number][] = [];
      let minPx = Infinity;
      let maxPx = -Infinity;
      let minPy = Infinity;
      let maxPy = -Infinity;
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides + startAngle;
        const px = Math.cos(angle);
        const py = Math.sin(angle);
        rawPts.push([px, py]);
        minPx = Math.min(minPx, px);
        maxPx = Math.max(maxPx, px);
        minPy = Math.min(minPy, py);
        maxPy = Math.max(maxPy, py);
      }
      const spanX = Math.max(1e-3, maxPx - minPx);
      const spanY = Math.max(1e-3, maxPy - minPy);
      const pad = 2;
      points = rawPts.map(([px, py]) => [
        Math.round(pad + ((px - minPx) / spanX) * (width - pad * 2)),
        Math.round(pad + ((py - minPy) / spanY) * (height - pad * 2)),
      ]);
    }

    const decorations: PrimitiveDecoration[] = [];
    if (spec.label) {
      decorations.push({
        kind: "text",
        x: width / 2,
        y: height / 2 + 4,
        text: spec.label,
        fontFamily: this.theme.typography.fontSans,
        fontSize: 13,
        fontWeight: 600,
        textColor: style.textColor,
        textAnchor: "middle",
      });
    }

    return {
      id,
      type: "polygon",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "polygon",
      polygonPoints: points,
      decorations,
      subAnchors: [],
      children: [],
    };
  }

  private buildPathNode(spec: PathElementSpec): SceneNode {
    const id = spec.id || this.nextId("path");
    const style = resolveNodeStyle(
      spec.style,
      this.theme,
      spec.closed ? "soft" : "ghost",
      "primary"
    );
    if (!spec.closed) {
      style.fill = "none";
      style.stroke = this.theme.colors.tones[style.tone].main;
      style.strokeWidth = 2;
    }

    return {
      id,
      type: "path",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width: typeof spec.width === "number" ? spec.width : 120,
      height: typeof spec.height === "number" ? spec.height : 80,
      style,
      shape: "path",
      pathD: spec.d,
      decorations: [],
      subAnchors: [],
      children: [],
    };
  }

  private buildPrimitiveShapeNode(spec: RectElementSpec): SceneNode {
    const id = spec.id || this.nextId(spec.type);
    const style = resolveNodeStyle(spec.style, this.theme, "soft", "primary");
    const fontSans = this.theme.typography.fontSans;
    const labelW = spec.label
      ? this.measurer.measureLineWidth(spec.label, 13, fontSans, 600)
      : 0;
    const subW = spec.sublabel
      ? this.measurer.measureLineWidth(spec.sublabel, 11, fontSans, 400)
      : 0;

    const minW = spec.type === "diamond" ? Math.max(labelW, subW) + 56 : Math.max(labelW, subW) + 36;
    const width =
      typeof spec.width === "number"
        ? spec.width
        : spec.type === "circle"
        ? Math.max(minW, 76)
        : Math.max(minW, 120);
    const height =
      typeof spec.height === "number"
        ? spec.height
        : spec.type === "circle"
        ? width
        : spec.type === "diamond"
        ? 76
        : spec.sublabel
        ? 64
        : 48;

    const decorations: PrimitiveDecoration[] = [];
    if (spec.label) {
      decorations.push({
        kind: "text",
        x: width / 2,
        y: spec.sublabel ? height / 2 - 2 : height / 2 + 4.5,
        text: spec.label,
        fontFamily: fontSans,
        fontSize: 13,
        fontWeight: 600,
        textColor: style.textColor,
        textAnchor: "middle",
      });
    }
    if (spec.sublabel) {
      decorations.push({
        kind: "text",
        x: width / 2,
        y: height / 2 + 15,
        text: spec.sublabel,
        fontFamily: fontSans,
        fontSize: 11,
        textColor: style.mutedTextColor,
        textAnchor: "middle",
      });
    }

    return {
      id,
      type: spec.type,
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: spec.type,
      decorations,
      subAnchors: [],
      children: [],
    };
  }

  // ==========================================================================
  // Sibling Layout Engine: Flex / Grid / Topological Relative Placement
  // ==========================================================================

  private collectDescendantIds(node: SceneNode, out: Set<string>): void {
    out.add(node.id);
    for (const child of node.children) {
      this.collectDescendantIds(child, out);
    }
  }

  /**
   * Computes minimum horizontal and vertical gaps required by connections
   * (especially labeled connections) between any two sibling sets in the current container.
   */
  private buildSiblingConnectionGapResolver(
    nodes: SceneNode[],
    compact: boolean
  ): {
    getRequiredGap: (
      groupA: Iterable<string>,
      groupB: Iterable<string>,
      axis: "horizontal" | "vertical"
    ) => number;
  } {
    const siblingByDescendant = new Map<string, string>();
    for (const n of nodes) {
      const owned = new Set<string>();
      this.collectDescendantIds(n, owned);
      for (const id of owned) {
        siblingByDescendant.set(id, n.id);
      }
    }

    interface PairGapReq {
      sibA: string;
      sibB: string;
      horizGap: number;
      vertGap: number;
    }

    const reqs: PairGapReq[] = [];
    for (const conn of this.connections) {
      const fromBase = conn.from.split("@")[0].split(".")[0].trim();
      const toBase = conn.to.split("@")[0].split(".")[0].trim();
      const sibA = siblingByDescendant.get(fromBase);
      const sibB = siblingByDescendant.get(toBase);
      if (!sibA || !sibB || sibA === sibB) continue;

      const labelW = conn.label
        ? this.measurer.measureLineWidth(
            conn.label,
            11,
            this.theme.typography.fontSans,
            600
          ) + 18
        : 0;

      const horizGap = conn.label ? Math.max(64, Math.ceil(labelW + 44)) : 40;
      const vertGap = conn.label ? (compact ? 56 : 64) : 30;
      reqs.push({ sibA, sibB, horizGap, vertGap });
    }

    return {
      getRequiredGap: (groupA, groupB, axis) => {
        const setA = new Set(groupA);
        const setB = new Set(groupB);
        let maxReq = 0;
        for (const r of reqs) {
          if (
            (setA.has(r.sibA) && setB.has(r.sibB)) ||
            (setA.has(r.sibB) && setB.has(r.sibA))
          ) {
            maxReq = Math.max(
              maxReq,
              axis === "horizontal" ? r.horizGap : r.vertGap
            );
          }
        }
        return maxReq;
      },
    };
  }

  private positionSiblings(
    nodes: SceneNode[],
    specs: ElementSpec[],
    layout: LayoutConfig,
    compact: boolean
  ): { width: number; height: number } {
    if (nodes.length === 0) return { width: 0, height: 0 };

    const hasExplicitRelativeOrAbsolute = specs.some(
      (s) => s.place !== undefined || s.x !== undefined || s.y !== undefined
    );

    if (layout.type === "grid") {
      return this.layoutGrid(nodes, layout, compact);
    }

    if (layout.type === "flex" && !hasExplicitRelativeOrAbsolute) {
      return this.layoutFlex(nodes, layout, compact);
    }

    // Topological relative + free placement
    return this.layoutTopologicalRelative(nodes, specs, layout, compact);
  }

  private layoutFlex(
    nodes: SceneNode[],
    layout: LayoutConfig,
    compact: boolean
  ): { width: number; height: number } {
    const rawDir = layout.direction || "column";
    const dir = compact && rawDir === "row" ? "column" : rawDir;
    const baseGap = layout.gap ?? 18;
    const align = layout.align || (dir === "row" ? "center" : "stretch");
    const gapResolver = this.buildSiblingConnectionGapResolver(nodes, compact);

    if (dir === "column") {
      const maxW = nodes.reduce((m, n) => Math.max(m, n.width), 0);
      let cursorY = 0;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (align === "stretch") {
          n.width = maxW;
          n.x = 0;
        } else if (align === "center") {
          n.x = (maxW - n.width) / 2;
        } else if (align === "end") {
          n.x = maxW - n.width;
        } else {
          n.x = 0;
        }
        n.y = cursorY;
        const nextNode = nodes[i + 1];
        const stepGap = nextNode
          ? Math.max(
              baseGap,
              gapResolver.getRequiredGap([n.id], [nextNode.id], "vertical")
            )
          : 0;
        cursorY += n.height + stepGap;
      }
      return { width: maxW, height: Math.max(0, cursorY) };
    } else {
      const maxH = nodes.reduce((m, n) => Math.max(m, n.height), 0);
      let cursorX = 0;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (align === "center") {
          n.y = (maxH - n.height) / 2;
        } else if (align === "end") {
          n.y = maxH - n.height;
        } else {
          n.y = 0;
        }
        n.x = cursorX;
        const nextNode = nodes[i + 1];
        const stepGap = nextNode
          ? Math.max(
              baseGap,
              gapResolver.getRequiredGap([n.id], [nextNode.id], "horizontal")
            )
          : 0;
        cursorX += n.width + stepGap;
      }
      return { width: Math.max(0, cursorX), height: maxH };
    }
  }

  private layoutGrid(
    nodes: SceneNode[],
    layout: LayoutConfig,
    compact: boolean
  ): { width: number; height: number } {
    const cols = compact ? 1 : Math.max(1, layout.columns || 2);
    const gap = layout.gap ?? 18;
    const rows = Math.ceil(nodes.length / cols);

    const colWidths = new Array<number>(cols).fill(0);
    const rowHeights = new Array<number>(rows).fill(0);

    nodes.forEach((n, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      colWidths[c] = Math.max(colWidths[c], n.width);
      rowHeights[r] = Math.max(rowHeights[r], n.height);
    });

    nodes.forEach((n, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      n.x =
        colWidths.slice(0, c).reduce((a, b) => a + b, 0) + c * gap;
      n.y =
        rowHeights.slice(0, r).reduce((a, b) => a + b, 0) + r * gap;
    });

    const totalW =
      colWidths.reduce((a, b) => a + b, 0) + Math.max(0, cols - 1) * gap;
    const totalH =
      rowHeights.reduce((a, b) => a + b, 0) + Math.max(0, rows - 1) * gap;
    return { width: totalW, height: totalH };
  }

  private layoutTopologicalRelative(
    nodes: SceneNode[],
    specs: ElementSpec[],
    layout: LayoutConfig,
    compact: boolean
  ): { width: number; height: number } {
    const nodeById = new Map<string, SceneNode>();
    const specById = new Map<string, ElementSpec>();

    nodes.forEach((n, i) => {
      nodeById.set(n.id, n);
      specById.set(n.id, specs[i]);
    });

    const gapResolver = this.buildSiblingConnectionGapResolver(nodes, compact);

    // Build column groups (connected via below/above) so horizontal gaps account for
    // connections to any node stacked in the same vertical column (e.g. token_table + svg_dom).
    const colGroupById = new Map<string, Set<string>>();
    for (const n of nodes) {
      colGroupById.set(n.id, new Set([n.id]));
    }
    if (!compact) {
      for (let i = 0; i < nodes.length; i++) {
        const p = specs[i].place;
        const vRef = p?.below || p?.above;
        if (vRef && colGroupById.has(vRef)) {
          const gA = colGroupById.get(nodes[i].id)!;
          const gB = colGroupById.get(vRef)!;
          const merged = new Set<string>([...gA, ...gB]);
          for (const id of merged) {
            colGroupById.set(id, merged);
          }
        }
      }
    }

    // Build dependency graph for relative placement
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    nodes.forEach((n) => {
      inDegree.set(n.id, 0);
      adj.set(n.id, []);
    });

    const getRefId = (place?: PlaceSpec): string | undefined => {
      if (!place) return undefined;
      return place.rightOf || place.leftOf || place.below || place.above;
    };

    nodes.forEach((n, idx) => {
      const refId = getRefId(specs[idx].place);
      if (refId && nodeById.has(refId) && refId !== n.id) {
        adj.get(refId)!.push(n.id);
        inDegree.set(n.id, (inDegree.get(n.id) || 0) + 1);
      }
    });

    // Kahn's topological sort
    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    const order: string[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      order.push(curr);
      for (const next of adj.get(curr) || []) {
        inDegree.set(next, inDegree.get(next)! - 1);
        if (inDegree.get(next) === 0) {
          queue.push(next);
        }
      }
    }

    // Add any cycle-Remaining nodes in declaration order
    for (const n of nodes) {
      if (!order.includes(n.id)) order.push(n.id);
    }

    // Pre-compute normalized PlaceSpec and symmetric fan-out offsets for nodes sharing (refId, direction)
    const effPlaceById = new Map<string, PlaceSpec>();
    const fanGroups = new Map<string, string[]>();

    for (const id of order) {
      const spec = specById.get(id)!;
      if (spec.x !== undefined || spec.y !== undefined || !spec.place) continue;
      const rawPlace = spec.place;
      const eff: PlaceSpec = compact
        ? {
            ...rawPlace,
            rightOf: undefined,
            leftOf: undefined,
            below: rawPlace.below || rawPlace.rightOf,
            above: rawPlace.above || rawPlace.leftOf,
            gap: rawPlace.gap ? Math.min(rawPlace.gap, 36) : 28,
          }
        : rawPlace;
      effPlaceById.set(id, eff);

      if (!eff.offset) {
        const dirKey = eff.rightOf
          ? `rightOf::${eff.rightOf}`
          : eff.leftOf
          ? `leftOf::${eff.leftOf}`
          : eff.below
          ? `below::${eff.below}`
          : eff.above
          ? `above::${eff.above}`
          : undefined;
        if (dirKey) {
          const list = fanGroups.get(dirKey) || [];
          list.push(id);
          fanGroups.set(dirKey, list);
        }
      }
    }

    const fanOffsetById = new Map<string, { axis: "x" | "y"; offsetFromRefCenter: number }>();
    fanGroups.forEach((groupIds, dirKey) => {
      if (groupIds.length <= 1) return;
      const isHorizDir =
        dirKey.startsWith("rightOf::") || dirKey.startsWith("leftOf::");

      if (isHorizDir) {
        // Stack fan-out siblings vertically and center around ref's vertical midpoint
        let totalH = 0;
        const stepGaps: number[] = [];
        for (let i = 0; i < groupIds.length; i++) {
          const n = nodeById.get(groupIds[i])!;
          totalH += n.height;
          if (i < groupIds.length - 1) {
            const nextId = groupIds[i + 1];
            const g = Math.max(
              24,
              gapResolver.getRequiredGap([n.id], [nextId], "vertical")
            );
            stepGaps.push(g);
            totalH += g;
          }
        }
        let cursor = -totalH / 2;
        for (let i = 0; i < groupIds.length; i++) {
          const n = nodeById.get(groupIds[i])!;
          fanOffsetById.set(n.id, {
            axis: "y",
            offsetFromRefCenter: cursor + n.height / 2,
          });
          cursor += n.height + (stepGaps[i] || 0);
        }
      } else if (!compact) {
        // Spread below/above fan-out siblings horizontally and center around ref's horizontal midpoint
        let totalW = 0;
        const stepGaps: number[] = [];
        for (let i = 0; i < groupIds.length; i++) {
          const n = nodeById.get(groupIds[i])!;
          totalW += n.width;
          if (i < groupIds.length - 1) {
            const nextId = groupIds[i + 1];
            const g = Math.max(
              28,
              gapResolver.getRequiredGap([n.id], [nextId], "horizontal")
            );
            stepGaps.push(g);
            totalW += g;
          }
        }
        let cursor = -totalW / 2;
        for (let i = 0; i < groupIds.length; i++) {
          const n = nodeById.get(groupIds[i])!;
          fanOffsetById.set(n.id, {
            axis: "x",
            offsetFromRefCenter: cursor + n.width / 2,
          });
          cursor += n.width + (stepGaps[i] || 0);
        }
      }
    });

    let autoFlowCursorX = 0;
    let autoFlowCursorY = 0;
    let prevAutoFlowId: string | undefined;
    const defaultFlowRow =
      !compact && (layout.direction === "row" || layout.type === "free");
    const placedNodes: SceneNode[] = [];

    const nodesOverlap = (a: SceneNode, b: SceneNode, pad = 20): boolean =>
      a.x - pad < b.x + b.width &&
      a.x + a.width + pad > b.x &&
      a.y - pad < b.y + b.height &&
      a.y + a.height + pad > b.y;

    for (const id of order) {
      const node = nodeById.get(id)!;
      const spec = specById.get(id)!;
      const place = effPlaceById.get(id);

      if (spec.x !== undefined || spec.y !== undefined) {
        node.x = spec.x ?? 0;
        node.y = spec.y ?? 0;
        placedNodes.push(node);
        continue;
      }

      if (place) {
        const refId = getRefId(place);
        const ref = refId ? nodeById.get(refId) : undefined;
        const baseGap = place.gap ?? 44;
        const align = place.align || "center";
        const [ox, oy] = place.offset || [0, 0];
        const fanOffset = fanOffsetById.get(id);

        if (ref) {
          const isHorizPlace = Boolean(place.rightOf || place.leftOf);
          const groupA = isHorizPlace
            ? colGroupById.get(ref.id) || [ref.id]
            : [ref.id];
          const groupB = isHorizPlace
            ? colGroupById.get(node.id) || [node.id]
            : [node.id];
          const connReqGap = gapResolver.getRequiredGap(
            groupA,
            groupB,
            isHorizPlace ? "horizontal" : "vertical"
          );
          const gap = Math.max(baseGap, connReqGap);

          const computeAlignedY = (): number => {
            if (fanOffset && fanOffset.axis === "y") {
              return (
                ref.y +
                ref.height / 2 +
                fanOffset.offsetFromRefCenter -
                node.height / 2 +
                oy
              );
            }
            return align === "start"
              ? ref.y + oy
              : align === "end"
              ? ref.y + ref.height - node.height + oy
              : ref.y + (ref.height - node.height) / 2 + oy;
          };

          const computeAlignedX = (): number => {
            if (fanOffset && fanOffset.axis === "x") {
              return (
                ref.x +
                ref.width / 2 +
                fanOffset.offsetFromRefCenter -
                node.width / 2 +
                ox
              );
            }
            return align === "start"
              ? ref.x + ox
              : align === "end"
              ? ref.x + ref.width - node.width + ox
              : ref.x + (ref.width - node.width) / 2 + ox;
          };

          if (place.rightOf) {
            node.x = ref.x + ref.width + gap + ox;
            node.y = computeAlignedY();
          } else if (place.leftOf) {
            node.x = ref.x - node.width - gap + ox;
            node.y = computeAlignedY();
          } else if (place.below) {
            node.y = ref.y + ref.height + gap + oy;
            node.x = computeAlignedX();
          } else if (place.above) {
            node.y = ref.y - node.height - gap + oy;
            node.x = computeAlignedX();
          }
        }
      } else {
        // Unpositioned node: flow sequentially
        if (prevAutoFlowId) {
          const prevNode = nodeById.get(prevAutoFlowId)!;
          if (defaultFlowRow) {
            const reqGap = gapResolver.getRequiredGap(
              [prevAutoFlowId],
              [node.id],
              "horizontal"
            );
            autoFlowCursorX =
              prevNode.x + prevNode.width + Math.max(layout.gap ?? 32, reqGap);
          } else {
            const reqGap = gapResolver.getRequiredGap(
              [prevAutoFlowId],
              [node.id],
              "vertical"
            );
            autoFlowCursorY =
              prevNode.y + prevNode.height + Math.max(layout.gap ?? 24, reqGap);
          }
        }
        node.x = autoFlowCursorX;
        node.y = autoFlowCursorY;
        prevAutoFlowId = node.id;
        if (defaultFlowRow) {
          autoFlowCursorX += node.width + (layout.gap ?? 32);
        } else {
          autoFlowCursorY += node.height + (layout.gap ?? 24);
        }
      }

      // AABB collision guard: nudge node if it overlaps any already-placed sibling
      let guardIter = 0;
      while (guardIter < 16) {
        const hit = placedNodes.find((p) => nodesOverlap(node, p, 20));
        if (!hit) break;
        if (place?.above) {
          node.y = hit.y - node.height - 24;
        } else if (place?.leftOf) {
          node.x = hit.x - node.width - 28;
        } else {
          node.y = hit.y + hit.height + 24;
        }
        guardIter++;
      }

      placedNodes.push(node);
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }

    if (minX !== 0 || minY !== 0) {
      for (const n of nodes) {
        n.x -= minX;
        n.y -= minY;
      }
    }

    return {
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }
}
