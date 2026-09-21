# P17-16: 태그 UI를 칩+팝오버 방식으로 전환 — 구현 계획

## Global Constraints
- 새 팝오버 로직을 직접 구현하지 않는다 — `@sfood/ui`의 `Popover`(열림 상태·바깥
  클릭/Escape 닫힘을 이미 구현)를 그대로 쓴다(CLAUDE.md "UI 컴포넌트" 우선순위 규칙).
- 태그 커밋/삭제/IME 처리 등 기존 로직(`commitTag`/`handleKeyDown`/`removeTag`)은
  그대로 재사용한다 — 바뀌는 것은 "언제 입력창이 보이는가"뿐이다.

## Files
- Modify: `src/components/editor/TagInput.tsx`
- Modify: `src/components/editor/TagInput.test.tsx`
- Modify: `src/components/editor/DocumentEditor.test.tsx`(태그 입력을 직접 조작하는
  기존 테스트 3곳이 먼저 "태그 추가" 트리거를 눌러야 한다)
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `TagInput.tsx`에서 상시 노출 테두리 박스를 제거하고, 칩 뒤에
      `Popover`(trigger: "태그 추가" 버튼)를 추가한다. 팝오버 내용은 기존 `<input>` +
      `<ul role="listbox">` 구조를 그대로 옮기되, `suggestionsOpen`/`onFocus`/`onBlur`
      상태는 제거한다(Popover가 열림 자체를 관리하므로 불필요) — `candidates` 필터에서
      `draft.length > 0` 조건도 제거해, 팝오버를 열면 입력 없이도 추천 태그 전체가
      보이게 한다.
- [x] **Step 2**: `TagInput.test.tsx`를 팝오버 트리거를 먼저 여는 흐름으로 다시
      작성한다. "팝오버를 열면 입력 없이도 추천 태그를 보여준다" 테스트를 새로 추가한다
      (기존 "입력이 있을 때만 뜬다" 테스트는 동작이 바뀌었으므로 대체).
- [x] **Step 3**: `DocumentEditor.test.tsx`에서 `getByPlaceholderText("예: React,
      Backend")`로 태그 입력을 직접 조작하던 3개 테스트를 "태그 추가" 버튼 클릭 →
      `getByRole("combobox", { name: "태그" })` 흐름으로 바꾼다.
- [x] **Step 4**: 임시 디버그 페이지(`/dev-preview-tag-popover`, 검증 후 삭제)로
      Browser pane에서 트리거 클릭 → 팝오버 오픈(입력 없이 추천 전체 노출) → 검색어로
      좁혀짐 → 클릭 시 칩 추가 + 팝오버 유지를 실제로 확인.
- [x] **Step 5**: `npx vitest run src/components/editor/TagInput.test.tsx
      src/components/editor/DocumentEditor.test.tsx`, `npx eslint
      src/components/editor/TagInput.tsx src/components/editor/TagInput.test.tsx
      src/components/editor/DocumentEditor.test.tsx`, `npm run build`.
