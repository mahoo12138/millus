/**
 * Remark / MDX Build-Time Plugin (millus/remark)
 * Transforms ```illustration JSON/YAML code blocks into <ai-illustration> custom elements,
 * with built-in YAML/Loose-JSON parsing, CSS-variable SSR SVG fallback for Zero-CLS & dark-mode parity,
 * safe JSON script escaping, and MDX v2+ mdxJsxFlowElement output support.
 */

import {
  parseIllustrationSpecText,
  validateIllustrationSpec,
  VALID_PRESET_STYLES,
  type PresetStyle,
} from "../schema/spec.ts";
import { compileIllustration } from "../compiler/index.ts";
import { createSsrThemeTokens } from "../runtime/theme-observer.ts";
import { TextMeasurer } from "../runtime/text-measurer.ts";
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
  /** Output AST mode: "html" for standard Markdown, "mdx" for MDX v2+ (mdxJsxFlowElement), or "auto" (default) */
  mode?: "auto" | "html" | "mdx";
  /** Optional custom YAML parser override */
  parseYaml?: (raw: string) => unknown;
}

export interface MdastNode {
  type: string;
  lang?: string;
  meta?: string;
  value?: string;
  name?: string;
  attributes?: MdxJsxAttribute[];
  children?: MdastNode[];
  data?: Record<string, unknown>;
}

export interface MdxJsxAttribute {
  type: "mdxJsxAttribute";
  name: string;
  value?:
    | string
    | null
    | {
        type: "mdxJsxAttributeValueExpression";
        value: string;
        data?: {
          estree?: Record<string, unknown>;
        };
      };
}

interface VFileLike {
  path?: string;
  extname?: string;
  history?: string[];
}

