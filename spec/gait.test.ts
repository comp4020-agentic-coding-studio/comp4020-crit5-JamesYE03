// Not a spec line — a sensor. The run cycle is the thing that got sent back
// for looking wrong, and "it looks wrong" is exactly the kind of judgement a
// test cannot make. What it *can* pin is the handful of relationships that
// separate running from every other way a stick figure can wave its limbs, so
// that a later change to the maths cannot quietly undo them.

import { describe, expect, it } from "vitest";
import { CADENCE_CAP, ease, gait, pose } from "../src/runner";

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

  it("never bends a knee or an elbow backwards", () => {
    for (const phase of cycle) {
      const p = pose(phase);
      for (const limb of [p.near, p.far]) {
        expect(limb.shin).toBeLessThanOrEqual(0);
        expect(limb.foreArm).toBeLessThanOrEqual(0);
      }
    }
  });

  it("folds the knee most when the leg is behind, and least reaching forward", () => {
    // Heel towards the buttock on the way through, foot reaching out to land.
    const behind = pose((3 * Math.PI) / 2).near.shin;
    const reaching = pose(Math.PI / 2).near.shin;
    expect(behind).toBeLessThan(reaching - 60);
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

describe("gait: cadence is capped, ground speed is not", () => {
  it("turns the legs over faster the faster you type", () => {
    expect(gait(0.5).cadence).toBeLessThan(gait(1).cadence);
    expect(gait(0).cadence).toBe(0);
  });

  it("caps the cadence rather than letting the legs blur", () => {
    expect(gait(4).cadence).toBe(CADENCE_CAP);
  });

  it("puts the speed a capped runner cannot take in cadence into stride", () => {
    // Ground covered is cadence × stride, and it has to stay proportional to
    // typing rate at every speed or the world stops matching the model.
    const speed = (n: number) => {
      const g = gait(n);
      return g.cadence * g.strideScale;
    };
    expect(speed(2) / speed(1)).toBeCloseTo(2, 6);
    expect(speed(4) / speed(1)).toBeCloseTo(4, 6);
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
