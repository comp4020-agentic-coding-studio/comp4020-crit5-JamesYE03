// Not a spec line — a sensor. The run cycle is the thing that got sent back
// for looking wrong, and "it looks wrong" is exactly the kind of judgement a
// test cannot make. What it *can* pin is the handful of relationships that
// separate running from every other way a stick figure can wave its limbs, so
// that a later change to the maths cannot quietly undo them.

import { describe, expect, it } from "vitest";
import {
  CADENCE_CAP,
  cheer,
  ease,
  gait,
  pose,
  ready,
  smoothDamp,
  type Damped,
} from "../src/runner";

const TURN = Math.PI * 2;
/** a cycle sampled finely enough to catch a sign flip anywhere in it */
const cycle = Array.from({ length: 48 }, (_, i) => (i / 48) * TURN);

describe("the run cycle", () => {
  it("keeps the legs half a cycle apart", () => {
    // Both legs forward at once is a bunny hop.
    for (const phase of cycle) {
      const p = pose(phase);
      expect(p.near.thigh).toBeCloseTo(-p.far.thigh, 6);
    }
  });

  it("swings each arm against the leg on its own side", () => {
    // The single strongest cue that a figure is running rather than marching.
    for (const phase of cycle) {
      const p = pose(phase);
      expect(Math.sign(p.near.upperArm)).toBe(-Math.sign(p.near.thigh));
      expect(Math.sign(p.far.upperArm)).toBe(-Math.sign(p.far.thigh));
    }
  });

  it("bends the knee the way a knee bends", () => {
    // SVG rotates clockwise and he runs right, so a knee folding the heel
    // backwards is a *positive* shin angle and the elbow carrying the hand
    // forwards is a negative one. Tying the fold to the same sine as the thigh
    // got this backwards for three rounds and the legs pranced.
    for (const phase of cycle) {
      const p = pose(phase);
      for (const limb of [p.near, p.far]) {
        expect(limb.shin).toBeGreaterThanOrEqual(0);
        expect(limb.foreArm).toBeLessThanOrEqual(0);
      }
    }
  });

  it("folds the knee most when the leg is behind, and least reaching forward", () => {
    // Heel towards the buttock on the way through, foot reaching out to land.
    // Reaching forward is a negative thigh, trailing behind is a positive one.
    const behind = pose((3 * Math.PI) / 2);
    const reaching = pose(Math.PI / 2);
    expect(behind.near.thigh).toBeGreaterThan(0);
    expect(reaching.near.thigh).toBeLessThan(0);
    expect(behind.near.shin).toBeGreaterThan(reaching.near.shin + 60);
  });

  it("rises twice per cycle, once on each foot", () => {
    const heights = cycle.map((phase) => pose(phase).bob);
    const peaks = heights.filter(
      (h, i) => h < heights[(i + 47) % 48] && h < heights[(i + 1) % 48],
    );
    expect(peaks.length).toBe(2);
  });

  it("is continuous across the wrap, so the loop has no hitch in it", () => {
    expect(pose(0).near.thigh).toBeCloseTo(pose(TURN).near.thigh, 6);
    expect(pose(0).bob).toBeCloseTo(pose(TURN).bob, 6);
  });
});

describe("the set position", () => {
  // The opening screen has to say "something is about to happen" with no words
  // on it. A figure standing with its feet together does not.
  const set = ready();

  it("is not the standing pose the cycle happens to start on", () => {
    expect(set.near.thigh).not.toBeCloseTo(pose(0).near.thigh, 1);
    expect(set.lean).toBeGreaterThan(pose(0).lean);
  });

  it("splits the legs, one loaded and one reaching", () => {
    expect(Math.sign(set.near.thigh)).toBe(-Math.sign(set.far.thigh));
  });

  it("keeps the arms opposed to the legs, as in the cycle", () => {
    expect(Math.sign(set.near.upperArm)).toBe(-Math.sign(set.near.thigh));
    expect(Math.sign(set.far.upperArm)).toBe(-Math.sign(set.far.thigh));
  });

  it("bends no joint the wrong way", () => {
    for (const limb of [set.near, set.far]) {
      expect(limb.shin).toBeGreaterThanOrEqual(0);
      expect(limb.foreArm).toBeLessThanOrEqual(0);
    }
  });
});

describe("the celebration", () => {
  it("starts from arms down and ends with them overhead", () => {
    expect(Math.abs(cheer(0).near.upperArm)).toBeLessThan(20);
    expect(Math.abs(cheer(1).near.upperArm)).toBeGreaterThan(120);
    expect(Math.abs(cheer(1).far.upperArm)).toBeGreaterThan(120);
  });

  it("throws the arms up on opposite sides, so they read as a V", () => {
    expect(Math.sign(cheer(1).near.upperArm)).toBe(-Math.sign(cheer(1).far.upperArm));
  });

  it("opens the chest instead of staying hunched over", () => {
    expect(cheer(1).lean).toBeLessThan(pose(0).lean);
  });

  it("bends no joint the wrong way, at any point in it", () => {
    for (let p = 0; p <= 1; p += 0.05) {
      for (const limb of [cheer(p).near, cheer(p).far]) {
        expect(limb.shin).toBeGreaterThanOrEqual(0);
        expect(limb.foreArm).toBeLessThanOrEqual(0);
      }
    }
  });
});

