export type ColormapMode = "grayscale" | "viridis" | "magma" | "plasma";

type RGB = [number, number, number];

type Stop = { t: number; color: RGB };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function findStops(stops: Stop[], t: number): [Stop, Stop, number] {
  if (t <= stops[0].t) return [stops[0], stops[0], 0];
  if (t >= stops[stops.length - 1].t)
    return [stops[stops.length - 1], stops[stops.length - 1], 0];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.t && t <= b.t) {
      const nt = (t - a.t) / (b.t - a.t);
      return [a, b, nt];
    }
  }
  return [stops[0], stops[0], 0];
}

function getStops(mode: ColormapMode): Stop[] {
  switch (mode) {
    case "viridis":
      // Simplified viridis stops (from matplotlib), subsampled
      return [
        { t: 0.0, color: [68, 1, 84] },
        { t: 0.25, color: [59, 82, 139] },
        { t: 0.5, color: [33, 145, 140] },
        { t: 0.75, color: [94, 201, 98] },
        { t: 1.0, color: [253, 231, 37] },
      ];
    case "magma":
      return [
        { t: 0.0, color: [0, 0, 4] },
        { t: 0.25, color: [84, 15, 109] },
        { t: 0.5, color: [187, 55, 84] },
        { t: 0.75, color: [249, 142, 8] },
        { t: 1.0, color: [252, 253, 191] },
      ];
    case "plasma":
      return [
        { t: 0.0, color: [13, 8, 135] },
        { t: 0.25, color: [126, 3, 168] },
        { t: 0.5, color: [203, 71, 119] },
        { t: 0.75, color: [248, 149, 64] },
        { t: 1.0, color: [240, 249, 33] },
      ];
    case "grayscale":
    default:
      return [
        { t: 0.0, color: [0, 0, 0] },
        { t: 1.0, color: [255, 255, 255] },
      ];
  }
}

export function mapValueToColor(v: number, mode: ColormapMode): RGB {
  if (mode === "grayscale") return [v, v, v];
  const t = Math.max(0, Math.min(1, v / 255));
  const stops = getStops(mode);
  const [a, b, nt] = findStops(stops, t);
  return lerpColor(a.color, b.color, nt);
}
