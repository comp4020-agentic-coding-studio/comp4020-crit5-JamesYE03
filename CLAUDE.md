# COMP4020 prototype

This is my starter repo for a COMP4020 prototype: a static site written in
HTML/CSS/TypeScript that builds to plain HTML/CSS/JS and deploys to GitHub
Pages. The **deployed site is what gets marked** --- not this repo, and not "it
works on my machine". Assume it is opened live in Chrome at both desktop
(1920×1080) and phone (390×844), and that both count in full.

What I'm building this week --- the spec --- is published on the course website,
and this repo's name tells you which deliverable it is. Run the course plugin's
**start** skill at the start of each week: it pulls the right spec from the
course API, carries this harness forward from last week, and helps turn the
spec's checkable lines into tests of my own. Read the spec before you build, and
see `spec/README.md` for how the checks in this repo relate to it.

## This week: C5 "A game"

**BOULDER** --- the Indiana Jones opening, as a typing race. A stick figure
sprints right down a slightly downhill tunnel; a stone boulder rolls after him
at a constant speed. The player types a fixed passage of English prose. Typing
fast makes the runner fast; typing slowly, or leaving a mistake uncorrected,
makes him slow, and the boulder closes.

- **The passage is the track.** Finish it without being caught and you escape.
  Get caught and you're crushed. 429 characters — about a minute at 85 wpm,
  short enough that a death ten seconds in costs nothing to shrug off and
  play again. The bar for surviving is 45 wpm.
- **Speed comes from correct characters only.** The runner's speed tracks the
  rate of characters *committed correctly* over the last couple of seconds. A
  wrong character goes red and must be cleared with backspace before the passage
  advances --- so a mistake stops the runner dead, and the punishment is
  built into the model rather than bolted on as a rule.
- **The camera holds the runner in the centre.** The world scrolls past him. The
  boulder's screen position is his lead, drawn to scale; once the lead is big
  enough that the boulder leaves the frame, an arrow at the left edge carries the
  distance instead.
- **One tuning constant decides everything.** `chase.ts` holds the typing rate at
  which runner and boulder move at the same speed. Below it you lose ground,
  above it you gain. Every difficulty complaint is a change to that one number.

Non-negotiables from the published spec, in the terms that bite here:

- **No instructions anywhere, on screen or off.** No how-to-play line, no modal,
  no instructions page, and nothing in the README standing in for one. The
  opening screen has to teach the first move by itself: the boulder is already
  trembling loose at the left edge, and the passage sits below with a blinking
  caret on its first character. A blinking text caret is the affordance; a
  sentence telling the player to type is a spec failure. **Naming the game is
  allowed** --- the `<h1>` is the name and nothing more.
  `spec/no-instructions.test.ts` is the sensor; don't work around it, and don't
  reintroduce the `.hint` line C4 had, because C4's spec allowed it and this
  week's does not.
- **It must be losable.** A wrong move has to be possible and play has to end
  somewhere. Being caught is a real ending, with a real result screen. Never
  soften this into a game you cannot fail.
- **Audio files are fine this week.** C4 forbade them --- that rule was C4's
  spec, not a standing one, and it is retired. `public/*.mp3` ships music and
  the two result stings. The per-keystroke click is still synthesised, because a
  file per keystroke would jitter and cut itself off.
- **A stranger reaches an ending inside five minutes.** Both endings count. On a
  phone the honest outcome is usually being caught, and that is fine --- but the
  chase threshold drops on a coarse pointer so a phone player has a real run at
  it rather than dying in ten seconds.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Before you push, run `pnpm check`. It runs typecheck, build, and the whole
  vitest suite --- the same three CI runs in its `check` job --- so you catch
  those in seconds instead of waiting for the pipeline. Evidence, secrets, links
  and the deploy only run in CI.
- **I do the visual and audio pass myself.** Don't stand up Playwright,
  `agent-browser`, screenshot tooling, or headless-browser workarounds to verify
  how something looks or sounds. `pnpm check` green is the bar you hand back on;
  I'll open it and play it. This is doubly true this week --- a test can prove a
  slow typist gets caught, but only playing can tell you whether being caught
  feels fair, and only four strangers at the crit can tell you whether the
  opening screen really teaches itself.
