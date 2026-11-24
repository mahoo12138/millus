/**
 * <ai-illustration> Standard Web Component Runtime
 * Framework-agnostic CustomElement with ThemeObserver, ResizeObserver, Child MutationObserver,
 * Sub-Anchor Hover Focus Highlighting, and Floating Toolbar (Clean/Sketch/Blueprint, Pan/Zoom, HiDPI PNG Export).
 */

import {
  parseIllustrationSpecText,
  validateIllustrationSpec,
  VALID_PRESET_STYLES,
  type IllustrationSpec,
  type PresetStyle,
  type SceneGraph,
} from "../schema/spec.ts";
import { compileIllustration } from "../compiler/index.ts";
import {
  computeThemeFingerprint,
  resolveThemeTokens,
  ThemeObserver,
} from "./theme-observer.ts";
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

const COMPACT_BREAKPOINT_PX = 620;
const MAX_PNG_CANVAS_DIM = 8192;
const MAX_PNG_CANVAS_AREA = 16_777_216; // 4096 x 4096

let wcInstanceCounter = 0;

/**
 * Computes safe PNG export scale factor capped by browser canvas dimension & pixel-area limits.
 */
export function computeSafePngExportScale(
  width: number,
  height: number,
  preferredScale = 2
): number {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const maxDimScale = Math.min(
    MAX_PNG_CANVAS_DIM / safeW,
    MAX_PNG_CANVAS_DIM / safeH
  );
  const maxAreaScale = Math.sqrt(MAX_PNG_CANVAS_AREA / (safeW * safeH));
  return Math.max(0.5, Math.min(preferredScale, maxDimScale, maxAreaScale));
}

const BaseHTMLElement: typeof HTMLElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

export class AiIllustrationElement extends BaseHTMLElement {
  static get observedAttributes(): string[] {
    return ["spec", "preset", "responsive", "toolbar"];
  }

  private shadow: ShadowRoot;
  private rootEl: HTMLDivElement | null = null;
  private modalHostEl: HTMLDivElement | null = null;
  private parsedSpec: IllustrationSpec | null = null;
  private parseError: string | null = null;
  private specFromProperty = false;
  private lastDomSpecText: string | null = null;
  private currentScene: SceneGraph | null = null;
  private themeObserver?: ThemeObserver;
  private resizeObserver?: ResizeObserver;
  private childObserver?: MutationObserver;
  private lightboxAbort?: AbortController;
  private measurer = new TextMeasurer();
  private headlessMeasurer = new TextMeasurer({ forceHeadless: true });
  private overridePreset?: PresetStyle;
  private forceCompact?: boolean;
  private containerWidth = 900;
  private lastRenderKey = "";
  private readonly instancePrefix: string;

  constructor() {
    super();
    this.instancePrefix = `ill-wc-${++wcInstanceCounter}`;
    this.shadow = this.attachShadow({ mode: "open" });
    this.ensureShadowStructure();
  }

  private ensureShadowStructure(): void {
    if (this.rootEl && this.modalHostEl) return;
    if (typeof document === "undefined") return;
    this.shadow.innerHTML = "";
    const styleEl = document.createElement("style");
    styleEl.textContent = COMPONENT_STYLES;
    this.rootEl = document.createElement("div");
    this.rootEl.className = "ai-ill-root";
    this.modalHostEl = document.createElement("div");
    this.modalHostEl.className = "ai-ill-modal-host";
    this.shadow.append(styleEl, this.rootEl, this.modalHostEl);
  }

  get spec(): IllustrationSpec | null {
    return this.parsedSpec;
  }

  set spec(val: IllustrationSpec | string | null) {
    if (val === null) {
      this.specFromProperty = false;
      this.parsedSpec = null;
      this.parseError = null;
      this.lastDomSpecText = null;
    } else if (typeof val === "string") {
      this.specFromProperty = true;
      this.parseSpecString(val);
    } else {
      this.specFromProperty = true;
      this.parsedSpec = val;
      this.parseError = null;
    }
    this.lastRenderKey = "";
    this.render();
  }

