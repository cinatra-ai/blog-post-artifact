// ACCEPTANCE — THE POST'S OWN DISPLAY DRAWS THE CODE | PREVIEW STRIP AND EDITS
// IN PLACE, and it draws that chrome on EVERY surface the post is read on.
//
// THE DRAWING, IN ITS OWN WORDS (app-artifact-review §XI and §V.1,
// app-lifecycle-cards §XIII):
//   "The same display is drawn, unchanged, wherever the artifact is read — the
//    artifact page here, the review step on the run page (§I.3) and the review
//    card in a conversation (Lifecycle cards §XIII). A display's chrome travels
//    with it: what it carries here it carries there."
//   "Two tabs, and only one of them on screen … Code shows the markdown as it
//    is written — syntax-highlighted, never plain text … Preview renders it."
//   "On the artifact's own page the Code view takes an edit in place: there is
//    no edit mode to enter and no Save button to find, and a change is stored
//    as it is made. On a review target the same display is drawn read-only —
//    both tabs, neither editable."
//   "Beside the tabs — alone with them in the header — sits one indicator with
//    two readings while all is well: a spinner from the moment the reader
//    starts editing, and a check once the latest change is stored."
//   "The reason is a toast, never a note inside the display."
//
// THREE SURFACES, ONE DISPLAY. The detail entry is what every surface that
// READS the post mounts — its own page, the review card in a conversation, and
// the widget inside a third-party application — and each of them differs only
// in the EDIT CAPABILITY the host minted for it. That is what makes "read-only
// where it is reviewed" a property of the props rather than of this display
// remembering to behave.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

import Detail from "../src/renderers/detail";
import type { ArtifactRendererProps } from "../src/artifact-renderer-props";
import { editableEdit, islandProps, props, readOnlyEdit, textContent } from "./props-fixture";
import { REAL_SANITIZER } from "./sanitizer-mode";
import { resetMarkdownSanitizerStub } from "./stubs/markdown-sanitizer-stub";
import {
  artifactEditMessage,
  editSaveCalls,
  editSaveStub,
  resetArtifactEditChannelStub,
} from "./stubs/artifact-edit-channel-stub";
import { resetToastStub, toastCalls } from "./stubs/sdk-ui-toast-stub";

const BODY = "# A blog post\n\nThe draft continues here.\n";
const RENDERER = "blog-post";

/** A capability whose idle pause is short enough that a test need not drive a
 *  clock: every save below is bounded by LEAVING THE CODE VIEW (a blur), which
 *  is the other of the two things the channel says bounds a change set. */
const GRANT = editableEdit();

/** The surfaces this display is read on, exactly as the host mints them. */
const SURFACES: Array<{
  name: string;
  build: () => ArtifactRendererProps;
  editable: boolean;
  opensOn: "code" | "preview";
}> = [
  {
    name: "the artifact's own page",
    build: () => props(textContent(BODY), { edit: GRANT }),
    editable: true,
    opensOn: "code",
  },
  {
    name: "the review card in a conversation",
    build: () => props(textContent(BODY), { edit: readOnlyEdit("read-only-surface") }),
    editable: false,
    opensOn: "preview",
  },
  {
    name: "the widget inside a third-party application",
    build: () => islandProps(textContent(BODY), { edit: readOnlyEdit("read-only-surface") }),
    editable: false,
    opensOn: "preview",
  },
];

function tabs(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll("[role='tab']")] as HTMLElement[];
}

afterEach(() => {
  cleanup();
  resetArtifactEditChannelStub();
  resetToastStub();
  resetMarkdownSanitizerStub();
});

beforeEach(() => {
  resetArtifactEditChannelStub();
  resetToastStub();
  resetMarkdownSanitizerStub();
});

