import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  type CSSProperties,
} from "react";
import {
  frames,
  sceneArt,
  type Move,
  type SceneArt,
  type SceneId,
  type SpriteNode,
} from "./art";

function InkPlanet({ live }: { live: boolean }) {
  const id = useId();
  return (
    <svg
      className={`scene scene-4 ink-planet ${live ? "" : "is-paused"}`}
      viewBox="0 0 400 350"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <filter id={id}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".55"
            numOctaves="3"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".14" />
          </feComponentTransfer>
          <feComposite in2="SourceAlpha" operator="in" />
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
      </defs>
      <g
        className="floating-planet"
        stroke="#464d49"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M112 125c26-30 66-37 101-31 38 2 69 20 82 50 9 19 9 35 5 60 12 35-13 60-30 75-23 16-57 28-86 19-26 3-55-11-70-31-21-13-32-37-28-62-7-27 9-65 26-80z"
          fill="#a4bab0"
          filter={`url(#${id})`}
        />
        <path
          d="M105 133c17-23 34-29 51-34M218 99c33 6 61 20 70 46M107 257c18 24 35 31 49 34"
          stroke="#dcdbc0"
          strokeWidth="1"
          opacity=".55"
        />
        <path
          d="M132 160c-14-2-20 9-13 16 8 5 22 4 23-5 0-5-5-9-10-11zM230 235c-15-3-25 6-20 13 6 10 24 10 33 4 10-10-3-16-13-17zM249 138c-4-1-8 3-6 6 4 5 12 1 9-3zM146 244c-3-6-11-4-9 1 0 5 13 8 9-1z"
          fill="#718f88"
        />
        <path
          d="m152 138-5 8m10-5-4 9M265 222l-3 7m8-4-2 6M175 277l-1 5m5-6-2 5M121 211l-2 5"
          opacity=".7"
        />
        <path
          d="M78 245c-17-13 7-40 27-51m189-47c41-8 63 3 49 24-19 29-75 49-126 65-58 18-110 25-139 9"
          stroke="#d1b881"
          strokeWidth="3"
        />
        <path
          d="M81 247c39 14 110-3 148-17 61-21 104-44 117-63"
          stroke="#f1d9a2"
          strokeWidth=".8"
        />
        <path
          className="ink-spark"
          d="m273 72 4-14 5 13 13 4-12 5-5 13-5-12-13-5z"
          fill="#d6b775"
        />
        <path
          className="ink-spark ink-spark-b"
          d="m83 101 3-9 4 8 8 3-8 4-4 8-3-8-8-4z"
          fill="#d6b775"
        />
        <path
          className="ink-spark ink-spark-c"
          d="M318 257c18-2 26-13 24-30-4 7-12 13-20 12 6 8 5 14-4 18z"
          fill="#d6b775"
        />
      </g>
    </svg>
  );
}
const SOURCE: Record<number, SceneId> = {
  2: "rose-moon",
  3: "flight",
};

type SceneProps = {
  variant?: number;
  /** Fetch right away even when the picture is off screen. */
  eager?: boolean;
  /** Called once every sprite is loaded and decoded (or failed to). */
  onReady?: () => void;
  /**
   * Whether the picture moves. The book freezes the page that is being
   * dragged or turned, and keeps the decoration behind the cover still.
   */
  live?: boolean;
};

export default function Scene({
  variant = 0,
  eager,
  onReady,
  live = true,
}: SceneProps) {
  if (variant === 4) return <InkPlanet live={live} />;
  return (
    <LayeredScene
      id={SOURCE[variant] ?? "telescope"}
      variant={variant}
      eager={eager || variant === 0 || variant === 1}
      onReady={onReady}
      live={live}
    />
  );
}

/** Decoding is a nicety, never a reason to hold the book closed. */
const DECODE_GRACE_MS = 1200;

function whenDecoded(img: HTMLImageElement): Promise<void> {
  const loaded = img.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
  // Decoding up front keeps the sprites from appearing one at a time. Some
  // engines never settle decode() for an image that is not being rendered.
  return loaded
    .then(() =>
      Promise.race([
        img.decode?.(),
        new Promise((resolve) => setTimeout(resolve, DECODE_GRACE_MS)),
      ]),
    )
    .then(
      () => {},
      () => {},
    );
}

