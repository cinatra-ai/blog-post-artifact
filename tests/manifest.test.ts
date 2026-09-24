// @vitest-environment node
// The packaging of this extension: it registers NO display of its own — a blog
// post is drawn by the display of its content type — while it keeps its own
// accepted form, its own type, its optional SDK peer and an exports map that
// names only the package root and the suggestion projector.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

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
      ui?: {
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

describe("the display is declared for this extension's own type", () => {
  // A blog post is drawn by the display of its content type — markdown by the
  // Markdown extension's display, in the preview as on the full page — so this
  // package declares no `ui` block, its typed manifest carries no `ui` member,
  // and its exports publish no display subpath: only the package root and the
  // suggestion projector.
  it("registers NO renderer of its own for any slot", () => {
    expect(pkg.cinatra.artifact.ui).toBeUndefined();
    expect(blogPostArtifactManifest.ui).toBeUndefined();
    expect(Object.keys(pkg.exports).sort()).toEqual([".", "./src/suggestion-projector"]);
  });

  it("pins the form this extension accepts and its own type", () => {
    // The extension still accepts exactly its own markdown form and still claims
    // its own object type; only the display registration is gone.
    expect(pkg.cinatra.artifact.accepts.file.mimeTypes).toEqual(MIMES);
    expect(pkg.cinatra.artifact.objectTypes.map((c) => c.type)).toContain(OWN_TYPE);
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
