// Wiring only. The rules live in src/typing.ts and src/chase.ts as pure
// functions, and the gait lives in src/runner.ts, which is why the spec tests
// can play a whole run without a browser and why nothing here decides anything
// about the game.

import { createSound } from "./src/audio";
import {
  DESKTOP,
  PHONE,
  boulderAt,
  leadAt,
  outcome,
  recentCps,
  track,
  type Level,
  type Outcome,
} from "./src/chase";
import { ZOOM_NEAR, zoomFor } from "./src/camera";
import { PASSAGE, opening } from "./src/passage";
import {
  CADENCE_AT_THRESHOLD,
  ease,
  gait,
  pose,
  ready,
  smoothDamp,
  type Damped,
} from "./src/runner";
import {
  ceilingTile,
  floorTile,
  grainTile,
  outsideScene,
  propsTile,
  svgUrl,
  wallTile,
} from "./src/scenery";
import { backspace, isFinished, press, start, type Typing } from "./src/typing";

const el = <T extends Element>(name: string): T => {
  const found = document.querySelector<T>(`[data-${name}]`);
  if (!found) throw new Error(`missing [data-${name}] in index.html`);
  return found;
};

const game = el<HTMLElement>("game");
const stage = el<HTMLElement>("stage");
const world = el<HTMLElement>("world");
const boulder = el<HTMLElement>("boulder");
const boulderSpin = el<SVGGElement>("boulder-spin");
const runner = el<HTMLElement>("runner");
const tracker = el<HTMLElement>("tracker");
const trackerDistance = el<HTMLElement>("tracker-distance");
const exit = el<HTMLElement>("exit");
const outside = el<HTMLElement>("outside");
const daylight = el<HTMLElement>("daylight");
const grain = el<HTMLElement>("grain");
const inner = el<HTMLElement>("passage-inner");
const doneText = el<HTMLElement>("done");
const errorText = el<HTMLElement>("errors");
const restText = el<HTMLElement>("rest");
const caret = el<HTMLElement>("caret");
const capture = el<HTMLInputElement>("capture");
const result = el<HTMLElement>("result");
const verdict = el<HTMLElement>("verdict");
const statWpm = el<HTMLElement>("stat-wpm");
const statAccuracy = el<HTMLElement>("stat-accuracy");
const statSeconds = el<HTMLElement>("stat-seconds");
const again = el<HTMLButtonElement>("again");

// Four bands at four rates, with four tile widths that share no useful factor,
// so the combination drifts and does not visibly repeat inside a run.
const layers = [
  { node: el<HTMLElement>("layer-wall"), tile: wallTile(), parallax: 0.5, width: 1640 },
  { node: el<HTMLElement>("layer-props"), tile: propsTile(), parallax: 0.78, width: 1180 },
  { node: el<HTMLElement>("layer-ceiling"), tile: ceilingTile(), parallax: 0.86, width: 520 },
  { node: el<HTMLElement>("layer-floor"), tile: floorTile(), parallax: 1, width: 460 },
];

for (const layer of layers) {
  layer.node.style.backgroundImage = svgUrl(layer.tile);
  // Pin the tile's rendered width: `scroll()` wraps by exactly this number, so
  // letting `background-size: auto` derive it from the band height would make
  // the world jump once per tile.
  layer.node.style.backgroundSize = `${layer.width}px 100%`;
}
grain.style.backgroundImage = svgUrl(grainTile());
outside.style.backgroundImage = svgUrl(outsideScene());

// Thumbs are slower than ten fingers, so a phone gets a shorter tunnel and a
// slower boulder. Both tunings are asserted against the five-minute line in
// spec/game.test.ts.
const tuning = window.matchMedia("(pointer: coarse)").matches ? PHONE : DESKTOP;
const text = opening(PASSAGE, tuning.sentences);
let level: Level = "normal";
let course = track(text, tuning, level);

const sound = createSound();

/** The grade of the tunnel floor, matching --slope in styles.css. */
const SLOPE = Math.tan((2.4 * Math.PI) / 180);
/** Where the floor sits at the left edge of the frame. */
const GROUND_AT_LEFT = 0.78;
/** How thick his back is, for deciding when the rock has reached it. */
const BODY_HALF = 0.09;
const CRUSH_MS = 420;
/* The finish, in two beats: the island slides in until it fills the frame and
 * freezes, and then he runs out of shot across it. Only after that does the
 * result arrive — the run ends on getting away, not on a number appearing. */
