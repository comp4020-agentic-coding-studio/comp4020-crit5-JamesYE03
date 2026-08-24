# Process overview

## What I built

**BOULDER** — the opening of *Raiders of the Lost Ark* as a typing race. The
runner's position *is* the count of characters typed correctly, so typing fast
is running fast with no fudge factor between, and an uncorrected mistake stops
him earning ground while the rock keeps coming. Nothing on the page explains
any of that.

## The moments that mattered

### 1. Catching my own opening screen before I built it

I had planned to open on a line of text: **"Type fast to run!"**. C4 allowed a
hint at the top of the page and I had used one, so carrying the habit forward
felt free. C5 forbids instructions outright, and the brief calls that the one
line you can neither test nor fake.

The obvious move was to delete it. Instead I asked what it was *for* — *type
here*, and *hurry* — and built the scene to do both: a caret blinking on the
first character, a boulder straining loose behind him.

Then I wired it to a sensor rather than to my memory. It passed its first
mutation and failed a second: matching on word boundaries let a hint fused to
the heading through, because the page read `BOULDERType fast to run!`. Narrow
the haystack, not the needle — now a rule in `CLAUDE.md`.

[`5a24d5b...c3a0d8b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/compare/5a24d5b...c3a0d8b)

### 2. "The running still looks wrong", said three times

Twice I went to the arms. The third time I checked the maths: SVG rotates
clockwise while he runs to the right, so a positive angle swings a limb
*backwards*. The knee fold was tied to the same sine as the thigh, folding the
heel up while the leg reached forward — a prance, not a run, since the day I
built the skeleton.

Nothing I had wired could see it. The tests pin the signs now, but whether a run
reads as a run is found by watching it.

[`394f82e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/394f82e)

## Where to look

`src/` holds the rules as pure functions, `spec/` turns them into this week's
checks, `CLAUDE.md` carries each round's lesson forward.
