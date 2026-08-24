// The run cycle, as maths over one number.
//
// `phase` advances continuously; one full turn is two steps. Everything the
// figure does is a function of it, which is the whole reason the animation can
// speed up and slow down smoothly: CSS keyframes recompute their position when
// you change `animation-duration` mid-flight and visibly jump, whereas a phase
// accumulator just advances slower.
//
// Angles are degrees, positive = forward (the direction he is running).
// `shin` and `foreArm` are relative to the limb above them, because that is
// how the SVG groups are nested.

export type Limb = {
  readonly thigh: number;
  readonly shin: number;
  readonly upperArm: number;
  readonly foreArm: number;
};

export type Pose = {
  /** vertical offset in viewBox units; negative is up */
  readonly bob: number;
  /** how far the torso is pitched forward */
  readonly lean: number;
  /** the leg and arm on the camera side */
  readonly near: Limb;
  /** the far leg and arm, half a cycle behind */
  readonly far: Limb;
};

const THIGH_SWING = 42;
const ARM_SWING = 38;
/** the knee is never quite straight, even reaching forward */
const KNEE_MIN = 16;
/** and folds right up when the heel kicks out behind */
const KNEE_MAX = 98;
const ELBOW_MIN = 52;
const ELBOW_MAX = 34;
const BOB = 4.2;

function limb(phase: number): Limb {
  const swing = Math.sin(phase);

  // Thigh forward at +sin, so the leg is furthest forward a quarter turn in.
  const thigh = THIGH_SWING * swing;

  // Knee flexion peaks with the leg *behind* the body — the heel-to-buttock
  // moment that separates a run from a walk — and nearly straightens as the
  // foot reaches forward to land.
  const fold = 0.5 - 0.5 * swing;
  const shin = -(KNEE_MIN + KNEE_MAX * fold * fold);

  // Arms oppose the leg on the same side; that opposition is what stops a
  // running figure reading as a marching one.
  const upperArm = -ARM_SWING * swing;
  const foreArm = -(ELBOW_MIN + ELBOW_MAX * (0.5 + 0.5 * swing));

  return { thigh, shin, upperArm, foreArm };
}

export function pose(phase: number): Pose {
  return {
    // Two rises per cycle: he is highest at mid-flight, on each side.
    bob: -BOB * Math.abs(Math.sin(phase)),
    lean: 9 + 1.6 * Math.cos(2 * phase),
    near: limb(phase),
    far: limb(phase + Math.PI),
  };
}

/**
 * Steps per second, and how long each step covers, for a typing rate.
 *
 * Cadence is capped: past the cap the extra speed goes into stride length
 * instead, which is what a real runner does and what stops the legs turning
 * into a blur at 90 wpm. Ground speed stays proportional to typing rate either
 * way, so "one step, one step's worth of tunnel" holds at every speed.
 */
export const CADENCE_AT_THRESHOLD = 3.5;
export const CADENCE_CAP = 6;

export function gait(normalisedSpeed: number): { cadence: number; strideScale: number } {
  const wanted = CADENCE_AT_THRESHOLD * Math.max(0, normalisedSpeed);
  const cadence = Math.min(CADENCE_CAP, wanted);
  return { cadence, strideScale: cadence > 0 ? wanted / cadence : 1 };
}

/**
 * Ease a value towards a target at a rate that does not depend on frame rate.
 *
 * Speeding up is quicker than slowing down: he digs in fast and coasts to a
 * stop, so letting go of the keyboard costs ground for a moment before it
 * costs everything.
 */
export function ease(current: number, target: number, dt: number, up = 0.55, down = 0.8): number {
  const tau = target > current ? up : down;
  return current + (target - current) * (1 - Math.exp(-dt / tau));
}
