/**
 * Remark / MDX Build-Time Plugin
 * Transforms ```illustration JSON/YAML code blocks into <ai-illustration> custom elements,
 * with built-in YAML/Loose-JSON parsing and SSG pre-rendered inline SVG fallback for Zero-CLS & SEO/RSS.
 */

import {
  parseIllustrationSpecText,
  validateIllustrationSpec,
  type PresetStyle,
} from "../schema/spec.ts";
import { compileIllustration } from "../compiler/index.ts";
import { resolveThemeTokens } from "../runtime/theme-observer.ts";
import { renderSceneGraphToSvgString } from "../runtime/svg-dom-renderer.ts";

export interface RemarkAiIllustrationOptions {
  /** Custom element tag name, default "ai-illustration" */
  tagName?: string;
  /** Default preset: "clean" | "sketch" | "blueprint" */
  defaultPreset?: PresetStyle;
  /** Default responsive mode: "reflow" | "scale" */
  responsive?: "reflow" | "scale";
  /** Pre-render static inline SVG fallback at build time for Zero-CLS, SEO, and RSS readers (default: true) */
  prerenderSvg?: boolean;
  /** Optional custom YAML parser override */
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
  const prerenderSvg = options.prerenderSvg ?? true;

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
            if (!raw.startsWith("{") && options.parseYaml) {
              parsed = options.parseYaml(raw);
            } else {
              parsed = parseIllustrationSpecText(raw);
            }
          } catch (err) {
            throw new Error(
              `[remark-ai-illustration] Failed to parse illustration block: ${(err as Error).message}`
            );
          }

          const check = validateIllustrationSpec(parsed);
          if (!check.valid || !check.spec) {
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

          let ssrFallbackHtml = "";
          if (prerenderSvg) {
            const ssrTheme = resolveThemeTokens(
              null,
              options.defaultPreset || check.spec.style?.preset,
              check.spec.style?.roughness
            );
            const ssrScene = compileIllustration(check.spec, ssrTheme, {
              compactViewport: false,
            });
            const ssrSvg = renderSceneGraphToSvgString(ssrScene);
            ssrFallbackHtml = `<div class="ai-ill-ssr-fallback">${ssrSvg}</div>`;
          }

          node.children[i] = {
            type: "html",
            value: `<${tagName}${presetAttr} responsive="${responsive}"><script type="application/json">${serialized}</script>${ssrFallbackHtml}</${tagName}>`,
          };
        } else {
          walk(child);
        }
      }
    };

    walk(tree);
  };
}
