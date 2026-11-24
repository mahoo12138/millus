/**
 * Dual-Mode Text Measurer (Browser Native Canvas 2D + Headless Fallback)
 * Features:
 *  - LRU measurement cache keyed by (font, text) & lazy ctx.font assignment
 *  - Unicode-safe tokenization (surrogate-pair / emoji aware)
 *  - Force-breaking for overly long words / URLs that exceed maxWidth
 */

export interface TextMeasureOptions {
  fontFamily: string;
  fontSize: number;
  fontWeight?: string | number;
  lineHeight?: number;
  maxWidth?: number;
  mono?: boolean;
}

export interface TextMeasurerOptions {
  /** Force headless heuristic width estimation even in browser environments (useful for SSR hydration parity) */
  forceHeadless?: boolean;
  /** Maximum LRU cache entries (default: 2048) */
  maxCacheSize?: number;
}

export interface MeasuredTextBlock {
  width: number;
  height: number;
  lineHeight: number;
  lines: Array<{
    text: string;
    width: number;
  }>;
}

export class TextMeasurer {
  private ctx: CanvasRenderingContext2D | null = null;
  private lastFont = "";
  private widthCache = new Map<string, number>();
  private readonly maxCacheSize: number;

  constructor(options: TextMeasurerOptions = {}) {
    this.maxCacheSize = Math.max(64, options.maxCacheSize ?? 2048);
    if (!options.forceHeadless && typeof document !== "undefined") {
      try {
        const canvas = document.createElement("canvas");
        this.ctx = canvas.getContext("2d");
      } catch {
        this.ctx = null;
      }
    }
  }

  measureLineWidth(
    text: string,
    fontSize: number,
    fontFamily: string,
    fontWeight: string | number = 400,
    mono = false
  ): number {
    if (!text) return 0;

    const fontSpec = this.ctx
      ? `${fontWeight} ${fontSize}px ${fontFamily}`
      : `h:${fontSize}:${mono ? 1 : 0}`;
    const cacheKey = `${fontSpec}\0${text}`;
    const cached = this.widthCache.get(cacheKey);
    if (cached !== undefined) {
      // Refresh recency for LRU
      this.widthCache.delete(cacheKey);
      this.widthCache.set(cacheKey, cached);
      return cached;
    }

    let measured: number;
    if (this.ctx) {
      if (this.lastFont !== fontSpec) {
        this.ctx.font = fontSpec;
        this.lastFont = fontSpec;
      }
      measured = Math.ceil(this.ctx.measureText(text).width);
    } else {
      measured = Math.ceil(this.estimateHeadlessWidth(text, fontSize, mono));
    }

    if (this.widthCache.size >= this.maxCacheSize) {
      const oldestKey = this.widthCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.widthCache.delete(oldestKey);
      }
    }
    this.widthCache.set(cacheKey, measured);
    return measured;
  }

  private estimateHeadlessWidth(
    text: string,
    fontSize: number,
    mono: boolean
  ): number {
    let totalEm = 0;
    for (const ch of text) {
      const code = ch.codePointAt(0) || 0;
      if (mono) {
        totalEm += code > 0x2e80 ? 1.0 : 0.61;
      } else if (
        (code >= 0x2e80 && code <= 0x9fff) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xff00 && code <= 0xffef)
      ) {
        // CJK full-width
        totalEm += 1.02;
      } else if (code > 0x1f000) {
        // Emoji
        totalEm += 1.2;
      } else if ("ilI1|.,:;'!()[]".includes(ch)) {
        totalEm += 0.34;
      } else if ("mwMW@%".includes(ch)) {
        totalEm += 0.86;
      } else if (ch >= "A" && ch <= "Z") {
        totalEm += 0.68;
      } else {
        totalEm += 0.56;
      }
    }
    return totalEm * fontSize;
  }

  measureBlock(text: string, options: TextMeasureOptions): MeasuredTextBlock {
    const fontSize = options.fontSize;
    const fontWeight = options.fontWeight ?? 400;
    const lineHeight = options.lineHeight ?? Math.round(fontSize * 1.45);
    const mono = options.mono ?? false;
    const rawParagraphs = (text || "").split(/\r?\n/);
    const wrappedLines: Array<{ text: string; width: number }> = [];

    const measure = (s: string) =>
      this.measureLineWidth(s, fontSize, options.fontFamily, fontWeight, mono);

    for (const para of rawParagraphs) {
      if (!options.maxWidth || options.maxWidth <= 0 || !para) {
        wrappedLines.push({ text: para, width: measure(para) });
        continue;
      }

      const maxWidth = options.maxWidth;
      // Unicode-aware greedy token wrapping supporting English words, CJK, and emoji/surrogate pairs
      const tokens = para.match(/([A-Za-z0-9_./:-]+|\s+|.)/gu) || [para];
      let currentLine = "";

      for (const token of tokens) {
        const candidate = currentLine + token;
        const candidateWidth = measure(candidate);

        if (candidateWidth <= maxWidth) {
          currentLine = candidate;
          continue;
        }

        if (currentLine.trim().length > 0) {
          const flushed = currentLine.trimEnd();
          wrappedLines.push({ text: flushed, width: measure(flushed) });
          currentLine = token.trimStart();
        } else {
          currentLine = token;
        }

        // Force-wrap overly long single tokens (e.g. URLs or long identifiers) by Unicode code point
        if (currentLine.length > 0 && measure(currentLine) > maxWidth) {
          const chars = Array.from(currentLine);
          let chunk = "";
          for (const ch of chars) {
            const nextChunk = chunk + ch;
            if (chunk.length > 0 && measure(nextChunk) > maxWidth) {
              wrappedLines.push({ text: chunk, width: measure(chunk) });
              chunk = ch;
            } else {
              chunk = nextChunk;
            }
          }
          currentLine = chunk;
        }
      }

      if (currentLine.length > 0) {
        wrappedLines.push({
          text: currentLine,
          width: measure(currentLine),
        });
      }
    }

    const maxLineWidth = wrappedLines.reduce(
      (max, l) => Math.max(max, l.width),
      0
    );

    return {
      width: maxLineWidth,
      height: Math.max(lineHeight, wrappedLines.length * lineHeight),
      lineHeight,
      lines: wrappedLines,
    };
  }
}
