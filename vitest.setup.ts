import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// We don't enable Vitest's `globals: true` mode, so React Testing Library's
// own auto-cleanup (which relies on detecting a global `afterEach`) never
// fires. Without this, DOM nodes from one test's render() linger into the
// next test in the same file, causing "multiple elements found" failures.
afterEach(() => {
  cleanup();
});
