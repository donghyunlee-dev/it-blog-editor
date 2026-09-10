"use client";

import { SearchTriggerIcon } from "./EditorSidebar";
import { useGlobalSearch } from "./GlobalSearchContext";

/**
 * `/editor` 랜딩 화면(`src/app/editor/page.tsx`, 서버 컴포넌트) 히어로 영역에 놓이는 큰
 * 검색 버튼(P8-4, design.md "8. 검색" 절 — 레퍼런스 실측 420×49px). 레퍼런스도 실제로는
 * `<input>`이 아니라 클릭하면 커맨드 팔레트 모달을 여는 `<button>`이었다(design.md 같은
 * 절 확인) — 이 프로젝트도 새 검색 로직을 만들지 않고 헤더 검색 버튼(P8-1)과 완전히 같은
 * `useGlobalSearch().triggerSearch()`로 기존 `GlobalSearchModal`(Ctrl+K)을 그대로 연다.
 * 랜딩 화면은 서버 컴포넌트라 이 버튼만 별도 클라이언트 컴포넌트로 뗐다.
 */
export function LandingSearchButton() {
  const { triggerSearch } = useGlobalSearch();

  return (
    <button
      type="button"
      onClick={triggerSearch}
      aria-label="전체 검색 (Ctrl+K)"
      className="flex w-full items-center gap-2.5 rounded-btn border border-border bg-surface px-4 py-3 text-left text-sm text-muted shadow-sm transition-colors duration-default hover:bg-surface-raised hover:text-foreground"
    >
      <SearchTriggerIcon />
      <span className="flex-1">문서 검색...</span>
      <kbd className="shrink-0 rounded border border-border bg-surface-subtle px-1.5 py-0.5 text-xs font-medium text-muted">
        Ctrl K
      </kbd>
    </button>
  );
}
