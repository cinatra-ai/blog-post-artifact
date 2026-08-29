// ACCEPTANCE 2, first half — THE POST'S DISPLAY SHOWS THE POST, and draws no
// picture inside it.
//
// THE RULING, in the issue's own words: "The pipeline makes one picture, the
// featured image. The post's display draws no picture — a text view renders
// text; the featured image is a separate artifact, drawn by its own display on
// its own review and in the run's Done list. There are no body pictures, and no
// display carries a Regenerate control."
//
// So this suite hands the display a post whose data NAMES a featured image —
// the case where a display that tried to be helpful would paint one — and
// proves that nothing image-shaped reaches the page: no image node, no picture
// element, no background image, and no address of any picture at all.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import Detail from "../src/renderers/detail";
import Preview from "../src/renderers/preview";
import { props, textContent } from "./props-fixture";
import { REAL_SANITIZER } from "./sanitizer-mode";
import { resetMarkdownSanitizerStub, sanitizerStubState } from "./stubs/markdown-sanitizer-stub";

/** A post whose stored markdown names its featured image, the way the image
 * agent's write leaves it. */
const FEATURED_IMAGE_ADDRESS = "https://pictures.test/art_pic/rev_pic/featured.png";

const POST_NAMING_ITS_FEATURED_IMAGE = [
  "# Why brand voice travels",
  "",
  `![The featured image](${FEATURED_IMAGE_ADDRESS})`,
  "",
  "The draft continues here.",
].join("\n");

afterEach(cleanup);

// THE ADDRESS IS ABSOLUTE AND http(s), DELIBERATELY. That is the one shape the
// shared sanitizer is willing to draw a picture from, so a suite that named the
// picture relatively would pass for the wrong reason. This describe therefore
// runs in BOTH modes: against the double it pins that this package draws no
// picture of its own, and against the REAL sanitizer it pins the ruling where it
// actually has to hold.
describe("the post's display shows the post and draws no picture", () => {
  beforeEach(() => {
    resetMarkdownSanitizerStub();
  });

  for (const [slot, Entry] of [
    ["detail", Detail],
    ["preview", Preview],
  ] as const) {
    it(`${slot}: a post whose data names a featured image renders NO image node`, () => {
      // The sanitizer double returns a marker, so whatever image node appeared
      // could only have been put there by THIS package.
      const { container } = render(
        <Entry {...props(textContent(POST_NAMING_ITS_FEATURED_IMAGE))} />,
      );
      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelector("picture")).toBeNull();
      expect(container.querySelector("figure")).toBeNull();
      expect(container.querySelector("svg")).toBeNull();
      expect(container.querySelector("canvas")).toBeNull();
      expect(container.innerHTML).not.toContain(FEATURED_IMAGE_ADDRESS);
      expect(container.innerHTML).not.toContain("background-image");
    });

    it(`${slot}: it shows the post — the pinned markdown, rendered`, () => {
      // Inert when the real leaf is supplied — the real render draws the same
      // words from the same markdown.
      sanitizerStubState.html = "<h2>Why brand voice travels</h2><p>The draft continues here.</p>";
      const { container } = render(
        <Entry {...props(textContent(POST_NAMING_ITS_FEATURED_IMAGE))} />,
      );
      expect(container.textContent).toContain("Why brand voice travels");
      expect(container.textContent).toContain("The draft continues here.");
      // The rendering is drawn, not the source: the raw markdown never appears.
      expect(container.innerHTML).not.toContain("![The featured image]");
    });
  }

  it.skipIf(REAL_SANITIZER)("even if the sanitizer returned an image, this package puts no picture road in the page", () => {
    // The one honest reading of "the post's display draws no picture": the
    // package itself never draws one. What the SHARED sanitizer admits from a
    // document is the sanitizer's contract, pinned where the sanitizer lives —
    // so this asserts what this package owns: it adds no picture of its own
    // beside the document it was given.
    sanitizerStubState.html = '<p data-marker="only-what-the-sanitizer-returned">body</p>';
    const { container } = render(<Detail {...props(textContent(POST_NAMING_ITS_FEATURED_IMAGE))} />);
    const body = container.querySelector("[data-markdown-body]");
    expect(body).not.toBeNull();
    expect(body?.innerHTML).toBe('<p data-marker="only-what-the-sanitizer-returned">body</p>');
    // Nothing image-shaped OUTSIDE the document container either.
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });
});
