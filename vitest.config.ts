import { defineConfig } from "vitest/config";

// Package-local test config. Without it, running `vitest` from this package
// inside the cinatra monorepo layout (extensions/cinatra-ai/<slug>/) walks UP
// and loads the HOST ROOT vitest.config.ts, whose `include` matches nothing
// here — so the declared `pnpm test` collected zero files and exited 1
// ("No test files found"), i.e. it was a no-op in the layout that is supposed
// to be running it (cinatra#2288).
//
// Node env is correct: the renderer tests assert markup through
// `react-dom/server`'s renderToStaticMarkup — no DOM is touched. The JSX
// transform is taken from this package's own tsconfig ("jsx": "react-jsx").
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**"],
  },
});
