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
/** A runner's elbow sits at a right angle and stays there — it is the arm's
 *  resting shape, not part of the swing. Only the shoulder swings. */
const ELBOW = 90;
const ELBOW_PLAY = 7;
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
  const foreArm = -(ELBOW + ELBOW_PLAY * swing);

  return { thigh, shin, upperArm, foreArm };
}

/**
 * The set position: crouched, weight forward, back leg loaded, ready to go.
 *
 * Deliberately not `pose(0)`, which stands him upright with his feet together
 * — a figure waiting rather than a figure about to bolt. The opening screen
 * has to carry urgency without a word on it, and a sprinter's crouch under a
 * boulder straining against the wall is most of how it does that.
 */
export function ready(): Pose {
  return {
    bob: 3,
    lean: 24,
    near: { thigh: 26, shin: -78, upperArm: -34, foreArm: -96 },
    far: { thigh: -30, shin: -14, upperArm: 40, foreArm: -84 },
  };
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
 * How to run at a given ground speed: how many steps a second, and how far
 * each one covers.
 *
 * Speed is the input, not the output. The tunnel is one world with one scale —
 * the runner's speed comes from the model, in pixels a second — and the gait's
 * only job is to divide that into steps so the feet match the ground going
 * past. `cadence * stepPx === speed` at every speed, which is what makes "one
 * step, one step's worth of tunnel" true rather than tuned.
 *
 * Cadence is capped: past the cap the surplus goes into stride length, the way
 * a real runner lengthens rather than turning their legs over faster forever.
 */
export const CADENCE_AT_THRESHOLD = 3.5;
export const CADENCE_CAP = 6;

export function gait(speed: number, baseStep: number): { cadence: number; stepPx: number } {
  if (speed <= 0 || baseStep <= 0) return { cadence: 0, stepPx: Math.max(0, baseStep) };
  const cadence = Math.min(CADENCE_CAP, speed / baseStep);
  return { cadence, stepPx: speed / cadence };
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

export type Damped = { readonly value: number; readonly velocity: number };

/**
 * Follow a target that jumps, without inheriting the jump.
 *
 * `ease` above is first order: it moves fastest at the instant the target
 * changes, so a target that arrives in steps — a keystroke count — comes out as
 * a surge per step. Smooth in position, but not in *speed*, and the eye reads
 * speed.
 *
 * This is a critically damped spring, so velocity is carried between frames
 * and cannot jump either. It never overshoots, and it costs one extra number.
 * `smoothTime` is roughly how long it takes to close most of a gap.
 */
export function smoothDamp(
  state: Damped,
  target: number,
  dt: number,
  smoothTime: number,
): Damped {
  const omega = 2 / Math.max(1e-4, smoothTime);
  const x = omega * dt;
  // A cheap, stable stand-in for exp(-x); the cubic keeps it well behaved at
  // the long frame times a background tab hands you.
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const gap = state.value - target;
  const step = (state.velocity + omega * gap) * dt;
  return {
    value: target + (gap + step) * decay,
    velocity: (state.velocity - omega * step) * decay,
  };
}
