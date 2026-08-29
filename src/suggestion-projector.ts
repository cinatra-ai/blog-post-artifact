// THE REFERENCE SUGGESTION PROJECTOR for this kind (enabler 0.15 of the
// lifecycle plan), declared beside this extension's display.
//
// THE PLAN'S SENTENCE, VERBATIM: "The suggestion projector, declared by the
// kind: an artifact extension may declare, beside its display, a suggestion
// projector for its type; the host resolves it by kind when it opens a gate —
// on the single-artifact path and the batch path alike — and a kind without one
// yields no suggestions, recorded as such."
//
// WHAT A PROJECTOR IS, EXACTLY. It is "a FUNCTION over a disclosed projection,
// never a fetch": it turns what the host DISCLOSED about one pinned target into
// the flat fields the deterministic rule engine runs over, and it says which
// authorization decision that disclosure was made under. It proposes nothing
// itself — the rules do that — and it reads nothing itself, because an
// extension has no road to an artifact's bytes and must not have one.
//
// SO THE SHAPE HAS TWO HALVES, and this module ships both:
//
//   the SHAPING — `projectBlogPostForSuggestions`, a pure function from what a
//     post discloses to the flat fields and the decision. This is the half that
//     is about blog posts, and the half only this extension can write.
//
//   the BINDING — `createBlogPostSuggestionProjector`, which takes the host's
//     own authorized reader and returns the per-organization projector the
//     registry's descriptor `create(orgId)` yields. The host supplies the
//     reader; nothing here reaches for one.
//
// WHAT THIS PACKAGE DOES NOT DO. It does not register itself. The host resolves
// a projector BY KIND through its own registry, and the manifest field that
// carries an extension's declaration — and the registrar that reads it — are
// host work this wave does not carry. So this module ships the descriptor
// SHAPED as that registry resolves it, published at its own `exports` subpath,
// ready to be declared the day the field exists. Until then it is exactly what
// it says on the tin: the reference implementation the fleet's other kinds copy.
//
// WHAT IS DISCLOSED, AND WHAT IS WITHHELD. A post's title and its body are the
// work under review, and a suggestion may be proposed over them. The run that
// produced the draft is an operational datum: it is NAMED as withheld so the
// snapshot records that it existed and was not read, never quietly dropped.

/** The object type this projector is declared for — the kind the host resolves
 * it by. */
export const BLOG_POST_SUGGESTION_PROJECTOR_TYPE_ID = "@cinatra-ai/blog-post-artifact:post";

/** The projector's stable id, recorded on every snapshot entry it produces:
 * `<extension>#<name>`, so a stored payload names WHICH declaration produced it
 * and a reader can tell a re-declared projector from the original. */
export const BLOG_POST_SUGGESTION_PROJECTOR_ID = "@cinatra-ai/blog-post-artifact#post";

/** The fields of a post a suggestion may be proposed over. */
export const BLOG_POST_DISCLOSED_FIELDS = ["title", "bodyMarkdown"] as const;

/** The fields the host holds back — named on every projection, never read.
 * Every ALLOWED field the host did not disclose on a given read is named beside
 * them, so a projection says exactly which split it was made under. */
export const BLOG_POST_WITHHELD_FIELDS = ["createdByRunId"] as const;

// ---------------------------------------------------------------------------
// LOCAL STRUCTURAL COPIES of the host's projector contract, declared here — and
// not imported — for the same single reason the props copy beside them gives:
// the host's lifecycle modules are not resolvable from a standalone extension
// repository. They copy types ONLY: no behaviour, no thresholds, no rules.
// Replace them with a type-only import from an SDK leaf as soon as one exists.
// ---------------------------------------------------------------------------

/** One pinned target: an artifact at exactly one representation revision. */
export interface SuggestionTarget {
  artifactId: string;
  representationRevisionId: string;
}

/** The authorized, disclosed projection of the pinned target. */
export interface SuggestionProjection {
  /** The fields the host AUTHORIZED the lane to read, path to value. */
  includedFields: Readonly<Record<string, string>>;
  /** The field paths the host WITHHELD — named, never read. */
  excludedFields: readonly string[];
}

/** The authorization decision the disclosure was made under. */
export type SuggestionAuthzDecision = "authorized" | "partial" | "denied";

/** What a kind's projector returns for one target. */
export interface SuggestionProjectionResult {
  projection: SuggestionProjection;
  authzDecision: SuggestionAuthzDecision;
}

/** The projector the host calls once per pinned target of a gate. */
export type KindSuggestionProjector = (
  target: SuggestionTarget,
) => Promise<SuggestionProjectionResult> | SuggestionProjectionResult;

