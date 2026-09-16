// One authorized-snapshot fixture, shaped exactly as the host builds it, so
// every suite pins the same props shape and a field the host stopped sending
// fails in one place.
//
// THE SURFACES this package's displays are proved on are shapes of THIS one
// snapshot, because that is all a display ever receives: the artifact page's
// mount, the review card's read-only mount, and the island mount inside a
// third-party application, where every host-authorized address is an
// island-scoped byte address instead of a first-party one.
//
// THE EDIT CAPABILITY IS PART OF THAT SHAPE. Every surface that mounts a
// display says which of the two it is — the artifact page mints a grant for a
// reader with write rights, and every other surface mints a NAMED refusal — so
// a fixture that carried no capability would let a display infer permission
// from something else on the snapshot, which is the one thing the channel says
// it must never do.

import type { ArtifactContentProjection } from "../src/artifact-content-channel";
import type { ArtifactEditCapability, ArtifactEditRefusal } from "../src/artifact-edit-channel";
import type { ArtifactRendererProps } from "../src/artifact-renderer-props";

/** The island byte route and the query parameter it reads its capability from —
 * the addresses a host builds into a snapshot it hands a display inside a
 * third-party application. Spelled here so the island fixture is recognisably
 * the island one. */
export const ISLAND_BYTE_ADDRESS =
  "/api/lifecycle-views/artifact-bytes?bc=sealed-capability-for-this-gate";

/** The grant the ARTIFACT'S OWN PAGE mints for a reader with write rights.
 *  Its idle pause is deliberately short: a suite bounds its change sets by
 *  LEAVING the code view, which is the other of the two things the channel says
 *  bounds one, rather than by driving a clock. */
export function editableEdit(
  overrides: Partial<Extract<ArtifactEditCapability, { kind: "editable" }>> = {},
): Extract<ArtifactEditCapability, { kind: "editable" }> {
  return {
    kind: "editable",
    channelVersion: 1,
    artifactId: "art_1",
    baseRevisionId: "rev_1",
    saveUrl: "/api/artifacts/art_1/edit",
    idlePauseMs: 5,
    capBytes: 256 * 1024,
    ...overrides,
  };
}

/** The NAMED refusal every other surface mints. */
export function readOnlyEdit(reason: ArtifactEditRefusal = "read-only-surface"): ArtifactEditCapability {
  return { kind: "read-only", channelVersion: 1, reason };
}

export function textContent(
  text: string,
  overrides: Partial<Extract<ArtifactContentProjection, { kind: "text" }>> = {},
): ArtifactContentProjection {
  const byteLength = Buffer.byteLength(text, "utf8");
  return {
    kind: "text",
    channelVersion: 1,
    representationRevisionId: "rev_1",
    text,
    encoding: "utf-8",
    byteLength,
    projectedByteLength: byteLength,
    cap: 256 * 1024,
    truncated: false,
    ...overrides,
  };
}

/** The artifact page's snapshot: first-party addresses, the pinned revision,
 *  and the grant that page mints for a reader who may write. */
export function props(
  content: ArtifactContentProjection,
  overrides: Partial<ArtifactRendererProps> = {},
): ArtifactRendererProps {
  return {
    propsApiVersion: 1,
    artifact: {
      id: "art_1",
      title: "A blog post",
      objectType: "@cinatra-ai/blog-post-artifact:post",
      mime: "text/markdown",
      size: 2048,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ownerLevel: "workspace",
      visibility: "organization",
      sourceUrl: null,
    },
    representation: { revisionId: "rev_1", mime: "text/markdown" },
    urls: {
      preview: "/api/artifacts/art_1/versions/rev_1/preview",
      download: "/api/artifacts/art_1/versions/rev_1/content",
    },
    identity: { kind: "extension", extension: "@cinatra-ai/blog-post-artifact" },
    actions: { download: "/api/artifacts/art_1/versions/rev_1/content", openInSource: null },
    content,
    edit: editableEdit(),
    ...overrides,
  };
}

/** The same snapshot as a host builds it INSIDE A THIRD-PARTY APPLICATION: the
 * content still arrives on the props — that is the whole point of the channel —
 * and every host-authorized address is the island-scoped byte address, which is
 * a subresource address and never a link. */
export function islandProps(
  content: ArtifactContentProjection,
  overrides: Partial<ArtifactRendererProps> = {},
): ArtifactRendererProps {
  return props(content, {
    urls: { preview: ISLAND_BYTE_ADDRESS, download: ISLAND_BYTE_ADDRESS },
    actions: { download: ISLAND_BYTE_ADDRESS, openInSource: null },
    ...overrides,
  });
}
