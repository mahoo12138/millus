/**
 * AI System Prompt & Structured Output Schema Generator (millus/prompt)
 * Derives allowed enums & element types from the single source of truth in ./spec.ts.
 */

import {
  ANIMATION_SPEEDS,
  ANIMATION_TYPES,
  CALLOUT_SIDES,
  CANVAS_BACKGROUNDS,
  ELEMENT_ID_PATTERN,
  ELEMENT_TYPES,
  ELEVATION_LEVELS,
  LABEL_SIDES,
  MARKER_TYPES,
  PRESET_STYLES,
  ROUTING_MODES,
  SEMANTIC_TONES,
  SEQUENCE_MESSAGE_TYPES,
  STROKE_STYLES,
  STROKE_WIDTHS,
  SURFACE_VARIANTS,
} from "./spec.ts";

export const AI_ILLUSTRATION_SYSTEM_PROMPT = `You are a technical illustration architect for an MDX blog.
Instead of writing raw SVG or Mermaid, output a structured JSON (or YAML) block inside \`\`\`illustration ... \`\`\` following the IllustrationSpec schema.

### Core Rules
1. **Never hardcode hex colors**: Always use semantic tones (\`"primary" | "secondary" | "accent" | "success" | "warning" | "danger" | "info" | "neutral"\`) and variants (\`"soft" | "filled" | "outlined" | "dashed" | "ghost"\`). The runtime automatically adapts them to the blog's Light/Dark CSS variables.
2. **Valid Element IDs**: Element \`id\` values must match \`/^[A-Za-z_][\\w-]*$/\` (letters, digits, \`_\`, \`-\` only; never include \`.\`, \`@\`, or spaces).
3. **Avoid manual pixel math**:
   - Inside \`group\` or \`window\`, use \`layout: { type: "flex", direction: "row" | "column", gap: 16 }\`.
   - Between top-level siblings, use relative placement: \`place: { rightOf: "node_id", gap: 48, align: "center" }\` or \`below: "node_id"\`.
   - Only use explicit \`x, y\` coordinates for free-form geometric canvas drawings.
4. **Use compound technical primitives**:
   - \`card\`: Title, optional icon (\`cpu\`, \`layers\`, \`database\`, \`cloud\`, \`lock\`, \`sparkles\`, \`terminal\`, \`code\`, \`server\`, \`globe\`, \`zap\`, \`shield\`, \`check\`, \`git\`, \`key\`, \`box\`, \`activity\`, \`hard-drive\`, \`wifi\`, \`sliders\`, \`send\`), badge, and body text.
   - \`code-block\`: Displays syntax-highlighted code with \`highlightLines: [2, 3]\`. Each 1-indexed line exposes an anchor \`<id>.line_<n>\` (e.g. \`from: "code1.line_2@right"\`).
   - \`table\`: Memory layout, struct fields, or cache tables. Each cell exposes an anchor \`<id>.cell_<row>_<col>\`.
   - \`bitfield\`: Network packet headers, CPU registers, or memory bit layouts (\`title\`, \`totalBits\`, \`fields: [{ name, bits, value, tone }]\`). Each field exposes an anchor \`<id>.field_<idx>\`.
   - \`sequence\`: Protocol handshakes and RPC lifelines (\`title\`, \`actors: [{ id, label, sublabel, tone }]\`, \`messages: [{ from, to, label, type: "sync" | "async" | "reply", tone }]\`).
   - \`cylinder\` & \`queue\`: 3D storage database cylinder and horizontal message queue pipe (\`label\`, \`sublabel\`, \`style\`).
   - \`terminal\`: CLI commands and outputs. Each 1-indexed line exposes an anchor \`<id>.line_<n>\`.
   - \`callout\`: Floating annotation pointing to \`target: "<node_or_subanchor_id>"\`.
5. **Connections, Labels & Animation**:
   - Connect any node or sub-anchor using \`from: "nodeA@right"\`, \`to: "nodeB@left"\` (or with explicit port ratio \`"nodeA@right:30%"\`). Note: in mobile compact \`reflow\` mode, explicit port sides are intentionally re-selected automatically to suit vertical stacking.
   - Set \`routing: "orthogonal" | "curved" | "straight"\`.
   - Fine-tune edge labels with \`label\`, \`labelPosition: "start" | "center" | "end" | 0.5\`, \`labelSide: "center" | "top" | "bottom" | "left" | "right"\`, and \`labelOffset: [dx, dy]\`.
   - Add \`animation: { type: "flow" | "pulse" | "bidirectional", speed: "normal" }\` for active data/request paths.
`;

const PRIMITIVE_SHAPE_TYPES = [
  "rect",
  "diamond",
  "circle",
  "ellipse",
  "cylinder",
  "queue",
] as const;