const BURST_SLIDE_MS = 420;
const BURST_RUN_MS = 900;

/** The world runs half again as fast as it first did, at your asking. Paired
 *  with the same multiplier on the cadence in src/runner.ts. */
const PACE = 1.5;

/*
 * One world, one scale.
 *
 * Everything on screen is measured in the model's own unit — characters — times
 * `pxPerChar`. The runner's speed is his typing rate; the boulder's is the
 * constant `thresholdCps`; the floor goes past at the runner's speed because
 * the camera rides with him. Nothing gets its own private scale, which is what
 * stopped the rock spinning faster whenever the typing did.
 *
 * The scale itself is chosen from the geometry: put the boulder just fully
 * inside the left edge at the moment the run begins, and the head start
 * decides everything else. `width / 26` is a floor for narrow screens, where
 * the honest scale would leave the world crawling.
 */
let pxPerChar = 12;
/** how far the runner covers in one stride at the pace the boulder keeps */
let baseStep = 40;

type Phase = "idle" | "running" | "crushing" | "bursting" | "over";

let phase: Phase = "idle";
let typing: Typing = start();
let startedAt = 0;
/** when each correct character landed, in seconds — drives the gait */
let stamps: number[] = [];
let typed = 0;
let mistakes = 0;

/** the run cycle's own clock, in radians; one turn is two steps */
let stride = 0;
/** how far the world has moved past the runner, in pixels */
let travelled = 0;
/** eased typing rate, so the legs have inertia the keyboard does not */
let smoothCps = 0;
/**
 * The runner's position as *drawn*, in characters.
 *
 * `typing.correct` is an integer: it goes up a whole character at a time, and
 * a character is most of a hundred pixels of tunnel. Drawing the gap straight
 * from it made the boulder jerk backwards on every keystroke and creep forward
 * between them — a sawtooth the size of a keystroke. This eases towards it, so
 * the distance between the two of them only ever changes smoothly.
 *
 * The *outcome* still reads `typing.correct`. This is the picture, not the
 * rule, and the two must not be confused: at a hard sprint this lags by around
 * half a character, and at the moment that matters — a lead near zero, typing
 * slow or stopped — it has caught up to exact.
 */
let shownCorrect: Damped = { value: 0, velocity: 0 };
const SHOWN_SMOOTH = 0.16;
/** The camera's pull-back, eased the same way the runner's position is: a zoom
 *  that snapped to each keystroke would be worse than no zoom at all. */
let zoom: Damped = { value: ZOOM_NEAR, velocity: 0 };
const ZOOM_SMOOTH = 0.55;
let burstZoom = ZOOM_NEAR;
let burstOvershoot = 0;

/*
 * Geometry, measured once per layout and never again.
 *
 * Reading `clientWidth` is a layout-flushing read; doing it in the same frame
 * as a style write forces the browser to re-lay-out synchronously, over and
 * over. That thrash was most of what was left of the boulder's stutter — it
 * was not the maths, it was measuring while drawing.
 */
let stageW = 0;
let stageH = 0;
let boulderSize = 0;
let outsideW = 0;
let outsideH = 0;
let runnerH = 0;
/** where the rock has to reach: his back, not the middle of his sprite */
let contactX = 0;
let shownDistance = -1;
/** how far past the runner the rock has rolled during the crush beat */
let crushRoll = 0;
let lastFrame = 0;
let caughtAt = 0;
let burstAt = 0;

// ------------------------------------------------------------------ render

function paint(): void {
  doneText.textContent = text.slice(0, typing.correct);
  errorText.textContent = typing.errors;
  // The red characters stand *in place of* the ones they got wrong, so the
  // line keeps its length and reads back exactly what was typed.
  restText.textContent = text.slice(typing.correct + typing.errors.length);
  scrollToCaret();
}

/** Keep the line being typed at the top of the band, with the next lines
 *  visible below it to read ahead into. */
function scrollToCaret(): void {
  const lineHeight = parseFloat(getComputedStyle(inner).lineHeight);
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;
  const offset = caret.getBoundingClientRect().top - inner.getBoundingClientRect().top;
  const line = Math.max(0, Math.floor(offset / lineHeight));
  inner.style.transform = `translateY(${-line * lineHeight}px)`;
}