describe("a display's chrome travels with it: the strip is drawn on every surface", () => {
  for (const surface of SURFACES) {
    it(`on ${surface.name} it draws the strip, with its two tabs`, () => {
      const { container } = render(<Detail {...surface.build()} />);
      const root = container.querySelector(`[data-artifact-renderer='${RENDERER}']`);
      expect(root).not.toBeNull();
      expect(root?.getAttribute("data-slot")).toBe("detail");
      expect(container.querySelector("[role='tablist']")).not.toBeNull();
      expect(tabs(container).map((t) => t.textContent)).toEqual(["Code", "Preview"]);
    });

    it(`on ${surface.name} only the ACTIVE tab's view is on screen`, () => {
      const { container } = render(<Detail {...surface.build()} />);
      const panels = container.querySelectorAll("[role='tabpanel']");
      expect(panels).toHaveLength(1);
      expect(panels[0].getAttribute("data-panel")).toBe(surface.opensOn);
    });

    it(`on ${surface.name} the Code tab shows the source as it is written`, () => {
      const { container } = render(<Detail {...surface.build()} />);
      const code = tabs(container).find((t) => t.textContent === "Code");
      fireEvent.click(code as HTMLElement);
      const panel = container.querySelector("[data-panel='code']");
      expect(panel).not.toBeNull();
      expect(panel?.textContent).toContain("# A blog post");
      expect(panel?.textContent).toContain("The draft continues here.");
    });

    it(`on ${surface.name} there is no Save control anywhere, on either tab`, () => {
      const { container } = render(<Detail {...surface.build()} />);
      for (const name of ["Code", "Preview"]) {
        const tab = tabs(container).find((t) => t.textContent === name);
        fireEvent.click(tab as HTMLElement);
        const labels = [...container.querySelectorAll("button")].map((b) => b.textContent ?? "");
        expect(labels).toEqual(["Code", "Preview"]);
        expect(container.textContent ?? "").not.toContain("Save ");
        expect(container.querySelector("form")).toBeNull();
        expect(container.querySelector("input")).toBeNull();
      }
    });
  }

  it("a reader the host did not grant an edit sees the strip READ-ONLY: no editor on either tab", () => {
    for (const reason of ["read-only-surface", "no-write-rights"] as const) {
      const { container, unmount } = render(
        <Detail {...props(textContent(BODY), { edit: readOnlyEdit(reason) })} />,
      );
      for (const name of ["Code", "Preview"]) {
        const tab = tabs(container).find((t) => t.textContent === name);
        fireEvent.click(tab as HTMLElement);
        expect(container.querySelector("textarea"), `${reason}/${name}`).toBeNull();
        expect(container.querySelector("[contenteditable]"), `${reason}/${name}`).toBeNull();
      }
      // No save to report, so no indicator either.
      expect(container.querySelector("[data-saving-indicator]")).toBeNull();
      unmount();
    }
  });

  it("on the artifact's own page the Code view takes an edit IN PLACE — no edit mode to enter", () => {
    const { container } = render(<Detail {...props(textContent(BODY), { edit: GRANT })} />);
    expect(container.querySelector("[data-panel='code'] textarea[data-code-editor]")).not.toBeNull();
  });
});

