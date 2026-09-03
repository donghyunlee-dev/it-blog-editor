# P1-9e: `RichTextEditor.tsx` 테스트 — 구현 계획

## Global Constraints
- 기존 `RichTextEditor.test.tsx`에 새 `describe` 블록들을 추가하는 방식으로 진행한다(파일을 새로 쪼개지 않는다 — 이미 이 파일이 컴포넌트 전체의 테스트 파일로 확립돼 있다).
- 텍스트 선택은 `Range` + `document.dispatchEvent(new Event("selectionchange"))` 헬퍼(`selectText`)로 흉내 낸다 — 스파이크로 동작을 확인했다. 이미지 클릭(NodeSelection) 계열은 P1-8이 이미 쓴 `.focus()` 패턴을 재사용한다.

## Files
- Modify: `src/components/editor/RichTextEditor.test.tsx`

## Steps
- [x] **Step 1**: `selectText(container, textMatch)` 헬퍼 추가.
- [x] **Step 2**: "기본 렌더링/onChange" describe — content 렌더링 확인, 입력 시 onChange 호출 확인. 2건.
- [x] **Step 3**: "서식 버블 메뉴" describe — 텍스트 선택 시 노출, 굵게/기울임/취소선 토글, 글자색 적용/해제, 하이라이트 적용/해제, 링크 적용(안전한 URL)/거부(안전하지 않은 스킴). 8건 내외.
- [x] **Step 4**: 기존 "이미지 개수 상한(P0-4b)" describe의 "30장 미만 드래그앤드롭" 테스트를 확장하거나 별도 테스트를 추가해 실제 이미지 노드 삽입·onChange 반영까지 검증.
- [x] **Step 5**: `npx vitest run "src/components/editor/RichTextEditor.test.tsx"`로 검증.
- [x] **Step 6**: `npm run lint`, `npm run build` 실행.
