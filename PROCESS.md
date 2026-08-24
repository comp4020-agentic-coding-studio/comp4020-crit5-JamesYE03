# Process overview

## What I built

**BOULDER** — the opening scene of *Raiders of the Lost Ark*, as a typing race.
A stick figure in a fedora sprints right down a tunnel that runs downhill; a
stone boulder rolls after him at a constant speed. The player types a fixed
passage of prose, and the runner's position *is* the number of characters typed
correctly — so typing fast is running fast, with no fudge factor in between.
Finish the passage before the boulder reaches you and you escape; fall behind
its pace and it catches you. Nothing on the page says any of that: this week's
spec bans instructions outright, so a blinking caret and a boulder straining
against the wall have to do the whole job of teaching the first move.

I came to it wanting to remake 金山打字通's police-chases-thief typing game, and
kept the mechanic while changing the scene to the one it is really about — a
chase you lose by being slow.

## The moments that mattered

### 1. The opening screen I planned would have failed the hardest line in the spec

My plan had the game open on a floating line of text: **"Type fast to run!"**.
C4's spec allowed a one-line hint at the top of the page and I had one there, so
carrying the habit forward felt free. C5's spec is not C4's — *"no instructions
anywhere, on screen or off"* — and the brief singles that line out as the one
thing that can't be put under test and can't be faked.

The obvious move was to delete the sentence. What I did instead was work out
what the sentence had been *doing* and build the scene to do it without words:
the boulder is already trembling loose at the left edge before anything starts,
and the passage sits below it with a caret blinking on its first character. A
blinking text caret is the most universally understood "type here" affordance
there is, and a rock about to fall on someone supplies the urgency the exclamation
mark was carrying.

Then I put it under a sensor rather than trusting myself to remember, and
mutation-tested the sensor by pasting the original line back into the page — two
checks go red on it. The rule and the reasoning went into `CLAUDE.md`
alongside it, including *why* `aria-label` and the meta description are held to
being descriptive instead of being suppressed.

[`5a24d5b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/5a24d5b)
(the harness rule) and
[`af28682`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/af28682)
(`spec/no-instructions.test.ts`).

### 2. Measuring the chase in characters instead of pixels

The first shape I reached for had a runner speed in pixels per second, a boulder
speed in pixels per second, and a conversion from typing rate to speed somewhere
in the middle. Three numbers to tune, all coupled.

Instead the whole model is measured in **characters**: the runner's position is
the count of characters typed correctly, the boulder's is a straight line in
time, and the tunnel is exactly as long as the passage. That collapses the game
to one tunable number — `thresholdCps` in `src/chase.ts`, the typing rate at
which the two move as one — and makes "typing fast makes you fast" true by
construction rather than by calibration. It also made the punishment for a
mistake fall out for free: an uncorrected red character stops the count from
rising, so the runner stops earning ground while the boulder keeps coming. There
is no penalty rule anywhere in the code.

Because both models are pure functions over plain data, a test can play a whole
four-minute run in a millisecond. That is what let me check the spec's *"a
stranger reaches an ending inside five minutes"* line directly, for both the
desktop and the phone tuning, instead of arguing about it.

[`7efd942`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/7efd942)

### 3. Mutation-testing both new sensors, because C4 taught me not to trust a green check

In C4 I wrote a geometry check that derived the thing it was asserting from the
thing it was asserting about, so it stayed green with the bell on the wrong side
of the screen. That lesson is in `CLAUDE.md` as a standing rule, and this week I
actually followed it on both new sensors before believing either.

Freezing `boulderAt` so the boulder never moves turns five chase tests red —
without that, *"a slow typist gets caught"* would have been a test that passed
because the passage is long, not because anything was chasing anyone.

The instruction sensor was the more interesting one, because it passed its
first mutation and then failed a second. I had written it to match each banned
phrase on word boundaries, so that naming `no-instructions.test.ts` in the
README wouldn't trip it. Mutating the page a second way — pasting the hint in
without whitespace between the tags, so the page text read `BOULDERType fast to
run!` — walked straight past the lookbehind. The fix was to stop being clever
about the match and be careful about the input instead: join text nodes with
spaces, strip code spans and filenames, then use a plain substring test. That
rule went into `CLAUDE.md` as *narrow the haystack, not the needle*, next to the
C4 lesson it extends.

One mutation is not a mutation test. You have to break it the way someone
trying to get past it would.

[`7efd942...af28682`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/compare/7efd942...af28682)

## Where to look

- `src/typing.ts` and `src/chase.ts` — the two rules of the game, as pure
  functions. Everything else is wiring.
- `spec/game.test.ts` — the two mechanically checkable spec lines.
- `spec/no-instructions.test.ts` — the third one, and the reasoning about what
  a sensor can and can't hold.
- `CLAUDE.md` — carried forward from `comp4020-crit4`, with C4's audio and
  geometry rules retired and this week's read-the-spec-not-last-week's-habits
  rule added.
