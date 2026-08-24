// Wiring only. The rules live in src/typing.ts and src/chase.ts as pure
// functions, which is why the spec tests can play a whole run without a
// browser and why nothing here decides anything about the game.

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
import { backspace, isFinished, press, start, type Typing } from "./src/typing";

const el = <T extends Element>(name: string): T => {
  const found = document.querySelector<T>(`[data-${name}]`);
  if (!found) throw new Error(`missing [data-${name}] in index.html`);
  return found;
};

const game = el<HTMLElement>("game");
const stage = el<HTMLElement>("stage");
const boulder = el<HTMLElement>("boulder");
const tracker = el<HTMLElement>("tracker");
const trackerDistance = el<HTMLElement>("tracker-distance");
const exit = el<HTMLElement>("exit");
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

// Thumbs are slower than ten fingers, so a phone gets a shorter tunnel and a
// slower boulder. Both tunings are asserted against the five-minute line in
// spec/game.test.ts.
const tuning = window.matchMedia("(pointer: coarse)").matches ? PHONE : DESKTOP;
const text = opening(PASSAGE, tuning.sentences);
const course = track(text, tuning);

const sound = createSound();

type Phase = "idle" | "running" | "over";

let phase: Phase = "idle";
let typing: Typing = start();
let startedAt = 0;
/** when each correct character landed, in seconds — drives the run cycle */
let stamps: number[] = [];
let typed = 0;
let mistakes = 0;

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

/**
 * Put the boulder where its lead says it is.
 *
 * The runner never moves on screen — he is always at the middle — so the
 * boulder's position is the only thing that has to be drawn, and it is the
 * lead itself rather than a gauge standing in for it.
 */
function place(lead: number): void {
  const width = stage.clientWidth;
  const pxPerChar = Math.min(15, Math.max(4.5, width / 110));
  const x = width / 2 - lead * pxPerChar;
  const radius = boulder.clientWidth / 2;

  if (x < -radius) {
    // Off the back of the frame: the arrow at the edge carries the distance.
    boulder.style.visibility = "hidden";
    tracker.dataset.visible = "";
    trackerDistance.textContent = String(Math.round(lead));
  } else {
    boulder.style.visibility = "visible";
    delete tracker.dataset.visible;
    boulder.style.setProperty("--boulder-x", `${x}px`);
    // The floor runs downhill, so the boulder sits lower the further right it
    // is — same line the tunnel is drawn along.
    boulder.style.setProperty("--boulder-bottom", `${16 - 8 * (x / width)}%`);
  }
}

function animateSpeed(cps: number): void {
  const norm = cps / course.thresholdCps;
  const still = cps < 0.35;
  game.classList.toggle("is-still", still);
  if (still) return;
  const stride = Math.min(1.5, Math.max(0.2, 0.62 / norm));
  game.style.setProperty("--stride", `${stride.toFixed(3)}s`);
  game.style.setProperty("--scroll", `${(stride * 3.4).toFixed(3)}s`);
}

// -------------------------------------------------------------------- loop

function frame(now: number): void {
  requestAnimationFrame(frame);
  if (phase !== "running") return;

  const seconds = (now - startedAt) / 1000;
  const finished = isFinished(typing, text);
  const verdictNow = outcome(course, typing.correct, seconds, finished);

  place(Math.max(0, leadAt(course, typing.correct, seconds)));
  animateSpeed(recentCps(stamps, seconds));
  exit.style.setProperty("--progress", (typing.correct / course.chars).toFixed(3));

  if (verdictNow !== "running") end(verdictNow, seconds);
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
  if (phase === "over") {
    reset();
    return;
  }
  if (phase === "idle") return;
  typing = backspace(typing);
  paint();
}

function end(what: Outcome, seconds: number): void {
  if (what === "running") return;
  phase = "over";
  game.dataset.state = "over";
  game.dataset.outcome = what;
  game.classList.add("is-still");

  verdict.textContent = what === "escaped" ? "ESCAPED" : "CRUSHED";
  statWpm.textContent = String(Math.round(typing.correct / 5 / (seconds / 60)));
  statAccuracy.textContent = String(
    typed === 0 ? 0 : Math.round(((typed - mistakes) / typed) * 100),
  );
  statSeconds.textContent = seconds.toFixed(1);
  result.hidden = false;
  sound.sting(what);
}

function reset(): void {
  phase = "idle";
  typing = start();
  stamps = [];
  typed = 0;
  mistakes = 0;
  game.dataset.state = "idle";
  delete game.dataset.outcome;
  game.classList.add("is-still");
  result.hidden = true;
  sound.stopMusic();
  place(course.headStartChars);
  exit.style.setProperty("--progress", "0");
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
// keeps the field empty; the zero-width filler below is what gives its
// backspace something to delete so the event fires at all.
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
  scrollToCaret();
  if (phase === "idle") place(course.headStartChars);
});

reset();
requestAnimationFrame(frame);
