/**
 * millus - Schema & SceneGraph Type Definitions
 */

export type SemanticTone =
  | "neutral"
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type SurfaceVariant =
  | "soft"
  | "filled"
  | "outlined"
  | "dashed"
  | "ghost";

export type PresetStyle = "clean" | "sketch" | "blueprint";
export type ResponsiveMode = "scale" | "reflow";

export interface SemanticStyleSpec {
  tone?: SemanticTone;
  variant?: SurfaceVariant;
  elevation?: "none" | "sm" | "md";
  radius?: "none" | "sm" | "md" | "lg" | "full" | number;
  opacity?: number;
  rough?: boolean;
}

export interface PlaceSpec {
  rightOf?: string;
  leftOf?: string;
  below?: string;
  above?: string;
  gap?: number;
  align?: "start" | "center" | "end";
  offset?: [number, number];
}

export interface LayoutConfig {
  type: "flex" | "grid" | "free";
  direction?: "row" | "column";
  gap?: number;
  columns?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "space-between";
}

export interface BaseElementSpec {
  id?: string;
  width?: number | "auto";
  height?: number | "auto";
  padding?: number | [number, number] | [number, number, number, number];
  x?: number;
  y?: number;
  place?: PlaceSpec;
  layout?: LayoutConfig;
  style?: SemanticStyleSpec;
}

export interface RectElementSpec extends BaseElementSpec {
  type: "rect" | "diamond" | "circle" | "ellipse" | "cylinder" | "queue";
  label?: string;
  sublabel?: string;
  icon?: string;
}

export interface PolygonElementSpec extends BaseElementSpec {
  type: "polygon";
  points?: [number, number][];
  sides?: number;
  label?: string;
}

export interface PathElementSpec extends BaseElementSpec {
  type: "path";
  d: string;
  closed?: boolean;
}

export interface TextElementSpec extends BaseElementSpec {
  type: "text";
  text: string;
  maxWidth?: number;
  align?: "left" | "center" | "right";
  fontSize?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  fontWeight?: "normal" | "medium" | "bold";
  mono?: boolean;
}

export interface IconElementSpec extends BaseElementSpec {
  type: "icon";
  name: string;
  size?: number;
  label?: string;
}

export interface GroupElementSpec extends BaseElementSpec {
  type: "group" | "window";
  title?: string;
  subtitle?: string;
  url?: string;
  icon?: string;
  children: ElementSpec[];
}

export interface CardElementSpec extends BaseElementSpec {
  type: "card";
  title: string;
  subtitle?: string;
  icon?: string;
  badge?: string;
  body?: string;
  children?: ElementSpec[];
}

export interface CodeBlockElementSpec extends BaseElementSpec {
  type: "code-block";
  title?: string;
  lang?: string;
  code: string;
  highlightLines?: number[];
}

export interface TerminalLineSpec {
  prompt?: string;
  cmd?: string;
  output?: string;
  tone?: SemanticTone;
}

export interface TerminalElementSpec extends BaseElementSpec {
  type: "terminal";
  title?: string;
  lines: Array<string | TerminalLineSpec>;
}

export type TableCellInput =
  | string
  | {
      text: string;
      tone?: SemanticTone;
      mono?: boolean;
    };

export interface TableElementSpec extends BaseElementSpec {
  type: "table";
  title?: string;
  headers?: string[];
  rows: TableCellInput[][];
}

export interface BadgeElementSpec extends BaseElementSpec {
  type: "badge";
  text: string;
  icon?: string;
}

export interface CalloutElementSpec extends BaseElementSpec {
  type: "callout";
  text: string;
  target?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export interface BitfieldSegmentSpec {
  name: string;
  bits: number | string;
  value?: string;
  tone?: SemanticTone;
}

export interface BitfieldElementSpec extends BaseElementSpec {
  type: "bitfield";
  title?: string;
  totalBits?: number;
  fields: BitfieldSegmentSpec[];
}

export interface SequenceActorSpec {
  id: string;
  label: string;
  sublabel?: string;
  tone?: SemanticTone;
}

export interface SequenceMessageSpec {
  from: string;
  to: string;
  label: string;
  type?: "sync" | "async" | "reply";
  tone?: SemanticTone;
  note?: string;
}

export interface SequenceElementSpec extends BaseElementSpec {
  type: "sequence";
  title?: string;
  actors: SequenceActorSpec[];
  messages: SequenceMessageSpec[];
}

export type ElementSpec =
  | RectElementSpec
  | PolygonElementSpec
  | PathElementSpec
  | TextElementSpec
  | IconElementSpec
  | GroupElementSpec
  | CardElementSpec
  | CodeBlockElementSpec
  | TerminalElementSpec
  | TableElementSpec
  | BadgeElementSpec
  | CalloutElementSpec
  | BitfieldElementSpec
  | SequenceElementSpec;

export interface ConnectionAnimationSpec {
  type?: "none" | "flow" | "pulse" | "bidirectional";
  speed?: "slow" | "normal" | "fast";
}

export interface ConnectionSpec {
  id?: string;
  from: string;
  to: string;
  label?: string;
  labelPosition?: number | "start" | "center" | "end";
  labelOffset?: [number, number];
  labelSide?: "center" | "top" | "bottom" | "left" | "right";
  routing?: "orthogonal" | "curved" | "straight";
  curveOffset?: number;
  cornerRadius?: number;
  stub?: number;
  startMarker?: "none" | "arrow" | "dot" | "diamond";
  endMarker?: "none" | "arrow" | "dot" | "diamond";
  tone?: SemanticTone;
  strokeStyle?: "solid" | "dashed" | "dotted";
  strokeWidth?: "thin" | "normal" | "thick";
  animation?: ConnectionAnimationSpec | boolean;
}

export interface IllustrationSpec {
  version?: "1.0";
  title?: string;
  canvas?: {
    width?: number | "auto";
    height?: number | "auto";
    padding?: number | [number, number, number, number];
    background?: "transparent" | "surface" | "dots" | "grid";
    layout?: LayoutConfig;
  };
  style?: {
    preset?: PresetStyle;
    roughness?: number;
    fontFamily?: "sans" | "mono";
  };
  elements: ElementSpec[];
  connections?: ConnectionSpec[];
}

// ============================================================================
// Scene Graph & Runtime Types
// ============================================================================

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  ownerNodeId?: string;
  parentGroupId?: string;
  shape?: SceneNode["shape"];
}