/** The floor's height at a given distance across the frame. */
function groundAt(x: number, height: number): number {
  return GROUND_AT_LEFT * height + x * SLOPE;
}

// The skeleton, looked up once. Nine joints times sixty frames is not the
// place to be calling querySelector.
const bobGroup = el<SVGGElement>("bob");
const torsoGroup = el<SVGGElement>("torso");
const joints = (["near", "far"] as const).map((side) => ({
  side,
  leg: el<SVGGElement>(`leg-${side}`),
  shin: el<SVGGElement>(`shin-${side}`),
  arm: el<SVGGElement>(`arm-${side}`),
  fore: el<SVGGElement>(`fore-${side}`),
}));

/** Setting the SVG `transform` attribute keeps each rotation centre in its own
 *  local coordinates, so the nested knee and elbow compose correctly with the
 *  joints above them. */
const turn = (node: SVGGElement, degrees: number, cx: number, cy: number): void => {
  node.setAttribute("transform", `rotate(${degrees.toFixed(2)} ${cx} ${cy})`);
};

function drawRunner(p = pose(stride)): void {
  bobGroup.setAttribute("transform", `translate(0 ${p.bob.toFixed(2)})`);
  turn(torsoGroup, p.lean, 48, 74);

  for (const joint of joints) {
    const limb = joint.side === "near" ? p.near : p.far;
    turn(joint.leg, limb.thigh, 48, 74);
    turn(joint.shin, limb.shin, 48, 98);
    turn(joint.arm, limb.upperArm, 50, 46);
    turn(joint.fore, limb.foreArm, 50, 64);
  }
}

/**
 * Put the boulder where its lead says it is — by its **leading edge**, not its
 * centre. The rock is a metre wide on screen; anchoring it by the middle meant
 * it had swallowed the runner whole before the model called it, which is a
 * lie the player can see.
 */
/**
 * Where the tunnel ends and the island begins.
 *
 * The mouth stands at the distance the passage is long, drawn at the same
 * scale as everything else, so it arrives as the last character lands — the
 * finish line is the passage, not a separate rule. `GROUND_IN_SCENE` is where
 * the beach sits inside the drawing, and the vertical offset lines that up
 * with the tunnel floor at the join, so the sand carries straight on from the
 * flagstones.
 */
const GROUND_IN_SCENE = 0.6;

function placeOutside(shown: number): void {
  const x = contactX + (course.chars - shown) * pxPerChar;
  if (x > stageW) {
    outside.style.visibility = "hidden";
    return;
  }
  outside.style.visibility = "visible";
  const y = groundAt(x, stageH) - GROUND_IN_SCENE * outsideH;
  outside.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
}

