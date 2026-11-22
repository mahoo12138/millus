/**
 * Runtime Theme Observer & Multi-Blog CSS Variable Resolver
 * Automatically inherits CSS variables from custom blogs, VitePress, Astro Starlight, Docusaurus, or Tailwind.
 */

import type {
  PresetStyle,
  ResolvedNodeStyle,
  ResolvedThemeTokens,
  SemanticStyleSpec,
  SemanticTone,
  SurfaceVariant,
} from "../schema/spec.ts";

interface RGB {
  r: number;
  g: number;
  b: number;
}

export function parseColorToRgb(input: string, fallback: RGB): RGB {
  const trimmed = input.trim();
  if (!trimmed) return fallback;

  // Hex (#rgb or #rrggbb)
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  // rgb() or rgba()
  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }

  return fallback;
}

export function rgbToHex({ r, g, b }: RGB): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Mix colorA into colorB by weight (0..1 of colorA)
 */
export function mixColors(colorA: string, colorB: string, weightA: number): string {
  const a = parseColorToRgb(colorA, { r: 59, g: 130, b: 246 });
  const b = parseColorToRgb(colorB, { r: 255, g: 255, b: 255 });
  const w = Math.max(0, Math.min(1, weightA));
  return rgbToHex({
    r: a.r * w + b.r * (1 - w),
    g: a.g * w + b.g * (1 - w),
    b: a.b * w + b.b * (1 - w),
  });
}

