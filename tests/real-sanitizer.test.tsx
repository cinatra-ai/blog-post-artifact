// THE REAL SURFACE, not the double: this suite runs only when the SDK tree that
// publishes the shared markdown sanitizer is supplied, and it mounts the same
// display entries against the REAL sanitizer — the one the host resolves when it
// builds this display.
//
// WHY IT EXISTS BESIDE THE CONTRACT SUITE. The contract suite runs against an
// inert recording double, which is the only way a standalone repository can pin
// THIS package's half of the boundary (the pinned text goes to the sanitizer
// once, its output is injected verbatim, and stored content reaches the DOM by
// no other road). A double is never a sanitizer, so it proves nothing about what
// actually appears on the page. This suite does: real markdown in, real safe
// html out, drawn on every surface.
//
// It does NOT re-pin what the sanitizer admits and strips — that contract
// belongs to the sanitizer and is pinned where the sanitizer lives.

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import Detail from "../src/renderers/detail";
import Preview from "../src/renderers/preview";
import { islandProps, props, textContent } from "./props-fixture";
import { REAL_SANITIZER } from "./sanitizer-mode";

const BODY = [
  "# A heading the surface owns",
  "",
  "A paragraph with **strong** words and a [link](https://example.test).",
  "",
  "<img src=x onerror=alert(1)>",
].join("\n");

/** The one shape the shared sanitizer is willing to draw a picture from: an
 * absolute http(s) address. A relative one it refuses on its own, which would
 * make a suite named for the ruling pass for the wrong reason. */
const PICTURE_ADDRESS = "https://pictures.test/art_pic/rev_pic/featured.png";

const BODY_NAMING_A_PICTURE = [
  "# A heading the surface owns",
  "",
  `![The featured image](${PICTURE_ADDRESS})`,
  "",
  "The words around it.",
].join("\n");

afterEach(cleanup);

describe.skipIf(!REAL_SANITIZER)("the display draws through the REAL shared sanitizer", () => {
  for (const [name, Entry, build] of [
    ["the artifact page", Detail, props],
    ["the review card", Preview, props],
    ["inside a third-party application", Preview, islandProps],
  ] as const) {
    it(`on ${name} it draws the document's real words, at the pinned revision`, () => {
      const { container } = render(<Entry {...build(textContent(BODY))} />);
      const body = container.querySelector("[data-markdown-body]");
      expect(body).not.toBeNull();
      expect(body?.textContent).toContain("A heading the surface owns");
      expect(body?.textContent).toContain("strong");
      expect(container.querySelector("[data-artifact-renderer]")?.getAttribute("data-revision")).toBe("rev_1");
    });

    it(`on ${name} the document's own markup never reaches the page as markup`, () => {
      // The sanitizer is the boundary and this package re-sanitizes nothing;
      // what this asserts is that the boundary held on the real road.
      const { container } = render(<Entry {...build(textContent(BODY))} />);
      expect(container.innerHTML).not.toContain("onerror");
      expect(container.querySelector("script")).toBeNull();
      // The rendering is drawn, not the source.
      expect(container.innerHTML).not.toContain("# A heading the surface owns");
    });

    it(`on ${name} a document naming a picture draws NO image node`, () => {
      // THE RULING, on the road that decides it: the shared sanitizer WILL draw
      // a picture from a markdown image at an absolute http(s) address, and this
      // display must still draw none. The name the picture carried stays, so a
      // reader is told there was one.
      const { container } = render(<Entry {...build(textContent(BODY_NAMING_A_PICTURE))} />);
      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelector("picture")).toBeNull();
      expect(container.querySelector("svg")).toBeNull();
      expect(container.querySelector("canvas")).toBeNull();
      expect(container.innerHTML).not.toContain(PICTURE_ADDRESS);
      expect(container.innerHTML).not.toContain("background-image");
      expect(container.textContent).toContain("The featured image");
      expect(container.textContent).toContain("The words around it.");
    });

    it(`on ${name} the surface keeps the only top-level heading`, () => {
      // Both slots demote: the artifact page and the review card own their own
      // first-level heading, so a document's own must not become a second one.
      const { container } = render(<Entry {...build(textContent(BODY))} />);
      expect(container.querySelector("[data-markdown-body] h1")).toBeNull();
      expect(container.querySelector("[data-markdown-body] h2")).not.toBeNull();
    });
  }

  it("an empty document floors instead of drawing an empty panel", () => {
    const { container } = render(<Detail {...props(textContent("   \n   "))} />);
    expect(container.querySelector("[data-floor='empty-document']")).not.toBeNull();
  });
});
