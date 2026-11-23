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

// ============================================================================
// Zero-Dependency Loose JSON & YAML Spec Parser + Semantic Validator
// ============================================================================

const VALID_ELEMENT_TYPES = new Set<string>([
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
]);

/**
 * Normalizes loose LLM-generated JSON (strips // and /* comments, single quotes,
 * unquoted object keys, and trailing commas) into strict JSON.
 */
export function normalizeLooseJson(raw: string): string {
  let out = "";
  let i = 0;
  const n = raw.length;
  let inDouble = false;
  let inSingle = false;

  while (i < n) {
    const ch = raw[i];
    const next = raw[i + 1];

    if (inDouble) {
      if (ch === "\\" && i + 1 < n) {
        out += ch + raw[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"') {
        inDouble = false;
        out += ch;
        i++;
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        i++;
        continue;
      }
      if (ch === "\r") {
        i++;
        continue;
      }
      out += ch;
      i++;
      continue;
    }

    if (inSingle) {
      if (ch === "\\" && i + 1 < n) {
        const esc = raw[i + 1];
        if (esc === "'") {
          out += "'";
        } else {
          out += "\\" + esc;
        }
        i += 2;
        continue;
      }
      if (ch === "'") {
        inSingle = false;
        out += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        out += '\\"';
        i++;
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        i++;
        continue;
      }
      if (ch === "\r") {
        i++;
        continue;
      }
      out += ch;
      i++;
      continue;
    }

    // Outside strings: check comments
    if (ch === "/" && next === "/") {
      i += 2;
      while (i < n && raw[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < n && !(raw[i] === "*" && raw[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      out += ch;
      i++;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      out += '"';
      i++;
      continue;
    }

    out += ch;
    i++;
  }

  // Quote unquoted object keys: { key: ... or , key: ...
  const withQuotedKeys = out.replace(
    /([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*:)/g,
    '$1"$2"$3'
  );

  // Strip trailing commas before } or ]
  return withQuotedKeys.replace(/,(\s*[}\]])/g, "$1");
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
          idx++;
          if (v === "|" || v === "|-" || v === ">" || v === ">-") {
            const blk = parseBlockScalar(idx, baseIndent + 1, v.startsWith(">"));
            itemObj[k] = blk.value;
            idx = blk.nextIdx;
          } else if (v === "") {
            const sub = parseNode(idx, baseIndent + 2);
            itemObj[k] = sub.value;
            idx = sub.nextIdx;
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
        const sub = parseNode(idx, baseIndent + 1);
        target[key] = sub.value;
        idx = sub.nextIdx;
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
 * Runtime semantic validator with descriptive errors & fuzzy ID suggestions for LLM self-repair
 */
export function validateIllustrationSpec(input: unknown): {
  valid: boolean;
  errors: string[];
  spec?: IllustrationSpec;
} {
  const errors: string[] = [];
  let parsedInput = input;

  if (typeof input === "string") {
    try {
      parsedInput = parseIllustrationSpecText(input);
    } catch (err) {
      return {
        valid: false,
        errors: [`Failed to parse spec text: ${(err as Error).message}`],
      };
    }
  }

  if (!parsedInput || typeof parsedInput !== "object") {
    return { valid: false, errors: ["Root spec must be a JSON/YAML object."] };
  }

  const obj = parsedInput as Record<string, unknown>;
  const knownNodeIds = new Set<string>();

  const validateElementTree = (
    elements: unknown[],
    pathPrefix: string
  ): void => {
    const siblingIds = new Set<string>();

    elements.forEach((el, idx) => {
      const itemPath = `${pathPrefix}[${idx}]`;
      if (!el || typeof el !== "object") {
        errors.push(`${itemPath} must be an object.`);
        return;
      }
      const typed = el as Record<string, unknown>;
      if (typeof typed.type !== "string") {
        errors.push(`${itemPath} is missing a 'type' property.`);
        return;
      }
      if (!VALID_ELEMENT_TYPES.has(typed.type)) {
        errors.push(
          `${itemPath} has unknown type "${typed.type}". Valid types: ${Array.from(VALID_ELEMENT_TYPES).join(", ")}.`
        );
      }
      if (typeof typed.id === "string" && typed.id.trim()) {
        const id = typed.id.trim();
        if (knownNodeIds.has(id)) {
          errors.push(`${itemPath} has duplicate element id "${id}".`);
        }
        knownNodeIds.add(id);
        siblingIds.add(id);
      }
      if (Array.isArray(typed.children)) {
        validateElementTree(typed.children, `${itemPath}.children`);
      }
    });

    // Check sibling relative `place` references within this container
    if (siblingIds.size > 0) {
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
    }
  };

  if (!Array.isArray(obj.elements)) {
    errors.push("Missing or invalid 'elements' array at root.");
  } else {
    validateElementTree(obj.elements, "elements");

    // Check callout target references
    if (knownNodeIds.size > 0) {
      obj.elements.forEach((el, idx) => {
        if (!el || typeof el !== "object") return;
        const typed = el as Record<string, unknown>;
        if (
          typed.type === "callout" &&
          typeof typed.target === "string" &&
          typed.target.trim()
        ) {
          const baseTarget = typed.target.split("@")[0].split(".")[0].trim();
          if (!knownNodeIds.has(baseTarget)) {
            const suggestion = suggestClosestId(baseTarget, knownNodeIds);
            const hint = suggestion ? ` Did you mean "${suggestion}"?` : "";
            errors.push(
              `elements[${idx}].target references unknown element id "${baseTarget}".${hint}`
            );
          }
        }
      });
    }
  }

  if (obj.connections !== undefined) {
    if (!Array.isArray(obj.connections)) {
      errors.push("'connections' must be an array when provided.");
    } else if (knownNodeIds.size > 0) {
      obj.connections.forEach((conn, idx) => {
        if (!conn || typeof conn !== "object") {
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
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    spec:
      errors.length === 0
        ? (parsedInput as unknown as IllustrationSpec)
        : undefined,
  };
}
