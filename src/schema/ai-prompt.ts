/**
 * AI System Prompt & Structured Output Schema Generator
 */

export const AI_ILLUSTRATION_SYSTEM_PROMPT = `You are a technical illustration architect for an MDX blog.
Instead of writing raw SVG or Mermaid, output a structured JSON (or YAML) block inside \`\`\`illustration ... \`\`\` following the IllustrationSpec schema.

### Core Rules
1. **Never hardcode hex colors**: Always use semantic tones (\`"primary" | "secondary" | "accent" | "success" | "warning" | "danger" | "info" | "neutral"\`) and variants (\`"soft" | "filled" | "outlined" | "dashed" | "ghost"\`). The runtime automatically adapts them to the blog's Light/Dark CSS variables.
2. **Avoid manual pixel math**:
   - Inside \`group\` or \`window\`, use \`layout: { type: "flex", direction: "row" | "column", gap: 16 }\`.
   - Between top-level siblings, use relative placement: \`place: { rightOf: "node_id", gap: 48, align: "center" }\` or \`below: "node_id"\`.
   - Only use explicit \`x, y\` coordinates for free-form geometric canvas drawings.
3. **Use compound technical primitives**:
   - \`card\`: Title, optional icon (\`cpu\`, \`layers\`, \`database\`, \`cloud\`, \`lock\`, \`sparkles\`, \`terminal\`, \`code\`, \`server\`, \`globe\`, \`zap\`), badge, and body text.
   - \`code-block\`: Displays code with syntax lines and \`highlightLines: [2, 3]\`. Each 1-indexed line exposes an anchor \`<id>.line_<n>\` (e.g. \`from: "code1.line_2@right"\`).
   - \`table\`: Memory layout, struct fields, or cache tables. Each cell exposes an anchor \`<id>.cell_<row>_<col>\`.
   - \`terminal\`: CLI commands and outputs. Each 1-indexed line exposes an anchor \`<id>.line_<n>\`.
   - \`callout\`: Floating annotation pointing to \`target: "<node_or_subanchor_id>"\`.
4. **Connections, Labels & Animation**:
   - Connect any node or sub-anchor using \`from: "nodeA@right"\`, \`to: "nodeB@left"\` (or with explicit port ratio \`"nodeA@right:30%"\`).
   - Set \`routing: "orthogonal" | "curved" | "straight"\`.
   - Fine-tune edge labels with \`label\`, \`labelPosition: "start" | "center" | "end" | 0.5\`, \`labelSide: "center" | "top" | "bottom" | "left" | "right"\`, and \`labelOffset: [dx, dy]\`.
   - Add \`animation: { type: "flow" | "pulse" | "bidirectional", speed: "normal" }\` for active data/request paths.
`;

export function getIllustrationJsonSchema(): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "IllustrationSpec",
    type: "object",
    required: ["elements"],
    properties: {
      title: { type: "string" },
      canvas: {
        type: "object",
        properties: {
          padding: { type: "number" },
          background: { enum: ["transparent", "surface", "dots", "grid"] },
        },
      },
      style: {
        type: "object",
        properties: {
          preset: { enum: ["clean", "sketch", "blueprint"] },
        },
      },
      elements: {
        type: "array",
        items: { type: "object" },
      },
      connections: {
        type: "array",
        items: {
          type: "object",
          required: ["from", "to"],
          properties: {
            from: { type: "string" },
            to: { type: "string" },
            label: { type: "string" },
            labelPosition: {
              type: ["number", "string"],
              enum: ["start", "center", "end", 0.25, 0.5, 0.75],
            },
            labelSide: {
              enum: ["center", "top", "bottom", "left", "right"],
            },
            labelOffset: {
              type: "array",
              items: { type: "number" },
              minItems: 2,
              maxItems: 2,
            },
            routing: { enum: ["orthogonal", "curved", "straight"] },
            tone: {
              enum: [
                "neutral",
                "primary",
                "secondary",
                "accent",
                "success",
                "warning",
                "danger",
                "info",
              ],
            },
            strokeStyle: { enum: ["solid", "dashed", "dotted"] },
            animation: {
              type: ["boolean", "object"],
            },
          },
        },
      },
    },
  };
}