describe.skipIf(REAL_SANITIZER)("the edit goes through the SDK's edit capability, under the saving indicator", () => {
  function openEditor(): { container: HTMLElement; editor: HTMLTextAreaElement } {
    const { container } = render(<Detail {...props(textContent(BODY), { edit: GRANT })} />);
    const editor = container.querySelector(
      "[data-panel='code'] textarea[data-code-editor]",
    ) as HTMLTextAreaElement;
    return { container, editor };
  }

  it("draws the spinner from the moment the reader starts editing", () => {
    const { container, editor } = openEditor();
    expect(container.querySelector("[data-saving-indicator]")).toBeNull();
    fireEvent.change(editor, { target: { value: `${BODY}One more sentence.` } });
    expect(container.querySelector("[data-saving-indicator='saving']")).not.toBeNull();
  });

  it("sends the change set through saveArtifactEdit and nothing else, and then reads as stored", async () => {
    const { container, editor } = openEditor();
    const next = `${BODY}One more sentence.`;
    fireEvent.change(editor, { target: { value: next } });
    // Leaving the Code view is one of the two things that bounds a change set.
    fireEvent.blur(editor);
    await waitFor(() => expect(editSaveCalls).toHaveLength(1));
    expect(editSaveCalls[0].text).toBe(next);
    expect((editSaveCalls[0].capability as { saveUrl?: string }).saveUrl).toBe(GRANT.saveUrl);
    expect((editSaveCalls[0].capability as { baseRevisionId?: string }).baseRevisionId).toBe(
      GRANT.baseRevisionId,
    );
    await waitFor(() =>
      expect(container.querySelector("[data-saving-indicator='saved']")).not.toBeNull(),
    );
  });

  it("never reads as stored before it is: a save that failed keeps the spinner and reports as a TOAST", async () => {
    editSaveStub.defaultOutcome = { outcome: "failed", reason: "transport" };
    const { container, editor } = openEditor();
    fireEvent.change(editor, { target: { value: `${BODY}Another sentence.` } });
    fireEvent.blur(editor);
    await waitFor(() => expect(editSaveCalls).toHaveLength(1));
    await waitFor(() =>
      expect(container.querySelector("[data-saving-indicator='not-saved']")).not.toBeNull(),
    );
    expect(container.querySelector("[data-saving-indicator='saved']")).toBeNull();
    // The reason is a toast, never a note written into the panel.
    expect(toastCalls).toHaveLength(1);
    expect(toastCalls[0].variant).toBe("error");
    expect(container.textContent ?? "").not.toContain(toastCalls[0].message);
  });

  // "what the product says when a save does not go through is the product's
  //  answer, and two displays must never explain the same refusal in two
  //  different ways" — the edit channel's own contract sentence. The sentence
  //  is ASKED OF THE CHANNEL; a table of the same words kept inside this
  //  display would drift from it silently.
  it("says what the CHANNEL says about a failed save, not a sentence of its own", async () => {
    const outcome = { outcome: "failed", reason: "transport" };
    editSaveStub.defaultOutcome = outcome;
    const { editor } = openEditor();
    fireEvent.change(editor, { target: { value: `${BODY}Another sentence.` } });
    fireEvent.blur(editor);
    await waitFor(() => expect(toastCalls).toHaveLength(1));
    expect(toastCalls[0].message).toBe(artifactEditMessage(outcome));
  });

  it("says what the CHANNEL says about a refused save, not a sentence of its own", async () => {
    const outcome = { outcome: "refused", reason: "over-cap" };
    editSaveStub.defaultOutcome = outcome;
    const { editor } = openEditor();
    fireEvent.change(editor, { target: { value: `${BODY}Another sentence.` } });
    fireEvent.blur(editor);
    await waitFor(() => expect(toastCalls).toHaveLength(1));
    expect(toastCalls[0].variant).toBe("error");
    expect(toastCalls[0].message).toBe(artifactEditMessage(outcome));
  });

  it("says what the CHANNEL says when the post moved on, and reloads the newer revision", async () => {
    const outcome = {
      outcome: "stale",
      latestRevisionId: "rev_9",
      latestRevision: 9,
      text: "# A newer blog post\n",
      truncated: false,
    };
    editSaveStub.defaultOutcome = outcome;
    const { container, editor } = openEditor();
    fireEvent.change(editor, { target: { value: `${BODY}Another sentence.` } });
    fireEvent.blur(editor);
    await waitFor(() => expect(toastCalls).toHaveLength(1));
    // Nothing was lost and the newer revision is already on screen, so this one
    // is a warning, not an error.
    expect(toastCalls[0].variant).toBe("warning");
    expect(toastCalls[0].message).toBe(artifactEditMessage(outcome));
    expect(container.textContent ?? "").not.toContain(toastCalls[0].message);
  });
});
