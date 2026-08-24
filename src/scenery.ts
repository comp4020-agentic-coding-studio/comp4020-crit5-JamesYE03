// The tunnel, as repeating tiles.
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
//
// Repetition is fought two ways: the tiles are wide, and their widths share no
// useful common factor (1640, 1180, 520, 460), so the layers drift against one
// another and the combination does not come back around inside a run.

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
const bone = (lightness: number) => hex(44, 14, lightness);

/** A jagged run of line, for cracks in stone. */
function jag(x: number, y: number, steps: number, spread: number, r: () => number): string {
  let d = `M${x.toFixed(0)} ${y.toFixed(0)}`;
  let cy = y;
  for (let i = 1; i <= steps; i++) {
    cy += 9 + r() * 11;
    d += ` L${(x + (r() - 0.5) * spread).toFixed(0)} ${cy.toFixed(0)}`;
  }
  return d;
}

/**
 * The wall: courses of ashlar, but a wall that has been down here a long time.
 * Cracks run through it, whole blocks have dropped out, and the things a tomb
 * has — a sealed door, a carved panel, a niche with an urn still in it, a
 * bricked-up shaft — come round at intervals that line up with nothing else on
 * screen.
 */
export function wallTile(): string {
  const r = rng(50831);
  const W = 1640;
  const H = 560;
  const course = 54;
  let out = `${open(W, H)}`;

  out += `<defs><radialGradient id='fire' cx='50%' cy='50%' r='50%'>
    <stop offset='0%' stop-color='${fire(36, 92, 62)}' stop-opacity='0.66'/>
    <stop offset='40%' stop-color='${fire(30, 88, 50)}' stop-opacity='0.24'/>
    <stop offset='100%' stop-color='${fire(26, 80, 40)}' stop-opacity='0'/>
  </radialGradient></defs>`;

  // mortar, and the dark behind any block that has fallen out
  out += `<rect width='${W}' height='${H}' fill='${stone(5, 28)}'/>`;

  const sockets: Array<[number, number, number, number]> = [];
  for (let row = 0, y = -16; y < H; y += course, row++) {
    let x = row % 2 === 0 ? -60 : -128;
    while (x < W) {
      const w = 92 + Math.floor(r() * 78);
      // One block in twelve is simply gone. Absence does more for "old" than
      // any amount of texture.
      if (r() < 0.085) {
        sockets.push([x + 3, y + 3, w - 6, course - 6]);
        x += w;
        continue;
      }
      const light = r() < 0.18 ? 9 + r() * 3 : 14 + r() * 6;
      out += `<rect x='${(x + 3).toFixed(0)}' y='${(y + 3).toFixed(0)}' width='${(w - 6).toFixed(0)}' height='${course - 6}' fill='${stone(light)}'/>`;
      out += `<rect x='${(x + 3).toFixed(0)}' y='${(y + 3).toFixed(0)}' width='${(w - 6).toFixed(0)}' height='2.5' fill='${stone(light + 6)}' opacity='0.8'/>`;
      out += `<rect x='${(x + 3).toFixed(0)}' y='${(y + course - 5).toFixed(0)}' width='${(w - 6).toFixed(0)}' height='2' fill='${stone(3, 30)}' opacity='0.75'/>`;
      // soot and water staining, so the courses are not uniformly clean
      if (r() < 0.24) {
        out += `<rect x='${(x + 6).toFixed(0)}' y='${(y + 3).toFixed(0)}' width='${(w * 0.4).toFixed(0)}' height='${course - 6}' fill='${stone(3, 30)}' opacity='${(0.18 + r() * 0.22).toFixed(2)}'/>`;
      }
      x += w;
    }
  }

  // structural cracks, running down through several courses at once
  for (let i = 0; i < 6; i++) {
    const x = 60 + i * 260 + r() * 120;
    out += `<path d='${jag(x, r() * 40, 24, 44, r)}' fill='none' stroke='${stone(2, 30)}' stroke-width='${(2 + r() * 3).toFixed(1)}' opacity='0.85'/>`;
  }

  // A carved band. Marks, not writing: real glyphs would be a language, and a
  // language is text on the screen.
  const bandY = 178;
  out += `<rect x='0' y='${bandY}' width='${W}' height='42' fill='${stone(10)}'/>`;
  out += `<rect x='0' y='${bandY}' width='${W}' height='2' fill='${stone(17)}' opacity='0.6'/>`;
  for (let x = 8; x < W; x += 32) {
    if (r() < 0.14) continue; // chipped away
    const h = 8 + r() * 16;
    out += `<rect x='${x.toFixed(0)}' y='${(bandY + 21 - h / 2).toFixed(0)}' width='7' height='${h.toFixed(0)}' rx='2' fill='${stone(16)}' opacity='0.66'/>`;
    if (r() < 0.4) {
      out += `<circle cx='${(x + 3.5).toFixed(0)}' cy='${(bandY + 9).toFixed(0)}' r='3' fill='${stone(17)}' opacity='0.55'/>`;
    }
  }

  // --- the things that make it a tomb rather than a corridor ---

  // a sealed door, cracked open
  const dx = 190;
  out += `<path d='M${dx} 250 h96 v250 h-96 z' fill='${stone(12)}'/>`;
  out += `<path d='M${dx} 250 h96 v250 h-96 z' fill='none' stroke='${stone(4, 30)}' stroke-width='5'/>`;
  out += `<path d='M${dx + 46} 250 v250' stroke='${stone(2, 30)}' stroke-width='7'/>`;
  out += `<circle cx='${dx + 48}' cy='372' r='15' fill='none' stroke='${stone(18)}' stroke-width='4'/>`;

  // a niche with an urn still standing in it
  const nx = 700;
  out += `<path d='M${nx} 300 h78 v200 h-78 z' fill='${stone(2, 30)}'/>`;
  out += `<path d='M${nx} 300 q39 -36 78 0' fill='${stone(2, 30)}'/>`;
  out += `<rect x='${nx - 5}' y='496' width='88' height='8' fill='${stone(13)}'/>`;
  out += `<path d='M${nx + 26} 496 c -12 -26 -10 -52 13 -60 c 23 8 25 34 13 60 z' fill='${stone(15)}'/>`;
  out += `<rect x='${nx + 31}' y='428' width='16' height='9' rx='3' fill='${stone(18)}'/>`;

  // a bricked-up shaft, its infill a different stone from the wall around it
  const sx = 1130;
  out += `<rect x='${sx}' y='236' width='150' height='270' fill='${stone(4, 30)}'/>`;
  for (let y = 240; y < 500; y += 34) {
    for (let x = sx + 4; x < sx + 146; x += 46) {
      out += `<rect x='${(x + (y % 68 ? 0 : 20)).toFixed(0)}' y='${y}' width='40' height='28' fill='${stone(11, 18)}'/>`;
    }
  }
  out += `<rect x='${sx - 6}' y='230' width='162' height='9' fill='${stone(15)}'/>`;

  // a standing figure, cut shallow into the stone
  const gx = 1420;
  out += `<rect x='${gx - 10}' y='268' width='104' height='236' fill='${stone(8)}'/>`;
  out += `<circle cx='${gx + 42}' cy='306' r='17' fill='${stone(15)}'/>`;
  out += `<path d='M${gx + 42} 324 v96 M${gx + 42} 350 l -30 22 M${gx + 42} 350 l 30 14 M${gx + 42} 420 l -22 62 M${gx + 42} 420 l 24 62' fill='none' stroke='${stone(15)}' stroke-width='9' stroke-linecap='round'/>`;

  // torches, at intervals that match nothing else
  for (const [tx, ty] of [
    [470, 240],
    [980, 268],
  ]) {
    out += `<circle cx='${tx}' cy='${ty}' r='190' fill='url(#fire)'/>`;
    out += `<path d='M${tx - 5} ${ty + 62} l10 0 l-2 -46 l-6 0 z' fill='${stone(11)}'/>`;
    out += `<path d='M${tx - 13} ${ty + 60} h26 v10 h-26 z' fill='${stone(14)}'/>`;
    out += `<path d='M${tx} ${ty - 46} c 16 22 13 34 6 42 c 10 -2 12 -12 12 -12 c 6 20 -6 32 -18 32 c -13 0 -24 -12 -18 -32 c 2 4 6 9 12 8 c -9 -12 -6 -26 6 -38 z' fill='${fire(36, 96, 60)}'/>`;
    out += `<path d='M${tx} ${ty - 20} c 9 14 7 22 2 28 c 7 3 -4 12 -12 6 c -7 -6 -6 -22 10 -34 z' fill='${fire(48, 98, 78)}'/>`;
  }

  // the sockets last, so nothing is drawn back over them
  for (const [x, y, w, h] of sockets) {
    out += `<rect x='${x.toFixed(0)}' y='${y.toFixed(0)}' width='${w.toFixed(0)}' height='${h.toFixed(0)}' fill='${stone(2, 30)}'/>`;
    out += `<rect x='${x.toFixed(0)}' y='${y.toFixed(0)}' width='${w.toFixed(0)}' height='4' fill='#000' opacity='0.6'/>`;
  }

  return `${out}</svg>`;
}

