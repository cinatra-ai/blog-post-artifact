# Coding Conventions

**Analysis Date:** 2026-06-09

## Naming Patterns

**Files:**
- TypeScript source files use camelCase: `src/index.ts`
- Skill definition files use kebab-case directories: `skills/blog-post-matcher/SKILL.md`
- CI/workflow files use kebab-case: `.github/workflows/ci.yml`, `.github/workflows/release.yml`

**Functions/Variables:**
- Exported constants use camelCase: `blogPostArtifactManifest` (see `src/index.ts`)

**Types:**
- Imported types use PascalCase: `SemanticArtifactManifest` (from `@cinatra-ai/sdk-extensions`)

**Skill directories:**
- Skill subdirectories under `skills/` use kebab-case matching the skill name in `package.json` (`blog-post-matcher`)

## Code Style

**Formatting:**
- Not detected (no `.prettierrc`, `biome.json`, or `.eslintrc` present)
- Code relies on TypeScript compiler strictness enforced via `tsconfig.json`

**Linting:**
- No linter config detected; CI relies on `tsc --noEmit` for type correctness

**TypeScript Config (`tsconfig.json`):**
- `strict: true` — full strict mode enabled
- `noImplicitAny: false` — implicit any is explicitly permitted (relaxes strict)
- `verbatimModuleSyntax: true` — type-only imports must use `import type`
- `isolatedModules: true` — each file must be independently compilable
- Target: `ES2023`, module: `ESNext`, moduleResolution: `bundler`

## Import Organization

**Order:**
1. External type imports using `import type` (required by `verbatimModuleSyntax`)
2. Value imports from external packages

**Path Aliases:**
- None detected; no path alias configuration in `tsconfig.json`

**Example from `src/index.ts`:**
```typescript
import type { SemanticArtifactManifest } from "@cinatra-ai/sdk-extensions";
```

## Error Handling

**Patterns:**
- Not applicable at the source level — the repo exports a single manifest constant with no runtime logic
- CI scripts (in `.github/workflows/ci.yml`) use explicit `process.exit(2)` for validation errors and shell `exit 1` to propagate failures

## Logging

**Framework:** Not applicable — no application runtime; only a manifest export

**CI Patterns:**
- `console.error(...)` used in inline Node.js CI scripts for reporting validation failures (see `.github/workflows/ci.yml`)
- `echo "..."` used in shell steps for informational output

## Comments

**When to Comment:**
- Block comments above exports explain the design rationale and constraints (e.g., why `text/html` and `application/pdf` are excluded — see `src/index.ts`)
- CI workflow files include extensive inline comments explaining skip logic and contract rules

**Style:**
- Multi-line `//` block comments for module-level rationale
- Single-line `//` comments for inline clarification
- YAML comments (`#`) for CI step explanations

## Function Design

**Size:** The only export is a single constant declaration; no functions present
**Parameters:** Not applicable
**Return Values:** Not applicable — single manifest object export

## Module Design

**Exports:**
- Named export only: `export const blogPostArtifactManifest` from `src/index.ts`
- No default exports

**Barrel Files:**
- `src/index.ts` serves as the single entry point and sole source file

## Package Shape Rules (enforced by CI)

- First-party `@cinatra-ai/*` packages must be declared as **optional peerDependencies**, never as `dependencies` or `devDependencies`
- Each first-party peer must have `peerDependenciesMeta.<name>.optional: true` in `package.json`
- Violation causes CI to exit with code 2 and fail the build

## Skill Definition Conventions

**Location:** `skills/<skill-name>/SKILL.md`
**Format:** Markdown with YAML front matter (`name`, `description`)
**Content structure:**
- Front matter block
- Role/persona declaration
- Positive classification criteria ("What it IS")
- Negative classification criteria ("What it is NOT")
- Confidence scoring guidance
- Output contract (JSON schema, no markdown wrapper)

---

*Convention analysis: 2026-06-09*