- When a check fails, read its output before changing anything. Each check names
  what it measures, and the failure message is the instruction: it tells you the
  file, the line, or the contract. Treat a red check as authoritative --- the
  page is wrong until the check is green, not until you decide it should be.
- Commit when the checks pass. Never commit a red state.

## The link-preview card

`public/card.png` (1200x630) is the image a shared link shows; `index.html`'s
head points at it. Replace it and the `description` meta, and copy the head
block into any new page. The card URL resolves against the page that names it,
like any link --- `./card.png` is wrong one directory down, and nothing in CI
checks it, so look at the deployed head when you add pages.

The `description` is read by scrapers, not players, so it is not an instruction
--- but keep it **descriptive** ("a stick figure outruns a rolling boulder"),
never imperative ("type fast to run"). The same goes for `aria-label`s: they
exist so a screen-reader user has the same affordance a sighted player gets from
the picture, which is the opposite of an instruction advantage.

## The checks (my sensors)

CI runs these on every push once the repo is public. GitHub's checks UI shows
two jobs, `check` and `deploy`, and within `check` the steps run in sequence
(`pnpm check` chains typecheck, build and vitest with `&&`), so an early failure
like a broken build stops the later sensors for that push; fix it and push again
to see the rest. While the repo is private (all week, until I ship) the CI jobs
stay skipped --- `pnpm check` is the same roster locally, and it's the faster
loop anyway.

They also carry a mark at a crit: the sweep runs fifteen minutes after the
cutoff, and green checks there are worth half that week's shipped mark. Still
running counts as not green, so ship with time for CI to finish.

- **typecheck** --- `tsc --noEmit` runs first, so a type error stops the roster
  before the build starts. A red here is the compiler telling you a claim in the
  code is false.
- **build** --- the site must build (`pnpm build`). A build failure means the
  deployed site is broken or stale, so nothing else matters until this is green.
- **spec** --- `spec/invariants.test.ts` asserts what's true of any good website,
  whatever the brief asks; my own tests for the week's spec run alongside it (any
  `spec/*.test.ts`). A failure names the contract not met yet.
- **tests** --- any other tests, wherever they live (co-located with source is
  fine). Vitest picks up both suites in one `vitest run`.
- **deploy / online** --- the live GitHub Pages URL must load and return the page
  expected. An asset that 404s deployed counts as broken even if it loads locally.
- **evidence** (`pnpm check:evidence`) --- `PROCESS.md`'s citations resolve to
  real commits, this deliverable's exact reflection is in `reflections/` (worked
  out from this repo's name against the public course API --- this week that is
  `reflections/crit-5.md`), and `CLAUDE.md` is present. Evidence gates the
  deploy, so failing it blocks the deploy alongside everything else.
- **links** --- internal links must resolve. A broken link is a dead end I didn't
  mean to ship.
- **secrets** --- the repo is scanned for committed credentials. Never put a key,
  token, or password in a tracked file. A local pre-commit hook
  (`.githooks/pre-commit`, installed by `pnpm install`) also blocks any commit
  containing something shaped like an API key --- by the time CI sees a key it is
  already pushed, so the hook is the sensor that matters.

**This template ships no lint sensor.** Unlike the Astro setup I used for A1,
`pnpm check` here is `typecheck && build && vitest run` --- there is no
stylelint or oxlint step. Don't cite a lint check that doesn't exist, and don't
add one mid-week just to have it.

Nothing here measures **accessibility** or **performance** --- wiring those
sensors is my work, and later in the course the spec will ask me to show how I
tested both. When I do, read a green performance result honestly: it's a lab
estimate from one run on a CI machine, not proof the site is fast for real users.

## Facts about this stack that are easy to get wrong

### The deployed path is a subpath, not the root

GitHub Pages project sites serve everything under `/<repo-name>/`, not at the
domain root. This template's `vite.config.ts` sets `base: "./"` so built asset
URLs come out **relative** and this mostly takes care of itself --- which is
exactly why it's easy to reintroduce by hand. Any absolute path I write myself
(`/styles.css`, a hardcoded `fetch("/data.json")`, a hand-rolled redirect) looks
correct locally and 404s on the live URL.