/**
 * The ceiling, hanging low. It reaches most of the way down its own tile on
 * purpose: the first tunnel was a corridor you could have driven a truck
 * through, and headroom was most of what made it feel roomy.
 */
export function ceilingTile(): string {
  const r = rng(770);
  const W = 520;
  const H = 300;
  let out = `${open(W, H)}`;

  let d = `M0 0 H${W} V${(196 + r() * 26).toFixed(0)} `;
  for (let x = W - 40; x >= 0; x -= 40) {
    d += `L${x} ${(150 + r() * 78).toFixed(0)} `;
  }
  d += "Z";
  out += `<path d='${d}' fill='${stone(7, 26)}'/>`;

  // a lit lower lip, so it has a near edge rather than a flat cut
  let lip = `M0 ${(176 + r() * 14).toFixed(0)} `;
  for (let x = 40; x <= W; x += 40) lip += `L${x} ${(150 + r() * 70).toFixed(0)} `;
  out += `<path d='${lip}' fill='none' stroke='${stone(14, 26)}' stroke-width='3' opacity='0.5'/>`;

  // stalactites, and the odd slab hanging on by one edge
  for (let i = 0; i < 5; i++) {
    const x = 30 + i * 104 + r() * 34;
    const len = 34 + r() * 70;
    const top = 182 + r() * 20;
    out += `<path d='M${(x - 13).toFixed(0)} ${top.toFixed(0)} l13 ${len.toFixed(0)} l13 ${(-len).toFixed(0)} z' fill='${stone(9, 26)}'/>`;
    if (r() < 0.4) {
      out += `<path d='M${(x + 22).toFixed(0)} ${top.toFixed(0)} l44 ${(14 + r() * 22).toFixed(0)} l6 -${(18 + r() * 10).toFixed(0)} z' fill='${stone(6, 26)}'/>`;
    }
  }

  // roots and cobweb, feeling their way down through the cracks
  for (let i = 0; i < 4; i++) {
    const x = 60 + i * 128 + r() * 40;
    out += `<path d='M${x.toFixed(0)} ${(168 + r() * 20).toFixed(0)} q ${(r() * 18 - 9).toFixed(0)} ${(24 + r() * 16).toFixed(0)} ${(r() * 24 - 12).toFixed(0)} ${(52 + r() * 30).toFixed(0)}' fill='none' stroke='${stone(11, 20)}' stroke-width='2' opacity='0.6'/>`;
  }
  out += `<path d='M120 190 L164 214 L146 250 M164 214 L206 200' fill='none' stroke='${bone(52)}' stroke-width='1.2' opacity='0.22'/>`;
  out += `<path d='M362 200 L404 226 L392 262 M404 226 L440 210' fill='none' stroke='${bone(52)}' stroke-width='1.2' opacity='0.18'/>`;

  return `${out}</svg>`;
}

