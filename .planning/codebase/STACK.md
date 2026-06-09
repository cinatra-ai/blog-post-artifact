# Technology Stack

**Analysis Date:** 2026-06-09

## Languages

**Primary:**
- TypeScript (ES2023 target) - sole source language, `src/index.ts`

**Secondary:**
- Not applicable (no secondary language)

## Runtime

**Environment:**
- Node.js 24 (pinned in CI via `.github/workflows/ci.yml`)

**Package Manager:**
- pnpm (via corepack) — no committed lockfile (standalone repos use `--no-frozen-lockfile`)
- `.npmrc`: `auto-install-peers=false`

## Frameworks

**Core:**
- None — this is a minimal Cinatra platform artifact package with a single exported manifest object

**Testing:**
- Not applicable — tests run only inside the cinatra monorepo (skipped in standalone CI because `@cinatra-ai/*` peers are unresolvable outside the monorepo)

**Build/Dev:**
- TypeScript compiler (`tsc`) — config in `tsconfig.json`, outputs to `dist/`, targets ESNext modules with `bundler` moduleResolution

## Key Dependencies

**Critical:**
- `@cinatra-ai/sdk-extensions` (optional peerDependency, `*`) — provides the `SemanticArtifactManifest` type imported in `src/index.ts`; resolved only inside the cinatra monorepo

**Infrastructure:**
- No runtime dependencies
- No devDependencies declared in `package.json`

## Configuration

**TypeScript (`tsconfig.json`):**
- `target`: ES2023
- `module`: ESNext
- `moduleResolution`: bundler
- `strict`: true, `noImplicitAny`: false
- `isolatedModules`: true, `verbatimModuleSyntax`: true
- `outDir`: `dist`, `rootDir`: `src`
- Declarations and source maps enabled

**Package (`package.json`):**
- `"type": "module"` — ESM-only package
- `"main"` and `"types"` both point to `./src/index.ts` (source-first; bundled by monorepo)
- Cinatra platform metadata under `"cinatra"` key: `apiVersion: cinatra.ai/v1`, `kind: artifact`
- `matcherConfidenceThreshold`: 0.7
- Accepts MIME type: `text/markdown` only

**npmrc:**
- `auto-install-peers=false`

## Platform Requirements

**Development:**
- Node.js 24+, corepack/pnpm
- Must be embedded in the cinatra monorepo workspace for type resolution and testing

**Production:**
- Deployed to the Cinatra Marketplace via the `release` GitHub Actions workflow
- Published through the marketplace MCP proxy (`registry.cinatra.ai`), not directly to npm/Verdaccio
- Requires org secret `CINATRA_MARKETPLACE_VENDOR_TOKEN` and reusable workflow at `cinatra-ai/.github`

---

*Stack analysis: 2026-06-09*