export function getIllustrationJsonSchema(): Record<string, unknown> {
  const baseElementProps: Record<string, unknown> = {
    id: { type: "string", pattern: ELEMENT_ID_PATTERN.source },
    width: { oneOf: [{ type: "number" }, { const: "auto" }] },
    height: { oneOf: [{ type: "number" }, { const: "auto" }] },
    padding: {
      oneOf: [
        { type: "number" },
        { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
        { type: "array", items: { type: "number" }, minItems: 4, maxItems: 4 },
      ],
    },
    x: { type: "number" },
    y: { type: "number" },
    place: { $ref: "#/$defs/place" },
    layout: { $ref: "#/$defs/layout" },
    style: { $ref: "#/$defs/semanticStyle" },
  };

  const withBase = (
    extraProps: Record<string, unknown>,
    required: string[] = ["type"]
  ): Record<string, unknown> => ({
    type: "object",
    required,
    properties: {
      ...baseElementProps,
      ...extraProps,
    },
  });

  const elementVariants: Record<string, unknown>[] = [
    withBase({
      type: { enum: [...PRIMITIVE_SHAPE_TYPES] },
      label: { type: "string" },
      sublabel: { type: "string" },
      icon: { type: "string" },
    }),
    withBase({
      type: { const: "polygon" },
      points: {
        type: "array",
        items: {
          type: "array",
          items: { type: "number" },
          minItems: 2,
          maxItems: 2,
        },
      },
      sides: { type: "integer", minimum: 3 },
      label: { type: "string" },
    }),
    withBase(
      {
        type: { const: "path" },
        d: { type: "string" },
        closed: { type: "boolean" },
      },
      ["type", "d"]
    ),
    withBase(
      {
        type: { const: "text" },
        text: { type: "string" },
        maxWidth: { type: "number" },
        align: { enum: ["left", "center", "right"] },
        fontSize: {
          oneOf: [{ enum: ["xs", "sm", "md", "lg", "xl"] }, { type: "number" }],
        },
        fontWeight: { enum: ["normal", "medium", "bold"] },
        mono: { type: "boolean" },
      },
      ["type", "text"]
    ),
    withBase(
      {
        type: { const: "icon" },
        name: { type: "string" },
        size: { type: "number" },
        label: { type: "string" },
      },
      ["type", "name"]
    ),
    withBase(
      {
        type: { enum: ["group", "window"] },
        title: { type: "string" },
        subtitle: { type: "string" },
        url: { type: "string" },
        icon: { type: "string" },
        children: {
          type: "array",
          items: { $ref: "#/$defs/element" },
        },
      },
      ["type", "children"]
    ),
    withBase(
      {
        type: { const: "card" },
        title: { type: "string" },
        subtitle: { type: "string" },
        icon: { type: "string" },
        badge: { type: "string" },
        body: { type: "string" },
        children: {
          type: "array",
          items: { $ref: "#/$defs/element" },
        },
      },
      ["type", "title"]
    ),
    withBase(
      {
        type: { const: "code-block" },
        title: { type: "string" },
        lang: { type: "string" },
        code: { type: "string" },
        highlightLines: {
          type: "array",
          items: { type: "integer", minimum: 1 },
        },
      },
      ["type", "code"]
    ),
    withBase(
      {
        type: { const: "terminal" },
        title: { type: "string" },
        lines: {
          type: "array",
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  prompt: { type: "string" },
                  cmd: { type: "string" },
                  output: { type: "string" },
                  tone: { $ref: "#/$defs/tone" },
                },
              },
            ],
          },
        },
      },
      ["type", "lines"]
    ),
    withBase(
      {
        type: { const: "table" },
        title: { type: "string" },
        headers: { type: "array", items: { type: "string" } },
        rows: {
          type: "array",
          items: {
            type: "array",
            items: {
              oneOf: [
                { type: "string" },
                {
                  type: "object",
                  required: ["text"],
                  properties: {
                    text: { type: "string" },
                    tone: { $ref: "#/$defs/tone" },
                    mono: { type: "boolean" },
                  },
                },
              ],
            },
          },
        },
      },
      ["type", "rows"]
    ),
    withBase(
      {
        type: { const: "badge" },
        text: { type: "string" },
        icon: { type: "string" },
      },
      ["type", "text"]
    ),
    withBase(
      {
        type: { const: "callout" },
        text: { type: "string" },
        target: { type: "string" },
        side: { enum: [...CALLOUT_SIDES] },
      },
      ["type", "text"]
    ),
    withBase(
      {
        type: { const: "bitfield" },
        title: { type: "string" },
        totalBits: { type: "integer", minimum: 1 },
        fields: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "bits"],
            properties: {
              name: { type: "string" },
              bits: { oneOf: [{ type: "number" }, { type: "string" }] },
              value: { type: "string" },
              tone: { $ref: "#/$defs/tone" },
            },
          },
        },
      },
      ["type", "fields"]
    ),
    withBase(
      {
        type: { const: "sequence" },
        title: { type: "string" },
        actors: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "label"],
            properties: {
              id: { type: "string", pattern: ELEMENT_ID_PATTERN.source },
              label: { type: "string" },
              sublabel: { type: "string" },
              tone: { $ref: "#/$defs/tone" },
            },
          },
        },
        messages: {
          type: "array",
          items: {
            type: "object",
            required: ["from", "to", "label"],
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              label: { type: "string" },
              type: { enum: [...SEQUENCE_MESSAGE_TYPES] },
              tone: { $ref: "#/$defs/tone" },
              note: { type: "string" },
            },
          },
        },
      },
      ["type", "actors", "messages"]
    ),
  ];

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "IllustrationSpec",
    type: "object",
    required: ["elements"],
    $defs: {
      elementTypes: { enum: [...ELEMENT_TYPES] },
      tone: { enum: [...SEMANTIC_TONES] },
      variant: { enum: [...SURFACE_VARIANTS] },
      semanticStyle: {
        type: "object",
        properties: {
          tone: { $ref: "#/$defs/tone" },
          variant: { $ref: "#/$defs/variant" },
          elevation: { enum: [...ELEVATION_LEVELS] },
          radius: {
            oneOf: [
              { enum: ["none", "sm", "md", "lg", "full"] },
              { type: "number", minimum: 0 },
            ],
          },
          opacity: { type: "number", minimum: 0, maximum: 1 },
          rough: { type: "boolean" },
        },
      },
      place: {
        type: "object",
        properties: {
          rightOf: { type: "string" },
          leftOf: { type: "string" },
          below: { type: "string" },
          above: { type: "string" },
          gap: { type: "number" },
          align: { enum: ["start", "center", "end"] },
          offset: {
            type: "array",
            items: { type: "number" },
            minItems: 2,
            maxItems: 2,
          },
        },
      },
      layout: {
        type: "object",
        required: ["type"],
        properties: {
          type: { enum: ["flex", "grid", "free"] },
          direction: { enum: ["row", "column"] },
          gap: { type: "number" },
          columns: { type: "integer", minimum: 1 },
          align: { enum: ["start", "center", "end", "stretch"] },
          justify: { enum: ["start", "center", "end", "space-between"] },
        },
      },
      element: {
        oneOf: elementVariants,
      },
    },
    properties: {
      version: { const: "1.0" },
      title: { type: "string" },
      canvas: {
        type: "object",
        properties: {
          width: { oneOf: [{ type: "number" }, { const: "auto" }] },
          height: { oneOf: [{ type: "number" }, { const: "auto" }] },
          padding: {
            oneOf: [
              { type: "number" },
              {
                type: "array",
                items: { type: "number" },
                minItems: 4,
                maxItems: 4,
              },
            ],
          },
          background: { enum: [...CANVAS_BACKGROUNDS] },
          layout: { $ref: "#/$defs/layout" },
        },
      },
      style: {
        type: "object",
        properties: {
          preset: { enum: [...PRESET_STYLES] },
          roughness: { type: "number", minimum: 0 },
          fontFamily: { enum: ["sans", "mono"] },
        },
      },
      elements: {
        type: "array",
        items: { $ref: "#/$defs/element" },
      },
      connections: {
        type: "array",
        items: {
          type: "object",
          required: ["from", "to"],
          properties: {
            id: { type: "string" },
            from: { type: "string" },
            to: { type: "string" },
            label: { type: "string" },
            labelPosition: {
              oneOf: [
                { enum: ["start", "center", "end"] },
                { type: "number", minimum: 0, maximum: 1 },
              ],
            },
            labelSide: { enum: [...LABEL_SIDES] },
            labelOffset: {
              type: "array",
              items: { type: "number" },
              minItems: 2,
              maxItems: 2,
            },
            routing: { enum: [...ROUTING_MODES] },
            curveOffset: { type: "number" },
            cornerRadius: { type: "number", minimum: 0 },
            stub: { type: "number", minimum: 0 },
            startMarker: { enum: [...MARKER_TYPES] },
            endMarker: { enum: [...MARKER_TYPES] },
            tone: { $ref: "#/$defs/tone" },
            strokeStyle: { enum: [...STROKE_STYLES] },
            strokeWidth: { enum: [...STROKE_WIDTHS] },
            animation: {
              oneOf: [
                { type: "boolean" },
                {
                  type: "object",
                  properties: {
                    type: { enum: [...ANIMATION_TYPES] },
                    speed: { enum: [...ANIMATION_SPEEDS] },
                  },
                },
              ],
            },
          },
        },
      },
    },
  };
}