function escapeHtmlAttr(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeTagName(raw: string): string {
  const cleaned = raw.trim().toLowerCase();
  if (/^[a-z][a-z0-9-]*$/.test(cleaned)) return cleaned;
  return "ai-illustration";
}

/**
 * Safely serializes JSON for embedding inside HTML `<script type="application/json">`.
 * Escapes `<`, `>`, U+2028, and U+2029 so `</script>`, `<!--`, `<script`, and JS line separators
 * can never break out of the script element while preserving 100% valid JSON.
 */
export function serializeSpecForHtmlScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function hashText(str: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function treeHasMdxNodes(node: MdastNode): boolean {
  if (node.type.startsWith("mdx")) return true;
  if (!node.children) return false;
  for (const child of node.children) {
    if (treeHasMdxNodes(child)) return true;
  }
  return false;
}

function createObjectExpressionAttribute(
  name: string,
  props: Record<string, string>
): MdxJsxAttribute {
  const jsObjLiteral = JSON.stringify(props);
  return {
    type: "mdxJsxAttribute",
    name,
    value: {
      type: "mdxJsxAttributeValueExpression",
      value: jsObjLiteral,
      data: {
        estree: {
          type: "Program",
          sourceType: "module",
          body: [
            {
              type: "ExpressionStatement",
              expression: {
                type: "ObjectExpression",
                properties: Object.entries(props).map(([k, v]) => ({
                  type: "Property",
                  method: false,
                  shorthand: false,
                  computed: false,
                  kind: "init",
                  key: { type: "Identifier", name: k },
                  value: { type: "Literal", value: v, raw: JSON.stringify(v) },
                })),
              },
            },
          ],
        },
      },
    },
  };
}

export function remarkAiIllustration(
  options: RemarkAiIllustrationOptions = {}
) {
  const tagName = sanitizeTagName(options.tagName || "ai-illustration");
  const responsive = options.responsive === "scale" ? "scale" : "reflow";
  const prerenderSvg = options.prerenderSvg ?? true;
  const configuredMode = options.mode || "auto";
  const defaultPreset =
    options.defaultPreset && VALID_PRESET_STYLES.has(options.defaultPreset)
      ? options.defaultPreset
      : undefined;

  return function transformer(tree: MdastNode, file?: VFileLike): void {
    const isMdx =
      configuredMode === "mdx" ||
      (configuredMode === "auto" &&
        (file?.extname === ".mdx" ||
          Boolean(file?.path?.endsWith(".mdx")) ||
          Boolean(file?.history?.some((p) => p.endsWith(".mdx"))) ||
          treeHasMdxNodes(tree)));

    let blockIndex = 0;

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

          const currentBlockIdx = blockIndex++;
          const effectivePreset = defaultPreset || check.spec.style?.preset;
          let ssrSvg = "";
          let ssrWidth = 0;
          let ssrHeight = 0;

          if (prerenderSvg) {
            const ssrTheme = createSsrThemeTokens(
              effectivePreset,
              check.spec.style?.roughness
            );
            const ssrMeasurer = new TextMeasurer({ forceHeadless: true });
            const ssrScene = compileIllustration(
              check.spec,
              ssrTheme,
              { compactViewport: false },
              ssrMeasurer
            );
            ssrWidth = ssrScene.width;
            ssrHeight = ssrScene.height;
            const idPrefix = `ill-ssr-${hashText(
              `${raw}|${effectivePreset || "clean"}`
            )}-${currentBlockIdx}`;
            ssrSvg = renderSceneGraphToSvgString(ssrScene, {
              idPrefix,
              includeCssVarDefaults: true,
            });
          }

          if (isMdx) {
            const attrs: MdxJsxAttribute[] = [];
            if (defaultPreset) {
              attrs.push({
                type: "mdxJsxAttribute",
                name: "preset",
                value: defaultPreset,
              });
            }
            attrs.push({
              type: "mdxJsxAttribute",
              name: "responsive",
              value: responsive,
            });
            attrs.push({
              type: "mdxJsxAttribute",
              name: "spec",
              value: JSON.stringify(check.spec),
            });
            if (prerenderSvg && ssrWidth > 0 && ssrHeight > 0) {
              attrs.push({
                type: "mdxJsxAttribute",
                name: "data-ssr-width",
                value: String(ssrWidth),
              });
              attrs.push({
                type: "mdxJsxAttribute",
                name: "data-ssr-height",
                value: String(ssrHeight),
              });
            }

            const mdxChildren: MdastNode[] = [];
            if (prerenderSvg && ssrSvg) {
              mdxChildren.push({
                type: "mdxJsxFlowElement",
                name: "div",
                attributes: [
                  {
                    type: "mdxJsxAttribute",
                    name: "className",
                    value: "ai-ill-ssr-fallback",
                  },
                  createObjectExpressionAttribute("style", {
                    aspectRatio: `${ssrWidth} / ${ssrHeight}`,
                    maxWidth: `${ssrWidth}px`,
                    margin: "0 auto",
                  }),
                  createObjectExpressionAttribute("dangerouslySetInnerHTML", {
                    __html: ssrSvg,
                  }),
                ],
                children: [],
              });
            }

            node.children[i] = {
              type: "mdxJsxFlowElement",
              name: tagName,
              attributes: attrs,
              children: mdxChildren,
            };
          } else {
            const serialized = serializeSpecForHtmlScript(check.spec);
            const presetAttr = defaultPreset
              ? ` preset="${escapeHtmlAttr(defaultPreset)}"`
              : "";
            const ssrSizeAttrs =
              prerenderSvg && ssrWidth > 0 && ssrHeight > 0
                ? ` data-ssr-width="${ssrWidth}" data-ssr-height="${ssrHeight}"`
                : "";
            const ssrFallbackHtml =
              prerenderSvg && ssrSvg
                ? `<div class="ai-ill-ssr-fallback" style="aspect-ratio: ${ssrWidth} / ${ssrHeight}; max-width: ${ssrWidth}px; margin: 0 auto;">${ssrSvg}</div>`
                : "";

            node.children[i] = {
              type: "html",
              value: `<${tagName}${presetAttr} responsive="${escapeHtmlAttr(responsive)}"${ssrSizeAttrs}><script type="application/json">${serialized}</script>${ssrFallbackHtml}</${tagName}>`,
            };
          }
        } else {
          walk(child);
        }
      }
    };

    walk(tree);
  };
}