  public computeIsCompact(width = this.containerWidth): boolean {
    if (this.forceCompact !== undefined) {
      return this.forceCompact;
    }
    const responsiveAttr = this.getAttribute("responsive") || "reflow";
    return responsiveAttr === "reflow" && width < COMPACT_BREAKPOINT_PX;
  }

  connectedCallback(): void {
    this.ensureShadowStructure();
    if (typeof this.getBoundingClientRect === "function") {
      const rectW = this.getBoundingClientRect().width;
      if (rectW > 0) this.containerWidth = rectW;
    }

    this.loadSpecFromDom(false);

    this.themeObserver = new ThemeObserver(this, () => {
      this.render();
    });
    this.themeObserver.connect();

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w <= 0) continue;
          const prevCompact = this.computeIsCompact(this.containerWidth);
          this.containerWidth = w;
          const responsiveAttr = this.getAttribute("responsive") || "reflow";
          if (responsiveAttr === "scale") continue;
          const nextCompact = this.computeIsCompact(w);
          if (nextCompact !== prevCompact) {
            this.render();
          }
        }
      });
      this.resizeObserver.observe(this);
    }

    if (typeof MutationObserver !== "undefined") {
      this.childObserver = new MutationObserver(() => {
        if (this.specFromProperty || this.getAttribute("spec")) return;
        const changed = this.loadSpecFromDom(true);
        if (changed) {
          this.lastRenderKey = "";
          this.render();
        }
      });
      this.childObserver.observe(this, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    this.render();
  }

  disconnectedCallback(): void {
    this.themeObserver?.disconnect();
    this.themeObserver = undefined;
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.childObserver?.disconnect();
    this.childObserver = undefined;
    this.closeFullscreenLightbox();
  }

  attributeChangedCallback(
    name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    if (oldVal === newVal) return;
    if (name === "spec") {
      if (newVal) {
        this.parseSpecString(newVal);
      } else if (!this.specFromProperty) {
        this.parsedSpec = null;
        this.parseError = null;
        this.lastDomSpecText = null;
        this.loadSpecFromDom(true);
      }
    } else if (name === "preset") {
      this.overridePreset =
        newVal && VALID_PRESET_STYLES.has(newVal)
          ? (newVal as PresetStyle)
          : undefined;
    }
    this.lastRenderKey = "";
    if (this.isConnected) {
      this.render();
    }
  }

  private extractRawSpecTextFromChildren(): string | null {
    const scriptEl = this.querySelector(
      'script[type="application/json"], script[type="application/yaml"]'
    );
    if (scriptEl && scriptEl.textContent?.trim()) {
      return scriptEl.textContent.trim();
    }

    // Collect plain light-DOM text while ignoring pre-rendered SSR fallback containers
    const textParts: string[] = [];
    for (const node of Array.from(this.childNodes)) {
      if (
        node.nodeType === 1 &&
        (node as Element).classList?.contains("ai-ill-ssr-fallback")
      ) {
        continue;
      }
      const txt = node.textContent?.trim();
      if (txt) textParts.push(txt);
    }
    const joined = textParts.join("\n").trim();
    return joined || null;
  }

  private loadSpecFromDom(allowReload: boolean): boolean {
    if (!allowReload && (this.parsedSpec || this.parseError)) return false;

    const attrSpec = this.getAttribute("spec");
    if (attrSpec) {
      if (attrSpec === this.lastDomSpecText && !allowReload) return false;
      this.lastDomSpecText = attrSpec;
      this.parseSpecString(attrSpec);
      return true;
    }

    const rawText = this.extractRawSpecTextFromChildren();
    if (!rawText) return false;
    if (rawText === this.lastDomSpecText) return false;

    this.lastDomSpecText = rawText;
    this.parseSpecString(rawText);
    return true;
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

  private renderError(heading: string, detail: string): void {
    this.ensureShadowStructure();
    if (!this.rootEl) return;
    this.rootEl.textContent = "";
    const errDiv = document.createElement("div");
    errDiv.className = "ai-ill-error";
    errDiv.textContent = `${heading}\n${detail}`;
    this.rootEl.appendChild(errDiv);
  }

  public render(): void {
    this.ensureShadowStructure();
    if (!this.parsedSpec && !this.parseError) {
      this.loadSpecFromDom(false);
    }
    if (this.parseError) {
      this.lastRenderKey = "";
      this.renderError("Spec Parse Error:", this.parseError);
      return;
    }
    if (!this.parsedSpec || !this.rootEl) return;

    const validation = validateIllustrationSpec(this.parsedSpec);
    if (!validation.valid || !validation.spec) {
      this.lastRenderKey = "";
      this.renderError(
        "Invalid IllustrationSpec:",
        validation.errors.join("\n")
      );
      return;
    }

    const presetAttr = this.getAttribute("preset");
    const validPresetAttr =
      presetAttr && VALID_PRESET_STYLES.has(presetAttr)
        ? (presetAttr as PresetStyle)
        : undefined;
    const activePreset =
      this.overridePreset ||
      validPresetAttr ||
      validation.spec.style?.preset ||
      undefined;

    const isCompact = this.computeIsCompact();
    const showToolbar = this.getAttribute("toolbar") !== "false";
    const themeFp = computeThemeFingerprint(this);

    // Preserve SSR pixel dimensions on initial non-compact hydration for Zero-CLS parity
    const hasSsrDimensions =
      this.hasAttribute("data-ssr-width") &&
      this.hasAttribute("data-ssr-height");
    const useSsrMeasurer =
      hasSsrDimensions &&
      !isCompact &&
      this.forceCompact === undefined &&
      this.overridePreset === undefined;

    const renderKey = [
      activePreset || "",
      isCompact ? "1" : "0",
      showToolbar ? "1" : "0",
      useSsrMeasurer ? "1" : "0",
      themeFp,
    ].join("::");

    if (renderKey === this.lastRenderKey && this.currentScene) {
      return;
    }

    const theme = resolveThemeTokens(
      this,
      activePreset,
      validation.spec.style?.roughness
    );

    const activeMeasurer = useSsrMeasurer
      ? this.headlessMeasurer
      : this.measurer;

    const scene = compileIllustration(
      validation.spec,
      theme,
      { compactViewport: isCompact },
      activeMeasurer
    );
    this.currentScene = scene;
    this.lastRenderKey = renderKey;

    const svgHtml = renderSceneGraphToSvgString(scene, {
      idPrefix: this.instancePrefix,
    });
    const isAltPreset = scene.preset !== "clean";
    const presetLabel =
      scene.preset === "sketch"
        ? "✎ Sketch"
        : scene.preset === "blueprint"
        ? "⊞ Blueprint"
        : "◇ Clean";

    this.rootEl.innerHTML = `
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

    // If fullscreen lightbox is open during a theme/preset update, refresh its SVG in place
    if (this.modalHostEl) {
      const openModalCanvas = this.modalHostEl.querySelector(
        ".ai-ill-modal-canvas"
      ) as HTMLElement | null;
      if (openModalCanvas) {
        openModalCanvas.innerHTML = renderSceneGraphToSvgString(scene, {
          idPrefix: `${this.instancePrefix}-modal`,
        });
      }
    }

    this.bindInteractiveEvents();
  }

  private bindInteractiveEvents(): void {
    if (!this.rootEl) return;
    const svgEl = this.rootEl.querySelector(".ai-ill-svg") as SVGSVGElement | null;
    if (!svgEl || !this.currentScene) return;

    const adjacency = this.currentScene.adjacency;

    const applyFocus = (focusKey: string | null) => {
      const allNodes = svgEl.querySelectorAll<SVGGElement>(".ai-ill-node");
      const allEdges = svgEl.querySelectorAll<SVGGElement>(".ai-ill-edge");
      const allEdgeLabels = svgEl.querySelectorAll<SVGGElement>(
        ".ai-ill-edge-label"
      );
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
        allEdgeLabels.forEach((el) =>
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

      allEdgeLabels.forEach((el) => {
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
        if (
          nid &&
          adjacency[nid] &&
          (adjacency[nid].edgeIds.size > 0 || adjacency[nid].nodeIds.size > 1)
        ) {
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
    const toolbar = this.rootEl.querySelector(".ai-ill-toolbar");
    toolbar?.addEventListener("click", (e) => {
      const btn = (e.target as Element).closest(
        "[data-action]"
      ) as HTMLElement | null;
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
        this.lastRenderKey = "";
        this.render();
      } else if (action === "toggle-compact") {
        this.forceCompact = !this.computeIsCompact();
        this.lastRenderKey = "";
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

  private closeFullscreenLightbox(): void {
    this.lightboxAbort?.abort();
    this.lightboxAbort = undefined;
    if (this.modalHostEl) {
      this.modalHostEl.textContent = "";
    }
  }

  private openFullscreenLightbox(): void {
    if (!this.currentScene || !this.modalHostEl) return;
    this.closeFullscreenLightbox();

    const abortController = new AbortController();
    this.lightboxAbort = abortController;
    const { signal } = abortController;

    const svgHtml = renderSceneGraphToSvgString(this.currentScene, {
      idPrefix: `${this.instancePrefix}-modal`,
    });
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
      { passive: false, signal }
    );

    viewportEl.addEventListener(
      "mousedown",
      (e) => {
        dragging = true;
        startX = e.clientX - tx;
        startY = e.clientY - ty;
      },
      { signal }
    );

    window.addEventListener(
      "mousemove",
      (e) => {
        if (!dragging) return;
        tx = e.clientX - startX;
        ty = e.clientY - startY;
        updateTransform();
      },
      { signal }
    );

    window.addEventListener(
      "mouseup",
      () => {
        dragging = false;
      },
      { signal }
    );

    window.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape") {
          this.closeFullscreenLightbox();
        }
      },
      { signal }
    );

    modal.addEventListener(
      "click",
      (e) => {
        const target = e.target as HTMLElement;
        const act = target.getAttribute("data-modal-action");
        if (act === "close" || target === modal) {
          this.closeFullscreenLightbox();
        } else if (act === "reset") {
          scale = 1;
          tx = 0;
          ty = 0;
          updateTransform();
        }
      },
      { signal }
    );

    this.modalHostEl.appendChild(modal);
  }

  private flashButtonFeedback(
    btn: HTMLElement,
    message: string,
    durationMs = 1500
  ): void {
    const original = btn.dataset.origLabel || btn.textContent || "";
    btn.dataset.origLabel = original;
    btn.textContent = message;
    setTimeout(() => {
      btn.textContent = original;
    }, durationMs);
  }

  private async copyCurrentSvg(btn: HTMLElement): Promise<void> {
    if (!this.currentScene) return;
    const svgString = renderSceneGraphToSvgString(this.currentScene, {
      idPrefix: `ill-${Date.now().toString(36)}`,
    });
    try {
      await navigator.clipboard.writeText(svgString);
      this.flashButtonFeedback(btn, "✓ 已复制", 1400);
    } catch {
      this.flashButtonFeedback(btn, "⚠ 复制失败", 1600);
    }
  }

  private exportCurrentThemePng(btn: HTMLElement): void {
    if (!this.currentScene) return;
    const scene = this.currentScene;
    // Note: SVG rendered inside <img> is sandboxed by browsers and will not fetch external @font-face files;
    // standard system/fallback font stacks from ThemeTokens are used automatically.
    const svgString = renderSceneGraphToSvgString(scene, {
      idPrefix: `${this.instancePrefix}-png`,
    });
    const scale = computeSafePngExportScale(scene.width, scene.height, 2);

    const blob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onerror = () => {
      URL.revokeObjectURL(url);
      this.flashButtonFeedback(btn, "⚠ 导出失败", 1800);
    };

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(scene.width * scale));
        canvas.height = Math.max(1, Math.round(scene.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          this.flashButtonFeedback(btn, "⚠ 导出失败", 1800);
          return;
        }

        ctx.fillStyle = scene.theme.colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            this.flashButtonFeedback(btn, "⚠ 导出失败", 1800);
            return;
          }
          const dlUrl = URL.createObjectURL(pngBlob);
          const a = document.createElement("a");
          a.href = dlUrl;
          a.download = `${(scene.title || "illustration").replace(/\s+/g, "-").toLowerCase()}-${scene.theme.mode}.png`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);
          this.flashButtonFeedback(btn, "✓ PNG", 1400);
        }, "image/png");
      } catch {
        this.flashButtonFeedback(btn, "⚠ 导出失败", 1800);
      } finally {
        URL.revokeObjectURL(url);
      }
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
