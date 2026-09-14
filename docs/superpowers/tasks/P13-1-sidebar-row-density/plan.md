# P13-1: 사이드바 문서함 행 밀도·들여쓰기 조정 — 구현 계획

## Global Constraints
- 행의 클릭/포커스/접근성 동작(role, aria, 키보드 탐색)은 변경하지 않는다 — padding·들여쓰기
  수치만 바꾼다.
- 들여쓰기 공식(`8 + depth * N`)이 파일 안에 4곳 반복되므로, 숫자를 직접 4번 고치는 대신 이름
  붙은 상수 2개(`INDENT_BASE_PX`, `INDENT_STEP_PX`)로 뽑아 한 곳만 바꾸면 전체에 적용되게 한다
  (이미 반복되던 매직 넘버에 이름을 붙이는 것뿐, 새로운 추상화 계층은 아니다).

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `docs/product/design.md` (사이드바 관련 실측값 서술 갱신)

## Steps
- [ ] **Step 1**: 파일 상단에 `const INDENT_BASE_PX = 8;`, `const INDENT_STEP_PX = 20;`를
      추가하고, `paddingLeft: 8 + depth * 14`(문서 행 2곳, 폴더 행 1곳)와
      `paddingLeft: 8 + (depth + 1) * 14`(빈 폴더 안내 1곳)를 이 상수 조합으로 교체한다.
- [ ] **Step 2**: 폴더 토글 버튼의 `py-2`(709행)와 문서 행 `Link`의 `py-2`(607행), 공유받은 문서
      행의 `py-2`(893행)를 `py-1.5`로 바꾼다. "이동" 버튼의 `mt-2`(649행 근처, `py-2`와 정렬
      맞추던 값)도 `mt-1.5`로 함께 조정한다. 관련 주석(P8-2 근거를 설명하던 부분)을 이번 변경
      이유로 갱신한다.
- [ ] **Step 3**: 트리 진입 전 고정 영역 — 검색 입력 wrapper(`p-3`, 856행), 새 문서 버튼
      wrapper(`p-3`, 921행), `<nav>`(`p-3`, 940행), "폴더" 라벨 행(`mb-2`, 946행)의 여백을
      줄인다(`p-3`→`p-2.5`, `mb-2`→`mb-1.5`). 공유받은 문서 wrapper(`p-3`, 877행)도 같은
      이유로 함께 줄인다.
- [ ] **Step 4**: `docs/product/design.md`의 관련 실측값 서술(있다면 "4. 좌측 사이드바" 벤치마킹
      절)에 이번 조정을 반영한다.
- [ ] **Step 5**: `npx vitest run EditorSidebar.test.tsx`, `npx eslint
      src/components/editor/EditorSidebar.tsx`, `npm run build`로 확인한다.

각 Step은 `npx vitest run EditorSidebar.test.tsx`로 검증 가능한 단위로 쪼갠다. 시각적 결과는
이 세션에서 직접 확인할 수 없으므로(AX Auth 제약), 사용자가 전달할 캡처로 별도 확인한다.
