// "it teaches itself: no instructions anywhere, on screen or off"
//
// This is the line the brief says can't be faked, and four people's hands on
// the keyboard at the crit are the real test of it. What a machine *can* hold
// is the half that is about text: that no sentence anywhere in the shipped
// page, in the script that writes it at runtime, or in the README, ever
// explains how to play. A sensor, not a substitute — but it is the difference
// between failing that line by accident and failing it on purpose.
//
// Deliberately NOT checked: `aria-label` and the meta description. Both exist
// so a screen reader or a link preview can say what the picture already says
// to everyone else; suppressing them would take an affordance away from one
// group of players rather than from all of them. They are held to being
// descriptive instead — see CLAUDE.md.

import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const DIST = resolve("dist");

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

const shipped = files(DIST).map((path) => relative(DIST, path).split(sep).join("/"));

const pages = shipped
  .filter((name) => name.endsWith(".html"))
  .map((name) => ({ name, html: readFileSync(join(DIST, name), "utf8") }));

/**
 * What a player actually sees before touching anything. Comments and script
 * bodies are excluded: neither is on screen.
 *
 * Text nodes are joined with a space rather than concatenated. `textContent`
 * would run "</h1><p>" together into "BOULDERType fast to run!", and a phrase
 * fused to the word before it is still a sentence a player reads — it should
 * not be a way past this check.
 */
function visibleText(html: string): string {
  const doc = new JSDOM(html).window.document;
  for (const node of doc.querySelectorAll("script, style")) node.remove();
  const walker = doc.createTreeWalker(doc.body, 4 /* SHOW_TEXT */);
  const parts: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    parts.push(node.textContent ?? "");
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

// Phrases that would each, on their own, be a how-to-play. None of them
// appears in the passage the player types, so a hit is always a real one.
const TELLING = [
  "how to play",
  "instruction",
  "press any key",
  "type fast",
  "start typing",
  "use the keyboard",
  "use your keyboard",
  "tutorial",
  "objective",
  "your goal",
];

/**
 * Code is not prose. This file is called `no-instructions.test.ts`, and naming
 * it in the README is not the same as writing one — so code spans and bare
 * filenames come out before the scan.
 *
 * Deliberately not done with word boundaries around the phrase: the first
 * version of this check used a lookbehind, and "BOULDER" running straight into
 * "Type fast to run!" with no whitespace between the tags was enough to slip
 * past it. Narrow the haystack, not the needle.
 */
function prose(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/[\w./-]+\.(?:ts|js|mjs|css|html|md|json|png|mp3|yml)\b/gi, " ");
}

function telling(text: string): string[] {
  const lower = prose(text).toLowerCase();
  return TELLING.filter((phrase) => lower.includes(phrase));
}

describe("spec: no instructions anywhere, on screen", () => {
  it("built a page to check", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  for (const { name, html } of pages) {
    it(`${name} explains nothing`, () => {
      expect(telling(visibleText(html))).toEqual([]);
    });

    it(`${name} carries no prose at all`, () => {
      // The only words that ship are the game's name and the labels on the
      // result screen. Everything else on screen is a picture. Anything
      // longer than this means a sentence crept in.
      expect(visibleText(html).length).toBeLessThan(90);
    });

    it(`${name} has no help affordance hiding in the markup`, () => {
      const doc = new JSDOM(html).window.document;
      expect(doc.querySelector("dialog")).toBeNull();
      expect(
        doc.querySelector('[class*="hint" i], [class*="help" i], [id*="instruction" i]'),
      ).toBeNull();
    });
  }
});

describe("spec: no instructions anywhere, off screen", () => {
  it("the script never writes an explanation at runtime", () => {
    // The page is mostly empty until JavaScript fills it, so the built bundle
    // is where a hint would actually hide.
    for (const name of shipped.filter((f) => f.endsWith(".js"))) {
      expect(telling(readFileSync(join(DIST, name), "utf8")), name).toEqual([]);
    }
  });

  it("the README does not stand in for the missing instructions", () => {
    expect(telling(readFileSync(resolve("README.md"), "utf8"))).toEqual([]);
  });
});

describe("spec: the opening screen invites the first move", () => {
  // What replaces the instructions: a caret blinking at the point the passage
  // is waiting to be typed from, with the boulder already trembling behind
  // the runner. The caret's position in the markup is the affordance, so it
  // is worth pinning — moving it to the end of the line would quietly break
  // the one thing standing in for a tutorial.
  const home = pages.find(({ name }) => name === "index.html");

  it("ships a caret sitting where the passage is waiting", () => {
    const doc = new JSDOM(home?.html ?? "").window.document;
    const caret = doc.querySelector("[data-caret]");
    expect(caret).toBeTruthy();
    expect(caret?.previousElementSibling?.hasAttribute("data-errors")).toBe(true);
    expect(caret?.nextElementSibling?.hasAttribute("data-rest")).toBe(true);
  });

  it("ships the boulder and the runner as the picture, before any text", () => {
    const doc = new JSDOM(home?.html ?? "").window.document;
    const stage = doc.querySelector("[data-stage]");
    expect(stage?.querySelector("[data-boulder]")).toBeTruthy();
    expect(stage?.querySelector("[data-runner]")).toBeTruthy();
    // the scene comes first in the document, so it is what loads and what a
    // screen reader reaches first
    expect(stage?.compareDocumentPosition(doc.querySelector("[data-passage]")!)).toBe(
      doc.defaultView!.Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
