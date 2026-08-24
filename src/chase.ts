// The chase, in one unit: characters.
//
// The runner's position is the number of characters typed correctly. The
// boulder rolls at a constant rate, so its position is a straight line in
// time. That makes "typing fast makes you fast" true by construction rather
// than by a fudge factor, and it makes the whole game one number:
// `thresholdCps`, the typing rate at which runner and boulder move as one.

export type Track = {
  /** length of the passage, and so of the tunnel */
  readonly chars: number;
  /** the typing rate, in characters per second, that exactly keeps pace */
  readonly thresholdCps: number;
  /** how far ahead of the boulder the runner starts */
  readonly headStartChars: number;
};

/**
 * The tuning. `thresholdCps` × 12 is roughly the WPM a player needs to
 * survive (five characters to a word, sixty seconds to a minute).
 *
 * These are the numbers to move when the game plays too hard or too easy.
 * Nothing else in the game is a difficulty dial.
 */
/*
 * `headStartChars` is now also a *camera* number, not only a difficulty one.
 * The tunnel is drawn at one scale — so many pixels to the character — and the
 * head start is what sets it: the boulder has to start close enough to be in
 * frame, and that same scale then decides how fast the world goes past. A
 * bigger head start is a gentler game and a slower-looking one.
 *
 * `thresholdCps` has a floor the spec puts there and not me: the slowest
 * player who survives finishes in `chars / thresholdCps` seconds, and that has
 * to come in under the five minutes the spec allows to reach an ending. At 853
 * characters that forbids anything below about 2.85 characters a second, which
 * is why the bar for surviving this passage is around 36 wpm. Shortening the
 * passage is the only lever that lowers it.
 */
export const DESKTOP = { thresholdCps: 3.0, headStartChars: 10, sentences: 10 } as const;
export const PHONE = { thresholdCps: 1.8, headStartChars: 7, sentences: 3 } as const;

export type Tuning = typeof DESKTOP | typeof PHONE;

export function track(passage: string, tuning: Tuning): Track {
  return {
    chars: passage.length,
    thresholdCps: tuning.thresholdCps,
    headStartChars: tuning.headStartChars,
  };
}

/** Where the boulder is, in characters, `seconds` into the run. It starts
 *  behind the runner and closes at a constant rate. */
export function boulderAt(t: Track, seconds: number): number {
  return -t.headStartChars + t.thresholdCps * seconds;
}

/** How far ahead the runner is. Zero means the boulder is on him. */
export function leadAt(t: Track, correct: number, seconds: number): number {
  return correct - boulderAt(t, seconds);
}

export type Outcome = "running" | "escaped" | "caught";

export function outcome(
  t: Track,
  correct: number,
  seconds: number,
  finished: boolean,
): Outcome {
  // Reaching the last character is reaching the exit: if both land in the same
  // frame, the runner is already out.
  if (finished) return "escaped";
  return leadAt(t, correct, seconds) <= 0 ? "caught" : "running";
}

/** Characters per second over the last `window` seconds, from the timestamps
 *  of correct keystrokes. This is what drives the run animation — the runner's
 *  legs should answer the last second or two, not the whole run's average. */
export function recentCps(
  stamps: readonly number[],
  now: number,
  window = 2,
): number {
  const since = now - window;
  let n = 0;
  for (let i = stamps.length - 1; i >= 0 && stamps[i] >= since; i--) n++;
  return n / window;
}

export type Run = {
  readonly outcome: Outcome;
  readonly seconds: number;
  readonly correct: number;
};

/**
 * Play the whole track against a player who types at `cpsAt(seconds)`.
 *
 * Pure, and fast enough to run a whole game inside a test — which is how
 * `spec/game.test.ts` can assert "a slow typist gets caught" without a browser
 * and without anybody actually typing for four minutes.
 */
export function simulate(
  t: Track,
  cpsAt: (seconds: number) => number,
  { dt = 0.05, limit = 900 }: { dt?: number; limit?: number } = {},
): Run {
  let correct = 0;
  for (let seconds = 0; seconds <= limit; seconds += dt) {
    const done = Math.min(correct, t.chars);
    const result = outcome(t, done, seconds, correct >= t.chars);
    if (result !== "running") return { outcome: result, seconds, correct: done };
    correct += Math.max(0, cpsAt(seconds)) * dt;
  }
  return { outcome: "running", seconds: limit, correct: Math.min(correct, t.chars) };
}
