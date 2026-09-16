// THE CODE VIEW'S HIGHLIGHTER — the markdown the person is editing, drawn with
// its own syntax visible.
//
// THE DRAWING ASKS FOR THIS BY NAME: "Code shows the markdown as it is written —
// SYNTAX-HIGHLIGHTED, never plain text: the application's own highlighter, with
// the application's own light and dark colours."
//
// WHY THIS PACKAGE CARRIES ITS OWN, AND TAKES NO DEPENDENCY. A general grammar
// engine (a highlighter shipping a language grammar per language, or one that
// fetches a grammar at run time) buys nothing here and costs a great deal: this
// view highlights exactly ONE language, in five token classes, inside a display
// that must bundle whole and reach no network at run time — an extension display
// that fetched a grammar would paint nothing inside a third-party application,
// which is the failure the whole content channel exists to prevent. So the
// tokenizer is ~120 lines, it is a dependency of nothing, and it is tested here.
//
// THE INVARIANT THAT MAKES THE EDITOR POSSIBLE: the spans this returns
// CONCATENATE BACK TO THE INPUT, character for character. The editable code view
// is a transparent textarea over a highlighted `<pre>`; if the highlighted text
// differed from the text by even one character, the caret and the letters under
// it would drift apart. The package's own test pins that for every input it
// tries, and nothing here ever drops, inserts or rewrites a character — the
// markers are KEPT and coloured, never hidden.

/** The five classes the drawing colours, plus the uncoloured remainder. */
export type TextTokenKind =
  | "text"
  | "heading"
  | "strong"
  | "emphasis"
  | "code"
  | "link"
  | "marker";

export interface TextToken {
  text: string;
  kind: TextTokenKind;
}

