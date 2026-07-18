// ---------------------------------------------------------------------------
// Local STRUCTURAL mirror of the host object-renderer slot contract
// (`@cinatra-ai/objects` `renderer-types.ts` — `ObjectRendererSlotProps`).
//
// WHY A LOCAL MIRROR: the host does NOT export `ObjectRendererSlotProps` from
// a published SDK — it lives in the host `@cinatra-ai/objects` package tree.
// An extension is a SOURCE MIRROR the host builds into its own graph, so it
// mirrors only the slot fields it consumes. This interface is structurally
// compatible with the host contract; the host remains the authoritative owner
// of the type. When (if) a public object-renderer ABI is exported, this local
// mirror is replaced by that import (no behaviour change).
//
// DORMANT: these are the RELOCATED `@cinatra-ai/assets:blog-post` object-type
// renderers (cinatra#1631 AC2). They are NOT wired into a live host surface —
// a declarative `kind:"artifact"` extension ships no runtime registrar, and the
// `cinatra.artifact.ui` renderer spine consumes a different contract
// (`ArtifactRendererProps`, artifact-representation snapshots; slots
// detail/preview/listRow, no `card`). This source houses the blog-post object
// presentation with its owning domain, ready for a future object-renderer
// capability. See the PR / cinatra#1631 for the full rationale.
// ---------------------------------------------------------------------------

export type ObjectRendererMode = "edit" | "view";

export interface ObjectRendererSlotProps<T> {
  value: T;
  mode?: ObjectRendererMode;
  compact?: boolean;
  onEdit?: (next: T) => void;
}

/**
 * Minimal view-model of the `@cinatra-ai/assets:blog-post` object — only the
 * fields these renderer slots read. Decoupled from the host blog store record
 * type (which an extension cannot import).
 */
export interface BlogPostView {
  title: string;
  excerpt?: string;
}
