/**
 * Runtime Theme Observer & Multi-Blog CSS Variable Resolver
 * Automatically inherits CSS variables from custom blogs, VitePress, Astro Starlight, Docusaurus, or Tailwind.
 */

import {
  coerceFiniteNumber,
  SEMANTIC_TONES,
  VALID_ELEVATION_LEVELS,
  VALID_PRESET_STYLES,
  VALID_SEMANTIC_TONES,
  VALID_SURFACE_VARIANTS,
  type PresetStyle,
  type ResolvedNodeStyle,
  type ResolvedThemeTokens,
  type SemanticStyleSpec,
  type SemanticTone,
  type SurfaceVariant,
  type TonePalette,
} from "../schema/spec.ts";

interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseAngleDegrees(raw: string): number {
  const s = raw.trim().toLowerCase();
  const val = parseFloat(s);
  if (Number.isNaN(val)) return 0;
  if (s.endsWith("turn")) return val * 360;
  if (s.endsWith("rad")) return (val * 180) / Math.PI;
  if (s.endsWith("grad")) return val * 0.9;
  return val;
}

function hslToRgb(hDeg: number, sPct: number, lPct: number): RGB {
  const h = (((hDeg % 360) + 360) % 360) / 360;
  const s = Math.max(0, Math.min(1, sPct / 100));
  const l = Math.max(0, Math.min(1, lPct / 100));

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

function oklchToRgb(lVal: number, cVal: number, hDeg: number): RGB {
  const L = Math.max(0, Math.min(1, lVal));
  const C = Math.max(0, cVal);
  const hRad = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toSrgb = (x: number): number => {
    const clamped = Math.max(0, Math.min(1, x));
    const gamma =
      clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    return Math.round(gamma * 255);
  };

  return {
    r: toSrgb(rLin),
    g: toSrgb(gLin),
    b: toSrgb(bLin),
  };
}

export function parseColorToRgb(input: string, fallback: RGB): RGB {
  const trimmed = input.trim();
  if (!trimmed) return fallback;

  // 1. Hex (#rgb, #rgba, #rrggbb, #rrggbbaa)
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (hex.length === 3 || hex.length === 4) {
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

  // 2. rgb() or rgba() — supports comma-separated and modern CSS Color 4 space-separated syntax
  const rgbFunc = trimmed.match(/^rgba?\(\s*([^)]+)\s*\)$/i);
  if (rgbFunc) {
    const body = rgbFunc[1].split("/")[0].trim();
    const parts = body.includes(",")
      ? body.split(",").map((s) => s.trim())
      : body.split(/\s+/);
    if (parts.length >= 3) {
      const parseChannel = (raw: string): number => {
        if (raw.endsWith("%")) {
          return Math.round((parseFloat(raw) / 100) * 255);
        }
        return Math.round(parseFloat(raw));
      };
      const r = parseChannel(parts[0]);
      const g = parseChannel(parts[1]);
      const b = parseChannel(parts[2]);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return {
          r: Math.max(0, Math.min(255, r)),
          g: Math.max(0, Math.min(255, g)),
          b: Math.max(0, Math.min(255, b)),
        };
      }
    }
  }

  // 3. hsl() or hsla() — comma or space-separated
  const hslFunc = trimmed.match(/^hsla?\(\s*([^)]+)\s*\)$/i);
  if (hslFunc) {
    const body = hslFunc[1].split("/")[0].trim();
    const parts = body.includes(",")
      ? body.split(",").map((s) => s.trim())
      : body.split(/\s+/);
    if (parts.length >= 3) {
      const h = parseAngleDegrees(parts[0]);
      const s = parseFloat(parts[1]);
      const l = parseFloat(parts[2]);
      if (!Number.isNaN(s) && !Number.isNaN(l)) {
        return hslToRgb(h, s, l);
      }
    }
  }

  // 4. oklch(L C H [/ A]) — Tailwind v4 / modern design systems
  const oklchFunc = trimmed.match(/^oklch\(\s*([^)]+)\s*\)$/i);
  if (oklchFunc) {
    const body = oklchFunc[1].split("/")[0].trim();
    const parts = body.includes(",")
      ? body.split(",").map((s) => s.trim())
      : body.split(/\s+/);
    if (parts.length >= 3) {
      const rawL = parts[0];
      const l = rawL.endsWith("%")
        ? parseFloat(rawL) / 100
        : parseFloat(rawL);
      const c = parseFloat(parts[1]);
      const h = parseAngleDegrees(parts[2]);
      if (!Number.isNaN(l) && !Number.isNaN(c)) {
        return oklchToRgb(l, c, h);
      }
    }
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
 * Mix colorA into colorB by weight (0..1 of colorA).
 * When either color uses CSS variables (SSR mode), emits CSS `color-mix(in srgb, ...)`.
 */
export function mixColors(colorA: string, colorB: string, weightA: number): string {
  const w = Math.max(0, Math.min(1, weightA));
  if (
    colorA.includes("var(") ||
    colorB.includes("var(") ||
    colorA.includes("color-mix(") ||
    colorB.includes("color-mix(")
  ) {
    const pctA = Math.round(w * 100);
    return `color-mix(in srgb, ${colorA} ${pctA}%, ${colorB})`;
  }
  const a = parseColorToRgb(colorA, { r: 59, g: 130, b: 246 });
  const b = parseColorToRgb(colorB, { r: 255, g: 255, b: 255 });
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

/**
 * Safely normalizes an arbitrary runtime tone value (e.g. LLM output like "blue" or "error")
 * to a valid SemanticTone, preventing TypeError and prototype key lookups.
 */
export function normalizeTone(
  tone: unknown,
  fallback: SemanticTone = "neutral"
): SemanticTone {
  if (typeof tone === "string" && VALID_SEMANTIC_TONES.has(tone)) {
    return tone as SemanticTone;
  }
  return fallback;
}

/**
 * Safely retrieves a TonePalette from a resolved theme, falling back to `neutral`
 * whenever an unknown or missing tone is passed.
 */
export function getTonePalette(
  theme: ResolvedThemeTokens,
  tone?: string | SemanticTone
): TonePalette {
  const normalized = normalizeTone(tone, "neutral");
  return theme.colors.tones[normalized] || theme.colors.tones.neutral;
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
      if (rawBg) {
        isDark = getRelativeLuminance(rawBg) < 0.45;
      }
    }
  }

  const cssPreset = readFirstCssVar(styles, ["--ill-preset"]);
  const rawPreset = overridePreset || cssPreset || "clean";
  const activePreset: PresetStyle = VALID_PRESET_STYLES.has(rawPreset)
    ? (rawPreset as PresetStyle)
    : "clean";
  const isBlueprint = activePreset === "blueprint";

  const mode: "light" | "dark" = isDark ? "dark" : "light";
  const defaultBg = isDark ? "#0b0f19" : "#ffffff";
  const defaultSurface = isDark ? "#131b2e" : "#f8fafc";
  const defaultSurfaceElevated = isDark ? "#1a243b" : "#ffffff";
  const defaultCodeBg = isDark ? "#080c14" : "#0f172a";
  const defaultCodeText = "#e2e8f0";
  const defaultText = isDark ? "#f1f5f9" : "#0f172a";
  const defaultTextMuted = isDark ? "#94a3b8" : "#64748b";
  const defaultBorder = isDark ? "#2a364f" : "#cbd5e1";

  const rawBgColor =
    readFirstCssVar(styles, [
      "--ill-bg",
      "--blog-bg",
      "--vp-c-bg",
      "--sl-color-bg",
    ]) || defaultBg;
  const bg = isBlueprint
    ? mixColors(isDark ? "#082046" : "#e0f2fe", rawBgColor, 0.42)
    : rawBgColor;

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
    const rawMain =
      readFirstCssVar(styles, toneVarMap[tone]) || baseToneDefaults[tone];
    const main = rgbToHex(
      parseColorToRgb(rawMain, parseColorToRgb(baseToneDefaults[tone], { r: 59, g: 130, b: 246 }))
    );
    const softWeight = isBlueprint ? (isDark ? 0.2 : 0.14) : isDark ? 0.16 : 0.11;
    const borderWeight = isBlueprint ? (isDark ? 0.68 : 0.58) : isDark ? 0.55 : 0.45;
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

  return {
    mode,
    colors: {
      bg,
      surface: mixColors(surface, bg, 0.85),
      surfaceElevated: isBlueprint
        ? mixColors(isDark ? "#0c2b59" : "#f0f9ff", defaultSurfaceElevated, 0.5)
        : defaultSurfaceElevated,
      codeBg: defaultCodeBg,
      codeText: defaultCodeText,
      text,
      textMuted,
      border,
      gridDot: isBlueprint
        ? mixColors(tones.info.main, bg, isDark ? 0.26 : 0.22)
        : mixColors(textMuted, bg, isDark ? 0.25 : 0.22),
      tones,
    },
    typography: {
      fontSans: isBlueprint ? fontMono : fontSans,
      fontMono,
      baseFontSize: 13,
    },
    geometry: {
      baseRadius: isBlueprint ? 3 : 10,
      preset: activePreset,
      roughness: coerceFiniteNumber(overrideRoughness) ?? 1.25,
    },
  };
}