/** Flagstones, cracked and lifting, with rubble and sand drifted over them. */
export function floorTile(): string {
  const r = rng(31415);
  const W = 460;
  const H = 260;
  let out = `${open(W, H)}<rect width='${W}' height='${H}' fill='${stone(5, 26)}'/>`;

  out += `<rect x='0' y='0' width='${W}' height='7' fill='${stone(18)}'/>`;

  let x = -30;
  while (x < W) {
    const w = 64 + Math.floor(r() * 58);
    const light = 8 + r() * 5;
    // some slabs have dropped, some have lifted
    const drop = r() < 0.3 ? 3 + r() * 6 : 0;
    out += `<rect x='${(x + 2).toFixed(0)}' y='${(6 + drop).toFixed(0)}' width='${(w - 4).toFixed(0)}' height='${H}' fill='${stone(light)}'/>`;
    out += `<rect x='${(x + 2).toFixed(0)}' y='${(6 + drop).toFixed(0)}' width='${(w - 4).toFixed(0)}' height='3' fill='${stone(light + 8)}' opacity='0.7'/>`;
    if (r() < 0.6) {
      out += `<path d='${jag(x + 8 + r() * (w - 20), 10 + drop, 4, 14, r)}' stroke='${stone(2, 30)}' stroke-width='2.5' fill='none' opacity='0.8'/>`;
    }
    x += w;
  }

  // rubble: fallen blocks near the wall, gravel and sand further out
  for (let i = 0; i < 7; i++) {
    const bx = r() * W;
    const bw = 16 + r() * 34;
    const bh = 9 + r() * 16;
    out += `<path d='M${bx.toFixed(0)} ${(10 + r() * 26).toFixed(0)} l${bw.toFixed(0)} ${(r() * 6 - 3).toFixed(0)} l${(r() * 6 - 3).toFixed(0)} ${bh.toFixed(0)} l-${bw.toFixed(0)} ${(r() * 5).toFixed(0)} z' fill='${stone(12 + r() * 5)}'/>`;
  }
  for (let i = 0; i < 26; i++) {
    const size = 1.5 + r() * 4.5;
    out += `<ellipse cx='${(r() * W).toFixed(0)}' cy='${(12 + r() * (H - 30)).toFixed(0)}' rx='${size.toFixed(1)}' ry='${(size * 0.6).toFixed(1)}' fill='${stone(12 + r() * 6)}' opacity='${(0.3 + r() * 0.4).toFixed(2)}'/>`;
  }
  // drifted sand, catching the light along its crest
  out += `<path d='M0 40 q 70 -16 140 4 q 80 22 150 -6 q 90 -22 170 8 L${W} ${H} L0 ${H} z' fill='${stone(9, 20)}' opacity='0.55'/>`;
  out += `<path d='M0 40 q 70 -16 140 4 q 80 22 150 -6 q 90 -22 170 8' fill='none' stroke='${stone(17, 20)}' stroke-width='2' opacity='0.4'/>`;

  return `${out}</svg>`;
}

