// The passage the player types. Its length is the length of the tunnel: the
// runner's position *is* the number of characters committed correctly, so
// choosing a passage is choosing a track.
//
// It is deliberately ordinary prose — common words, no punctuation a keyboard
// has to hunt for — because the difficulty this week is meant to come from the
// boulder, not from the spelling.
export const PASSAGE =
  "Indiana Jones carefully lifted the ancient golden idol from the stone altar inside the hidden temple. " +
  "He tried to replace it with a sandbag to trick the old weight trap, but the ancient mechanism still activated at once. " +
  "The whole tunnel shook and a massive stone boulder broke free from the upper wall. " +
  "The huge round rock began to roll rapidly down the narrow passage directly behind him. " +
  "Indy turned instantly and sprinted forward with all his strength. " +
  "He knew the heavy boulder would crush him instantly if it caught up. " +
  "The stone gained speed every second and rumbled loudly across the solid ground. " +
  "He kept running without hesitation, glancing back quickly to check the closing distance. " +
  "There was no time to slow down or make mistakes. " +
  "The only way to survive was to keep rushing toward the bright exit ahead and escape the deadly rolling stone.";

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
