// ---------------------------------------------------------------------------
// @cinatra-ai/blog-post-artifact — object-type renderers (RELOCATED, DORMANT)
// ---------------------------------------------------------------------------
//
// The `@cinatra-ai/assets:blog-post` object-type renderer slots
// (listRow / card / detail), relocated OUT of the cinatra core
// (`src/lib/blog/integration/renderers.tsx`) into this owning extension per
// cinatra#1631 AC2 (epic #1620 S7/M2)
// entry 73 ("remove from core, move to the respective extensions, do not add
// in prod"). Core keeps the TYPE registration with EMPTY renderer slots.
//
// DORMANT — NOT wired to a live host surface today. These render the blog-post
// OBJECT (title + excerpt) via the host `ObjectRendererSlotProps` contract; a
// declarative `kind:"artifact"` extension ships no runtime registrar to mount
// them, and the `cinatra.artifact.ui` renderer spine is a DIFFERENT contract
// (`ArtifactRendererProps`; slots detail/preview/listRow, no `card`). This
// source co-locates the blog-post presentation with its domain owner, ready
// for a future object-renderer capability. Rendering behaviour is preserved
// byte-for-byte from the in-core originals.
//
// Server components: no "use client" directive; no host-internal value imports;
// slots receive pre-fetched values (no async fetches); semantic tokens only.
// ---------------------------------------------------------------------------

import type { ReactElement } from "react";

import type { BlogPostView, ObjectRendererSlotProps } from "./object-renderer-props";

export function BlogPostListRow({
  value,
  compact,
}: ObjectRendererSlotProps<BlogPostView>): ReactElement {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="font-medium">{value.title}</span>
      {!compact && value.excerpt ? (
        <span className="text-xs text-muted-foreground line-clamp-1">{value.excerpt}</span>
      ) : null}
    </div>
  );
}

export function BlogPostCard({ value }: ObjectRendererSlotProps<BlogPostView>): ReactElement {
  return (
    <article className="soft-panel rounded-card p-4">
      <header className="flex items-center gap-2">
        <h3 className="text-base font-semibold">{value.title}</h3>
      </header>
      {value.excerpt ? (
        <p className="mt-1 text-sm text-muted-foreground">{value.excerpt}</p>
      ) : null}
    </article>
  );
}

export function BlogPostDetail({ value }: ObjectRendererSlotProps<BlogPostView>): ReactElement {
  return (
    <section className="soft-panel rounded-card flex flex-col gap-3 p-6">
      <header className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold">{value.title}</h2>
      </header>
      {value.excerpt ? (
        <p className="text-sm text-muted-foreground">{value.excerpt}</p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Open the draft editor to view and edit the full post body.
      </p>
    </section>
  );
}