function flatten(nodes: SpriteNode[], into = new Map<string, Move[]>()) {
  for (const node of nodes) {
    into.set(node.id, node.moves);
    flatten(node.children, into);
  }
  return into;
}

/**
 * Starts every motion of the scene on the document clock. Because they all
 * share one clock, a second copy of the same scene (the page underneath while
 * one turns, the cover and the first page) is at exactly the same point of the
 * same cycle, so a picture never jumps when it changes hands.
 */
function start(root: HTMLElement, scene: SceneArt): Animation[] {
  const running: Animation[] = [];
  const run = (target: Element | null | undefined, moves: Move[]) => {
    if (!target) return;
    for (const move of moves) {
      const animation = target.animate(frames(move), {
        duration: move.ms,
        delay: move.delay ?? 0,
        iterations: Infinity,
      });
      animation.startTime = 0;
      running.push(animation);
    }
  };
  const bySprite = flatten(scene.sprites);
  root.querySelectorAll<HTMLElement>("[data-sprite]").forEach((el) => {
    run(el, bySprite.get(el.dataset.sprite ?? "") ?? []);
  });
  root.querySelectorAll<HTMLElement>("[data-fx]").forEach((el) => {
    run(el, scene.fx[Number(el.dataset.fx)]?.moves);
  });
  return running;
}

function Sprite({
  node,
  loading,
  priority,
}: {
  node: SpriteNode;
  loading: "eager" | "lazy";
  priority: boolean;
}) {
  const style: CSSProperties = {
    ...node.box,
    transformOrigin: node.origin,
    zIndex: node.behind ? -1 : undefined,
    // Gives a sprite with something tucked behind it its own stacking context.
    isolation: node.children.some((c) => c.behind) ? "isolate" : undefined,
  };
  return (
    <span className="scene-sprite" data-sprite={node.id} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element -- sprites are
          tiny pre-sliced WebP files; the optimizer would only get in the way */}
      <img
        src={node.src}
        alt=""
        width={node.width}
        height={node.height}
        loading={loading}
        decoding="async"
        fetchPriority={priority && node.id === "body" ? "high" : undefined}
        draggable={false}
      />
      {node.children.map((child) => (
        <Sprite
          key={child.id}
          node={child}
          loading={loading}
          priority={priority}
        />
      ))}
    </span>
  );
}

function LayeredScene({
  id,
  variant,
  eager,
  onReady,
  live,
}: {
  id: SceneId;
  variant: number;
  eager: boolean;
  onReady?: () => void;
  live: boolean;
}) {
  const scene = sceneArt(id);
  const root = useRef<HTMLDivElement>(null);
  const running = useRef<Animation[]>([]);
  const ready = useEffectEvent(() => onReady?.());

  useEffect(() => {
    const images = Array.from(root.current?.querySelectorAll("img") ?? []);
    let cancelled = false;
    Promise.all(images.map(whenDecoded)).then(() => {
      if (!cancelled) ready();
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!live || still) {
      running.current.forEach((a) => a.pause());
      return;
    }
    if (running.current.length) running.current.forEach((a) => a.play());
    else running.current = start(el, scene);
  }, [live, scene]);

  useEffect(
    () => () => {
      running.current.forEach((a) => a.cancel());
      running.current = [];
    },
    [],
  );

  return (
    <div
      ref={root}
      className={`scene illustration-scene scene-${variant}`}
      aria-hidden="true"
    >
      <div
        className="scene-canvas"
        style={{ "--ar": scene.ratio } as CSSProperties}
      >
        {scene.sprites.map((node) => (
          <Sprite
            key={node.id}
            node={node}
            loading={eager ? "eager" : "lazy"}
            priority={variant === 0}
          />
        ))}
        {scene.fx.map((fx, i) => (
          <span
            key={i}
            data-fx={i}
            className={`scene-fx fx-${fx.kind}`}
            style={{
              ...fx.box,
              aspectRatio: fx.ratio ?? 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