export interface TonePalette {
  main: string;
  softBg: string;
  softBorder: string;
  filledText: string;
}

export interface ResolvedThemeTokens {
  mode: "light" | "dark";
  colors: {
    bg: string;
    surface: string;
    surfaceElevated: string;
    codeBg: string;
    codeText: string;
    text: string;
    textMuted: string;
    border: string;
    gridDot: string;
    tones: Record<SemanticTone, TonePalette>;
  };
  typography: {
    fontSans: string;
    fontMono: string;
    baseFontSize: number;
  };
  geometry: {
    baseRadius: number;
    preset: PresetStyle;
    roughness: number;
  };
}

export interface ResolvedNodeStyle {
  tone: SemanticTone;
  variant: SurfaceVariant;
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  textColor: string;
  mutedTextColor: string;
  radius: number;
  elevation: "none" | "sm" | "md";
  opacity: number;
  rough: boolean;
}

export interface SubAnchorRenderItem {
  anchorId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  highlight?: boolean;
  tone?: SemanticTone;
}

export interface SyntaxTokenSpan {
  text: string;
  color?: string;
  fontWeight?: string | number;
}

export interface PrimitiveDecoration {
  kind:
    | "rect"
    | "circle"
    | "line"
    | "path"
    | "text"
    | "icon"
    | "badge"
    | "code-line"
    | "table-cell";
  x: number;
  y: number;
  width?: number;
  height?: number;
  rx?: number;
  r?: number;
  x2?: number;
  y2?: number;
  d?: string;
  markerStart?: string;
  markerEnd?: string;
  text?: string;
  tokens?: SyntaxTokenSpan[];
  iconName?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  textAnchor?: "start" | "middle" | "end";
  anchorId?: string;
  opacity?: number;
}

export interface SceneNode {
  id: string;
  type: ElementSpec["type"];
  x: number;
  y: number;
  width: number;
  height: number;
  style: ResolvedNodeStyle;
  shape:
    | "rect"
    | "circle"
    | "ellipse"
    | "diamond"
    | "cylinder"
    | "queue"
    | "polygon"
    | "path"
    | "none";
  polygonPoints?: [number, number][];
  pathD?: string;
  calloutTail?: {
    targetId: string;
    side: "top" | "bottom" | "left" | "right";
  };
  decorations: PrimitiveDecoration[];
  subAnchors: SubAnchorRenderItem[];
  children: SceneNode[];
}

export interface SceneEdge {
  id: string;
  from: string;
  to: string;
  fromOwnerId: string;
  toOwnerId: string;
  pathD: string;
  points: [number, number][];
  label?: string;
  labelBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  tone: SemanticTone;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  startMarker: "none" | "arrow" | "dot" | "diamond";
  endMarker: "none" | "arrow" | "dot" | "diamond";
  animation: {
    type: "none" | "flow" | "pulse" | "bidirectional";
    durationSec: number;
  };
}

export interface FocusAdjacencyEntry {
  nodeIds: Set<string>;
  anchorIds: Set<string>;
  edgeIds: Set<string>;
}

export interface SceneGraph {
  title?: string;
  width: number;
  height: number;
  viewBox: [number, number, number, number];
  background: "transparent" | "surface" | "dots" | "grid";
  preset: PresetStyle;
  theme: ResolvedThemeTokens;
  anchorRegistry: Record<string, BoundingBox>;
  nodes: SceneNode[];
  edges: SceneEdge[];
  adjacency: Record<string, FocusAdjacencyEntry>;
}

// ============================================================================
// Shared Enum Constants & Sanitization Helpers (Single Source of Truth)
// ============================================================================

