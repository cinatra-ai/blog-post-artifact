// @vitest-environment node
// ACCEPTANCE 1, the packaging half: the display is REGISTERED FOR THIS
// EXTENSION'S OWN TYPE, published through this package's OWN `exports` at the
// key the host's manifest generator derives, and declared at the props version
// the display actually accepts a snapshot at.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { TEXT_DISPLAY_PROPS_API_VERSION } from "../src/renderers/text-view";
import { blogPostArtifactManifest } from "../src/index";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as {
  name: string;
  main: string;
  files: string[];
  exports: Record<string, string>;
  peerDependencies: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  cinatra: {
    kind: string;
    artifact: {
      accepts: { file: { mimeTypes: string[] } };
      ui: {
        abiVersion: number;
        sdkAbiRange: string;
        renderers: Record<string, { entry: string; propsApiVersion: number; representations?: string[] }>;
      };
      objectTypes: Array<{ type: string }>;
    };
  };
};

const MIMES = ["text/markdown"];
const OWN_TYPE = "@cinatra-ai/blog-post-artifact:post";
const ARTIFACT_UI_RENDERER_ALLOWED_KEYS = new Set(["entry", "propsApiVersion", "representations"]);

/** The key the host's manifest generator derives from a renderer entry: the
 * entry path minus its source extension. A display is published only at THIS
 * key — the generator refuses to generate when nothing resolves it. */
function generatorExportsKeyForEntry(entry: string): string {
  return `./${entry.replace(/^\.\//, "").replace(/\.(ts|tsx)$/, "")}`;
}

describe("the display is declared for this extension's own type", () => {
  it("declares a strict v1 ui block bound to the generated host SDK ABI range", () => {
    const ui = pkg.cinatra.artifact.ui;
    expect(ui.abiVersion).toBe(1);
    expect(ui.sdkAbiRange).toBe("^2.5.0");
  });

  it("ships BOTH the detail and the preview display, each naming its own entry", () => {
    const renderers = pkg.cinatra.artifact.ui.renderers;
    expect(Object.keys(renderers).sort()).toEqual(["detail", "preview"]);
    expect(renderers.detail.entry).toBe("./src/renderers/detail.tsx");
    expect(renderers.preview.entry).toBe("./src/renderers/preview.tsx");
  });

  it("draws only the representation forms this extension itself accepts — no wildcard, no foreign form", () => {
    // "Registered for its own type with no content-form registration": the
    // slots name this extension's OWN accepted forms and claim no form beyond
    // them, so this display never wins for another extension's artifact.
    expect(pkg.cinatra.artifact.accepts.file.mimeTypes).toEqual(MIMES);
    for (const renderer of Object.values(pkg.cinatra.artifact.ui.renderers)) {
      expect(renderer.representations).toEqual(MIMES);
      for (const form of renderer.representations ?? []) {
        expect(form.includes("*")).toBe(false);
        expect(pkg.cinatra.artifact.accepts.file.mimeTypes).toContain(form);
      }
    }
    expect(pkg.cinatra.artifact.objectTypes.map((c) => c.type)).toContain(OWN_TYPE);
  });

  it("declares the props version the display actually accepts a snapshot at", () => {
    const renderers = Object.values(pkg.cinatra.artifact.ui.renderers);
    expect(renderers.length).toBeGreaterThan(0);
    for (const renderer of renderers) {
      expect(renderer.propsApiVersion).toBe(TEXT_DISPLAY_PROPS_API_VERSION);
      for (const k of Object.keys(renderer)) {
        expect(ARTIFACT_UI_RENDERER_ALLOWED_KEYS.has(k)).toBe(true);
      }
    }
  });

  it("requests NO host ports — a v1 display renders from the snapshot alone", () => {
    for (const renderer of Object.values(pkg.cinatra.artifact.ui.renderers)) {
      expect(Object.keys(renderer).sort()).toEqual(["entry", "propsApiVersion", "representations"]);
    }
  });

  it("takes the sanitizer from the SDK as the OPTIONAL host-provided peer it is", () => {
    expect(pkg.peerDependencies["@cinatra-ai/sdk-extensions"]).toBeDefined();
    expect(pkg.peerDependenciesMeta?.["@cinatra-ai/sdk-extensions"]?.optional).toBe(true);
  });

  it("keeps the typed src manifest in agreement with package.json", () => {
    expect(blogPostArtifactManifest.ui).toEqual(pkg.cinatra.artifact.ui);
    expect(blogPostArtifactManifest.accepts).toEqual(pkg.cinatra.artifact.accepts);
  });
});

describe("the display is published by the package itself", () => {
  it("declares an exports subpath map, never a bare sugar target", () => {
    expect(typeof pkg.exports).toBe("object");
    expect(Array.isArray(pkg.exports)).toBe(false);
    for (const key of Object.keys(pkg.exports)) {
      expect(key.startsWith(".")).toBe(true);
      expect(key.includes("*")).toBe(false);
    }
  });

  it("publishes EVERY declared display at the generator's key", () => {
    for (const renderer of Object.values(pkg.cinatra.artifact.ui.renderers)) {
      const key = generatorExportsKeyForEntry(renderer.entry);
      expect(Object.keys(pkg.exports)).toContain(key);
      expect(pkg.exports[key]).toBe(renderer.entry);
    }
  });

  it("keeps the package ROOT importable — an exports map closes every path it does not name", () => {
    expect(pkg.exports["."]).toBe("./src/index.ts");
    expect(pkg.exports["."]).toBe(pkg.main);
  });

  it("keeps every exports target inside the published files allowlist, and existing", () => {
    expect(pkg.files).toContain("src");
    for (const target of Object.values(pkg.exports)) {
      expect(target.startsWith("./src/")).toBe(true);
      const resolved = fileURLToPath(new URL(`../${target.slice(2)}`, import.meta.url));
      expect(() => readFileSync(resolved, "utf8")).not.toThrow();
    }
  });
});
