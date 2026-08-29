// PREVIEW renderer (slot `preview`) — the same content, compact.
//
// The `preview` slot is where a surface shows a piece of work beside other
// things: the review card, a representation viewer, a list of work — and, inside
// a third-party application, the review card drawn in the island. It draws the
// SAME sanitized rendering the full view draws — one artifact, one appearance —
// in a clipped container, so a long draft takes a card's worth of room instead
// of the whole surface.
//
// v1 renderer: no host ports, no fetching, read-only, no Regenerate, and the
// same named floors as the full view.

import type { ReactElement } from "react";

import type { ArtifactRendererProps } from "../artifact-renderer-props";
import { TextDocument } from "./text-document";
import { resolveTextView } from "./text-view";

export default function ArtifactPreview(props: ArtifactRendererProps): ReactElement {
  return <TextDocument view={resolveTextView(props)} slot="preview" compact />;
}
