// The drawn text, and the floor beside it — the chrome both slots share, so the
// full view and the compact one can never disagree about what a
// blog post looks like or about what they say when there is none. It is the same
// chrome pattern the fleet's markdown base draws, so one artifact does not read
// as a different product from the next.
//
// THE ONE INJECTION POINT. The html handed to the container below comes from the
// SDK's shared markdown sanitizer and from nowhere else: the sanitizer is the
// boundary, and nothing downstream re-sanitizes. Keeping the injection in ONE
// component is what makes that reviewable — a second injection anywhere in this
// package would be a second, unreviewed road for stored content into the page,
// and the package's own test refuses one.
//
// READ-ONLY, ON EVERY SURFACE. Both slots draw and nothing else: no tabs, no
// editing affordance, no save, and no Regenerate — Regenerate is the review
// screen's control, never a renderer's. The Code and Preview tabs belong to the
// artifact page's markdown editor, which is its own item and its own wave; a
// review card mounts this display exactly as it is.
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
      <div
        data-markdown-body=""
        className={`markdown-body text-sm leading-relaxed ${compact ? COMPACT_BODY_CLASSES : FULL_BODY_CLASSES}`}
        dangerouslySetInnerHTML={{ __html: view.html }}
      />
      {view.truncated ? (
        <p className="mt-4 text-xs text-muted-foreground">
          {`Showing the first ${view.projectedByteLength.toLocaleString("en-US")} of ${view.byteLength.toLocaleString("en-US")} bytes. Download it to read the whole of it.`}
        </p>
      ) : null}
    </article>
  );
}