/**
 * Generates CSS-variable-backed theme tokens for SSR / SSG pre-rendering.
 * Colors reference `var(--ill-*, ...)` with automatic light/dark fallback variables
 * so dark-mode pages never flash a light-mode SSR illustration before hydration.
 */
export function createSsrThemeTokens(
  overridePreset?: PresetStyle,
  overrideRoughness?: number
): ResolvedThemeTokens {
  const activePreset: PresetStyle =
    overridePreset && VALID_PRESET_STYLES.has(overridePreset)
      ? overridePreset
      : "clean";
  const isBlueprint = activePreset === "blueprint";

  const bg = isBlueprint
    ? "var(--ill-blueprint-bg, var(--_ill-blueprint-bg, #e0f2fe))"
    : "var(--ill-bg, var(--blog-bg, var(--vp-c-bg, var(--sl-color-bg, var(--_ill-bg, #ffffff)))))";
  const surface =
    "var(--ill-surface, var(--blog-card-bg, var(--vp-c-bg-soft, var(--sl-color-bg-nav, var(--_ill-surface, #f8fafc)))))";
  const surfaceElevated =
    "var(--ill-surface-elevated, var(--_ill-surface-elevated, #ffffff))";
  const text =
    "var(--ill-text, var(--blog-fg, var(--vp-c-text-1, var(--sl-color-text, var(--_ill-text, #0f172a)))))";
  const textMuted =
    "var(--ill-text-muted, var(--blog-fg-muted, var(--vp-c-text-2, var(--_ill-text-muted, #64748b))))";
  const border =
    "var(--ill-border, var(--blog-border, var(--vp-c-divider, var(--sl-color-hairline, var(--_ill-border, #cbd5e1)))))";

  const toneVarFallbacks: Record<SemanticTone, string> = {
    neutral: "var(--ill-neutral, var(--blog-neutral, var(--_ill-neutral, #64748b)))",
    primary:
      "var(--ill-primary, var(--blog-primary, var(--vp-c-brand-1, var(--sl-color-accent, var(--_ill-primary, #3b82f6)))))",
    secondary:
      "var(--ill-secondary, var(--blog-secondary, var(--vp-c-purple-1, var(--_ill-secondary, #8b5cf6))))",
    accent:
      "var(--ill-accent, var(--blog-accent, var(--vp-c-indigo-1, var(--_ill-accent, #06b6d4))))",
    success:
      "var(--ill-success, var(--blog-success, var(--vp-c-green-1, var(--_ill-success, #10b981))))",
    warning:
      "var(--ill-warning, var(--blog-warning, var(--vp-c-yellow-1, var(--_ill-warning, #f59e0b))))",
    danger:
      "var(--ill-danger, var(--blog-danger, var(--vp-c-red-1, var(--_ill-danger, #ef4444))))",
    info: "var(--ill-info, var(--blog-info, var(--_ill-info, #0ea5e9)))",
  };

  const tones = {} as ResolvedThemeTokens["colors"]["tones"];
  const softPct = isBlueprint ? 16 : 12;
  const borderPct = isBlueprint ? 60 : 48;

  for (const tone of SEMANTIC_TONES) {
    const main = toneVarFallbacks[tone];
    tones[tone] = {
      main,
      softBg: `var(--ill-${tone}-soft-bg, color-mix(in srgb, ${main} ${softPct}%, ${bg}))`,
      softBorder: `var(--ill-${tone}-soft-border, color-mix(in srgb, ${main} ${borderPct}%, ${bg}))`,
      filledText:
        tone === "warning"
          ? "var(--ill-warning-filled-text, #0f172a)"
          : `var(--ill-${tone}-filled-text, #ffffff)`,
    };
  }

  const fontSans =
    'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const fontMono =
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

  return {
    mode: "light",
    colors: {
      bg,
      surface,
      surfaceElevated,
      codeBg: "var(--ill-code-bg, var(--_ill-code-bg, #0f172a))",
      codeText: "var(--ill-code-text, #e2e8f0)",
      text,
      textMuted,
      border,
      gridDot: isBlueprint
        ? `var(--ill-grid-dot, color-mix(in srgb, ${tones.info.main} 24%, ${bg}))`
        : `var(--ill-grid-dot, color-mix(in srgb, ${textMuted} 24%, ${bg}))`,
      tones,
    },
    typography: {
      fontSans: isBlueprint ? fontMono : fontSans,
      fontMono,
      baseFontSize: 13,
    },
    geometry: {
      baseRadius: isBlueprint ? 3 : 10,
      preset: activePreset,
      roughness: coerceFiniteNumber(overrideRoughness) ?? 1.25,
    },
  };
}

