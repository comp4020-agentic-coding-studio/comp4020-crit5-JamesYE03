# Process overview

## What I built

**BOULDER** — the opening of *Raiders of the Lost Ark* as a typing race. The
runner's position *is* the count of characters typed correctly, so typing fast
is running fast, and an uncorrected mistake stops him earning ground while the
rock keeps coming.

## The moments that mattered

Four; `src/`, `spec/` and `CLAUDE.md` hold the rest. Three are about writing
down what can be written down, and one about what cannot.

**1 · The opening screen, caught before I built it.** I had planned to open on
"Type fast to run!" — fine in C4, a spec failure in C5. Rather than delete it I
asked what it was *for* (*type here*, *hurry*) and made the scene do both: a
blinking caret, a boulder straining loose. The sensor holding that failed its
second mutation, where a hint fused to the heading slipped past its word
boundaries: *narrow the haystack, not the needle*.
[`5a24d5b...c3a0d8b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/compare/5a24d5b...c3a0d8b)

**2 · Measuring the chase in characters, not pixels.** Three coupled numbers
became one, and the cost of a mistake fell out for free instead of being a rule.
Pure functions, so a test plays a whole run in a millisecond.
[`7efd942`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/7efd942)

**3 · A sensor for a bug with no symptoms.** A `#` pre-encoded in a data URI
became `%2523`, and a URI a browser cannot parse is not an error — it is an
image that silently does not appear. Build green, tests green, page black;
nothing here could have caught it, so now something does.
[`73e5b81`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/73e5b81)

**4 · "The running still looks wrong", said three times.** Twice I went to the
arms; the third time to the maths, where SVG rotates clockwise so a positive
angle swings a limb *backwards* — the knee had been folding the heel up while
the leg reached forward. A prance, not a run, and no check I had could see it.
The tests pin the signs now, not whether a run reads as one.
[`394f82e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/394f82e)
