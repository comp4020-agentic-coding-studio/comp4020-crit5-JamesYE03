// What a keystroke does to the passage. No DOM, no timers — just the rule,
// so `spec/game.test.ts` can assert the contract rather than the wiring.

/**
 * A player's position in the passage.
 *
 * `correct` never decreases: those characters are distance the runner has
 * already covered, and you cannot un-run. `errors` is the wrong text typed
 * since, still on screen in red, blocking any further progress until it is
 * backspaced away. That block is the whole punishment for a mistake — the
 * runner simply stops earning ground, and the boulder keeps coming.
 */
export type Typing = {
  readonly correct: number;
  readonly errors: string;
};

/** Past this many pending mistakes further keys are ignored, so a player who
 *  keeps hammering can't push the line off the screen. */
export const MAX_PENDING_ERRORS = 8;

export function start(): Typing {
  return { correct: 0, errors: "" };
}

export function press(state: Typing, char: string, target: string): Typing {
  if (isFinished(state, target)) return state;

  if (state.errors !== "") {
    // Already wrong: everything further is wrong too, until it is cleared.
    return state.errors.length >= MAX_PENDING_ERRORS
      ? state
      : { ...state, errors: state.errors + char };
  }

  return char === target[state.correct]
    ? { ...state, correct: state.correct + 1 }
    : { ...state, errors: char };
}

export function backspace(state: Typing): Typing {
  if (state.errors === "") return state;
  return { ...state, errors: state.errors.slice(0, -1) };
}

export function isFinished(state: Typing, target: string): boolean {
  return state.errors === "" && state.correct >= target.length;
}
