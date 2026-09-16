# Changelog

Notable changes to `@cinatra-ai/blog-post-artifact`, newest first. The version
here is the one `package.json` carries, and it is bumped in the same commit as
the change it names.

## 0.1.5

- The blog post's display draws its own **Code | Preview** strip over the post
  and edits in place. On the artifact's own page the Code view takes an edit
  with no edit mode to enter and no Save button to find; beside the tabs, alone
  with them in the header, one saving indicator spins from the moment the reader
  starts editing and becomes a check once the latest change is stored. A change
  set goes through the SDK's artifact edit capability and no other road, and a
  save that did not go through is reported as a toast rather than as a row
  written into the panel.
- Where the host mints a read-only capability — the review card in a
  conversation, the widget inside a third-party application, any review target —
  the same display is drawn with both tabs and neither editable, opening on
  Preview. A display's chrome travels with it, so the strip is drawn wherever
  the post is read.
- The display is registered for the `detail` slot of this extension's own type
  and published at `./src/renderers/detail`; the `preview` entry keeps drawing
  the compact reading unchanged.
- The SDK's shared markdown sanitizer remains the one road for stored content
  into the page.

## 0.1.4

- The blog post text display, drawn on the review card and inside a third-party
  application.