/** One kind's declared projector, shaped exactly as the host's by-kind registry
 * resolves it. */
export interface SuggestionProjectorDescriptor {
  typeId: string;
  projectorId: string;
  create(orgId: string): KindSuggestionProjector;
}

/** What a post discloses. Every field optional: the host decides, per
 * organization and per actor, how much of a post a suggestion lane may see. */
export interface DisclosedBlogPost {
  title?: string | null;
  bodyMarkdown?: string | null;
}

/** The host's own authorized read of one pinned target. Supplied BY THE HOST —
 * this package never has one of its own. */
export type BlogPostDisclosureReader = (
  orgId: string,
  target: SuggestionTarget,
) => DisclosedBlogPost | null | undefined;

/** THE SHAPING. Pure: what a post disclosed becomes the flat fields the rule
 * engine reads, plus the decision that disclosure was made under.
 *
 *   `authorized` — everything a post discloses was disclosed.
 *   `partial`    — some of it was.
 *   `denied`     — none of it was, and nothing is included.
 */
export function projectBlogPostForSuggestions(
  disclosed: DisclosedBlogPost | null | undefined,
): SuggestionProjectionResult {
  const includedFields: Record<string, string> = {};
  const excludedFields: string[] = [];
  const source =
    disclosed !== null && disclosed !== undefined && typeof disclosed === "object" ? disclosed : null;
  for (const field of BLOG_POST_DISCLOSED_FIELDS) {
    const value = source === null ? undefined : source[field];
    // A DISCLOSURE IS A DISCLOSURE, WHATEVER IT SAYS. The decision this records
    // is the host's — whether it handed this lane the field — and not a reading
    // of how useful the field's contents are. A post whose title the host
    // disclosed as the empty string was disclosed; reporting that as a refusal
    // would record an authorized read as a denied one, and the snapshot would
    // then be a false account of what the host allowed.
    //
    // A value of another shape is not text the engine may read, so it is not
    // included — and it is NAMED below rather than quietly dropped.
    if (typeof value === "string") {
      includedFields[field] = value;
    } else {
      excludedFields.push(field);
    }
  }
  // EVERY FIELD NOT INCLUDED IS NAMED: the ones the host held back on this read,
  // then the one it always holds back. A provenance line that named only the
  // second would describe a split that did not happen.
  excludedFields.push(...BLOG_POST_WITHHELD_FIELDS);
  const seen = Object.keys(includedFields).length;
  const authzDecision: SuggestionAuthzDecision =
    seen === 0 ? "denied" : seen === BLOG_POST_DISCLOSED_FIELDS.length ? "authorized" : "partial";
  return {
    projection: {
      includedFields,
      excludedFields,
    },
    authzDecision,
  };
}

/** THE BINDING. The host supplies its own authorized reader; this returns the
 * per-organization projector its registry calls once per pinned target.
 *
 * It reaches nothing: no request road, no store, no clock. Everything it knows
 * about a target it was handed. */
export function createBlogPostSuggestionProjector(
  orgId: string,
  read: BlogPostDisclosureReader,
): KindSuggestionProjector {
  return (target: SuggestionTarget): SuggestionProjectionResult =>
    projectBlogPostForSuggestions(read(orgId, target));
}

/** The descriptor the host's by-kind registry resolves, waiting on the manifest
 * field and the registrar that will declare it. A host that binds its reader
 * through `withDisclosureReader` gets a descriptor it can register as is. */
export const blogPostSuggestionProjectorDescriptor: SuggestionProjectorDescriptor & {
  withDisclosureReader(read: BlogPostDisclosureReader): SuggestionProjectorDescriptor;
} = {
  typeId: BLOG_POST_SUGGESTION_PROJECTOR_TYPE_ID,
  projectorId: BLOG_POST_SUGGESTION_PROJECTOR_ID,
  // With no reader bound, the honest answer for every target is that nothing was
  // disclosed — never an invented projection, and never a throw the gate would
  // have to absorb.
  create(_orgId: string): KindSuggestionProjector {
    return () => projectBlogPostForSuggestions(null);
  },
  withDisclosureReader(read: BlogPostDisclosureReader): SuggestionProjectorDescriptor {
    return {
      typeId: BLOG_POST_SUGGESTION_PROJECTOR_TYPE_ID,
      projectorId: BLOG_POST_SUGGESTION_PROJECTOR_ID,
      create: (orgId: string) => createBlogPostSuggestionProjector(orgId, read),
    };
  },
};
