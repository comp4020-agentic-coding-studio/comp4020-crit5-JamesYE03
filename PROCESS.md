# Process overview

## What I built

**BOULDER** — the opening of *Raiders of the Lost Ark* as a typing race. The
runner's position *is* the count of characters typed correctly, so typing fast
is running fast with no fudge factor between, and an uncorrected mistake stops
him earning ground while the rock keeps coming. Nothing on the page explains it.

## The moments that mattered

All seven, kept to two sentences each. One shape runs through them: the checks
caught what could be written down, and playing it caught everything else.

**1 · The opening screen, caught before I built it.** I had planned to open on
"Type fast to run!" — fine in C4, a spec failure in C5 — so instead of deleting
the sentence I asked what it was *for* (*type here*, *hurry*) and made the scene
do both: a blinking caret, a boulder straining loose. The sensor I wired to hold
it passed one mutation and failed a second, where a hint fused to the heading
read `BOULDERType fast to run!`: *narrow the haystack, not the needle*.
[`5a24d5b...c3a0d8b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/compare/5a24d5b...c3a0d8b)

**2 · Measuring the chase in characters, not pixels.** Three coupled numbers
became one, and the punishment for a mistake fell out for free rather than being
a rule. Pure functions, so a test plays a whole run in a millisecond.
[`7efd942`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/7efd942)

**3 · A sensor for a bug with no symptoms.** `url(%23fire)` in a data URI became
`%2523`, and a URI a browser cannot parse is not an error — it is an image that
silently does not appear. Build green, tests green, page black; nothing in the
repo could have caught it, so now something does.
[`73e5b81`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/73e5b81)

**4 · "Could your rock be any faker?"** The fair question was whether SVG was
the ceiling; it wasn't, flat fills were. The answer is in `CLAUDE.md` so week 8
doesn't re-argue it, with the two rules that keep this stack fast: bake texture
into images, and per frame touch only `transform` and `opacity`.
[`73e5b81...f954d24`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/compare/73e5b81...f954d24)

**5 · The boulder was taking orders from the runner.** Its spin came from the
floor and the floor came from the gait, so it sped up whenever the typing did —
pushed, not falling — and only playing it showed that, because its *position*
was right. The fix deleted a scale instead of adding a correction.
[`1e6944a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/1e6944a)

**6 · "Still not smooth" was three bugs; I had fixed the obvious one.** A
first-order ease is smooth in position and stepped in *speed*, and the eye reads
speed. The other two were my own written rules broken inside one function:
positioning by `left`, and reading `clientWidth` while drawing.
[`0d792dc...30b0a0d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/compare/0d792dc...30b0a0d)

**7 · "The running still looks wrong", said three times.** Twice I went to the
arms; the third time to the maths, where SVG's clockwise rotation meant a
positive angle swung a limb *backwards* and the knee had been folding the heel
up while the leg reached forward. A prance, not a run, since the day I built the
skeleton — no check I had could see it, and the tests pin the signs now but not
whether a run reads as one.
[`394f82e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/394f82e)

## Where to look

`src/` holds the rules as pure functions, `spec/` turns them into this week's
checks, `CLAUDE.md` carries each round's lesson forward — including the camera
that pulls back as the gap opens
([`49d50af`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-JamesYE03/commit/49d50af)),
where `zoomFor` is solved rather than tuned.
