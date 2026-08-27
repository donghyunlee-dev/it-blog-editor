# P0-2: 게시취소 확인 모달 — 구현 계획

## Global Constraints
- `window.confirm()`을 쓰지 않는다 — `@sfood/ui`의 `Modal`을 쓴다(CLAUDE.md 규칙, `DocumentEditor.tsx`의 삭제 확인 모달과 같은 패턴).
- `PublishForm`은 이미 `DocumentEditor.tsx`의 게시 설정 `Modal` 안에서 렌더링된다 — 이 확인 모달은 그 안에 중첩되는 두 번째 `Modal`이 된다. `@sfood/ui`의 `Modal`은 포털(`createPortal`)을 쓰지 않고 `fixed inset-0 z-50`로 자기 위치에서 바로 렌더링한다(`node_modules/@sfood/ui/dist/index.js`의 `Wa` 함수 직접 확인) — `position: fixed`는 `relative` 조상에 갇히지 않고 뷰포트 기준으로 그대로 전체 화면을 덮으므로, 중첩된 두 번째 Modal도 화면 전체를 정상적으로 덮는다. DOM 순서상 안쪽 Modal이 나중에 그려져 바깥 Modal 위에 자연스럽게 쌓인다.
- 기존 `handlePublishedChange`/`persist` 로직은 그대로 재사용한다 — 확인을 받은 뒤에만 그 경로를 타도록 진입점만 바꾼다.

## Files
- Modify: `src/components/editor/PublishForm.tsx`
- Modify: `src/components/editor/PublishForm.test.tsx`

## Steps
- [ ] **Step 1**: `PublishForm.test.tsx`에 실패하는 테스트를 먼저 추가한다(TDD) — "이미 게시된 문서에서 게시함 스위치를 끄면 확인 모달이 뜨고, 확인해야 실제 PATCH 요청이 나간다"는 시나리오와 "취소를 누르면 요청이 안 나가고 스위치도 켜진 채로 남는다"는 시나리오.
- [ ] **Step 2**: `npm test -- PublishForm.test.tsx`로 실패 확인.
- [ ] **Step 3**: `PublishForm.tsx` 수정.
  - `@sfood/ui`에서 `Button`, `Modal` import 추가.
  - `unpublishConfirmOpen` state 추가.
  - `handlePublishedChange(next)`: `next === false && isPublished === true`(이미 게시된 문서를 끄려는 시도)이면 `setUnpublishConfirmOpen(true)`만 하고 `return`(실제 state 변경·persist는 안 함 — `Switch`의 `checked`가 여전히 `isPublished`(true)를 그대로 반영하므로 시각적으로도 안 꺼진 채 남는다). 그 외(게시 시작, 또는 이미 꺼진 상태에서 다시 끄는 무의미한 경우는 발생 안 함)에는 기존 로직 그대로.
  - `confirmUnpublish()`: 모달 닫고, 기존 `handlePublishedChange`가 하던 일(`setIsPublished(false)` + `persist(...)`)을 실행.
  - `cancelUnpublish()`: 모달만 닫는다.
  - 확인 `Modal` 렌더링 추가(제목 "게시 취소", 본문에 "게시를 취소하면 이 문서가 즉시 비공개로 전환됩니다" 같은 결과를 명확히 알리는 문구, footer에 `취소`(secondary)/`게시 취소`(danger) 버튼) — `DocumentEditor.tsx`의 삭제 확인 모달과 같은 톤.
- [ ] **Step 4**: `npm test -- PublishForm.test.tsx`로 통과 확인.
- [ ] **Step 5**: `npm test`(전체) + `npm run lint` + `npx tsc --noEmit` + `npm run build`로 회귀 없는지 확인.
