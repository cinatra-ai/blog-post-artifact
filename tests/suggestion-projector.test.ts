// @vitest-environment node
// THE REFERENCE SUGGESTION PROJECTOR (enabler 0.15), declared by this kind.
//
// THE PLAN'S SENTENCE, VERBATIM: "The suggestion projector, declared by the
// kind: an artifact extension may declare, beside its display, a suggestion
// projector for its type; the host resolves it by kind when it opens a gate —
// on the single-artifact path and the batch path alike — and a kind without one
// yields no suggestions, recorded as such."
//
// WHAT THIS PACKAGE OWNS, EXACTLY. A projector is "a FUNCTION over a disclosed
// projection, never a fetch": it turns what the host DISCLOSED about one pinned
// target into the flat fields the deterministic rule engine runs over, and it
// says which authorization decision that disclosure was made under. The reading
// itself is the host's — an extension has no road to an artifact's bytes — so
// this package ships the shaping and the identity, and the host binds its own
// reader to it. That binding is what makes this the REFERENCE projector rather
// than a second one: the shape below is exactly the descriptor the host's
// by-kind registry resolves.

import { describe, expect, it } from "vitest";

import {
  BLOG_POST_SUGGESTION_PROJECTOR_ID,
  BLOG_POST_SUGGESTION_PROJECTOR_TYPE_ID,
  blogPostSuggestionProjectorDescriptor,
  createBlogPostSuggestionProjector,
  projectBlogPostForSuggestions,
} from "../src/suggestion-projector";

const TARGET = { artifactId: "art_1", representationRevisionId: "rev_1" };

describe("the projector is declared for this kind, and identifies itself", () => {
  it("is declared for the type this extension claims", () => {
    expect(BLOG_POST_SUGGESTION_PROJECTOR_TYPE_ID).toBe("@cinatra-ai/blog-post-artifact:post");
    expect(blogPostSuggestionProjectorDescriptor.typeId).toBe(BLOG_POST_SUGGESTION_PROJECTOR_TYPE_ID);
  });

  it("carries the stable `<extension>#<name>` id every snapshot entry records", () => {
    expect(BLOG_POST_SUGGESTION_PROJECTOR_ID).toBe("@cinatra-ai/blog-post-artifact#post");
    expect(blogPostSuggestionProjectorDescriptor.projectorId).toBe(BLOG_POST_SUGGESTION_PROJECTOR_ID);
  });

  it("is built per organization, exactly as the registry's descriptor is", () => {
    expect(typeof blogPostSuggestionProjectorDescriptor.create).toBe("function");
    expect(typeof blogPostSuggestionProjectorDescriptor.create("org_1")).toBe("function");
  });
});

describe("the projection is flat fields over what the host disclosed", () => {
  it("discloses the post's title and its body, and names what it withheld", () => {
    const projected = projectBlogPostForSuggestions({
      title: "Why brand voice travels",
      bodyMarkdown: "# Why brand voice travels\n\nThe draft continues here.",
    });
    expect(projected.authzDecision).toBe("authorized");
    expect(projected.projection.includedFields).toEqual({
      title: "Why brand voice travels",
      bodyMarkdown: "# Why brand voice travels\n\nThe draft continues here.",
    });
    // The run that made the draft is an operational datum, never a field a
    // suggestion is proposed over — so it is NAMED as withheld, never read.
    expect(projected.projection.excludedFields).toEqual(["createdByRunId"]);
  });

  it("says PARTIAL when the host disclosed only some of the post", () => {
    const projected = projectBlogPostForSuggestions({ title: "A draft" });
    expect(projected.authzDecision).toBe("partial");
    expect(Object.keys(projected.projection.includedFields)).toEqual(["title"]);
  });

  it("says DENIED, with nothing included, when the host disclosed nothing", () => {
    const projected = projectBlogPostForSuggestions(null);
    expect(projected.authzDecision).toBe("denied");
    expect(projected.projection.includedFields).toEqual({});
    // EVERY field not included is named: the two the host did not disclose on
    // this read, and the one it always holds back.
    expect(projected.projection.excludedFields).toEqual([
      "title",
      "bodyMarkdown",
      "createdByRunId",
    ]);
  });

  it("carries an authorized empty string as the disclosure it is", () => {
    // THE DECISION IS THE HOST'S, not a reading of how useful the contents are.
    // A post whose title the host disclosed as the empty string was disclosed;
    // reporting that as a refusal would record an authorized read as a denied
    // one, and the snapshot would be a false account of what the host allowed.
    const projected = projectBlogPostForSuggestions({ title: "", bodyMarkdown: "" });
    expect(projected.authzDecision).toBe("authorized");
    expect(projected.projection.includedFields).toEqual({ title: "", bodyMarkdown: "" });
    expect(projected.projection.excludedFields).toEqual(["createdByRunId"]);
  });

  it("names each allowed field the host did not disclose, beside the withheld one", () => {
    const projected = projectBlogPostForSuggestions({ title: "A draft" });
    expect(projected.authzDecision).toBe("partial");
    expect(projected.projection.excludedFields).toEqual(["bodyMarkdown", "createdByRunId"]);
  });

  it("does not pass off a value of another shape as text, and names it as excluded", () => {
    const projected = projectBlogPostForSuggestions({
      title: "A draft",
      bodyMarkdown: 17 as unknown as string,
    });
    expect(projected.projection.includedFields).toEqual({ title: "A draft" });
    expect(projected.projection.excludedFields).toEqual(["bodyMarkdown", "createdByRunId"]);
    expect(projected.authzDecision).toBe("partial");
  });

  it("never carries a value that is not a string — the engine reads flat text", () => {
    const projected = projectBlogPostForSuggestions({
      title: "A draft",
      bodyMarkdown: "body",
    });
    for (const value of Object.values(projected.projection.includedFields)) {
      expect(typeof value).toBe("string");
    }
  });
});

describe("the projector the host resolves by kind", () => {
  it("reads ONE pinned target through the reader the host bound, and shapes it", async () => {
    const seen: Array<{ orgId: string; artifactId: string; revisionId: string }> = [];
    const projector = createBlogPostSuggestionProjector("org_1", (orgId, target) => {
      seen.push({
        orgId,
        artifactId: target.artifactId,
        revisionId: target.representationRevisionId,
      });
      return { title: "A draft", bodyMarkdown: "body" };
    });
    const projected = await projector(TARGET);
    expect(seen).toEqual([{ orgId: "org_1", artifactId: "art_1", revisionId: "rev_1" }]);
    expect(projected.authzDecision).toBe("authorized");
    expect(projected.projection.includedFields.title).toBe("A draft");
  });

  it("yields a DENIED, empty projection when the host's reader disclosed nothing", async () => {
    const projector = createBlogPostSuggestionProjector("org_1", () => null);
    const projected = await projector(TARGET);
    expect(projected.authzDecision).toBe("denied");
    expect(projected.projection.includedFields).toEqual({});
  });

  it("is a function over a disclosure and NEVER a fetch", () => {
    // Read as source: the module names no request road at all. A projector that
    // reached the network would be reading what the host did not disclose.
    const source = createBlogPostSuggestionProjector.toString();
    for (const road of ["fetch", "XMLHttpRequest", "EventSource", "WebSocket", "require("]) {
      expect(source.includes(road)).toBe(false);
    }
  });
});