export function resolveNodeStyle(
  specStyle: SemanticStyleSpec | undefined,
  theme: ResolvedThemeTokens,
  defaultVariant: SurfaceVariant = "soft",
  defaultTone: SemanticTone = "neutral"
): ResolvedNodeStyle {
  const tone = normalizeTone(specStyle?.tone, defaultTone);
  const rawVariant = specStyle?.variant;
  const variant: SurfaceVariant =
    typeof rawVariant === "string" && VALID_SURFACE_VARIANTS.has(rawVariant)
      ? (rawVariant as SurfaceVariant)
      : defaultVariant;
  const palette = getTonePalette(theme, tone);

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
  const rawRadius = specStyle?.radius;
  if (rawRadius === "none") {
    radius = 0;
  } else if (rawRadius === "sm") {
    radius = 6;
  } else if (rawRadius === "md") {
    radius = theme.geometry.baseRadius;
  } else if (rawRadius === "lg") {
    radius = 14;
  } else if (rawRadius === "full") {
    radius = 999;
  } else {
    const numRadius = coerceFiniteNumber(rawRadius);
    if (numRadius !== undefined && numRadius >= 0) {
      radius = numRadius;
    }
  }

  const rawElevation = specStyle?.elevation;
  const elevation: "none" | "sm" | "md" =
    typeof rawElevation === "string" && VALID_ELEVATION_LEVELS.has(rawElevation)
      ? (rawElevation as "none" | "sm" | "md")
      : "none";

  const rawOpacity = coerceFiniteNumber(specStyle?.opacity);
  const opacity =
    rawOpacity !== undefined ? Math.max(0, Math.min(1, rawOpacity)) : 1;

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
    elevation,
    opacity,
    rough:
      typeof specStyle?.rough === "boolean"
        ? specStyle.rough
        : theme.geometry.preset === "sketch",
  };
}