export const ELEMENT_TYPES = [
  "rect",
  "diamond",
  "circle",
  "ellipse",
  "cylinder",
  "queue",
  "polygon",
  "path",
  "text",
  "icon",
  "group",
  "window",
  "card",
  "code-block",
  "terminal",
  "table",
  "badge",
  "callout",
  "bitfield",
  "sequence",
] as const;

export const VALID_ELEMENT_TYPES: ReadonlySet<string> = new Set<string>(
  ELEMENT_TYPES
);

export const SEMANTIC_TONES: readonly SemanticTone[] = [
  "neutral",
  "primary",
  "secondary",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
] as const;

export const VALID_SEMANTIC_TONES: ReadonlySet<string> = new Set<string>(
  SEMANTIC_TONES
);

export const SURFACE_VARIANTS: readonly SurfaceVariant[] = [
  "soft",
  "filled",
  "outlined",
  "dashed",
  "ghost",
] as const;

export const VALID_SURFACE_VARIANTS: ReadonlySet<string> = new Set<string>(
  SURFACE_VARIANTS
);

export const PRESET_STYLES: readonly PresetStyle[] = [
  "clean",
  "sketch",
  "blueprint",
] as const;

export const VALID_PRESET_STYLES: ReadonlySet<string> = new Set<string>(
  PRESET_STYLES
);

export const ELEVATION_LEVELS = ["none", "sm", "md"] as const;
export const VALID_ELEVATION_LEVELS: ReadonlySet<string> = new Set<string>(
  ELEVATION_LEVELS
);

export const ROUTING_MODES = ["orthogonal", "curved", "straight"] as const;
export const VALID_ROUTING_MODES: ReadonlySet<string> = new Set<string>(
  ROUTING_MODES
);

export const STROKE_STYLES = ["solid", "dashed", "dotted"] as const;
export const VALID_STROKE_STYLES: ReadonlySet<string> = new Set<string>(
  STROKE_STYLES
);

export const STROKE_WIDTHS = ["thin", "normal", "thick"] as const;
export const VALID_STROKE_WIDTHS: ReadonlySet<string> = new Set<string>(
  STROKE_WIDTHS
);

export const MARKER_TYPES = ["none", "arrow", "dot", "diamond"] as const;
export const VALID_MARKER_TYPES: ReadonlySet<string> = new Set<string>(
  MARKER_TYPES
);

export const CANVAS_BACKGROUNDS = [
  "transparent",
  "surface",
  "dots",
  "grid",
] as const;
export const VALID_CANVAS_BACKGROUNDS: ReadonlySet<string> = new Set<string>(
  CANVAS_BACKGROUNDS
);

export const CALLOUT_SIDES = ["top", "bottom", "left", "right"] as const;
export const VALID_CALLOUT_SIDES: ReadonlySet<string> = new Set<string>(
  CALLOUT_SIDES
);

export const LABEL_SIDES = [
  "center",
  "top",
  "bottom",
  "left",
  "right",
] as const;
export const VALID_LABEL_SIDES: ReadonlySet<string> = new Set<string>(
  LABEL_SIDES
);

export const ANIMATION_TYPES = [
  "none",
  "flow",
  "pulse",
  "bidirectional",
] as const;
export const VALID_ANIMATION_TYPES: ReadonlySet<string> = new Set<string>(
  ANIMATION_TYPES
);

export const ANIMATION_SPEEDS = ["slow", "normal", "fast"] as const;
export const VALID_ANIMATION_SPEEDS: ReadonlySet<string> = new Set<string>(
  ANIMATION_SPEEDS
);

export const SEQUENCE_MESSAGE_TYPES = ["sync", "async", "reply"] as const;
export const VALID_SEQUENCE_MESSAGE_TYPES: ReadonlySet<string> =
  new Set<string>(SEQUENCE_MESSAGE_TYPES);

export const ELEMENT_ID_PATTERN = /^[A-Za-z_][\w-]*$/;

const SVG_PATH_D_WHITELIST = /^[MmLlHhVvCcSsQqTtAaZz0-9\s.,+\-eE]+$/;

/**
 * Safely coerces an unknown value to a finite number, rejecting NaN, Infinity,
 * non-numeric strings, booleans, null, and objects.
 */
