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

// jsdom도 Element.prototype.scrollIntoView을 구현하지 않는다(P7-7 — 브레드크럼에서 폴더로
// "이동"하면 사이드바가 그 폴더 행으로 스크롤한다). 호출 자체는 막지 않고 그냥 no-op으로
// 둔다 — 위 matchMedia 스텁과 같은 이유.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// We don't enable Vitest's `globals: true` mode, so React Testing Library's
// own auto-cleanup (which relies on detecting a global `afterEach`) never
// fires. Without this, DOM nodes from one test's render() linger into the
// next test in the same file, causing "multiple elements found" failures.
afterEach(() => {
  cleanup();
});
