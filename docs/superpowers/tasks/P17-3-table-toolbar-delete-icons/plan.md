# P17-3: 표 툴바 삭제 아이콘 구분 — 구현 계획

## Global Constraints
- 새 아이콘 라이브러리를 추가하지 않는다 — 기존 `TableIcon`(직접 그린 SVG) 관례를 그대로
  따른다.
- 전체 `npm test`는 돌리지 않는다 — 표 툴바와 직접 연관된 `RichTextEditor.test.tsx`만
  실행한다(CLAUDE.md 테스트 루틴).

## Files
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `RowDeleteIcon`/`ColumnDeleteIcon` 두 컴포넌트를 추가한다 — 삽입
      아이콘의 가로줄(행)/세로줄(열) 문법을 재사용해, 그 축을 나타내는 굵은 띠(평행한
      두 줄) 위에 X를 그어 "지운다"는 뜻을 더한다.
- [x] **Step 2**: `TableToolbar`의 "행 삭제" 버튼 아이콘을 `TrashIcon` → `RowDeleteIcon`,
      "열 삭제" 버튼을 `TrashIcon` → `ColumnDeleteIcon`으로 바꾼다. "표 삭제" 버튼은
      `TrashIcon`을 그대로 유지한다.
- [x] **Step 3**: 아이콘 재사용 근거를 설명하던 기존 주석("삭제는 방향성이 의미 없어
      범용 휴지통 아이콘 하나를 재사용한다")을 새 구조에 맞게 갱신한다.
- [x] **Step 4**: 테스트 — 표를 렌더링한 뒤 "행 삭제"·"열 삭제"·"표 삭제" 버튼 내부
      SVG의 innerHTML을 서로 비교해, 셋 다 달라야 함을 확인한다(aria-label 텍스트만으로는
      이 회귀를 못 잡으므로 아이콘 마크업 자체를 비교).
- [x] **Step 5**: `npx vitest run RichTextEditor.test.tsx`, `npx eslint <바뀐 파일>`,
      `npm run build`.
