import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import type { BlogPostView } from "../src/object-renderer-props";
import {
  BlogPostCard,
  BlogPostDetail,
  BlogPostListRow,
} from "../src/object-renderers";

// NOTE: these assertions prove the RELOCATED source renders the same markup as
// the in-core originals. They do NOT prove host MOUNTING — the renderers are
// dormant (no runtime registrar for a declarative artifact extension; the
// cinatra.artifact.ui spine is a different contract). See object-renderers.tsx.

function view(overrides: Partial<BlogPostView> = {}): BlogPostView {
  return { title: "Scaling GTM with agents", excerpt: "How we shipped it.", ...overrides };
}

describe("BlogPostListRow", () => {
  it("renders the title and (when not compact) the excerpt", () => {
    const html = renderToStaticMarkup(createElement(BlogPostListRow, { value: view() }));
    expect(html).toContain("Scaling GTM with agents");
    expect(html).toContain("How we shipped it.");
    expect(html).toContain("line-clamp-1");
  });

  it("omits the excerpt when compact", () => {
    const html = renderToStaticMarkup(
      createElement(BlogPostListRow, { value: view(), compact: true }),
    );
    expect(html).toContain("Scaling GTM with agents");
    expect(html).not.toContain("How we shipped it.");
  });
});

describe("BlogPostCard", () => {
  it("renders the title in a soft-panel card", () => {
    const html = renderToStaticMarkup(createElement(BlogPostCard, { value: view() }));
    expect(html).toContain('class="soft-panel rounded-card p-4"');
    expect(html).toContain("Scaling GTM with agents");
    expect(html).toContain("How we shipped it.");
  });

  it("omits the excerpt paragraph when there is no excerpt", () => {
    const html = renderToStaticMarkup(
      createElement(BlogPostCard, { value: view({ excerpt: undefined }) }),
    );
    expect(html).toContain("Scaling GTM with agents");
    expect(html).not.toContain("How we shipped it.");
  });
});

describe("BlogPostDetail", () => {
  it("renders the title heading and the draft-editor hint", () => {
    const html = renderToStaticMarkup(createElement(BlogPostDetail, { value: view() }));
    expect(html).toContain("Scaling GTM with agents");
    expect(html).toContain("Open the draft editor to view and edit the full post body.");
  });
});
