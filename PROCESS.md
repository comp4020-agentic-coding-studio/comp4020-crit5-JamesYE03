# Process overview

## What I built

**BOULDER** — the opening of *Raiders of the Lost Ark* as a typing race. The
runner's position *is* the count of characters typed correctly, so typing fast
is running fast with no fudge factor between, and an uncorrected mistake stops
him earning ground while the rock keeps coming. Nothing on the page explains
any of that.

## The moments that mattered

Seven, kept short. The same pattern runs through all of them: the checks caught
what could be written down, and playing it caught everything else.

**1 · The opening screen I caught before building it.** I had planned to open on
"Type fast to run!" — fine in C4, a spec failure in C5. Rather than delete the
sentence I asked what it was *for* (*type here*, *hurry*) and made the scene do
both: a blinking caret, a boulder straining loose. Then I put it under a sensor,
which passed one mutation and failed a second — a hint fused to the heading read
`BOULDERType fast to run!` and walked straight past my word boundaries. *Narrow
the haystack, not the needle.*
[`5a24d5b...c3a0d8b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/compare/5a24d5b...c3a0d8b)

**2 · Measuring the chase in characters, not pixels.** Three coupled numbers
became one: the runner's position is the character count and the tunnel is as
long as the passage, so the punishment for a mistake fell out for free instead
of being a rule. Pure functions, so a test plays a whole run in a millisecond.
[`7efd942`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/7efd942)

**3 · A sensor for a bug with no symptoms.** I wrote `url(%23fire)` in an SVG
data URI and `encodeURIComponent` turned it into `%2523`. A URI a browser cannot
parse is not an error — it is an image that silently does not appear. Build
green, tests green, page black. Nothing in the repo could have caught it, so now
something does.
[`73e5b81`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/73e5b81)

**4 · "Could your rock be any faker?"** The tunnel looked like a web page, and
the fair question was whether SVG was the ceiling. It wasn't — flat fills were.
That reasoning went into `CLAUDE.md` so week 8 doesn't re-litigate it, with the
two rules that keep this stack fast: bake texture into images, and per frame
touch only `transform` and `opacity`.
[`73e5b81...f954d24`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/compare/73e5b81...f954d24)

**5 · The boulder was taking orders from the runner.** The floor scrolled from
the gait and the rock's spin came from the floor, so it sped up whenever the
typing did — pushed, not falling. Its *position* was right, which is why only
playing it showed this. The fix deleted a scale rather than adding a correction:
one world, one `pxPerChar`.
[`1e6944a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/1e6944a)

**6 · "Still not smooth" was three bugs, and I had fixed only the obvious one.**
Easing the drawn position killed the jump but not the pulse, because a
first-order ease is smooth in position and stepped in *speed* — and the eye
reads speed. The other two were my own written rules broken inside one function:
positioning by `left`, and reading `clientWidth` while drawing.
[`0d792dc...30b0a0d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/compare/0d792dc...30b0a0d)

**7 · "The running still looks wrong", said three times.** Twice I went to the
arms. The third time I checked the maths: SVG rotates clockwise while he runs
right, so a positive angle swings a limb *backwards* — the knee fold was tied to
the thigh's sine and folded the heel up while the leg reached forward. A prance,
not a run, since the day I built the skeleton. No check I had could see it. The
tests pin the signs now, but whether a run reads as a run is found by watching.
[`394f82e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/394f82e)

## Where to look

`src/` holds the rules as pure functions, `spec/` turns them into this week's
checks, `CLAUDE.md` carries each round's lesson forward. The camera that pulls
back as the gap opens
([`49d50af`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/49d50af))
came out of the same loop: `zoomFor` is solved, not tuned.