export function coerceFiniteNumber(val: unknown): number | undefined {
  if (typeof val === "number") {
    return Number.isFinite(val) ? val : undefined;
  }
  if (typeof val === "string" && val.trim() !== "") {
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * Validates SVG path `d` attribute against a strict character whitelist
 * (SVG path command letters, digits, whitespace, and `.,+-eE`).
 * Returns empty string if any disallowed character is present.
 */
export function sanitizeSvgPathD(d: unknown): string {
  if (typeof d !== "string") return "";
  const trimmed = d.trim();
  if (!trimmed) return "";
  return SVG_PATH_D_WHITELIST.test(trimmed) ? trimmed : "";
}

// ============================================================================
// Zero-Dependency Loose JSON & YAML Spec Parser + Semantic Validator
// ============================================================================

type LooseJsonToken =
  | { kind: "string"; value: string }
  | { kind: "ident"; value: string }
  | { kind: "punct"; value: "{" | "}" | "[" | "]" | ":" | "," }
  | { kind: "ws"; value: string }
  | { kind: "other"; value: string };

/**
 * Normalizes loose LLM-generated JSON (strips // and /* comments, single quotes,
 * unquoted object keys, and trailing commas) into strict JSON without ever mutating
 * content inside string literals.
 */
export function normalizeLooseJson(raw: string): string {
  const tokens: LooseJsonToken[] = [];
  let i = 0;
  const n = raw.length;

  while (i < n) {
    const ch = raw[i];
    const next = raw[i + 1];

    // Whitespace
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      const start = i;
      i++;
      while (
        i < n &&
        (raw[i] === " " ||
          raw[i] === "\t" ||
          raw[i] === "\n" ||
          raw[i] === "\r")
      ) {
        i++;
      }
      tokens.push({ kind: "ws", value: raw.slice(start, i) });
      continue;
    }

    // Line comments //
    if (ch === "/" && next === "/") {
      i += 2;
      while (i < n && raw[i] !== "\n") i++;
      continue;
    }

    // Block comments /* ... */
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < n && !(raw[i] === "*" && raw[i + 1] === "/")) i++;
      i = Math.min(n, i + 2);
      continue;
    }

    // Double-quoted string literal
    if (ch === '"') {
      let str = '"';
      i++;
      while (i < n) {
        const c = raw[i];
        if (c === "\\" && i + 1 < n) {
          str += c + raw[i + 1];
          i += 2;
          continue;
        }
        if (c === '"') {
          str += '"';
          i++;
          break;
        }
        if (c === "\n") {
          str += "\\n";
          i++;
          continue;
        }
        if (c === "\r") {
          i++;
          continue;
        }
        if (c === "\t") {
          str += "\\t";
          i++;
          continue;
        }
        str += c;
        i++;
      }
      tokens.push({ kind: "string", value: str });
      continue;
    }

    // Single-quoted string literal -> normalized double-quoted JSON string
    if (ch === "'") {
      let str = '"';
      i++;
      while (i < n) {
        const c = raw[i];
        if (c === "\\" && i + 1 < n) {
          const esc = raw[i + 1];
          if (esc === "'") {
            str += "'";
          } else {
            str += "\\" + esc;
          }
          i += 2;
          continue;
        }
        if (c === "'") {
          str += '"';
          i++;
          break;
        }
        if (c === '"') {
          str += '\\"';
          i++;
          continue;
        }
        if (c === "\n") {
          str += "\\n";
          i++;
          continue;
        }
        if (c === "\r") {
          i++;
          continue;
        }
        if (c === "\t") {
          str += "\\t";
          i++;
          continue;
        }
        str += c;
        i++;
      }
      tokens.push({ kind: "string", value: str });
      continue;
    }

    // Structural punctuation
    if (
      ch === "{" ||
      ch === "}" ||
      ch === "[" ||
      ch === "]" ||
      ch === ":" ||
      ch === ","
    ) {
      tokens.push({ kind: "punct", value: ch });
      i++;
      continue;
    }

    // Unquoted identifier (object key or keyword like true/false/null)
    if (/[A-Za-z_$]/.test(ch)) {
      const start = i;
      i++;
      while (i < n && /[A-Za-z0-9_$-]/.test(raw[i])) {
        i++;
      }
      tokens.push({ kind: "ident", value: raw.slice(start, i) });
      continue;
    }

    // Other literal characters (numbers, etc.)
    const start = i;
    i++;
    while (
      i < n &&
      !/[\s{}\[\]:,"'/]/.test(raw[i])
    ) {
      i++;
    }
    tokens.push({ kind: "other", value: raw.slice(start, i) });
  }

  const nextNonWs = (fromIdx: number): LooseJsonToken | undefined => {
    for (let k = fromIdx; k < tokens.length; k++) {
      if (tokens[k].kind !== "ws") return tokens[k];
    }
    return undefined;
  };

  let out = "";
  let prevSig: LooseJsonToken | undefined;
  const containerStack: Array<"{" | "["> = [];

  for (let idx = 0; idx < tokens.length; idx++) {
    const tok = tokens[idx];
    if (tok.kind === "ws") {
      out += tok.value;
      continue;
    }

    if (tok.kind === "punct") {
      if (tok.value === "{" || tok.value === "[") {
        containerStack.push(tok.value);
        out += tok.value;
        prevSig = tok;
        continue;
      }
      if (tok.value === "}" || tok.value === "]") {
        containerStack.pop();
        out += tok.value;
        prevSig = tok;
        continue;
      }
      if (tok.value === ",") {
        const nxt = nextNonWs(idx + 1);
        if (nxt && nxt.kind === "punct" && (nxt.value === "}" || nxt.value === "]")) {
          // Drop trailing comma outside strings
          continue;
        }
        out += ",";
        prevSig = tok;
        continue;
      }
      out += tok.value;
      prevSig = tok;
      continue;
    }

    if (tok.kind === "ident") {
      const inObject =
        containerStack.length === 0 ||
        containerStack[containerStack.length - 1] === "{";
      const afterKeyDelim =
        prevSig?.kind === "punct" &&
        (prevSig.value === "{" || prevSig.value === ",");
      const nxt = nextNonWs(idx + 1);
      const beforeColon = nxt?.kind === "punct" && nxt.value === ":";

      if (inObject && afterKeyDelim && beforeColon) {
        out += `"${tok.value}"`;
      } else {
        out += tok.value;
      }
      prevSig = tok;
      continue;
    }

    out += tok.value;
    prevSig = tok;
  }

  return out;
}

