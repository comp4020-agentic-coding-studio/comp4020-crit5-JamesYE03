// The week's published spec, as tests. These answer C5 "A game" and retire
// with it; `invariants.test.ts` next to them is the part that carries forward.
//
// Two spec lines are mechanically checkable and both are here:
//
//   "it can be lost: a wrong move is possible, and play ends somewhere —
//    a win, a loss or a finish"
//   "a stranger can pick it up and reach an ending inside five minutes"
//
// The third checkable one — "no instructions anywhere" — is asserted against
// the built page in `no-instructions.test.ts`.

import { describe, expect, it } from "vitest";
import {
  DESKTOP,
  PHONE,
  boulderAt,
  leadAt,
  outcome,
  recentCps,
  simulate,
  track,
} from "../src/chase";
import {
  MAX_PENDING_ERRORS,
  backspace,
  isFinished,
  press,
  start,
} from "../src/typing";
import { PASSAGE, opening } from "../src/passage";

const DESKTOP_TRACK = track(PASSAGE, DESKTOP);
const PHONE_TRACK = track(opening(PASSAGE, PHONE.sentences), PHONE);

/** A player who types steadily at `cps`, forever. */
const steady = (cps: number) => () => cps;

describe("spec: a wrong move is possible", () => {
  const target = "boulder";

  it("a correct key is ground gained", () => {
    expect(press(start(), "b", target).correct).toBe(1);
  });

  it("a wrong key gains nothing and goes on the record", () => {
    const state = press(start(), "x", target);
    expect(state.correct).toBe(0);
    expect(state.errors).toBe("x");
  });

  it("a mistake earns no ground until every red character is cleared", () => {
    // The worked example the game is built around: typing "Thign" for "Thing"
    // leaves "Thi" committed and "gn" in red. Note the "n" — once you are in
    // the wrong, even a letter that appears in the word goes on the pile,
    // because you are no longer where you think you are.
    //
    // This is the whole punishment for a mistake: not a penalty bolted on,
    // just a runner who stops covering distance while the boulder does not.
    const word = "Thing";
    let state = start();
    for (const key of "Thign") state = press(state, key, word);
    expect(state).toEqual({ correct: 3, errors: "gn" });

    state = backspace(state);
    state = press(state, "n", word); // still blocked: "g" is still red
    expect(state).toEqual({ correct: 3, errors: "gn" });

    state = backspace(backspace(state));
    for (const key of "ng") state = press(state, key, word);
    expect(state).toEqual({ correct: 5, errors: "" });
    expect(isFinished(state, word)).toBe(true);
  });

  it("backspace clears mistakes newest first", () => {
    let state = press(press(start(), "x", target), "y", target);
    expect(state.errors).toBe("xy");
    state = backspace(state);
    expect(state.errors).toBe("x");
  });

  it("backspace cannot un-run ground already covered", () => {
    const state = backspace(press(start(), "b", target));
    expect(state.correct).toBe(1);
    expect(state.errors).toBe("");
  });

  it("stops recording mistakes before they overflow the line", () => {
    let state = start();
    for (let i = 0; i < MAX_PENDING_ERRORS * 3; i++) state = press(state, "x", target);
    expect(state.errors.length).toBe(MAX_PENDING_ERRORS);
  });

  it("is finished only when the passage is clean to the end", () => {
    let state = start();
    for (const key of target) state = press(state, key, target);
    expect(isFinished(state, target)).toBe(true);
    expect(isFinished(press(state, "!", target), target)).toBe(true);
  });
});

describe("spec: play ends somewhere", () => {
  it("standing still gets you crushed", () => {
    const run = simulate(DESKTOP_TRACK, steady(0));
    expect(run.outcome).toBe("caught");
    expect(run.seconds).toBeLessThan(15);
  });

  it("typing below the threshold gets you crushed part-way down the tunnel", () => {
    const run = simulate(DESKTOP_TRACK, steady(2.5)); // about 30 wpm
    expect(run.outcome).toBe("caught");
    expect(run.correct).toBeGreaterThan(0);
    expect(run.correct).toBeLessThan(DESKTOP_TRACK.chars);
  });

  it("typing above the threshold gets you out", () => {
    const run = simulate(DESKTOP_TRACK, steady(5)); // about 60 wpm
    expect(run.outcome).toBe("escaped");
    expect(run.correct).toBe(DESKTOP_TRACK.chars);
  });

  it("a long enough stall is fatal even to a fast typist", () => {
    // Pairs with "a mistake earns no ground until it is cleared" above: a
    // mistake left on screen *is* a stall, and this is what a stall costs.
    const run = simulate(DESKTOP_TRACK, (s) => (s > 40 && s < 65 ? 0 : 5));
    expect(run.outcome).toBe("caught");
  });

  it("the run is still winnable after a short stumble", () => {
    const run = simulate(DESKTOP_TRACK, (s) => (s > 40 && s < 45 ? 0 : 5));
    expect(run.outcome).toBe("escaped");
  });
});

describe("spec: the boulder is what catches you", () => {
  // Guards against the test above passing for the wrong reason. A chase test
  // that would still be green with the boulder standing still is a test of
  // nothing; break the boulder on purpose and the outcome has to change.

  it("the boulder starts behind the runner and keeps closing", () => {
    expect(boulderAt(DESKTOP_TRACK, 0)).toBe(-DESKTOP.headStartChars);
    expect(boulderAt(DESKTOP_TRACK, 10)).toBeGreaterThan(boulderAt(DESKTOP_TRACK, 0));
    expect(boulderAt(DESKTOP_TRACK, 20)).toBeGreaterThan(boulderAt(DESKTOP_TRACK, 10));
  });

  it("a stationary boulder catches nobody", () => {
    const stalled = { ...DESKTOP_TRACK, thresholdCps: 0 };
    expect(simulate(stalled, steady(2.5)).outcome).toBe("escaped");
    expect(simulate(stalled, steady(0), { limit: 60 }).outcome).toBe("running");
  });

  it("the lead is the distance between the two of them", () => {
    expect(leadAt(DESKTOP_TRACK, 0, 0)).toBe(DESKTOP.headStartChars);
    expect(outcome(DESKTOP_TRACK, 0, 0, false)).toBe("running");
    expect(outcome(DESKTOP_TRACK, 0, 100, false)).toBe("caught");
  });
});

describe("spec: a stranger reaches an ending inside five minutes", () => {
  const FIVE_MINUTES = 300;

  it("the slowest player who survives is still out in time", () => {
    // Anyone slower than this is caught, and being caught is an ending too —
    // so this is the longest a run can possibly last.
    for (const t of [DESKTOP_TRACK, PHONE_TRACK]) {
      const run = simulate(t, steady(t.thresholdCps + 0.01));
      expect(run.outcome).toBe("escaped");
      expect(run.seconds).toBeLessThan(FIVE_MINUTES);
    }
  });

  it("the phone tunnel is shorter than the desktop one", () => {
    expect(PHONE_TRACK.chars).toBeLessThan(DESKTOP_TRACK.chars);
    expect(PHONE_TRACK.chars).toBeGreaterThan(0);
    expect(opening(PASSAGE, PHONE.sentences)).toBe(PASSAGE.slice(0, PHONE_TRACK.chars));
  });
});

describe("the runner's legs answer the last two seconds, not the whole run", () => {
  it("counts only recent keystrokes", () => {
    const stamps = [0, 1, 9.5, 9.8, 10];
    expect(recentCps(stamps, 10, 2)).toBe(1.5);
    expect(recentCps([], 10, 2)).toBe(0);
  });
});
