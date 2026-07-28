import type { SemanticArtifactManifest } from "@cinatra-ai/sdk-extensions";

// `@cinatra-ai/blog-post-artifact` models already-written blog post bodies as
// semantic artifacts. It is distinct from the in-pipeline blog-post operational
// record, which remains relational. This artifact type covers posts uploaded
// into the library OR exported from external sources, classified from bytes
// alone.
//
// Bytes-only matcher; text/markdown only. text/html is NOT in the LLM capability
// registry, and application/pdf is too generic to safely classify as a blog post
// without front-matter signals. No connectorRef.
export const blogPostArtifactManifest: SemanticArtifactManifest = {
  accepts: {
    file: {
      mimeTypes: ["text/markdown"],
    },
  },
  skills: {
    matchers: ["@cinatra-ai/blog-post-matcher-skill:blog-post-matcher"],
  },
  matcherConfidenceThreshold: 0.7,
  objectTypes: [
    {
      type: "@cinatra-ai/blog-post-artifact:post",
      claim: "dedicated",
      dispositions: {
        projection: "artifact-safe",
        pinnable: true,
        snapshotPolicy: "content",
        sensitivity: "normal",
        mutability: "draftable",
      },
      schema: {
        type: "object",
        properties: {
          title: {
            type: "string",
          },
          bodyMarkdown: {
            type: "string",
          },
          createdByRunId: {
            type: "string",
          },
        },
        additionalProperties: true,
      },
    },
  ],
};
