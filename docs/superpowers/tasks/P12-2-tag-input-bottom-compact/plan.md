# P12-2: 태그 입력 영역 하단 이동 + 컴팩트화 — 구현 계획

## Global Constraints
- 태그 입력 동작(Enter/쉼표 확정, IME 조합, 자동완성, 칩 삭제, 검증)은 전혀 바꾸지 않는다 —
  `TagInput`의 로직(핸들러)은 그대로 두고 레이아웃(마크업/클래스)과 placeholder만 바꾼다.
- 새 문서 작성(`mode === "create"`, 풋터가 없는 경로)에서도 태그 입력은 항상 보여야 하므로,
  기존 `mode === "edit" && initialUpdatedAt`로 조건화된 풋터 블록 안에 넣지 않고 그 앞에 독립
  블록으로 둔다.

## Files
- Modify: `src/components/editor/TagInput.tsx`
- Modify: `src/components/editor/TagInput.test.tsx`
- Modify: `src/components/editor/DocumentEditor.tsx`
- Modify: `docs/product/design.md` (편집 화면 레이아웃 서술 갱신)
- Modify: `docs/product/prd.md` ("문서 태그 지정" 기능 설명에 위치 변경 반영)

## Steps
- [ ] **Step 1**: `TagInput.tsx` — 바깥 `flex flex-col gap-1.5` + 별도 `<p>태그</p>` 줄을 제거하고,
      라벨("태그", `text-xs text-muted shrink-0`)을 칩·입력과 같은 한 줄(`flex flex-wrap items-center
      gap-2`)에 배치한다. 테두리·배경 박스는 유지하되 패딩을 살짝 줄인다(`px-2.5 py-1.5`).
      `<input>`에 `aria-label="태그"`를 추가하고, `placeholder`를 `value.length === 0 ? "예: React,
      Backend" : undefined`로 바꾼다.
- [ ] **Step 2**: `TagInput.test.tsx` — 값이 있는 상태(`value=["React"]` 등)에서
      `getByPlaceholderText("예: React, Backend")`로 입력을 찾던 곳을
      `getByRole("combobox", { name: "태그" })`로 교체한다(빈 값 케이스는 그대로 두거나 동일하게
      통일). placeholder 조건부 표시를 검증하는 테스트 2개(태그 없을 때 보임 / 있을 때 안 보임)를
      추가한다.
- [ ] **Step 3**: `DocumentEditor.tsx` — 제목 바로 아래 있던 `<div className="mt-2"><TagInput .../></div>`
      블록을 제거하고, `richTextContainerRef`를 감싸는 본문 블록과 풋터(`mode === "edit" &&
      initialUpdatedAt`) 블록 사이에 새로 배치한다(모드와 무관하게 항상 렌더링). 간격은 본문과는
      여백을 확실히 주고(`mt-4` 등), 풋터가 있는 경우 그 사이 간격도 자연스럽게 이어지도록 조정한다.
      기존 "제목→태그 mt-2, 태그→본문 mt-6" 위계 주석은 새 위치에 맞게 갱신하거나 제거한다.
- [ ] **Step 4**: `docs/product/design.md`의 "위계가 다른 영역 사이는 간격 크기를 다르게 준다" 절과
      관련 서술을 새 레이아웃(제목→본문, 본문→태그, 태그→풋터)에 맞게 갱신한다.
- [ ] **Step 5**: `docs/product/prd.md`의 "문서 태그 지정" 기능 설명에 위치가 본문 하단으로
      바뀌었음을 반영한다. Phase 12 체크리스트에 P12-2를 추가한다.
- [ ] **Step 6**: `npx vitest run TagInput.test.tsx DocumentEditor.test.tsx`,
      `npx eslint src/components/editor/TagInput.tsx src/components/editor/TagInput.test.tsx
      src/components/editor/DocumentEditor.tsx`, `npm run build`로 확인한다.

각 Step은 `npx vitest run TagInput.test.tsx`(또는 `DocumentEditor.test.tsx`)로 검증 가능한
단위로 쪼갠다.
