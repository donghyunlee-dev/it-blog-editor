# P2-5: 표 안 텍스트 서식(색상·폰트) 격차 조사 — 구현 계획

## Global Constraints
- 이 항목은 대부분 조사이지 구현이 아니다 — 결정이 필요한 사항(폰트 추가 여부)이 있는 부분은 GitHub Issue 등록 후 보류한다(CLAUDE.md "작업 루틴").
- 확인된 "이미 정상 동작함" 사실은 회귀 테스트로 고정해, 향후 표 관련 리팩터가 이를 조용히 깨뜨리는 것을 막는다.

## Files
- Modify: `src/components/editor/RichTextEditor.test.tsx` (표 셀 안 서식 버블 메뉴 회귀 테스트 추가)
- Modify: `docs/product/prd.md` (P2-5 체크리스트 항목 추가)

## Steps
- [x] **Step 1**: `EditorBubbleMenu`/`shouldShow` 관련 소스(`RichTextEditor.tsx`, `@tiptap/extension-bubble-menu`)를 읽어 표 셀 여부를 구분하는 로직이 있는지 확인한다.
- [x] **Step 2**: 기존 `selectText` 헬퍼 + `tableFirstDoc`을 조합해 표 셀 안 텍스트 선택 시 버블 메뉴 노출 여부를 실제로 렌더링해 확인한다.
- [x] **Step 3**: `package.json`에서 `FontFamily`/`FontSize` 관련 확장 설치 여부를 확인한다.
- [x] **Step 4**: 폰트 서식 결정 사항을 GitHub Issue로 등록한다.
- [ ] **Step 5**: Step 2에서 확인한 동작을 `RichTextEditor.test.tsx`에 정식 회귀 테스트로 추가한다.
- [ ] **Step 6**: `npm test -- RichTextEditor.test.tsx`, `npm run lint`, `npm run build`로 최종 확인한다.

각 Step은 `npm test -- RichTextEditor.test.tsx`로 검증 가능한 단위로 쪼갠다.