The general lesson, learned the hard way in A1 and worth keeping: when something
depends on "where does this route actually live", test it against a server that
mounts the site at that subpath, not against raw disk paths --- and after fixing
this pattern in one place, grep for the same naive assumption in the other
surfaces that run similar checks (CI YAML, npm scripts, docs), instead of
assuming a fix documented in one place means every surface agrees.

### Mutation-test a check before trusting it

Learned in C4, and it generalises to every sensor I write. The first version of
that week's geometry check derived the contact point *from* the bell's own
origin, so the assertion was true by construction and stayed green with the bell
moved to the wrong side. A tautological test is worse than no test: it reports
confidence it hasn't earned. Break the thing on purpose, watch the check go red,
put it back. That applies squarely to this week's chase test --- a test that
says "a slow typist gets caught" is worthless if it would also pass with the
boulder standing still.

C5 added a second half to the lesson. `no-instructions.test.ts` passed its
first mutation and then failed a second one: a word-boundary rule around each
banned phrase meant that a hint fused to the heading before it
(`</h1><p>Type fast...`, no whitespace, so the text read `BOULDERType fast`)
slipped straight through. **When a check has to reject text, narrow the
haystack, not the needle** --- normalise what you are scanning (join text nodes
with spaces, strip code spans and filenames) and keep the match itself dumb.
Clever matching is where the hole is, and one mutation is not enough: mutate it
the way someone trying to get past it would.

### Web Audio

- **The context starts suspended.** Browsers will not produce sound until a real
  user gesture. `AudioContext.resume()` has to be called from inside a real
  input handler (this week, the first `keydown`), not on load, not in a
  `setTimeout`. Build the context lazily on that first gesture and reuse it.
- **Schedule against `ctx.currentTime`, never `setTimeout`.** Audio runs on its
  own clock. Anything scheduled off the main thread's timers will drift and
  jitter audibly.
- **`exponentialRampToValueAtTime` cannot target 0.** Ramp to a small epsilon
  (e.g. `1e-4`) and then `stop()`. Targeting zero throws.
- **Stop and let nodes go.** Every keystroke click builds a fresh node or two.
  Give each one a `stop(when)` so it is collected; leaked nodes at 100 keystrokes
  a minute add up fast.

### `<audio>` files, and why the click isn't one

`public/*.mp3` is copied to `dist/` verbatim by Vite, so an `<audio>` element
can point at `./crit5bgm.mp3` and it resolves on the deployed subpath. Two
things bite:

- **Autoplay is blocked** until a user gesture, same as Web Audio. The music
  starts on the first keystroke, never on load.
- **The music file is large** (about 6 MB). It is `preload="none"` and its
  fetch starts on that first keystroke, so the page is playable immediately and
  the music arrives when it arrives. Never block the start of a run on an audio
  fetch.
- **One element cannot overlap itself.** Retriggering a playing `<audio>` cuts
  the previous sound off, which is exactly why the per-keystroke click is
  synthesised instead of a file.

### One world, one scale

The scene has exactly one unit — the model's character — and one conversion,
`pxPerChar`. The runner's speed, the boulder's speed, the floor going past and
the boulder's rotation all come from it. Any quantity that gets its own private
scale will look wrong in a way that is very hard to name: the second version of
this game scrolled the floor from the gait and turned the boulder from the
floor, so the rock sped up and slowed down with the typing, as though it were
being pushed rather than falling.

Two consequences worth remembering before touching the tuning:

- **Draw the gap from a smoothed position, decide it from the exact one.**
  `typing.correct` is an integer and a character is most of a hundred pixels of
  tunnel, so drawing straight from it makes the boulder jerk backwards once per
  keystroke. `shownCorrect` eases towards it for the picture; the outcome still
  reads the integer. Never let those two swap jobs.
- **The camera and the difficulty are the same number.** `headStartChars` sets
  how far back the boulder starts, which sets `pxPerChar` (it has to be in
  frame), which sets how fast the world goes past. A gentler game is a
  slower-looking one. There is no third knob.
- **Smooth the camera, never the world.** `smoothCps` exists so the picture
  eases when the typing stops and starts. The boulder's position comes straight
  from the model, unsmoothed, because it is the thing the player is being
  judged against.

### SVG is not the ceiling; flat art was

