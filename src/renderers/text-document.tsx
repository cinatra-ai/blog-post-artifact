// The drawn text, and the floor beside it — the chrome this package's own
// display wears, so a blog post shown beside other work reads the same wherever
// it is shown, and says the same thing when there is no content to show. It is
// the same chrome pattern the fleet's markdown base draws, so one artifact does
// not read as a different product from the next.
//
// THE ONE INJECTION POINT. The html handed to `TextBody` below comes from the
// SDK's shared markdown sanitizer and from nowhere else: the sanitizer is the
// boundary, and nothing downstream re-sanitizes. Keeping the injection in ONE
// component is what makes that reviewable — a second injection anywhere in this
// package would be a second, unreviewed road for stored content into the page,
// and the package's own test refuses one. The tabbed display beside this module
// draws its Preview through THIS component for exactly that reason.
//
// READ-ONLY, HERE. This module draws and nothing else: no tabs, no editing
// affordance, no save, and no Regenerate — Regenerate is the review screen's
// control, never a renderer's. THE POST'S FULL VIEW IS THIS PACKAGE'S TO DRAW:
// the display registered for this extension's own type draws the post over its
// own Code and Preview tabs, and that strip lives in `text-tabs.tsx`, which
// draws the post itself through the body below. A display's chrome travels with
// it, so the same strip is drawn wherever the post is read.
//
// A TEXT VIEW RENDERS TEXT. Nothing here draws a picture, whatever the stored
// content names: a picture is its own artifact with its own display.

import type { ReactElement } from "react";

import { textFloorMessage, type TextView } from "./text-view";

export type TextSlot = "detail" | "preview";

/** The compact slot clips the text instead of growing the card it sits in. */
const COMPACT_BODY_CLASSES = "max-h-72 overflow-hidden";
const FULL_BODY_CLASSES = "max-w-none";

/** What this package's displays call themselves on every surface they draw on —
 * the handle a surface, a capture and a test all read. */
export const TEXT_RENDERER_NAME = "blog-post";

/**
 * THE ONE ROAD FROM A SANITIZED STRING INTO THE PAGE. Every surface in this
 * package that shows a rendered post goes through this component.
 */
export function TextBody({ html, compact }: { html: string; compact: boolean }): ReactElement {
  return (
    <div
      data-markdown-body=""
      className={`markdown-body text-sm leading-relaxed ${compact ? COMPACT_BODY_CLASSES : FULL_BODY_CLASSES}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * What the display says when the content channel could only carry part of the
 * post. Shared, so the plain reading and the tabbed one say it in the same
 * words — and so the tabbed one cannot quietly drop it, which would leave a
 * person editing a prefix of their own post without being told.
 */
export function TextTruncationNote({
  byteLength,
  projectedByteLength,
}: {
  byteLength: number;
  projectedByteLength: number;
}): ReactElement {
  return (
    <p className="mt-4 text-xs text-muted-foreground">
      {`Showing the first ${projectedByteLength.toLocaleString("en-US")} of ${byteLength.toLocaleString("en-US")} bytes. Download it to read the whole of it.`}
    </p>
  );
}

export function TextDocument({
  view,
  slot,
  compact,
}: {
  view: TextView;
  slot: TextSlot;
  compact: boolean;
}): ReactElement {
  if (view.kind === "floor") {
    return (
      <article
        className="soft-panel rounded-card overflow-hidden p-6 text-sm text-muted-foreground"
        data-artifact-renderer={TEXT_RENDERER_NAME}
        data-slot={slot}
        data-floor={view.reason}
      >
        {textFloorMessage(view.reason)}
      </article>
    );
  }

  return (
    <article
      className="soft-panel rounded-card overflow-hidden p-6"
      data-artifact-renderer={TEXT_RENDERER_NAME}
      data-slot={slot}
      data-revision={view.revisionId}
      {...(compact ? { "data-compact": "true" } : {})}
      {...(view.truncated ? { "data-truncated": "true" } : {})}
    >
      <TextBody html={view.html} compact={compact} />
      {view.truncated ? (
        <TextTruncationNote
          byteLength={view.byteLength}
          projectedByteLength={view.projectedByteLength}
        />
      ) : null}
    </article>
  );
}