describe("gait: cadence is capped, ground speed is not", () => {
  // A step of 40px at the pace the boulder keeps; the numbers below are
  // multiples of the speed that produces exactly that.
  const STEP = 40;
  const PACE = STEP * 3.5;

  it("turns the legs over faster the faster you type", () => {
    expect(gait(PACE / 2, STEP).cadence).toBeLessThan(gait(PACE, STEP).cadence);
    expect(gait(0, STEP).cadence).toBe(0);
  });

  it("caps the cadence rather than letting the legs blur", () => {
    expect(gait(PACE * 4, STEP).cadence).toBe(CADENCE_CAP);
  });

  it("covers exactly the ground it was given, at every speed", () => {
    // This is the whole contract between the runner and the world: cadence ×
    // stride *is* the speed, so the feet cannot drift against the floor going
    // past — including past the cap, where the stride takes up the slack.
    for (const speed of [PACE / 3, PACE, PACE * 2, PACE * 5]) {
      const g = gait(speed, STEP);
      expect(g.cadence * g.stepPx).toBeCloseTo(speed, 6);
    }
  });

  it("lengthens the stride only once the cadence is capped", () => {
    expect(gait(PACE, STEP).stepPx).toBeCloseTo(STEP, 6);
    expect(gait(PACE * 4, STEP).stepPx).toBeGreaterThan(STEP);
  });
});

describe("following a target that arrives in steps", () => {
  // The boulder's distance is drawn from the runner's position, and the
  // runner's position is a keystroke count: an integer that jumps by a whole
  // character — most of a hundred pixels of tunnel — in one frame. What the
  // eye caught was not the jump in *position*, which a first-order ease
  // already smooths, but the jump in *speed* at each step. These pin the
  // property that fixes it.

  const FRAME = 1 / 60;
  const SMOOTH = 0.16;

  /** Run a target through the follower and return the value each frame. */
  function follow(target: (frame: number) => number, frames: number): number[] {
    let state: Damped = { value: target(0), velocity: 0 };
    const out: number[] = [];
    for (let i = 0; i < frames; i++) {
      state = smoothDamp(state, target(i), FRAME, SMOOTH);
      out.push(state.value);
    }
    return out;
  }

  const speeds = (values: number[]) =>
    values.slice(1).map((v, i) => (v - values[i]) / FRAME);

  it("gets there", () => {
    const values = follow(() => 10, 120);
    expect(values.at(-1)).toBeCloseTo(10, 3);
  });

  it("never overshoots", () => {
    // Critically damped, so it arrives without ringing past the target and
    // back — a boulder that bounced would be worse than one that stepped.
    for (const value of follow(() => 10, 200)) expect(value).toBeLessThanOrEqual(10.0001);
  });

  it("changes speed gradually when the target jumps", () => {
    // The real test. A staircase target — one character every four frames,
    // about 15 characters a second — and the acceleration has to stay bounded
    // instead of spiking on every step.
    const staircase = (frame: number) => Math.floor(frame / 4);
    const rates = speeds(follow(staircase, 240));
    const jerk = rates.slice(1).map((r, i) => Math.abs(r - rates[i]));
    const settled = jerk.slice(60);
    expect(Math.max(...settled)).toBeLessThan(Math.max(...rates) * 0.35);
  });

  it("is smoother in speed than the first-order ease it replaced", () => {
    const staircase = (frame: number) => Math.floor(frame / 4);
    let eased = 0;
    const easedValues: number[] = [];
    for (let i = 0; i < 240; i++) {
      eased = ease(eased, staircase(i), FRAME, SMOOTH, SMOOTH);
      easedValues.push(eased);
    }
    const swing = (values: number[]) => {
      const rates = speeds(values).slice(60);
      return Math.max(...rates) - Math.min(...rates);
    };
    expect(swing(follow(staircase, 240))).toBeLessThan(swing(easedValues));
  });

  it("does not depend on the frame rate", () => {
    let sixty: Damped = { value: 0, velocity: 0 };
    let thirty: Damped = { value: 0, velocity: 0 };
    for (let i = 0; i < 60; i++) sixty = smoothDamp(sixty, 10, 1 / 60, SMOOTH);
    for (let i = 0; i < 30; i++) thirty = smoothDamp(thirty, 10, 1 / 30, SMOOTH);
    expect(sixty.value).toBeCloseTo(thirty.value, 2);
  });
});

describe("gait: the legs have inertia the keyboard does not", () => {
  it("does not stop the instant the typing does", () => {
    // Half a second after the last keystroke he should still be moving.
    let speed = 4;
    for (let i = 0; i < 30; i++) speed = ease(speed, 0, 1 / 60);
    expect(speed).toBeGreaterThan(1.5);
  });

  it("does coast to a stop soon after", () => {
    let speed = 4;
    for (let i = 0; i < 60 * 3; i++) speed = ease(speed, 0, 1 / 60);
    expect(speed).toBeLessThan(0.1);
  });

  it("digs in faster than it coasts", () => {
    let up = 0;
    let down = 4;
    for (let i = 0; i < 30; i++) {
      up = ease(up, 4, 1 / 60);
      down = ease(down, 0, 1 / 60);
    }
    expect(up).toBeGreaterThan(4 - down);
  });

  it("does not depend on the frame rate", () => {
    // Same wall-clock second, very different frame budgets.
    let sixty = 5;
    let thirty = 5;
    for (let i = 0; i < 60; i++) sixty = ease(sixty, 0, 1 / 60);
    for (let i = 0; i < 30; i++) thirty = ease(thirty, 0, 1 / 30);
    expect(sixty).toBeCloseTo(thirty, 3);
  });
});
