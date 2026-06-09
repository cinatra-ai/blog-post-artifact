<!-- refreshed: 2026-06-09 -->
# Architecture

**Analysis Date:** 2026-06-09

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│              Cinatra Monorepo (host)                         │
│   provides @cinatra-ai/sdk-extensions at workspace scope    │
└────────────────────┬────────────────────────────────────────┘
                     │ optional peerDependency
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           @cinatra-ai/blog-post-artifact                     │
│                                                             │
│  Manifest export                  Skill definition          │
│  `src/index.ts`                   `skills/blog-post-matcher/│
│                                    SKILL.md`                │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Cinatra artifact registry                                   │
│  (runtime classification pipeline)                          │
│  Reads SemanticArtifactManifest at load time                │
│  Invokes `blog-post-matcher` skill per candidate file        │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Artifact manifest | Declares accepted MIME types, linked skills, confidence threshold | `src/index.ts` |
| Skill prompt | LLM prompt that classifies a markdown file as a finished blog post | `skills/blog-post-matcher/SKILL.md` |
| Package manifest | Cinatra kind/apiVersion metadata, dependency shape rules | `package.json` |

## Pattern Overview

**Overall:** Declarative Cinatra artifact extension — no imperative runtime logic.

**Key Characteristics:**
- A single exported constant (`blogPostArtifactManifest`) of type `SemanticArtifactManifest` is the entire TypeScript surface area.
- Classification logic lives entirely in an LLM skill prompt (`SKILL.md`), not in code.
- The package is a "source mirror" — it depends on `@cinatra-ai/sdk-extensions` as an optional peer; the monorepo provides and type-checks it. No standalone install or test is possible outside the monorepo.

## Layers

**Manifest layer:**
- Purpose: Registers the artifact type with the Cinatra runtime.
- Location: `src/index.ts`
- Contains: One exported `SemanticArtifactManifest` constant.
- Depends on: `@cinatra-ai/sdk-extensions` (type-only import, peer).
- Used by: Cinatra platform artifact registry at load time.

**Skill layer:**
- Purpose: Provides the LLM system prompt that decides whether a file matches this artifact type.
- Location: `skills/blog-post-matcher/SKILL.md`
- Contains: Classifier instructions, positive/negative examples, confidence scoring guide, JSON output contract.
- Depends on: Nothing (plain markdown consumed by the Cinatra skill runner).
- Used by: Cinatra matcher pipeline when evaluating a candidate `text/markdown` file.

## Data Flow

### Classification Request Path

1. A `text/markdown` file enters the Cinatra artifact classification pipeline.
2. The platform reads `blogPostArtifactManifest` from `src/index.ts` — checks `accepts.file.mimeTypes` (only `text/markdown` accepted).
3. The platform invokes the `@cinatra-ai/blog-post-artifact:blog-post-matcher` skill with the file bytes as context.
4. The LLM runs under the `skills/blog-post-matcher/SKILL.md` system prompt and returns `{ matches, confidence, rationale }` JSON.
5. If `confidence >= matcherConfidenceThreshold` (0.7) and `matches === true`, the file is classified as a blog-post artifact.

## Key Abstractions

**SemanticArtifactManifest:**
- Purpose: SDK type from `@cinatra-ai/sdk-extensions` that describes what files an artifact type accepts and which skills classify them.
- Examples: `src/index.ts`
- Pattern: Single exported constant; no class or factory.

**Skill (SKILL.md):**
- Purpose: A markdown document that serves as a system prompt for an LLM-powered classifier skill.
- Examples: `skills/blog-post-matcher/SKILL.md`
- Pattern: Front matter (`name`, `description`) + prose instructions + JSON output contract.

## Entry Points

**Package entry point:**
- Location: `src/index.ts` (declared as both `main` and `types` in `package.json`)
- Triggers: Imported by the Cinatra runtime or monorepo workspace consumers.
- Responsibilities: Exports `blogPostArtifactManifest`.

**Skill entry point:**
- Location: `skills/blog-post-matcher/SKILL.md`
- Triggers: Referenced by name `@cinatra-ai/blog-post-artifact:blog-post-matcher` in the manifest; loaded by the Cinatra skill runner.
- Responsibilities: LLM classification of `text/markdown` files as finished blog posts.

## Architectural Constraints

- **Threading:** Not applicable — no imperative runtime; purely declarative.
- **Global state:** None. The single export is a frozen object literal.
- **Circular imports:** None. Only one source file exists.
- **Source mirror constraint:** `@cinatra-ai/*` packages must appear only as optional peerDependencies. CI (`ci.yml`) enforces this with a Node.js inline check (exit 2 on violation).
- **MIME scope:** Only `text/markdown` is accepted. `text/html` and `application/pdf` are explicitly excluded by design.
- **No connectorRef:** This is a bytes-only matcher; no external data connector is wired.

## Anti-Patterns

### Adding first-party deps to dependencies or devDependencies

**What happens:** A developer adds `@cinatra-ai/sdk-extensions` to `dependencies` instead of `peerDependencies`.
**Why it's wrong:** The package is a source mirror; host-internal packages are not published to any registry and cannot be resolved standalone. CI will exit 2 and block the PR.
**Do this instead:** Declare `@cinatra-ai/*` packages under `peerDependencies` with `peerDependenciesMeta.<pkg>.optional: true`, as shown in `package.json`.

### Hardcoding classification logic in TypeScript

**What happens:** Developer writes a regex or heuristic in `src/index.ts` instead of using the skill.
**Why it's wrong:** Classification is the responsibility of the LLM skill layer (`SKILL.md`). The manifest layer only declares what files to accept and which skill to call.
**Do this instead:** Extend or adjust `skills/blog-post-matcher/SKILL.md` for classification changes; keep `src/index.ts` as a pure manifest export.

## Error Handling

**Strategy:** Not applicable at the package level — no runtime logic exists. Error handling is the responsibility of the Cinatra platform that invokes the skill and interprets the JSON response.

**Patterns:**
- The skill output contract requires `{ matches: boolean, confidence: number, rationale: string }` JSON; malformed output is handled by the platform.

## Cross-Cutting Concerns

**Logging:** Not applicable — no imperative code.
**Validation:** CI validates package dependency shape (`ci.yml`, "Classify repo" step). TypeScript strict mode validates the manifest shape at compile time.
**Authentication:** Not applicable — no network calls or connectors.

---

*Architecture analysis: 2026-06-09*
