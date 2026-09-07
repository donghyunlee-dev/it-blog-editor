# P2-2: 문서-코드 드리프트 잔여 항목 정리 — 구현 계획

## Global Constraints
- 사이드바 활성 문서 강조 표시(`activePageId ?? extractPageIdFromPathname(pathname)`)의 정상 경로(`/editor/{pageId}`) 동작은 절대 바꾸지 않는다 — `/publish` 관련 죽은 코드만 제거한다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/EditorSidebar.test.tsx`

## Steps
- [ ] **Step 1**: `extractPageIdFromPathname`의 정규식에서 `(?:\/publish)?`를 제거하고, JSDoc에서 `/publish` 관련 서술을 지운다(왜 죽은 코드였는지는 `task.md`/`result.md`에 남기고, 함수 자체 주석은 간결하게 유지).
- [ ] **Step 2**: `EditorSidebar.test.tsx`의 `/editor/{pageId}/publish 경로도 같은 문서의 pageId로 취급한다`·`/editor/new/publish도 pageId로 취급하지 않는다` 두 테스트를 새 동작(더 이상 `/publish` 접미사를 특별 취급하지 않음 — 그런 값도 그냥 매치 실패로 `undefined`)에 맞게 갱신한다.
- [ ] **Step 3**: `npx vitest run src/components/editor/EditorSidebar.test.tsx`로 확인 후 전체 스위트·lint·tsc·build 재확인.
- [ ] **Step 4**: `design.md`를 다시 검색해 실제로 고칠 서술이 있는지 최종 확인한다(이미 `task.md` 작성 중 1차 확인 완료 — 여기서는 구현 완료 시점에 다시 한번 확인).