function stripInlineYamlComment(raw: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "\\" && (inSingle || inDouble)) {
      i++;
      continue;
    }
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === "#" && !inSingle && !inDouble) {
      if (i === 0 || /\s/.test(raw[i - 1])) {
        return raw.slice(0, i).trimEnd();
      }
    }
  }
  return raw.trimEnd();
}

function parseYamlScalar(raw: string): unknown {
  const s = raw.trim();
  if (!s) return "";
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null" || s === "~") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(s)) {
    return Number(s);
  }
  if (
    (s.startsWith("[") && s.endsWith("]")) ||
    (s.startsWith("{") && s.endsWith("}"))
  ) {
    try {
      return JSON.parse(normalizeLooseJson(s));
    } catch {
      // Fallback to string if not valid flow collection
    }
  }
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    try {
      return JSON.parse(normalizeLooseJson(s));
    } catch {
      return s.slice(1, -1);
    }
  }
  return s;
}

function splitYamlKeyValue(text: string): [string, string] | null {
  let inSingle = false;
  let inDouble = false;
  let bracketDepth = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\" && (inSingle || inDouble)) {
      i++;
      continue;
    }
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (!inSingle && !inDouble) {
      if (ch === "[" || ch === "{") bracketDepth++;
      else if (ch === "]" || ch === "}") bracketDepth = Math.max(0, bracketDepth - 1);
      else if (
        ch === ":" &&
        bracketDepth === 0 &&
        (i + 1 === text.length || /\s/.test(text[i + 1]))
      ) {
        const key = text
          .slice(0, i)
          .trim()
          .replace(/^['"]|['"]$/g, "");
        const val = text.slice(i + 1).trim();
        return [key, val];
      }
    }
  }
  return null;
}

interface YamlLine {
  indent: number;
  text: string;
  rawText: string;
}

