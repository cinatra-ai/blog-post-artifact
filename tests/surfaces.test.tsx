// ACCEPTANCE 1 — this extension's display draws a blog post ON THE PAGE,
// ON THE REVIEW CARD AND INSIDE A THIRD-PARTY APPLICATION, at the pinned
// revision.
//
// Three surfaces, three mounts, one display: the artifact page mounts the
// `detail` entry, the review card mounts the `preview` entry READ-ONLY, and
// inside a third-party application the same entry is mounted on a snapshot
// whose host-authorized addresses are island-scoped. Every mount asserts the
// PINNED revision it drew, because a display that drew the right words at the
// wrong revision is a display that lied about what is under review.
//
// What the sanitizer admits and strips is pinned against the REAL leaf where
// the SDK lives; here the recording double proves this package's own half —
// the pinned text goes to the one shared sanitizer, its output is injected
// verbatim, and the document's own markup reaches the DOM by no other road.

import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import Detail from "../src/renderers/detail";
import Preview from "../src/renderers/preview";
import { TEXT_DISPLAY_PROPS_API_VERSION } from "../src/renderers/text-view";
import type { ArtifactRendererProps } from "../src/artifact-renderer-props";
import { ISLAND_BYTE_ADDRESS, islandProps, props, textContent } from "./props-fixture";
import { REAL_SANITIZER } from "./sanitizer-mode";
import {
  resetMarkdownSanitizerStub,
  sanitizerCalls,
  sanitizerStubState,
} from "./stubs/markdown-sanitizer-stub";

const BODY = "# A blog post\n\n<img src=x onerror=alert(1)>\n\n[a link](https://example.test)";
const RENDERER = "blog-post";

type Entry = (p: ArtifactRendererProps) => ReactElement;

/** The three surfaces, named as the acceptance names them. */
const SURFACES: Array<{
  name: string;
  slot: "detail" | "preview";
  Entry: Entry;
  build: (content: ReturnType<typeof textContent>) => ArtifactRendererProps;
  compact: boolean;
}> = [
  {
    name: "the artifact page",
    slot: "detail",
    Entry: Detail as Entry,
    build: (c) => props(c),
    compact: false,
  },
  {
    name: "the review card",
    slot: "preview",
    Entry: Preview as Entry,
    build: (c) => props(c),
    compact: true,
  },
  {
    name: "inside a third-party application",
    slot: "preview",
    Entry: Preview as Entry,
    build: (c) => islandProps(c),
    compact: true,
  },
];

afterEach(cleanup);

