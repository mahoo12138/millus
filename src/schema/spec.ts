/**
 * @ai-illustrate/core - Schema & SceneGraph Type Definitions
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

/**
 * Lightweight runtime validator with descriptive errors for LLM self-repair
 */
export function validateIllustrationSpec(input: unknown): {
  valid: boolean;
  errors: string[];
  spec?: IllustrationSpec;
} {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Root spec must be a JSON/YAML object."] };
  }
  const obj = input as Record<string, unknown>;
  if (!Array.isArray(obj.elements)) {
    errors.push("Missing or invalid 'elements' array at root.");
  } else {
    obj.elements.forEach((el, idx) => {
      if (!el || typeof el !== "object") {
        errors.push(`elements[${idx}] must be an object.`);
        return;
      }
      const typed = el as Record<string, unknown>;
      if (typeof typed.type !== "string") {
        errors.push(`elements[${idx}] is missing a 'type' property.`);
      }
    });
  }
  if (obj.connections !== undefined && !Array.isArray(obj.connections)) {
    errors.push("'connections' must be an array when provided.");
  }
  return {
    valid: errors.length === 0,
    errors,
    spec: errors.length === 0 ? (obj as unknown as IllustrationSpec) : undefined,
  };
}
