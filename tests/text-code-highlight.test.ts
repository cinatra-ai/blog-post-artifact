// @vitest-environment node
// THE CODE VIEW'S HIGHLIGHTER, PINNED — the two things the editable code view
// depends on, and the one thing a display that runs on somebody else's text
// must never do.
//
// THE INVARIANT (the module's own words): "the spans this returns CONCATENATE
// BACK TO THE INPUT, character for character." The editable code view is a
// transparent textarea over a highlighted `<pre>`, so a single dropped or
// inserted character would drift the caret away from the letters under it.
//
// THE CLASSIFICATION: the five classes the drawing colours have to land on the
// constructs they name, or the rewrite below would have bought its speed by
// changing what the person sees.
//
// THE TIME BOUND: the markdown reaching this tokenizer is the document's own
// body — library input, from outside. A tokenizer whose cost grows with the
// SQUARE of the input length hangs the display on a pasted document, so the
// pathological cases here are measured, not argued.

import { describe, expect, it } from "vitest";

import {
  highlightMarkdownSource,
  tokensJoin,
  type TextToken,
} from "../src/renderers/text-code-highlight";

/** The kind the tokenizer gave a given piece of text. */
function kindOf(tokens: readonly TextToken[], text: string): string | undefined {
  return tokens.find((t) => t.text === text)?.kind;
}

const SAMPLES: readonly string[] = [
  "",
  "plain words with no markdown at all",
  "a [link](https://example.com/a) in a sentence",
  "some `inline code` and **bold** and *emphasis*",
  "# A heading\n\nA paragraph under it.\n",
  "- a list item with `code`\n- another with [a link](/x)\n",
  "> a quote with **bold**\n> and a second line\n",
  "```ts\nconst x = 1; // # not a heading, **not** bold\n```\n",
  "unclosed [bracket and (paren left open",
  "__underscore bold__ and _underscore emphasis_",
  "an empty link []() and an empty code span ``",
  "a link whose target holds a bracket: [a](http://example.com/q[1])",
  "a bracket inside the text: [a[b](u) and a bare [ on its own",
  "trailing newline\n",
];

describe("highlightMarkdownSource", () => {
  it("concatenates back to the input, character for character", () => {
    for (const sample of SAMPLES) {
      expect(tokensJoin(highlightMarkdownSource(sample))).toBe(sample);
    }
  });

  it("colours the five classes the drawing names", () => {
    const tokens = highlightMarkdownSource(
      "a [link](https://example.com/a) with `code`, **bold** and *emphasis*",
    );
    expect(kindOf(tokens, "[link](https://example.com/a)")).toBe("link");
    expect(kindOf(tokens, "`code`")).toBe("code");
    expect(kindOf(tokens, "**bold**")).toBe("strong");
    expect(kindOf(tokens, "*emphasis*")).toBe("emphasis");
  });

  it("keeps a heading, a fence, a list marker and a quote marker in their classes", () => {
    expect(kindOf(highlightMarkdownSource("## Heading"), "## Heading")).toBe("heading");

    const fenced = highlightMarkdownSource("```\n# not a heading\n```");
    expect(fenced.every((t) => t.kind === "code" || t.text === "\n")).toBe(true);

    expect(kindOf(highlightMarkdownSource("- an item"), "- ")).toBe("marker");
    expect(kindOf(highlightMarkdownSource("> a quote"), "> ")).toBe("marker");
  });

  it("reads a link whose target holds characters of its own", () => {
    const tokens = highlightMarkdownSource("see [the docs](https://example.com/a(b)");
    expect(kindOf(tokens, "[the docs](https://example.com/a(b)")).toBe("link");
  });

  // WHAT THE SPEED-UP MAY NOT COST. Making the pass linear by excluding `[`
  // from the link classes would have been one character per class, and it would
  // have stopped colouring every one of these — including an ordinary link
  // whose URL carries a bracket, which is not exotic at all. The scanner reads
  // them exactly as the original expression did.
  it("keeps the whole link when a bracket appears in the text or the target", () => {
    expect(
      kindOf(
        highlightMarkdownSource("see [a](http://example.com/q[1]) here"),
        "[a](http://example.com/q[1])",
      ),
    ).toBe("link");
    expect(kindOf(highlightMarkdownSource("[a[b](u)"), "[a[b](u)")).toBe("link");
    expect(kindOf(highlightMarkdownSource("[a](u[v)"), "[a](u[v)")).toBe("link");
    expect(kindOf(highlightMarkdownSource("[![img](i)](u)"), "[![img](i)")).toBe(
      "link",
    );
  });

  // The link reader and the regular expression are two scanners now, so the
  // line where they interleave is worth pinning: the EARLIER match wins, and a
  // code span that opens inside a link's text is part of the link, not a token
  // of its own.
  it("takes the earlier of a link and a code span, as one expression did", () => {
    const tokens = highlightMarkdownSource("[a `b` c](u) then `d` then [e](f)");
    expect(kindOf(tokens, "[a `b` c](u)")).toBe("link");
    expect(kindOf(tokens, "`d`")).toBe("code");
    expect(kindOf(tokens, "[e](f)")).toBe("link");

    const codeFirst = highlightMarkdownSource("`x [y`](z)");
    expect(kindOf(codeFirst, "`x [y`")).toBe("code");
  });

});

// THE BOUND. Three hundred milliseconds is far above anything a linear pass
// needs for these lengths (the fixed expression finishes them in under a
// millisecond) and far below what a quadratic one costs (seconds), so the
// assertion separates the two shapes without pinning a machine's speed.
const BOUND_MS = 300;

/** Wall-clock cost of one highlight run, with its result checked so no engine
 *  can optimize the call away. */
function millisecondsToHighlight(source: string): number {
  const started = performance.now();
  const tokens = highlightMarkdownSource(source);
  const elapsed = performance.now() - started;
  expect(tokensJoin(tokens)).toBe(source);
  return elapsed;
}

describe("highlightMarkdownSource on pathological input", () => {
  it(
    "highlights a long run of opening brackets within the bound",
    { timeout: 30_000 },
    () => {
      expect(millisecondsToHighlight("[".repeat(60_000))).toBeLessThan(BOUND_MS);
    },
  );

  it(
    "highlights a long run of unclosed link openings within the bound",
    { timeout: 30_000 },
    () => {
      expect(millisecondsToHighlight("[](".repeat(30_000))).toBeLessThan(BOUND_MS);
    },
  );

  // The shape a bracket-excluding class would also have made fast, kept because
  // the scanner has to stay fast on a line that DOES end in a link — the case
  // where the old expression re-walked the whole line from every bracket.
  it(
    "highlights a long run of brackets that does close into a link",
    { timeout: 30_000 },
    () => {
      expect(
        millisecondsToHighlight("[".repeat(30_000) + "](http://example.com)"),
      ).toBeLessThan(BOUND_MS);
    },
  );
});
