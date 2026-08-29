// The decision leaf both slots share: it maps the authorized snapshot to exactly
// one of two outcomes, and it is the ONE module in this package that reaches the
// sanitizer.
//
//   `document` — the pinned text, already rendered to safe html by the SDK's
//     shared markdown sanitizer, with what the channel said about it (the pinned
//     revision, and whether the host cut the text to its cap).
//   `floor` — a NAMED reason it cannot be drawn. Never blank, never a throw: a
//     display that threw would take the surface around it down with it.
//
// NOTHING IS SANITIZED HERE. The html comes from the one shared sanitizer and
// from nowhere else; this module chooses whether to ask for it and what to say
// when there is nothing to ask about. This package carries no sanitizer of its
// own, and must never carry one — that is the whole reason the leaf entry
// exists.
//
// HEADINGS ARE DEMOTED on both slots: the surfaces that mount these displays —
// the artifact page and the review card — already own the only top-level
// heading, so a document's own first level becomes the second rather than a
// second first level.

import { renderSanitizedMarkdown } from "@cinatra-ai/sdk-extensions/markdown-sanitizer";

import { ARTIFACT_CONTENT_CHANNEL_VERSION } from "../artifact-content-channel";
import type { ArtifactRendererProps } from "../artifact-renderer-props";
import {
  TEXT_DISPLAY_PROPS_API_VERSION,
  type TextFloorReason,
  type TextRendererInput,
  type TextView,
} from "./text-view-contract";

export { TEXT_DISPLAY_PROPS_API_VERSION, textFloorMessage } from "./text-view-contract";
export type { TextFloorReason, TextRendererInput, TextView } from "./text-view-contract";

function floor(reason: TextFloorReason): TextView {
  return { kind: "floor", reason };
}

/** A TEXT VIEW RENDERS TEXT — the ruling, held on the REAL road and not only in
 * this package's own code.
 *
 * The shared sanitizer admits a picture from a document: for a markdown image at
 * an absolute http(s) address its image renderer emits an image element. The
 * ruling for this pipeline is that ONE picture is made, the featured image, and
 * that it is drawn by its own extension's display on its own surfaces — never
 * inside the post. So the one image node the sanitizer is able to emit is taken
 * back out here, and the name the picture carried is left in the reader's place
 * of it, exactly as the sanitizer itself leaves it for a picture whose address it
 * refuses.
 *
 * THIS IS NOT A SECOND SANITIZER, and it cannot become one. It decides nothing
 * about what is safe: the boundary is still the one shared leaf, and the leaf
 * emits no author markup at all (its raw-html renderer returns the empty
 * string), so the ONLY image element in its output is the one its own image
 * renderer wrote, in the exact shape matched here. The name is re-emitted as
 * TEXT, and it was attribute-escaped by the leaf before it got here.
 *
 * THE DURABLE HOME for this is a no-media mode on the sanitizer leaf itself, so
 * every text display in the fleet gets it without repeating it; that is a host
 * change, and it belongs to the wave that may make one.
 */
export function withoutPictures(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const name = /\salt="([^"]*)"/i.exec(tag)?.[1] ?? "";
    return `<span class="text-muted-foreground">[image]${name ? ` ${name}` : ""}</span>`;
  });
}

/** Resolve what to draw. Total: it returns a view for every input. */
export function resolveTextView(props: TextRendererInput): TextView {
  if (props === null || props === undefined || typeof props !== "object" || Array.isArray(props)) {
    return floor("malformed-props");
  }

  const snapshot = props as Partial<ArtifactRendererProps>;

  // STRICT, in both directions: a snapshot that does not SAY which version it
  // was built at is as unreadable as one built at another version. The host
  // resolves the display and builds the snapshot at the version the display
  // declares, so a snapshot without that stamp is not one this display agreed
  // to read.
  if (snapshot.propsApiVersion !== TEXT_DISPLAY_PROPS_API_VERSION) {
    return floor("props-version");
  }

  const content = snapshot.content;
  if (content === null || content === undefined || typeof content !== "object") {
    // The snapshot carried no projection at all — a surface that does not hand
    // its displays content. Held APART from a projection that says, itself,
    // that there is nothing stored: this display must never report an unwired
    // surface as an artifact with nothing in it.
    return floor("content-unavailable");
  }

  // The channel's OWN version is checked before anything on the projection is
  // read, `none` included: a projection built at another channel version may
  // spell its own absence differently, and reading it at this shape would be a
  // guess.
  if (content.channelVersion !== ARTIFACT_CONTENT_CHANNEL_VERSION) {
    return floor("channel-version");
  }

  // THE PROJECTION IS VALIDATED BEFORE IT IS BELIEVED. At this channel version
  // the shape is known exactly, so a variant this display does not recognise is
  // a projection it cannot read, and it says THAT rather than dressing it up as
  // a legitimate answer about the artifact.
  const projection = content as { [key: string]: unknown };
  const kind = projection.kind;

  if (kind === "none") {
    const reason = projection.reason;
    if (reason === "over-cap") return floor("content-over-cap");
    if (reason === "unsupported-form") return floor("content-unsupported-form");
    if (reason === "absent") return floor("content-absent");
    return floor("invalid-content-projection");
  }

  if (kind === "configuration" || kind === "page") {
    return floor("content-not-text");
  }

  if (kind !== "text") {
    return floor("invalid-content-projection");
  }

  const text = projection.text;
  const contentRevisionId = projection.representationRevisionId;
  const byteLength = projection.byteLength;
  const projectedByteLength = projection.projectedByteLength;
  const truncated = projection.truncated;
  if (
    typeof text !== "string" ||
    typeof contentRevisionId !== "string" ||
    contentRevisionId.length === 0 ||
    typeof byteLength !== "number" ||
    typeof projectedByteLength !== "number" ||
    typeof truncated !== "boolean" ||
    projection.encoding !== "utf-8"
  ) {
    return floor("invalid-content-projection");
  }

  // THE PINNED REVISION AND THE DRAWN REVISION ARE THE SAME ONE, or nothing is
  // drawn. The surface says which revision it is showing; the channel says
  // which revision it read the bytes from. If those disagree — or if the
  // artifact has no materialized representation at all while the projection
  // claims one — this display would be labelling one revision's words with
  // another's, and that is worse than drawing nothing.
  const representation = snapshot.representation as { revisionId?: unknown } | null | undefined;
  if (
    representation === null ||
    representation === undefined ||
    typeof representation !== "object" ||
    representation.revisionId !== contentRevisionId
  ) {
    return floor("content-revision-mismatch");
  }

  // A display that throws takes the surface around it down. The sanitizer is
  // the one call here that runs somebody else's document through a parser, so a
  // failure inside it becomes a named floor and nothing else: whatever went
  // wrong, no markup from a failed render is drawn.
  let html: string;
  try {
    html = withoutPictures(renderSanitizedMarkdown(text, { demoteHeadings: true }));
  } catch {
    return floor("render-failed");
  }
  if (typeof html !== "string" || html.trim().length === 0) {
    return floor("empty-document");
  }

  return {
    kind: "document",
    html,
    revisionId: contentRevisionId,
    truncated,
    byteLength,
    projectedByteLength,
  };
}