function place(lead: number): void {
  const edgeX = contactX - lead * pxPerChar + crushRoll;
  const centreX = edgeX - boulderSize / 2;

  if (edgeX < -boulderSize * 0.15) {
    boulder.style.visibility = "hidden";
    tracker.dataset.visible = "";
    // Only when the number actually changes: a DOM text write every frame is
    // a repaint every frame, for a digit that moves twice a second.
    const metres = Math.max(0, Math.round(lead));
    if (metres !== shownDistance) {
      shownDistance = metres;
      trackerDistance.textContent = String(metres);
    }
    return;
  }

  boulder.style.visibility = "visible";
  delete tracker.dataset.visible;
  shownDistance = -1;
  // `transform`, not `left`/`top`: this element moves every frame, and only
  // transform and opacity get there without a layout and a paint.
  const y = groundAt(centreX, stageH) - boulderSize * 0.93;
  // translate places the element's own top-left, so offset by half its width
  // to put its centre where the maths says.
  const leftX = centreX - boulderSize / 2;
  boulder.style.transform = `translate3d(${leftX.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
}

/** The geometry the camera reasons about, gathered from the cached layout. */
const cameraFrame = () => ({ width: stageW, pxPerChar, boulderSize });

function layout(): void {
  stageH = stage.clientHeight;
  stageW = stage.clientWidth;
  runnerH = Math.min(200, Math.max(80, stageH * 0.27));
  boulderSize = Math.min(300, Math.max(92, Math.min(stageH * 0.4, stageW * 0.26)));
  // Wide and tall enough that once its left edge has passed the runner it
  // covers everything, and its ground line can be lined up with the tunnel's.
  // Big enough to still cover the frame with the camera pulled all the way
  // back, since it is what stands between the player and a scrolling corridor
  // once they are through the mouth.
  outsideW = Math.max(stageW * 2.6, stageH * 3.4);
  outsideH = stageH * 2.4;
  outside.style.setProperty("--outside-width", `${outsideW}px`);
  outside.style.setProperty("--outside-height", `${outsideH}px`);
  contactX = stageW / 2 - runnerH * (100 / 130) * BODY_HALF;

  runner.style.setProperty("--runner-size", `${runnerH}px`);
  runner.style.setProperty(
    "--runner-y",
    `${(groundAt(stageW / 2, stageH) - runnerH * 0.96).toFixed(1)}px`,
  );
  boulder.style.setProperty("--boulder-size", `${boulderSize}px`);
  tracker.style.setProperty("--tracker-y", `${(groundAt(0, stageH) - boulderSize * 0.5).toFixed(1)}px`);
  game.style.setProperty("--ground-y", `${(GROUND_AT_LEFT * stageH).toFixed(1)}px`);

  // The bands have to reach past the frame on both sides once the camera pulls
  // back, and the pivot has to stay at the frame's left edge so widening them
  // does not move where the slope begins.
  // Enough overhang to cover the frame with the camera most of the way back.
  // Not all the way: at full pull-back the outermost strip is under the
  // vignette anyway, and a band four times the width of the screen is a lot of
  // texture for a browser to hold.
  const pad = stageW * 0.85;
  game.style.setProperty("--layer-left", `${-pad.toFixed(1)}px`);
  game.style.setProperty("--layer-width", `${(stageW + pad * 2 + 1640).toFixed(1)}px`);
  game.style.setProperty("--layer-origin", `${pad.toFixed(1)}px`);

  // Fix the scale so that at the head start the whole rock is just inside the
  // frame, then let that decide how fast the tunnel goes past.
  const startEdge = boulderSize + stageW * 0.03;
  pxPerChar = Math.max(
    (contactX - startEdge) / course.headStartChars,
    (stageW / 28) * PACE,
  );
  // At the pace the boulder keeps, he runs at CADENCE_AT_THRESHOLD steps a
  // second; faster typing lengthens the stride once the cap is reached.
  baseStep = (course.thresholdCps * pxPerChar) / CADENCE_AT_THRESHOLD;
}

function scroll(): void {
  for (const layer of layers) {
    const x = (travelled * layer.parallax) % layer.width;
    layer.node.style.transform = `rotate(var(--slope)) translate3d(${-x.toFixed(1)}px, 0, 0)`;
  }
}

// -------------------------------------------------------------------- loop

function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, lastFrame ? (now - lastFrame) / 1000 : 0);
  lastFrame = now;

  if (phase === "running") {
    const seconds = (now - startedAt) / 1000;
    const finished = isFinished(typing, text);
    const verdictNow = outcome(course, typing.correct, seconds, finished);

    // The camera eases; the rock does not. Smoothing here is a camera choice,
    // and it is the only thing in the loop that is smoothed.
    smoothCps = ease(smoothCps, recentCps(stamps, seconds, 1.2), dt);
    shownCorrect = smoothDamp(shownCorrect, typing.correct, dt, SHOWN_SMOOTH);
    const lead = Math.max(0, leadAt(course, shownCorrect.value, seconds));
    zoom = smoothDamp(zoom, zoomFor(lead, cameraFrame()), dt, ZOOM_SMOOTH);
    world.style.transform = `scale(${zoom.value.toFixed(4)})`;
    advance(dt, seconds);
    place(lead);
    placeOutside(shownCorrect.value);
    light(shownCorrect.value / course.chars);

    if (verdictNow === "escaped") burst(seconds);
    else if (verdictNow === "caught") crush(seconds);
    return;
  }

  if (phase === "bursting") {
    const t = now - burstAt;
    const at = (burstAt - startedAt) / 1000;

    if (t < BURST_SLIDE_MS) {
      // Beat one: the island slides the rest of the way in, until the tunnel
      // is off the back of the frame entirely.
      const p = t / BURST_SLIDE_MS;
      shownCorrect = { value: course.chars + p * burstOvershoot, velocity: 0 };
      advance(dt, at);
      placeOutside(shownCorrect.value);
      return;
    }

    // Beat two: the island is a still background now, and he runs across it
    // and out of shot on his own legs.
    const p = Math.min(1, (t - BURST_SLIDE_MS) / BURST_RUN_MS);
    const away = stageW / 2 / burstZoom + runnerH;
    runner.style.setProperty("--runner-x", `${(p * away).toFixed(1)}px`);
    stride += Math.PI * gait(away / (BURST_RUN_MS / 1000), baseStep).cadence * dt;
    drawRunner();
    if (p >= 1) end("escaped", at);
    return;
  }

  if (phase === "crushing") {
    // He is down, so the camera stops with him — but the boulder has never
    // taken any notice of him and does not start now. It rolls on at the same
    // speed it has held all run, straight over the top.
    const done = Math.min(1, (now - caughtAt) / CRUSH_MS);
    const seconds = (caughtAt - startedAt) / 1000 + (done * CRUSH_MS) / 1000;
    crushRoll = done * (CRUSH_MS / 1000) * course.thresholdCps * pxPerChar;
    rollBoulder(seconds);
    place(0);
    if (done >= 1) end("caught", (caughtAt - startedAt) / 1000);
  }
}

/** The tunnel starts grim and ends in daylight. Two overlays, both moving
 *  nothing but their own opacity. */
function light(progress: number): void {
  // squared, so it stays properly dark for most of the run and the light
  // arrives as an event rather than as a slow fade from the first keystroke
  const day = Math.min(1, Math.max(0, progress)) ** 2;
  daylight.style.setProperty("--daylight", day.toFixed(3));
  stage.style.setProperty("--daylight", day.toFixed(3));
  exit.style.setProperty("--glow", (0.08 + 0.8 * day).toFixed(3));
}

/**
 * Move the runner and the world he is running over.
 *
 * Both come from the same speed, so a step always covers a step's worth of
 * tunnel, and both stop when he stops typing. The boulder is not in here.
 */
function advance(dt: number, seconds: number): void {
  const speed = smoothCps * pxPerChar;
  const { cadence, stepPx } = gait(speed, baseStep);
  stride += Math.PI * cadence * dt;
  travelled += cadence * stepPx * dt;
  drawRunner();
  scroll();
  rollBoulder(seconds);
}

/**
 * Turn the boulder by how far *it* has come, which is a straight line in time
 * and has nothing to do with the runner.
 *
 * Getting this from the world scroll was the bug: the rock sped up and slowed
 * down with the typing, as though it were being pushed rather than falling.
 */
function rollBoulder(seconds: number): void {
  const radius = Math.max(1, boulderSize / 2);
  const rolled = (boulderAt(course, seconds) + course.headStartChars) * pxPerChar;
  boulderSpin.style.transform = `rotate(${((rolled / radius) * (180 / Math.PI)).toFixed(1)}deg)`;
}

// ------------------------------------------------------------------- input

function begin(): void {
  phase = "running";
  startedAt = performance.now();
  stamps = [];
  game.dataset.state = "running";
  sound.wake();
  sound.startMusic();
  sound.warmStings();
}

function onCharacter(char: string): void {
  if (phase === "crushing" || phase === "bursting") return;
  if (phase === "over") {
    reset();
    return;
  }
  if (phase === "idle") begin();

  const before = typing;
  typing = press(before, char, text);
  if (typing === before) return; // ignored: finished, or past the mistake cap

  typed++;
  const correct = typing.correct > before.correct;
  if (correct) stamps.push((performance.now() - startedAt) / 1000);
  else mistakes++;
  sound.key(correct);
  paint();
}

function onBackspace(): void {
  if (phase === "crushing" || phase === "bursting") return;
  if (phase === "over") {
    reset();
    return;
  }
  if (phase === "idle") return;
  typing = backspace(typing);
  paint();
}

/** Out: hold the result back while the island settles and he clears the shot. */
function burst(seconds: number): void {
  phase = "bursting";
  burstAt = startedAt + seconds * 1000;
  game.dataset.state = "bursting";
  // Freeze the camera here: the two beats below both depend on the scale, and
  // a zoom still drifting underneath them would fight the framing.
  burstZoom = zoom.value;
  // Far enough for the island's left edge to clear the left of the frame.
  const covered = stageW / 2 - stageW / (2 * burstZoom);
  burstOvershoot = Math.max(2, (contactX - covered) / pxPerChar + 1);
  // He is past it and it is behind the island anyway.
  boulder.style.visibility = "hidden";
  delete tracker.dataset.visible;
}

/** Caught: freeze the model, let the rock roll over him, then say so. */
function crush(seconds: number): void {
  phase = "crushing";
  caughtAt = startedAt + seconds * 1000;
  crushRoll = 0;
  game.dataset.state = "crushing";
  sound.sting("caught");
}

function end(what: Outcome, seconds: number): void {
  if (what === "running") return;
  phase = "over";
  game.dataset.state = "over";
  game.dataset.outcome = what;

  verdict.textContent = what === "escaped" ? "ESCAPED" : "CRUSHED";
  statWpm.textContent = String(Math.round(typing.correct / 5 / (seconds / 60)));
  statAccuracy.textContent = String(
    typed === 0 ? 0 : Math.round(((typed - mistakes) / typed) * 100),
  );
  statSeconds.textContent = seconds.toFixed(1);
  result.hidden = false;
  if (what === "escaped") sound.sting("escaped");
}

function reset(): void {
  phase = "idle";
  typing = start();
  stamps = [];
  typed = 0;
  mistakes = 0;
  stride = 0;
  smoothCps = 0;
  shownCorrect = { value: 0, velocity: 0 };
  zoom = { value: ZOOM_NEAR, velocity: 0 };
  crushRoll = 0;
  shownDistance = -1;
  game.dataset.state = "idle";
  delete game.dataset.outcome;
  result.hidden = true;
  sound.stopMusic();
  boulderSpin.style.transform = "";
  boulder.style.visibility = "visible";
  runner.style.setProperty("--runner-x", "0px");
  world.style.transform = `scale(${ZOOM_NEAR})`;
  layout();
  // scroll() was only ever called from advance(), so at rest the layers never
  // received their rotation and the opening screen showed a level tunnel.
  scroll();
  drawRunner(ready());
  place(course.headStartChars);
  placeOutside(0);
  light(0);
  paint();
}

const printable = (event: KeyboardEvent): boolean =>
  event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

// A physical keyboard reports the key here, and preventDefault keeps it out of
// the capture input — so `beforeinput` below never sees it twice.
window.addEventListener("keydown", (event) => {
  if (event.key === "Backspace") {
    event.preventDefault();
    onBackspace();
  } else if (printable(event)) {
    event.preventDefault();
    onCharacter(event.key);
  }
});

// A soft keyboard often reports no usable key at all (Android sends
// "Unidentified"), so the text it inserts is the only signal. preventDefault
// keeps the field empty; the zero-width filler is what gives its backspace
// something to delete so the event fires at all.
const FILLER = "\u200b\u200b\u200b\u200b";
capture.value = FILLER;

capture.addEventListener("beforeinput", (event) => {
  event.preventDefault();
  const { inputType, data } = event as InputEvent;
  if (inputType.startsWith("delete")) onBackspace();
  else if (data) for (const char of data) onCharacter(char);
});

capture.addEventListener("input", () => {
  capture.value = FILLER;
  capture.setSelectionRange(FILLER.length, FILLER.length);
});

// Focusing has to happen inside the gesture or a phone will not raise its
// keyboard.
document.addEventListener("pointerdown", () => {
  capture.focus({ preventScroll: true });
  capture.setSelectionRange(FILLER.length, FILLER.length);
});

again.addEventListener("click", () => {
  reset();
  capture.focus({ preventScroll: true });
});

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-level]")) {
  button.addEventListener("click", () => {
    const chosen = button.dataset.level as Level;
    if (chosen === level) return;
    level = chosen;
    course = track(text, tuning, level);
    for (const other of document.querySelectorAll<HTMLButtonElement>("[data-level]")) {
      other.setAttribute("aria-pressed", String(other.dataset.level === level));
    }
    // The pace is baked into the scale and the stride, so both have to be
    // worked out again before anything is drawn at the new setting.
    reset();
  });
}

window.addEventListener("resize", () => {
  layout();
  scroll();
  scrollToCaret();
  if (phase !== "running") place(course.headStartChars);
});

reset();
requestAnimationFrame(frame);
