// A sensor for a failure mode with no symptoms.
//
// The tunnel is built as SVG strings turned into data URIs. If one is
// malformed, or an internal `url(#id)` reference does not survive encoding,
// the browser silently drops the background image: the build is green, the
// tests are green, and the page is a black rectangle. Nothing else in this
// repo would notice.
//
// It has already happened once — `#` was written pre-encoded as `%23`, which
// `encodeURIComponent` then turned into `%2523`, killing the torch glow and
// the film grain.

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { ceilingTile, floorTile, grainTile, svgUrl, wallTile } from "../src/scenery";

const { DOMParser } = new JSDOM().window;

const tiles = {
  wall: wallTile(),
  ceiling: ceilingTile(),
  floor: floorTile(),
  grain: grainTile(),
};

function parse(svg: string): Document {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  expect(doc.querySelector("parsererror"), "the tile is not well-formed XML").toBeNull();
  return doc;
}

describe("the tunnel tiles are real SVG", () => {
  for (const [name, svg] of Object.entries(tiles)) {
    describe(name, () => {
      it("parses", () => {
        const doc = parse(svg);
        expect(doc.documentElement.tagName).toBe("svg");
        // Without the namespace a data URI renders as nothing at all.
        expect(doc.documentElement.getAttribute("xmlns")).toBe(
          "http://www.w3.org/2000/svg",
        );
      });

      it("draws something", () => {
        expect(parse(svg).querySelectorAll("rect, path, circle, ellipse").length)
          .toBeGreaterThan(0);
      });

      it("resolves every url(#id) it uses", () => {
        const doc = parse(svg);
        for (const [, id] of svg.matchAll(/url\(#([\w-]+)\)/g)) {
          expect(doc.getElementById(id), `${name} references #${id}, which is not in it`)
            .toBeTruthy();
        }
      });

      it("survives being turned into a data URI", () => {
        const url = svgUrl(svg);
        expect(url.startsWith('url("data:image/svg+xml,')).toBe(true);
        const encoded = url.slice('url("data:image/svg+xml,'.length, -2);
        expect(decodeURIComponent(encoded)).toBe(svg);
        // the specific bug: a '#' encoded twice
        expect(encoded).not.toContain("%2523");
      });

      it("uses colours a presentation attribute can actually parse", () => {
        // SVG attribute colour parsing is narrower than a stylesheet's, so
        // these stay hex rather than hsl()/oklch().
        expect(svg).not.toMatch(/hsl\(|oklch\(|color-mix\(/);
      });
    });
  }
});

describe("the tiles are the same tomb every time", () => {
  it("does not redraw itself on each call", () => {
    // Seeded, not random: a wall that reshuffles on refresh would make every
    // screenshot and every visual comparison worthless.
    expect(wallTile()).toBe(tiles.wall);
    expect(floorTile()).toBe(tiles.floor);
  });
});