/** A fence opens and closes on a line of three or more backticks or tildes. */
const FENCE = /^\s{0,3}(?:`{3,}|~{3,})/;
const HEADING = /^\s{0,3}#{1,6}\s/;
const LIST_MARKER = /^(\s*)([-*+]\s|\d{1,9}[.)]\s)/;
const QUOTE_MARKER = /^(\s*)(>\s?)/;

/**
 * The inline scanner for CODE SPANS, BOLD and EMPHASIS, in ONE regular
 * expression with named alternatives, so a single left-to-right pass covers the
 * line and everything it does not match stays plain text. Order matters: code
 * spans win over emphasis, so a `**` that lives inside backticks is never read
 * as bold.
 *
 * EVERY ALTERNATIVE HERE FINISHES IN LINEAR TIME: each quantified class
 * excludes the delimiter that would close it, so a scan that is going to fail
 * stops at the next delimiter instead of swallowing the line.
 *
 * LINKS ARE NOT IN THIS EXPRESSION, and that is what `findLink` below is for.
 * Written as a regular expression the link alternative was
 * `\[[^\]\n]*\]\([^)\n]*\)`, whose two classes admit the `[` their own
 * alternative opens with: on a line of nothing but `[`, a scan begun at one
 * bracket ran to the end of the line before failing, once per bracket, so the
 * cost grew with the SQUARE of the line's length — a display that hangs on a
 * pasted document, since the text this tokenizer runs over is the document's
 * own body and comes from outside the package. Merely excluding `[` from those
 * two classes buys the linear time but CHANGES WHAT THE PERSON SEES: an
 * ordinary link whose target carries a bracket, `[a](http://x/q[1])`, would
 * stop being coloured at all. The scanner below is linear AND reads exactly
 * what the old expression read, character for character; the package's own test
 * pins both halves.
 */
const INLINE =
  /(`+[^`]*`+)|(\*\*[^*\n]+\*\*|__[^_\n]+__)|(\*[^*\n]+\*|_[^_\n]+_)/g;

/** Where a link begins and ends, in the coordinates of the line it was found in. */
interface LinkSpan {
  index: number;
  end: number;
}

/**
 * The first link at or after `from`, read EXACTLY as the old link alternative
 * read it, in time linear in the length scanned.
 *
 * The old alternative was DETERMINISTIC even though it was written as a
 * backtracking pattern: `[^\]\n]*` excludes `]`, so the link TEXT always ran to
 * the FIRST `]` before a newline, and `[^)\n]*` excludes `)`, so the TARGET
 * always ran to the FIRST `)` before a newline. There was never a choice to
 * make, only a cost to pay — the engine re-walked the same characters once per
 * candidate `[`. This walks them ONCE: `close` and `paren` only ever move
 * FORWARD, because the first `]` after a later `[` is never earlier than the
 * first `]` after an earlier one.
 *
 * A link may not cross a newline (both classes excluded `\n`), so the search
 * runs inside one newline-free segment at a time. The caller passes a single
 * line, so in practice there is exactly one segment.
 */
function findLink(line: string, from: number): LinkSpan | null {
  let segmentStart = from;
  while (segmentStart <= line.length) {
    const newline = line.indexOf("\n", segmentStart);
    const limit = newline === -1 ? line.length : newline;
    const hit = findLinkInSegment(line, segmentStart, limit);
    if (hit) return hit;
    if (newline === -1) return null;
    segmentStart = newline + 1;
  }
  return null;
}

function findLinkInSegment(
  line: string,
  from: number,
  limit: number,
): LinkSpan | null {
  let close = from;
  let paren = from;
  let at = line.indexOf("[", from);
  while (at !== -1 && at < limit) {
    if (close < at + 1) close = at + 1;
    while (close < limit && line[close] !== "]") close++;
    // No `]` left in this segment, so no later `[` in it can close either.
    if (close >= limit) return null;
    if (line[close + 1] === "(") {
      const target = close + 2;
      if (paren < target) paren = target;
      while (paren < limit && line[paren] !== ")") paren++;
      // Likewise: no `)` left, so no later candidate can finish either.
      if (paren >= limit) return null;
      return { index: at, end: paren + 1 };
    }
    at = line.indexOf("[", at + 1);
  }
  return null;
}

function pushText(out: TextToken[], text: string): void {
  if (text.length === 0) return;
  const last = out[out.length - 1];
  if (last && last.kind === "text") last.text += text;
  else out.push({ text, kind: "text" });
}

/**
 * Walk one line, taking whichever of the two scanners — the regular expression
 * or the link reader — offers the EARLIER match, which is what the single
 * expression's leftmost rule did while the link alternative still lived in it.
 * The two can never tie: a code span opens on a backtick, bold and emphasis on
 * `*` or `_`, and a link on `[`.
 */
function scanInline(out: TextToken[], line: string): void {
  let at = 0;
  INLINE.lastIndex = 0;
  let inline: RegExpExecArray | null = INLINE.exec(line);
  let link: LinkSpan | null = findLink(line, 0);

  while (inline !== null || link !== null) {
    const takeLink =
      link !== null && (inline === null || link.index < inline.index);
    let index: number;
    let whole: string;
    let kind: TextTokenKind;

    if (takeLink && link !== null) {
      index = link.index;
      whole = line.slice(link.index, link.end);
      kind = "link";
    } else if (inline !== null) {
      const [matched, code, strong, emphasis] = inline;
      index = inline.index;
      whole = matched;
      kind = code ? "code" : strong ? "strong" : emphasis ? "emphasis" : "text";
    } else {
      break;
    }

    pushText(out, line.slice(at, index));
    out.push({ text: whole, kind });
    at = index + whole.length;

    // A candidate that began before the token just taken is stale; one that
    // begins after it is still the earliest of its kind, so it is kept.
    if (inline !== null && inline.index < at) {
      INLINE.lastIndex = at;
      inline = INLINE.exec(line);
    }
    if (link !== null && link.index < at) link = findLink(line, at);
  }

  pushText(out, line.slice(at));
}

/**
 * Tokenize markdown for the code view.
 *
 * TOTAL: every character of `source` appears exactly once, in order, in the
 * result. A construct the tokenizer does not know is plain text, never a
 * dropped character.
 */
export function highlightMarkdownSource(source: string): TextToken[] {
  const out: TextToken[] = [];
  const lines = source.split("\n");
  let inFence = false;

  lines.forEach((line, index) => {
    const isFenceLine = FENCE.test(line);
    if (isFenceLine) {
      out.push({ text: line, kind: "code" });
      inFence = !inFence;
    } else if (inFence) {
      // Inside a fence nothing is markdown — a `#` there is a comment in
      // somebody's shell snippet, and colouring it as a heading would be a lie
      // about their code.
      out.push({ text: line, kind: "code" });
    } else if (HEADING.test(line)) {
      out.push({ text: line, kind: "heading" });
    } else {
      const quote = QUOTE_MARKER.exec(line);
      const list = quote ? null : LIST_MARKER.exec(line);
      const marker = quote ?? list;
      if (marker) {
        pushText(out, marker[1]);
        out.push({ text: marker[2], kind: "marker" });
        scanInline(out, line.slice(marker[0].length));
      } else {
        scanInline(out, line);
      }
    }
    if (index < lines.length - 1) pushText(out, "\n");
  });

  return out;
}

/** The concatenation invariant, as a function, so the display and the test ask
 *  the same question rather than two similar ones. */
export function tokensJoin(tokens: readonly TextToken[]): string {
  return tokens.map((t) => t.text).join("");
}
