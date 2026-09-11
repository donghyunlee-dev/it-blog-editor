# P10-1: 문서 링크 카드 블록 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/DocumentLinkPickerModal.test.tsx src/components/editor/RichTextEditor.test.tsx src/components/editor/SlashCommandExtension.test.ts src/lib/editor/tiptap-to-storage.test.ts` — 113개 전부 통과.
  - `DocumentLinkPickerModal.test.tsx`(신규, 6건): 닫혀 있을 때 입력 숨김, 디바운스 후 검색 API 호출·결과 표시, 빈 결과 안내, 오류 메시지 표시, 결과 클릭 시 `onSelect({pageId, title})` 호출, `excludePageId`로 자기 자신 제외.
  - `RichTextEditor.test.tsx`(신규 "문서 링크 카드(P10-1)" 블록, 3건): 카드에 고정 아이콘·캐시된 제목 표시, 제목 없을 때 "(제목 없음)" 대체, 카드 클릭 시 `router.push("/editor/{pageId}")` 호출(`next/navigation` 모킹).
  - `tiptap-to-storage.test.ts`(신규 3건): `documentLink`를 사람이 읽는 텍스트로 직렬화, 제목 없을 때 "제목 없음" 대체, 제목·문서 ID 이스케이프.
- `npx eslint src/components/editor/RichTextEditor.tsx src/components/editor/DocumentLinkPickerModal.tsx src/components/editor/DocumentLinkPickerModal.test.tsx src/components/editor/RichTextEditor.test.tsx src/lib/editor/tiptap-to-storage.ts src/lib/editor/tiptap-to-storage.test.ts` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성.

## 수동/시각 검증
AX Auth 로그인 제약으로 이 세션에서는 실제 `/editor` 화면을 열어볼 수 없다(PRD의 기존 항목들과 동일한 한계). 자동화 테스트가 카드 렌더링·클릭 이동·검색 피커의 실제 상호작용(입력→디바운스→API→결과 클릭→콜백)까지 검증하므로, 핵심 동작은 정적 스크린샷보다 이 테스트가 더 직접적인 증거라고 판단해 별도 Artifact를 만들지 않았다(P9-2와 동일한 판단 근거).

## 문제 → 조치 → 재검증
1. **원인**: `npx eslint`가 `DocumentLinkPickerModal.tsx`의 두 `useEffect` 안 `setState` 호출을 `react-hooks/set-state-in-effect`로 지적했다.
   **조치**: `GlobalSearchModal.tsx`가 같은 상황(외부 신호 `open`에 따른 상태 초기화)에 이미 쓰고 있던 것과 동일하게 `// eslint-disable-next-line react-hooks/set-state-in-effect` 주석을 추가했다.
   **재검증**: `npx eslint src/components/editor/DocumentLinkPickerModal.tsx` 재실행 → 0 errors.

## 새로운 결정 사항
없음 — `task.md` "결정이 필요한 사항" 참고(제목 캐시 방식·검색 범위 한정·고정 아이콘 모두 GitHub Issue 없이 직접 정함, 근거는 `docs/product/prd.md` Phase 10 참고).
