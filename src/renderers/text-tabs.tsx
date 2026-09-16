"use client";

// THE POST'S TWO TABS, ITS EDITABLE CODE VIEW AND ITS SAVING INDICATOR.
//
// THE DRAWING, IN ITS OWN WORDS:
//   "Two tabs, and only one of them on screen … Only the ACTIVE tab's view is
//    shown: Code shows the markdown as it is written — syntax-highlighted,
//    never plain text … Preview renders it."
//   "Editable where the artifact lives, read-only where it is reviewed. On the
//    artifact's own page the Code view takes an edit IN PLACE: there is no edit
//    mode to enter and no Save button to find … On a review target the same
//    display is drawn read-only — both tabs, neither editable."
//   "The saving indicator says where the change is. BESIDE THE TABS — ALONE
//    WITH THEM IN THE HEADER — sits one indicator with two readings while all
//    is well: a spinner from the moment the reader starts editing, and a check
//    once the latest change is stored."
//   "The reason is a TOAST, never a note inside the display."
//
// TABS ARE TABS. The header is a real `tablist` of real `tab` buttons over a
// real `tabpanel`: `aria-selected`, `aria-controls`, roving focus with the
// arrow keys, Home and End — the pattern the application uses everywhere, not a
// toggle wearing tab paint.
//
// NOTHING ELSE IS IN THE HEADER. No renderer name, no package, no pill: the
// drawing removed that chrome from every artifact rendering, and what sits
// beside the tabs is the indicator and nothing else — and on a read-only
// surface, not even that, because there is no save to report.
//
// THE CHROME TRAVELS WITH THE DISPLAY. This is the whole display, mounted
// unchanged by every surface the post is read on; only the EDIT CAPABILITY the
// host minted differs, which is what makes "read-only where it is reviewed" a
// property of the props rather than of this file remembering to behave.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";

import { cinatraToast } from "@cinatra-ai/sdk-ui/toast";
import {
  artifactEditMessage,
  saveArtifactEdit,
} from "@cinatra-ai/sdk-extensions/artifact-edit-channel";

import {
  ARTIFACT_EDIT_IDLE_PAUSE_MS,
  isArtifactEditGranted,
  type ArtifactEditCapability,
  type ArtifactEditOutcome,
} from "../artifact-edit-channel";
import { TextBody, TextTruncationNote, TEXT_RENDERER_NAME } from "./text-document";
import { TextDisplayStyle } from "./text-display-style";
import { createChangeSetQueue, type ChangeSetQueue } from "./text-change-set-queue";
import { highlightMarkdownSource } from "./text-code-highlight";
import { renderTextHtml } from "./text-view";
import type { TextView } from "./text-view-contract";

export type TextTab = "code" | "preview";

/** What the indicator is saying. `null` is "nothing to say yet" — before the
 *  first edit there is no save to report, and an indicator that read Saved on
 *  open would be claiming something no save has established. */
export type SavingIndicator = null | "saving" | "saved" | "not-saved";

const TAB_LABELS: Record<TextTab, string> = { code: "Code", preview: "Preview" };
const TAB_ORDER: TextTab[] = ["code", "preview"];

/** The design system's own tab LAYOUT, mirrored so both read as one component.
 *  The active tab's colour and its 2px underline are NOT here: they are in the
 *  stylesheet this display ships (`text-display-style`), because a host
 *  generates a utility class only when it finds that class in a tree it scans,
 *  and it does not scan this package. */
const TAB_BASE =
  "relative inline-flex items-center gap-1.5 whitespace-nowrap px-1 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const TAB_INACTIVE = "text-muted-foreground hover:text-foreground";

/** ONE font metric for the overlay and the textarea. They must agree exactly or
 *  the caret drifts away from the letters underneath it. */
const CODE_TEXT = "font-mono text-[12.5px] leading-6 whitespace-pre-wrap break-words";

function SpinnerIcon(): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
      className="size-3.5 animate-spin text-primary"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CheckIcon(): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-3.5"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** The indicator, in its readings. Absent when there is nothing to say. */
function SavingIndicatorView({ state }: { state: SavingIndicator }): ReactElement | null {
  if (state === null) return null;
  const saved = state === "saved";
  return (
    <span
      role="status"
      aria-live="polite"
      data-saving-indicator={state}
      className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground"
      style={saved ? { color: "var(--success, currentColor)" } : undefined}
    >
      {saved ? <CheckIcon /> : <SpinnerIcon />}
      {saved ? "Saved" : state === "saving" ? "Saving…" : "Not saved"}
    </span>
  );
}