export function getRelativeLuminance(color: string): number {
  const { r, g, b } = parseColorToRgb(color, { r: 255, g: 255, b: 255 });
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const DEFAULT_LIGHT_TONES: Record<SemanticTone, string> = {
  neutral: "#64748b",
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  accent: "#06b6d4",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#0ea5e9",
};

const DEFAULT_DARK_TONES: Record<SemanticTone, string> = {
  neutral: "#94a3b8",
  primary: "#60a5fa",
  secondary: "#a78bfa",
  accent: "#22d3ee",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
  info: "#38bdf8",
};

function readFirstCssVar(
  styles: CSSStyleDeclaration[],
  names: string[]
): string | undefined {
  for (const name of names) {
    for (const style of styles) {
      const val = style.getPropertyValue(name)?.trim();
      if (val && val !== "initial" && val !== "inherit") {
        return val;
      }
    }
  }
  return undefined;
}

export function resolveThemeTokens(
  hostElement?: HTMLElement | null,
  overridePreset?: PresetStyle,
  overrideRoughness?: number
): ResolvedThemeTokens {
  const isBrowser =
    typeof window !== "undefined" && typeof document !== "undefined";

  const styles: CSSStyleDeclaration[] = [];
  if (isBrowser) {
    if (hostElement) styles.push(window.getComputedStyle(hostElement));
    if (document.body) styles.push(window.getComputedStyle(document.body));
    styles.push(window.getComputedStyle(document.documentElement));
  }

  // Detect dark mode from class, attribute, CSS variable, or background luminance
  let isDark = false;
  if (isBrowser) {
    const root = document.documentElement;
    const body = document.body;
    const themeAttr =
      hostElement?.getAttribute("data-theme") ||
      root.getAttribute("data-theme") ||
      body?.getAttribute("data-theme") ||
      root.getAttribute("data-color-mode");

    if (themeAttr === "dark") {
      isDark = true;
    } else if (themeAttr === "light") {
      isDark = false;
    } else if (
      root.classList.contains("dark") ||
      body?.classList.contains("dark") ||
      hostElement?.classList.contains("dark")
    ) {
      isDark = true;
    } else {
      const rawBg = readFirstCssVar(styles, [
        "--ill-bg",
        "--blog-bg",
        "--vp-c-bg",
        "--sl-color-bg",
      ]);
      if (rawBg && rawBg.startsWith("#")) {
        isDark = getRelativeLuminance(rawBg) < 0.45;
      }
    }
  }

  const mode: "light" | "dark" = isDark ? "dark" : "light";
  const defaultBg = isDark ? "#0b0f19" : "#ffffff";
  const defaultSurface = isDark ? "#131b2e" : "#f8fafc";
  const defaultSurfaceElevated = isDark ? "#1a243b" : "#ffffff";
  const defaultCodeBg = isDark ? "#080c14" : "#0f172a";
  const defaultCodeText = "#e2e8f0";
  const defaultText = isDark ? "#f1f5f9" : "#0f172a";
  const defaultTextMuted = isDark ? "#94a3b8" : "#64748b";
  const defaultBorder = isDark ? "#2a364f" : "#cbd5e1";

  const bg =
    readFirstCssVar(styles, [
      "--ill-bg",
      "--blog-bg",
      "--vp-c-bg",
      "--sl-color-bg",
    ]) || defaultBg;

  const surface =
    readFirstCssVar(styles, [
      "--ill-surface",
      "--blog-card-bg",
      "--vp-c-bg-soft",
      "--sl-color-bg-nav",
    ]) || defaultSurface;

  const text =
    readFirstCssVar(styles, [
      "--ill-text",
      "--blog-fg",
      "--vp-c-text-1",
      "--sl-color-text",
    ]) || defaultText;

  const textMuted =
    readFirstCssVar(styles, [
      "--ill-text-muted",
      "--blog-fg-muted",
      "--vp-c-text-2",
    ]) || defaultTextMuted;

  const border =
    readFirstCssVar(styles, [
      "--ill-border",
      "--blog-border",
      "--vp-c-divider",
      "--sl-color-hairline",
    ]) || defaultBorder;

  const baseToneDefaults = isDark ? DEFAULT_DARK_TONES : DEFAULT_LIGHT_TONES;
  const tones = {} as ResolvedThemeTokens["colors"]["tones"];

  const toneVarMap: Record<SemanticTone, string[]> = {
    neutral: ["--ill-neutral", "--blog-neutral"],
    primary: [
      "--ill-primary",
      "--blog-primary",
      "--vp-c-brand-1",
      "--sl-color-accent",
    ],
    secondary: ["--ill-secondary", "--blog-secondary", "--vp-c-purple-1"],
    accent: ["--ill-accent", "--blog-accent", "--vp-c-indigo-1"],
    success: ["--ill-success", "--blog-success", "--vp-c-green-1"],
    warning: ["--ill-warning", "--blog-warning", "--vp-c-yellow-1"],
    danger: ["--ill-danger", "--blog-danger", "--vp-c-red-1"],
    info: ["--ill-info", "--blog-info"],
  };

  (Object.keys(baseToneDefaults) as SemanticTone[]).forEach((tone) => {
    const main =
      readFirstCssVar(styles, toneVarMap[tone]) || baseToneDefaults[tone];
    const softWeight = isDark ? 0.16 : 0.11;
    const borderWeight = isDark ? 0.55 : 0.45;
    tones[tone] = {
      main,
      softBg: mixColors(main, bg, softWeight),
      softBorder: mixColors(main, bg, borderWeight),
      filledText: getRelativeLuminance(main) > 0.62 ? "#0f172a" : "#ffffff",
    };
  });

  const fontSans =
    readFirstCssVar(styles, [
      "--ill-font-sans",
      "--blog-font-sans",
      "--vp-font-family-base",
    ]) ||
    'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const fontMono =
    readFirstCssVar(styles, [
      "--ill-font-mono",
      "--blog-font-mono",
      "--vp-font-family-mono",
    ]) ||
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

  const cssPreset = readFirstCssVar(styles, ["--ill-preset"]) as
    | PresetStyle
    | undefined;

  return {
    mode,
    colors: {
      bg,
      surface,
      surfaceElevated: defaultSurfaceElevated,
      codeBg: defaultCodeBg,
      codeText: defaultCodeText,
      text,
      textMuted,
      border,
      gridDot: mixColors(textMuted, bg, isDark ? 0.25 : 0.22),
      tones,
    },
    typography: {
      fontSans,
      fontMono,
      baseFontSize: 13,
    },
    geometry: {
      baseRadius: 10,
      preset: overridePreset || cssPreset || "clean",
      roughness: overrideRoughness ?? 1.25,
    },
  };
}

export function resolveNodeStyle(
  specStyle: SemanticStyleSpec | undefined,
  theme: ResolvedThemeTokens,
  defaultVariant: SurfaceVariant = "soft",
  defaultTone: SemanticTone = "neutral"
): ResolvedNodeStyle {
  const tone = specStyle?.tone || defaultTone;
  const variant = specStyle?.variant || defaultVariant;
  const palette = theme.colors.tones[tone] || theme.colors.tones.neutral;

  let fill = palette.softBg;
  let stroke = palette.softBorder;
  let strokeWidth = 1.5;
  let strokeDasharray: string | undefined;
  let textColor = theme.colors.text;
  let mutedTextColor = theme.colors.textMuted;

  switch (variant) {
    case "filled":
      fill = palette.main;
      stroke = mixColors(palette.main, "#000000", 0.85);
      textColor = palette.filledText;
      mutedTextColor = mixColors(palette.filledText, palette.main, 0.78);
      break;
    case "outlined":
      fill = theme.colors.surfaceElevated;
      stroke = tone === "neutral" ? theme.colors.border : palette.softBorder;
      break;
    case "dashed":
      fill = mixColors(palette.main, theme.colors.bg, 0.05);
      stroke = palette.softBorder;
      strokeDasharray = "6 4";
      break;
    case "ghost":
      fill = "transparent";
      stroke = "transparent";
      strokeWidth = 0;
      break;
    case "soft":
    default:
      if (tone === "neutral") {
        fill = theme.colors.surface;
        stroke = theme.colors.border;
      } else {
        fill = palette.softBg;
        stroke = palette.softBorder;
      }
      break;
  }

  let radius = theme.geometry.baseRadius;
  if (typeof specStyle?.radius === "number") {
    radius = specStyle.radius;
  } else if (specStyle?.radius === "none") {
    radius = 0;
  } else if (specStyle?.radius === "sm") {
    radius = 6;
  } else if (specStyle?.radius === "lg") {
    radius = 14;
  } else if (specStyle?.radius === "full") {
    radius = 999;
  }

  return {
    tone,
    variant,
    fill,
    stroke,
    strokeWidth,
    strokeDasharray,
    textColor,
    mutedTextColor,
    radius,
    elevation: specStyle?.elevation || "none",
    opacity: specStyle?.opacity ?? 1,
    rough: specStyle?.rough ?? theme.geometry.preset === "sketch",
  };
}

/**
 * Watches document & host element for any theme / class / CSS variable changes
 */
export class ThemeObserver {
  private mutationObserver?: MutationObserver;
  private mediaQuery?: MediaQueryList;
  private onMediaChange?: () => void;
  private hostElement: HTMLElement;
  private onThemeChange: () => void;

  constructor(
    hostElement: HTMLElement,
    onThemeChange: () => void
  ) {
    this.hostElement = hostElement;
    this.onThemeChange = onThemeChange;
  }

  connect(): void {
    if (typeof window === "undefined" || typeof MutationObserver === "undefined") {
      return;
    }

    let rafId: number | null = null;
    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        this.onThemeChange();
      });
    };

    this.mutationObserver = new MutationObserver(scheduleUpdate);
    const observeConfig: MutationObserverInit = {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-color-mode", "style"],
    };

    this.mutationObserver.observe(document.documentElement, observeConfig);
    if (document.body) {
      this.mutationObserver.observe(document.body, observeConfig);
    }
    this.mutationObserver.observe(this.hostElement, observeConfig);

    if (window.matchMedia) {
      this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      this.onMediaChange = scheduleUpdate;
      this.mediaQuery.addEventListener("change", this.onMediaChange);
    }
  }

  disconnect(): void {
    this.mutationObserver?.disconnect();
    if (this.mediaQuery && this.onMediaChange) {
      this.mediaQuery.removeEventListener("change", this.onMediaChange);
    }
  }
}