describe.skipIf(REAL_SANITIZER)("the display draws on every surface, at the pinned revision", () => {
  beforeEach(() => {
    resetMarkdownSanitizerStub();
  });

  for (const surface of SURFACES) {
    it(`draws on ${surface.name}, naming the revision the channel pinned`, () => {
      const { container } = render(
        <surface.Entry
          {...surface.build(textContent(BODY, { representationRevisionId: "rev_7" }))}
          representation={{ revisionId: "rev_7", mime: "text/markdown" }}
        />,
      );
      const root = container.querySelector(`[data-artifact-renderer='${RENDERER}']`);
      expect(root).not.toBeNull();
      expect(root?.getAttribute("data-slot")).toBe(surface.slot);
      expect(root?.getAttribute("data-revision")).toBe("rev_7");
      expect(root?.getAttribute("data-compact")).toBe(surface.compact ? "true" : null);
    });

    it(`on ${surface.name} it hands the PINNED text to the shared sanitizer exactly once`, () => {
      render(<surface.Entry {...surface.build(textContent(BODY))} />);
      expect(sanitizerCalls).toHaveLength(1);
      expect(sanitizerCalls[0].markdown).toBe(BODY);
    });

    it(`on ${surface.name} it injects the sanitizer's OUTPUT, never the stored markup`, () => {
      sanitizerStubState.html = '<p data-marker="from-the-sanitizer">only this</p>';
      const { container } = render(<surface.Entry {...surface.build(textContent(BODY))} />);
      expect(container.querySelector('[data-marker="from-the-sanitizer"]')).not.toBeNull();
      expect(container.innerHTML).not.toContain("onerror");
      expect(container.innerHTML).not.toContain("# A blog post");
    });

    it(`on ${surface.name} it is READ-ONLY: nothing to edit, and no Regenerate`, () => {
      // The plan's ruling: Regenerate belongs to the review screen, never to a
      // renderer, and no display this wave adds carries a mutation affordance.
      const { container } = render(<surface.Entry {...surface.build(textContent(BODY))} />);
      expect(container.querySelector("button")).toBeNull();
      expect(container.querySelector("input")).toBeNull();
      expect(container.querySelector("textarea")).toBeNull();
      expect(container.querySelector("form")).toBeNull();
      expect(container.querySelector("[contenteditable]")).toBeNull();
      expect(container.textContent ?? "").not.toContain("Regenerate");
    });

    it(`on ${surface.name} it never reaches for the content: no request road is touched`, () => {
      // A display that fetched is exactly the display that paints nothing
      // inside a third-party application. Watched, not asserted by hand: every
      // road out of the page is replaced and must stay untouched.
      const calls: string[] = [];
      const win = window as unknown as Record<string, unknown>;
      const saved = {
        fetch: win.fetch,
        XMLHttpRequest: win.XMLHttpRequest,
        EventSource: win.EventSource,
        WebSocket: win.WebSocket,
        sendBeacon: (win.navigator as Navigator | undefined)?.sendBeacon,
      };
      win.fetch = (...a: unknown[]) => {
        calls.push(`fetch ${String(a[0])}`);
        return Promise.reject(new Error("no"));
      };
      class WatchedXhr {
        open(_m: string, u: string) {
          calls.push(`xhr ${u}`);
        }
        send() {}
        setRequestHeader() {}
      }
      win.XMLHttpRequest = WatchedXhr as unknown;
      win.EventSource = class {
        constructor(u: string) {
          calls.push(`sse ${u}`);
        }
      } as unknown;
      win.WebSocket = class {
        constructor(u: string) {
          calls.push(`ws ${u}`);
        }
      } as unknown;
      (win.navigator as Navigator).sendBeacon = ((u: string) => {
        calls.push(`beacon ${u}`);
        return true;
      }) as Navigator["sendBeacon"];
      try {
        const { container } = render(<surface.Entry {...surface.build(textContent(BODY))} />);
        expect(calls).toEqual([]);
        expect(container.querySelector("iframe")).toBeNull();
        expect(container.querySelector("img")).toBeNull();
      } finally {
        win.fetch = saved.fetch;
        win.XMLHttpRequest = saved.XMLHttpRequest;
        win.EventSource = saved.EventSource;
        win.WebSocket = saved.WebSocket;
        if (saved.sendBeacon) {
          (win.navigator as Navigator).sendBeacon = saved.sendBeacon;
        } else {
          delete (win.navigator as unknown as Record<string, unknown>).sendBeacon;
        }
      }
    });
  }

  it("inside a third-party application it draws no byte address at all", () => {
    // The island's byte address is a SUBRESOURCE address sealed to one gate and
    // one revision; the route refuses every navigation. A text display has no
    // bytes to paint, so it must put that address nowhere — a link to it would
    // be a dead end drawn inside somebody else's page.
    const { container } = render(<Preview {...islandProps(textContent(BODY))} />);
    expect(container.innerHTML).not.toContain(ISLAND_BYTE_ADDRESS);
    expect(container.querySelector("a")).toBeNull();
  });

  it("refuses a snapshot built at a props version it did not agree to read", () => {
    const { container } = render(
      <Detail {...props(textContent(BODY), { propsApiVersion: TEXT_DISPLAY_PROPS_API_VERSION + 1 })} />,
    );
    expect(container.querySelector("[data-floor='props-version']")).not.toBeNull();
  });

  it("refuses to draw one revision's words under another revision's name", () => {
    const { container } = render(<Detail {...props(textContent(BODY, { representationRevisionId: "rev_9" }))} />);
    expect(container.querySelector("[data-floor='content-revision-mismatch']")).not.toBeNull();
  });

  it("floors, NAMED and never blank, for every content it cannot draw", () => {
    const cases: Array<[ArtifactRendererProps, string]> = [
      [props({ kind: "none", channelVersion: 1, representationRevisionId: null, reason: "absent" }), "content-absent"],
      [props({ kind: "none", channelVersion: 1, representationRevisionId: "rev_1", reason: "over-cap" }), "content-over-cap"],
      [
        props({ kind: "none", channelVersion: 1, representationRevisionId: "rev_1", reason: "unsupported-form" }),
        "content-unsupported-form",
      ],
      [
        props({
          kind: "configuration",
          channelVersion: 1,
          representationRevisionId: "rev_1",
          configuration: {},
          digest: "d",
          byteLength: 2,
          projectedByteLength: 2,
          cap: 131072,
        }),
        "content-not-text",
      ],
      [props(textContent("   \n  ")), "empty-document"],
      [
        props(textContent(BODY), {
          content: { kind: "text", channelVersion: 2, representationRevisionId: "rev_1" } as never,
        }),
        "channel-version",
      ],
    ];
    for (const [p, reason] of cases) {
      const { container, unmount } = render(<Detail {...p} />);
      const floor = container.querySelector(`[data-floor='${reason}']`);
      expect(floor, reason).not.toBeNull();
      expect((floor?.textContent ?? "").trim().length, reason).toBeGreaterThan(0);
      unmount();
    }
  });
});
