// A RECORDING DOUBLE for the SDK's artifact-edit-channel leaf entry, used ONLY
// by this package's own test run when the SDK tree is not resolvable (an
// extension repository resolves standalone; the save road is host-provided).
//
// IT SAVES NOTHING, DELIBERATELY. It records the change set it was handed and
// answers with whatever outcome the test queued. What the tests using it pin is
// the DISPLAY's half of the contract — that one change set is sent per idle
// pause, that two are never in flight at once, that the indicator reads from the
// outcome and from nothing else, and that a refused save reloads rather than
// overwrites. What the host DOES with a change set is proved in the host's own
// suites, against a real database.

export interface RecordedEditSave {
  capability: unknown;
  text: string;
  /** The third argument the display sent — where "this is a leaving save" is
   *  carried, so a test can see that the request was marked to outlive the
   *  document rather than only that it went. */
  deps: { leaving?: boolean } | undefined;
}

/** Every save the display sent, in order. */
export const editSaveCalls: RecordedEditSave[] = [];

/** What the next save answers with, and how long it takes to answer. */
export const editSaveStub: {
  outcomes: unknown[];
  defaultOutcome: unknown;
  /** When set, a save parks on this promise until the test resolves it — which
   *  is how "two saves are never in flight at once" becomes observable. */
  gate: null | { promise: Promise<void>; release: () => void };
} = {
  outcomes: [],
  defaultOutcome: { outcome: "saved", revisionId: "rev_2", revision: 2 },
  gate: null,
};

export function resetArtifactEditChannelStub(): void {
  editSaveCalls.length = 0;
  editSaveStub.outcomes = [];
  editSaveStub.defaultOutcome = { outcome: "saved", revisionId: "rev_2", revision: 2 };
  editSaveStub.gate = null;
}

/** Open a gate the next save will park on, with the handle to release it. */
export function gateNextSave(): () => void {
  let release = (): void => {};
  const promise = new Promise<void>((resolve) => {
    release = () => resolve();
  });
  editSaveStub.gate = { promise, release };
  return release;
}

export async function saveArtifactEdit(
  capability: unknown,
  text: string,
  deps?: { leaving?: boolean },
): Promise<unknown> {
  editSaveCalls.push({ capability, text, deps });
  const gate = editSaveStub.gate;
  if (gate) {
    editSaveStub.gate = null;
    await gate.promise;
  }
  return editSaveStub.outcomes.length > 0
    ? editSaveStub.outcomes.shift()
    : editSaveStub.defaultOutcome;
}

/** THE CHANNEL OWNS THE SENTENCE. This double answers with one no display could
 *  have written for itself, so a test that finds it in the toast has proved the
 *  display ASKED the channel rather than keeping a table of the product's words
 *  inside itself. The real sentences are pinned in the channel's own suite. */
export function artifactEditMessage(outcome: unknown): string | null {
  const read = (outcome ?? {}) as { outcome?: string; reason?: string };
  if (!read.outcome || read.outcome === "saved" || read.outcome === "unchanged") return null;
  return `channel sentence for ${read.outcome}${read.reason ? `/${read.reason}` : ""}`;
}
