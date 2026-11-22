/**
 * Remark / MDX Build-Time Plugin
 * Transforms ```illustration JSON/YAML code blocks into <ai-illustration> custom elements.
 */

import { validateIllustrationSpec } from "../schema/spec.ts";

export interface RemarkAiIllustrationOptions {
  /** Custom element tag name, default "ai-illustration" */
  tagName?: string;
  /** Default preset: "clean" | "sketch" */
  defaultPreset?: "clean" | "sketch";
  /** Default responsive mode: "reflow" | "scale" */
  responsive?: "reflow" | "scale";
  /** Optional custom YAML parser (if blog uses YAML inside ```illustration blocks) */
  parseYaml?: (raw: string) => unknown;
}

interface MdastNode {
  type: string;
  lang?: string;
  meta?: string;
  value?: string;
  children?: MdastNode[];
}

export function remarkAiIllustration(
  options: RemarkAiIllustrationOptions = {}
) {
  const tagName = options.tagName || "ai-illustration";
  const responsive = options.responsive || "reflow";

  return function transformer(tree: MdastNode): void {
    const walk = (node: MdastNode) => {
      if (!node.children) return;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (
          child.type === "code" &&
          (child.lang === "illustration" || child.lang === "ai-illustration")
        ) {
          const raw = (child.value || "").trim();
          let parsed: unknown;

          try {
            if (raw.startsWith("{")) {
              parsed = JSON.parse(raw);
            } else if (options.parseYaml) {
              parsed = options.parseYaml(raw);
            } else {
              parsed = JSON.parse(raw);
            }
          } catch (err) {
            throw new Error(
              `[remark-ai-illustration] Failed to parse illustration block: ${(err as Error).message}`
            );
          }

          const check = validateIllustrationSpec(parsed);
          if (!check.valid) {
            throw new Error(
              `[remark-ai-illustration] Invalid IllustrationSpec:\n${check.errors.join("\n")}`
            );
          }

          const serialized = JSON.stringify(check.spec).replace(
            /<\/script>/gi,
            "<\\/script>"
          );
          const presetAttr = options.defaultPreset
            ? ` preset="${options.defaultPreset}"`
            : "";

          node.children[i] = {
            type: "html",
            value: `<${tagName}${presetAttr} responsive="${responsive}"><script type="application/json">${serialized}</script></${tagName}>`,
          };
        } else {
          walk(child);
        }
      }
    };

    walk(tree);
  };
}
