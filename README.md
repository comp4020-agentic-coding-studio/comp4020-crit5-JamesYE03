# BOULDER

A COMP4020 weekly prototype: the opening scene of *Raiders of the Lost Ark* as
a browser game. A stick figure in a fedora runs down a tunnel; a stone boulder
rolls after him.

Static site — HTML, CSS and TypeScript, built with Vite, deployed to GitHub
Pages. No backend.

## Running it

```sh
mise install
pnpm install
pnpm dev      # local dev server
pnpm check    # typecheck, build, and the whole test suite
```

## Layout

| path | what it is |
| --- | --- |
| `src/typing.ts` | what a keystroke does to the passage — a pure function |
| `src/chase.ts` | what a typing rate does to the gap — a pure function |
| `src/passage.ts` | the text, which is also the length of the tunnel |
| `src/audio.ts` | synthesised keystrokes, plus the music and result stings |
| `main.ts` | wiring: DOM, input, and the animation frame |
| `spec/` | this week's published spec, as tests, alongside the shipped invariants |
| `CLAUDE.md` | the harness — the standards this repo holds the agent to |
| `PROCESS.md` | a reading guide to how the work came together |

The two models are deliberately free of the DOM so the whole four-minute chase
can be played inside a test.

## A note on this file

This page deliberately says nothing about how the game is played. That is the
week's brief, not an oversight, and `spec/no-instructions.test.ts` checks this
file along with the built page.

## Credits

Music and the two result stings are third-party audio files in `public/`; the
per-keystroke sound is synthesised in the browser with Web Audio.