function parseYamlSubset(raw: string): unknown {
  const rawLines = raw.split(/\r?\n/);
  const lines: YamlLine[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmedStart = line.trimStart();
    if (!trimmedStart || trimmedStart.startsWith("#")) {
      lines.push({ indent: -1, text: "", rawText: line });
      continue;
    }
    const indent = line.length - trimmedStart.length;
    const cleaned = stripInlineYamlComment(trimmedStart);
    lines.push({ indent, text: cleaned, rawText: line });
  }

  const nextNonEmpty = (startIdx: number): number => {
    let idx = startIdx;
    while (idx < lines.length && lines[idx].indent === -1) idx++;
    return idx;
  };

  const parseBlockScalar = (
    startIdx: number,
    parentIndent: number,
    folded: boolean
  ): { value: string; nextIdx: number } => {
    const collected: string[] = [];
    let idx = startIdx;
    let blockIndent = -1;

    while (idx < lines.length) {
      const l = lines[idx];
      if (l.indent === -1) {
        if (blockIndent !== -1) collected.push("");
        idx++;
        continue;
      }
      if (l.indent <= parentIndent) break;
      if (blockIndent === -1) blockIndent = l.indent;
      collected.push(l.rawText.slice(Math.min(l.rawText.length, blockIndent)));
      idx++;
    }

    while (collected.length > 0 && collected[collected.length - 1] === "") {
      collected.pop();
    }
    return {
      value: folded ? collected.join(" ") : collected.join("\n"),
      nextIdx: idx,
    };
  };

  const parseNode = (
    startIdx: number,
    minIndent: number
  ): { value: unknown; nextIdx: number } => {
    const firstIdx = nextNonEmpty(startIdx);
    if (firstIdx >= lines.length || lines[firstIdx].indent < minIndent) {
      return { value: {}, nextIdx: firstIdx };
    }

    const baseIndent = lines[firstIdx].indent;
    const isSeq =
      lines[firstIdx].text === "-" || lines[firstIdx].text.startsWith("- ");

    if (isSeq) {
      const arr: unknown[] = [];
      let idx = firstIdx;

      while (idx < lines.length) {
        idx = nextNonEmpty(idx);
        if (idx >= lines.length || lines[idx].indent < baseIndent) break;
        if (lines[idx].indent > baseIndent) break;
        const l = lines[idx];
        if (!(l.text === "-" || l.text.startsWith("- "))) break;

        const afterDash = l.text.slice(1).trim();
        if (!afterDash) {
          const sub = parseNode(idx + 1, baseIndent + 1);
          arr.push(sub.value);
          idx = sub.nextIdx;
          continue;
        }

        const kv = splitYamlKeyValue(afterDash);
        if (kv) {
          const itemObj: Record<string, unknown> = {};
          const [k, v] = kv;
          const dashOffset = l.text.length - l.text.slice(1).trimStart().length;
          const keyIndent = baseIndent + dashOffset;
          idx++;
          if (v === "|" || v === "|-" || v === ">" || v === ">-") {
            const blk = parseBlockScalar(idx, keyIndent, v.startsWith(">"));
            itemObj[k] = blk.value;
            idx = blk.nextIdx;
          } else if (v === "") {
            const peekIdx = nextNonEmpty(idx);
            if (
              peekIdx < lines.length &&
              lines[peekIdx].indent === keyIndent &&
              (lines[peekIdx].text === "-" ||
                lines[peekIdx].text.startsWith("- "))
            ) {
              const sub = parseNode(peekIdx, keyIndent);
              itemObj[k] = sub.value;
              idx = sub.nextIdx;
            } else {
              const sub = parseNode(idx, keyIndent + 1);
              itemObj[k] = sub.value;
              idx = sub.nextIdx;
            }
          } else {
            itemObj[k] = parseYamlScalar(v);
          }

          // Check if additional properties follow at deeper indentation
          const nextIdx = nextNonEmpty(idx);
          if (nextIdx < lines.length && lines[nextIdx].indent > baseIndent) {
            const rest = parseObjectProps(
              nextIdx,
              lines[nextIdx].indent,
              itemObj
            );
            idx = rest;
          }
          arr.push(itemObj);
        } else {
          arr.push(parseYamlScalar(afterDash));
          idx++;
        }
      }

      return { value: arr, nextIdx: idx };
    }

    const obj: Record<string, unknown> = {};
    const nextIdx = parseObjectProps(firstIdx, baseIndent, obj);
    return { value: obj, nextIdx };
  };

  const parseObjectProps = (
    startIdx: number,
    baseIndent: number,
    target: Record<string, unknown>
  ): number => {
    let idx = startIdx;
    while (idx < lines.length) {
      idx = nextNonEmpty(idx);
      if (idx >= lines.length || lines[idx].indent < baseIndent) break;
      if (lines[idx].indent > baseIndent) break;
      const l = lines[idx];
      if (l.text === "-" || l.text.startsWith("- ")) break;

      const kv = splitYamlKeyValue(l.text);
      if (!kv) {
        idx++;
        continue;
      }

      const [key, val] = kv;
      idx++;
      if (val === "|" || val === "|-" || val === ">" || val === ">-") {
        const blk = parseBlockScalar(idx, baseIndent, val.startsWith(">"));
        target[key] = blk.value;
        idx = blk.nextIdx;
      } else if (val === "") {
        const peekIdx = nextNonEmpty(idx);
        if (
          peekIdx < lines.length &&
          lines[peekIdx].indent === baseIndent &&
          (lines[peekIdx].text === "-" || lines[peekIdx].text.startsWith("- "))
        ) {
          const sub = parseNode(peekIdx, baseIndent);
          target[key] = sub.value;
          idx = sub.nextIdx;
        } else {
          const sub = parseNode(idx, baseIndent + 1);
          target[key] = sub.value;
          idx = sub.nextIdx;
        }
      } else {
        target[key] = parseYamlScalar(val);
      }
    }
    return idx;
  };

  return parseNode(0, 0).value;
}

/**
 * Parses an IllustrationSpec string in strict JSON, loose JSON (with comments / trailing commas /
 * single quotes / unquoted keys), or YAML format.
 */