Worth writing down because it came up as "should we change stack for a better
picture". No. The scene is a skeleton (`<g>` inside `<g>`, one rotation each),
gradients, and tiled texture — all of which SVG does natively and Canvas would
make me hand-roll, and the passage has to stay DOM anyway for per-character
colour, wrapping and screen readers. What made the first version look like a
web page rather than a tomb was flat fills and a dashed line, not the renderer.
The rules layer is pure and stack-free, so a switch would buy a rewrite of the
only part that was already fine. Revisit **only** for thousands of particles or
per-pixel lighting, and then as a Canvas layer *added* beside the DOM, not a
rewrite.

Two rules make this stack fast enough, and both are easy to break by accident:

- **Per frame, touch only `transform` and `opacity`.** Anything else repaints.
  The first version animated a gradient behind `filter: blur(2px)` on the exit
  glow — a full re-rasterise every frame for an effect a static gradient plus a
  changing opacity gives for free.
- **Bake texture into images, never filter live.** `feTurbulence` inside a
  `background-image` data URI is rasterised once at decode; the same filter on
  a live element re-runs forever. `src/scenery.ts` generates every tile this
  way.

### Data URIs: write `#` literally, encode once

`svgUrl()` runs `encodeURIComponent` over the whole SVG string. So the source
must contain a bare `url(#fire)` and bare `#rrggbb` colours — pre-encoding them
as `%23` yields `%2523`, and the browser silently drops the background image.
Green build, green tests, black rectangle. `spec/scenery.test.ts` is the sensor
for this, because nothing else in the repo can see it.

Colours inside SVG **presentation attributes** stay hex. Attribute colour
parsing is older and narrower than a stylesheet's, and an unreadable colour is
a black shape rather than an error.

### Animating from JavaScript, not keyframes

Changing `animation-duration` on a running CSS animation makes it jump: the
browser recomputes where in the timeline it now is. Anything whose speed varies
continuously — the run cycle, the world scrolling past — is therefore driven
from a phase accumulator in the rAF loop (`stride`, `travelled` in `main.ts`),
with the pose itself a pure function in `src/runner.ts`. CSS keyframes are kept
for the things that run at a fixed rate regardless: the caret blink, the torch
flicker, the idle tremble.

Set limb rotations with the SVG `transform` **attribute**, not the CSS
property: the attribute's rotation centre is in the element's own local
coordinates, which is what makes a knee nested inside a rotating thigh compose
correctly.

### Keyboard input, and the mobile soft keyboard

- **The keyboard is the controller this week**, so the page must never lose
  focus to something that swallows keys. Listen on `window` for `keydown`.
- **A phone has no keyboard until something focusable asks for one.** A visually
  hidden `<input>` that gets focused on first tap raises the soft keyboard;
  everything else still reads from the same key handling.
- **Turn the phone's helpfulness off** on that input:
  `autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false"`.
  Otherwise autocorrect rewrites whole words and the player fights the OS
  instead of the boulder.
- **The soft keyboard eats around 40% of a 390×844 viewport.** Lay the page out
  so the scene and the current line of text both survive that, rather than
  assuming the full height is available.
- **`touch-action: manipulation`** on the stage, so a double-tap doesn't zoom
  the page mid-run.

## My process is part of the mark

The deployed page is only half of it. How I got there is marked too: commit
history, agent files, and the decisions visible across them. The checks above
can't see any of that, so a person reads it directly --- which means building
legibly is part of building well.

- **Commit as you go.** Small, frequent commits are the record of how the work
  came together, and that record is read, not just the final state. A trail that
  grew alongside the code is the strongest evidence of process; a single dump the
  night before is the weakest.
- **Keep a process overview** (`PROCESS.md`). A short reading-guide, not an
  essay: what I built, the moments that mattered --- each pointing at a commit, a
  `CLAUDE.md` change, or a prompt and the commit it produced --- and where to
  look in the history. It points a marker at the evidence; it doesn't stand in
  for it, and claims the history doesn't back don't count. `pnpm check:evidence`
  verifies citations resolve to real commits before I ship. Markers follow those
  citations and don't trawl the repo for evidence I didn't cite.