/**
 * What is standing on the floor: a sarcophagus, urns, a toppled column, bones.
 *
 * Its own layer, so it scrolls at its own rate against the wall behind it, and
 * its own tile width, so the pair does not come back around inside a run.
 */
export function propsTile(): string {
  const r = rng(6180);
  const W = 1180;
  const H = 260;
  let out = `${open(W, H)}`;

  // a lidded sarcophagus, its lid shoved aside
  const sx = 120;
  out += `<path d='M${sx} 96 h210 l-14 92 h-182 z' fill='${stone(12)}'/>`;
  out += `<path d='M${sx} 96 h210 l-6 -16 h-198 z' fill='${stone(18)}'/>`;
  out += `<path d='M${sx + 26} 62 h188 l10 16 h-208 z' fill='${stone(16)}'/>`;
  out += `<ellipse cx='${sx + 104}' cy='128' rx='22' ry='27' fill='${stone(17)}'/>`;
  out += `<path d='M${sx + 84} 152 h40 v34 h-40 z' fill='${stone(16)}'/>`;
  out += `<path d='M${sx + 60} 118 v56 M${sx + 152} 118 v56' stroke='${stone(6, 28)}' stroke-width='4'/>`;

  // three urns of different heights
  for (const [ux, scale] of [
    [470, 1],
    [520, 0.72],
    [566, 0.88],
  ] as const) {
    const h = 62 * scale;
    const w = 16 * scale;
    out += `<path d='M${ux} 188 c -${(15 * scale).toFixed(0)} -${(h * 0.5).toFixed(0)} -${(12 * scale).toFixed(0)} -${h.toFixed(0)} ${w.toFixed(0)} -${(h + 6).toFixed(0)} c ${(28 * scale).toFixed(0)} 6 ${(30 * scale).toFixed(0)} ${(h * 0.6).toFixed(0)} ${(14 * scale).toFixed(0)} ${(h + 6).toFixed(0)} z' fill='${stone(14)}'/>`;
    out += `<rect x='${(ux + 6 * scale).toFixed(0)}' y='${(188 - h - 12).toFixed(0)}' width='${(20 * scale).toFixed(0)}' height='${(10 * scale).toFixed(0)}' rx='3' fill='${stone(18)}'/>`;
  }

  // a toppled column, broken into drums
  const cx = 760;
  for (let i = 0; i < 4; i++) {
    const y = 150 + (r() - 0.5) * 8;
    out += `<rect x='${(cx + i * 52).toFixed(0)}' y='${y.toFixed(0)}' width='48' height='38' rx='5' fill='${stone(11 + r() * 4)}'/>`;
    out += `<rect x='${(cx + i * 52).toFixed(0)}' y='${y.toFixed(0)}' width='48' height='4' rx='2' fill='${stone(19)}' opacity='0.7'/>`;
  }
  out += `<path d='M${cx - 30} 188 h250 v6 h-250 z' fill='${stone(7, 26)}'/>`;

  // bones, and one skull, half buried
  const bx = 1010;
  out += `<ellipse cx='${bx}' cy='176' rx='17' ry='14' fill='${bone(58)}' opacity='0.72'/>`;
  out += `<ellipse cx='${bx - 6}' cy='174' rx='4' ry='5' fill='${stone(4, 28)}' opacity='0.8'/>`;
  out += `<ellipse cx='${bx + 6}' cy='174' rx='4' ry='5' fill='${stone(4, 28)}' opacity='0.8'/>`;
  for (let i = 0; i < 5; i++) {
    const x = bx + 26 + r() * 90;
    const y = 172 + r() * 16;
    const len = 18 + r() * 22;
    out += `<path d='M${x.toFixed(0)} ${y.toFixed(0)} l${len.toFixed(0)} ${(r() * 8 - 4).toFixed(0)}' stroke='${bone(56)}' stroke-width='4' stroke-linecap='round' opacity='0.6'/>`;
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
