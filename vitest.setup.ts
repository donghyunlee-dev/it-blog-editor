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

// jsdom은 IntersectionObserver도 구현하지 않는다(P8-5 — TableOfContents.tsx가 스크롤에
// 따라 활성 헤딩을 추적하는 데 쓴다). 기본값은 아무것도 관찰하지 않는 no-op 스텁이다 —
// 실제 교차 이벤트를 시뮬레이션해야 하는 TableOfContents.test.tsx는 이 전역 스텁을
// vi.stubGlobal로 자기 것으로 덮어써서 콜백을 직접 제어한다.
if (typeof window.IntersectionObserver === "undefined") {
  class NoopIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  window.IntersectionObserver = NoopIntersectionObserver;
}

// We don't enable Vitest's `globals: true` mode, so React Testing Library's
// own auto-cleanup (which relies on detecting a global `afterEach`) never
// fires. Without this, DOM nodes from one test's render() linger into the
// next test in the same file, causing "multiple elements found" failures.
afterEach(() => {
  cleanup();
});