const FINGERPRINT_CSS_VARS = [
  "--ill-bg",
  "--blog-bg",
  "--vp-c-bg",
  "--sl-color-bg",
  "--ill-surface",
  "--blog-card-bg",
  "--vp-c-bg-soft",
  "--sl-color-bg-nav",
  "--ill-text",
  "--blog-fg",
  "--vp-c-text-1",
  "--sl-color-text",
  "--ill-text-muted",
  "--blog-fg-muted",
  "--vp-c-text-2",
  "--ill-border",
  "--blog-border",
  "--vp-c-divider",
  "--sl-color-hairline",
  "--ill-preset",
  "--ill-neutral",
  "--ill-primary",
  "--blog-primary",
  "--vp-c-brand-1",
  "--sl-color-accent",
  "--ill-secondary",
  "--blog-secondary",
  "--ill-accent",
  "--blog-accent",
  "--ill-success",
  "--blog-success",
  "--ill-warning",
  "--blog-warning",
  "--ill-danger",
  "--blog-danger",
  "--ill-info",
  "--blog-info",
  "--ill-font-sans",
  "--ill-font-mono",
];

/**
 * Computes a lightweight fingerprint of effective theme mode & key CSS variables
 * so unrelated DOM class/style mutations (e.g. scroll locks, modals) do not trigger re-compilations.
 */
