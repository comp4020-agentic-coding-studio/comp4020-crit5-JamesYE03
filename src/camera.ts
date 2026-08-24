// How far back the camera stands.
//
// Pure, like the rest of the rules, so the one property that matters can be
// asserted rather than eyeballed: at any gap the camera is not clamped at, the
// boulder is still inside the frame. The first version had no camera at all
// and a fixed scale, and a decent typist lost sight of the rock about two
// seconds in — which takes the pressure out of a game whose whole subject is
// something gaining on you.

/** Closest the camera comes. Below 1 on purpose: the frame shows more tunnel
 *  than it used to even when the rock is right behind him. */
export const ZOOM_NEAR = 0.85;
/** Furthest it pulls back. Past this the runner is a full stop on the screen,
 *  which is a worse problem than losing sight of the boulder. */
export const ZOOM_FAR = 0.38;

/** How much of the half-frame behind the runner the rock may take up before
 *  the camera starts giving ground. */
const ROOM = 0.46;

export type Frame = {
  /** width of the frame, in screen pixels */
  readonly width: number;
  /** the world scale: screen pixels to one character of tunnel */
  readonly pxPerChar: number;
  /** the boulder's drawn diameter, in screen pixels at scale 1 */
  readonly boulderSize: number;
};

/**
 * The scale at which a gap of `lead` characters still fits behind the runner.
 *
 * Solved, not tuned: the rock sits `lead * pxPerChar` behind him and is
 * `boulderSize` across, all of which the camera scales, so the scale that just
 * fits it into `ROOM` of the frame falls straight out.
 */
export function zoomFor(lead: number, frame: Frame): number {
  const needed = Math.max(0, lead) * frame.pxPerChar + frame.boulderSize * 0.7;
  const fit = (frame.width * ROOM) / Math.max(1, needed);
  return Math.min(ZOOM_NEAR, Math.max(ZOOM_FAR, fit));
}

/**
 * The widest gap the camera can still hold in frame before it hits its limit.
 * Only used to reason about the tuning; nothing draws with it.
 */
export function furthestVisible(frame: Frame): number {
  return ((frame.width * ROOM) / ZOOM_FAR - frame.boulderSize * 0.7) / frame.pxPerChar;
}
