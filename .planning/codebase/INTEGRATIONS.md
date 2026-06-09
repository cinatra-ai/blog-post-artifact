# External Integrations

**Analysis Date:** 2026-06-09

## APIs & External Services

**Cinatra Platform (internal):**
- Cinatra Marketplace — publish target for this artifact extension
  - SDK/Client: `@cinatra-ai/sdk-extensions` (optional peerDependency)
  - Auth: `CINATRA_MARKETPLACE_VENDOR_TOKEN` (GitHub org secret, used in CI release workflow)
  - Submission path: marketplace MCP proxy (`extension-submit-for-review` saga → `registry.cinatra.ai`)

**Downstream Agents (runtime consumers, not code dependencies):**
- Blog Draft Writer agent — consumes this artifact type
- Blog Pipeline agent — consumes this artifact type
- Blog Image Prompt agent — consumes this artifact type
- WordPress Publish agent — publishes artifact content to WordPress
- LinkedIn Publish agent — publishes artifact content to LinkedIn

These agents are referenced in `README.md` as "Works with" integrations; no direct code coupling exists in this repo.

## Data Storage

**Databases:**
- Not applicable — this package defines a semantic artifact manifest, not a data layer

**File Storage:**
- Not applicable

**Caching:**
- Not applicable

## Authentication & Identity

**Auth Provider:**
- Not applicable at the package level
- CI/CD uses GitHub OIDC (`id-token: write`) for build-provenance attestation during releases (`.github/workflows/release.yml`)

## Monitoring & Observability

**Error Tracking:**
- Not detected

**Logs:**
- Not applicable — library package with no runtime server

## CI/CD & Deployment

**Hosting:**
- Cinatra Marketplace (`registry.cinatra.ai`) — published via reusable workflow `cinatra-ai/.github/.github/workflows/reusable-extension-release.yml@main`

**CI Pipeline:**
- GitHub Actions — two workflows in `.github/workflows/`
  - `ci.yml`: runs on push/PR to `main`; validates first-party dep shape, conditionally installs + typechecks + tests + `npm pack --dry-run`
  - `release.yml`: triggers on GitHub Release publish or manual `workflow_dispatch` against a version tag; delegates to central reusable release workflow

## Environment Configuration

**Required env vars:**
- `CINATRA_MARKETPLACE_VENDOR_TOKEN` — GitHub org secret required for marketplace submission (release workflow only)

**Secrets location:**
- GitHub org-level secrets (not stored in repo)

## Webhooks & Callbacks

**Incoming:**
- Not applicable

**Outgoing:**
- Not applicable — the Cinatra platform polls/pulls this artifact type definition; no outgoing webhooks from this package

---

*Integration audit: 2026-06-09*
