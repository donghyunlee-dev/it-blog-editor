import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// jsdom은 window.matchMedia를 구현하지 않는다. EditorShell처럼 반응형 분기에
// matchMedia를 쓰는 컴포넌트를 렌더링하는 테스트가 깨지지 않도록 기본 스텁을 둔다
// (기본값은 "매치 안 됨" — 필요하면 개별 테스트에서 vi.spyOn으로 덮어쓴다).
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}

// We don't enable Vitest's `globals: true` mode, so React Testing Library's
// own auto-cleanup (which relies on detecting a global `afterEach`) never
// fires. Without this, DOM nodes from one test's render() linger into the
// next test in the same file, causing "multiple elements found" failures.
afterEach(() => {
  cleanup();
});