export function parseIllustrationSpecText(raw: string): unknown {
  let trimmed = (raw || "").trim();
  if (!trimmed) {
    throw new Error("Empty illustration spec.");
  }

  // Strip surrounding markdown code fences if present
  if (trimmed.startsWith("```")) {
    const lines = trimmed.split(/\r?\n/);
    if (lines.length >= 2 && lines[lines.length - 1].trim().startsWith("```")) {
      trimmed = lines.slice(1, -1).join("\n").trim();
    }
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return JSON.parse(normalizeLooseJson(trimmed));
    }
  }

  return parseYamlSubset(trimmed);
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function suggestClosestId(
  target: string,
  candidates: Iterable<string>
): string | undefined {
  let best: string | undefined;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = editDistance(target, c);
    if (d < bestDist && d <= Math.max(3, Math.ceil(target.length * 0.5))) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/**
 * Runtime semantic validator with descriptive errors, enum warnings, & fuzzy ID suggestions for LLM self-repair
 */
export function validateIllustrationSpec(input: unknown): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  spec?: IllustrationSpec;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let parsedInput = input;

  if (typeof input === "string") {
    try {
      parsedInput = parseIllustrationSpecText(input);
    } catch (err) {
      return {
        valid: false,
        errors: [`Failed to parse spec text: ${(err as Error).message}`],
        warnings,
      };
    }
  }

  if (!parsedInput || typeof parsedInput !== "object" || Array.isArray(parsedInput)) {
    return {
      valid: false,
      errors: ["Root spec must be a JSON/YAML object."],
      warnings,
    };
  }

  const checkEnum = (
    val: unknown,
    validSet: ReadonlySet<string>,
    fieldPath: string
  ): void => {
    if (val === undefined) return;
    if (typeof val !== "string" || !validSet.has(val)) {
      const suggestion = suggestClosestId(String(val), validSet);
      const hint = suggestion ? ` Did you mean "${suggestion}"?` : "";
      warnings.push(
        `${fieldPath} has unknown value "${String(val)}". Valid values: ${Array.from(validSet).join(", ")}.${hint}`
      );
    }
  };

  const obj = parsedInput as Record<string, unknown>;
  const knownNodeIds = new Set<string>();
  const calloutTargets: Array<{ path: string; target: string }> = [];

  if (obj.canvas && typeof obj.canvas === "object") {
    const canvas = obj.canvas as Record<string, unknown>;
    checkEnum(canvas.background, VALID_CANVAS_BACKGROUNDS, "canvas.background");
  }
  if (obj.style && typeof obj.style === "object") {
    const style = obj.style as Record<string, unknown>;
    checkEnum(style.preset, VALID_PRESET_STYLES, "style.preset");
  }

  const validateElementTree = (
    elements: unknown[],
    pathPrefix: string
  ): void => {
    const siblingIds = new Set<string>();

    elements.forEach((el, idx) => {
      const itemPath = `${pathPrefix}[${idx}]`;
      if (!el || typeof el !== "object" || Array.isArray(el)) {
        errors.push(`${itemPath} must be an object.`);
        return;
      }
      const typed = el as Record<string, unknown>;
      if (typeof typed.type !== "string") {
        errors.push(`${itemPath} is missing a 'type' property.`);
        return;
      }
      if (!VALID_ELEMENT_TYPES.has(typed.type)) {
        const suggestion = suggestClosestId(typed.type, VALID_ELEMENT_TYPES);
        const hint = suggestion ? ` Did you mean "${suggestion}"?` : "";
        errors.push(
          `${itemPath} has unknown type "${typed.type}". Valid types: ${Array.from(VALID_ELEMENT_TYPES).join(", ")}.${hint}`
        );
      }

      if (typed.id !== undefined) {
        if (typeof typed.id !== "string" || !typed.id.trim()) {
          errors.push(`${itemPath}.id must be a non-empty string.`);
        } else {
          const id = typed.id.trim();
          if (!ELEMENT_ID_PATTERN.test(id)) {
            errors.push(
              `${itemPath} has invalid element id "${id}". IDs must match /^[A-Za-z_][\\w-]*$/ (no ".", "@", or spaces).`
            );
          } else {
            if (knownNodeIds.has(id)) {
              errors.push(`${itemPath} has duplicate element id "${id}".`);
            }
            knownNodeIds.add(id);
            siblingIds.add(id);
          }
        }
      }

      if (typed.style && typeof typed.style === "object") {
        const st = typed.style as Record<string, unknown>;
        checkEnum(st.tone, VALID_SEMANTIC_TONES, `${itemPath}.style.tone`);
        checkEnum(st.variant, VALID_SURFACE_VARIANTS, `${itemPath}.style.variant`);
        checkEnum(st.elevation, VALID_ELEVATION_LEVELS, `${itemPath}.style.elevation`);
      }

      // Element-specific enum checks & recursive callout collection
      if (typed.type === "callout") {
        checkEnum(typed.side, VALID_CALLOUT_SIDES, `${itemPath}.side`);
        if (typeof typed.target === "string" && typed.target.trim()) {
          calloutTargets.push({ path: itemPath, target: typed.target });
        }
      } else if (typed.type === "table" && Array.isArray(typed.rows)) {
        typed.rows.forEach((row, rIdx) => {
          if (!Array.isArray(row)) return;
          row.forEach((cell, cIdx) => {
            if (cell && typeof cell === "object") {
              checkEnum(
                (cell as Record<string, unknown>).tone,
                VALID_SEMANTIC_TONES,
                `${itemPath}.rows[${rIdx}][${cIdx}].tone`
              );
            }
          });
        });
      } else if (typed.type === "terminal" && Array.isArray(typed.lines)) {
        typed.lines.forEach((line, lIdx) => {
          if (line && typeof line === "object") {
            checkEnum(
              (line as Record<string, unknown>).tone,
              VALID_SEMANTIC_TONES,
              `${itemPath}.lines[${lIdx}].tone`
            );
          }
        });
      } else if (typed.type === "bitfield" && Array.isArray(typed.fields)) {
        typed.fields.forEach((field, fIdx) => {
          if (field && typeof field === "object") {
            checkEnum(
              (field as Record<string, unknown>).tone,
              VALID_SEMANTIC_TONES,
              `${itemPath}.fields[${fIdx}].tone`
            );
          }
        });
      } else if (typed.type === "sequence") {
        if (Array.isArray(typed.actors)) {
          typed.actors.forEach((actor, aIdx) => {
            if (actor && typeof actor === "object") {
              checkEnum(
                (actor as Record<string, unknown>).tone,
                VALID_SEMANTIC_TONES,
                `${itemPath}.actors[${aIdx}].tone`
              );
            }
          });
        }
        if (Array.isArray(typed.messages)) {
          typed.messages.forEach((msg, mIdx) => {
            if (msg && typeof msg === "object") {
              const m = msg as Record<string, unknown>;
              checkEnum(
                m.tone,
                VALID_SEMANTIC_TONES,
                `${itemPath}.messages[${mIdx}].tone`
              );
              checkEnum(
                m.type,
                VALID_SEQUENCE_MESSAGE_TYPES,
                `${itemPath}.messages[${mIdx}].type`
              );
            }
          });
        }
      }

      if (Array.isArray(typed.children)) {
        validateElementTree(typed.children, `${itemPath}.children`);
      }
    });

    // Check sibling relative `place` references within this container (even if no sibling has an id)
    elements.forEach((el, idx) => {
      if (!el || typeof el !== "object") return;
      const typed = el as Record<string, unknown>;
      const selfId = typeof typed.id === "string" ? typed.id.trim() : undefined;
      const place = typed.place as Record<string, unknown> | undefined;
      if (!place || typeof place !== "object") return;

      for (const dirKey of ["rightOf", "leftOf", "below", "above"] as const) {
        const refVal = place[dirKey];
        if (typeof refVal === "string" && refVal.trim()) {
          const refId = refVal.trim();
          if (selfId && refId === selfId) {
            errors.push(
              `${pathPrefix}[${idx}].place.${dirKey} cannot reference itself ("${selfId}").`
            );
          } else if (!siblingIds.has(refId)) {
            const suggestion = suggestClosestId(refId, siblingIds);
            const hint = suggestion ? ` Did you mean "${suggestion}"?` : "";
            errors.push(
              `${pathPrefix}[${idx}].place.${dirKey} references unknown sibling id "${refId}".${hint}`
            );
          }
        }
      }
    });
  };

  if (!Array.isArray(obj.elements)) {
    errors.push("Missing or invalid 'elements' array at root.");
  } else {
    validateElementTree(obj.elements, "elements");

    // Check ALL callout target references (top-level and nested inside groups/windows/cards)
    for (const c of calloutTargets) {
      const baseTarget = c.target.split("@")[0].split(".")[0].trim();
      if (!knownNodeIds.has(baseTarget)) {
        const suggestion = suggestClosestId(baseTarget, knownNodeIds);
        const hint = suggestion ? ` Did you mean "${suggestion}"?` : "";
        errors.push(
          `${c.path}.target references unknown element id "${baseTarget}".${hint}`
        );
      }
    }
  }

  if (obj.connections !== undefined) {
    if (!Array.isArray(obj.connections)) {
      errors.push("'connections' must be an array when provided.");
    } else {
      obj.connections.forEach((conn, idx) => {
        if (!conn || typeof conn !== "object" || Array.isArray(conn)) {
          errors.push(`connections[${idx}] must be an object.`);
          return;
        }
        const typed = conn as Record<string, unknown>;
        for (const endKey of ["from", "to"] as const) {
          const rawEnd = typed[endKey];
          if (typeof rawEnd !== "string" || !rawEnd.trim()) {
            errors.push(
              `connections[${idx}] is missing a valid '${endKey}' endpoint string.`
            );
            continue;
          }
          const baseId = rawEnd.split("@")[0].split(".")[0].trim();
          if (!knownNodeIds.has(baseId)) {
            const suggestion = suggestClosestId(baseId, knownNodeIds);
            const hint = suggestion ? ` Did you mean "${suggestion}"?` : "";
            errors.push(
              `connections[${idx}].${endKey} ("${rawEnd}") references unknown element id "${baseId}".${hint}`
            );
          }
        }

        checkEnum(typed.routing, VALID_ROUTING_MODES, `connections[${idx}].routing`);
        checkEnum(typed.tone, VALID_SEMANTIC_TONES, `connections[${idx}].tone`);
        checkEnum(
          typed.strokeStyle,
          VALID_STROKE_STYLES,
          `connections[${idx}].strokeStyle`
        );
        checkEnum(
          typed.strokeWidth,
          VALID_STROKE_WIDTHS,
          `connections[${idx}].strokeWidth`
        );
        checkEnum(
          typed.startMarker,
          VALID_MARKER_TYPES,
          `connections[${idx}].startMarker`
        );
        checkEnum(
          typed.endMarker,
          VALID_MARKER_TYPES,
          `connections[${idx}].endMarker`
        );
        checkEnum(
          typed.labelSide,
          VALID_LABEL_SIDES,
          `connections[${idx}].labelSide`
        );
        if (typed.animation && typeof typed.animation === "object") {
          const anim = typed.animation as Record<string, unknown>;
          checkEnum(
            anim.type,
            VALID_ANIMATION_TYPES,
            `connections[${idx}].animation.type`
          );
          checkEnum(
            anim.speed,
            VALID_ANIMATION_SPEEDS,
            `connections[${idx}].animation.speed`
          );
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    spec:
      errors.length === 0
        ? (parsedInput as unknown as IllustrationSpec)
        : undefined,
  };
}
