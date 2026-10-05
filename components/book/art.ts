import manifest from "./art-manifest.json";

/**
 * How the three illustrations move.
 *
 * `scripts/slice_art.py` cuts each picture into sprites (stars, moon, scarf in
 * linked pieces, rose...) and writes where every one sits to art-manifest.json.
 * This file says how each sprite moves. Stacked at rest the sprites give back
 * the original picture, so every motion starts and ends on the rest pose.
 *
 * Sizes are in "scene pixels": the picture at WIDTH wide, whatever it is
 * actually drawn at. They are turned into `cqw` (1% of the scene's width), so
 * a 3 px sway is the same share of the picture on a phone and on a desktop.
 */

export type SceneId = "telescope" | "rose-moon" | "flight";

type Prop = "translate" | "rotate" | "scale" | "opacity";

/** One looping motion of one property. The first and last value are the rest pose. */
export type Move = {
  prop: Prop;
  values: string[];
  /** Where each value sits in the cycle (0..1). Evenly spaced when absent. */
  offsets?: number[];
  /** Length of one full cycle. */
  ms: number;
  /** Wait before the first cycle: this is what staggers neighbours. */
  delay?: number;
  ease?: string;
};

type LayerEntry = {
  id: string;
  file: string;
  x: number;
  y: number;
  w: number;
  h: number;
  parent: string | null;
  pivot: [number, number] | null;
  behind: boolean;
};
type Manifest = {
  width: number;
  scenes: Record<SceneId, { height: number; layers: LayerEntry[] }>;
};
const art = manifest as unknown as Manifest;
const WIDTH = art.width;

export type SpriteNode = {
  id: string;
  src: string;
  width: number;
  height: number;
  /** Position and size, relative to the parent sprite (or the scene). */
  box: { left: string; top: string; width: string; height: string };
  origin?: string;
  behind: boolean;
  moves: Move[];
  children: SpriteNode[];
};

export type FxKind = "glint" | "halo" | "streak" | "mote";
export type FxNode = {
  kind: FxKind;
  box: { left: string; top: string; width: string };
  /** Width / height of a streak. */
  ratio?: number;
  moves: Move[];
};

export type SceneArt = {
  ratio: number;
  sprites: SpriteNode[];
  fx: FxNode[];
};

/* ── Building blocks ─────────────────────────────────────────────────────── */

// `+ 0` turns the -0 that rounding sin(2π) gives into a plain 0.
const cq = (px: number) => `${Number(((px / WIDTH) * 100).toFixed(3)) + 0}cqw`;
const pct = (n: number) => `${(n * 100).toFixed(3)}%`;
const LINEAR = "linear";
const SINE = "cubic-bezier(0.37, 0, 0.63, 1)";

/** A slow, never-quite-repeating hover: a figure of eight, ax wide and ay tall. */
function hover(ax: number, ay: number, ms: number, delay = 0): Move {
  const steps = 16;
  const values: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    values.push(`${cq(ax * Math.sin(t))} ${cq(-ay * Math.sin(2 * t))}`);
  }
  return { prop: "translate", values, ms, delay, ease: LINEAR };
}

/** Back and forth along x or y only. */
function drift(ax: number, ay: number, ms: number, delay = 0): Move {
  const steps = 12;
  const values: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const s = Math.sin((i / steps) * Math.PI * 2);
    values.push(`${cq(ax * s)} ${cq(ay * s)}`);
  }
  return { prop: "translate", values, ms, delay, ease: LINEAR };
}

function swing(deg: number, ms: number, delay = 0): Move {
  return {
    prop: "rotate",
    values: ["0deg", `${deg}deg`, "0deg", `${-deg}deg`, "0deg"],
    ms,
    delay,
    ease: SINE,
  };
}

function breathe(amount: number, ms: number, delay = 0): Move {
  return {
    prop: "scale",
    values: ["1", String(1 + amount), "1", String(1 - amount), "1"],
    ms,
    delay,
    ease: SINE,
  };
}

/** A star: mostly still, then a quick dip and swell. */
function twinkle(ms: number, delay: number, depth = 0.5): Move[] {
  const offsets = [0, 0.38, 0.5, 0.62, 1];
  return [
    {
      prop: "opacity",
      values: ["1", "1", String(depth), "1", "1"],
      offsets,
      ms,
      delay,
      ease: SINE,
    },
    {
      prop: "scale",
      values: ["1", "1", "0.86", "1", "1"],
      offsets,
      ms,
      delay,
      ease: SINE,
    },
    {
      prop: "rotate",
      values: ["0deg", "0deg", "9deg", "0deg", "0deg"],
      offsets,
      ms,
      delay,
      ease: SINE,
    },
  ];
}

