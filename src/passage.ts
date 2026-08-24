// The passage the player types. Its length is the length of the tunnel: the
// runner's position *is* the number of characters committed correctly, so
// choosing a passage is choosing a track.
//
// It is deliberately ordinary prose — common words, no punctuation a keyboard
// has to hunt for — because the difficulty this week is meant to come from the
// boulder, not from the spelling.
//
// Length is a design decision, not a detail. 429 characters is about a minute
// at 85 wpm, which makes a lost run cheap to shrug off and play again — the
// first version ran to 853 and a death at ten seconds cost you a two-minute
// commitment. It also sets the floor on how gentle the game can be: the
// slowest survivor takes `chars / thresholdCps` seconds, and the spec gives
// five minutes to reach an ending. See src/chase.ts.
export const PASSAGE =
  "Indiana Jones lifted the golden idol from the stone altar and swapped it for a sandbag, but the ancient trap fired at once. " +
  "The whole tunnel shook and a massive round boulder broke free from the wall behind him. " +
  "He turned and sprinted, knowing the stone would crush him in a moment if it ever caught up. " +
  "There was no time at all to slow down or to make mistakes. " +
  "The only way out was to keep running toward the bright exit ahead.";

/**
 * The first `count` sentences of a passage, trimmed.
 *
 * A phone gets a shorter tunnel than a desktop. Thumbs are slower than ten
 * fingers, and the spec asks that a stranger reach *an ending* inside five
 * minutes — a track a phone player can only ever lose is a worse answer to
 * that than a shorter track they can actually finish.
 */
export function opening(passage: string, count: number): string {
  const sentences = passage.match(/[^.]+\./g) ?? [passage];
  return sentences.slice(0, count).join("").trim();
}
