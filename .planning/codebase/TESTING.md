# Testing Patterns

**Analysis Date:** 2026-06-09

## Test Framework

**Runner:**
- Not configured locally — no test framework present in `package.json` (no `vitest`, `jest`, or similar)
- No `jest.config.*`, `vitest.config.*`, or test runner config files detected

**Assertion Library:**
- Not applicable

**Run Commands:**
```bash
pnpm test --if-present   # CI command — no-ops if no test script is defined
```

## Repository Testing Model

This is a **source mirror** repo — a Cinatra extension extracted from the host monorepo. Per the CI contract defined in `.github/workflows/ci.yml`:

- The repo declares host-internal `@cinatra-ai/*` packages as **optional peerDependencies**
- Because those packages are not on any public registry, standalone install, typecheck, and test are all **skipped** in CI
- The **monorepo** (cinatra) owns and runs all tests for this code when it pulls this repo into its workspace
- CI confirms this is a source mirror via the `first_party=1` env var and explicitly logs: _"Skipping standalone tests (host-internal @cinatra-ai/* peers — the cinatra monorepo runs these)."_

## Test File Organization

**Location:**
- No test files present in this repo (`*.test.*`, `*.spec.*` — not detected)

**Naming:**
- Not applicable

## CI Validation (Replaces Local Testing)

The CI pipeline in `.github/workflows/ci.yml` performs these validations as the effective quality gate:

1. **Dependency shape validation** — inline Node.js script confirms no first-party `@cinatra-ai/*` packages leaked into `dependencies`/`devDependencies`
2. **Typecheck** — skipped for source mirrors; run by monorepo
3. **Test** — skipped for source mirrors; run by monorepo
4. **Pack dry-run** — `npm pack --dry-run` validates package shape and publish payload without resolving peers
5. **Kind-gates job** — runs after `build`; for `artifact` kind, no extra gate is applied today

## Mocking

**Framework:** Not applicable
**Patterns:** Not applicable

## Fixtures and Factories

**Test Data:** Not applicable
**Location:** Not applicable

## Coverage

**Requirements:** Not enforced locally
**View Coverage:** Not applicable — coverage is owned by the monorepo

## Test Types

**Unit Tests:**
- Owned by the cinatra monorepo, not this repo

**Integration Tests:**
- Owned by the cinatra monorepo, not this repo

**E2E Tests:**
- Not applicable

## Skill Classifier Testing

The `skills/blog-post-matcher/SKILL.md` classifier defines an implicit test contract via its **output contract** section:

- Output must be JSON only (no markdown wrapper)
- Schema: `{ "matches": boolean, "confidence": number 0..1, "rationale": string }`
- Confidence threshold for a positive match: `0.7` (defined in `package.json` `cinatra.artifact.matcherConfidenceThreshold`)
- Confidence bands are specified in the SKILL.md and serve as acceptance criteria for LLM-based classifier evaluation in the monorepo

---

*Testing analysis: 2026-06-09*
