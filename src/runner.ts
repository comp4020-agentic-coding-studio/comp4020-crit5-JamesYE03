// The run cycle, as maths over one number.
//
// `phase` advances continuously; one full turn is two steps. Everything the
// figure does is a function of it, which is the whole reason the animation can
// speed up and slow down smoothly: CSS keyframes recompute their position when
// you change `animation-duration` mid-flight and visibly jump, whereas a phase
// accumulator just advances slower.
//
// Angles are degrees and go straight into an SVG `rotate()`, which turns
// **clockwise**. He runs to the right, so for a limb hanging downwards a
// positive angle swings it *backwards* and a negative one swings it forwards.
// That is the opposite of what reads naturally, and getting it wrong is how
// the knees ended up folding the wrong way for three rounds: the fold was tied
// to the same sine as the thigh, so the heel kicked up while the leg was
// reaching forward — a prance, not a run.
//
// Everything below is therefore written in terms of `forward`, +1 when the
// limb is reaching ahead, and converted once, at the end.
//
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
  /** +1 with the leg reaching ahead, -1 with it trailing behind. */
  const forward = Math.sin(phase);

  // Knee flexion peaks with the leg *behind* — heel towards the buttock, the
  // moment that separates a run from a walk — and nearly straightens as the
  // foot reaches out to land. Folding takes the foot backwards, so it is a
  // positive rotation.
  const fold = 0.5 - 0.5 * forward;
  const shin = KNEE_MIN + KNEE_MAX * fold * fold;

  return {
    thigh: -THIGH_SWING * forward,
    shin,
    // Arms oppose the leg on the same side; that opposition is what stops a
    // running figure reading as a marching one.
    upperArm: ARM_SWING * forward,
    // The elbow is held at a right angle and the hand carried forwards, which
    // is a negative rotation.
    foreArm: -(ELBOW + ELBOW_PLAY * forward),
  };
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
    // near leg forward and folded under him, far leg back and loaded
    near: { thigh: -26, shin: 74, upperArm: 34, foreArm: -96 },
    far: { thigh: 30, shin: 20, upperArm: -40, foreArm: -84 },
  };
}

/**
 * Out, and knowing it: both arms thrown up, chest open, up on his toes.
 *
 * `progress` runs 0 to 1 across the celebration — the arms come up over the
 * first third and then he punches the air twice, because a held pose reads as
 * a screenshot and this is the one moment the run has been about.
 */
export function cheer(progress: number): Pose {
  const p = Math.min(1, Math.max(0, progress));
  const raise = Math.min(1, p / 0.32);
  const pump = p > 0.32 ? Math.sin((p - 0.32) * Math.PI * 3.4) * 11 : 0;
  const hop = -Math.abs(Math.sin(p * Math.PI * 2.2)) * 7;
  const elbow = -(74 - 62 * raise);

  return {
    bob: hop,
    lean: 9 - 17 * raise,
    // a V overhead: one arm swung up in front, the other up behind
    near: { thigh: -13, shin: 10, upperArm: -150 * raise - pump, foreArm: elbow },
    far: { thigh: 13, shin: 10, upperArm: 150 * raise + pump, foreArm: elbow },
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
 *
 * These are 1.5x what they started at, in step with the same multiplier on the
 * world scale in main.ts — cadence and stride both scale, so the whole thing
 * simply runs half again as fast rather than taking longer strides at the same
 * turnover.
 */
export const CADENCE_AT_THRESHOLD = 5.25;
export const CADENCE_CAP = 9;

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
