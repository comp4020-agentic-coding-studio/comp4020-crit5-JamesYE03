// The tunnel, as four repeating tiles.
//
// Each is an SVG string turned into a data URI and set as a layer's
// background-image, so the browser rasterises it once and the per-frame work
// is a single `transform` on each layer — no repaint, no filter re-running.
// That is the rule this stack lives or dies by: filters and gradients are
// cheap when they are baked into an image and ruinous when they are recomputed
// sixty times a second.
//
// The tiles are generated rather than hand-drawn so the stonework can be
// irregular — a wall of identical blocks reads as wallpaper. The generator is
// seeded, so the tunnel is the same tunnel on every load.

/** Deterministic PRNG. Math.random would redraw the tomb on every refresh. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function svgUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const open = (w: number, h: number) =>
  `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>`;

/**
 * Limestone, lit by torches: everything is the same hue, only the lightness
 * moves. That is what keeps a generated wall from looking like confetti.
 *
 * Emitted as hex rather than `hsl()`. These land in SVG *presentation
 * attributes*, whose colour parsing is older and narrower than a stylesheet's,
 * and a colour a browser cannot read is a black rectangle rather than an
 * error.
 */
function hex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (n: number): string => {
    const k = (n + hue / 30) % 12;
    const value = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${c(0)}${c(8)}${c(4)}`;
}

const stone = (lightness: number, saturation = 24) => hex(31, saturation, lightness);
const fire = (hue: number, saturation: number, lightness: number) =>
  hex(hue, saturation, lightness);

/**
 * The wall the torches are set into: courses of ashlar in a running bond, a
 * carved band, a niche, and one torch per tile.
 */
export function wallTile(): string {
  const r = rng(50831);
  const W = 820;
  const H = 520;
  const course = 62;
  let out = `${open(W, H)}`;

  out += `<defs><radialGradient id='fire' cx='50%' cy='50%' r='50%'>
    <stop offset='0%' stop-color='${fire(36, 92, 62)}' stop-opacity='0.62'/>
    <stop offset='42%' stop-color='${fire(30, 88, 50)}' stop-opacity='0.22'/>
    <stop offset='100%' stop-color='${fire(26, 80, 40)}' stop-opacity='0'/>
  </radialGradient></defs>`;

  // mortar shows through the gaps between blocks
  out += `<rect width='${W}' height='${H}' fill='${stone(7, 28)}'/>`;

  for (let row = 0, y = -18; y < H; y += course, row++) {
    let x = row % 2 === 0 ? -60 : -128;
    while (x < W) {
      const w = 104 + Math.floor(r() * 86);
      // A handful of blocks are noticeably darker: soot, damp, a replacement
      // cut from different stone. Irregularity is the whole point.
      const light = r() < 0.16 ? 10 + r() * 3 : 15 + r() * 6;
      out += `<rect x='${(x + 3).toFixed(0)}' y='${(y + 3).toFixed(0)}' width='${(w - 6).toFixed(0)}' height='${course - 6}' fill='${stone(light)}'/>`;
      // top edge catches the torchlight, bottom edge falls away
      out += `<rect x='${(x + 3).toFixed(0)}' y='${(y + 3).toFixed(0)}' width='${(w - 6).toFixed(0)}' height='2.5' fill='${stone(light + 6)}' opacity='0.8'/>`;
      out += `<rect x='${(x + 3).toFixed(0)}' y='${(y + course - 5).toFixed(0)}' width='${(w - 6).toFixed(0)}' height='2' fill='${stone(4, 30)}' opacity='0.75'/>`;
      x += w;
    }
  }

  // A carved band running the length of the tunnel. Marks, not writing: real
  // glyphs would be a language, and a language is text on the screen.
  const bandY = 196;
  out += `<rect x='0' y='${bandY}' width='${W}' height='40' fill='${stone(11)}'/>`;
  for (let x = 8; x < W; x += 34) {
    const h = 8 + r() * 16;
    out += `<rect x='${x.toFixed(0)}' y='${(bandY + 20 - h / 2).toFixed(0)}' width='7' height='${h.toFixed(0)}' rx='2' fill='${stone(17)}' opacity='0.7'/>`;
    if (r() < 0.45) {
      out += `<circle cx='${(x + 3.5).toFixed(0)}' cy='${(bandY + 8).toFixed(0)}' r='3' fill='${stone(18)}' opacity='0.6'/>`;
    }
  }

  // A niche, blacker than anything else on the wall.
  out += `<path d='M300 330 h74 v130 h-74 z' fill='${stone(3, 30)}'/>`;
  out += `<path d='M300 330 q37 -34 74 0' fill='${stone(3, 30)}'/>`;
  out += `<rect x='296' y='456' width='82' height='7' fill='${stone(14)}'/>`;

  // The torch: bracket, flame, and the glow it throws on the stone.
  const tx = 600;
  const ty = 250;
  out += `<circle cx='${tx}' cy='${ty}' r='168' fill='url(#fire)'/>`;
  out += `<path d='M${tx - 5} ${ty + 62} l10 0 l-2 -46 l-6 0 z' fill='${stone(12)}'/>`;
  out += `<path d='M${tx - 13} ${ty + 62} h26 v9 h-26 z' rx='3' fill='${stone(15)}'/>`;
  out += `<path d='M${tx} ${ty - 44} c 16 22 13 34 6 42 c 10 -2 12 -12 12 -12 c 6 20 -6 32 -18 32 c -13 0 -24 -12 -18 -32 c 2 4 6 9 12 8 c -9 -12 -6 -26 6 -38 z' fill='${fire(36, 96, 60)}'/>`;
  out += `<path d='M${tx} ${ty - 20} c 9 14 7 22 2 28 c 7 3 -4 12 -12 6 c -7 -6 -6 -22 10 -34 z' fill='${fire(48, 98, 78)}'/>`;

  return `${out}</svg>`;
}

/** Rough-hewn rock hanging from above, with the odd stalactite. */
export function ceilingTile(): string {
  const r = rng(770);
  const W = 560;
  const H = 260;
  let out = `${open(W, H)}`;

  let d = `M0 0 H${W} V${(120 + r() * 20).toFixed(0)} `;
  for (let x = W - 56; x >= 0; x -= 56) {
    d += `L${x} ${(96 + r() * 54).toFixed(0)} `;
  }
  d += "Z";
  out += `<path d='${d}' fill='${stone(9, 26)}'/>`;

  // a lit lower lip, so the ceiling has a near edge instead of a flat cut
  let lip = `M0 ${(112 + r() * 10).toFixed(0)} `;
  for (let x = 56; x <= W; x += 56) lip += `L${x} ${(100 + r() * 46).toFixed(0)} `;
  out += `<path d='${lip}' fill='none' stroke='${stone(15, 26)}' stroke-width='3' opacity='0.55'/>`;

  for (let i = 0; i < 3; i++) {
    const x = 70 + i * 170 + r() * 40;
    const len = 26 + r() * 46;
    out += `<path d='M${(x - 11).toFixed(0)} ${(118 + r() * 14).toFixed(0)} l11 ${len.toFixed(0)} l11 ${(-len).toFixed(0)} z' fill='${stone(11, 26)}'/>`;
  }
  return `${out}</svg>`;
}

/** Flagstones, cracked, with sand and rubble drifted across them. */
export function floorTile(): string {
  const r = rng(31415);
  const W = 340;
  const H = 240;
  let out = `${open(W, H)}<rect width='${W}' height='${H}' fill='${stone(6, 26)}'/>`;

  // the walking surface: a lit strip along the top of the slabs
  out += `<rect x='0' y='0' width='${W}' height='7' fill='${stone(19)}'/>`;

  let x = -30;
  while (x < W) {
    const w = 74 + Math.floor(r() * 62);
    const light = 9 + r() * 5;
    out += `<rect x='${(x + 2).toFixed(0)}' y='6' width='${(w - 4).toFixed(0)}' height='${H}' fill='${stone(light)}'/>`;
    out += `<rect x='${(x + 2).toFixed(0)}' y='6' width='${(w - 4).toFixed(0)}' height='3' fill='${stone(light + 7)}' opacity='0.75'/>`;
    // a crack running back from the joint
    if (r() < 0.55) {
      const cx = x + 10 + r() * (w - 20);
      out += `<path d='M${cx.toFixed(0)} 8 l${(r() * 16 - 8).toFixed(0)} 34 l${(r() * 14 - 7).toFixed(0)} 40' stroke='${stone(3, 30)}' stroke-width='2.5' fill='none' opacity='0.8'/>`;
    }
    x += w;
  }

  for (let i = 0; i < 16; i++) {
    const rx = r() * W;
    const ry = 12 + r() * (H - 30);
    const size = 2 + r() * 5;
    out += `<ellipse cx='${rx.toFixed(0)}' cy='${ry.toFixed(0)}' rx='${size.toFixed(1)}' ry='${(size * 0.6).toFixed(1)}' fill='${stone(13 + r() * 5)}' opacity='${(0.35 + r() * 0.4).toFixed(2)}'/>`;
  }
  return `${out}</svg>`;
}

/**
 * Film grain, as a still image.
 *
 * `feTurbulence` is expensive; baked into a background image it runs once at
 * decode time and costs nothing thereafter. Never put this filter on a live
 * element and animate underneath it.
 */
export function grainTile(): string {
  return (
    `${open(180, 180)}<filter id='n'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' seed='9'/>` +
    `<feColorMatrix type='saturate' values='0'/>` +
    `</filter><rect width='180' height='180' filter='url(#n)' opacity='0.42'/></svg>`
  );
}
