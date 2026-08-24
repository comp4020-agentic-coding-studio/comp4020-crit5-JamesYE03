// Wiring only. The rules live in src/typing.ts and src/chase.ts as pure
// functions, and the gait lives in src/runner.ts, which is why the spec tests
// can play a whole run without a browser and why nothing here decides anything
// about the game.

import { createSound } from "./src/audio";
import {
  DESKTOP,
  PHONE,
  leadAt,
  outcome,
  recentCps,
  track,
  type Outcome,
} from "./src/chase";
import { PASSAGE, opening } from "./src/passage";
import { ease, gait, pose } from "./src/runner";
import { ceilingTile, floorTile, grainTile, svgUrl, wallTile } from "./src/scenery";
import { backspace, isFinished, press, start, type Typing } from "./src/typing";

const el = <T extends Element>(name: string): T => {
  const found = document.querySelector<T>(`[data-${name}]`);
  if (!found) throw new Error(`missing [data-${name}] in index.html`);
  return found;
};

const game = el<HTMLElement>("game");
const stage = el<HTMLElement>("stage");
const boulder = el<HTMLElement>("boulder");
const boulderSpin = el<SVGGElement>("boulder-spin");
const runner = el<HTMLElement>("runner");
const tracker = el<HTMLElement>("tracker");
const trackerDistance = el<HTMLElement>("tracker-distance");
const exit = el<HTMLElement>("exit");
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

const layers = [
  { node: el<HTMLElement>("layer-wall"), tile: wallTile(), parallax: 0.55, width: 820 },
  { node: el<HTMLElement>("layer-ceiling"), tile: ceilingTile(), parallax: 0.82, width: 560 },
  { node: el<HTMLElement>("layer-floor"), tile: floorTile(), parallax: 1, width: 340 },
];

for (const layer of layers) {
  layer.node.style.backgroundImage = svgUrl(layer.tile);
  // Pin the tile's rendered width: `scroll()` wraps by exactly this number, so
  // letting `background-size: auto` derive it from the band height would make
  // the world jump once per tile.
  layer.node.style.backgroundSize = `${layer.width}px 100%`;
}
grain.style.backgroundImage = svgUrl(grainTile());

// Thumbs are slower than ten fingers, so a phone gets a shorter tunnel and a
// slower boulder. Both tunings are asserted against the five-minute line in
// spec/game.test.ts.
const tuning = window.matchMedia("(pointer: coarse)").matches ? PHONE : DESKTOP;
const text = opening(PASSAGE, tuning.sentences);
const course = track(text, tuning);

const sound = createSound();

/** The grade of the tunnel floor, matching --slope in styles.css. */
const SLOPE = Math.tan((2.4 * Math.PI) / 180);
/** Where the floor sits at the left edge of the frame. */
const GROUND_AT_LEFT = 0.78;
/** How much tunnel one stride covers, as a multiple of the runner's height. */
const STEP_PER_HEIGHT = 0.82;
/** How thick his back is, for deciding when the rock has reached it. */
const BODY_HALF = 0.09;
const CRUSH_MS = 300;

type Phase = "idle" | "running" | "crushing" | "over";

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
/** how far past the runner the rock has rolled during the crush beat */
let crushRoll = 0;
let lastFrame = 0;
let caughtAt = 0;

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

function drawRunner(): void {
  const p = pose(stride);
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
function place(lead: number): void {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const pxPerChar = Math.min(15, Math.max(4.5, width / 110));
  const size = boulder.clientWidth;
  const runnerX = width / 2;

  // his back, which is what the rock actually has to reach
  const contactX = runnerX - runner.clientWidth * BODY_HALF;
  const edgeX = contactX - lead * pxPerChar + crushRoll;
  const centreX = edgeX - size / 2;

  if (edgeX < -size * 0.15) {
    boulder.style.visibility = "hidden";
    tracker.dataset.visible = "";
    trackerDistance.textContent = String(Math.max(0, Math.round(lead)));
  } else {
    boulder.style.visibility = "visible";
    delete tracker.dataset.visible;
    boulder.style.setProperty("--boulder-x", `${centreX.toFixed(1)}px`);
    boulder.style.setProperty("--boulder-y", `${(groundAt(centreX, height) - size * 0.93).toFixed(1)}px`);
  }
}

function layout(): void {
  const height = stage.clientHeight;
  const width = stage.clientWidth;
  const runnerHeight = Math.min(200, Math.max(80, height * 0.27));
  const boulderSize = Math.min(300, Math.max(96, height * 0.42));

  runner.style.setProperty("--runner-size", `${runnerHeight}px`);
  runner.style.setProperty(
    "--runner-y",
    `${(groundAt(width / 2, height) - runnerHeight * 0.96).toFixed(1)}px`,
  );
  boulder.style.setProperty("--boulder-size", `${boulderSize}px`);
  tracker.style.setProperty("--tracker-y", `${(groundAt(0, height) - boulderSize * 0.5).toFixed(1)}px`);
  game.style.setProperty("--ground-y", `${(GROUND_AT_LEFT * height).toFixed(1)}px`);
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

    smoothCps = ease(smoothCps, recentCps(stamps, seconds, 1.2), dt);
    advance(dt);
    place(Math.max(0, leadAt(course, typing.correct, seconds)));
    exit.style.setProperty("--glow", (0.1 + 0.8 * (typing.correct / course.chars)).toFixed(3));

    if (verdictNow === "escaped") end("escaped", seconds);
    else if (verdictNow === "caught") crush(seconds);
    return;
  }

  if (phase === "crushing") {
    // he is down; the rock keeps going, and the camera keeps up for a beat
    const t = (now - caughtAt) / CRUSH_MS;
    crushRoll = Math.min(1, t) * boulder.clientWidth * 0.8;
    smoothCps = ease(smoothCps, 0, dt, 0.2, 0.2);
    advance(dt);
    place(0);
    if (t >= 1) end("caught", (caughtAt - startedAt) / 1000);
  }
}

/** Move the run cycle and the world by the same amount, so a step always
 *  covers a step's worth of tunnel. */
function advance(dt: number): void {
  const { cadence, strideScale } = gait(smoothCps / course.thresholdCps);
  const stepPx = runner.clientHeight * STEP_PER_HEIGHT * strideScale;
  stride += Math.PI * cadence * dt;
  travelled += cadence * stepPx * dt;
  drawRunner();
  scroll();
  // Rolling without slipping: one turn per circumference of ground covered.
  const radius = Math.max(1, boulder.clientWidth / 2);
  boulderSpin.style.transform = `rotate(${((travelled / radius) * (180 / Math.PI)).toFixed(1)}deg)`;
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
  if (phase === "crushing") return;
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
  if (phase === "crushing") return;
  if (phase === "over") {
    reset();
    return;
  }
  if (phase === "idle") return;
  typing = backspace(typing);
  paint();
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
  crushRoll = 0;
  game.dataset.state = "idle";
  delete game.dataset.outcome;
  result.hidden = true;
  sound.stopMusic();
  boulderSpin.style.transform = "";
  layout();
  drawRunner();
  place(course.headStartChars);
  exit.style.setProperty("--glow", "0.1");
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

window.addEventListener("resize", () => {
  layout();
  scrollToCaret();
  if (phase !== "running") place(course.headStartChars);
});

reset();
requestAnimationFrame(frame);
