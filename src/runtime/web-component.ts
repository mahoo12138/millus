/**
 * <ai-illustration> Standard Web Component Runtime
 * Framework-agnostic CustomElement with ThemeObserver, ResizeObserver,
 * Sub-Anchor Hover Focus Highlighting, and Floating Toolbar (Clean/Sketch, Pan/Zoom, HiDPI PNG Export).
 */

import type {
  IllustrationSpec,
  PresetStyle,
  SceneGraph,
} from "../schema/spec.ts";
import {
  parseIllustrationSpecText,
  validateIllustrationSpec,
} from "../schema/spec.ts";
import { compileIllustration } from "../compiler/index.ts";
import { resolveThemeTokens, ThemeObserver } from "./theme-observer.ts";
import { TextMeasurer } from "./text-measurer.ts";
import { renderSceneGraphToSvgString } from "./svg-dom-renderer.ts";

const COMPONENT_STYLES = `
:host {
  display: block;
  position: relative;
  width: 100%;
  margin: 1.25rem 0;
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.ai-ill-wrapper {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}
.ai-ill-toolbar {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 6px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.ai-ill-wrapper:hover .ai-ill-toolbar,
.ai-ill-toolbar:focus-within {
  opacity: 1;
  transform: translateY(0);
}
.ai-ill-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: #e2e8f0;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: background 0.15s ease, color 0.15s ease;
}
.ai-ill-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}
.ai-ill-btn.is-active {
  background: rgba(59, 130, 246, 0.38);
  color: #93c5fd;
}
.ai-ill-stage {
  width: 100%;
  overflow-x: auto;
}
.ai-ill-error {
  padding: 14px 16px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #ef4444;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  white-space: pre-wrap;
}
/* Fullscreen Modal Lightbox */
.ai-ill-modal {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(8, 12, 20, 0.86);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.ai-ill-modal-header {
  position: absolute;
  top: 18px;
  right: 24px;
  display: flex;
  gap: 8px;
}
.ai-ill-modal-viewport {
  width: 92vw;
  height: 84vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: grab;
}
.ai-ill-modal-viewport:active {
  cursor: grabbing;
}
`;

const BaseHTMLElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class AiIllustrationElement extends BaseHTMLElement {
  static get observedAttributes(): string[] {
    return ["spec", "preset", "responsive", "toolbar"];
  }

  private shadow: ShadowRoot;
  private parsedSpec: IllustrationSpec | null = null;
  private parseError: string | null = null;
  private currentScene: SceneGraph | null = null;
  private themeObserver?: ThemeObserver;
  private resizeObserver?: ResizeObserver;
  private measurer = new TextMeasurer();
  private overridePreset?: PresetStyle;
  private forceCompact?: boolean;
  private containerWidth = 900;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  get spec(): IllustrationSpec | null {
    return this.parsedSpec;
  }

  set spec(val: IllustrationSpec | string | null) {
    if (typeof val === "string") {
      this.parseSpecString(val);
    } else {
      this.parsedSpec = val;
      this.parseError = null;
    }
    this.render();
  }

  connectedCallback(): void {
    this.loadInitialSpecFromDom();

    this.themeObserver = new ThemeObserver(this, () => {
      this.render();
    });
    this.themeObserver.connect();

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 0 && Math.abs(w - this.containerWidth) > 12) {
            this.containerWidth = w;
            this.render();
          }
        }
      });
      this.resizeObserver.observe(this);
    }

    this.render();
  }

  disconnectedCallback(): void {
    this.themeObserver?.disconnect();
    this.resizeObserver?.disconnect();
  }

  attributeChangedCallback(
    name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    if (oldVal === newVal) return;
    if (name === "spec" && newVal) {
      this.parseSpecString(newVal);
    } else if (name === "preset") {
      this.overridePreset = (newVal as PresetStyle) || undefined;
    }
    if (this.isConnected) {
      this.render();
    }
  }

  private loadInitialSpecFromDom(): void {
    if (this.parsedSpec) return;

    const attrSpec = this.getAttribute("spec");
    if (attrSpec) {
      this.parseSpecString(attrSpec);
      return;
    }

    const scriptEl = this.querySelector(
      'script[type="application/json"], script[type="application/yaml"]'
    );
    if (scriptEl && scriptEl.textContent) {
      this.parseSpecString(scriptEl.textContent);
      return;
    }

    const rawText = this.textContent?.trim();
    if (rawText) {
      this.parseSpecString(rawText);
    }
  }

  private parseSpecString(raw: string): void {
    try {
      const obj = parseIllustrationSpecText(raw);
      this.parsedSpec = obj as IllustrationSpec;
      this.parseError = null;
    } catch (err) {
      this.parsedSpec = null;
      this.parseError = (err as Error).message;
    }
  }

  public render(): void {
    if (!this.parsedSpec && !this.parseError) {
      this.loadInitialSpecFromDom();
    }
    if (this.parseError) {
      this.shadow.innerHTML = `<style>${COMPONENT_STYLES}</style>
        <div class="ai-ill-error">Spec Parse Error:\n${this.parseError}</div>`;
      return;
    }
    if (!this.parsedSpec) return;

    const validation = validateIllustrationSpec(this.parsedSpec);
    if (!validation.valid || !validation.spec) {
      this.shadow.innerHTML = `<style>${COMPONENT_STYLES}</style>
        <div class="ai-ill-error">Invalid IllustrationSpec:\n${validation.errors.join("\n")}</div>`;
      return;
    }

    const activePreset =
      this.overridePreset ||
      (this.getAttribute("preset") as PresetStyle) ||
      validation.spec.style?.preset ||
      undefined;

    const theme = resolveThemeTokens(
      this,
      activePreset,
      validation.spec.style?.roughness
    );

    const responsiveAttr = this.getAttribute("responsive") || "reflow";
    const isCompact =
      this.forceCompact !== undefined
        ? this.forceCompact
        : responsiveAttr === "reflow" && this.containerWidth < 620;

    const scene = compileIllustration(
      validation.spec,
      theme,
      { compactViewport: isCompact },
      this.measurer
    );
    this.currentScene = scene;

    const svgHtml = renderSceneGraphToSvgString(scene);
    const showToolbar = this.getAttribute("toolbar") !== "false";
    const isAltPreset = scene.preset !== "clean";
    const presetLabel =
      scene.preset === "sketch"
        ? "✎ Sketch"
        : scene.preset === "blueprint"
        ? "⊞ Blueprint"
        : "◇ Clean";

    this.shadow.innerHTML = `
      <style>${COMPONENT_STYLES}</style>
      <div class="ai-ill-wrapper" data-mode="${theme.mode}" data-preset="${scene.preset}">
        ${
          showToolbar
            ? `<div class="ai-ill-toolbar" role="toolbar" aria-label="Illustration controls">
                <button class="ai-ill-btn ${isAltPreset ? "is-active" : ""}" data-action="toggle-preset" title="切换扁平 (Clean) / 手绘 (Sketch) / 工程蓝图 (Blueprint) 风格">
                  ${presetLabel}
                </button>
                <button class="ai-ill-btn ${isCompact ? "is-active" : ""}" data-action="toggle-compact" title="切换桌面横向 / 移动端纵向重排">
                  ${isCompact ? "↕ 纵排" : "↔ 横排"}
                </button>
                <button class="ai-ill-btn" data-action="fullscreen" title="全屏缩放预览">
                  ⤢ 预览
                </button>
                <button class="ai-ill-btn" data-action="export-png" title="导出当前主题高清 2x PNG">
                  ⬇ PNG
                </button>
                <button class="ai-ill-btn" data-action="copy-svg" title="复制 SVG 源码">
                  ⧉ SVG
                </button>
              </div>`
            : ""
        }
        <div class="ai-ill-stage">${svgHtml}</div>
      </div>
    `;

    this.bindInteractiveEvents();
  }

  private bindInteractiveEvents(): void {
    const svgEl = this.shadow.querySelector(".ai-ill-svg") as SVGSVGElement | null;
    if (!svgEl || !this.currentScene) return;

    const adjacency = this.currentScene.adjacency;

    const applyFocus = (focusKey: string | null) => {
      const allNodes = svgEl.querySelectorAll<SVGGElement>(".ai-ill-node");
      const allEdges = svgEl.querySelectorAll<SVGGElement>(".ai-ill-edge");
      const allAnchors =
        svgEl.querySelectorAll<SVGElement>(".ai-ill-subanchor");
      const allCalloutLinks = svgEl.querySelectorAll<SVGGElement>(
        ".ai-ill-callout-link"
      );

      if (!focusKey || !adjacency[focusKey]) {
        svgEl.classList.remove("has-focus");
        allNodes.forEach((el) =>
          el.classList.remove("is-active", "is-dimmed")
        );
        allEdges.forEach((el) =>
          el.classList.remove("is-active", "is-dimmed")
        );
        allAnchors.forEach((el) => el.classList.remove("is-active"));
        allCalloutLinks.forEach((el) =>
          el.classList.remove("is-active", "is-dimmed")
        );
        return;
      }

      const activeSet = adjacency[focusKey];
      svgEl.classList.add("has-focus");

      allNodes.forEach((el) => {
        const nid = el.getAttribute("data-node-id") || "";
        if (activeSet.nodeIds.has(nid)) {
          el.classList.add("is-active");
          el.classList.remove("is-dimmed");
        } else {
          el.classList.add("is-dimmed");
          el.classList.remove("is-active");
        }
      });

      allEdges.forEach((el) => {
        const eid = el.getAttribute("data-edge-id") || "";
        if (activeSet.edgeIds.has(eid)) {
          el.classList.add("is-active");
          el.classList.remove("is-dimmed");
        } else {
          el.classList.add("is-dimmed");
          el.classList.remove("is-active");
        }
      });

      allAnchors.forEach((el) => {
        const aid = el.getAttribute("data-anchor-id") || "";
        if (activeSet.anchorIds.has(aid)) {
          el.classList.add("is-active");
        } else {
          el.classList.remove("is-active");
        }
      });

      allCalloutLinks.forEach((el) => {
        const nid = el.getAttribute("data-node-id") || "";
        if (activeSet.nodeIds.has(nid)) {
          el.classList.add("is-active");
          el.classList.remove("is-dimmed");
        } else {
          el.classList.add("is-dimmed");
          el.classList.remove("is-active");
        }
      });
    };

    // Sub-anchor hover takes priority over parent node hover
    svgEl.addEventListener("mouseover", (e) => {
      const target = e.target as Element | null;
      if (!target) return;

      const subAnchorEl = target.closest("[data-anchor-id]");
      if (subAnchorEl) {
        const aid = subAnchorEl.getAttribute("data-anchor-id");
        if (aid && adjacency[aid] && adjacency[aid].edgeIds.size > 0) {
          applyFocus(aid);
          return;
        }
      }

      const edgeEl = target.closest("[data-edge-id]");
      if (edgeEl) {
        applyFocus(edgeEl.getAttribute("data-edge-id"));
        return;
      }

      const nodeEl = target.closest("[data-node-id]");
      if (nodeEl) {
        const nid = nodeEl.getAttribute("data-node-id");
        if (nid && adjacency[nid] && (adjacency[nid].edgeIds.size > 0 || adjacency[nid].nodeIds.size > 1)) {
          applyFocus(nid);
          return;
        }
      }

      applyFocus(null);
    });

    svgEl.addEventListener("mouseleave", () => {
      applyFocus(null);
    });

    // Toolbar actions
    const toolbar = this.shadow.querySelector(".ai-ill-toolbar");
    toolbar?.addEventListener("click", (e) => {
      const btn = (e.target as Element).closest("[data-action]") as HTMLElement | null;
      if (!btn) return;
      const action = btn.getAttribute("data-action");

      if (action === "toggle-preset") {
        const current = this.currentScene?.preset || "clean";
        this.overridePreset =
          current === "clean"
            ? "sketch"
            : current === "sketch"
            ? "blueprint"
            : "clean";
        this.render();
      } else if (action === "toggle-compact") {
        const currentCompact =
          this.forceCompact ?? this.containerWidth < 620;
        this.forceCompact = !currentCompact;
        this.render();
      } else if (action === "fullscreen") {
        this.openFullscreenLightbox();
      } else if (action === "export-png") {
        this.exportCurrentThemePng(btn);
      } else if (action === "copy-svg") {
        this.copyCurrentSvg(btn);
      }
    });
  }

  private openFullscreenLightbox(): void {
    if (!this.currentScene) return;
    const svgHtml = renderSceneGraphToSvgString(this.currentScene);
    const modal = document.createElement("div");
    modal.className = "ai-ill-modal";
    modal.innerHTML = `
      <div class="ai-ill-modal-header">
        <button class="ai-ill-btn" data-modal-action="reset">100% 重置</button>
        <button class="ai-ill-btn" data-modal-action="close">✕ 关闭 (Esc)</button>
      </div>
      <div class="ai-ill-modal-viewport">
        <div class="ai-ill-modal-canvas" style="transform-origin: center center; transition: transform 0.05s linear; width: min(90vw, ${this.currentScene.width * 1.25}px);">
          ${svgHtml}
        </div>
      </div>
    `;

    let scale = 1;
    let tx = 0;
    let ty = 0;
    let dragging = false;
    let startX = 0;
    let startY = 0;

    const canvasEl = modal.querySelector(".ai-ill-modal-canvas") as HTMLElement;
    const viewportEl = modal.querySelector(
      ".ai-ill-modal-viewport"
    ) as HTMLElement;

    const updateTransform = () => {
      canvasEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    };

    viewportEl.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.9;
        scale = Math.max(0.4, Math.min(4, scale * factor));
        updateTransform();
      },
      { passive: false }
    );

    viewportEl.addEventListener("mousedown", (e) => {
      dragging = true;
      startX = e.clientX - tx;
      startY = e.clientY - ty;
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      tx = e.clientX - startX;
      ty = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
    });

    modal.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const act = target.getAttribute("data-modal-action");
      if (act === "close" || target === modal) {
        modal.remove();
      } else if (act === "reset") {
        scale = 1;
        tx = 0;
        ty = 0;
        updateTransform();
      }
    });

    this.shadow.appendChild(modal);
  }

  private async copyCurrentSvg(btn: HTMLElement): Promise<void> {
    if (!this.currentScene) return;
    const svgString = renderSceneGraphToSvgString(this.currentScene);
    try {
      await navigator.clipboard.writeText(svgString);
      const original = btn.textContent;
      btn.textContent = "✓ 已复制";
      setTimeout(() => {
        btn.textContent = original;
      }, 1400);
    } catch {
      // Fallback ignored
    }
  }

  private exportCurrentThemePng(btn: HTMLElement): void {
    if (!this.currentScene) return;
    const scene = this.currentScene;
    const svgString = renderSceneGraphToSvgString(scene);
    const scale = 2; // 2x Retina HiDPI export

    const blob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = scene.width * scale;
      canvas.height = scene.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = scene.theme.colors.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const dlUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement("a");
        a.href = dlUrl;
        a.download = `${(scene.title || "illustration").replace(/\s+/g, "-").toLowerCase()}-${scene.theme.mode}.png`;
        a.click();
        URL.revokeObjectURL(dlUrl);
      }, "image/png");

      const original = btn.textContent;
      btn.textContent = "✓ PNG";
      setTimeout(() => {
        btn.textContent = original;
      }, 1400);
    };

    img.src = url;
  }
}

export function registerAiIllustrationElement(
  tagName = "ai-illustration"
): void {
  if (typeof window !== "undefined" && typeof customElements !== "undefined") {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, AiIllustrationElement);
    }
  }
}
