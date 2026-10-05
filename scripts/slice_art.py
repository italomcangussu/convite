#!/usr/bin/env python3
"""
Slices the three flat illustrations into independent layers (stars, planet,
cloud, scarf in three linked pieces...) so the book can move them on their own.

    pip install pillow numpy scipy
    python3 scripts/slice_art.py            # writes public/illustrations/layers/
    python3 scripts/slice_art.py --debug    # also writes overlays to ./.slice-debug/

Everything is cut at the delivery resolution (WIDTH px wide) and each pixel
belongs to exactly one layer, so stacking the layers at rest gives back the
original picture exactly (the script checks that). The geometry of every
sprite goes to components/book/art-manifest.json; how it moves lives by hand
in components/book/art.ts.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "illustrations"
OUT = SRC / "layers"
MANIFEST = ROOT / "components" / "book" / "art-manifest.json"
DEBUG_DIR = ROOT / ".slice-debug"
WIDTH = 1100
DEBUG = "--debug" in sys.argv
NAVY = np.array([30, 50, 80], dtype=float)


def load(name):
    im = Image.open(SRC / name).convert("RGBA")
    height = round(im.height * WIDTH / im.width)
    # Resample with premultiplied alpha so edges do not pick up dark fringes.
    out = np.array(im.convert("RGBa").resize((WIDTH, height), Image.LANCZOS).convert("RGBA"))
    # The matte is 250-253 inside the artwork and 1-2 in the "empty" sky. Snap
    # both to the real thing so layers can overlap exactly and compress well.
    alpha = out[..., 3]
    alpha[alpha >= 244] = 255
    alpha[alpha < 4] = 0
    out[alpha == 0] = 0
    return out


def hsv(rgb):
    r, g, b = [rgb[..., i].astype(float) / 255 for i in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    d = mx - mn
    h = np.zeros_like(mx)
    nz = d > 1e-6
    rm = nz & (mx == r)
    gm = nz & (mx == g) & ~rm
    bm = nz & ~rm & ~gm
    h[rm] = ((g - b)[rm] / d[rm]) % 6
    h[gm] = ((b - r)[gm] / d[gm]) + 2
    h[bm] = ((r - g)[bm] / d[bm]) + 4
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return h * 60, s, mx


def components(alpha):
    # Anything fainter than ~4% is resampling dust, not picture: it must not
    # glue separate pieces (cloud, stars) to the main figure.
    labels, n = ndi.label(alpha >= 10, structure=np.ones((3, 3)))
    return labels, n


def pick(labels, n, cx, cy):
    """Component whose bounding box contains the point (cx, cy), smallest wins."""
    best, best_area = 0, None
    for i, sl in enumerate(ndi.find_objects(labels), start=1):
        if sl is None:
            continue
        ys, xs = sl
        if xs.start <= cx < xs.stop and ys.start <= cy < ys.stop:
            area = (xs.stop - xs.start) * (ys.stop - ys.start)
            if best_area is None or area < best_area:
                best, best_area = i, area
    if not best:
        raise SystemExit(f"no component at {(cx, cy)}")
    return labels == best


def scarf_mask(rgba, body, x0, x1, y0, y1, core_hue=(28, 48), core_sat=0.42):
    """
    The scarf inside the body: pixels of the ochre colour in a box, plus the ink
    outline around them, assigned to the scarf or to its neighbours (fox, hair,
    wing) by whichever core colour is nearest.
    """
    h, s, v = hsv(rgba[..., :3])
    box = np.zeros_like(body)
    box[y0:y1, x0:x1] = True
    cand = body & box
    core_scarf = cand & (h >= core_hue[0]) & (h <= core_hue[1]) & (s >= core_sat) & (v >= 0.55)
    core_other = cand & (rgba[..., 3] > 200) & ~core_scarf & (v >= 0.35)
    # Only the biggest piece of scarf-coloured pixels counts as the scarf.
    lab, n = ndi.label(core_scarf, structure=np.ones((3, 3)))
    if n:
        sizes = ndi.sum(core_scarf, lab, range(1, n + 1))
        core_scarf = lab == (1 + int(np.argmax(sizes)))
    d_scarf = ndi.distance_transform_edt(~core_scarf)
    d_other = ndi.distance_transform_edt(~core_other)
    mask = cand & (d_scarf <= d_other + 0.5) & (d_scarf <= 6)
    mask |= core_scarf
    return mask


def overlay(name, rgba, masks, crop=None):
    if not DEBUG:
        return
    DEBUG_DIR.mkdir(exist_ok=True)
    a = rgba[..., 3:4].astype(float) / 255
    rgb = rgba[..., :3].astype(float) * a + NAVY * (1 - a)
    palette = [(255, 0, 255), (0, 255, 255), (255, 255, 0), (255, 80, 80), (80, 255, 80), (120, 120, 255)]
    for i, m in enumerate(masks):
        c = np.array(palette[i % len(palette)], dtype=float)
        rgb[m] = rgb[m] * 0.45 + c * 0.55
    img = Image.fromarray(rgb.astype(np.uint8))
    if crop:
        img = img.crop(crop)
    img.save(DEBUG_DIR / f"{name}.png")



class Layer:
    def __init__(self, id, mask, parent=None, strip=None, pivot=None, kind="art"):
        self.id, self.mask, self.parent = id, mask, parent
        self.strip = strip if strip is not None else np.zeros_like(mask)
        self.pivot, self.kind = pivot, kind


def bbox(mask):
    ys, xs = np.nonzero(mask)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def opaque(rgba):
    return rgba[..., 3] == 255


def strip_of(rgba, source, region, width):
    """Opaque pixels of `source` inside `region`, dilated by `width`, as overlap."""
    return opaque(rgba) & source & ndi.binary_dilation(region, iterations=width)


def sweep_islands(body, mask, box, limit=3000):
    """
    Cutting a layer out can strand specks of it (fringe threads, edge dust)
    that no longer touch the main picture. Those inside `box` go with the layer.
    """
    x0, y0, x1, y1 = box
    rest = body & ~mask
    lab, n = ndi.label(rest, structure=np.ones((3, 3)))
    sizes = ndi.sum(rest, lab, range(1, n + 1))
    main = 1 + int(np.argmax(sizes))
    extra = np.zeros_like(mask)
    for i, sl in enumerate(ndi.find_objects(lab), start=1):
        if i == main or sl is None or sizes[i - 1] > limit:
            continue
        ys, xs = sl
        if xs.start >= x0 and xs.stop <= x1 and ys.start >= y0 and ys.stop <= y1:
            extra |= lab == i
    return extra


def scarf_chain(rgba, body, box, cuts, prefix="scarf", overlap=9):
    """
    Splits the scarf into a chain of slices hanging off the body. `cuts` are x
    positions, from the body outwards; slice i is the child of slice i-1 and
    carries a strip of its parent so turning it never opens a crack.
    """
    mask = scarf_mask(rgba, body, *box)
    x0, y0, x1, y1 = bbox(mask)
    mask |= sweep_islands(body, mask, (x0 - 14, y0 - 14, x1 + 4, y1 + 14))
    edges = [x1, *cuts, x0 - 1]
    layers = []
    parent_mask, parent_id = body, "body"
    for i in range(len(edges) - 1):
        hi, lo = edges[i], edges[i + 1]
        band = np.zeros_like(mask)
        band[:, lo:hi] = True
        part = mask & band
        near = part[:, max(lo, hi - 3):hi]
        rows = np.nonzero(near.any(axis=1))[0]
        joint_y = float(rows.mean()) if rows.size else (y0 + y1) / 2
        window = np.zeros_like(mask)
        window[int(rows.min()) - 3 if rows.size else y0:int(rows.max()) + 4 if rows.size else y1, hi:hi + overlap] = True
        strip = opaque(rgba) & parent_mask & window
        layers.append(Layer(f"{prefix}-{'abc'[i]}", part, parent_id, strip, (hi, joint_y)))
        parent_mask, parent_id = part, f"{prefix}-{'abc'[i]}"
    return layers, mask


def plant(id, box, seed, cut, min_alpha=10, grow=2, strip_w=18, strip_h=9, exclude=()):
    """
    A plant that sways about its foot. `box` fences the search, `seed` is a
    point on the flower, `cut` is the row where the stem meets the ground. The
    layer is everything connected to the seed above that row.
    """
    def make(rgba, body, labels):
        x0, y0, x1, y1 = box
        fence = np.zeros_like(body)
        fence[y0:min(y1, cut), x0:x1] = True
        for ex0, ey0, ex1, ey1 in exclude:
            fence[ey0:ey1, ex0:ex1] = False
        core = body & fence & (rgba[..., 3] >= min_alpha)
        lab, n = ndi.label(core, structure=np.ones((3, 3)))
        sx, sy = seed
        pick_id = lab[sy, sx]
        if not pick_id:
            raise SystemExit(f"{id}: seed {seed} is not on the plant")
        mask = lab == pick_id
        mask = ndi.binary_dilation(mask, iterations=grow) & (rgba[..., 3] > 0) & fence & body
        rows = np.nonzero(mask.any(axis=1))[0]
        foot = np.nonzero(mask[rows.max() - 2:rows.max() + 1].any(axis=0))[0]
        fx = float(foot.mean())
        window = np.zeros_like(mask)
        window[cut:cut + strip_h, int(fx - strip_w):int(fx + strip_w)] = True
        strip = opaque(rgba) & body & ~mask & window
        return Layer(id, mask, "body", strip, (fx, float(cut)))

    return make


def blade(id, box, hub, radius, hue=(22, 52), sat=0.38, val=0.5, grow=2, behind=True):
    """
    The propeller: wood-coloured pixels in `box` that are not the hub. It turns
    about `hub`, and sits behind the body so shrinking it tucks it under the nose.
    """
    def make(rgba, body, labels):
        x0, y0, x1, y1 = box
        h, s, v = hsv(rgba[..., :3])
        yy, xx = np.mgrid[0:rgba.shape[0], 0:rgba.shape[1]]
        fence = np.zeros_like(body)
        fence[y0:y1, x0:x1] = True
        outside_hub = (xx - hub[0]) ** 2 + (yy - hub[1]) ** 2 > radius ** 2
        wood = body & fence & outside_hub & (rgba[..., 3] >= 200) & (h >= hue[0]) & (h <= hue[1]) & (s >= sat) & (v >= val)
        lab, n = ndi.label(wood, structure=np.ones((3, 3)))
        sizes = ndi.sum(wood, lab, range(1, n + 1))
        keep = np.zeros_like(body)
        for i, size in enumerate(sizes, start=1):
            if size >= 600:
                keep |= lab == i
        keep = ndi.binary_dilation(keep, iterations=grow) & (rgba[..., 3] > 0) & fence & outside_hub & body
        return Layer(id, keep, "body", None, (float(hub[0]), float(hub[1])), kind="behind" if behind else "art")

    return make


def composite(rgba, layers, body_mask):
    """Stacks the sprites at rest the way the browser will."""
    out = np.zeros(rgba.shape, dtype=float)

    def over(src_rgb, src_a, mask):
        nonlocal out
        a = (src_a * mask)[..., None]
        out[..., :3] = src_rgb * a + out[..., :3] * (1 - a)
        out[..., 3:4] = a + out[..., 3:4] * (1 - a)

    rgb = rgba[..., :3].astype(float)
    alpha = rgba[..., 3].astype(float) / 255
    over(rgb, alpha, body_mask)
    for layer in layers:
        over(rgb, alpha, layer.mask | layer.strip)
    return out


def flatten(rgba):
    a = rgba[..., 3:4].astype(float) / 255
    return rgba[..., :3].astype(float) * a, rgba[..., 3].astype(float) / 255


def check(name, rgba, layers, body_mask):
    out = composite(rgba, layers, body_mask)
    ref_rgb, ref_a = flatten(rgba)
    a = out[..., 3]
    diff_a = np.abs(a - ref_a).max()
    diff_rgb = np.abs(out[..., :3] / np.maximum(a[..., None], 1e-6) * a[..., None] - ref_rgb).max()
    ok = diff_a < 0.01 and diff_rgb < 2.5
    print(f"  composite {name}: alpha off by {diff_a:.4f}, colour off by {diff_rgb:.2f} -> {'ok' if ok else 'MISMATCH'}")
    return ok


def build(name, file, spec):
    rgba = load(file)
    alpha = rgba[..., 3]
    labels, n = components(alpha)
    areas = ndi.sum(alpha >= 10, labels, range(1, n + 1))
    body = labels == (1 + int(np.argmax(areas)))
    layers = []
    # Pixels of the main figure itself are never taken by a neighbouring piece.
    body_all = body.copy()
    for lid, cx, cy in spec.get("pieces", []):
        m = pick(labels, n, cx, cy)
        # Take the faint halo around the piece too (alpha 4-9), or it would
        # stay behind as a ghost when the piece moves.
        m = ndi.binary_dilation(m, iterations=3) & (alpha > 0) & ~body_all
        body = body & ~m
        layers.append(Layer(lid, m, None, None, None))
    if "scarf" in spec:
        scarf, smask = scarf_chain(rgba, body, spec["scarf"], spec["cuts"])
        body = body & ~smask
        layers = layers + scarf
    for extra in spec.get("custom", []):
        layer = extra(rgba, body, labels)
        body = body & ~layer.mask
        layers.append(layer)
    return rgba, body, layers



def spec_flight():
    k = WIDTH / 1430

    def c(x0, y0, x1, y1):
        return round((x0 + x1) / 2 * k), round((y0 + y1) / 2 * k)

    return dict(
        file="prince-flight.png",
        pieces=[
            ("cloud", *c(56, 856, 469, 1018)),
            ("planet", *c(1079, 116, 1365, 291)),
            ("star-a", *c(964, 321, 1051, 412)),
            ("star-b", *c(1293, 774, 1380, 865)),
            ("star-c", *c(415, 142, 502, 231)),
        ],
        scarf=(40, 455, 150, 340),
        cuts=[330, 200],
        custom=[blade("prop", (880, 360, 1000, 700), (932, 526), 32)],
    )


def spec_telescope():
    k = WIDTH / 1402

    def c(x0, y0, x1, y1):
        return round((x0 + x1) / 2 * k), round((y0 + y1) / 2 * k)

    return dict(
        file="prince-telescope.png",
        pieces=[
            ("moon", *c(1090, 88, 1219, 257)),
            ("star-a", *c(870, 91, 939, 168)),
            ("star-b", *c(243, 240, 310, 307)),
            ("star-c", *c(425, 66, 489, 127)),
            ("star-d", *c(1247, 358, 1304, 414)),
        ],
        scarf=(60, 430, 270, 470),
        cuts=[320, 200],
        custom=[plant("rose", (832, 395, 960, 545), (920, 428), 540, exclude=[(832, 495, 872, 545)])],
    )


def spec_rose_moon():
    k = WIDTH / 1402

    def c(x0, y0, x1, y1):
        return round((x0 + x1) / 2 * k), round((y0 + y1) / 2 * k)

    return dict(
        file="rose-moon.png",
        pieces=[
            ("moon", *c(1049, 118, 1260, 375)),
            ("star-a", *c(372, 112, 479, 220)),
            ("star-b", *c(1073, 485, 1162, 573)),
            ("star-c", *c(242, 406, 328, 499)),
        ],
        custom=[
            plant(
                "rose",
                (415, 215, 700, 505),
                (549, 314),
                502,
                min_alpha=200,
                exclude=[(415, 440, 432, 505), (630, 486, 700, 505)],
            )
        ],
    )


SCENES = {"telescope": spec_telescope, "rose-moon": spec_rose_moon, "flight": spec_flight}
# Big painted areas tolerate lossy WebP; small pieces stay lossless so the
# joints between linked slices match to the pixel.
LOSSY = {"body"}


def encode(path, crop, lossy):
    img = Image.fromarray(crop, "RGBA")
    if lossy:
        img.save(path, "WEBP", quality=90, alpha_quality=100, method=6)
    else:
        img.save(path, "WEBP", lossless=True, quality=100, method=6)


def export():
    import hashlib

    if OUT.exists():
        for old in OUT.glob("*.webp"):
            old.unlink()
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"width": WIDTH, "scenes": {}}
    total = 0
    ok = True
    for name, make in SCENES.items():
        spec = make()
        rgba, body, layers = build(name, spec["file"], spec)
        taken = np.zeros_like(body)
        for layer in layers:
            taken |= layer.mask
        main = (rgba[..., 3] > 0) & ~taken
        entries = []
        sprites = [Layer("body", main, None)] + layers
        # Pieces first (behind), then the body and what hangs off it.
        order = [l for l in sprites if l.id != "body" and l.parent is None] + [l for l in sprites if l.id == "body"] + [l for l in sprites if l.parent is not None]
        decoded = []
        for layer in order:
            keep = layer.mask | layer.strip
            x0, y0, x1, y1 = bbox(keep)
            crop = rgba[y0:y1, x0:x1].copy()
            crop[~keep[y0:y1, x0:x1]] = 0
            tmp = OUT / f"{name}-{layer.id}.tmp.webp"
            encode(tmp, crop, layer.id in LOSSY)
            digest = hashlib.sha1(tmp.read_bytes()).hexdigest()[:8]
            final = OUT / f"{name}-{layer.id}.{digest}.webp"
            tmp.rename(final)
            total += final.stat().st_size
            entries.append(
                {
                    "id": layer.id,
                    "file": final.name,
                    "x": x0,
                    "y": y0,
                    "w": x1 - x0,
                    "h": y1 - y0,
                    "parent": layer.parent,
                    "pivot": [round(layer.pivot[0], 1), round(layer.pivot[1], 1)] if layer.pivot else None,
                    "behind": layer.kind == "behind",
                }
            )
            back = np.array(Image.open(final).convert("RGBA"))
            full = np.zeros_like(rgba)
            full[y0:y1, x0:x1] = back
            decoded.append((layer, full))
            print(f"  {final.name:42s} {x1 - x0:4d}x{y1 - y0:<4d} {final.stat().st_size / 1024:7.1f} KB")
        manifest["scenes"][name] = {"height": rgba.shape[0], "layers": entries}
        # What the browser will draw at rest, from the files actually written.
        out = np.zeros(rgba.shape, dtype=float)
        # Behind layers first, then body, then the rest in z-order.
        for layer, full in decoded:
            a = full[..., 3:4].astype(float) / 255
            out[..., :3] = full[..., :3] * a + out[..., :3] * (1 - a)
            out[..., 3:4] = a + out[..., 3:4] * (1 - a)
        ref_a = rgba[..., 3].astype(float) / 255
        # `out` holds straight colour composited by "over" without premultiply;
        # compare on a navy backdrop instead, which is what guests see.
        navy = NAVY
        got = out[..., :3] + navy * (1 - out[..., 3:4])
        want = rgba[..., :3].astype(float) * ref_a[..., None] + navy * (1 - ref_a[..., None])
        err = np.abs(got - want)
        print(f"  [{name}] vs original on navy: max {err.max():.1f}, mean {err.mean():.3f} (of 255)")
        ok &= err.max() < 80 and err.mean() < 2.5
        ok &= check(name, rgba, layers, main)
    MANIFEST.write_text(json.dumps(manifest, indent=1) + "\n")
    print(f"\n{total / 1024:.0f} KB of sprites -> {OUT.relative_to(ROOT)}; manifest {MANIFEST.relative_to(ROOT)}")
    if not ok:
        raise SystemExit("composite does not match the original")


if __name__ == "__main__":
    export()
