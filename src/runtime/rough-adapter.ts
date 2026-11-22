/**
 * Deterministic Hand-Drawn ("Sketch" / Rough) SVG Path Generator
 * Generates organic double-stroke hand-drawn SVG paths without requiring external canvas/DOM dependencies.
 */

function hashStringSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

class SeededRandom {
  private state: number;
  constructor(seedStr: string) {
    this.state = hashStringSeed(seedStr) || 123456789;
  }

  next(): number {
    // Mulberry32 PRNG
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  offset(maxMag: number): number {
    return (this.next() * 2 - 1) * maxMag;
  }
}

function roughLineSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rng: SeededRandom,
  roughness = 1.25
): string {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const jitter = Math.min(2.4, Math.max(0.6, len * 0.012)) * roughness;

  const mid1X = x1 + (x2 - x1) * 0.35 + rng.offset(jitter);
  const mid1Y = y1 + (y2 - y1) * 0.35 + rng.offset(jitter);
  const mid2X = x1 + (x2 - x1) * 0.68 + rng.offset(jitter);
  const mid2Y = y1 + (y2 - y1) * 0.68 + rng.offset(jitter);

  const sx = x1 + rng.offset(jitter * 0.45);
  const sy = y1 + rng.offset(jitter * 0.45);
  const ex = x2 + rng.offset(jitter * 0.45);
  const ey = y2 + rng.offset(jitter * 0.45);

  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${mid1X.toFixed(1)} ${mid1Y.toFixed(1)}, ${mid2X.toFixed(1)} ${mid2Y.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

export function generateRoughRectStrokePath(
  x: number,
  y: number,
  w: number,
  h: number,
  seedKey: string,
  roughness = 1.25
): string {
  const rng = new SeededRandom(seedKey);
  const corners: [number, number][] = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];

  const strokes: string[] = [];
  // Double pass for authentic hand-sketched look
  for (let pass = 0; pass < 2; pass++) {
    const r = pass === 0 ? roughness : roughness * 0.75;
    for (let i = 0; i < 4; i++) {
      const p1 = corners[i];
      const p2 = corners[(i + 1) % 4];
      strokes.push(roughLineSegment(p1[0], p1[1], p2[0], p2[1], rng, r));
    }
  }
  return strokes.join(" ");
}

export function generateRoughPolygonStrokePath(
  points: [number, number][],
  seedKey: string,
  roughness = 1.25
): string {
  if (points.length < 2) return "";
  const rng = new SeededRandom(seedKey);
  const strokes: string[] = [];

  for (let pass = 0; pass < 2; pass++) {
    const r = pass === 0 ? roughness : roughness * 0.7;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      strokes.push(roughLineSegment(p1[0], p1[1], p2[0], p2[1], rng, r));
    }
  }
  return strokes.join(" ");
}

export function generateRoughEllipseStrokePath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seedKey: string,
  roughness = 1.25
): string {
  const rng = new SeededRandom(seedKey);
  const steps = 16;
  const strokes: string[] = [];

  for (let pass = 0; pass < 2; pass++) {
    const pts: [number, number][] = [];
    const jitter = (pass === 0 ? 1.5 : 1.0) * roughness;
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2 + (pass === 1 ? 0.15 : 0);
      pts.push([
        cx + Math.cos(theta) * rx + rng.offset(jitter),
        cy + Math.sin(theta) * ry + rng.offset(jitter),
      ]);
    }
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
    }
    strokes.push(d);
  }

  return strokes.join(" ");
}
