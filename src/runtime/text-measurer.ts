/**
 * Dual-Mode Text Measurer (Browser Native Canvas 2D + Headless Fallback)
 */

export interface TextMeasureOptions {
  fontFamily: string;
  fontSize: number;
  fontWeight?: string | number;
  lineHeight?: number;
  maxWidth?: number;
  mono?: boolean;
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

  constructor() {
    if (typeof document !== "undefined") {
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
    if (this.ctx) {
      this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      return Math.ceil(this.ctx.measureText(text).width);
    }
    return Math.ceil(this.estimateHeadlessWidth(text, fontSize, mono));
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

    for (const para of rawParagraphs) {
      if (!options.maxWidth || options.maxWidth <= 0 || !para) {
        const w = this.measureLineWidth(
          para,
          fontSize,
          options.fontFamily,
          fontWeight,
          mono
        );
        wrappedLines.push({ text: para, width: w });
        continue;
      }

      // Greedy token wrapping supporting mixed English words and CJK characters
      const tokens = para.match(/([A-Za-z0-9_./:-]+|\s+|.)/g) || [para];
      let currentLine = "";

      for (const token of tokens) {
        const candidate = currentLine + token;
        const candidateWidth = this.measureLineWidth(
          candidate,
          fontSize,
          options.fontFamily,
          fontWeight,
          mono
        );
        if (candidateWidth > options.maxWidth && currentLine.trim().length > 0) {
          wrappedLines.push({
            text: currentLine.trimEnd(),
            width: this.measureLineWidth(
              currentLine.trimEnd(),
              fontSize,
              options.fontFamily,
              fontWeight,
              mono
            ),
          });
          currentLine = token.trimStart();
        } else {
          currentLine = candidate;
        }
      }

      if (currentLine.length > 0) {
        wrappedLines.push({
          text: currentLine,
          width: this.measureLineWidth(
            currentLine,
            fontSize,
            options.fontFamily,
            fontWeight,
            mono
          ),
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
