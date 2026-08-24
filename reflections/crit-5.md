# C5 — A game

> **Draft — James, this needs your own words before the cutoff.** Everything
> below happened, but the two prompts are asking what *you* made of it, and
> that is the part I can't write for you. The two `TO WRITE` lines are the
> ones that matter most to the marker.

## The breakthrough

It was catching my own opening screen before I built it.

I had planned to open the game on a line of floating text — "Type fast to
run!" — and any key would start the run. It felt like the safe option, because
that is more or less what I did in C4, where a one-line hint sat at the top of
the page and the spec allowed it. C5's spec does not: *no instructions
anywhere, on screen or off*, and the brief goes out of its way to say this is
the line you cannot fake and cannot test your way around.

What moved the work forward was not deleting the sentence but asking what the
sentence was for. It was doing two jobs — *type here*, and *hurry* — and the
scene could do both better. A caret blinking on the first character of the
passage says "type here" to anyone who has ever used a computer, and a boulder
straining against the tunnel wall says "hurry" without a word. Cutting the
sentence made the opening stronger, not weaker.

The second thing that unlocked the build was measuring the chase in characters
rather than pixels. Once the runner's position *was* the number of characters
typed correctly, the whole game collapsed to one number, and the punishment for
a mistake stopped needing a rule at all: a red character you haven't cleared
just means you aren't covering ground.

> **TO WRITE:** which of those two actually felt like the breakthrough to you
> while you were working, and what tipped you off? (One or two sentences of
> your own is worth more than the account above.)

## What it changed about who I want to be

The pattern I keep hitting is that last week's correct answer is this week's
wrong one. In C4 a hint line was fine; in C5 it fails the hardest line in the
spec. I nearly carried it forward without re-reading anything, because it had
been safe once.

So the rule went into the harness rather than into my memory: `CLAUDE.md` now
says to read this week's spec wording instead of last week's habits, and
`spec/no-instructions.test.ts` fails on the exact sentence I had planned to
ship. I also mutation-tested both new checks before trusting them, which is a
habit C4 gave me the hard way after I wrote a check that was true by
construction. I want to be the kind of developer whose standards live in files
the build can enforce, not in good intentions I have to remember on a Sunday
night.

> **TO WRITE:** what you actually want to do differently next week.