/** A scarf slice: each one trails its parent a beat behind, which reads as a wave. */
function flutter(deg: number, delay: number, ms = 4800): Move {
  return swing(deg, ms, delay);
}

const sparkle = (ms: number, delay: number): Move[] => {
  const offsets = [0, 0.8, 0.9, 1];
  return [
    {
      prop: "opacity",
      values: ["0", "0", "1", "0"],
      offsets,
      ms,
      delay,
      ease: SINE,
    },
    {
      prop: "scale",
      values: ["0.2", "0.2", "1", "0.2"],
      offsets,
      ms,
      delay,
      ease: SINE,
    },
    {
      prop: "rotate",
      values: ["0deg", "0deg", "45deg", "90deg"],
      offsets,
      ms,
      delay,
      ease: SINE,
    },
  ];
};

const halo = (ms: number, delay: number): Move[] => [
  { prop: "opacity", values: ["0", "0.85", "0"], ms, delay, ease: SINE },
  { prop: "scale", values: ["0.94", "1.06", "0.94"], ms, delay, ease: SINE },
];

const streak = (ms: number, delay: number, reach: number): Move[] => {
  const offsets = [0, 0.25, 0.7, 1];
  return [
    {
      prop: "translate",
      values: [
        `${cq(reach * 0.3)} 0px`,
        `${cq(0)} 0px`,
        `${cq(-reach * 0.8)} 0px`,
        `${cq(-reach)} 0px`,
      ],
      offsets,
      ms,
      delay,
      ease: LINEAR,
    },
    {
      prop: "opacity",
      values: ["0", "0.55", "0.4", "0"],
      offsets,
      ms,
      delay,
      ease: LINEAR,
    },
  ];
};

/** A mote drifting up inside the glass dome. */
const mote = (
  ms: number,
  delay: number,
  rise: number,
  sway: number,
): Move[] => {
  const offsets = [0, 0.2, 0.8, 1];
  return [
    {
      prop: "translate",
      values: [
        "0px 0px",
        `${cq(sway * 0.5)} ${cq(-rise * 0.2)}`,
        `${cq(-sway * 0.5)} ${cq(-rise * 0.8)}`,
        `${cq(sway * 0.2)} ${cq(-rise)}`,
      ],
      offsets,
      ms,
      delay,
      ease: SINE,
    },
    {
      prop: "opacity",
      values: ["0", "0.9", "0.9", "0"],
      offsets,
      ms,
      delay,
      ease: LINEAR,
    },
  ];
};

/* ── The scenes ──────────────────────────────────────────────────────────── */

export const motion: Record<SceneId, Record<string, Move[]>> = {
  telescope: {
    body: [hover(3, 8, 9200), swing(0.22, 12400)],
    moon: [hover(2, 6, 10400, 600), swing(2.2, 13600)],
    "star-a": twinkle(4200, 400),
    "star-b": twinkle(5000, 1700),
    "star-c": twinkle(4600, 2900, 0.6),
    "star-d": twinkle(5400, 900),
    "scarf-a": [flutter(0.7, 0)],
    "scarf-b": [flutter(1.5, 420)],
    "scarf-c": [flutter(2.4, 840)],
    rose: [swing(2.2, 6800, 300)],
  },
  "rose-moon": {
    body: [hover(3, 8, 9800), swing(0.2, 13000)],
    moon: [hover(2, 6, 10400, 600), swing(2.2, 13600)],
    "star-a": twinkle(4300, 500),
    "star-b": twinkle(5100, 1900, 0.6),
    "star-c": twinkle(4700, 3100),
    rose: [swing(1.1, 7600, 400)],
  },
  flight: {
    body: [hover(5, 11, 6200), swing(0.45, 8400)],
    cloud: [drift(26, 0, 15600), breathe(0.015, 9200)],
    planet: [hover(2, 6, 11600, 300), swing(2.6, 15200)],
    "star-a": twinkle(4400, 300),
    "star-b": twinkle(5200, 2100, 0.6),
    "star-c": twinkle(4800, 1200),
    "scarf-a": [flutter(0.8, 0, 3900)],
    "scarf-b": [flutter(1.7, 360, 3900)],
    "scarf-c": [flutter(2.8, 720, 3900)],
    prop: [
      {
        prop: "scale",
        values: ["1 1", "1 0.78", "1 1"],
        ms: 520,
        ease: SINE,
      },
      { prop: "opacity", values: ["1", "0.8", "1"], ms: 520, ease: SINE },
    ],
  },
};

