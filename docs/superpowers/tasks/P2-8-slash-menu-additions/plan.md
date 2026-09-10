# P2-8: 인용구·구분선·밑줄 서식과 "제목 3" 진입점 추가 — 구현 계획

## Global Constraints
- 새 TipTap 확장·스키마 변경 없음 — 네 커맨드 모두 `StarterKit`에 이미 활성화돼 있다.
- 슬래시 메뉴 추가 항목(제목 3/인용구/구분선)은 기존 `ITEMS` 배열에 같은 형태(`{ title, run }`)로 끼워 넣는다.
- 버블 툴바 추가 버튼(밑줄)은 기존 `ToggleButton` 컴포넌트·패턴을 그대로 재사용한다.

## Files
- Modify: `src/components/editor/SlashCommandExtension.ts` ("제목 3"/"인용구"/"구분선" 항목 추가)
- Modify: `src/components/editor/SlashCommandExtension.test.ts` (기본 항목 개수 갱신, 신규 항목 체인 검증)
- Modify: `src/components/editor/RichTextEditor.tsx` (버블 툴바에 "밑줄" `ToggleButton` 추가)
- Modify: `src/components/editor/RichTextEditor.test.tsx` (밑줄 버튼 노출·클릭 시 마크 적용 테스트)

## Steps
- [x] **Step 1**: `SlashCommandExtension.ts`의 `ITEMS`에 "제목 3"(제목 2 뒤), "인용구"·"구분선"(번호 목록 뒤, 표 앞)을 추가한다.
- [x] **Step 2**: `SlashCommandExtension.test.ts` — 기본 항목 개수를 10→13으로 갱신하고, 세 항목의 커맨드 체인을 기존 `it.each` 표에 추가한다.
- [x] **Step 3**: `RichTextEditor.tsx`의 `EditorBubbleMenu`에 "밑줄" `ToggleButton`(`toggleUnderline()`)을 취소선 버튼 바로 뒤에 추가한다.
- [x] **Step 4**: `RichTextEditor.test.tsx` — 버블 메뉴 노출 테스트에 "밑줄" 어서션을 추가하고, 클릭 시 `<u>` 마크가 적용되는 전용 테스트를 추가한다.
- [x] **Step 5**: `npm test`, `npm run lint`, `npm run build`로 최종 확인한다.

각 Step은 `npm test -- SlashCommandExtension.test.ts RichTextEditor.test.tsx`로 검증 가능한 단위로 쪼갠다.
