"use client";

// DETAIL renderer (slot `detail`) — the post's full view, with its two tabs.
//
// WHAT IT DRAWS: the Code tab, showing the post's markdown as it is written and
// syntax-highlighted, and the Preview tab, showing the same post rendered to
// safe html by the SDK's shared markdown sanitizer. Only the active tab's view
// is on screen; the two are never side by side.
//
// THE CHROME TRAVELS WITH THE DISPLAY. The drawing: "The same display is drawn,
// unchanged, wherever the artifact is read — the artifact page here, the review
// step on the run page and the review card in a conversation. A display's
// chrome travels with it: what it carries here it carries there." So this is
// the one display every reading surface mounts, and the strip is drawn on all
// of them.
//
// EDITABLE ONLY WHERE THE HOST SAYS SO. The host hands this display an EDIT
// CAPABILITY on its props: a grant, minted by the artifact's own page for a
// reader with write rights, or a NAMED REFUSAL, minted by every other surface —
// the review card above all. This module makes no judgement of its own about
// who may write: it draws what the capability says.
//
// A CLIENT COMPONENT, because editing in place is: the caret, the idle pause
// and the saving indicator are all browser-side. It still requests NO host
// ports and still never fetches its own content — the post arrives on the props
// through the versioned server content channel, which is what lets this display
// draw inside a third-party application.
//
// NEVER BLANK, NEVER THROWN: content it cannot draw becomes a named floor, and
// a floor has no tabs — there is nothing to switch between.

import type { ReactElement } from "react";

import type { ArtifactRendererProps } from "../artifact-renderer-props";
import { TextDocument } from "./text-document";
import { TextTabbedDisplay } from "./text-tabs";
import { resolveTextView } from "./text-view";

export default function ArtifactDetail(props: ArtifactRendererProps): ReactElement {
  const view = resolveTextView(props);
  if (view.kind === "floor") {
    return <TextDocument view={view} slot="detail" compact={false} />;
  }
  return <TextTabbedDisplay view={view} edit={props.edit} slot="detail" />;
}
