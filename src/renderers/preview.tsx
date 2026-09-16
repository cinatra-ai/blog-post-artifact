// PREVIEW renderer (slot `preview`) — the same content, compact.
//
// The `preview` slot is where a surface shows a piece of work beside other
// things: a representation viewer, a list of work — and the same compact
// reading inside a third-party application. It draws the sanitized rendering in
// a clipped container, so a long draft takes a card's worth of room instead of
// the whole surface.
//
// THE POST'S FULL VIEW IS THIS PACKAGE'S TO DRAW, and it is not drawn here: the
// display registered for the `detail` slot draws the post over its own Code and
// Preview tabs, and a display's chrome travels with it, so every surface that
// READS the post — the artifact's own page, the review card in a conversation,
// the widget inside a third-party application — mounts that display.
//
// v1 renderer: no host ports, no fetching, read-only, no Regenerate, and the
// named floors this package pins in its own tests.

import type { ReactElement } from "react";

import type { ArtifactRendererProps } from "../artifact-renderer-props";
import { TextDocument } from "./text-document";
import { resolveTextView } from "./text-view";

export default function ArtifactPreview(props: ArtifactRendererProps): ReactElement {
  return <TextDocument view={resolveTextView(props)} slot="preview" compact />;
}
