# P17-10: 표 툴바 툴팁 클리핑 수정 — 구현 계획

## Global Constraints
- 조건부 스크롤 위치 감지 대신, 구조적으로 클리핑이 생기지 않는 방향(아래)을 기본값으로
  쓴다(P14-3·P15-4의 "조건부 CSS보다 구조로 해결" 원칙).
- `@sfood/ui`의 기존 `Tooltip` 컴포넌트(`side` prop 지원)를 그대로 쓴다 — 새 커스텀
  툴팁 구현을 만들지 않는다.
- 전체 `npm test`는 돌리지 않는다 — 표 툴바와 직접 연관된 `RichTextEditor.test.tsx`만
  실행한다.

## Files
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: 임시 디버그 페이지(`/dev-preview-table-toolbar`, 커밋 안 함)로
      `EditorShell.tsx`의 실제 스크롤 컨테이너(`overflow-y-auto`) + 상단 고정 헤더
      구조를 재현해, 표를 스크롤해 툴바가 컨테이너 맨 위에 붙었을 때 버튼에 마우스를
      올려 실제로 툴팁이 잘리는지 Browser pane으로 확인한다.
- [x] **Step 2**: 개발자 도구(JS `getBoundingClientRect`/`getComputedStyle`)로 원인을
      정확히 특정한다 — 툴팁 top이 스크롤 컨테이너 top보다 작아(경계 밖) `overflow-y-auto`
      (P14-3와 같은 이유로 overflow-x까지 auto 강제)에 잘리는 것을 확인.
- [x] **Step 3**: `TableToolbarButton`의 `<Tooltip content={label}>`에 `side="bottom"`을
      추가한다 — 버튼 아래는 항상 표 본문이 있어 구조적으로 클리핑이 생기지 않는다.
- [x] **Step 4**: 같은 디버그 페이지로 수정 후 재확인 — 툴팁이 잘리지 않고 완전한
      모양(둥근 모서리 + 텍스트)으로 버튼 아래에 뜨는 것을 스크린샷으로 확인.
- [x] **Step 5**: 디버그 페이지를 삭제한다(임시 검증용, 커밋 대상 아님).
- [x] **Step 6**: 테스트 — 대표 버튼 3개("행 추가(위)", "행 삭제", "표 삭제")에
      `mouseEnter`를 발생시켜 뜨는 툴팁이 `side="bottom"`에 해당하는 CSS 클래스
      (`top-full`, `bottom-full` 아님)를 갖는지 확인한다.
- [x] **Step 7**: `npx vitest run RichTextEditor.test.tsx`, `npx eslint <바뀐 파일>`,
      `npm run build`(빌드 결과 라우트 목록에 디버그 페이지가 없는지도 함께 확인).
