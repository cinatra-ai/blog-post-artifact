// The SHAPE of the SDK's artifact-manifest contract, for this repository's own
// typecheck ONLY.
//
// The SDK is host-provided: the host resolves `@cinatra-ai/sdk-extensions` when
// it builds this package, and a standalone extension repository cannot resolve
// it at all. So the repository's tsconfig resolves that specifier to the real
// SDK source when one is installed and, when none is, to this declaration — the
// shape and nothing else. There is no implementation here and there must never
// be one: the SDK owns the contract, and the authoritative typecheck against it
// is the one that runs where the SDK lives.
//
// Only the fields this package's own manifest declares are mirrored. Replace
// this file with the real import as soon as the SDK resolves standalone.

export interface ArtifactRepresentationForms {
  file?: { mimeTypes: string[] };
  connectorRef?: { resolvedMimeTypes: string[] };
  dashboard?: true;
}

export interface ArtifactUiRenderer {
  entry: string;
  propsApiVersion: number;
  representations?: string[];
}

export interface ArtifactUiManifest {
  abiVersion: number;
  sdkAbiRange: string;
  renderers: Record<string, ArtifactUiRenderer>;
}

export interface ArtifactObjectTypeClaim {
  type: string;
  claim: "dedicated" | "default";
  dispositions?: Record<string, unknown>;
  schema?: Record<string, unknown>;
}

export type SemanticArtifactManifest = {
  accepts: ArtifactRepresentationForms;
  satisfies?: string[];
  skills?: Record<string, string[]>;
  agentDependencies?: string[];
  matcherConfidenceThreshold?: number;
  objectTypes?: ArtifactObjectTypeClaim[];
  ui?: ArtifactUiManifest;
};
