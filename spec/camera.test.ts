// The camera's one promise, asserted rather than eyeballed: while it has room
// to give, the boulder is in frame. The fixed scale it replaced lost the rock
// about two seconds into a decent run, which takes the pressure out of a game
// whose entire subject is something gaining on you.

import { describe, expect, it } from "vitest";
import { ZOOM_FAR, ZOOM_NEAR, furthestVisible, zoomFor } from "../src/camera";

/** A desktop frame, at the scale main.ts works out for it. */
const FRAME = { width: 1920, pxPerChar: 103, boulderSize: 294 };

/** Where the rock's near edge lands on screen, relative to the runner. */
function onScreen(lead: number): number {
  const z = zoomFor(lead, FRAME);
  return (lead * FRAME.pxPerChar + FRAME.boulderSize * 0.7) * z;
}

describe("the camera", () => {
  it("gives ground as the gap opens", () => {
    const zooms = [0, 4, 8, 12, 16, 20].map((lead) => zoomFor(lead, FRAME));
    for (let i = 1; i < zooms.length; i++) {
      expect(zooms[i]).toBeLessThanOrEqual(zooms[i - 1]);
    }
  });

  it("stays inside its limits at any gap", () => {
    for (const lead of [0, 1, 5, 20, 100, 1000]) {
      const z = zoomFor(lead, FRAME);
      expect(z).toBeLessThanOrEqual(ZOOM_NEAR);
      expect(z).toBeGreaterThanOrEqual(ZOOM_FAR);
    }
  });

  it("keeps the boulder in frame for every gap it can", () => {
    // The promise. Half a frame is what there is behind the runner; while the
    // camera is not clamped, the rock has to fit in it.
    const half = FRAME.width / 2;
    for (let lead = 0; lead <= furthestVisible(FRAME); lead += 0.5) {
      expect(onScreen(lead), `lead ${lead}`).toBeLessThanOrEqual(half);
    }
  });

  it("holds the rock most of three times longer than a fixed camera would", () => {
    // What the change actually bought, in the unit that matters: 7 characters
    // of lead before the rock was gone, against 20 now. At 60 wpm that is the
    // difference between losing sight of it after a second and after twelve.
    const fixed = (FRAME.width / 2 - FRAME.boulderSize * 0.7) / FRAME.pxPerChar;
    expect(furthestVisible(FRAME)).toBeGreaterThan(fixed * 2.5);
  });

  it("is closest when the rock is on top of him", () => {
    expect(zoomFor(0, FRAME)).toBe(ZOOM_NEAR);
  });

  it("does not blow up on a phone-sized frame", () => {
    const phone = { width: 390, pxPerChar: 21, boulderSize: 101 };
    for (const lead of [0, 4, 40]) {
      const z = zoomFor(lead, phone);
      expect(Number.isFinite(z)).toBe(true);
      expect(z).toBeGreaterThanOrEqual(ZOOM_FAR);
    }
  });
});