- **Write the reflection in `reflections/`** --- named for the deliverable it
  answers, so the number in the filename is the number in this repo's name. This
  week: `reflections/crit-5.md`. `pnpm check:evidence` checks the exact current
  name against the course API, not merely the presence of any well-named file. It
  answers the two standing prompts: the breakthrough that moved the work forward,
  and what this work changed about the developer I want to be. It stays out of
  the deployed site. It's due at the cutoff, and if it isn't in the repo by then
  the week doesn't count as shipped, however good the prototype is.
- **This file is process evidence.** The harness I build to direct the agent ---
  this `CLAUDE.md` and any `AGENTS.md` --- is itself read as part of how I
  worked. Keep it honest and current.

I don't need a name, a student number, or any identity file in the repo: the
course knows whose repo it is. Spend the effort on the work.

## Conventions I hold the agent to

These are rules I've decided the agent should follow on every task in this repo,
not just the one that surfaced them.

- **Never fabricate anything that reads as real.** Data, links, personal
  anecdotes in `PROCESS.md`, `reflections/`, or page copy --- if the real value
  isn't available, say so and ask, or leave an explicit placeholder. Don't invent
  something plausible-looking instead.
- **Ask before assuming.** When a requirement is ambiguous or information is
  missing, ask a clarifying question before writing code, not after producing
  something wrong. The question belongs before the first line of code, not as a
  post-mortem.
- **Keep it simple by default.** Prefer the simplest implementation that
  satisfies the requirement; avoid speculative abstraction, extra configuration,
  or generality the task didn't ask for. The first version of the code should
  already be simple --- don't wait to be asked to simplify it.
- **Don't touch what you don't understand.** Never remove or change code or
  comments you don't fully understand, even if they look unrelated to the current
  task. A commit should contain only what it set out to do --- no unrelated
  "drive-by" cleanup mixed in.
- **Define done before starting.** For a multi-step task, state a clear,
  checkable completion criterion for each step before starting it. A diff should
  only contain the changes that were actually asked for.
- **Keep the rules of the game pure and separate from the DOM.** This week that
  is `src/typing.ts` (what a keystroke does to the passage) and `src/chase.ts`
  (what a typing rate does to the gap): plain functions over plain data, no
  `document`, no `AudioContext`, no timers. That is what makes them testable in
  jsdom, and it is what lets the spec tests assert the **contract** ("a slow
  typist gets caught", "an uncleared mistake stops the runner") rather than the
  implementation. The same split held for C4's physics and synthesis; it is the
  standing shape, not a one-week trick.

## How to start each week's work

This is the three-message shape I want every new week's work to follow, so
neither of us burns turns re-deriving it:

1. **Understand and ask.** Clone the week's repo, read the spec from the course
   site yourself, and summarise it. Then ask a batch of roughly 5--15 questions
   covering the open decisions you can't resolve by reading the code or the spec
   --- not implementation details you can figure out on your own. Prefer open
   questions with a couple of example answers spelled out in the question itself
   over forced multiple choice, since most real answers (a reference site, a real
   data source, a scope call) aren't naturally A/B.
2. **Restate and confirm.** Once I answer, restate the full understanding and the
   plan before writing any code. Don't start until I give an explicit go-ahead;
   keep asking if the answer is "not quite."
3. **Execute, verify, hand back.** Commit at each meaningful checkpoint (sized to
   the work, not padded to a count) and push to the private `main` branch after
   each one --- CI's push-only checks should catch problems while there's still
   time to fix them, not the night of the crit. Never flip the repo public or run
   `ship` unless asked to separately. Treat `pnpm check` as the completion bar,
   don't stand up browser/screenshot tooling to self-verify UI, make the smallest
   diff that satisfies the request, and hand back a plain description of what
   changed without stacking extra confirmation prompts for routine changes.

**Read the spec's wording each week, not last week's habits.** C4 allowed a
one-line hint at the top of the page; C5 forbids instructions outright. Carrying
last week's page furniture forward without re-reading the contract is the
cheapest way to fail the hardest line in a spec.

## This file is mine

This CLAUDE.md is a starting point, not a fixed rulebook. As I learn what the
prototype needs --- a convention to hold the agent to, a sensor that keeps
catching me out, a fact about the stack the agent keeps getting wrong --- I write
it down here. Growing this file is the work of harness engineering, and the gap
between the boilerplate and my own version is part of what the prototype says
about the developer I'm becoming.
