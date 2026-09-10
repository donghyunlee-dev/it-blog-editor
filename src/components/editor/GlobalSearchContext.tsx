"use client";

import { createContext, useContext } from "react";

interface GlobalSearchContextValue {
  /**
   * 기존 `GlobalSearchModal`(Ctrl+K)을 연다 — 헤더 검색 버튼(P8-1)이 쓰는 것과 같은
   * 트리거다. 랜딩 화면 히어로의 큰 검색 버튼(P8-4)처럼 `EditorShell`이 렌더링하는
   * `children` 트리 깊숙한 곳(서버 컴포넌트인 라우트 페이지 아래)에서도 같은 모달을
   * 열 수 있어야 해서, `EditorShell.tsx`가 이미 갖고 있는 `triggerSearch`를 prop
   * 드릴링 대신 Context로도 함께 내려준다.
   */
  triggerSearch: () => void;
}

/**
 * Provider 없이 쓰이면(예: 이 컴포넌트를 단독 렌더링하는 테스트) 아무 일도 하지 않는다 —
 * `UnsavedChangesContext.tsx`와 같은 "기본값이 no-op인 Context" 패턴이다.
 */
const noop = () => {};
const GlobalSearchContext = createContext<GlobalSearchContextValue>({
  triggerSearch: noop,
});

export function useGlobalSearch(): GlobalSearchContextValue {
  return useContext(GlobalSearchContext);
}

export const GlobalSearchProvider = GlobalSearchContext.Provider;
