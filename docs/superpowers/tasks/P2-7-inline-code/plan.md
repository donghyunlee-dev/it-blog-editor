# P2-7: 인라인 코드 서식 추가 — 구현 계획

## Global Constraints
- 새 마크 타입이나 확장을 추가하지 않는다 — `StarterKit`이 기본 제공하는 `code` 마크와 `tiptap-to-storage.ts`의 기존 `<code>` 직렬화를 그대로 쓴다. UI 노출만 추가한다.
- 새 아이콘 라이브러리·SVG를 추가하지 않는다 — 기존 굵게(B)/기울임(I)/취소선(S) 텍스트 라벨 관례를 따라 `</>` 텍스트를 라벨로 쓴다.
- 시각 스타일(배경·모노스페이스)은 Tailwind Typography의 `prose` 기본 `code` 스타일 + `globals.css`의 `--tw-prose-code` 토큰 매핑을 그대로 재사용한다 — 새 CSS 규칙 추가 불필요(사전 확인 완료).

## Files
- Modify: `src/components/editor/SlashCommandExtension.ts` (ITEMS에 "인라인 코드" 추가)
- Modify: `src/components/editor/SlashCommandExtension.test.ts` (항목 개수·커맨드 체인 테스트 갱신)
- Modify: `src/components/editor/RichTextEditor.tsx` (`EditorBubbleMenu`에 코드 토글 버튼 추가)
- Modify: `src/components/editor/RichTextEditor.test.tsx` (새 테스트)

## Steps
- [x] **Step 1**: `SlashCommandExtension.ts`의 `ITEMS`에 `{ title: "인라인 코드", run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCode().run() }`을 "코드블록" 바로 뒤에 추가한다.
- [x] **Step 2**: `SlashCommandExtension.test.ts`의 "빈 쿼리면 기본 N개 항목" 테스트 개수를 9→10으로 갱신하고, "인라인 코드" 커맨드 체인 케이스를 `it.each`에 추가한다.
- [x] **Step 3**: `RichTextEditor.tsx`의 `EditorBubbleMenu`에 취소선과 글자 크기 사이에 `ToggleButton`(active: `editor.isActive("code")`, onClick: `toggleCode()`, 라벨 "코드", 아이 표시 `</>`)을 추가한다.
- [x] **Step 4**: `RichTextEditor.test.tsx`에 "코드 버튼 클릭 시 적용", "다시 클릭 시 해제" 테스트를 추가한다.
- [x] **Step 5**: 기존 "표 셀 안 서식 버블 메뉴(P2-5)" describe 블록에 "표 셀 안에서도 코드 버튼이 동작한다(P2-7)" 테스트를 추가한다.
- [ ] **Step 6**: `npm test`, `npm run lint`, `npm run build`로 최종 확인한다.

각 Step은 `npm test -- RichTextEditor.test.tsx` / `npm test -- SlashCommandExtension.test.ts`로 검증 가능한 단위로 쪼갠다.
