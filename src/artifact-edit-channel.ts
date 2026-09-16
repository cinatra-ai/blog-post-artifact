// THE EDIT CHANNEL — the contract half, copied locally; the SAVE ITSELF is
// host-provided and is imported from the SDK leaf, never reimplemented here.
//
// THE SOURCE OF TRUTH IS THE SDK LEAF
// `@cinatra-ai/sdk-extensions/artifact-edit-channel`. This module is a LOCAL
// STRUCTURAL COPY of that leaf's TYPES and CONSTANTS, declared here — and not
// imported — for the same single reason the props and content-channel copies
// beside it exist: the SDK is not resolvable from a standalone extension
// repository, so importing it would break this package's own install and
// typecheck. The copy is kept EXACTLY equal to the leaf, with the string unions
// spelled out as frozen runtime values so a drift between this copy and the
// leaf is a test failure rather than a silent type lie.
//
// WHAT IS DELIBERATELY *NOT* COPIED: `saveArtifactEdit`. Sending a change set is
// the host's road, exactly as sanitizing markdown is — a second implementation
// of either inside a display is the failure the SDK leaves exist to prevent.
// The display imports that ONE function at the SDK specifier and calls it with
// the capability the host minted; where the SDK cannot be resolved (this
// repository's own typecheck, its own standalone test run) the specifier
// resolves to the signature-only declaration in `./types` and to an inert
// recording double, and the suites that need the real one say so.

/** The edit-channel ABI version. SEPARATE from the props-contract version and
 *  from the content channel's: a display that understands props v1 and content
 *  channel v1 may still be handed an edit channel of another version. */
export const ARTIFACT_EDIT_CHANNEL_VERSION = 1;

/** The idle pause that bounds a change set, in milliseconds. Stamped by the
 *  host onto every capability it mints; this copy is the fallback for a
 *  capability that carries none, and the value the contract test pins. */
export const ARTIFACT_EDIT_IDLE_PAUSE_MS = 900;

/** The largest change set the channel carries, in UTF-8 bytes. */
export const ARTIFACT_EDIT_TEXT_CAP_BYTES = 256 * 1024;

/** The largest change set a LEAVING save asks the browser to carry past the
 *  document that started it, in UTF-8 bytes. Mirrors the leaf. */
export const ARTIFACT_EDIT_KEEPALIVE_CAP_BYTES = 64 * 1024;

/** Why the host did not grant the edit — spelled out so it can be asserted. */
export const ARTIFACT_EDIT_REFUSALS = [
  "no-write-rights",
  "read-only-surface",
  "unsupported-form",
  "no-representation",
  "content-truncated",
] as const;
export type ArtifactEditRefusal = (typeof ARTIFACT_EDIT_REFUSALS)[number];

/**
 * THE EDIT CAPABILITY, as it arrives on a display's props.
 *
 * DISCRIMINATED, and REFUSAL IS FIRST-CLASS. A display switches on `kind`: it
 * never infers "may edit" from anything else on the snapshot, and it never
 * treats a missing field as permission. Every surface that mounts a display
 * says which of the two this is — the artifact page mints `editable` for a
 * writer, and every other surface mints `read-only` with the reason.
 */
export type ArtifactEditCapability =
  | {
      kind: "editable";
      /** The channel ABI version this capability was minted at. */
      channelVersion: number;
      /** The artifact this capability is sealed to. */
      artifactId: string;
      /** THE BASE — the revision the editor opened, and the revision every save
       *  under this capability names. */
      baseRevisionId: string;
      /** Where the change set goes. Host-authorized and host-composed. */
      saveUrl: string;
      /** The idle pause that bounds a change set, stamped by the host. */
      idlePauseMs: number;
      /** The largest change set this capability admits, in UTF-8 bytes. */
      capBytes: number;
    }
  | { kind: "read-only"; channelVersion: number; reason: ArtifactEditRefusal };

/** Why a save the host understood was refused. */
export const ARTIFACT_EDIT_REFUSED_REASONS = [
  "no-write-rights",
  "over-cap",
  "unsupported-form",
  "no-representation",
  "unknown-base",
  "malformed",
] as const;
export type ArtifactEditRefusedReason = (typeof ARTIFACT_EDIT_REFUSED_REASONS)[number];

/** Why a save never reached an answer. */
export const ARTIFACT_EDIT_FAILURE_REASONS = ["transport", "malformed-answer", "server"] as const;
export type ArtifactEditFailureReason = (typeof ARTIFACT_EDIT_FAILURE_REASONS)[number];

/**
 * WHAT ONE SAVE ANSWERED. Total: every save ends on exactly one of these, and a
 * display draws its indicator from the outcome alone.
 */
export type ArtifactEditOutcome =
  | { outcome: "saved"; revisionId: string; revision: number }
  | { outcome: "unchanged"; revisionId: string }
  | {
      outcome: "stale";
      latestRevisionId: string;
      latestRevision: number;
      text: string;
      truncated: boolean;
    }
  | { outcome: "refused"; reason: ArtifactEditRefusedReason }
  | { outcome: "failed"; reason: ArtifactEditFailureReason };

/**
 * Is this capability one that admits an edit? THE ONE TEST THE DISPLAY MAKES:
 * it never infers permission from anything else on the snapshot, and it never
 * reads a missing capability as one.
 */
export function isArtifactEditGranted(
  capability: ArtifactEditCapability | null | undefined,
): capability is Extract<ArtifactEditCapability, { kind: "editable" }> {
  return (
    !!capability &&
    capability.kind === "editable" &&
    capability.channelVersion === ARTIFACT_EDIT_CHANNEL_VERSION &&
    typeof capability.saveUrl === "string" &&
    capability.saveUrl.length > 0 &&
    typeof capability.baseRevisionId === "string" &&
    capability.baseRevisionId.length > 0
  );
}