/** The highlighted source, drawn under the textarea (and alone, read-only). */
function CodeText({
  source,
  alignWithEditor,
}: {
  source: string;
  /** True when this text sits UNDER a textarea and must match its box exactly. */
  alignWithEditor: boolean;
}): ReactElement {
  const tokens = useMemo(() => highlightMarkdownSource(source), [source]);
  return (
    <>
      {tokens.map((token, index) => (
        <span key={index} data-token={token.kind}>
          {token.text}
        </span>
      ))}
      {/* A trailing newline is not rendered by the browser, so the overlay would
          end one line short of the textarea, and the caret on that last empty
          line would sit over nothing. A zero-width character gives that line
          something to be. Drawn ONLY under an editor: a read-only reading has
          no caret to keep aligned and no reason to carry it. */}
      {alignWithEditor && source.endsWith("\n") ? "​" : null}
    </>
  );
}

export function TextTabbedDisplay({
  view,
  edit,
  slot = "detail",
}: {
  /** The resolved DOCUMENT view: the pinned text, its sanitized rendering, the
   *  revision it was read from, and whether the channel had to cut it. */
  view: Extract<TextView, { kind: "document" }>;
  /** The host's edit capability: a grant, or a named refusal. */
  edit: ArtifactEditCapability | null | undefined;
  slot?: "detail" | "preview";
}): ReactElement {
  const source = view.source;
  const revisionId = view.revisionId;
  const granted = isArtifactEditGranted(edit) ? edit : null;
  // WHICH TAB A SURFACE OPENS ON is a statement about what that surface is for.
  // The artifact's own page IS the editor, so it opens on Code, where the caret
  // already is. A review target is a READING, so it opens on the rendered post
  // — "a reviewer decides on the work as it will read, and the source stays a
  // tab away for whoever wants it".
  //
  // WHICH TAB OPENS IS A QUESTION ABOUT THE SURFACE, NOT ABOUT RIGHTS. The host
  // names the surface itself — a review binder mints the refusal
  // `read-only-surface`, which means "this is not the artifact's own page" — so
  // that is what is asked here, and every other refusal keeps the page's own
  // opening view.
  const [tab, setTab] = useState<TextTab>(
    edit?.kind === "read-only" && edit.reason === "read-only-surface" ? "preview" : "code",
  );
  const [text, setText] = useState(source);
  /**
   * THE REVISION THE VIEW IS READING, which is not always the one the page was
   * opened on: a stored change set mints a new revision and the text on screen
   * is that revision's, and a refused save RELOADS the newer revision's own
   * text into the view. It does NOT claim that the characters on screen this
   * instant are stored — the saving indicator beside the tabs is what says
   * that.
   */
  const [shownRevisionId, setShownRevisionId] = useState(revisionId);
  /**
   * THE POST AS IT IS ON SCREEN, readable from a save's callback without making
   * that callback depend on a render. An outcome describes the change set that
   * was SENT; whether it is also the latest thing the person typed is a
   * comparison against this.
   */
  const textRef = useRef(source);
  const [indicator, setIndicator] = useState<SavingIndicator>(null);
  /**
   * A COMPOSITION IS IN PROGRESS — an input method is assembling a word out of
   * keystrokes, and every intermediate state arrives as an ordinary change.
   * Those states are drawn, but none of them bounds a change set: half a word
   * is text nobody wrote.
   */
  const composingRef = useRef(false);
  const baseRef = useRef(granted?.baseRevisionId ?? revisionId);
  const idPrefix = useId();
  const tabRefs = useRef<Partial<Record<TextTab, HTMLButtonElement | null>>>({});

  // The post the host handed us changed under our feet (a fresh page render on
  // a newer revision): take it, and forget any indicator from the last one.
  useEffect(() => {
    setText(source);
    textRef.current = source;
    setIndicator(null);
    setShownRevisionId(revisionId);
    baseRef.current = granted?.baseRevisionId ?? revisionId;
  }, [source, revisionId, granted?.baseRevisionId]);

  const applyOutcome = useCallback(
    (outcome: ArtifactEditOutcome, sentText: string, queue: ChangeSetQueue | null) => {
      // THE CHECK MEANS "THE LATEST CHANGE IS STORED", and nothing weaker. A
      // save that settles while the person has already typed past it stored an
      // OLDER post, so the spinner stays until the change set that is on screen
      // has been stored too.
      const storedTheLatest = sentText === textRef.current;
      if (outcome.outcome === "saved") {
        baseRef.current = outcome.revisionId;
        setShownRevisionId(outcome.revisionId);
        setIndicator(storedTheLatest ? "saved" : "saving");
        return;
      }
      if (outcome.outcome === "unchanged") {
        setIndicator(storedTheLatest ? "saved" : "saving");
        return;
      }
      if (outcome.outcome === "stale") {
        // REFUSED, NEVER WRITTEN OVER. The editor RELOADS: the newer revision's
        // own text replaces what is on screen, and the next change set is made
        // against that revision. What was waiting to be sent is forgotten
        // first — it belongs to the post that has just been replaced.
        queue?.cancelPending();
        baseRef.current = outcome.latestRevisionId;
        setText(outcome.text);
        textRef.current = outcome.text;
        setShownRevisionId(outcome.latestRevisionId);
        setIndicator("not-saved");
        // THE SENTENCE IS THE CHANNEL'S, NEVER THIS DISPLAY'S. What the product
        // says when a save does not go through lives on the contract, so two
        // displays can never explain the same refusal in two different ways.
        reportThroughToast(outcome, "warning");
        return;
      }
      setIndicator("not-saved");
      reportThroughToast(outcome, "error");
    },
    [],
  );

  // ONE QUEUE PER EDITOR, living as long as the capability it saves under.
  const queue = useMemo(() => {
    if (!granted) return null;
    // The queue is handed to its own outcome callback so a refusal can drop the
    // change set waiting behind it; it is assigned before any save can settle,
    // so the read is never null there.
    let created: ChangeSetQueue | null = null;
    created = createChangeSetQueue<ArtifactEditOutcome>({
      idlePauseMs: granted.idlePauseMs || ARTIFACT_EDIT_IDLE_PAUSE_MS,
      save: (next, options) =>
        saveArtifactEdit({ ...granted, baseRevisionId: baseRef.current }, next, {
          leaving: options.leaving,
        }) as Promise<ArtifactEditOutcome>,
      onOutcome: (outcome, sentText) => applyOutcome(outcome, sentText, created),
    });
    return created;
  }, [granted, applyOutcome]);

  // LEAVING THE VIEW, in every way a person leaves it: the component going away
  // (navigating off the page), and the tab or window being hidden. Both flush
  // whatever the pause has not sent yet.
  useEffect(() => {
    if (!queue) return;
    // A COMPOSITION IN PROGRESS IS CONSUMED FIRST: a word being assembled by an
    // input method is deliberately not in the queue, so tearing the queue down
    // without taking it is exactly how the last thing a person typed
    // disappears.
    const leave = (): void => {
      if (composingRef.current) {
        composingRef.current = false;
        queue.edited(textRef.current);
      }
    };
    const flush = (): void => {
      leave();
      queue.flush(true);
    };
    const onVisibility = (): void => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") flush();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", flush);
      document.addEventListener("visibilitychange", onVisibility);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("pagehide", flush);
        document.removeEventListener("visibilitychange", onVisibility);
      }
      // UNMOUNTING IS LEAVING TOO, and a route change fires none of the events
      // above. `dispose` sends what is in the slot; the composition has to
      // reach the slot before it does.
      leave();
      queue.dispose();
    };
  }, [queue]);

  const onEdited = (next: string): void => {
    setText(next);
    textRef.current = next;
    // THE SPINNER STARTS AT THE EDIT, not at the send: "a spinner from the
    // moment the reader starts editing", so the seconds of the idle pause are
    // covered too.
    setIndicator("saving");
    // MID-COMPOSITION, THE CLOCK DOES NOT START.
    if (composingRef.current) return;
    queue?.edited(next);
  };

  /** Send whatever is unsent NOW. A composition in progress is CONSUMED first:
   *  what the reader can see is what has to be saved. */
  const flushNow = (leaving: boolean): void => {
    if (composingRef.current) {
      composingRef.current = false;
      queue?.edited(textRef.current);
    }
    queue?.flush(leaving);
  };

  const selectTab = (next: TextTab): void => {
    // Leaving the Code view is one of the two things that bounds a change set.
    // The POST is not going anywhere, so this is not a leaving save.
    if (tab === "code" && next !== "code") flushNow(false);
    setTab(next);
  };

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    const index = TAB_ORDER.indexOf(tab);
    let next: TextTab | null = null;
    if (event.key === "ArrowRight") next = TAB_ORDER[(index + 1) % TAB_ORDER.length];
    else if (event.key === "ArrowLeft")
      next = TAB_ORDER[(index - 1 + TAB_ORDER.length) % TAB_ORDER.length];
    else if (event.key === "Home") next = TAB_ORDER[0];
    else if (event.key === "End") next = TAB_ORDER[TAB_ORDER.length - 1];
    if (!next) return;
    event.preventDefault();
    selectTab(next);
    tabRefs.current[next]?.focus();
  };

  // THE PINNED POST IS SANITIZED ONCE, and the keystrokes after it are
  // sanitized as they come. `resolveTextView` already rendered the pinned text
  // with the same call and the same options, so while nothing has been typed
  // this tab draws THAT rendering rather than asking for an identical second
  // one — which is what keeps "the pinned text goes to the one shared sanitizer
  // exactly once" true on a surface that opens on Preview.
  const html = useMemo(
    () => (tab !== "preview" ? "" : text === source ? view.html : renderTextHtml(text)),
    [tab, text, source, view.html],
  );

  return (
    <article
      className="soft-panel rounded-card overflow-hidden"
      data-artifact-renderer={TEXT_RENDERER_NAME}
      data-slot={slot}
      data-revision={shownRevisionId}
      data-editable={granted ? "true" : "false"}
      {...(view.truncated ? { "data-truncated": "true" } : {})}
      {...(granted
        ? {}
        : { "data-read-only-reason": edit?.kind === "read-only" ? edit.reason : "no-capability" })}
    >
      <TextDisplayStyle />
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3">
        <div role="tablist" aria-label="Blog post views" className="inline-flex items-center gap-4">
          {TAB_ORDER.map((name) => (
            <button
              key={name}
              ref={(node) => {
                tabRefs.current[name] = node;
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${name}`}
              aria-selected={tab === name}
              aria-controls={`${idPrefix}-panel-${name}`}
              tabIndex={tab === name ? 0 : -1}
              onClick={() => selectTab(name)}
              onKeyDown={onTabKeyDown}
              data-active={tab === name ? "true" : "false"}
              className={`${TAB_BASE} ${tab === name ? "" : TAB_INACTIVE}`}
            >
              {TAB_LABELS[name]}
            </button>
          ))}
        </div>
        {/* Beside the tabs, ALONE with them: the indicator, and only where there
            is a save to report. */}
        {granted ? <SavingIndicatorView state={indicator} /> : null}
      </div>

      {/* ONLY THE ACTIVE TAB'S VIEW IS SHOWN. The inactive panel is not hidden
          with a class — it is not rendered at all, so "the two are never drawn
          side by side" is a property of the tree rather than of a stylesheet. */}
      {tab === "code" ? (
        <div
          role="tabpanel"
          id={`${idPrefix}-panel-code`}
          aria-labelledby={`${idPrefix}-tab-code`}
          data-panel="code"
          className="p-3"
        >
          {granted ? (
            <div className="relative">
              <pre aria-hidden="true" className={`m-0 ${CODE_TEXT} text-foreground`}>
                <CodeText source={text} alignWithEditor />
              </pre>
              {/* The caret and the letters are two layers of one view: a
                  transparent textarea over the highlighted text, sharing every
                  font metric. The highlighter's spans concatenate back to the
                  text character for character, which keeps them aligned. */}
              <textarea
                aria-label="Blog post source"
                data-code-editor=""
                spellCheck={false}
                value={text}
                onChange={(event) => onEdited(event.target.value)}
                onCompositionStart={() => {
                  composingRef.current = true;
                }}
                onCompositionEnd={(event) => {
                  composingRef.current = false;
                  const composed = event.currentTarget.value;
                  setText(composed);
                  textRef.current = composed;
                  setIndicator("saving");
                  queue?.edited(composed);
                }}
                onBlur={() => flushNow(false)}
                className={`absolute inset-0 h-full w-full resize-none border-0 bg-transparent p-0 text-transparent caret-foreground outline-none ${CODE_TEXT}`}
              />
            </div>
          ) : (
            <pre className={`m-0 ${CODE_TEXT} text-foreground`} data-code-readonly="">
              <CodeText source={text} alignWithEditor={false} />
            </pre>
          )}
          {view.truncated ? (
            <TextTruncationNote
              byteLength={view.byteLength}
              projectedByteLength={view.projectedByteLength}
            />
          ) : null}
        </div>
      ) : (
        <div
          role="tabpanel"
          id={`${idPrefix}-panel-preview`}
          aria-labelledby={`${idPrefix}-tab-preview`}
          data-panel="preview"
          className="p-6"
        >
          <TextBody html={html} compact={false} />
          {view.truncated ? (
            <TextTruncationNote
              byteLength={view.byteLength}
              projectedByteLength={view.projectedByteLength}
            />
          ) : null}
        </div>
      )}
    </article>
  );
}

/** The sentence a failed or refused save is explained with — asked of the edit
 *  channel, which owns it, and reported through the application's toast surface,
 *  never written into the panel. A save that went through says nothing: the
 *  indicator has already said it. */
function reportThroughToast(outcome: ArtifactEditOutcome, variant: "warning" | "error"): void {
  const sentence = artifactEditMessage(outcome);
  if (!sentence) return;
  if (variant === "warning") cinatraToast.warning(sentence);
  else cinatraToast.error(sentence);
}