/** Decoration made of light, laid over the picture. Hidden until it runs. */
export const lights: Record<
  SceneId,
  Array<{
    kind: FxKind;
    x: number;
    y: number;
    size: number;
    moves: Move[];
    ratio?: number;
  }>
> = {
  telescope: [
    { kind: "halo", x: 906, y: 136, size: 250, moves: halo(7200, 0) },
    { kind: "glint", x: 686, y: 178, size: 46, moves: sparkle(6400, 1800) },
    { kind: "glint", x: 902, y: 92, size: 34, moves: sparkle(7600, 4200) },
  ],
  "rose-moon": [
    { kind: "halo", x: 907, y: 193, size: 330, moves: halo(7600, 0) },
    { kind: "mote", x: 470, y: 470, size: 12, moves: mote(8600, 0, 190, 22) },
    {
      kind: "mote",
      x: 560,
      y: 480,
      size: 9,
      moves: mote(10200, 2600, 220, 26),
    },
    {
      kind: "mote",
      x: 640,
      y: 465,
      size: 11,
      moves: mote(9400, 5200, 200, 20),
    },
    {
      kind: "mote",
      x: 515,
      y: 450,
      size: 8,
      moves: mote(11000, 7600, 170, 18),
    },
    { kind: "glint", x: 466, y: 300, size: 30, moves: sparkle(8200, 3000) },
  ],
  flight: [
    {
      kind: "streak",
      x: 120,
      y: 568,
      size: 120,
      ratio: 60,
      moves: streak(3100, 0, 70),
    },
    {
      kind: "streak",
      x: 112,
      y: 626,
      size: 140,
      ratio: 70,
      moves: streak(3700, 1300, 80),
    },
    {
      kind: "streak",
      x: 128,
      y: 440,
      size: 90,
      ratio: 45,
      moves: streak(2900, 2300, 60),
    },
    { kind: "glint", x: 960, y: 260, size: 26, moves: sparkle(7200, 2600) },
  ],
};

/* ── Layout ──────────────────────────────────────────────────────────────── */

const cache = new Map<SceneId, SceneArt>();

export function sceneArt(id: SceneId): SceneArt {
  const known = cache.get(id);
  if (known) return known;

  const { height, layers } = art.scenes[id];
  const byId = new Map(layers.map((l) => [l.id, l]));
  const nodes = new Map<string, SpriteNode>();

  for (const l of layers) {
    const parent = l.parent ? byId.get(l.parent) : undefined;
    const ref = parent ?? { x: 0, y: 0, w: WIDTH, h: height };
    nodes.set(l.id, {
      id: l.id,
      src: `/illustrations/layers/${l.file}`,
      width: l.w,
      height: l.h,
      box: {
        left: pct((l.x - ref.x) / ref.w),
        top: pct((l.y - ref.y) / ref.h),
        width: pct(l.w / ref.w),
        height: pct(l.h / ref.h),
      },
      origin: l.pivot
        ? `${pct((l.pivot[0] - l.x) / l.w)} ${pct((l.pivot[1] - l.y) / l.h)}`
        : undefined,
      behind: l.behind,
      moves: motion[id][l.id] ?? [],
      children: [],
    });
  }
  const sprites: SpriteNode[] = [];
  for (const l of layers) {
    const node = nodes.get(l.id)!;
    if (l.parent) nodes.get(l.parent)!.children.push(node);
    else sprites.push(node);
  }

  const fx: FxNode[] = lights[id].map((f) => ({
    kind: f.kind,
    box: {
      left: pct((f.x - f.size / 2) / WIDTH),
      top: pct((f.y - (f.ratio ? f.size / f.ratio / 2 : f.size / 2)) / height),
      width: pct(f.size / WIDTH),
    },
    ratio: f.ratio,
    moves: f.moves,
  }));

  const scene = { ratio: WIDTH / height, sprites, fx };
  cache.set(id, scene);
  return scene;
}

/** Keyframes for the Web Animations API. */
export function frames(move: Move): Keyframe[] {
  const last = move.values.length - 1;
  return move.values.map((value, i) => ({
    [move.prop]: value,
    offset: move.offsets ? move.offsets[i] : i / last,
    easing: move.ease ?? SINE,
  }));
}