export function computeThemeFingerprint(hostElement?: HTMLElement | null): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "headless";
  }

  const root = document.documentElement;
  const body = document.body;
  const styles: CSSStyleDeclaration[] = [];
  if (hostElement) styles.push(window.getComputedStyle(hostElement));
  if (body) styles.push(window.getComputedStyle(body));
  styles.push(window.getComputedStyle(root));

  const themeAttr =
    hostElement?.getAttribute("data-theme") ||
    root.getAttribute("data-theme") ||
    body?.getAttribute("data-theme") ||
    root.getAttribute("data-color-mode") ||
    "";
  const hasDarkClass =
    root.classList.contains("dark") ||
    Boolean(body?.classList.contains("dark")) ||
    Boolean(hostElement?.classList.contains("dark"));
  const prefersDark =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;

  const parts: string[] = [themeAttr, hasDarkClass ? "1" : "0", prefersDark ? "1" : "0"];
  for (const name of FINGERPRINT_CSS_VARS) {
    parts.push(readFirstCssVar(styles, [name]) || "");
  }
  return parts.join("|");
}

/**
 * Watches document & host element for meaningful theme / CSS variable changes.
 * Uses theme fingerprinting to ignore unrelated class/style updates and cleans up pending rAF on disconnect.
 */
export class ThemeObserver {
  private mutationObserver?: MutationObserver;
  private mediaQuery?: MediaQueryList;
  private onMediaChange?: () => void;
  private hostElement: HTMLElement;
  private onThemeChange: () => void;
  private rafId: number | null = null;
  private lastFingerprint = "";

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

    this.lastFingerprint = computeThemeFingerprint(this.hostElement);

    const scheduleUpdate = () => {
      if (this.rafId !== null) return;
      this.rafId = window.requestAnimationFrame(() => {
        this.rafId = null;
        const nextFingerprint = computeThemeFingerprint(this.hostElement);
        if (nextFingerprint !== this.lastFingerprint) {
          this.lastFingerprint = nextFingerprint;
          this.onThemeChange();
        }
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
    if (this.rafId !== null && typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.mutationObserver?.disconnect();
    this.mutationObserver = undefined;
    if (this.mediaQuery && this.onMediaChange) {
      this.mediaQuery.removeEventListener("change", this.onMediaChange);
      this.onMediaChange = undefined;
    }
  }
}
