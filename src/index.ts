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

  // THE DISPLAYS THIS EXTENSION SHIPS, declared for its OWN type and published
  // through this package's own `exports` at the key the host's manifest
  // generator derives from each entry. Mirrors the `cinatra` block in
  // package.json, which is the manifest of record; the manifest test keeps the
  // two in agreement.
  ui: {
    "abiVersion": 1,
    "sdkAbiRange": "^2.5.0",
    "renderers": {
      "detail": {
        "entry": "./src/renderers/detail.tsx",
        "propsApiVersion": 1,
        "representations": [
          "text/markdown"
        ]
      },
      "preview": {
        "entry": "./src/renderers/preview.tsx",
        "propsApiVersion": 1,
        "representations": [
          "text/markdown"
        ]
      }
    }
  },
};

export {
  type ArtifactRendererProps,
  ARTIFACT_RENDERER_PROPS_API_VERSION,
} from "./artifact-renderer-props";

export {
  type ArtifactContentProjection,
  type ArtifactContentAbsence,
  type ArtifactContentClass,
  ARTIFACT_CONTENT_CHANNEL_VERSION,
} from "./artifact-content-channel";

// TYPES ONLY, AND FROM THE SANITIZER-FREE CONTRACT MODULE. The view leaf reaches
// the host-provided sanitizer, and a type re-export from THAT module would make
// a compiler follow it there. This root module must stay resolvable with nothing
// installed. The displays are imported at their own published subpaths, and so
// is the suggestion projector.
export type { TextView, TextFloorReason } from "./renderers/text-view-contract";
